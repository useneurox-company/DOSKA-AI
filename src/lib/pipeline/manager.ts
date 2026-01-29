/**
 * Pipeline Manager
 * Управляет автоматическим выполнением всех этапов обработки:
 * Парсинг → Классификация → Обогащение → Матчинг
 *
 * КЛЮЧЕВЫЕ ОСОБЕННОСТИ:
 * - Всегда использует Smart модель (максимальная точность)
 * - Работает в цикле пока есть необработанные данные
 * - Новые карточки всегда сравниваются со ВСЕЙ базой
 */

import { prisma } from "@/lib/prisma";
import { parseAllSources } from "@/lib/telegram/parser";
import {
  runClassificationBatch,
  runEnrichmentBatch,
  runMatchingBatch,
} from "./batch";

// === ОПТИМАЛЬНЫЕ НАСТРОЙКИ (захардкожены) ===
const OPTIMAL_BATCH_SIZES = {
  classify: 200,    // 5 ключей × ~40 = 200/мин
  enrich: 100,      // Обогащение дольше
  match: 1000,      // AI оценит 1000 пар за цикл
};

const AI_MODEL = "smart" as const;  // Всегда максимальная точность

// === Types ===

export type PipelineStage = "idle" | "parsing" | "classifying" | "enriching" | "matching";

export interface CycleStats {
  parsed: number;
  classified: number;
  enriched: number;
  matched: number;
}

export interface PipelineState {
  isRunning: boolean;
  currentStage: PipelineStage;
  lastRun: Date | null;
  lastCycleStats: CycleStats | null;
  totalStats: CycleStats;
  error: string | null;
}

export interface PipelineSettings {
  autoPipelineEnabled: boolean;
  autoClassifyEnabled: boolean;
  autoEnrichEnabled: boolean;
  autoMatchEnabled: boolean;
  globalParseFromDate: Date | null;
}

// === Pipeline Manager ===

class PipelineManager {
  private state: PipelineState = {
    isRunning: false,
    currentStage: "idle",
    lastRun: null,
    lastCycleStats: null,
    totalStats: { parsed: 0, classified: 0, enriched: 0, matched: 0 },
    error: null,
  };

  private stopRequested = false;

  /**
   * Получить текущее состояние pipeline
   */
  getState(): PipelineState {
    return { ...this.state };
  }

  /**
   * Запросить остановку текущего цикла
   */
  stop(): void {
    this.stopRequested = true;
    console.log("[Pipeline] Stop requested");
  }

  /**
   * Проверить, нужно ли остановиться
   */
  private shouldStop(): boolean {
    return this.stopRequested;
  }

  /**
   * Загрузить настройки pipeline из БД
   */
  async getSettings(): Promise<PipelineSettings> {
    const settings = await prisma.parserSettings.findUnique({
      where: { id: "default" },
    });

    return {
      autoPipelineEnabled: settings?.autoPipelineEnabled ?? false,
      autoClassifyEnabled: settings?.autoClassifyEnabled ?? true,
      autoEnrichEnabled: settings?.autoEnrichEnabled ?? true,
      autoMatchEnabled: settings?.autoMatchEnabled ?? true,
      globalParseFromDate: settings?.globalParseFromDate ?? null,
    };
  }

