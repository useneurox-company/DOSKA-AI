import { NextRequest, NextResponse } from 'next/server'
import { HELPER_SYSTEM_PROMPT } from '@/lib/helper/systemPrompt'

const API_URL = "https://openrouter.ai/api/v1/chat/completions"

// Используем тот же пул ключей что и в основном openrouter.ts
const API_KEYS = [
  process.env.OPENROUTER_API_KEY,
  "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",
  "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",
].filter((key): key is string => Boolean(key))

let currentKeyIndex = 0

function getNextApiKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error("No OpenRouter API keys configured")
  }
  const key = API_KEYS[currentKeyIndex % API_KEYS.length]
  currentKeyIndex++
  return key
}

// Используем Gemini для быстрых и дешевых ответов
const MODEL = "google/gemini-3-flash-preview"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as {
      message: string
      history: ChatMessage[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Сообщение обязательно' }, { status: 400 })
    }

    const apiKey = getNextApiKey()

    // Формируем сообщения с историей
    const messages = [
      { role: "system" as const, content: HELPER_SYSTEM_PROMPT },
      ...(history || []).map((msg: ChatMessage) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      { role: "user" as const, content: message }
    ]

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://doska.ai",
        "X-Title": "DoskaAI Helper Chat",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Helper Chat] API error:', error)
      return NextResponse.json(
        { error: 'Ошибка AI. Попробуйте позже.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('[Helper Chat] Error:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
