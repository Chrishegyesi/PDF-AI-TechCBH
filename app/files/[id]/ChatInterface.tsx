'use client'

import { useState, useEffect } from 'react'
import { readUIMessageStream, type UIMessage } from 'ai'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type PDFPageContent = {
  pageNumber: number
  text: string
}

type ChatInterfaceProps = {
  pdfContent?: PDFPageContent[]
  currentPage?: number
  fileId?: string
  onSetPage?: (page: number) => void
  onHighlightRegion?: (page: number, rects: Array<{x: number, y: number, width: number, height: number}>, color?: string) => void
}

export default function ChatInterface({ 
  pdfContent = [], 
  currentPage = 1, 
  fileId, 
  onSetPage, 
  onHighlightRegion 
}: ChatInterfaceProps) {
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    console.log('Chat component mounting...')
    setMounted(true)
    return () => {
      console.log('Chat component unmounting...')
    }
  }, [])

  useEffect(() => {
    console.log('Chat messages updated:', messages.length)
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Chat form submitted, input:', input)
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    }

    console.log('Adding chat user message:', userMessage)
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: ''
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      // Convert existing messages to UIMessage format for API
      const existingUIMessages: UIMessage[] = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        parts: [{
          type: 'text' as const,
          text: msg.content,
          state: 'done' as const
        }]
      }))

      // Add current user message
      const currentUserMessage: UIMessage = {
        id: userMessage.id,
        role: 'user',
        parts: [{
          type: 'text',
          text: userMessage.content,
          state: 'done' as const
        }]
      }

      const allUIMessages = [...existingUIMessages, currentUserMessage]

      console.log('Sending request to /api/chat with messages:', allUIMessages.length)
      console.log('PDF content pages:', pdfContent.length, 'Current page:', currentPage)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allUIMessages,
          pdfContent: pdfContent,
          currentPage: currentPage,
          fileId: fileId
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed (${response.status})`)
      }

      console.log('Received streaming response from API')

      // Create stream from SSE response
      const chunkStream = createJsonStreamFromSSE(response.body)

      // Create assistant UI message for streaming
      const assistantUIMessage: UIMessage = {
        id: assistantMessage.id,
        role: 'assistant',
        parts: []
      }

      const stream = readUIMessageStream({
        message: assistantUIMessage,
        stream: chunkStream,
        onError: (err) => {
          console.error('Chat stream error:', err)
        },
      })

      // Process the stream and update the assistant message
      for await (const streamedMessage of stream) {
        const text = streamedMessage.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('')

        // Handle tool calls
        const toolCalls = streamedMessage.parts.filter((part: any) => part.type === 'tool-call')
        for (const toolCall of toolCalls) {
          console.log('Received tool call:', toolCall)
          if ((toolCall as any).toolName === 'set_page' && onSetPage) {
            const page = (toolCall as any).args?.page
            if (typeof page === 'number') {
              onSetPage(page)
            }
          } else if ((toolCall as any).toolName === 'highlight_region' && onHighlightRegion) {
            const { page, rects, color } = (toolCall as any).args || {}
            if (typeof page === 'number' && Array.isArray(rects)) {
              onHighlightRegion(page, rects, color)
            }
          }
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: text }
              : msg
          )
        )
      }

      console.log('Chat stream completed')
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: 'Sorry, something went wrong while fetching the AI response.' }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to create JSON stream from SSE
  function createJsonStreamFromSSE(source: ReadableStream<Uint8Array>) {
    return new ReadableStream<any>({
      start(controller) {
        const reader = source.getReader()
        let buffer = ''
        let closed = false
        const decoder = new TextDecoder()

        const closeStream = () => {
          if (!closed) {
            closed = true
            controller.close()
          }
        }

        const emitChunks = () => {
          while (buffer.includes('\n\n')) {
            const index = buffer.indexOf('\n\n')
            const raw = buffer.slice(0, index)
            buffer = buffer.slice(index + 2)

            const dataLines = raw
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)

            const payloadLine = dataLines.find((line) => line.startsWith('data:'))
            if (!payloadLine) continue

            const payload = payloadLine.slice('data:'.length).trim()
            if (!payload) continue

            if (payload === '[DONE]') {
              closeStream()
              reader.cancel().catch(() => {})
              return
            }

            try {
              controller.enqueue(JSON.parse(payload))
            } catch (error) {
              console.error('Failed to parse SSE payload', error)
            }
          }
        }

        const process = async () => {
          try {
            while (!closed) {
              const { value, done } = await reader.read()
              if (done) {
                emitChunks()
                closeStream()
                break
              }

              buffer += decoder.decode(value, { stream: true })
              emitChunks()
            }
          } catch (error) {
            controller.error(error)
          } finally {
            buffer += decoder.decode()
            if (!closed && buffer) {
              emitChunks()
              closeStream()
            }
            reader.releaseLock()
          }
        }

        process()
      },
    })
  }

  if (!mounted) {
    return (
      <div className="w-96 flex flex-col bg-slate-50 flex-shrink-0">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold text-slate-700">
          AI Tutor
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div>Loading chat...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 flex flex-col bg-slate-50 flex-shrink-0">
      <div className="border-b border-slate-200 p-4 text-sm font-semibold text-slate-700">
        AI Tutor
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-8">
            Ask me anything about this PDF document!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-800 shadow-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isLoading && <p className="text-xs italic text-slate-400">AI is typing…</p>}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="Ask about this PDF…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
