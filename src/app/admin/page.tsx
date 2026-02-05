"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Stats {
  telegram: {
    messages: number;
    analyzed: number;
    cards: number;
  };
  avito: {
    ads: number;
    sources: number;
  };
  forum: {
    posts: number;
    sources: number;
  };
  crm: {
    matches: number;
    deals: number;
  };
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Fetch stats
    Promise.all([
      fetch("/api/drafts?stats=true").then(r => r.json()).catch(() => ({})),
      fetch("/api/avito/ads?stats=true").then(r => r.json()).catch(() => ({})),
      fetch("/api/forum/stats").then(r => r.json()).catch(() => ({})),
      fetch("/api/admin/crm/matches").then(r => r.json()).catch(() => ({})),
    ]).then(([telegramData, avitoData, forumData, crmData]) => {
      setStats({
        telegram: {
          messages: telegramData.total || 0,
          analyzed: (telegramData.requests || 0) + (telegramData.offers || 0),
          cards: 0,
        },
        avito: {
          ads: avitoData.total || 0,
          sources: avitoData.sources || 0,
        },
        forum: {
          posts: forumData.totalPosts || 0,
          sources: forumData.totalSources || 0,
        },
        crm: {
          matches: crmData.total || 0,
          deals: crmData.statusCounts?.deal || 0,
        },
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Админ-панель</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telegram */}
          <Link href="/admin/telegram" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">
                  📡
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Telegram</h2>
                  <p className="text-gray-500 text-sm">Парсинг групп и каналов</p>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.telegram.messages.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Сообщений</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.telegram.analyzed.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Заявок</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.telegram.cards.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Карточек</div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-blue-600 text-sm font-medium">
                Перейти →
              </div>
            </div>
          </Link>

          {/* Avito */}
          <Link href="/admin/avito" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-green-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl">
                  🛒
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Avito</h2>
                  <p className="text-gray-500 text-sm">Парсинг объявлений</p>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.avito.ads.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Объявлений</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.avito.sources.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Источников</div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-green-600 text-sm font-medium">
                Перейти →
              </div>
            </div>
          </Link>

          {/* Forum */}
          <Link href="/admin/forum/parser" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-orange-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-3xl">
                  💬
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Форумы</h2>
                  <p className="text-gray-500 text-sm">Парсинг форумов</p>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.forum.posts.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Постов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.forum.sources.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Источников</div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-orange-600 text-sm font-medium">
                Перейти →
              </div>
            </div>
          </Link>

          {/* CRM */}
          <Link href="/admin/crm" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-purple-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl">
                  🤝
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">CRM</h2>
                  <p className="text-gray-500 text-sm">Матчинг заявок</p>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.crm.matches.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Матчей</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.crm.deals.toLocaleString("ru-RU")}
                    </div>
                    <div className="text-xs text-gray-500">Сделок</div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-purple-600 text-sm font-medium">
                Перейти →
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
