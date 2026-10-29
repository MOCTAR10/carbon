'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  certNumber: string
  size?: number
  showLabel?: boolean
}

export default function QRCodeImage({ certNumber, size = 64, showLabel = true }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = `${window.location.origin}/verify/${certNumber}`
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 1,
      color: { dark: '#059669', light: '#FFFFFF' },
    })
      .then(setDataUrl)
      .catch(console.error)
  }, [certNumber, size])

  if (!dataUrl) {
    return (
      <div className="bg-white rounded-xl animate-pulse flex items-center justify-center border border-gray-100"
           style={{ width: size + 16, height: size + 16 }}>
        <span className="text-[10px] text-gray-300">QR</span>
      </div>
    )
  }

  return (
    <a
      href={`/verify/${certNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col items-center gap-1 p-1.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200"
      title="Scanner pour vérifier le certificat"
    >
      <img
        src={dataUrl}
        alt={`QR code certificat ${certNumber}`}
        width={size}
        height={size}
        className="rounded-lg"
      />
      {showLabel && (
        <span className="text-[9px] text-gray-400 group-hover:text-emerald-600 font-semibold transition-colors whitespace-nowrap tracking-wide">
          VÉRIFIER
        </span>
      )}
    </a>
  )
}
