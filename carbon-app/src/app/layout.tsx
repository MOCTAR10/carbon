import type { Metadata } from 'next'
import { Inter, Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Company portal typography (Forest & Ivory) — exposed as CSS variables, opt-in via font-display / font-sans
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['opsz', 'SOFT'] })
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'CarbonTrack — Bilan Carbone & Certification GES',
  description: 'Plateforme de bilan GES pour les entreprises gabonaises — ISO 14064, GHG Protocol, certification officielle GreenLeaves.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
