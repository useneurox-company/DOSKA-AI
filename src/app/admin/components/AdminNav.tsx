"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavProps {
  lastParsed?: string | null;
  totalMessages?: number;
  analyzedMessages?: number;
}

export default function AdminNav({ lastParsed, totalMessages, analyzedMessages }: AdminNavProps) {
  const pathname = usePathname();

  // Определяем, в каком разделе мы находимся
  const isTelegramSection = pathname.startsWith("/admin/telegram");
  const isCrmSection = pathname.startsWith("/admin/crm");
  const isStorageSection = pathname.startsWith("/admin/storage");

  // Навигация для раздела Telegram + CRM + Storage
  const telegramTabs = [
    { href: "/admin/telegram/parser", label: "Парсер" },
    { href: "/admin/telegram/drafts", label: "Черновики" },
    { href: "/admin/telegram/cards", label: "Карточки" },
    { href: "/admin/telegram/subcategories", label: "Подкатегории" },
    { href: "/admin/telegram/categories", label: "Категории" },
    { href: "/admin/crm", label: "CRM" },
    { href: "/admin/storage", label: "Хранилище" },
  ];

  // Показываем в Telegram разделе, CRM и Storage
  if (!isTelegramSection && !isCrmSection && !isStorageSection) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        {/* Табы */}
        <div className="flex gap-1">
          <Link
            href="/admin/telegram"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-600"
          >
            ← Telegram
          </Link>
          <div className="border-l mx-2"></div>
          {telegramTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Статус */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {totalMessages !== undefined && (
            <span>
              <span className="font-medium text-gray-900">{totalMessages.toLocaleString("ru-RU")}</span> сообщений
            </span>
          )}
          {analyzedMessages !== undefined && analyzedMessages > 0 && (
            <span>
              <span className="font-medium text-green-600">{analyzedMessages.toLocaleString("ru-RU")}</span> проанализировано
            </span>
          )}
          {lastParsed && (
            <span className="flex items-center gap-1">
              <span className="text-green-500">●</span>
              Парсинг: {formatTimeAgo(lastParsed)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин назад`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;

  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
