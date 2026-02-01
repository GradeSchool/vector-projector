import { useState, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { authClient } from '@/lib/auth-client'

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string

// Max SVG file size: 15 KB (as defined in blueprint)
const MAX_SVG_SIZE = 15 * 1024

export function BaseSvgSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<Id<'svg_files'> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const baseSamples = useQuery(api.svgFiles.listBaseSamples)
  const commitFile = useMutation(api.svgFiles.commitFile)
  const deleteFile = useMutation(api.svgFiles.deleteFile)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size
      if (file.size > MAX_SVG_SIZE) {
        setUploadError(`File too large. Max size is ${MAX_SVG_SIZE / 1024} KB.`)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      setSelectedFile(file)
      // Auto-fill display name from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.svg$/i, '')
      setDisplayName(nameWithoutExt)
      setUploadError(null)
      setUploadSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !displayName.trim()) return

    setUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      // Step 1: Upload file to our authenticated upload endpoint
      // Get auth cookie from Better Auth cross-domain storage
      const authCookie = authClient.getCookie()

      const uploadResponse = await fetch(`${CONVEX_SITE_URL}/upload`, {
        method: 'POST',
        body: selectedFile,
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Better-Auth-Cookie': authCookie || '',
        },
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`)
      }

      const { blobId } = await uploadResponse.json()

      // Step 2: Commit the blob (path is generated server-side for security)
      await commitFile({
        blobId,
        fileName: selectedFile.name,
        name: displayName.trim(),
        fileSize: selectedFile.size,
        isBase: true,
      })

      // Reset form
      setSelectedFile(null)
      setDisplayName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: Id<'svg_files'>) => {
    if (deletingId) return
    setDeletingId(fileId)
    try {
      await deleteFile({ fileId })
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Base SVG Files</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload SVG files that all users can access for projection onto STL models.
          These serve as sample patterns for new users to explore.
        </p>
      </div>

      {/* Upload form */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-emerald-900 mb-3">Upload New Base SVG</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-emerald-700 mb-1">Select SVG File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-medium
                file:bg-emerald-100 file:text-emerald-700
                hover:file:bg-emerald-200"
            />
            {selectedFile && (
              <p className="mt-1 text-xs text-emerald-600">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            <p className="mt-1 text-xs text-emerald-500">
              Max size: {MAX_SVG_SIZE / 1024} KB
            </p>
          </div>

          <div>
            <label className="block text-sm text-emerald-700 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Star, Heart, Arrow..."
              className="w-full px-3 py-2 border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
              maxLength={100}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !displayName.trim() || uploading}
            className="w-full px-4 py-2 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Base SVG'}
          </button>

          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="text-sm text-green-600">Upload successful!</p>
          )}
        </div>
      </div>

      {/* Existing base samples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Existing Base SVGs ({baseSamples?.length ?? 0})
        </h3>

        {baseSamples === undefined ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : baseSamples.length === 0 ? (
          <p className="text-sm text-gray-400">No base SVGs uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {baseSamples.map((sample) => (
              <div
                key={sample._id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {sample.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {sample.fileName} &middot; {formatFileSize(sample.fileSize)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(sample._id)}
                  disabled={deletingId === sample._id}
                  className="ml-3 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                >
                  {deletingId === sample._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
