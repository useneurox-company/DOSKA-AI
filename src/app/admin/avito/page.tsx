"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Stats {
  totalAds: number;
  todayAds: number;
  totalSources: number;
  activeSources: number;
  totalProxies: number;
  activeProxies: number;
  runningJobs: number;
}

export default function AvitoLandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/avito/stats")
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const navItems = [
    {
      href: "/admin/avito/parser",
      icon: "🔧",
      title: "Парсер",
      description: "Прокси, источники, запуск",
      color: "blue",
    },
    {
      href: "/admin/avito/parser?tab=ads",
      icon: "📦",
      title: "Объявления",
      description: "Просмотр и экспорт",
      color: "green",
    },
    {
      href: "/admin/avito/cards",
      icon: "🤖",
      title: "Карточки",
      description: "AI обогащение и карточки",
      color: "purple",
    },
  ];

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "bg-blue-50", border: "hover:border-blue-500", text: "text-blue-600" },
    green: { bg: "bg-green-50", border: "hover:border-green-500", text: "text-green-600" },
    purple: { bg: "bg-purple-50", border: "hover:border-purple-500", text: "text-purple-600" },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-600">
            ← Назад
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Avito</h1>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalSources || 0}</div>
              <div className="text-xs text-gray-500">Источников</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{(stats.totalAds || 0).toLocaleString("ru-RU")}</div>
              <div className="text-xs text-gray-500">Объявлений</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">+{stats.todayAds || 0}</div>
              <div className="text-xs text-gray-500">Сегодня</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalProxies || 0}</div>
              <div className="text-xs text-gray-500">Прокси</div>
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
