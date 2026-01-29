/**
 * Telegram Media Downloader
 * Скачивание медиа по fileId после классификации
 */

import { Api } from "telegram";
import { TelegramClient } from "telegram";
import { getTelegramClient } from "./client";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

// Папка для загрузки медиа
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "telegram");

// MIME type to extension mapping
const mimeMap: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

interface DownloadResult {
  success: boolean;
  mediaUrl: string | null;
  mediaFileName: string | null;
  error?: string;
}

/**
 * Скачать медиа для одного сообщения по его ID в нашей БД
 */
export async function downloadMediaForMessage(
  messageId: string,
  client?: TelegramClient
): Promise<DownloadResult> {
  try {
    // Получаем сообщение из БД
    const rawMessage = await prisma.rawMessage.findUnique({
      where: { id: messageId },
      include: { source: true },
    });

    if (!rawMessage) {
      return { success: false, mediaUrl: null, mediaFileName: null, error: "Message not found" };
    }

    // Если уже скачано - возвращаем существующий URL
    if (rawMessage.mediaDownloaded && rawMessage.mediaUrl) {
      return { success: true, mediaUrl: rawMessage.mediaUrl, mediaFileName: rawMessage.mediaFileName };
    }

    // Если нет медиа или нет fileId - пропускаем
    if (!rawMessage.hasMedia) {
      return { success: true, mediaUrl: null, mediaFileName: null };
    }

    if (!rawMessage.telegramFileId) {
      return { success: false, mediaUrl: null, mediaFileName: null, error: "No telegramFileId saved" };
    }

    // Получаем клиент Telegram
    const tgClient = client || await getTelegramClient();
    if (!tgClient.connected) {
      await tgClient.connect();
    }

    const isAuthorized = await tgClient.isUserAuthorized();
    if (!isAuthorized) {
      return { success: false, mediaUrl: null, mediaFileName: null, error: "Telegram not authorized" };
    }

    // Получаем entity канала
    const source = rawMessage.source;
    const entity = source.username
      ? await tgClient.getEntity(source.username)
      : await tgClient.getEntity(source.chatId!);

    // Получаем сообщение из Telegram
    const messages = await tgClient.getMessages(entity, {
      ids: [rawMessage.messageId],
    });

    if (messages.length === 0 || !messages[0].media) {
      return { success: false, mediaUrl: null, mediaFileName: null, error: "Message not found in Telegram" };
    }

    const message = messages[0];

    // Скачиваем медиа
    const result = await downloadMediaFromMessage(tgClient, message, source.id);

    if (result.mediaUrl) {
      // Обновляем запись в БД
      await prisma.rawMessage.update({
        where: { id: messageId },
        data: {
          mediaUrl: result.mediaUrl,
          mediaFileName: result.mediaFileName,
          mediaDownloaded: true,
        },
      });
    }

    return { success: true, ...result };
  } catch (error) {
    console.error(`[Downloader] Error downloading media for ${messageId}:`, error);
    return {
      success: false,
      mediaUrl: null,
      mediaFileName: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Скачать медиа из Telegram сообщения
 */
async function downloadMediaFromMessage(
  client: TelegramClient,
  message: Api.Message,
  sourceId: string
): Promise<{ mediaUrl: string | null; mediaFileName: string | null }> {
  if (!message.media) {
    return { mediaUrl: null, mediaFileName: null };
  }

  try {
    // Убедимся что папка существует
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Определим расширение файла
    let extension = "";
    let originalFileName = "";

    if (message.media instanceof Api.MessageMediaPhoto) {
      extension = ".jpg";
      originalFileName = `photo_${message.id}.jpg`;
    } else if (message.media instanceof Api.MessageMediaDocument) {
      const doc = message.media.document;
      if (doc && doc instanceof Api.Document) {
        // Попробуем получить имя файла из атрибутов
        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            originalFileName = attr.fileName;
            extension = path.extname(attr.fileName) || "";
            break;
          }
        }
        // Если расширение не найдено, используем mime type
        if (!extension && doc.mimeType) {
          extension = mimeMap[doc.mimeType] || "";
          // Fallback по категории mime
          if (!extension) {
            if (doc.mimeType.startsWith("image/")) extension = ".jpg";
            else if (doc.mimeType.startsWith("video/")) extension = ".mp4";
            else if (doc.mimeType.startsWith("audio/")) extension = ".mp3";
          }
        }
        if (!originalFileName) {
          originalFileName = `document_${message.id}${extension}`;
        }
      }
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const fileName = `${sourceId}_${message.id}_${timestamp}${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Скачиваем файл
    const buffer = await client.downloadMedia(message.media, {});

    if (buffer && Buffer.isBuffer(buffer)) {
      fs.writeFileSync(filePath, buffer);
      // Возвращаем относительный URL для веб-доступа
      const mediaUrl = `/uploads/telegram/${fileName}`;
      return { mediaUrl, mediaFileName: originalFileName || null };
    }

    return { mediaUrl: null, mediaFileName: null };
  } catch (error) {
    console.error("[Downloader] Media download error:", error);
    return { mediaUrl: null, mediaFileName: null };
  }
}

/**
 * Скачать медиа для нескольких сообщений (batch)
 */
export async function downloadMediaBatch(
  messageIds: string[],
  client?: TelegramClient
): Promise<{ success: number; failed: number; results: DownloadResult[] }> {
  const tgClient = client || await getTelegramClient();
  if (!tgClient.connected) {
    await tgClient.connect();
  }

  let success = 0;
  let failed = 0;
  const results: DownloadResult[] = [];

  for (const messageId of messageIds) {
    const result = await downloadMediaForMessage(messageId, tgClient);
    results.push(result);

    if (result.success && result.mediaUrl) {
      success++;
    } else if (!result.success) {
      failed++;
    }

    // Небольшая пауза между скачиваниями
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { success, failed, results };
}

/**
 * Скачать медиа для всех классифицированных REQUEST/OFFER, у которых ещё не скачано
 */
export async function downloadMediaForClassified(
  options: {
    limit?: number;
    categoryId?: string;
  } = {}
): Promise<{ downloaded: number; failed: number; skipped: number }> {
  const { limit = 100, categoryId } = options;

  // Находим сообщения: REQUEST/OFFER, есть медиа, не скачано
  const messages = await prisma.rawMessage.findMany({
    where: {
      aiMessageType: { in: ["request", "offer"] },
      hasMedia: true,
      mediaDownloaded: false,
      telegramFileId: { not: null },
      ...(categoryId && { aiProductCategory: categoryId }),
    },
    take: limit,
    orderBy: { date: "desc" },
  });

  if (messages.length === 0) {
    return { downloaded: 0, failed: 0, skipped: 0 };
  }

  console.log(`[Downloader] Found ${messages.length} messages to download media for`);

  const result = await downloadMediaBatch(messages.map((m) => m.id));

  return {
    downloaded: result.success,
    failed: result.failed,
    skipped: messages.length - result.success - result.failed,
  };
}

/**
 * Извлечь fileId и accessHash из Telegram сообщения
 */
export function extractFileInfo(message: Api.Message): {
  fileId: string | null;
  accessHash: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
} {
  if (!message.media) {
    return { fileId: null, accessHash: null, mediaType: null, mediaFileName: null };
  }

  let fileId: string | null = null;
  let accessHash: string | null = null;
  let mediaType: string | null = null;
  let mediaFileName: string | null = null;

  if (message.media instanceof Api.MessageMediaPhoto) {
    const photo = message.media.photo;
    if (photo && photo instanceof Api.Photo) {
      fileId = photo.id.toString();
      accessHash = photo.accessHash.toString();
      mediaType = "photo";
      mediaFileName = `photo_${message.id}.jpg`;
    }
  } else if (message.media instanceof Api.MessageMediaDocument) {
    const doc = message.media.document;
    if (doc && doc instanceof Api.Document) {
      fileId = doc.id.toString();
      accessHash = doc.accessHash.toString();

      // Определяем тип
      const mime = doc.mimeType || "";
      if (mime.startsWith("image/")) {
        mediaType = "photo";
      } else if (mime.startsWith("video/")) {
        mediaType = "video";
      } else if (mime.startsWith("audio/")) {
        mediaType = "audio";
      } else {
        mediaType = "document";
      }

      // Получаем имя файла
      for (const attr of doc.attributes) {
        if (attr instanceof Api.DocumentAttributeFilename) {
          mediaFileName = attr.fileName;
          break;
        }
      }
      if (!mediaFileName) {
        const ext = mimeMap[mime] || "";
        mediaFileName = `document_${message.id}${ext}`;
      }
    }
  }

  return { fileId, accessHash, mediaType, mediaFileName };
}
