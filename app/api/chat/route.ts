import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;
// optional: export const runtime = 'edge';

type PDFPageContent = {
  pageNumber: number
  text: string
}

export async function POST(req: Request) {
  const { 
    messages, 
    pdfContent = [], 
    currentPage = 1, 
    fileId 
  }: { 
    messages: UIMessage[], 
    pdfContent?: PDFPageContent[], 
    currentPage?: number, 
    fileId?: string 
  } = await req.json();

  console.log('📡 API received:', {
    messagesCount: messages.length,
    pdfContentPages: pdfContent?.length || 0,
    currentPage,
    fileId,
    firstPageSample: pdfContent?.[0]?.text?.substring(0, 100) + '...' || 'No content'
  });

  // Build system prompt with PDF context
  let systemPrompt = 'You are a helpful AI tutor helping students understand PDF documents. You can assist with explanations, answer questions about the content, and provide educational guidance.\n\nAVAILABLE TOOLS:\n1. set_page(page): Navigate to a specific page to show relevant content\n2. highlight_region(page, rects, color): Highlight important text or regions on a page\n\nWhen users ask you to highlight, circle, or point out specific content:\n- Use the highlight_region tool to visually highlight the relevant text\n- You can highlight multiple regions by providing multiple rectangles in the rects array\n- Coordinates are ratios from 0-1 (e.g., x=0.1 means 10% from left edge)\n- Use different colors for different types of highlights (e.g., yellow for important text, red for warnings)\n\nAlways be encouraging and educational in your responses. When referring to specific content on different pages, use set_page to navigate there and highlight_region to draw attention to important sections.';
  
  if (pdfContent && pdfContent.length > 0) {
    systemPrompt += `\n\nDOCUMENT CONTEXT:\nYou are currently viewing a PDF document with ${pdfContent.length} pages. The current page is ${currentPage}.\n\n`;
    
    // Add full content of all pages for comprehensive understanding
    systemPrompt += 'FULL DOCUMENT CONTENT:\n';
    pdfContent.forEach(page => {
      if (page.text.trim()) {
        systemPrompt += `=== PAGE ${page.pageNumber} ===\n${page.text}\n\n`;
      }
    });
  }

  console.log('🤖 System prompt length:', systemPrompt.length)
  console.log('🤖 System prompt preview:', systemPrompt.substring(0, 500) + '...')

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: {
      // CLIENT-SIDE tool (no execute): the UI will run the action
      set_page: {
        description: 'Set the PDF viewer to a specific page (1-based).',
        inputSchema: z.object({
          page: z
            .number()
            .int()
            .min(1)
            .describe('Target page, starting at 1'),
        }),
      },
      highlight_region: {
        description:
          'Visually highlight one or more rectangular regions on a given page (coordinates are ratios from 0-1).',
        inputSchema: z.object({
          page: z
            .number()
            .int()
            .min(1)
            .describe('Page number that contains the region (1-based).'),
          rects: z
            .array(
              z.object({
                x: z
                  .number()
                  .min(0)
                  .max(1)
                  .describe('Left offset as a fraction of the page width.'),
                y: z
                  .number()
                  .min(0)
                  .max(1)
                  .describe('Top offset as a fraction of the page height.'),
                width: z
                  .number()
                  .min(0)
                  .max(1)
                  .describe('Width as a fraction of the page width.'),
                height: z
                  .number()
                  .min(0)
                  .max(1)
                  .describe('Height as a fraction of the page height.'),
              })
            )
            .min(1)
            .describe('One or more rectangles to highlight.'),
          color: z
            .string()
            .optional()
            .describe('Optional CSS color for the highlight overlay.'),
        }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
