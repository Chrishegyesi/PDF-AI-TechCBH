'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'

const PdfViewerClient = dynamic(() => import('./PdfViewerClient'), { ssr: false })

export default async function Page({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params             // Next 15: await params
  return (
    <div className="h-screen grid grid-cols-2">
      {/* LEFT: Viewer from docs */}
      <div className="border-r">
        <PdfViewerClient fileId={id} />
      </div>

      {/* RIGHT: Chat shell (fill in later) */}
      <div className="flex flex-col">
        <div className="p-3 border-b font-medium">AI Tutor</div>
        <div className="flex-1 p-3 text-sm text-gray-500">chat goes here…</div>
      </div>
    </div>
  )
}