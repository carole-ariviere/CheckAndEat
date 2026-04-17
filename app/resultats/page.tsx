'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { DishStatus } from '@/lib/types'

type Filter = 'all' | DishStatus

const STATUS_CONFIG: Record<DishStatus, { label: string; color: string; bg: string; icon: string }> = {
  avoid: { label: 'À éviter', color: 'text-danger', bg: 'bg-danger/10', icon: '🔴' },
  check: { label: 'À vérifier', color: 'text-warning', bg: 'bg-warning/10', icon: '🟠' },
  ok: { label: 'OK', color: 'text-success', bg: 'bg-success/10', icon: '🟢' },
}

export default function ResultatsPage() {
  const router = useRouter()
  const { lastResult, lastImageUrl } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!lastResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <span className="text-5xl">🔍</span>
        <p className="text-muted text-center">Aucun résultat disponible</p>
        <button onClick={() => router.push('/accueil')} className="bg-primary text-white px-6 py-3 rounded-2xl">
          Retour à l'accueil
        </button>
      </div>
    )
  }

  const dishes = lastResult.dishes.filter((d) => filter === 'all' || d.status === filter)
  const counts = {
    avoid: lastResult.dishes.filter((d) => d.status === 'avoid').length,
    check: lastResult.dishes.filter((d) => d.status === 'check').length,
    ok: lastResult.dishes.filter((d) => d.status === 'ok').length,
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-text text-white p-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/accueil')} className="text-white/60 hover:text-white">
            ←
          </button>
          <h1 className="font-title font-bold text-xl">
            {lastResult.restaurant || 'Résultats'}
          </h1>
        </div>
        {/* Score summary */}
        <div className="flex gap-3">
          {Object.entries(counts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status as DishStatus]
            return (
              <div key={status} className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-2xl font-title font-bold">{count}</p>
                <p className="text-xs text-white/60">{cfg.icon} {cfg.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Global recommendation */}
      {lastResult.global_recommendation && (
        <div className="mx-4 -mt-3 bg-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-medium mb-1">RECOMMANDATION IA</p>
          <p className="text-sm text-text">{lastResult.global_recommendation}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
        {([
          { id: 'all', label: 'Tous' },
          { id: 'avoid', label: '🔴 À éviter' },
          { id: 'check', label: '🟠 À vérifier' },
          { id: 'ok', label: '🟢 OK' },
        ] as { id: Filter; label: string }[]).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.id ? 'bg-primary text-white' : 'bg-card text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Dish list */}
      <div className="flex-1 px-4 pb-6 flex flex-col gap-3">
        {dishes.length === 0 && (
          <p className="text-center text-muted py-8">Aucun plat dans cette catégorie</p>
        )}
        {dishes.map((dish, i) => {
          const cfg = STATUS_CONFIG[dish.status]
          const isOpen = expanded === i
          return (
            <div key={i} className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="text-xl">{cfg.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm text-text">{dish.name}</p>
                  {!isOpen && dish.reasons.length > 0 && (
                    <p className="text-xs text-muted line-clamp-1">{dish.reasons[0]}</p>
                  )}
                </div>
                <span className={`text-xs font-medium ${cfg.color} ${cfg.bg} px-2.5 py-1 rounded-full`}>
                  {cfg.label}
                </span>
                <span className="text-muted text-sm">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-bg">
                  {dish.ingredients_detected.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted font-medium mb-2">INGRÉDIENTS DÉTECTÉS</p>
                      <div className="flex flex-wrap gap-1">
                        {dish.ingredients_detected.map((ing, j) => (
                          <span key={j} className="bg-bg text-text text-xs px-2 py-0.5 rounded-full">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dish.reasons.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted font-medium mb-2">RAISONS</p>
                      <ul className="flex flex-col gap-1">
                        {dish.reasons.map((r, j) => (
                          <li key={j} className={`text-xs ${cfg.color} flex items-start gap-1`}>
                            <span>•</span><span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dish.recommendation && (
                    <div className="mt-3 bg-bg rounded-xl p-3">
                      <p className="text-xs text-text">{dish.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="p-4 bg-white border-t border-bg">
        <button
          onClick={() => router.push('/scan?mode=camera')}
          className="w-full bg-primary text-white font-title font-bold py-4 rounded-2xl"
        >
          Scanner un autre menu 📷
        </button>
      </div>
    </div>
  )
}
