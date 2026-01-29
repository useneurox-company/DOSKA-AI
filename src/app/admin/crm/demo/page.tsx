"use client";

import { useState } from "react";

// Мок данные заявки (полный набор полей)
const mockRequest = {
  id: "req-1",
  title: "Изготовление металлоконструкций, 130 тонн",
  description: "Срочный заказ на изготовление металлоконструкций объемом 130 тонн. Нужны сертификаты качества.",
  originalText: "Ищем подрядчика на изготовление МК 130т, срочно! Сертификаты обязательны. Звоните.",
  quantity: "130 тонн",
  city: "Екатеринбург",
  price: 500000,
  priceUnit: "₽/т",
  categoryName: "Металлоконструкции",
  subcategory: "Изготовление МК",
  date: "2025-12-01T01:45:32.000Z",
  sourceName: "МеталлТрейд Урал",
  contacts: {
    name: "Максим",
    username: "skaliar23",
    phone: "+7 912 345 67 89",
  },
};

// Расчёт дней
const getDaysAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return `${diff} дн. назад`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
};

// Мок данные для СОСТАВНОЙ заявки (несколько позиций)
const mockRequestMulti = {
  id: "req-multi",
  title: "Комплексная поставка металлопроката",
  description: "Срочно требуется поставка металлопроката на объект. Нужны сертификаты качества на всю продукцию.",
  originalText: "Добрый день! Нужна комплексная поставка: балка 18М 10т, швеллер 12 5т, труба профильная 100x50 3т. Срочно, сертификаты обязательны!",
  city: "Екатеринбург",
  categoryName: "Металлопрокат",
  subcategory: "Комплексные поставки",
  date: "2025-12-01T01:45:32.000Z",
  sourceName: "МеталлТрейд Урал",
  contacts: {
    name: "Алексей",
    username: "alexmetal",
    phone: "+7 912 345 67 89",
  },
  positions: [
    { id: "p1", name: "Балка 18М", quantity: "10 тонн", price: 85000 },
    { id: "p2", name: "Швеллер 12", quantity: "5 тонн", price: 72000 },
    { id: "p3", name: "Труба 100x50", quantity: "3 тонны", price: 95000 },
  ],
};

// Предложения сгруппированные по позициям
const mockOffersMulti = [
  // Балка 18М (p1)
  { id: "om-1", positionId: "p1", score: 96, title: "Балка 18М в наличии", company: "МеталлТрейд", city: "Москва", price: 85000, contact: "@metal_trade", reason: "Идеальное совпадение", risks: [] },
  { id: "om-2", positionId: "p1", score: 84, title: "Балки любых размеров", company: "СтальПром", city: "Екатеринбург", price: 82000, contact: "@stalprom", reason: "Местный поставщик", risks: ["Срок 3-5 дней"] },
  { id: "om-3", positionId: "p1", score: 71, title: "Металлопрокат оптом", company: "БазаМет", city: "Челябинск", price: 79000, contact: "@bazamet", reason: "Низкая цена", risks: ["Другой город"] },
  // Швеллер 12 (p2)
  { id: "om-4", positionId: "p2", score: 91, title: "Швеллер 12 ГОСТ", company: "ПромМеталл", city: "Екатеринбург", price: 72000, contact: "@prommet", reason: "Точное соответствие", risks: [] },
  { id: "om-5", positionId: "p2", score: 68, title: "Швеллеры, уголки", company: "МеталлСервис", city: "Пермь", price: 70000, contact: "@metserv", reason: "Хорошая цена", risks: ["Доставка 2 дня"] },
  // Труба 100x50 (p3)
  { id: "om-6", positionId: "p3", score: 88, title: "Труба профильная 100x50", company: "ТрубоСталь", city: "Екатеринбург", price: 95000, contact: "@trubostal", reason: "В наличии на складе", risks: [] },
  { id: "om-7", positionId: "p3", score: 75, title: "Профильные трубы", company: "МеталлИнвест", city: "Москва", price: 92000, contact: "@metinvest", reason: "Большой выбор", risks: ["Доставка"] },
  { id: "om-8", positionId: "p3", score: 62, title: "Трубы профильные", company: "СтальОпт", city: "Тюмень", price: 89000, contact: "@stalopt", reason: "Низкая цена", risks: ["Далеко", "Срок 5 дней"] },
  { id: "om-9", positionId: "p3", score: 51, title: "Металлопрокат б/у", company: "ВторМет", city: "Курган", price: 75000, contact: "@vtormet", reason: "Очень дёшево", risks: ["Б/У", "Качество"] },
];

// Расширенные мок-данные для предложений (с доп. полями)
const mockOffersExtended = [
  {
    id: "off-1",
    score: 96,
    title: "Балка 18М в наличии",
    company: "МеталлТрейд",
    city: "Москва",
    price: 85000,
    priceUnit: "₽/т",
    quantity: "до 500 тонн",
    date: "2025-12-10T10:30:00.000Z",
    categoryName: "Металлопрокат",
    subcategory: "Балки двутавровые",
    sourceName: "МеталлТрейд Урал",
    description: "Балка 18М ГОСТ 26020-83 в наличии на складе. Резка в размер. Доставка по России.",
    originalText: "Продаю балку 18М, есть на складе до 500т, цена 85000/т, резка, доставка. @ANDREI_78",
    contacts: {
      name: "Андрей Петров",
      username: "ANDREI_78",
      phone: "+7 915 123 45 67",
    },
    reason: "Идеальное совпадение: товар, город, объём. Продавец — крупный игрок с мощностями.",
    risks: ["Уточнить наличие марки 18М"],
    margin: { percent: 12, absolute: 78000 },
  },
  {
    id: "off-2",
    score: 84,
    title: "Металлопрокат оптом",
    company: "СтальИнвест",
    city: "Москва",
    price: 82000,
    priceUnit: "₽/т",
    quantity: "от 1 тонны",
    date: "2025-11-28T14:20:00.000Z",
    categoryName: "Металлопрокат",
    subcategory: "Балки",
    sourceName: "Биржа металлов",
    description: "Широкий ассортимент металлопроката. Балки, швеллеры, уголки. Оптовые цены.",
    originalText: "СтальИнвест - оптовые поставки металлопроката. Балка 18М от 82000₽/т. Звоните!",
    contacts: {
      name: "Менеджер",
      username: "steel_invest",
      phone: "+7 495 999 88 77",
    },
    reason: "Широкий ассортимент, балка 18М в каталоге.",
    risks: ["Минимальный заказ от 1 тонны"],
    margin: { percent: 8, absolute: 52000 },
  },
];

