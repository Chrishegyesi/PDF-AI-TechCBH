import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { NextRequest } from 'next/server';

const model = openai('gpt-4o-mini');

export const answerMyQuestion = async (prompt: string) => {
  const { textStream } = await streamText({
    model,
    messages: [
        { role: 'system', 
        content:
            `You are an AI tutor. Please answer the following question in a clear and concise manner, suitable for a student learning the topic.`
        },
    {
        role: 'user',
        content: prompt,
    },
],
  });

  for await (const text of textStream) {
   process.stdout.write(text);
  }

  return textStream;
};

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const answer = await answerMyQuestion(prompt);
    console.log('AI Response:', answer); // This will show in your terminal when running pnpm dev
    
    return Response.json({ answer });
  } catch (error) {
    console.error('Error in chatbot API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Test endpoint you can visit in browser
    const answer = await answerMyQuestion('write a paraghraph about the benefits of using AI in education.');
    console.log('Test AI Response:', answer); // This will show in your terminal
    
    return Response.json({ 
      message: 'Chatbot API is working!', 
      testAnswer: answer 
    });
  } catch (error) {
    console.error('Error in chatbot test:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}