'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const onboardingDone = useStore((s) => s.onboardingDone)

  useEffect(() => {
    if (onboardingDone) {
      router.replace('/accueil')
    } else {
      router.replace('/onboarding')
    }
  }, [onboardingDone, router])

  return null
}
