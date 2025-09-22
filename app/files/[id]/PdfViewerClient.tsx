'use client'

import { useEffect, useState } from 'react'
import { Worker, Viewer, type PageChangeEvent } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'

// Import the styles once (no duplicates)
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

export default function PdfViewerClient({ fileId }: { fileId: string }) {
  const [url, setUrl] = useState<string>()
  const defaultLayout = defaultLayoutPlugin()
  const pageNav = pageNavigationPlugin()

  useEffect(() => {
    if (!fileId) return
    (async () => {
      const r = await fetch(`/api/files/${fileId}/signed-url`)
      const j = await r.json()
      setUrl(j.url)
    })()
  }, [fileId])

  const onDocLoad = (e: any) => {
   e.doc.numPages 
  }
  const onPageChange = (_e: PageChangeEvent) => {}

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
      <div style={{ height: 750, border: '1px solid rgba(0,0,0,0.1)' }}>
        {url && (
          <Viewer
            fileUrl={url}                         // <-- use your signed URL
            plugins={[defaultLayout, pageNav]}     // <-- toolbar + page nav
            onDocumentLoad={onDocLoad}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </Worker>
  )
}
