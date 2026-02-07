import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { prisma } from "@/lib/prisma";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";

// Store multiple clients by phone number
const clients: Map<string, TelegramClient> = new Map();

// Get or create a client for a specific phone/session
export async function getTelegramClient(phone?: string): Promise<TelegramClient> {
  // If phone specified, get that specific client
  if (phone) {
    // Check if client already exists in memory (even if not connected)
    const existing = clients.get(phone);
    if (existing) {
      return existing;
    }

    // Check database for saved session
    const session = await prisma.telegramSession.findUnique({
      where: { phone },
    });

    if (session) {
      const stringSession = new StringSession(session.session);
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });
      clients.set(phone, client);
      return client;
    }

    // No session in DB - create new client and save to map for reuse during auth
    const stringSession = new StringSession("");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    clients.set(phone, client);
    return client;
  }

  // Get first active session
  const session = await prisma.telegramSession.findFirst({
    where: { isActive: true },
  });

  if (session) {
    const existing = clients.get(session.phone);
    if (existing) {
      return existing;
    }

    const stringSession = new StringSession(session.session);
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    clients.set(session.phone, client);
    return client;
  }

  // No session found, create new empty client (without phone - can't save to map)
  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  return client;
}

// Get all active clients
export async function getAllClients(): Promise<{ phone: string; client: TelegramClient; name: string | null }[]> {
  const sessions = await prisma.telegramSession.findMany({
    where: { isActive: true },
  });

  const result: { phone: string; client: TelegramClient; name: string | null }[] = [];

  for (const session of sessions) {
    let client = clients.get(session.phone);

    if (!client) {
      const stringSession = new StringSession(session.session);
      client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });
      clients.set(session.phone, client);
    }

    if (!client.connected) {
      await client.connect();
    }

    result.push({
      phone: session.phone,
      client,
      name: session.name,
    });
  }

  return result;
}

// Save session to database
export async function saveSession(phone: string, session: string, name?: string): Promise<void> {
  await prisma.telegramSession.upsert({
    where: { phone },
    update: { session, isActive: true, name: name || undefined },
    create: { phone, session, isActive: true, name: name || "Основной" },
  });
}

// Update session name
export async function updateSessionName(phone: string, name: string): Promise<void> {
  await prisma.telegramSession.update({
    where: { phone },
    data: { name },
  });
}

// Delete session
export async function deleteSession(phone: string): Promise<void> {
  const client = clients.get(phone);
  if (client) {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    clients.delete(phone);
  }

  await prisma.telegramSession.delete({
    where: { phone },
  });
}

// Check if a specific client is authorized
export async function isClientAuthorized(phone?: string): Promise<boolean> {
  try {
    const client = await getTelegramClient(phone);
    if (!client.connected) {
      await client.connect();
    }
    return await client.isUserAuthorized();
  } catch {
    return false;
  }
}

// Get all sessions info
export async function getAllSessions() {
  return prisma.telegramSession.findMany({
    select: {
      id: true,
      phone: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export { clients };
