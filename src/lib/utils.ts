import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Custom theme utilities tailwind-merge can't infer (otherwise bg-forest-grain would override bg-forest-900)
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-image': ['bg-forest-grain'],
      shadow: ['shadow-soft', 'shadow-lifted', 'shadow-gold'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Emission totals are stored in kgCO2e. */
export function fmtCO2(kg: number) {
  if (kg >= 1_000_000) return { value: (kg / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }), unit: 'ktCO₂e' }
  if (kg >= 1_000)     return { value: (kg / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }), unit: 'tCO₂e' }
  return { value: kg.toLocaleString('fr-FR', { maximumFractionDigits: 0 }), unit: 'kgCO₂e' }
}

export function fmtCO2Text(kg: number) {
  const { value, unit } = fmtCO2(kg)
  return `${value} ${unit}`
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
