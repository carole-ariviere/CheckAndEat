import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, AnalysisResult, Restriction } from './types'

interface AppState {
  profile: UserProfile
  lastResult: AnalysisResult | null
  lastImageUrl: string | null
  onboardingDone: boolean

  setRestrictions: (restrictions: Restriction[]) => void
  toggleRestriction: (restriction: Restriction) => void
  addAllergen: (allergen: string) => void
  removeAllergen: (allergen: string) => void
  setLastResult: (result: AnalysisResult, imageUrl: string) => void
  completeOnboarding: () => void
  resetProfile: () => void
}

const defaultProfile: UserProfile = {
  restrictions: [],
  allergens: [],
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      lastResult: null,
      lastImageUrl: null,
      onboardingDone: false,

      setRestrictions: (restrictions) =>
        set((s) => ({ profile: { ...s.profile, restrictions } })),

      toggleRestriction: (restriction) =>
        set((s) => {
          const has = s.profile.restrictions.includes(restriction)
          return {
            profile: {
              ...s.profile,
              restrictions: has
                ? s.profile.restrictions.filter((r) => r !== restriction)
                : [...s.profile.restrictions, restriction],
            },
          }
        }),

      addAllergen: (allergen) =>
        set((s) => ({
          profile: {
            ...s.profile,
            allergens: s.profile.allergens.includes(allergen)
              ? s.profile.allergens
              : [...s.profile.allergens, allergen],
          },
        })),

      removeAllergen: (allergen) =>
        set((s) => ({
          profile: {
            ...s.profile,
            allergens: s.profile.allergens.filter((a) => a !== allergen),
          },
        })),

      setLastResult: (result, imageUrl) =>
        set({ lastResult: result, lastImageUrl: imageUrl }),

      completeOnboarding: () => set({ onboardingDone: true }),

      resetProfile: () =>
        set({ profile: defaultProfile, onboardingDone: false }),
    }),
    { name: 'checkandeat-store' }
  )
)