  /**
   * Обновить настройки pipeline
   */
  async updateSettings(updates: Partial<PipelineSettings>): Promise<void> {
    await prisma.parserSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...updates },
      update: updates,
    });
  }

  /**
   * Проверить, есть ли необработанные данные для классификации
   */
  private async hasPendingClassification(): Promise<number> {
    return prisma.rawMessage.count({
      where: {
        aiAnalyzed: false,
        text: { not: null },
      },
    });
  }

  /**
   * Проверить, есть ли необработанные данные для обогащения
   */
  private async hasPendingEnrichment(): Promise<number> {
    return prisma.rawMessage.count({
      where: {
        aiMessageType: { in: ["request", "offer"] },
        enrichedAt: null,
      },
    });
  }

  /**
   * Проверить, есть ли необработанные пары для матчинга
   * (новые карточки, которые ещё не сравнивались со всей базой)
   */
  private async hasPendingMatching(): Promise<number> {
    // Считаем обогащённые карточки, которые ещё не участвовали в матчинге
    const enrichedCards = await prisma.rawMessage.count({
      where: {
        aiMessageType: { in: ["request", "offer"] },
        enrichedAt: { not: null },
      },
    });

    // Если есть обогащённые карточки - матчинг нужен
    // (matcher сам определит какие пары уже оценены)
    return enrichedCards > 0 ? 1 : 0;
  }

  /**
   * Запустить один цикл pipeline (работает пока есть данные)
   */
  async runPipelineCycle(): Promise<CycleStats> {
    if (this.state.isRunning) {
      throw new Error("Pipeline already running");
    }

    this.state.isRunning = true;
    this.state.error = null;
    this.stopRequested = false;

    const stats: CycleStats = { parsed: 0, classified: 0, enriched: 0, matched: 0 };
    const settings = await this.getSettings();

    try {
      // 1. ПАРСИНГ (один раз)
      console.log("[Pipeline] Stage 1: Parsing...");
      this.state.currentStage = "parsing";

      const parseResult = await parseAllSources();
      stats.parsed = parseResult.total || 0;
      console.log(`[Pipeline] Parsed: ${stats.parsed} new messages`);

      if (this.shouldStop()) {
        console.log("[Pipeline] Stopped after parsing");
        return this.finalizeCycle(stats);
      }

      // 2. КЛАССИФИКАЦИЯ (в цикле пока есть данные)
      if (settings.autoClassifyEnabled) {
        console.log("[Pipeline] Stage 2: Classifying...");
        this.state.currentStage = "classifying";

        let pendingCount = await this.hasPendingClassification();
        let cycleNum = 0;

        while (pendingCount > 0 && !this.shouldStop()) {
          cycleNum++;
          console.log(`[Pipeline] Classification cycle ${cycleNum}, pending: ${pendingCount}`);

          const classifyResult = await runClassificationBatch({
            limit: OPTIMAL_BATCH_SIZES.classify,
            model: AI_MODEL,
          });

          stats.classified += classifyResult.processed;
          console.log(`[Pipeline] Classified batch: ${classifyResult.processed} (total: ${stats.classified})`);

          // Проверяем остались ли ещё
          pendingCount = await this.hasPendingClassification();

          // Если ничего не обработали - выходим (избегаем бесконечного цикла)
          if (classifyResult.processed === 0) break;
        }

        if (this.shouldStop()) {
          console.log("[Pipeline] Stopped after classification");
          return this.finalizeCycle(stats);
        }
      }

      // 3. ОБОГАЩЕНИЕ (в цикле пока есть данные)
      if (settings.autoEnrichEnabled) {
        console.log("[Pipeline] Stage 3: Enriching...");
        this.state.currentStage = "enriching";

        let pendingCount = await this.hasPendingEnrichment();
        let cycleNum = 0;

        while (pendingCount > 0 && !this.shouldStop()) {
          cycleNum++;
          console.log(`[Pipeline] Enrichment cycle ${cycleNum}, pending: ${pendingCount}`);

          const enrichResult = await runEnrichmentBatch({
            limit: OPTIMAL_BATCH_SIZES.enrich,
            model: AI_MODEL,
          });

          stats.enriched += enrichResult.enriched;
          console.log(`[Pipeline] Enriched batch: ${enrichResult.enriched} (total: ${stats.enriched})`);

          // Проверяем остались ли ещё
          pendingCount = await this.hasPendingEnrichment();

          // Если ничего не обработали - выходим
          if (enrichResult.enriched === 0) break;
        }

        if (this.shouldStop()) {
          console.log("[Pipeline] Stopped after enrichment");
          return this.finalizeCycle(stats);
        }
      }

      // 4. МАТЧИНГ (в цикле пока есть новые пары)
      if (settings.autoMatchEnabled) {
        console.log("[Pipeline] Stage 4: Matching...");
        this.state.currentStage = "matching";

        let cycleNum = 0;
        let hasNewMatches = true;

        // Матчинг работает пока находит новые пары для оценки
        while (hasNewMatches && !this.shouldStop()) {
          cycleNum++;
          console.log(`[Pipeline] Matching cycle ${cycleNum}`);

          const matchResult = await runMatchingBatch({
            maxCandidates: OPTIMAL_BATCH_SIZES.match,
            model: AI_MODEL,
          });

          stats.matched += matchResult.saved;
          console.log(`[Pipeline] Matched batch: ${matchResult.saved} new matches (evaluated: ${matchResult.evaluated})`);

          // Если AI не оценивал новые пары - все пары уже обработаны
          hasNewMatches = matchResult.evaluated > 0;
        }
      }

      console.log("[Pipeline] All stages completed:", stats);
      return this.finalizeCycle(stats);

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.state.error = message;
      console.error("[Pipeline] Error:", message);
      throw error;

    } finally {
      this.state.isRunning = false;
      this.state.currentStage = "idle";
      this.stopRequested = false;
    }
  }

  /**
   * Финализировать цикл и обновить статистику
   */
  private finalizeCycle(stats: CycleStats): CycleStats {
    this.state.lastCycleStats = stats;
    this.state.lastRun = new Date();
    this.state.totalStats.parsed += stats.parsed;
    this.state.totalStats.classified += stats.classified;
    this.state.totalStats.enriched += stats.enriched;
    this.state.totalStats.matched += stats.matched;
    return stats;
  }
}

// Singleton instance
export const pipelineManager = new PipelineManager();
