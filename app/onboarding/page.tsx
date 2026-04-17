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

export default function OnboardingPage() {
  const router = useRouter()
  const { toggleRestriction, addAllergen, removeAllergen, completeOnboarding, profile } = useStore()
  const [step, setStep] = useState(1)
  const [customAllergen, setCustomAllergen] = useState('')

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
    else {
      completeOnboarding()
      router.push('/accueil')
    }
  }

  const handleSkip = () => {
    completeOnboarding()
    router.push('/accueil')
  }

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Progress bar */}
      <div className="flex gap-2 mb-8 mt-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-primary/20'
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Intro */}
      {step === 1 && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col justify-center items-center text-center gap-6">
            <div className="text-6xl">🍽️</div>
            <h1 className="font-title text-3xl font-bold text-text">
              Mangez en toute sécurité
            </h1>
            <p className="text-muted text-base leading-relaxed">
              Photographiez n'importe quel menu et recevez instantanément une analyse
              personnalisée selon vos restrictions alimentaires.
            </p>
            <div className="flex flex-col gap-4 w-full mt-4">
              {[
                { icon: '📸', text: 'Scannez un menu en quelques secondes' },
                { icon: '🔍', text: 'Détection de vos allergènes automatique' },
                { icon: '✅', text: 'Recommandations claires et personnalisées' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 bg-card rounded-2xl p-4">
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-sm text-text font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Restrictions */}
      {step === 2 && (
        <div className="flex flex-col flex-1">
          <h1 className="font-title text-2xl font-bold text-text mb-2">
            Vos restrictions
          </h1>
          <p className="text-muted text-sm mb-6">Sélectionnez tout ce qui vous correspond</p>
          <div className="flex flex-col gap-3 flex-1">
            {RESTRICTIONS.map((r) => {
              const active = profile.restrictions.includes(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRestriction(r.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-card'
                  }`}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <span className={`font-medium ${active ? 'text-primary' : 'text-text'}`}>
                    {r.label}
                  </span>
                  {active && <span className="ml-auto text-primary">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Allergens */}
      {step === 3 && (
        <div className="flex flex-col flex-1">
          <h1 className="font-title text-2xl font-bold text-text mb-2">
            Vos allergènes
          </h1>
          <p className="text-muted text-sm mb-6">
            Sélectionnez parmi les 14 allergènes majeurs UE ou ajoutez le vôtre
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {EU_ALLERGENS.map((a) => {
              const active = profile.allergens.includes(a)
              return (
                <button
                  key={a}
                  onClick={() => (active ? removeAllergen(a) : addAllergen(a))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-card text-text border border-primary/20'
                  }`}
                >
                  {a}
                </button>
              )
            })}
          </div>
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
          {profile.allergens.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted mb-2">Sélectionnés :</p>
              <div className="flex flex-wrap gap-2">
                {profile.allergens.map((a) => (
                  <span
                    key={a}
                    className="bg-primary text-white px-3 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {a}
                    <button onClick={() => removeAllergen(a)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Confirmation */}
      {step === 4 && (
        <div className="flex flex-col flex-1 justify-center items-center text-center gap-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-4xl">
            ✅
          </div>
          <h1 className="font-title text-2xl font-bold text-text">
            Votre profil est prêt !
          </h1>
          <p className="text-muted text-sm">
            Nous avons configuré vos préférences. Vous pouvez les modifier à tout moment dans votre profil.
          </p>
          {(profile.restrictions.length > 0 || profile.allergens.length > 0) && (
            <div className="bg-card rounded-2xl p-4 w-full text-left">
              {profile.restrictions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted mb-2 font-medium">RESTRICTIONS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.restrictions.map((r) => {
                      const res = RESTRICTIONS.find((x) => x.id === r)
                      return (
                        <span key={r} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                          {res?.icon} {res?.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              {profile.allergens.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-2 font-medium">ALLERGÈNES</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.allergens.map((a) => (
                      <span key={a} className="bg-danger/10 text-danger text-xs px-2.5 py-1 rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer buttons */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={handleNext}
          className="w-full bg-primary text-white font-title font-bold py-4 rounded-2xl text-base"
        >
          {step === 4 ? 'Commencer à scanner 🚀' : 'Continuer'}
        </button>
        {step < 4 && (
          <button onClick={handleSkip} className="text-muted text-sm py-2">
            Passer
          </button>
        )}
      </div>
    </div>
  )
}
