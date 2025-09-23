'use client'

import { useEffect, useState } from 'react'
import { Worker, Viewer, type PageChangeEvent } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import { highlightPlugin, Trigger } from '@react-pdf-viewer/highlight'

export type HighlightRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ViewerHighlight = {
  id: string
  page: number
  rects: HighlightRect[]
  color?: string
}

export type ViewerActions = {
  jumpToPage: (page: number) => void
  highlightRegion: (highlight: ViewerHighlight) => void
}

export type PDFPageContent = {
  pageNumber: number
  text: string
}

type PdfViewerClientProps = {
  fileId: string
  registerActions?: (actions: ViewerActions) => void
  onContentExtracted?: (content: PDFPageContent[]) => void
  onPageChange?: (pageNumber: number) => void
}

// Import the styles once (no duplicates)
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

export default function PdfViewerClient({ fileId, registerActions, onContentExtracted, onPageChange: onPageChangeCallback }: PdfViewerClientProps) {
  const [url, setUrl] = useState<string>()
  const [highlights, setHighlights] = useState<ViewerHighlight[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [extractedContent, setExtractedContent] = useState<PDFPageContent[]>([])

  const defaultLayout = defaultLayoutPlugin()
  const pageNav = pageNavigationPlugin()
  const highlight = highlightPlugin({
    trigger: Trigger.None,
    renderHighlights: (props) => {
      const overlays = highlights.filter((entry) => entry.page === props.pageIndex + 1)
      if (!overlays.length) return <></>

      return (
        <>
          {overlays.flatMap((entry) =>
            entry.rects.map((rect, idx) => {
              const area = {
                pageIndex: props.pageIndex,
                left: rect.x * 100,
                top: rect.y * 100,
                width: rect.width * 100,
                height: rect.height * 100,
              }
              const style = props.getCssProperties(area, props.rotation)

              return (
                <div
                  key={`${entry.id}-${idx}`}
                  style={{
                    ...style,
                    backgroundColor: entry.color ?? 'rgba(250, 204, 21, 0.35)',
                    borderRadius: 4,
                  }}
                />
              )
            })
          )}
        </>
      )
    },
  })

  useEffect(() => {
    if (!fileId) return

    const fetchUrl = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Fetching signed URL for file:', fileId)
        
        const response = await fetch(`/api/files/${fileId}/signed-url`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch signed URL: ${response.status} ${response.statusText}`)
        }
        
        const payload = await response.json()
        
        if (!payload.url) {
          throw new Error('No URL received from API')
        }
        
        console.log('Successfully fetched PDF URL:', payload.url)
        setUrl(payload.url)
      } catch (err) {
        console.error('Error fetching PDF URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }

    fetchUrl()
  }, [fileId])

  useEffect(() => {
    if (!registerActions) return

    const actions: ViewerActions = {
      jumpToPage: (page) => {
        if (Number.isFinite(page) && page > 0) {
          pageNav.jumpToPage(page - 1)
        }
      },
      highlightRegion: (highlightData) => {
        if (!highlightData?.id || !highlightData.rects?.length) return

        setHighlights((prev) => {
          const filtered = prev.filter((entry) => entry.id !== highlightData.id)
          return [...filtered, highlightData]
        })
      },
    }

    registerActions(actions)
  }, [pageNav, registerActions])

  // Function to extract text from all pages
  const extractTextFromPDF = async (pdfDoc: any) => {
    console.log('Starting PDF text extraction...')
    const content: PDFPageContent[] = []
    
    try {
      const numPages = pdfDoc.numPages
      console.log(`Extracting text from ${numPages} pages`)
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum)
          const textContent = await page.getTextContent()
          
          // Combine all text items on the page
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
            .map((item: any) => item.str)
            .join(' ')
            .trim()
          
          content.push({
            pageNumber: pageNum,
            text: pageText
          })
          
          console.log(`Extracted text from page ${pageNum}: ${pageText.length} characters`)
        } catch (pageError) {
          console.error(`Error extracting text from page ${pageNum}:`, pageError)
          content.push({
            pageNumber: pageNum,
            text: ''
          })
        }
      }
      
      setExtractedContent(content)
      onContentExtracted?.(content)
      console.log('PDF text extraction completed')
    } catch (error) {
      console.error('Error during PDF text extraction:', error)
    }
  }

  const onDocLoad = (e: any) => {
    console.log('PDF loaded successfully, pages:', e.doc.numPages)
    setPdfDocument(e.doc)
    
    // Extract text content when document loads
    extractTextFromPDF(e.doc)
  }
  const onPageChange = (e: PageChangeEvent) => {
    console.log('📄 Page changed to:', e.currentPage + 1)
    onPageChangeCallback?.(e.currentPage + 1) // Convert from 0-based to 1-based
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">PDF Load Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
      <div style={{ height: '100%', border: '1px solid rgba(0,0,0,0.1)' }}>
        {url && (
          <Viewer
            fileUrl={url}
            plugins={[defaultLayout, pageNav, highlight]}
            onDocumentLoad={onDocLoad}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </Worker>
  )
}
