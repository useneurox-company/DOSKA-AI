import { Api } from "telegram";
import { TelegramClient } from "telegram";
import { getTelegramClient, getAllClients } from "./client";
import { prisma } from "@/lib/prisma";
import { extractFileInfo } from "./downloader";

interface ParseResult {
  success: boolean;
  messagesCount: number;
  newMessages: number;
  error?: string;
  sourceId?: string;
  sourceName?: string;
}

interface ParseOptions {
  fullHistory?: boolean;
  maxMessages?: number;
  client?: TelegramClient;
}

// Get parser settings from database
async function getSettings() {
  const settings = await prisma.parserSettings.findUnique({
    where: { id: "default" },
  });

  return {
    intervalMinutes: settings?.intervalMinutes ?? 15,
    messagesPerRequest: settings?.messagesPerRequest ?? 100,
    delayBetweenRequests: settings?.delayBetweenRequests ?? 1000,
    maxMessagesPerChannel: settings?.maxMessagesPerChannel ?? null,
    isSchedulerEnabled: settings?.isSchedulerEnabled ?? true,
    globalParseFromDate: settings?.globalParseFromDate ?? null,  // ГЛОБАЛЬНАЯ ДАТА
  };
}

// Save message to database (Lazy Download: только сохраняем fileId, не скачиваем)
async function saveMessage(
  message: Api.Message,
  sourceId: string,
  parseFromDate?: Date | null,
  client?: TelegramClient
): Promise<boolean> {
  const messageDate = new Date(message.date * 1000);

  // Skip messages older than parseFromDate
  if (parseFromDate && messageDate < parseFromDate) {
    return false;
  }

  // Check if message already exists
  const existing = await prisma.rawMessage.findUnique({
    where: {
      sourceId_messageId: {
        sourceId,
        messageId: message.id,
      },
    },
  });

  if (existing) return false;

  // Get sender info
  let senderName: string | null = null;
  let senderId: string | null = null;
  let senderUsername: string | null = null;
  let senderPhone: string | null = null;

  // Попытка 1: из message.sender (если уже загружен)
  if (message.sender) {
    const sender = message.sender as Api.User | Api.Channel;
    if ("firstName" in sender) {
      // It's a User
      const user = sender as Api.User;
      senderName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      senderId = user.id.toString();
      senderUsername = user.username || null;
      senderPhone = user.phone || null;
    } else if ("title" in sender) {
      // It's a Channel
      const channel = sender as Api.Channel;
      senderName = channel.title;
      senderId = channel.id.toString();
      senderUsername = channel.username || null;
    }
  }

  // Попытка 2: из message.fromId (если sender не загружен)
  if (!senderId && message.fromId) {
    if (message.fromId instanceof Api.PeerUser) {
      senderId = message.fromId.userId.toString();
    } else if (message.fromId instanceof Api.PeerChannel) {
      senderId = message.fromId.channelId.toString();
    } else if (message.fromId instanceof Api.PeerChat) {
      senderId = message.fromId.chatId.toString();
    }
  }

  // Попытка 3: получить username через client.getEntity если есть client и senderId, но нет username
  if (client && senderId && !senderUsername && message.fromId instanceof Api.PeerUser) {
    try {
      const userEntity = await client.getEntity(message.fromId.userId);
      if (userEntity && "username" in userEntity) {
        const user = userEntity as Api.User;
        senderUsername = user.username || null;
        senderPhone = user.phone || null;
        if (!senderName) {
          senderName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
        }
      }
    } catch {
      // Ignore errors - user might have privacy settings
    }
  }

  // Determine media type
  let hasMedia = false;
  let mediaType: string | null = null;

  if (message.media) {
    hasMedia = true;
    if (message.media instanceof Api.MessageMediaPhoto) {
      mediaType = "photo";
    } else if (message.media instanceof Api.MessageMediaDocument) {
      // Определяем тип по mime для документов
      const doc = message.media.document;
      if (doc && doc instanceof Api.Document) {
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
      } else {
        mediaType = "document";
      }
    } else {
      mediaType = "other";
    }
  }

  // LAZY DOWNLOAD: Извлекаем fileId для отложенной загрузки (не скачиваем сейчас)
  let telegramFileId: string | null = null;
  let telegramAccessHash: string | null = null;
  let mediaFileName: string | null = null;

  if (hasMedia) {
    const fileInfo = extractFileInfo(message);
    telegramFileId = fileInfo.fileId;
    telegramAccessHash = fileInfo.accessHash;
    mediaFileName = fileInfo.mediaFileName;
    // Обновляем mediaType из extractFileInfo если есть
    if (fileInfo.mediaType) {
      mediaType = fileInfo.mediaType;
    }
  }

  // Save raw message (use upsert to avoid race conditions)
  // mediaUrl = null, mediaDownloaded = false - файл скачается после классификации
  await prisma.rawMessage.upsert({
    where: {
      sourceId_messageId: {
        sourceId,
        messageId: message.id,
      },
    },
    update: {}, // Не обновляем, если уже существует
    create: {
      messageId: message.id,
      text: message.message || null,
      date: messageDate,
      senderId,
      senderName,
      senderUsername,
      senderPhone,
      hasMedia,
      mediaType,
      mediaUrl: null,           // Скачается после классификации
      mediaFileName,
      telegramFileId,           // ID файла в Telegram
      telegramAccessHash,       // Access hash для API
      mediaDownloaded: false,   // Пока не скачан
      sourceId,
    },
  });

  return true;
}