const mockOffers = [
  {
    id: "off-1",
    score: 96,
    title: "Балка 18М в наличии",
    company: "МеталлТрейд",
    city: "Москва",
    price: 85000,
    priceUnit: "₽/т",
    contact: "@ANDREI_78",
    reason: "Идеальное совпадение: товар, город, объём.",
    risks: ["Уточнить наличие марки 18М"],
  },
  {
    id: "off-2",
    score: 84,
    title: "Металлопрокат оптом",
    company: "СтальИнвест",
    city: "Москва",
    price: 82000,
    priceUnit: "₽/т",
    contact: "@steel_invest",
    reason: "Широкий ассортимент, балка 18М в каталоге.",
    risks: ["Минимальный заказ от 1 тонны"],
  },
  {
    id: "off-3",
    score: 77,
    title: "Балки, швеллеры",
    company: "ПромМеталл",
    city: "Екатеринбург",
    price: 79000,
    priceUnit: "₽/т",
    contact: "@echernigova",
    reason: "Комплексные поставки металлопроката.",
    risks: ["Другой город", "Крупный опт"],
  },
  {
    id: "off-4",
    score: 65,
    title: "Металлоизделия",
    company: "ЗаводМет",
    city: "Челябинск",
    price: 76000,
    priceUnit: "₽/т",
    contact: "Игорь",
    reason: "Производитель, резка в размер.",
    risks: ["Срок 5-7 дней", "Далеко"],
  },
  {
    id: "off-5",
    score: 52,
    title: "Вторичка",
    company: "БазаМет",
    city: "Тула",
    price: 65000,
    priceUnit: "₽/т",
    contact: "Николай",
    reason: "Низкая цена, б/у хорошего качества.",
    risks: ["Б/У", "Ограничено"],
  },
];

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-orange-500";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-orange-500";
};

// Заявка - компактная шапка (общая для всех)
function RequestHeader() {
  return (
    <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">Заявка:</span>
        <span className="font-semibold">{mockRequest.title}</span>
      </div>
      <div className="flex items-center gap-4 text-gray-400">
        <span>{mockRequest.city}</span>
        <span>{mockRequest.quantity}</span>
        <span>{mockRequest.contacts.name}</span>
      </div>
    </div>
  );
}

