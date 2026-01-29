'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatWindowProps {
  onClose: () => void
  onStateChange?: (state: 'thinking' | 'typing' | 'success' | 'error' | 'userTyping') => void
}

const STORAGE_KEY = 'doskaai_helper_history'
const WELCOME_MESSAGE = 'Привет! Я ИИ-помощник doska.ai. Задайте вопрос о сайте, тарифах или функциях.'

export default function ChatWindow({ onClose, onStateChange }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Загрузка истории из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        } else {
          setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }])
        }
      } catch {
        setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }])
      }
    } else {
      setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }])
    }
    // Фокус на input
    inputRef.current?.focus()
  }, [])

  // Сохранение истории в localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    // Добавляем сообщение пользователя
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    // Персонаж думает
    onStateChange?.('thinking')

    try {
      // История для API (без приветственного сообщения)
      const historyForApi = newMessages.slice(1).slice(-10) // последние 10 сообщений

      const response = await fetch('/api/helper-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: historyForApi.slice(0, -1), // без последнего (текущего) сообщения
        }),
      })

      // Персонаж печатает
      onStateChange?.('typing')

      const data = await response.json()

      if (response.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        // Персонаж радуется
        onStateChange?.('success')
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.error || 'Извините, произошла ошибка. Попробуйте позже.' }
        ])
        // Персонаж грустит
        onStateChange?.('error')
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Ошибка соединения. Проверьте интернет.' }
      ])
      // Персонаж грустит
      onStateChange?.('error')
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY)
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }])
  }

  return (
    <div className="absolute bottom-16 right-0 w-[350px] h-[450px] bg-gray-900 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium text-white text-sm">ИИ-помощник</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            className="p-1.5 text-white/50 hover:text-white/80 transition-colors"
            title="Очистить историю"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white/80 transition-colors"
            title="Закрыть"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && <ChatMessage role="assistant" content="" isLoading />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              const newValue = e.target.value
              // Если начал печатать (было пусто, стало не пусто)
              if (newValue.length === 1 && input.length === 0) {
                onStateChange?.('userTyping')
              }
              setInput(newValue)
            }}
            placeholder="Задайте вопрос..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