// Parse a single channel (standard mode - last N messages)
export async function parseChannel(sourceId: string, options: ParseOptions = {}): Promise<ParseResult> {
  const source = await prisma.telegramSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    return { success: false, messagesCount: 0, newMessages: 0, error: "Source not found" };
  }

  const settings = await getSettings();
  const client = options.client || await getTelegramClient();

  if (!client.connected) {
    await client.connect();
  }

  const isAuthorized = await client.isUserAuthorized();
  if (!isAuthorized) {
    return { success: false, messagesCount: 0, newMessages: 0, error: "Not authorized" };
  }

  try {
    // Get channel entity
    const entity = source.username
      ? await client.getEntity(source.username)
      : await client.getEntity(source.chatId!);

    let newMessages = 0;
    let totalFetched = 0;
    let skippedByDate = 0;
    const limit = settings.messagesPerRequest;
    const maxMessages = options.maxMessages || settings.maxMessagesPerChannel;
    // ПРИОРИТЕТ: глобальная дата > дата канала
    const parseFromDate = settings.globalParseFromDate || source.parseFromDate;

    if (options.fullHistory) {
      // Full history mode - paginate through all messages
      let offsetId = 0;
      let hasMore = true;

      while (hasMore) {
        const messages = await client.getMessages(entity, {
          limit,
          offsetId,
        });

        if (messages.length === 0) {
          hasMore = false;
          break;
        }

        for (const message of messages) {
          if (!message.message && !message.media) continue;

          // Check if message is older than parseFromDate - stop parsing
          const messageDate = new Date(message.date * 1000);
          if (parseFromDate && messageDate < parseFromDate) {
            skippedByDate++;
            // If we hit old messages, we can stop
            if (skippedByDate > 10) {
              hasMore = false;
              break;
            }
            continue;
          }

          const saved = await saveMessage(message, source.id, parseFromDate, client);
          if (saved) newMessages++;
          totalFetched++;

          // Check max messages limit
          if (maxMessages && totalFetched >= maxMessages) {
            hasMore = false;
            break;
          }
        }

        // Update offset for next batch
        offsetId = messages[messages.length - 1].id;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, settings.delayBetweenRequests));

        // If all messages in batch already existed, we've caught up
        if (newMessages === 0 && messages.length === limit) {
          // Continue until we find overlap
        }
      }
    } else {
      // Standard mode - just get last N messages
      const messages = await client.getMessages(entity, {
        limit,
      });

      for (const message of messages) {
        if (!message.message && !message.media) continue;

        const saved = await saveMessage(message, source.id, parseFromDate, client);
        if (saved) newMessages++;
        totalFetched++;
      }
    }

    // Update source
    await prisma.telegramSource.update({
      where: { id: source.id },
      data: {
        lastParsed: new Date(),
        messageCount: { increment: newMessages },
      },
    });

    return {
      success: true,
      messagesCount: totalFetched,
      newMessages,
      sourceId: source.id,
      sourceName: source.name,
    };
  } catch (error) {
    console.error("Parse error:", error);
    return {
      success: false,
      messagesCount: 0,
      newMessages: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      sourceId: source.id,
      sourceName: source.name,
    };
  }
}

// Parse all sources using all available accounts
export async function parseAllSources(options: ParseOptions = {}): Promise<{ results: ParseResult[]; total: number }> {
  const sources = await prisma.telegramSource.findMany({
    where: { isActive: true },
  });

  if (sources.length === 0) {
    return { results: [], total: 0 };
  }

  const settings = await getSettings();
  const clients = await getAllClients();

  if (clients.length === 0) {
    // Fallback to single client
    const client = await getTelegramClient();
    if (!client.connected) {
      await client.connect();
    }

    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
      return { results: [{ success: false, messagesCount: 0, newMessages: 0, error: "Not authorized" }], total: 0 };
    }

    const results: ParseResult[] = [];
    for (const source of sources) {
      const result = await parseChannel(source.id, { ...options, client });
      results.push(result);
      await new Promise((resolve) => setTimeout(resolve, settings.delayBetweenRequests));
    }

    return {
      results,
      total: results.reduce((acc, r) => acc + r.newMessages, 0),
    };
  }

  // Distribute sources among clients
  const sourcesPerClient = Math.ceil(sources.length / clients.length);
  const results: ParseResult[] = [];

  // Process in parallel batches
  const promises: Promise<ParseResult[]>[] = [];

  for (let i = 0; i < clients.length; i++) {
    const clientSources = sources.slice(i * sourcesPerClient, (i + 1) * sourcesPerClient);
    const { client } = clients[i];

    const promise = (async () => {
      const clientResults: ParseResult[] = [];
      for (const source of clientSources) {
        const result = await parseChannel(source.id, { ...options, client });
        clientResults.push(result);
        await new Promise((resolve) => setTimeout(resolve, settings.delayBetweenRequests));
      }
      return clientResults;
    })();

    promises.push(promise);
  }

  const allResults = await Promise.all(promises);
  for (const clientResults of allResults) {
    results.push(...clientResults);
  }

  return {
    results,
    total: results.reduce((acc, r) => acc + r.newMessages, 0),
  };
}

// Parse full history of a single channel
export async function parseChannelFullHistory(sourceId: string, maxMessages?: number): Promise<ParseResult> {
  return parseChannel(sourceId, { fullHistory: true, maxMessages });
}

// Export settings getter for scheduler
export { getSettings };
