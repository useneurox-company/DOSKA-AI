/**
 * Pipeline API
 * GET  - получить статус pipeline
 * POST - управление (start, stop, runOnce)
 * PUT  - обновить настройки
 */

import { NextRequest, NextResponse } from "next/server";
import { pipelineManager } from "@/lib/pipeline";

// GET /api/pipeline - получить статус и настройки
export async function GET() {
  try {
    const state = pipelineManager.getState();
    const settings = await pipelineManager.getSettings();

    return NextResponse.json({
      state,
      settings,
    });
  } catch (error) {
    console.error("[Pipeline API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get pipeline status" },
      { status: 500 }
    );
  }
}

// POST /api/pipeline - управление pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start": {
        // Включить автопайплайн
        await pipelineManager.updateSettings({ autoPipelineEnabled: true });

        // Запускаем первый цикл асинхронно (не ждём)
        pipelineManager.runPipelineCycle().catch((error) => {
          console.error("[Pipeline API] Cycle error:", error);
        });

        return NextResponse.json({
          success: true,
          message: "Pipeline запущен",
          state: pipelineManager.getState(),
        });
      }

      case "stop": {
        // Выключить автопайплайн и остановить текущий цикл
        await pipelineManager.updateSettings({ autoPipelineEnabled: false });
        pipelineManager.stop();

        return NextResponse.json({
          success: true,
          message: "Pipeline остановлен",
          state: pipelineManager.getState(),
        });
      }

      case "runOnce": {
        // Запустить один цикл без включения автомата
        const settings = await pipelineManager.getSettings();

        // Проверяем, не запущен ли уже pipeline
        const state = pipelineManager.getState();
        if (state.isRunning) {
          return NextResponse.json(
            { error: "Pipeline уже запущен" },
            { status: 400 }
          );
        }

        // Запускаем цикл асинхронно
        pipelineManager.runPipelineCycle().catch((error) => {
          console.error("[Pipeline API] RunOnce error:", error);
        });

        return NextResponse.json({
          success: true,
          message: "Цикл pipeline запущен",
          state: pipelineManager.getState(),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Pipeline API] POST error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/pipeline - обновить настройки
export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json();

    // Валидация полей
    const validSettings: Record<string, unknown> = {};

    if (typeof settings.autoPipelineEnabled === "boolean") {
      validSettings.autoPipelineEnabled = settings.autoPipelineEnabled;
    }
    if (typeof settings.autoClassifyEnabled === "boolean") {
      validSettings.autoClassifyEnabled = settings.autoClassifyEnabled;
    }
    if (typeof settings.autoEnrichEnabled === "boolean") {
      validSettings.autoEnrichEnabled = settings.autoEnrichEnabled;
    }
    if (typeof settings.autoMatchEnabled === "boolean") {
      validSettings.autoMatchEnabled = settings.autoMatchEnabled;
    }

    // Глобальная дата парсинга
    if (settings.globalParseFromDate !== undefined) {
      if (settings.globalParseFromDate === null) {
        validSettings.globalParseFromDate = null;
      } else if (typeof settings.globalParseFromDate === "string") {
        validSettings.globalParseFromDate = new Date(settings.globalParseFromDate);
      }
    }

    await pipelineManager.updateSettings(validSettings);

    const updatedSettings = await pipelineManager.getSettings();

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("[Pipeline API] PUT error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
