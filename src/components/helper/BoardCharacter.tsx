'use client'

import { useEffect, useRef, useState } from 'react'

export type CharacterState =
  | 'idle' | 'appear' | 'disappear'
  | 'typing' | 'wave' | 'think'
  | 'happy' | 'sad' | 'dance'
  | 'sleep' | 'surprise' | 'angry'

interface BoardCharacterProps {
  state: CharacterState
  size?: number
  onAnimationEnd?: () => void
}

export default function BoardCharacter({ state, size = 160, onAnimationEnd }: BoardCharacterProps) {
  const characterRef = useRef<SVGSVGElement>(null)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [blinkTrigger, setBlinkTrigger] = useState(0)

  // Глаза следят за курсором (только в idle/wave/happy)
  useEffect(() => {
    if (!['idle', 'wave', 'happy', 'surprise'].includes(state)) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = characterRef.current?.getBoundingClientRect()
      if (!rect) return

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 3

      const dx = (e.clientX - centerX) / 80
      const dy = (e.clientY - centerY) / 80

      setEyeOffset({
        x: Math.max(-3, Math.min(3, dx)),
        y: Math.max(-2, Math.min(2, dy))
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [state])

  // Автоматическое моргание в idle
  useEffect(() => {
    if (state !== 'idle') return

    const interval = setInterval(() => {
      setBlinkTrigger(prev => prev + 1)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(interval)
  }, [state])

  // Вызов onAnimationEnd для некоторых состояний
  useEffect(() => {
    if (['appear', 'disappear', 'wave', 'happy', 'sad', 'surprise'].includes(state)) {
      const timer = setTimeout(() => {
        onAnimationEnd?.()
      }, state === 'appear' ? 800 : state === 'wave' ? 1500 : 1000)
      return () => clearTimeout(timer)
    }
  }, [state, onAnimationEnd])

  // Получение классов анимации для разных частей
  const getBodyAnimation = () => {
    switch (state) {
      case 'idle': return 'animate-breathe'
      case 'appear': return 'animate-bounce-in'
      case 'disappear': return 'animate-bounce-out'
      case 'happy': return 'animate-jump'
      case 'dance': return 'animate-dance'
      case 'think': return 'animate-think-body'
      default: return ''
    }
  }

  const getArmAnimation = () => {
    switch (state) {
      case 'wave': return 'animate-wave'
      case 'think': return 'animate-think-arm'
      case 'happy': return 'animate-celebrate'
      default: return ''
    }
  }

  // Форма рта в зависимости от состояния
  const getMouthPath = () => {
    switch (state) {
      case 'happy': return 'M42 75 Q60 95 78 75' // Широкая улыбка
      case 'sad': return 'M45 85 Q60 75 75 85' // Грустный
      case 'surprise': return 'M52 80 Q60 90 68 80 Q60 88 52 80' // Открытый рот (овал)
      case 'sleep': return 'M48 80 L72 80' // Прямая линия
      case 'angry': return 'M45 82 Q60 78 75 82' // Злой
      case 'typing': return 'M52 80 Q60 85 68 80' // Немного открыт
      default: return 'M45 78 Q60 88 75 78' // Обычная улыбка
    }
  }

  // Состояние глаз
  const getEyeState = () => {
    switch (state) {
      case 'sleep': return 'closed'
      case 'surprise': return 'wide'
      case 'sad': return 'sad'
      case 'angry': return 'angry'
      case 'think': return 'up'
      default: return 'normal'
    }
  }

  const eyeState = getEyeState()

  // Вычисляем правильные пропорции (viewBox 120x160 = 3:4)
  const aspectRatio = 120 / 160
  const width = size * aspectRatio
  const height = size

  return (
    <svg
      ref={characterRef}
      viewBox="0 0 120 160"
      width={width}
      height={height}
      className={`transition-transform ${getBodyAnimation()}`}
    >
      <defs>
        {/* Градиент для тела */}
        <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        {/* Градиент для внутренней части */}
        <linearGradient id="innerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Ножки */}
      <g className={state === 'happy' ? 'animate-legs-jump' : state === 'dance' ? 'animate-legs-dance' : ''}>
        <path
          d="M42 125 L38 150"
          stroke="url(#boardGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M78 125 L82 150"
          stroke="url(#boardGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Ступни */}
        <ellipse cx="36" cy="152" rx="8" ry="4" fill="url(#boardGradient)" />
        <ellipse cx="84" cy="152" rx="8" ry="4" fill="url(#boardGradient)" />
      </g>

      {/* Тело (доска) */}
      <rect
        x="20"
        y="15"
        width="80"
        height="115"
        rx="12"
        fill="url(#boardGradient)"
        className="drop-shadow-lg"
      />
      {/* Внутренняя часть доски */}
      <rect
        x="28"
        y="23"
        width="64"
        height="99"
        rx="6"
        fill="url(#innerGradient)"
      />

      {/* Левая рука */}
      <g className={`origin-[20px_65px] ${state === 'think' ? 'animate-think-arm' : ''}`}>
        <path
          d="M20 65 L2 55"
          stroke="url(#boardGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="0" cy="53" r="7" fill="url(#boardGradient)" />
      </g>

      {/* Правая рука (машет) */}
      <g className={`origin-[100px_65px] ${getArmAnimation()}`}>
        <path
          d="M100 65 L118 55"
          stroke="url(#boardGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="120" cy="53" r="7" fill="url(#boardGradient)" />
      </g>

      {/* Глаза */}
      <g>
        {/* Белки глаз */}
        <ellipse
          cx="45"
          cy="55"
          rx={eyeState === 'wide' ? 12 : 10}
          ry={eyeState === 'wide' ? 14 : eyeState === 'closed' ? 2 : eyeState === 'sad' ? 8 : 11}
          fill="white"
          className={state === 'idle' ? 'animate-blink' : ''}
          key={blinkTrigger}
        />
        <ellipse
          cx="75"
          cy="55"
          rx={eyeState === 'wide' ? 12 : 10}
          ry={eyeState === 'wide' ? 14 : eyeState === 'closed' ? 2 : eyeState === 'sad' ? 8 : 11}
          fill="white"
          className={state === 'idle' ? 'animate-blink' : ''}
          key={blinkTrigger + 1}
        />

        {/* Зрачки */}
        {eyeState !== 'closed' && (
          <>
            <circle
              cx={45 + eyeOffset.x + (eyeState === 'up' ? 0 : 0)}
              cy={55 + eyeOffset.y + (eyeState === 'up' ? -4 : eyeState === 'sad' ? 2 : 0)}
              r={eyeState === 'wide' ? 5 : 4}
              fill="#1e293b"
              className={state === 'typing' ? 'animate-eyes-typing' : ''}
            />
            <circle
              cx={75 + eyeOffset.x + (eyeState === 'up' ? 0 : 0)}
              cy={55 + eyeOffset.y + (eyeState === 'up' ? -4 : eyeState === 'sad' ? 2 : 0)}
              r={eyeState === 'wide' ? 5 : 4}
              fill="#1e293b"
              className={state === 'typing' ? 'animate-eyes-typing' : ''}
            />
            {/* Блики */}
            <circle cx={47 + eyeOffset.x} cy={53 + eyeOffset.y} r="1.5" fill="white" />
            <circle cx={77 + eyeOffset.x} cy={53 + eyeOffset.y} r="1.5" fill="white" />
          </>
        )}

        {/* Брови (для злости) */}
        {eyeState === 'angry' && (
          <>
            <path d="M35 45 L52 50" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <path d="M85 45 L68 50" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {/* Грустные брови */}
        {eyeState === 'sad' && (
          <>
            <path d="M38 48 L52 45" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            <path d="M82 48 L68 45" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Рот */}
      <path
        d={getMouthPath()}
        stroke="#1e293b"
        strokeWidth="3"
        strokeLinecap="round"
        fill={state === 'surprise' ? '#1e293b' : 'none'}
      />

      {/* Румянец (при happy) */}
      {state === 'happy' && (
        <>
          <ellipse cx="32" cy="70" rx="6" ry="4" fill="#f472b6" fillOpacity="0.5" />
          <ellipse cx="88" cy="70" rx="6" ry="4" fill="#f472b6" fillOpacity="0.5" />
        </>
      )}

      {/* ZZZ для сна */}
      {state === 'sleep' && (
        <g className="animate-zzz">
          <text x="85" y="35" fontSize="14" fill="white" fontWeight="bold">z</text>
          <text x="95" y="25" fontSize="12" fill="white" fontWeight="bold" className="animate-zzz-delay-1">z</text>
          <text x="102" y="18" fontSize="10" fill="white" fontWeight="bold" className="animate-zzz-delay-2">z</text>
        </g>
      )}

      {/* Точки думания */}
      {state === 'think' && (
        <g>
          <circle cx="90" cy="40" r="3" fill="white" className="animate-think-dot" />
          <circle cx="100" cy="35" r="3" fill="white" className="animate-think-dot-delay-1" />
          <circle cx="108" cy="28" r="3" fill="white" className="animate-think-dot-delay-2" />
        </g>
      )}

      {/* Сердечки (happy) */}
      {state === 'happy' && (
        <g className="animate-hearts">
          <text x="5" y="30" fontSize="16">❤️</text>
          <text x="100" y="25" fontSize="14" className="animate-heart-delay">💜</text>
        </g>
      )}
    </svg>
  )
}