// Вариант 1: Ультра-компактная
function Table1() {
  return (
    <div>
      <RequestHeader />
      <table className="w-full bg-white text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left w-16">%</th>
            <th className="px-3 py-2 text-left">Предложение</th>
            <th className="px-3 py-2 text-left w-28">Город</th>
            <th className="px-3 py-2 text-right w-28">Цена</th>
            <th className="px-3 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mockOffers.map((offer, idx) => (
            <tr key={offer.id} className={`hover:bg-gray-50 ${idx === 0 ? 'bg-green-50' : ''}`}>
              <td className={`px-3 py-2 font-bold ${getScoreColor(offer.score)}`}>{offer.score}</td>
              <td className="px-3 py-2">{offer.title} <span className="text-gray-400">· {offer.company}</span></td>
              <td className="px-3 py-2 text-gray-600">{offer.city}</td>
              <td className="px-3 py-2 text-right font-semibold">{offer.price?.toLocaleString()}</td>
              <td className="px-3 py-2">
                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Выбрать</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Вариант 2: С прогресс-баром
function Table2() {
  return (
    <div>
      <RequestHeader />
      <table className="w-full bg-white text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left w-32">Совпадение</th>
            <th className="px-3 py-2 text-left">Поставщик</th>
            <th className="px-3 py-2 text-left w-28">Город</th>
            <th className="px-3 py-2 text-right w-28">Цена</th>
            <th className="px-3 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mockOffers.map((offer, idx) => (
            <tr key={offer.id} className={`hover:bg-gray-50 ${idx === 0 ? 'bg-green-50' : ''}`}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreBg(offer.score)}`} style={{ width: `${offer.score}%` }} />
                  </div>
                  <span className={`text-xs font-semibold ${getScoreColor(offer.score)}`}>{offer.score}%</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{offer.company}</div>
              </td>
              <td className="px-3 py-2 text-gray-600">{offer.city}</td>
              <td className="px-3 py-2 text-right font-semibold">{offer.price?.toLocaleString()}</td>
              <td className="px-3 py-2">
                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Выбрать</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Вариант 3: Иконочная
function Table3() {
  return (
    <div>
      <RequestHeader />
      <table className="w-full bg-white text-sm">
        <thead className="bg-gray-100 text-gray-500">
          <tr>
            <th className="px-3 py-2 text-center w-12" title="Совпадение">🎯</th>
            <th className="px-3 py-2 text-left" title="Компания">🏢</th>
            <th className="px-3 py-2 text-center w-24" title="Город">📍</th>
            <th className="px-3 py-2 text-center w-28" title="Цена">💰</th>
            <th className="px-3 py-2 text-center w-20" title="Контакт">📱</th>
            <th className="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mockOffers.map((offer, idx) => (
            <tr key={offer.id} className={`hover:bg-gray-50 ${idx === 0 ? 'bg-green-50' : ''}`}>
              <td className={`px-3 py-2 text-center font-bold ${getScoreColor(offer.score)}`}>{offer.score}</td>
              <td className="px-3 py-2 font-medium">{offer.company}</td>
              <td className="px-3 py-2 text-center text-gray-600">{offer.city}</td>
              <td className="px-3 py-2 text-center font-semibold">{offer.price?.toLocaleString()}</td>
              <td className="px-3 py-2 text-center text-gray-500 text-xs">{offer.contact}</td>
              <td className="px-3 py-2">
                <button className="p-1 bg-blue-600 text-white rounded text-xs">→</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Вариант 4: С раскрытием
function Table4() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <RequestHeader />
      <div className="bg-white divide-y divide-gray-100">
        {mockOffers.map((offer, idx) => (
          <div key={offer.id}>
            <div
              className={`flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${idx === 0 ? 'bg-green-50' : ''}`}
              onClick={() => setExpanded(expanded === offer.id ? null : offer.id)}
            >
              <span className={`w-12 font-bold ${getScoreColor(offer.score)}`}>{offer.score}%</span>
              <span className="flex-1 font-medium">{offer.company}</span>
              <span className="w-28 text-gray-600">{offer.city}</span>
              <span className="w-28 text-right font-semibold">{offer.price?.toLocaleString()}</span>
              <span className="w-20 text-right text-gray-400">{expanded === offer.id ? '▲' : '▼'}</span>
            </div>
            {expanded === offer.id && (
              <div className="px-3 py-2 bg-gray-50 text-sm border-t">
                <div className="text-gray-700 mb-1">{offer.reason}</div>
                {offer.risks.length > 0 && (
                  <div className="flex gap-2">
                    {offer.risks.map((risk, i) => (
                      <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
                    ))}
                  </div>
                )}
                <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs">Связаться</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Вариант 5: Ранжированная
function Table5() {
  const getRankBg = (idx: number) => {
    if (idx === 0) return 'bg-green-100 border-l-4 border-green-500';
    if (idx === 1) return 'bg-green-50 border-l-4 border-green-400';
    if (idx === 2) return 'bg-yellow-50 border-l-4 border-yellow-400';
    return 'bg-white border-l-4 border-gray-200';
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">TOP</span>;
    if (idx < 3) return <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded font-medium">#{idx + 1}</span>;
    return <span className="text-gray-500 text-xs font-medium">#{idx + 1}</span>;
  };

  return (
    <div>
      <RequestHeader />
      <div className="bg-white">
        {mockOffers.map((offer, idx) => (
          <div key={offer.id} className={`flex items-center px-3 py-3 text-sm ${getRankBg(idx)}`}>
            <div className="w-16">{getRankBadge(idx)}</div>
            <span className={`w-14 font-bold ${getScoreColor(offer.score)}`}>{offer.score}%</span>
            <span className="flex-1">
              <span className="font-semibold text-gray-900">{offer.company}</span>
              <span className="text-gray-600 ml-2">· {offer.title}</span>
            </span>
            <span className="w-28 text-gray-800">{offer.city}</span>
            <span className="w-32 text-right font-bold text-gray-900">{offer.price?.toLocaleString()} ₽</span>
            <div className="w-24 text-right">
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">Выбрать</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= 10 ВАРИАНТОВ ПАНЕЛИ ДЕТАЛЕЙ ЗАЯВКИ =============

// Общий заголовок заявки для демо
function RequestHeaderDemo({ onClickDetails }: { onClickDetails: () => void }) {
  return (
    <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
      <div
        className="flex items-center gap-4 cursor-pointer hover:opacity-80 flex-1"
        onClick={onClickDetails}
      >
        <span className="text-gray-400 text-sm">Заявка:</span>
        <span className="font-semibold">{mockRequest.title}</span>
        <span className="text-gray-400">· {mockRequest.quantity}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-400">{mockRequest.city}</span>
        <span className="text-gray-400">@{mockRequest.contacts.username}</span>
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">5 предл.</span>
        <span className="text-gray-400">▼</span>
      </div>
    </div>
  );
}

// Блок переписки (общий компонент)
function ChatPreview({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
      >
        💬 {expanded ? "Скрыть переписку" : "Показать переписку"}
      </button>
      {expanded && (
        <div className="mt-2 bg-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="space-y-2 text-xs">
            <div className="flex gap-2">
              <span className="text-blue-400 font-medium">@{mockRequest.contacts.username}:</span>
              <span className="text-gray-300">{mockRequest.originalText}</span>
            </div>
            <div className="text-gray-500 text-[10px]">
              {formatDate(mockRequest.date)} • {mockRequest.sourceName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 1: Минималист (только ключевое)
function Details1() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-yellow-400 font-bold">{getDaysAgo(mockRequest.date)}</span>
              <span className="text-gray-300">{mockRequest.categoryName}</span>
              <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline">
                @{mockRequest.contacts.username}
              </a>
            </div>
            <button onClick={() => setChat(!chat)} className="text-xs text-gray-400 hover:text-white">
              💬 Чат
            </button>
          </div>
          {chat && (
            <div className="mt-3 bg-gray-800 rounded p-2 text-gray-400 italic text-xs">
              "{mockRequest.originalText}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Вариант 2: Две строки (мета + контакты)
function Details2() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm space-y-2">
          <div className="flex items-center gap-4 text-gray-400 text-xs">
            <span className="bg-gray-600 px-2 py-0.5 rounded">{mockRequest.categoryName}</span>
            <span className="bg-gray-600 px-2 py-0.5 rounded">{mockRequest.subcategory}</span>
            <span className="bg-yellow-600 px-2 py-0.5 rounded text-white">{getDaysAgo(mockRequest.date)}</span>
            <span>{mockRequest.sourceName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">{mockRequest.contacts.name}</span>
            <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline">
              @{mockRequest.contacts.username}
            </a>
            <span className="text-gray-400">{mockRequest.contacts.phone}</span>
            <button onClick={() => setChat(!chat)} className="ml-auto text-xs text-gray-400 hover:text-white">
              💬 {chat ? "▲" : "▼"}
            </button>
          </div>
          {chat && (
            <div className="bg-gray-800 rounded p-2 text-gray-300 text-xs border-l-2 border-blue-500">
              {mockRequest.originalText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Вариант 3: Карточка описания + боковая панель контактов
function Details3() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <p className="text-gray-100">{mockRequest.description}</p>
              <div className="flex gap-2 text-xs">
                <span className="text-gray-500">{mockRequest.categoryName} / {mockRequest.subcategory}</span>
                <span className="text-yellow-400">• {getDaysAgo(mockRequest.date)}</span>
              </div>
              <ChatPreview expanded={chat} onToggle={() => setChat(!chat)} />
            </div>
            <div className="bg-gray-600 rounded p-3 text-center min-w-[140px]">
              <p className="font-semibold">{mockRequest.contacts.name}</p>
              <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 text-sm hover:underline block">
                @{mockRequest.contacts.username}
              </a>
              <p className="text-gray-400 text-xs mt-1">{mockRequest.contacts.phone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 4: Telegram-стиль (пузырь сообщения)
function Details4() {
  const [show, setShow] = useState(true);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {mockRequest.contacts.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{mockRequest.contacts.name}</span>
                <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 text-xs hover:underline">
                  @{mockRequest.contacts.username}
                </a>
              </div>
              <div className="bg-gray-600 rounded-lg rounded-tl-none p-3">
                <p className="text-gray-100">{mockRequest.originalText}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{mockRequest.categoryName} • {mockRequest.subcategory}</span>
                  <span>{formatDate(mockRequest.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>📞 {mockRequest.contacts.phone}</span>
                <span>📺 {mockRequest.sourceName}</span>
                <span className="text-yellow-400 font-medium">{getDaysAgo(mockRequest.date)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 5: Горизонтальные теги + чат внизу
function Details5() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(true);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="bg-gray-600 px-2 py-1 rounded text-xs">📁 {mockRequest.categoryName}</span>
            <span className="bg-gray-600 px-2 py-1 rounded text-xs">📂 {mockRequest.subcategory}</span>
            <span className="bg-yellow-600 px-2 py-1 rounded text-xs">⏱ {getDaysAgo(mockRequest.date)}</span>
            <span className="bg-gray-600 px-2 py-1 rounded text-xs">📺 {mockRequest.sourceName}</span>
            <span className="bg-green-600 px-2 py-1 rounded text-xs">👤 {mockRequest.contacts.name}</span>
            <a href={`https://t.me/${mockRequest.contacts.username}`} className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-500">
              @{mockRequest.contacts.username}
            </a>
            <span className="bg-gray-600 px-2 py-1 rounded text-xs">📞 {mockRequest.contacts.phone}</span>
          </div>
          <div className="border-t border-gray-600 pt-3">
            <button onClick={() => setChat(!chat)} className="text-xs text-gray-400 hover:text-white mb-2">
              💬 Оригинал сообщения {chat ? "▲" : "▼"}
            </button>
            {chat && (
              <div className="bg-gray-800 rounded p-3 text-gray-300 border-l-4 border-blue-500">
                "{mockRequest.originalText}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 6: Компактная таблица
function Details6() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white border-t border-gray-600 text-xs">
          <div className="grid grid-cols-6 divide-x divide-gray-600">
            <div className="p-2">
              <p className="text-gray-500">Категория</p>
              <p className="text-gray-100 truncate">{mockRequest.categoryName}</p>
            </div>
            <div className="p-2">
              <p className="text-gray-500">Подкат.</p>
              <p className="text-gray-100 truncate">{mockRequest.subcategory}</p>
            </div>
            <div className="p-2">
              <p className="text-gray-500">Возраст</p>
              <p className="text-yellow-400 font-medium">{getDaysAgo(mockRequest.date)}</p>
            </div>
            <div className="p-2">
              <p className="text-gray-500">Контакт</p>
              <p className="text-gray-100">{mockRequest.contacts.name}</p>
            </div>
            <div className="p-2">
              <p className="text-gray-500">Telegram</p>
              <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline">@{mockRequest.contacts.username}</a>
            </div>
            <div className="p-2">
              <p className="text-gray-500">Источник</p>
              <p className="text-gray-100 truncate">{mockRequest.sourceName}</p>
            </div>
          </div>
          <div className="border-t border-gray-600 p-2">
            <button onClick={() => setChat(!chat)} className="text-gray-400 hover:text-white">
              💬 {chat ? "Скрыть" : "Показать"} сообщение
            </button>
            {chat && <p className="mt-2 text-gray-300 italic">"{mockRequest.originalText}"</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 7: Акцент на времени (дней назад крупно)
function Details7() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
          <div className="flex gap-4">
            <div className="bg-yellow-600 rounded-lg px-4 py-2 text-center min-w-[80px]">
              <p className="text-2xl font-bold">415</p>
              <p className="text-xs opacity-80">дней</p>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-gray-100">{mockRequest.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{mockRequest.categoryName} / {mockRequest.subcategory}</span>
                <span>•</span>
                <span>{mockRequest.sourceName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{mockRequest.contacts.name}</span>
                <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline text-sm">
                  @{mockRequest.contacts.username}
                </a>
                <span className="text-gray-400 text-xs">{mockRequest.contacts.phone}</span>
              </div>
            </div>
          </div>
          <ChatPreview expanded={chat} onToggle={() => setChat(!chat)} />
        </div>
      )}
    </div>
  );
}

// Вариант 8: Вертикальный список с иконками
function Details8() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📁</span>
              <span className="text-gray-400">Категория:</span>
              <span className="text-gray-100">{mockRequest.categoryName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">👤</span>
              <span className="text-gray-400">Контакт:</span>
              <span className="text-gray-100 font-medium">{mockRequest.contacts.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📂</span>
              <span className="text-gray-400">Подкат.:</span>
              <span className="text-gray-100">{mockRequest.subcategory}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">💬</span>
              <span className="text-gray-400">Telegram:</span>
              <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline">
                @{mockRequest.contacts.username}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">⏱️</span>
              <span className="text-gray-400">Возраст:</span>
              <span className="text-yellow-400 font-medium">{getDaysAgo(mockRequest.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📞</span>
              <span className="text-gray-400">Телефон:</span>
              <span className="text-gray-100">{mockRequest.contacts.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📺</span>
              <span className="text-gray-400">Источник:</span>
              <span className="text-gray-100">{mockRequest.sourceName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📅</span>
              <span className="text-gray-400">Дата:</span>
              <span className="text-gray-100">{formatDate(mockRequest.date)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-600">
            <button onClick={() => setChat(!chat)} className="text-xs text-blue-400 hover:text-blue-300">
              💬 {chat ? "Скрыть" : "Показать"} оригинал сообщения
            </button>
            {chat && (
              <div className="mt-2 bg-gray-800 rounded p-2 text-gray-300 text-xs italic">
                "{mockRequest.originalText}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 9: Карточки (мета отдельно, контакты отдельно, чат отдельно)
function Details9() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(true);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
          <div className="flex gap-3">
            {/* Мета */}
            <div className="bg-gray-600 rounded-lg p-3 flex-1">
              <p className="text-xs text-gray-400 mb-2">Информация</p>
              <div className="space-y-1 text-xs">
                <p><span className="text-gray-400">Категория:</span> {mockRequest.categoryName}</p>
                <p><span className="text-gray-400">Подкат.:</span> {mockRequest.subcategory}</p>
                <p><span className="text-gray-400">Источник:</span> {mockRequest.sourceName}</p>
                <p className="text-yellow-400 font-medium">⏱ {getDaysAgo(mockRequest.date)}</p>
              </div>
            </div>
            {/* Контакты */}
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 flex-1">
              <p className="text-xs text-green-400 mb-2">Контакты</p>
              <p className="font-semibold text-lg">{mockRequest.contacts.name}</p>
              <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline block">
                @{mockRequest.contacts.username}
              </a>
              <p className="text-gray-300 text-sm mt-1">{mockRequest.contacts.phone}</p>
            </div>
            {/* Чат */}
            <div className="bg-gray-800 rounded-lg p-3 flex-1 cursor-pointer" onClick={() => setChat(!chat)}>
              <p className="text-xs text-gray-400 mb-2">💬 Переписка {chat ? "▲" : "▼"}</p>
              {chat && (
                <p className="text-gray-300 text-xs italic">"{mockRequest.originalText}"</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 10: Полный развёрнутый (всё видно сразу)
function Details10() {
  const [show, setShow] = useState(true);
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderDemo onClickDetails={() => setShow(!show)} />
      {show && (
        <div className="bg-gray-700 text-white border-t border-gray-600 text-sm">
          {/* Описание */}
          <div className="px-4 py-3 border-b border-gray-600">
            <p className="text-gray-100">{mockRequest.description}</p>
          </div>
          {/* Метаданные в строку */}
          <div className="px-4 py-2 bg-gray-750 flex items-center gap-6 text-xs border-b border-gray-600">
            <span className="text-gray-400">{mockRequest.categoryName} → {mockRequest.subcategory}</span>
            <span className="text-yellow-400 font-bold">{getDaysAgo(mockRequest.date)}</span>
            <span className="text-gray-400">{mockRequest.sourceName}</span>
            <span className="text-gray-500">{formatDate(mockRequest.date)}</span>
          </div>
          {/* Контакты */}
          <div className="px-4 py-2 bg-gray-600/50 flex items-center gap-6 border-b border-gray-600">
            <span className="font-semibold">{mockRequest.contacts.name}</span>
            <a href={`https://t.me/${mockRequest.contacts.username}`} className="text-blue-400 hover:underline font-medium">
              @{mockRequest.contacts.username}
            </a>
            <span className="text-gray-300">{mockRequest.contacts.phone}</span>
          </div>
          {/* Чат */}
          <div className="px-4 py-3 bg-gray-800">
            <p className="text-xs text-gray-500 mb-1">💬 Оригинальное сообщение:</p>
            <p className="text-gray-300 italic">"{mockRequest.originalText}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= ВАРИАНТЫ ДЛЯ СОСТАВНЫХ ЗАЯВОК (С ПОЗИЦИЯМИ) =============

// Общий заголовок для составной заявки
function RequestHeaderMulti({ onClickDetails }: { onClickDetails: () => void }) {
  const totalOffers = mockOffersMulti.length;
  return (
    <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
      <div
        className="flex items-center gap-4 cursor-pointer hover:opacity-80 flex-1"
        onClick={onClickDetails}
      >
        <span className="text-gray-400 text-sm">Заявка:</span>
        <span className="font-semibold">{mockRequestMulti.title}</span>
        <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded">
          {mockRequestMulti.positions.length} позиций
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-400">{mockRequestMulti.city}</span>
        <span className="text-gray-400">@{mockRequestMulti.contacts.username}</span>
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">{totalOffers} предл.</span>
      </div>
    </div>
  );
}

// Таблица предложений для позиции
function OffersTable({ positionId }: { positionId: string }) {
  const offers = mockOffersMulti.filter(o => o.positionId === positionId);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-500";
  };

  return (
    <div className="divide-y divide-gray-100">
      {offers.map((offer, idx) => (
        <div
          key={offer.id}
          className={`flex items-center px-4 py-2 text-sm ${idx === 0 ? 'bg-green-50' : 'bg-white'} hover:bg-gray-50`}
        >
          <span className={`w-12 font-bold ${getScoreColor(offer.score)}`}>{offer.score}%</span>
          <span className="flex-1">
            <span className="font-medium">{offer.company}</span>
            <span className="text-gray-500 ml-2">· {offer.title}</span>
          </span>
          <span className="w-28 text-gray-600">{offer.city}</span>
          <span className="w-28 text-right font-semibold">{offer.price?.toLocaleString()} ₽</span>
          <span className="w-28 text-right text-gray-500 text-xs">{offer.contact}</span>
          <div className="w-20 text-right">
            <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Выбрать</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Вариант 11: Табы по позициям
function Details11() {
  const [show, setShow] = useState(true);
  const [activeTab, setActiveTab] = useState(mockRequestMulti.positions[0].id);
  const [chat, setChat] = useState(false);

  const getOffersCount = (posId: string) => mockOffersMulti.filter(o => o.positionId === posId).length;

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderMulti onClickDetails={() => setShow(!show)} />
      {show && (
        <>
          {/* Details Panel */}
          <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">📁</span>
                <span className="text-gray-400">Категория:</span>
                <span className="text-gray-100">{mockRequestMulti.categoryName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">👤</span>
                <span className="text-gray-400">Контакт:</span>
                <span className="text-gray-100 font-medium">{mockRequestMulti.contacts.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">⏱️</span>
                <span className="text-gray-400">Возраст:</span>
                <span className="text-yellow-400 font-medium">{getDaysAgo(mockRequestMulti.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">💬</span>
                <span className="text-gray-400">Telegram:</span>
                <a href={`https://t.me/${mockRequestMulti.contacts.username}`} className="text-blue-400 hover:underline">
                  @{mockRequestMulti.contacts.username}
                </a>
              </div>
            </div>
            {/* Позиции в заявке */}
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-xs text-gray-400 mb-2">📦 Позиции в заявке:</p>
              <div className="flex flex-wrap gap-2">
                {mockRequestMulti.positions.map(pos => (
                  <span key={pos.id} className="bg-gray-600 px-2 py-1 rounded text-xs">
                    {pos.name} · {pos.quantity}
                  </span>
                ))}
              </div>
            </div>
            {/* Чат */}
            <div className="mt-3 pt-3 border-t border-gray-600">
              <button onClick={() => setChat(!chat)} className="text-xs text-blue-400 hover:text-blue-300">
                💬 {chat ? "Скрыть" : "Показать"} оригинал сообщения
              </button>
              {chat && (
                <div className="mt-2 bg-gray-800 rounded p-2 text-gray-300 text-xs italic">
                  "{mockRequestMulti.originalText}"
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-100 border-t flex">
            {mockRequestMulti.positions.map(pos => (
              <button
                key={pos.id}
                onClick={() => setActiveTab(pos.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === pos.id
                    ? 'bg-white border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {pos.name} <span className="text-xs text-gray-400">({getOffersCount(pos.id)})</span>
              </button>
            ))}
          </div>

          {/* Offers for selected tab */}
          <OffersTable positionId={activeTab} />
        </>
      )}
    </div>
  );
}

// Вариант 12: Аккордеон позиций
function Details12() {
  const [show, setShow] = useState(true);
  const [expandedPositions, setExpandedPositions] = useState<string[]>([mockRequestMulti.positions[0].id]);
  const [chat, setChat] = useState(false);

  const togglePosition = (posId: string) => {
    setExpandedPositions(prev =>
      prev.includes(posId)
        ? prev.filter(id => id !== posId)
        : [...prev, posId]
    );
  };

  const getOffersCount = (posId: string) => mockOffersMulti.filter(o => o.positionId === posId).length;
  const getBestScore = (posId: string) => {
    const offers = mockOffersMulti.filter(o => o.positionId === posId);
    return offers.length > 0 ? Math.max(...offers.map(o => o.score)) : 0;
  };

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderMulti onClickDetails={() => setShow(!show)} />
      {show && (
        <>
          {/* Details Panel */}
          <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="text-yellow-400 font-bold">{getDaysAgo(mockRequestMulti.date)}</span>
                <span className="text-gray-300">{mockRequestMulti.categoryName}</span>
                <a href={`https://t.me/${mockRequestMulti.contacts.username}`} className="text-blue-400 hover:underline">
                  @{mockRequestMulti.contacts.username}
                </a>
                <span className="text-gray-400">{mockRequestMulti.contacts.phone}</span>
              </div>
              <button onClick={() => setChat(!chat)} className="text-xs text-gray-400 hover:text-white">
                💬 {chat ? "▲" : "▼"}
              </button>
            </div>
            {chat && (
              <div className="mt-3 bg-gray-800 rounded p-2 text-gray-400 italic text-xs">
                "{mockRequestMulti.originalText}"
              </div>
            )}
          </div>

          {/* Accordion */}
          <div className="bg-white">
            {mockRequestMulti.positions.map(pos => (
              <div key={pos.id} className="border-t">
                {/* Position Header */}
                <div
                  onClick={() => togglePosition(pos.id)}
                  className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    expandedPositions.includes(pos.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="w-8 text-gray-400">
                    {expandedPositions.includes(pos.id) ? '▼' : '▶'}
                  </span>
                  <span className="flex-1 font-medium text-gray-800">{pos.name}</span>
                  <span className="text-gray-500 text-sm mr-4">{pos.quantity}</span>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded mr-2">
                    TOP {getBestScore(pos.id)}%
                  </span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                    {getOffersCount(pos.id)} предл.
                  </span>
                </div>
                {/* Position Offers */}
                {expandedPositions.includes(pos.id) && (
                  <div className="border-t bg-gray-50">
                    <OffersTable positionId={pos.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Вариант 13: Группированная таблица
function Details13() {
  const [show, setShow] = useState(true);
  const [chat, setChat] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-500";
  };

  const getPositionBg = (posId: string) => {
    const colors: Record<string, string> = {
      p1: 'bg-blue-50 border-l-4 border-blue-400',
      p2: 'bg-green-50 border-l-4 border-green-400',
      p3: 'bg-purple-50 border-l-4 border-purple-400',
    };
    return colors[posId] || 'bg-gray-50';
  };

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm">
      <RequestHeaderMulti onClickDetails={() => setShow(!show)} />
      {show && (
        <>
          {/* Details Panel */}
          <div className="bg-gray-700 text-white px-4 py-3 border-t border-gray-600 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-yellow-400 font-bold">{getDaysAgo(mockRequestMulti.date)}</span>
                <span className="text-gray-300">{mockRequestMulti.categoryName}</span>
                <span className="text-gray-400">·</span>
                <span className="font-medium">{mockRequestMulti.contacts.name}</span>
                <a href={`https://t.me/${mockRequestMulti.contacts.username}`} className="text-blue-400 hover:underline">
                  @{mockRequestMulti.contacts.username}
                </a>
              </div>
              <button onClick={() => setChat(!chat)} className="text-xs text-gray-400 hover:text-white">
                💬 Переписка
              </button>
            </div>
            {chat && (
              <div className="mt-3 bg-gray-800 rounded p-2 text-gray-400 italic text-xs">
                "{mockRequestMulti.originalText}"
              </div>
            )}
          </div>

          {/* Grouped Table */}
          <div className="bg-white">
            {mockRequestMulti.positions.map(pos => {
              const offers = mockOffersMulti.filter(o => o.positionId === pos.id);
              return (
                <div key={pos.id}>
                  {/* Position Header */}
                  <div className={`px-4 py-2 ${getPositionBg(pos.id)} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">{pos.name}</span>
                      <span className="text-gray-500 text-sm">{pos.quantity}</span>
                    </div>
                    <span className="text-xs text-gray-500">{offers.length} предложений</span>
                  </div>
                  {/* Offers */}
                  {offers.map((offer, idx) => (
                    <div
                      key={offer.id}
                      className={`flex items-center px-4 py-2 text-sm border-t border-gray-100 ${
                        idx === 0 ? 'bg-green-50/50' : 'bg-white'
                      } hover:bg-gray-50`}
                    >
                      <span className="w-8 text-gray-400 text-xs">#{idx + 1}</span>
                      <span className={`w-14 font-bold ${getScoreColor(offer.score)}`}>{offer.score}%</span>
                      <span className="flex-1">
                        <span className="font-medium">{offer.company}</span>
                        <span className="text-gray-500 ml-2 text-xs">· {offer.title}</span>
                      </span>
                      <span className="w-24 text-gray-600 text-sm">{offer.city}</span>
                      <span className="w-24 text-right font-semibold">{offer.price?.toLocaleString()} ₽</span>
                      <div className="w-20 text-right">
                        <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">→</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============= 5 ВАРИАНТОВ ДЕТАЛЕЙ ПРЕДЛОЖЕНИЯ =============

// Используем первое расширенное предложение для демо
const demoOffer = mockOffersExtended[0];

// Вариант 14: Компактный горизонтальный
function OfferDetails14() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm">
        Детали предложения (вариант 14: Компактный)
      </div>
      {/* Строка предложения */}
      <div
        className="flex items-center px-4 py-3 bg-green-50 border-l-4 border-green-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold mr-3">TOP</span>
        <span className="text-green-600 font-bold w-14">{demoOffer.score}%</span>
        <span className="font-semibold text-gray-900 flex-1">{demoOffer.title}</span>
        <span className="text-gray-600 w-28">{demoOffer.city}</span>
        <span className="font-bold text-gray-900 w-32 text-right">{demoOffer.price?.toLocaleString()} ₽</span>
        <span className="text-gray-400 ml-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {/* Детали - компактная строка */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center gap-4 text-sm">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
            ⏱ {getDaysAgo(demoOffer.date)}
          </span>
          <span className="text-gray-700 flex-1">💡 {demoOffer.reason}</span>
          <div className="flex gap-1">
            {demoOffer.risks.map((risk, i) => (
              <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
            ))}
          </div>
          <div className="flex gap-2 ml-4">
            <button className="px-3 py-1.5 bg-yellow-500 text-white rounded text-xs">📞 В работу</button>
            <button className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 15: Карточки (3 колонки)
function OfferDetails15() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm">
        Детали предложения (вариант 15: Карточки)
      </div>
      {/* Строка предложения */}
      <div
        className="flex items-center px-4 py-3 bg-green-50 border-l-4 border-green-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold mr-3">TOP</span>
        <span className="text-green-600 font-bold w-14">{demoOffer.score}%</span>
        <span className="font-semibold text-gray-900 flex-1">{demoOffer.title}</span>
        <span className="text-gray-600 w-28">{demoOffer.city}</span>
        <span className="font-bold text-gray-900 w-32 text-right">{demoOffer.price?.toLocaleString()} ₽</span>
        <span className="text-gray-400 ml-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {/* Детали - 3 карточки */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="grid grid-cols-3 gap-3">
            {/* Карточка 1: Инфо */}
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-xs text-gray-500 mb-2 font-medium">📊 Информация</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Возраст:</span>
                  <span className="font-medium text-yellow-600">{getDaysAgo(demoOffer.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Категория:</span>
                  <span className="text-gray-800">{demoOffer.categoryName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Источник:</span>
                  <span className="text-gray-800">{demoOffer.sourceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Наличие:</span>
                  <span className="text-gray-800">{demoOffer.quantity}</span>
                </div>
              </div>
            </div>
            {/* Карточка 2: Контакты */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-600 mb-2 font-medium">👤 Контакты</p>
              <p className="font-semibold text-gray-900">{demoOffer.contacts.name}</p>
              <a href={`https://t.me/${demoOffer.contacts.username}`} className="text-blue-600 hover:underline text-sm">
                @{demoOffer.contacts.username}
              </a>
              <p className="text-gray-600 text-sm mt-1">{demoOffer.contacts.phone}</p>
            </div>
            {/* Карточка 3: AI */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600 mb-2 font-medium">🤖 AI анализ</p>
              <p className="text-sm text-gray-700 mb-2">💡 {demoOffer.reason}</p>
              <div className="flex flex-wrap gap-1">
                {demoOffer.risks.map((risk, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
                ))}
              </div>
              {demoOffer.margin && (
                <p className="text-green-600 text-sm mt-2">💰 Маржа: {demoOffer.margin.percent}%</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button className="px-4 py-2 bg-yellow-500 text-white rounded text-sm font-medium">📞 В работу</button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm">✕ Отклонить</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 16: Telegram-стиль
function OfferDetails16() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm">
        Детали предложения (вариант 16: Telegram)
      </div>
      {/* Строка предложения */}
      <div
        className="flex items-center px-4 py-3 bg-green-50 border-l-4 border-green-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold mr-3">TOP</span>
        <span className="text-green-600 font-bold w-14">{demoOffer.score}%</span>
        <span className="font-semibold text-gray-900 flex-1">{demoOffer.title}</span>
        <span className="text-gray-600 w-28">{demoOffer.city}</span>
        <span className="font-bold text-gray-900 w-32 text-right">{demoOffer.price?.toLocaleString()} ₽</span>
        <span className="text-gray-400 ml-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {/* Детали - Telegram стиль */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-100 border-t">
          <div className="flex gap-3">
            {/* Аватар */}
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {demoOffer.contacts.name.charAt(0)}
            </div>
            <div className="flex-1">
              {/* Имя и возраст */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">{demoOffer.contacts.name}</span>
                <span className="text-blue-600 text-sm">@{demoOffer.contacts.username}</span>
                <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded ml-auto">{getDaysAgo(demoOffer.date)}</span>
              </div>
              {/* Пузырь сообщения */}
              <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm border">
                <p className="text-gray-800 text-sm">{demoOffer.originalText}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{demoOffer.categoryName} • {demoOffer.subcategory}</span>
                  <span>{formatDate(demoOffer.date)}</span>
                </div>
              </div>
              {/* AI анализ */}
              <div className="mt-2 text-sm">
                <p className="text-gray-700">💡 {demoOffer.reason}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {demoOffer.risks.map((risk, i) => (
                    <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
                  ))}
                </div>
              </div>
              {/* Контакты и кнопки */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📞 {demoOffer.contacts.phone}</span>
                  <span>📺 {demoOffer.sourceName}</span>
                  {demoOffer.margin && <span className="text-green-600">💰 {demoOffer.margin.percent}%</span>}
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs">Написать</button>
                  <button className="px-3 py-1.5 bg-yellow-500 text-white rounded text-xs">В работу</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 17: Таблица полей (иконки)
function OfferDetails17() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm">
        Детали предложения (вариант 17: Таблица с иконками)
      </div>
      {/* Строка предложения */}
      <div
        className="flex items-center px-4 py-3 bg-green-50 border-l-4 border-green-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold mr-3">TOP</span>
        <span className="text-green-600 font-bold w-14">{demoOffer.score}%</span>
        <span className="font-semibold text-gray-900 flex-1">{demoOffer.title}</span>
        <span className="text-gray-600 w-28">{demoOffer.city}</span>
        <span className="font-bold text-gray-900 w-32 text-right">{demoOffer.price?.toLocaleString()} ₽</span>
        <span className="text-gray-400 ml-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {/* Детали - сетка с иконками */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-t text-sm">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">⏱️</span>
              <span className="text-gray-500">Возраст:</span>
              <span className="font-medium text-yellow-600">{getDaysAgo(demoOffer.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📁</span>
              <span className="text-gray-500">Категория:</span>
              <span className="text-gray-800">{demoOffer.categoryName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">👤</span>
              <span className="text-gray-500">Контакт:</span>
              <span className="text-gray-800 font-medium">{demoOffer.contacts.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">💬</span>
              <span className="text-gray-500">Telegram:</span>
              <a href={`https://t.me/${demoOffer.contacts.username}`} className="text-blue-600 hover:underline">@{demoOffer.contacts.username}</a>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📦</span>
              <span className="text-gray-500">Наличие:</span>
              <span className="text-gray-800">{demoOffer.quantity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📂</span>
              <span className="text-gray-500">Подкат.:</span>
              <span className="text-gray-800">{demoOffer.subcategory}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📞</span>
              <span className="text-gray-500">Телефон:</span>
              <span className="text-gray-800">{demoOffer.contacts.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">📺</span>
              <span className="text-gray-500">Источник:</span>
              <span className="text-gray-800">{demoOffer.sourceName}</span>
            </div>
          </div>
          {/* AI блок */}
          <div className="border-t pt-3 mt-3">
            <p className="text-gray-700 mb-2">💡 {demoOffer.reason}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {demoOffer.risks.map((risk, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
                ))}
                {demoOffer.margin && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-2">💰 Маржа: {demoOffer.margin.percent}%</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-yellow-500 text-white rounded text-xs font-medium">📞 В работу</button>
                <button className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs">✕ Отклонить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вариант 18: Акцент на возрасте
function OfferDetails18() {
  const [expanded, setExpanded] = useState(true);

  // Расчёт дней числом
  const daysNum = Math.floor((new Date().getTime() - new Date(demoOffer.date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm">
        Детали предложения (вариант 18: Акцент на возрасте)
      </div>
      {/* Строка предложения */}
      <div
        className="flex items-center px-4 py-3 bg-green-50 border-l-4 border-green-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold mr-3">TOP</span>
        <span className="text-green-600 font-bold w-14">{demoOffer.score}%</span>
        <span className="font-semibold text-gray-900 flex-1">{demoOffer.title}</span>
        <span className="text-gray-600 w-28">{demoOffer.city}</span>
        <span className="font-bold text-gray-900 w-32 text-right">{demoOffer.price?.toLocaleString()} ₽</span>
        <span className="text-gray-400 ml-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {/* Детали - возраст крупно */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex gap-4">
            {/* Возраст - крупный бейдж */}
            <div className={`flex-shrink-0 w-20 h-20 rounded-lg flex flex-col items-center justify-center ${
              daysNum > 30 ? 'bg-red-100 text-red-700' : daysNum > 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
            }`}>
              <span className="text-3xl font-bold">{daysNum}</span>
              <span className="text-xs">дней</span>
            </div>
            {/* Контент */}
            <div className="flex-1">
              {/* Описание */}
              <p className="text-gray-700 text-sm mb-2">{demoOffer.description}</p>
              {/* AI */}
              <p className="text-gray-600 text-sm mb-2">💡 {demoOffer.reason}</p>
              {/* Теги */}
              <div className="flex flex-wrap gap-1 mb-2">
                {demoOffer.risks.map((risk, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠ {risk}</span>
                ))}
                {demoOffer.margin && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">💰 {demoOffer.margin.percent}% (~{demoOffer.margin.absolute?.toLocaleString()} ₽)</span>
                )}
              </div>
              {/* Контакты */}
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-900">{demoOffer.contacts.name}</span>
                <a href={`https://t.me/${demoOffer.contacts.username}`} className="text-blue-600 hover:underline">@{demoOffer.contacts.username}</a>
                <span className="text-gray-600">{demoOffer.contacts.phone}</span>
                <span className="text-gray-500 text-xs">{demoOffer.sourceName}</span>
              </div>
            </div>
            {/* Кнопки */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium">Выбрать</button>
              <button className="px-4 py-2 bg-yellow-500 text-white rounded text-sm">В работу</button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm">Отклонить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [activeVariant, setActiveVariant] = useState(1);

  const variants = [
    { id: 1, name: "Минималист" },
    { id: 2, name: "Две строки" },
    { id: 3, name: "Боковая панель" },
    { id: 4, name: "Telegram" },
    { id: 5, name: "Теги" },
    { id: 6, name: "Таблица" },
    { id: 7, name: "Время" },
    { id: 8, name: "Иконки" },
    { id: 9, name: "Карточки" },
    { id: 10, name: "Полный" },
    // Составные заявки (с позициями)
    { id: 11, name: "Позиции: Табы", isMulti: true },
    { id: 12, name: "Позиции: Аккордеон", isMulti: true },
    { id: 13, name: "Позиции: Группы", isMulti: true },
    // Детали предложения
    { id: 14, name: "Компактный", isOffer: true },
    { id: 15, name: "Карточки", isOffer: true },
    { id: 16, name: "Telegram", isOffer: true },
    { id: 17, name: "Иконки", isOffer: true },
    { id: 18, name: "Возраст", isOffer: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">CRM Демо: Варианты дизайна</h1>
        <p className="text-gray-600 mb-6">18 вариантов: заявки + позиции + детали предложения</p>

        {/* Переключатель - Простые заявки */}
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">📋 Панель заявки (1 товар):</p>
          <div className="flex flex-wrap gap-2">
            {variants.filter(v => !v.isMulti && !v.isOffer).map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeVariant === v.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {v.id}. {v.name}
              </button>
            ))}
          </div>
        </div>

        {/* Переключатель - Составные заявки */}
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">📦 Составная заявка (несколько позиций):</p>
          <div className="flex flex-wrap gap-2">
            {variants.filter(v => v.isMulti).map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeVariant === v.id
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-purple-200"
                }`}
              >
                {v.id}. {v.name}
              </button>
            ))}
          </div>
        </div>

        {/* Переключатель - Детали предложения */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1">🏷️ Детали предложения (раскрытое):</p>
          <div className="flex flex-wrap gap-2">
            {variants.filter(v => v.isOffer).map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeVariant === v.id
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-green-200"
                }`}
              >
                {v.id}. {v.name}
              </button>
            ))}
          </div>
        </div>

        {/* Демо панель */}
        {activeVariant === 1 && <Details1 />}
        {activeVariant === 2 && <Details2 />}
        {activeVariant === 3 && <Details3 />}
        {activeVariant === 4 && <Details4 />}
        {activeVariant === 5 && <Details5 />}
        {activeVariant === 6 && <Details6 />}
        {activeVariant === 7 && <Details7 />}
        {activeVariant === 8 && <Details8 />}
        {activeVariant === 9 && <Details9 />}
        {activeVariant === 10 && <Details10 />}
        {activeVariant === 11 && <Details11 />}
        {activeVariant === 12 && <Details12 />}
        {activeVariant === 13 && <Details13 />}
        {activeVariant === 14 && <OfferDetails14 />}
        {activeVariant === 15 && <OfferDetails15 />}
        {activeVariant === 16 && <OfferDetails16 />}
        {activeVariant === 17 && <OfferDetails17 />}
        {activeVariant === 18 && <OfferDetails18 />}

        <p className="text-center text-gray-500 text-sm mt-4">
          {activeVariant <= 10 ? "Варианты панели заявки" : activeVariant <= 13 ? "Варианты для составных заявок" : "Варианты деталей предложения"}
        </p>
      </div>
    </div>
  );
}
