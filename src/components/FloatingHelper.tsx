'use client'

import { useState, useEffect, useCallback } from 'react'
import ChatWindow from './helper/ChatWindow'
import BoardCharacter, { CharacterState } from './helper/BoardCharacter'

export default function FloatingHelper() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [characterState, setCharacterState] = useState<CharacterState>('idle')
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null)

  // Сброс таймера бездействия
  const resetIdleTimer = useCallback(() => {
    if (idleTimer) {
      clearTimeout(idleTimer)
    }

    // Через 30 сек бездействия - засыпает
    const timer = setTimeout(() => {
      if (characterState === 'idle') {
        setCharacterState('sleep')
      }
    }, 30000)

    setIdleTimer(timer)
  }, [idleTimer, characterState])

  // При открытии/закрытии чата
  useEffect(() => {
    if (isOpen) {
      // Открытие: appear -> wave -> idle
      setIsVisible(true)
      setCharacterState('appear')

      setTimeout(() => {
        setCharacterState('wave')
        setTimeout(() => {
          setCharacterState('idle')
          resetIdleTimer()
        }, 1500)
      }, 800)
    } else {
      // Закрытие: wave -> disappear
      if (characterState !== 'idle') {
        setCharacterState('idle')
      }
    }

    return () => {
      if (idleTimer) {
        clearTimeout(idleTimer)
      }
    }
  }, [isOpen])

  // Пробуждение при движении мыши (если спит)
  useEffect(() => {
    const handleActivity = () => {
      if (characterState === 'sleep') {
        setCharacterState('surprise')
        setTimeout(() => {
          setCharacterState('idle')
          resetIdleTimer()
        }, 800)
      } else if (characterState === 'idle') {
        resetIdleTimer()
      }
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('click', handleActivity)

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('click', handleActivity)
    }
  }, [characterState, resetIdleTimer])

  // Обработчики для состояний чата
  const handleChatStateChange = useCallback((state: 'thinking' | 'typing' | 'success' | 'error' | 'userTyping') => {
    switch (state) {
      case 'userTyping':
        setCharacterState('surprise')
        break
      case 'thinking':
        setCharacterState('think')
        break
      case 'typing':
        setCharacterState('typing')
        break
      case 'success':
        setCharacterState('happy')
        setTimeout(() => {
          setCharacterState('idle')
          resetIdleTimer()
        }, 1000)
        break
      case 'error':
        setCharacterState('sad')
        setTimeout(() => {
          setCharacterState('idle')
          resetIdleTimer()
        }, 2000)
        break
    }
  }, [resetIdleTimer])

  const handleToggle = () => {
    if (isOpen) {
      // Закрываем: машем и уезжаем
      setCharacterState('wave')
      setTimeout(() => {
        setCharacterState('disappear')
        setTimeout(() => {
          setIsOpen(false)
          setIsVisible(true)
          setCharacterState('idle')
        }, 600)
      }, 1000)
    } else {
      setIsOpen(true)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen && (
        <ChatWindow
          onClose={handleToggle}
          onStateChange={handleChatStateChange}
        />
      )}

      {/* Персонаж */}
      <div
        onClick={handleToggle}
        className="cursor-pointer hover:scale-105 transition-transform"
        title="ИИ-помощник"
      >
        {isVisible && (
          <BoardCharacter
            state={characterState}
            size={100}
          />
        )}
      </div>
    </div>
  )
}

// Экспорт функции для программного изменения состояния (для тестов)
export function setCharacterState(state: CharacterState) {
  window.dispatchEvent(new CustomEvent('helper-state-change', { detail: state }))
}
