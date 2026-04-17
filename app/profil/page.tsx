'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Restriction } from '@/lib/types'

const RESTRICTIONS: { id: Restriction; label: string; icon: string }[] = [
  { id: 'vegan', label: 'Végétalien', icon: '🌱' },
  { id: 'vegetarian', label: 'Végétarien', icon: '🥗' },
  { id: 'gluten_free', label: 'Sans gluten', icon: '🌾' },
  { id: 'lactose_free', label: 'Sans lactose', icon: '🥛' },
  { id: 'pregnancy', label: 'Grossesse', icon: '🤰' },
]

const EU_ALLERGENS = [
  'Arachides', 'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Soja',
  'Lait', 'Noix', 'Céleri', 'Moutarde', 'Sésame', 'Mollusques',
  'Lupin', 'Anhydride sulfureux',
]

export default function ProfilPage() {
  const router = useRouter()
  const { profile, toggleRestriction, addAllergen, removeAllergen, lastResult } = useStore()
  const [customAllergen, setCustomAllergen] = useState('')

  const stats = {
    scans: lastResult ? 1 : 0,
    alerts: lastResult?.dishes.filter((d) => d.status === 'avoid').length ?? 0,
    restrictions: profile.restrictions.length + profile.allergens.length,
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/accueil')} className="text-muted hover:text-text">←</button>
          <h1 className="font-title text-2xl font-bold text-text">Mon profil</h1>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-6">
          {[
            { value: stats.scans, label: 'Menus scannés' },
            { value: stats.alerts, label: 'Alertes évitées' },
            { value: stats.restrictions, label: 'Restrictions actives' },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-card rounded-2xl p-3 text-center">
              <p className="font-title font-bold text-2xl text-primary">{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 overflow-y-auto">
        {/* Restrictions */}
        <div className="mb-6">
          <p className="text-xs text-muted font-medium mb-3">MES RESTRICTIONS</p>
          <div className="flex flex-col gap-2">
            {RESTRICTIONS.map((r) => {
              const active = profile.restrictions.includes(r.id)
              return (
                <div key={r.id} className="flex items-center justify-between bg-card rounded-xl p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{r.icon}</span>
                    <span className="text-sm font-medium text-text">{r.label}</span>
                  </div>
                  <button
                    onClick={() => toggleRestriction(r.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      active ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        active ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Allergens */}
        <div className="mb-6">
          <p className="text-xs text-muted font-medium mb-3">MES ALLERGÈNES</p>

          {/* Active allergens */}
          {profile.allergens.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.allergens.map((a) => (
                <span
                  key={a}
                  className="bg-danger/10 text-danger text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium"
                >
                  {a}
                  <button onClick={() => removeAllergen(a)} className="hover:opacity-70">×</button>
                </span>
              ))}
            </div>
          )}

          {/* EU allergens quick add */}
          <div className="bg-card rounded-2xl p-4 mb-3">
            <p className="text-xs text-muted mb-3">14 allergènes majeurs UE</p>
            <div className="flex flex-wrap gap-2">
              {EU_ALLERGENS.filter((a) => !profile.allergens.includes(a)).map((a) => (
                <button
                  key={a}
                  onClick={() => addAllergen(a)}
                  className="bg-bg text-text text-xs px-2.5 py-1.5 rounded-full border border-primary/20 hover:bg-primary/10"
                >
                  + {a}
                </button>
              ))}
            </div>
          </div>

          {/* Custom allergen */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customAllergen}
              onChange={(e) => setCustomAllergen(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customAllergen.trim()) {
                  addAllergen(customAllergen.trim())
                  setCustomAllergen('')
                }
              }}
              placeholder="Ajouter un allergène personnalisé..."
              className="flex-1 bg-card border border-primary/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                if (customAllergen.trim()) {
                  addAllergen(customAllergen.trim())
                  setCustomAllergen('')
                }
              }}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="p-4 bg-white border-t border-bg">
        <button
          onClick={() => router.push('/accueil')}
          className="w-full bg-primary text-white font-title font-bold py-4 rounded-2xl"
        >
          Aller scanner un menu 📷
        </button>
      </div>
    </div>
  )
}
