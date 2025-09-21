// PDF.js worker configuration for Next.js
import { GlobalWorkerOptions } from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js`
}

export { GlobalWorkerOptions }
