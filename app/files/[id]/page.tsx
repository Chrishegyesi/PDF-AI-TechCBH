'use client'

import dynamic from 'next/dynamic'
import { use, useCallback, useRef, useState, useEffect } from 'react'
import { readUIMessageStream, type UIMessage } from 'ai'

import type { ViewerActions, PDFPageContent } from './PdfViewerClient'

const PdfViewerClient = dynamic(() => import('./PdfViewerClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div>Loading PDF viewer...</div>
    </div>
  )
})

type PageProps = {
  params: Promise<{ id: string }>
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// PDF Error Boundary Component - moved outside to prevent re-creation
const PDFViewerWithErrorBoundary = ({ 
  id, 
  registerActions, 
  setPdfError,
  onContentExtracted,
  onPageChange
}: { 
  id: string, 
  registerActions: (actions: ViewerActions) => void,
  setPdfError: (error: string | null) => void,
  onContentExtracted: (content: PDFPageContent[]) => void,
  onPageChange: (pageNumber: number) => void
}) => {
  const [pdfMounted, setPdfMounted] = useState(false)
  
  useEffect(() => {
    // Delay PDF mounting to ensure chat is stable first
    const timer = setTimeout(() => {
      setPdfMounted(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  if (!pdfMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing PDF viewer...</p>
        </div>
      </div>
    )
  }

  try {
    return <PdfViewerClient 
      fileId={id} 
      registerActions={registerActions} 
      onContentExtracted={onContentExtracted}
      onPageChange={onPageChange}
    />
  } catch (error) {
    console.error('PDF Viewer Error:', error)
    setPdfError('Failed to load PDF viewer')
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">PDF Viewer Error</h3>
          <p className="text-gray-600">Failed to load the PDF viewer</p>
          <button 
            onClick={() => {
              setPdfError(null)
              setPdfMounted(false)
              setTimeout(() => setPdfMounted(true), 100)
            }} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
}

export default function Page({ params }: PageProps) {
  const { id } = use(params)
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfContent, setPdfContent] = useState<PDFPageContent[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const viewerActionsRef = useRef<ViewerActions | null>(null)

  // Handle client-side mounting
  useEffect(() => {
    console.log('Component mounting...')
    setMounted(true)
    return () => {
      console.log('Component unmounting...')
    }
  }, [])

  useEffect(() => {
    console.log('📊 Messages state updated:', messages.length, 'messages:', messages)
  }, [messages])

  useEffect(() => {
    console.log('Mounted state:', mounted)
  }, [mounted])

  const registerActions = useCallback((actions: ViewerActions) => {
    console.log('🔧 Registering PDF viewer actions:', {
      jumpToPage: typeof actions.jumpToPage,
      highlightRegion: typeof actions.highlightRegion,
      hasActions: !!actions
    })
    viewerActionsRef.current = actions
    
    // Test the actions immediately
    console.log('🔧 Testing actions:', {
      canJump: typeof actions.jumpToPage === 'function',
      canHighlight: typeof actions.highlightRegion === 'function'
    })
  }, [])

  const handleContentExtracted = useCallback((content: PDFPageContent[]) => {
    console.log('📄 PDF content extracted:', content.length, 'pages')
    content.forEach((page, index) => {
      console.log(`📄 Page ${page.pageNumber}: ${page.text.length} characters`, 
        page.text.substring(0, 100) + '...')
    })
    setPdfContent(content)
  }, [])

  const handlePageChange = useCallback((pageNumber: number) => {
    console.log('📄 Current page changed to:', pageNumber)
    setCurrentPage(pageNumber)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Form submitted! Input:', input, 'isLoading:', isLoading)
    if (!input.trim() || isLoading) {
      console.log('❌ Early return - input empty or loading')
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    }

    console.log('➕ Adding user message:', userMessage)
    setMessages(prev => {
      console.log('📝 Previous messages:', prev)
      const newMessages = [...prev, userMessage]
      console.log('📝 New messages:', newMessages)
      return newMessages
    })
    setInput('')
    setIsLoading(true)

    // Create assistant message for streaming
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: ''
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      console.log('🌐 Calling real AI API...')
      
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

      console.log('🌐 Calling real AI API with PDF content...', {
        messagesCount: allUIMessages.length,
        pdfPagesCount: pdfContent.length,
        currentPage: currentPage,
        fileId: id,
        pdfContentSample: pdfContent.length > 0 ? pdfContent[0].text.substring(0, 100) + '...' : 'No content',
        allPagesSample: pdfContent.map(page => ({ page: page.pageNumber, chars: page.text.length, sample: page.text.substring(0, 50) + '...' }))
      })
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allUIMessages,
          pdfContent: pdfContent,
          currentPage: currentPage,
          fileId: id
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed (${response.status})`)
      }

      console.log('📡 Received streaming response from API')

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
      let allStreamData = []
      for await (const streamedMessage of stream) {
        allStreamData.push(streamedMessage)
        console.log('📥 Received stream chunk:', JSON.stringify(streamedMessage, null, 2))
        console.log('📥 Stream parts:', streamedMessage.parts?.map((p: any) => ({ type: p.type, keys: Object.keys(p) })))
        
        // Handle tool calls - check for tool-call parts
        streamedMessage.parts?.forEach((part: any, index: number) => {
          console.log(`📥 Part ${index}:`, JSON.stringify(part, null, 2))
          
          // Handle AI SDK v5 tool calls format
          if (part.type === 'tool-highlight_region') {
            console.log('🔧 Highlight tool call detected:', part)
            console.log('🔧 Viewer actions ref:', !!viewerActionsRef.current)
            
            if (part.state === 'input-available' && viewerActionsRef.current) {
              const { page, rects, color } = part.input as { 
                page: number, 
                rects: Array<{x: number, y: number, width: number, height: number}>, 
                color?: string 
              }
              console.log('🔧 Executing highlight_region:', { page, rects, color })
              
              const highlight = {
                id: `highlight-${Date.now()}-${Math.random()}`,
                page,
                rects,
                color: color || '#ffff0080'
              }
              
              console.log('🔧 Calling highlightRegion with:', highlight)
              try {
                viewerActionsRef.current.highlightRegion(highlight)
                console.log('🔧 ✅ Highlight executed successfully')
              } catch (error) {
                console.error('🔧 ❌ Highlight execution failed:', error)
              }
            } else {
              console.log('🔧 Skipping highlight - state:', part.state, 'hasActions:', !!viewerActionsRef.current)
            }
          }
          
          if (part.type === 'tool-set_page') {
            console.log('🔧 Set page tool call detected:', part)
            
            if (part.state === 'input-available' && viewerActionsRef.current) {
              const { page } = part.input as { page: number }
              console.log('🔧 Executing set_page:', page)
              
              try {
                viewerActionsRef.current.jumpToPage(page)
                console.log('🔧 ✅ Page jump executed successfully')
              } catch (error) {
                console.error('🔧 ❌ Page jump execution failed:', error)
              }
            }
          }
        })
        
        const text = streamedMessage.parts
          ?.filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('')

        console.log('📝 Extracted text from stream:', text)

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: text || '' }
              : msg
          )
        )
      }
      
      console.log('🎯 Complete stream data:', allStreamData)

      console.log('✅ AI streaming complete')
    } catch (error) {
      console.error('❌ Chat error:', error)
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
  }, [input, isLoading, messages]) // Add back dependencies

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

        const processBuffer = () => {
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed === '') continue
            if (trimmed === 'data: [DONE]') {
              closeStream()
              return
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6)
                const parsed = JSON.parse(jsonStr)
                controller.enqueue(parsed)
              } catch (e) {
                console.warn('Failed to parse SSE data:', trimmed)
              }
            }
          }
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                processBuffer()
                closeStream()
                break
              }
              buffer += decoder.decode(value, { stream: true })
              processBuffer()
            }
          } catch (error) {
            console.error('Stream reading error:', error)
            closeStream()
          }
        }

        pump()
      }
    })
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="grid h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="border-r bg-white flex items-center justify-center">
          <div>Loading PDF viewer...</div>
        </div>
        <div className="flex flex-col bg-slate-50">
          <div className="border-b border-slate-200 p-4 text-sm font-semibold text-slate-700">
            AI Tutor
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div>Loading chat...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex">
      {/* PDF Panel - Completely isolated */}
      <div className="flex-1 border-r bg-white relative">
        {pdfError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">PDF Error</h3>
              <p className="text-gray-600">{pdfError}</p>
              <button 
                onClick={() => {
                  setPdfError(null)
                  window.location.reload()
                }} 
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <PDFViewerWithErrorBoundary 
              id={id}
              registerActions={registerActions}
              setPdfError={setPdfError}
              onContentExtracted={handleContentExtracted}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Chat Panel - Always stable */}
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
              name="message"
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
    </div>
  )
}
