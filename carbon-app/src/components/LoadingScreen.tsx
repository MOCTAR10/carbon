'use client'

import { Leaf } from 'lucide-react'

interface Props {
  /** 'light' = company dashboard (white bg), 'dark' = admin/expert (dark bg) */
  theme?: 'light' | 'dark'
  label?: string
  /** Override the default Leaf icon with a custom image (e.g. a partner logo) */
  logoUrl?: string
  /** Override the default "CarbonTrack" brand text */
  brand?: string
}

export default function LoadingScreen({ theme = 'dark', label = 'Chargement...', logoUrl, brand }: Props) {
  // Company portal (Forest & Ivory): quiet, branded, no bouncing
  if (theme === 'light') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ivory-100 font-sans" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-forest-900 bg-forest-grain shadow-lifted">
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="" className="size-10 object-contain" />
              : <Leaf className="size-6 text-gold-300" strokeWidth={1.8} />}
          </div>
          <div className="text-center">
            <p className="font-display text-xl text-forest-900">{brand || 'CarbonTrack'}</p>
            <p className="mt-1 text-xs text-ink-400">{label}</p>
          </div>
          <div className="h-0.5 w-32 overflow-hidden rounded-full bg-ivory-300">
            <div className="h-full w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] rounded-full bg-gold-500" />
          </div>
        </div>
        <style>{'@keyframes loading-bar { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }'}</style>
      </div>
    )
  }

  const bg    = 'bg-gray-950'
  const card  = 'bg-gray-900 border border-gray-800'
  const text  = 'text-gray-400'
  const dot   = 'bg-brand-500'

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bg}`}>
      <div className={`flex flex-col items-center gap-5 px-10 py-8 rounded-2xl ${card}`}>

        {/* Animated logo */}
        <div className="relative">
          {logoUrl ? (
            <div className="w-14 h-14 flex items-center justify-center">
              <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center">
              <Leaf className="w-8 h-8 text-white" />
            </div>
          )}
          {/* Ripple ring */}
          {!logoUrl && <span className="absolute inset-0 rounded-2xl bg-brand-500 opacity-30 animate-ping" />}
        </div>

        {/* Brand */}
        <div className="text-center">
          <p className={`text-base font-bold text-white`}>{brand || 'CarbonTrack'}</p>
          <p className={`text-xs mt-0.5 ${text}`}>{label}</p>
        </div>

        {/* Bouncing dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${dot}`}
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
