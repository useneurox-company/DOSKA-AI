"use client";

import { useState } from "react";
import AdminNav from "../components/AdminNav";

// Тестовые данные карточки
const DEMO_CARD = {
  rawMessageId: "demo-1",
  type: "REQUEST" as const,
  category: "Металлопрокат",
  subcategory: "Листовой прокат",
  title: "Закупка листа 100 мм судовая сталь PC F40W",
  items: [
    { name: "Лист горячекатаный (судовая сталь) PC F40W", quantity: "7 тонн" },
  ],
  description: "Ищем судовую сталь",
  price: null,
  city: "Орёл",
  region: "Орловская область",
  contacts: {
    phone: null,
    telegram: null,
    email: "ka52@vplmet.ru",
  },
  company: "ООО Вымпел",
  date: "2025-09-24T06:40:46.000Z",
  sourceGroup: "Металлоконструкции от А до Я",
  mediaFiles: ["/uploads/telegram/demo_photo.jpg"],
  originalMessage: {
    text: "‼️ Добрый день, ищем судовую сталь ‼️\n\nЛист 100 ГОСТ 19903-2015 PC F40W ГОСТ Р 52927-2015 7 тонн",
    senderName: "Вымпел Екатерина",
    senderUsername: "vympel_ek",
    sourceName: "Металлоконструкции от А до Я",
    sourceUsername: "MKotAdoZ",
    hasMedia: true,
    mediaUrl: "/uploads/telegram/demo_photo.jpg",
  },
};

// Функция возраста
const getDaysAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return `${diffDays} дн.`;
};

// Функция даты
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ru-RU");
};

