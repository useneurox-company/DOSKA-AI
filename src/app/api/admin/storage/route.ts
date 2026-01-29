/**
 * API для управления хранилищем медиа-файлов
 * GET /api/admin/storage - статистика
 * DELETE /api/admin/storage - удаление файлов
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "telegram");

interface FileStats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  byType: Record<string, { count: number; size: number }>;
  oldestFile: Date | null;
  newestFile: Date | null;
}

interface DbStats {
  totalMessages: number;
  messagesWithMedia: number;
  mediaDownloaded: number;
  mediaPending: number;
  requestOfferWithMedia: number;
  otherWithMedia: number;
}

// Форматирование размера
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Получить статистику файлов на диске
function getFileStats(): FileStats {
  const stats: FileStats = {
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: "0 B",
    byType: {},
    oldestFile: null,
    newestFile: null,
  };

  if (!fs.existsSync(UPLOADS_DIR)) {
    return stats;
  }

  const files = fs.readdirSync(UPLOADS_DIR);

  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file);
    try {
      const fileStat = fs.statSync(filePath);
      if (!fileStat.isFile()) continue;

      stats.totalFiles++;
      stats.totalSize += fileStat.size;

      // Определяем тип по расширению
      const ext = path.extname(file).toLowerCase() || ".unknown";
      if (!stats.byType[ext]) {
        stats.byType[ext] = { count: 0, size: 0 };
      }
      stats.byType[ext].count++;
      stats.byType[ext].size += fileStat.size;

      // Даты
      if (!stats.oldestFile || fileStat.mtime < stats.oldestFile) {
        stats.oldestFile = fileStat.mtime;
      }
      if (!stats.newestFile || fileStat.mtime > stats.newestFile) {
        stats.newestFile = fileStat.mtime;
      }
    } catch {
      // Ignore file errors
    }
  }

  stats.totalSizeFormatted = formatSize(stats.totalSize);

  return stats;
}

// Получить статистику из БД
async function getDbStats(): Promise<DbStats> {
  const [
    totalMessages,
    messagesWithMedia,
    mediaDownloaded,
    requestOfferWithMedia,
  ] = await Promise.all([
    prisma.rawMessage.count(),
    prisma.rawMessage.count({ where: { hasMedia: true } }),
    prisma.rawMessage.count({ where: { mediaDownloaded: true } }),
    prisma.rawMessage.count({
      where: {
        hasMedia: true,
        aiMessageType: { in: ["request", "offer"] },
      },
    }),
  ]);

  return {
    totalMessages,
    messagesWithMedia,
    mediaDownloaded,
    mediaPending: messagesWithMedia - mediaDownloaded,
    requestOfferWithMedia,
    otherWithMedia: messagesWithMedia - requestOfferWithMedia,
  };
}

// GET - статистика хранилища
export async function GET() {
  try {
    const [fileStats, dbStats] = await Promise.all([
      getFileStats(),
      getDbStats(),
    ]);

    return NextResponse.json({
      success: true,
      files: fileStats,
      database: dbStats,
      uploadsDir: UPLOADS_DIR,
    });
  } catch (error) {
    console.error("[Storage API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get storage stats" },
      { status: 500 }
    );
  }
}

// DELETE - удаление файлов
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThanDays = searchParams.get("olderThan");
    const rejectedOnly = searchParams.get("rejected") === "true";
    const allFiles = searchParams.get("all") === "true";

    if (!fs.existsSync(UPLOADS_DIR)) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    let deletedCount = 0;
    let deletedSize = 0;

    // Удаление всех файлов
    if (allFiles) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            fs.unlinkSync(filePath);
            deletedCount++;
            deletedSize += stat.size;
          }
        } catch {
          // Ignore
        }
      }

      // Сбрасываем флаги в БД
      await prisma.rawMessage.updateMany({
        where: { mediaDownloaded: true },
        data: { mediaDownloaded: false, mediaUrl: null },
      });

      return NextResponse.json({
        success: true,
        deleted: deletedCount,
        deletedSize: formatSize(deletedSize),
      });
    }

    // Удаление файлов старше X дней
    if (olderThanDays) {
      const days = parseInt(olderThanDays, 10);
      if (isNaN(days) || days < 1) {
        return NextResponse.json(
          { success: false, error: "Invalid olderThan parameter" },
          { status: 400 }
        );
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && stat.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
            deletedSize += stat.size;
          }
        } catch {
          // Ignore
        }
      }

      // Обновляем записи в БД
      await prisma.rawMessage.updateMany({
        where: {
          mediaDownloaded: true,
          date: { lt: cutoffDate },
        },
        data: { mediaDownloaded: false, mediaUrl: null },
      });

      return NextResponse.json({
        success: true,
        deleted: deletedCount,
        deletedSize: formatSize(deletedSize),
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    // Удаление файлов для отклонённых (OTHER) сообщений
    if (rejectedOnly) {
      // Получаем URL файлов для OTHER сообщений
      const otherMessages = await prisma.rawMessage.findMany({
        where: {
          mediaDownloaded: true,
          aiMessageType: "other",
        },
        select: { id: true, mediaUrl: true },
      });

      for (const msg of otherMessages) {
        if (msg.mediaUrl) {
          const fileName = path.basename(msg.mediaUrl);
          const filePath = path.join(UPLOADS_DIR, fileName);
          try {
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              fs.unlinkSync(filePath);
              deletedCount++;
              deletedSize += stat.size;
            }
          } catch {
            // Ignore
          }
        }
      }

      // Сбрасываем флаги
      await prisma.rawMessage.updateMany({
        where: {
          mediaDownloaded: true,
          aiMessageType: "other",
        },
        data: { mediaDownloaded: false, mediaUrl: null },
      });

      return NextResponse.json({
        success: true,
        deleted: deletedCount,
        deletedSize: formatSize(deletedSize),
      });
    }

    return NextResponse.json(
      { success: false, error: "No action specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Storage API] Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete files" },
      { status: 500 }
    );
  }
}
