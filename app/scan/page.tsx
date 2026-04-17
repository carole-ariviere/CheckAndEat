'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'

function compressImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1280
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = (height / width) * MAX; width = MAX }
        else { width = (width / height) * MAX; height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/webp', 0.85).split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'camera' | 'preview' | 'analyzing' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { profile, setLastResult } = useStore()

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingImage')
    if (pending) {
      sessionStorage.removeItem('pendingImage')
      setPreview(pending)
      setStatus('preview')
      return
    }
    if (mode === 'camera') startCamera()
  }, [mode])

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setStatus('camera')
    } catch {
      setError('Impossible d\'accéder à la caméra')
      setStatus('error')
    }
  }

  function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const url = canvas.toDataURL('image/webp')
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setPreview(url)
    setStatus('preview')
  }

  async function analyze() {
    if (!preview) return
    setStatus('analyzing')
    try {
      let base64: string
      if (preview.startsWith('blob:')) {
        const res = await fetch(preview)
        const blob = await res.blob()
        base64 = await compressImage(blob)
      } else {
        base64 = preview.split(',')[1] ?? preview
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, profile }),
      })

      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      setLastResult(result, preview)
      router.push('/resultats')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-4 p-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
        >
          ←
        </button>
        <span className="font-title font-bold">
          {status === 'analyzing' ? 'Analyse en cours...' : 'Scanner un menu'}
        </span>
      </div>

      {/* Camera view */}
      {status === 'camera' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="flex-1 w-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center">
            <button
              onClick={captureFrame}
              className="w-20 h-20 bg-white rounded-full border-4 border-primary shadow-xl"
            />
          </div>
        </>
      )}

      {/* Preview */}
      {status === 'preview' && preview && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="flex-1 w-full object-contain" />
          <div className="p-6 bg-black/80 backdrop-blur flex gap-3">
            <button
              onClick={() => {
                setPreview(null)
                setStatus('idle')
                if (mode === 'camera') startCamera()
                else router.back()
              }}
              className="flex-1 bg-white/20 text-white py-4 rounded-2xl font-medium"
            >
              Reprendre
            </button>
            <button
              onClick={analyze}
              className="flex-1 bg-primary text-white py-4 rounded-2xl font-title font-bold"
            >
              Analyser 🔍
            </button>
          </div>
        </>
      )}

      {/* Analyzing */}
      {status === 'analyzing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-center text-white/80">
            L'IA analyse votre menu selon votre profil alimentaire...
          </p>
          <p className="text-xs text-white/40">Cela peut prendre quelques secondes</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <span className="text-5xl">❌</span>
          <p className="text-center text-white/80">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-medium"
          >
            Retour
          </button>
        </div>
      )}

      {/* Idle */}
      {status === 'idle' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanContent />
    </Suspense>
  )
}
