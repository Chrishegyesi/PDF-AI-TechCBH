'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a PDF file')
      setFile(null)
    }
  }

  const uploadFile = async () => {
    if (!file) return

    try {
      setUploading(true)
      setError(null)

      // Step 1: Get signed upload URL from our API
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name }),
      })

      if (!r.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { url, token, path } = await r.json()

      // Step 2: PUT the file directly to the signed URL
      const put = await fetch(url, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'x-upsert': 'true',
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      })

      if (!put.ok) {
        throw new Error('Upload failed')
      }

      // Success! Redirect to the PDF viewer
      console.log('Upload successful! Path:', path)
      // TODO: Save PDF metadata to database here
      router.push(`/files/${encodeURIComponent(path)}`)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_35px_120px_-45px_rgba(129,140,248,0.7)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white mb-4">Upload PDF</h1>
            <p className="text-sm text-indigo-100/70">
              Upload a PDF document to start chatting with your AI tutor
            </p>
          </div>

          <div className="space-y-6">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-indigo-100/90 mb-2">
                Select PDF File
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-indigo-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:text-white file:cursor-pointer hover:file:bg-indigo-400"
              />
            </div>

            {/* Selected File Info */}
            {file && (
              <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                <p className="text-sm text-indigo-100">
                  <span className="font-medium">Selected:</span> {file.name}
                </p>
                <p className="text-xs text-indigo-100/70 mt-1">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={uploadFile}
              disabled={!file || uploading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-3 text-white font-medium shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
