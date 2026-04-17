import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Check&Eat — Mangez en toute sécurité',
  description: 'Analysez les menus de restaurant selon vos restrictions alimentaires.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-bg">
        <div className="mx-auto max-w-md min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
