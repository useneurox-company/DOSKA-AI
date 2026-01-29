'use client'

interface HelperIconProps {
  variant: number // 1-10
  className?: string
}

export default function HelperIcon({ variant, className = "" }: HelperIconProps) {
  const baseClass = `w-full h-full ${className}`

  switch (variant) {
    // 1. Классическая доска с ножками + пульсирующая точка
    case 1:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          {/* Ножки */}
          <path d="M14 40 L18 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M34 40 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          {/* Доска */}
          <rect x="8" y="8" width="32" height="22" rx="3" fill="white" fillOpacity="0.9" />
          {/* Рамка */}
          <rect x="10" y="10" width="28" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-blue-500" />
          {/* Пульсирующая точка */}
          <circle cx="24" cy="19" r="3" className="fill-purple-500 animate-pulse" />
        </svg>
      )

    // 2. Доска с мелом (анимация "пишет")
    case 2:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          <path d="M14 40 L18 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M34 40 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="8" y="8" width="32" height="22" rx="3" fill="#1e3a5f" />
          <rect x="10" y="10" width="28" height="18" rx="2" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
          {/* Линия мела с анимацией */}
          <path
            d="M15 15 L25 15 M15 19 L30 19 M15 23 L20 23"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="20"
            className="animate-[dash_2s_ease-in-out_infinite]"
          />
          {/* Мел */}
          <rect x="28" y="21" width="6" height="3" rx="1" fill="white" className="animate-pulse" />
        </svg>
      )

    // 3. Мольберт (покачивается)
    case 3:
      return (
        <svg viewBox="0 0 48 48" className={`${baseClass} animate-[wiggle_3s_ease-in-out_infinite]`} fill="none">
          {/* Треугольные ножки */}
          <path d="M10 42 L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M38 42 L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 28 L24 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          {/* Холст */}
          <rect x="10" y="6" width="28" height="24" rx="2" fill="white" fillOpacity="0.95" />
          {/* Рамка */}
          <rect x="10" y="6" width="28" height="24" rx="2" stroke="#a855f7" strokeWidth="2" fill="none" />
          {/* Иконка кисти */}
          <circle cx="24" cy="18" r="6" fill="#3b82f6" fillOpacity="0.2" />
          <path d="M21 18 L27 18 M24 15 L24 21" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )

    // 4. Флипчарт с перелистыванием
    case 4:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          {/* Стойка */}
          <path d="M12 42 L24 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M36 42 L24 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          {/* Верхняя перекладина */}
          <rect x="8" y="6" width="32" height="4" rx="2" fill="white" />
          {/* Листы */}
          <rect x="10" y="10" width="28" height="22" rx="1" fill="white" fillOpacity="0.8" />
          <rect x="12" y="8" width="24" height="2" rx="1" fill="white" fillOpacity="0.5" className="animate-pulse" />
          {/* Текст на листе */}
          <path d="M15 16 L33 16 M15 20 L28 20 M15 24 L25 24" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
          {/* Перелистывание */}
          <path d="M30 10 Q34 14 33 22" stroke="#3b82f6" strokeWidth="1" fill="none" className="animate-pulse" />
        </svg>
      )

    // 5. Школьная доска (зелёная) с мигающим "?"
    case 5:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          <path d="M14 40 L18 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M34 40 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          {/* Зелёная доска */}
          <rect x="6" y="6" width="36" height="24" rx="2" fill="#166534" />
          {/* Рамка */}
          <rect x="6" y="6" width="36" height="24" rx="2" stroke="#854d0e" strokeWidth="3" fill="none" />
          {/* Вопрос */}
          <text
            x="24"
            y="23"
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill="white"
            className="animate-pulse"
          >
            ?
          </text>
          {/* Полочка */}
          <rect x="8" y="28" width="32" height="2" rx="1" fill="#854d0e" />
        </svg>
      )

    // 6. Kanban доска (карточки двигаются)
    case 6:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          <rect x="6" y="6" width="36" height="36" rx="4" fill="white" fillOpacity="0.1" />
          {/* Колонки */}
          <rect x="8" y="10" width="10" height="28" rx="2" fill="white" fillOpacity="0.15" />
          <rect x="19" y="10" width="10" height="28" rx="2" fill="white" fillOpacity="0.15" />
          <rect x="30" y="10" width="10" height="28" rx="2" fill="white" fillOpacity="0.15" />
          {/* Карточки */}
          <rect x="9" y="12" width="8" height="6" rx="1" fill="#3b82f6" className="animate-pulse" />
          <rect x="9" y="20" width="8" height="6" rx="1" fill="#60a5fa" />
          <rect x="20" y="12" width="8" height="6" rx="1" fill="#a855f7" />
          <rect x="20" y="20" width="8" height="6" rx="1" fill="#c084fc" className="animate-pulse" />
          <rect x="31" y="12" width="8" height="6" rx="1" fill="#22c55e" />
        </svg>
      )

    // 7. Пробковая доска с пинами
    case 7:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          {/* Доска */}
          <rect x="6" y="6" width="36" height="36" rx="3" fill="#92400e" />
          <rect x="6" y="6" width="36" height="36" rx="3" stroke="#78350f" strokeWidth="3" fill="none" />
          {/* Пины с анимацией */}
          <circle cx="14" cy="14" r="3" fill="#ef4444" className="animate-pulse" />
          <circle cx="34" cy="14" r="3" fill="#3b82f6" />
          <circle cx="14" cy="34" r="3" fill="#22c55e" />
          <circle cx="34" cy="34" r="3" fill="#eab308" className="animate-pulse" />
          <circle cx="24" cy="24" r="3" fill="#a855f7" className="animate-pulse" />
          {/* Листочки */}
          <rect x="10" y="18" width="8" height="10" rx="1" fill="white" fillOpacity="0.9" transform="rotate(-5 14 23)" />
          <rect x="30" y="18" width="8" height="10" rx="1" fill="#fef08a" fillOpacity="0.9" transform="rotate(5 34 23)" />
        </svg>
      )

    // 8. Информационный стенд с "i"
    case 8:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          {/* Ножка */}
          <rect x="22" y="32" width="4" height="12" rx="1" fill="white" />
          {/* Основание */}
          <ellipse cx="24" cy="44" rx="10" ry="2" fill="white" fillOpacity="0.5" />
          {/* Круглый знак */}
          <circle cx="24" cy="18" r="14" fill="url(#infoGradient)" />
          <circle cx="24" cy="18" r="14" stroke="white" strokeWidth="2" fill="none" />
          {/* Буква i */}
          <circle cx="24" cy="12" r="2" fill="white" className="animate-pulse" />
          <rect x="22" y="16" width="4" height="10" rx="1" fill="white" />
          <defs>
            <linearGradient id="infoGradient" x1="10" y1="4" x2="38" y2="32">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      )

    // 9. Доска объявлений (вертикальная)
    case 9:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          {/* Доска */}
          <rect x="10" y="4" width="28" height="40" rx="3" fill="#1e293b" />
          <rect x="10" y="4" width="28" height="40" rx="3" stroke="white" strokeWidth="2" fill="none" />
          {/* Листочки объявлений */}
          <rect x="14" y="8" width="9" height="11" rx="1" fill="white" transform="rotate(-3 18.5 13.5)" />
          <rect x="25" y="8" width="9" height="11" rx="1" fill="#fef08a" transform="rotate(2 29.5 13.5)" className="animate-pulse" />
          <rect x="14" y="22" width="9" height="11" rx="1" fill="#bbf7d0" transform="rotate(2 18.5 27.5)" />
          <rect x="25" y="22" width="9" height="11" rx="1" fill="#fecaca" transform="rotate(-2 29.5 27.5)" className="animate-pulse" />
          {/* Заголовок */}
          <text x="24" y="40" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">DOSKA</text>
        </svg>
      )

    // 10. AI-доска с нейросетью
    case 10:
    default:
      return (
        <svg viewBox="0 0 48 48" className={baseClass} fill="none">
          {/* Фон доски */}
          <rect x="6" y="6" width="36" height="36" rx="4" fill="#0f172a" />
          <rect x="6" y="6" width="36" height="36" rx="4" stroke="url(#aiGradient)" strokeWidth="2" fill="none" />
          {/* Нейросеть */}
          <circle cx="16" cy="16" r="3" fill="#3b82f6" className="animate-pulse" />
          <circle cx="32" cy="16" r="3" fill="#3b82f6" />
          <circle cx="24" cy="24" r="4" fill="#a855f7" className="animate-pulse" />
          <circle cx="16" cy="32" r="3" fill="#3b82f6" />
          <circle cx="32" cy="32" r="3" fill="#3b82f6" className="animate-pulse" />
          {/* Связи */}
          <path d="M16 16 L24 24 M32 16 L24 24 M16 32 L24 24 M32 32 L24 24"
                stroke="url(#aiGradient)" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M16 16 L32 16 M16 32 L32 32 M16 16 L16 32 M32 16 L32 32"
                stroke="url(#aiGradient)" strokeWidth="1" strokeOpacity="0.4" />
          <defs>
            <linearGradient id="aiGradient" x1="6" y1="6" x2="42" y2="42">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      )
  }
}

// CSS для кастомных анимаций (добавить в globals.css)
// @keyframes wiggle {
//   0%, 100% { transform: rotate(-2deg); }
//   50% { transform: rotate(2deg); }
// }
// @keyframes dash {
//   0% { stroke-dashoffset: 20; }
//   100% { stroke-dashoffset: 0; }
// }
