"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Stats {
  messages: number;
  analyzed: number;
  pending: number;
  sources: number;
}

export default function TelegramLandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/drafts?stats=true").then(r => r.json()).catch(() => ({})),
      fetch("/api/telegram/sources").then(r => r.json()).catch(() => []),
    ]).then(([draftsData, sourcesData]) => {
      const sources = Array.isArray(sourcesData) ? sourcesData : [];
      const totalMessages = sources.reduce((acc: number, s: any) => acc + (s._count?.rawMessages || 0), 0);

      setStats({
        messages: totalMessages,
        analyzed: (draftsData.requests || 0) + (draftsData.offers || 0),
        pending: draftsData.pending || 0,
        sources: sources.length,
      });
    });
  }, []);

  const navItems = [
    {
      href: "/admin/telegram/parser",
      icon: "📡",
      title: "Парсер",
      description: "Управление аккаунтами и каналами",
      color: "blue",
    },
    {
      href: "/admin/telegram/drafts",
      icon: "📝",
      title: "Черновики",
      description: "Классификация и обогащение",
      color: "purple",
    },
    {
      href: "/admin/telegram/cards",
      icon: "🎴",
      title: "Карточки",
      description: "Готовые объявления",
      color: "green",
    },
    {
      href: "/admin/telegram/categories",
      icon: "📂",
      title: "Категории",
      description: "Настройка обогащения",
      color: "orange",
    },
  ];

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "bg-blue-50", border: "hover:border-blue-500", text: "text-blue-600" },
    purple: { bg: "bg-purple-50", border: "hover:border-purple-500", text: "text-purple-600" },
    green: { bg: "bg-green-50", border: "hover:border-green-500", text: "text-green-600" },
    orange: { bg: "bg-orange-50", border: "hover:border-orange-500", text: "text-orange-600" },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-600">
            ← Назад
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Telegram</h1>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.sources}</div>
              <div className="text-xs text-gray-500">Каналов</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.messages.toLocaleString("ru-RU")}</div>
              <div className="text-xs text-gray-500">Сообщений</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.analyzed.toLocaleString("ru-RU")}</div>
              <div className="text-xs text-gray-500">Заявок</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending.toLocaleString("ru-RU")}</div>
              <div className="text-xs text-gray-500">Ожидают</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <div className={`bg-white rounded-xl shadow p-6 border-2 border-transparent ${colorClasses[item.color].border} transition-all hover:shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${colorClasses[item.color].bg} rounded-xl flex items-center justify-center text-2xl`}>
                    {item.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                <div className={`mt-4 text-sm font-medium ${colorClasses[item.color].text}`}>
                  Открыть →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
