'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Restriction } from '@/lib/types'

const RESTRICTION_LABELS: Record<Restriction, { label: string; color: string }> = {
  vegan: { label: '🌱 Végétalien', color: 'bg-green-100 text-green-700' },
  vegetarian: { label: '🥗 Végétarien', color: 'bg-emerald-100 text-emerald-700' },
  gluten_free: { label: '🌾 Sans gluten', color: 'bg-amber-100 text-amber-700' },
  lactose_free: { label: '🥛 Sans lactose', color: 'bg-blue-100 text-blue-700' },
  pregnancy: { label: '🤰 Grossesse', color: 'bg-pink-100 text-pink-700' },
}

export default function AccueilPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const { profile, lastResult } = useStore()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    sessionStorage.setItem('pendingImage', url)
    router.push('/scan')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-title text-2xl font-bold text-text">Check&Eat</h1>
            <p className="text-muted text-sm">Mangez en toute sécurité</p>
          </div>
          <button
            onClick={() => router.push('/profil')}
            className="w-10 h-10 bg-card rounded-full flex items-center justify-center text-lg shadow-sm"
          >
            👤
          </button>
        </div>

        {/* Restriction tags */}
        {profile.restrictions.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {profile.restrictions.map((r) => {
              const { label, color } = RESTRICTION_LABELS[r]
              return (
                <span key={r} className={`${color} text-xs font-medium px-3 py-1.5 rounded-full`}>
                  {label}
                </span>
              )
            })}
            {profile.allergens.map((a) => (
              <span key={a} className="bg-danger/10 text-danger text-xs font-medium px-3 py-1.5 rounded-full">
                ⚠️ {a}
              </span>
            ))}
          </div>
        )}

        {profile.restrictions.length === 0 && profile.allergens.length === 0 && (
          <div className="bg-warning/10 rounded-2xl p-3 mb-6 flex items-center gap-2">
            <span>⚠️</span>
            <p className="text-xs text-warning font-medium">
              Aucune restriction configurée —{' '}
              <button onClick={() => router.push('/profil')} className="underline">
                configurer mon profil
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Main actions */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        <button
          onClick={() => router.push('/scan?mode=camera')}
          className="flex-1 bg-primary text-white rounded-3xl flex flex-col items-center justify-center gap-3 p-8 shadow-lg"
        >
          <span className="text-5xl">📷</span>
          <span className="font-title font-bold text-xl">Appareil photo</span>
          <span className="text-primary-100 text-sm opacity-80">Scanner un menu en temps réel</span>
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 bg-card border-2 border-primary/20 text-text rounded-3xl flex flex-col items-center justify-center gap-3 p-8"
        >
          <span className="text-5xl">🖼️</span>
          <span className="font-title font-bold text-xl text-text">Galerie</span>
          <span className="text-muted text-sm">Importer une photo existante</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Last scan */}
      {lastResult && (
        <div className="p-6 pt-0">
          <p className="text-xs text-muted font-medium mb-3">DERNIER SCAN</p>
          <button
            onClick={() => router.push('/resultats')}
            className="w-full bg-card rounded-2xl p-4 text-left flex items-center gap-3"
          >
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <p className="font-medium text-sm text-text">
                {lastResult.restaurant || 'Menu scanné'}
              </p>
              <p className="text-xs text-muted">{lastResult.dishes.length} plats analysés</p>
            </div>
            <span className="text-muted">›</span>
          </button>
        </div>
      )}
    </div>
  )
}