export default function CardDemoPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const card = DEMO_CARD;

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Демо: 5 вариантов карточки</h1>
        <p className="text-gray-600 mb-6">Выберите понравившийся вариант</p>

        <div className="grid gap-6">
          {/* Вариант 1: Компактная */}
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 ${selected === 1 ? 'border-blue-500' : 'border-transparent'}`}
            onClick={() => setSelected(1)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-gray-400">Вариант 1: Компактная</span>
              {selected === 1 && <span className="text-blue-500">✓ Выбрано</span>}
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-4">
                <span className="px-2 py-1 bg-blue-500 text-white rounded text-sm font-medium">
                  ЗАЯВКА
                </span>
                <span className="font-medium flex-1 truncate">{card.title}</span>
                <span className="text-gray-500 text-sm">{card.subcategory}</span>
                <span className="text-gray-500 text-sm">📍 {card.city}</span>
                <span className="px-2 py-0.5 bg-gray-200 rounded text-sm">{getDaysAgo(card.date)}</span>
                {card.company && <span className="text-purple-600 text-sm">🏢 {card.company}</span>}
                <a href={`https://t.me/${card.originalMessage.senderUsername}`} className="text-blue-500 hover:underline text-sm" onClick={e => e.stopPropagation()}>
                  @{card.originalMessage.senderUsername}
                </a>
                <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">✓</button>
                <button className="px-3 py-1 bg-red-500 text-white rounded text-sm">✕</button>
              </div>
            </div>
          </div>

          {/* Вариант 2: С превью слева */}
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 ${selected === 2 ? 'border-blue-500' : 'border-transparent'}`}
            onClick={() => setSelected(2)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-gray-400">Вариант 2: С превью</span>
              {selected === 2 && <span className="text-blue-500">✓ Выбрано</span>}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex">
                {/* Превью */}
                <div className="w-32 h-32 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                  {card.originalMessage.hasMedia ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-gray-500">
                      📷
                    </div>
                  ) : (
                    <span className="text-gray-400">Нет фото</span>
                  )}
                </div>
                {/* Контент */}
                <div className="flex-1 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs">ЗАЯВКА</span>
                    <span className="text-gray-500 text-sm">{card.category} › {card.subcategory}</span>
                    <span className="ml-auto px-2 py-0.5 bg-gray-200 rounded text-xs">{getDaysAgo(card.date)}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📍 {card.city}</span>
                    {card.company && <span className="text-purple-600">🏢 {card.company}</span>}
                    <a href={`https://t.me/${card.originalMessage.senderUsername}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                      👤 @{card.originalMessage.senderUsername}
                    </a>
                  </div>
                </div>
                {/* Кнопки */}
                <div className="flex flex-col gap-2 p-3 border-l">
                  <button className="px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600">✓ Одобрить</button>
                  <button className="px-4 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600">✕ Отклонить</button>
                </div>
              </div>
            </div>
          </div>

          {/* Вариант 3: Детальная */}
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 ${selected === 3 ? 'border-blue-500' : 'border-transparent'}`}
            onClick={() => setSelected(3)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-gray-400">Вариант 3: Детальная</span>
              {selected === 3 && <span className="text-blue-500">✓ Выбрано</span>}
            </div>
            <div className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-blue-500 text-white px-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm opacity-80">ЗАЯВКА</span>
                    <h3 className="font-semibold text-lg">{card.title}</h3>
                  </div>
                  <span className="text-sm opacity-80">{card.category}</span>
                </div>
              </div>
              {/* Body */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Левая колонка */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Подкатегория</div>
                      <div className="text-sm">{card.subcategory}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Позиции</div>
                      <ul className="text-sm">
                        {card.items.map((item, i) => (
                          <li key={i}>• {item.name} ({item.quantity})</li>
                        ))}
                      </ul>
                    </div>
                    {card.description && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Описание</div>
                        <div className="text-sm bg-gray-50 p-2 rounded">{card.description}</div>
                      </div>
                    )}
                    <div className="flex gap-4 text-sm">
                      <span>📅 {formatDate(card.date)}</span>
                      <span className="px-2 py-0.5 bg-gray-200 rounded">{getDaysAgo(card.date)}</span>
                    </div>
                  </div>
                  {/* Правая колонка */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Локация</div>
                      <div className="text-sm">📍 {card.city}, {card.region}</div>
                    </div>
                    {card.company && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Компания</div>
                        <div className="text-sm text-purple-600">🏢 {card.company}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Контакты</div>
                      <div className="space-y-1 text-sm">
                        <div>
                          👤 <a href={`https://t.me/${card.originalMessage.senderUsername}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                            @{card.originalMessage.senderUsername}
                          </a>
                          <span className="text-gray-500 ml-1">({card.originalMessage.senderName})</span>
                        </div>
                        {card.contacts.email && (
                          <div>📧 <a href={`mailto:${card.contacts.email}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>{card.contacts.email}</a></div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Источник</div>
                      <div className="text-sm">
                        <a href={`https://t.me/${card.originalMessage.sourceUsername}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                          {card.sourceGroup}
                        </a>
                      </div>
                    </div>
                    {/* Превью */}
                    {card.originalMessage.hasMedia && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Медиа</div>
                        <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400">📷</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="border-t px-4 py-3 flex justify-end gap-2">
                <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">✓ Одобрить</button>
                <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">✕ Отклонить</button>
              </div>
            </div>
          </div>

          {/* Вариант 4: Две колонки (карточка + оригинал) */}
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 ${selected === 4 ? 'border-blue-500' : 'border-transparent'}`}
            onClick={() => setSelected(4)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-gray-400">Вариант 4: С оригиналом</span>
              {selected === 4 && <span className="text-blue-500">✓ Выбрано</span>}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2">
                {/* Левая - обработанная карточка */}
                <div className="p-4 border-r">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-blue-500 text-white rounded text-sm">ЗАЯВКА</span>
                    <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">{getDaysAgo(card.date)}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <div className="text-sm text-gray-500 mb-3">{card.subcategory}</div>
                  <div className="space-y-2 text-sm">
                    <div>📍 {card.city}</div>
                    {card.company && <div className="text-purple-600">🏢 {card.company}</div>}
                    <div>
                      👤 <a href={`https://t.me/${card.originalMessage.senderUsername}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                        @{card.originalMessage.senderUsername}
                      </a>
                    </div>
                    {card.contacts.email && (
                      <div>📧 <a href={`mailto:${card.contacts.email}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>{card.contacts.email}</a></div>
                    )}
                  </div>
                </div>
                {/* Правая - оригинал */}
                <div className="p-4 bg-gray-50">
                  <div className="text-xs text-gray-500 mb-2">Оригинальное сообщение:</div>
                  <div className="text-sm whitespace-pre-wrap bg-white p-3 rounded border mb-3">
                    {card.originalMessage.text}
                  </div>
                  <div className="text-xs text-gray-500">
                    Группа: <a href={`https://t.me/${card.originalMessage.sourceUsername}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>@{card.originalMessage.sourceUsername}</a>
                  </div>
                  {card.originalMessage.hasMedia && (
                    <div className="mt-3">
                      <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400">📷</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div className="border-t px-4 py-3 flex justify-center gap-4">
                <button className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600">✓ Одобрить</button>
                <button className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">✕ Отклонить</button>
              </div>
            </div>
          </div>

          {/* Вариант 5: Минимальная для скорости */}
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 ${selected === 5 ? 'border-blue-500' : 'border-transparent'}`}
            onClick={() => setSelected(5)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-gray-400">Вариант 5: Для быстрой модерации</span>
              {selected === 5 && <span className="text-blue-500">✓ Выбрано</span>}
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex gap-4">
                {/* Превью */}
                {card.originalMessage.hasMedia && (
                  <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400">
                    📷
                  </div>
                )}
                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Заявка</span>
                    <span className="text-xs text-gray-400">{getDaysAgo(card.date)}</span>
                    {card.company && <span className="text-xs text-purple-600">🏢 {card.company}</span>}
                  </div>
                  <h3 className="font-medium truncate">{card.title}</h3>
                  <div className="text-sm text-gray-500 truncate">
                    {card.city} • <a href={`https://t.me/${card.originalMessage.senderUsername}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>@{card.originalMessage.senderUsername}</a>
                  </div>
                </div>
                {/* Кнопки */}
                <div className="flex items-center gap-2">
                  <button className="w-12 h-12 bg-green-500 text-white rounded-full text-xl hover:bg-green-600 flex items-center justify-center">✓</button>
                  <button className="w-12 h-12 bg-red-500 text-white rounded-full text-xl hover:bg-red-600 flex items-center justify-center">✕</button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {selected && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-blue-800">Выбран вариант {selected}. Напишите номер чтобы я применил его к карточкам.</p>
          </div>
        )}
      </div>
    </div>
  );
}
