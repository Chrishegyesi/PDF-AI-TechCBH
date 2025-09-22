// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

// Optional: allow longer streaming on dev
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages,
    system: `You are a helpful PDF tutor. You can help students understand PDF documents through conversation. Always prefer concise, actionable answers.`,
  })

  return result.toTextStreamResponse()
}