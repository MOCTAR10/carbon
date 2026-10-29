export function AirtelMoneyLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Airtel Money logo - red circle with wave */}
      <circle cx="24" cy="24" r="24" fill="#ED1C24" />
      <path
        d="M12 32C14.5 26 18.5 20.5 24 17C29.5 13.5 35 13 38 13.5"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="38" cy="13.5" r="3" fill="white" />
      <text x="9" y="42" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">
        Airtel Money
      </text>
    </svg>
  )
}

export function AirtelMoneyLogoWide({ className = 'h-10' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full aspect-square">
        <circle cx="20" cy="20" r="20" fill="#ED1C24" />
        <path
          d="M10 27C12 22 15.5 17.5 20 15C24.5 12.5 29 12 31.5 12.5"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="31.5" cy="12.5" r="2.5" fill="white" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-red-600 tracking-tight">airtel</span>
        <span className="text-xs font-semibold text-red-500 -mt-0.5">money</span>
      </div>
    </div>
  )
}

export function VisaLogo({ className = 'w-12 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="50" rx="6" fill="#1A1F71" />
      <text x="40" y="32" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial, sans-serif" fontStyle="italic">
        VISA
      </text>
      <rect x="0" y="0" width="80" height="5" fill="#F7B600" />
      <rect x="0" y="45" width="80" height="5" fill="#F7B600" />
    </svg>
  )
}

export function VisaLogoCompact({ className = 'h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="38" rx="4" fill="#1A1F71" />
      <text x="30" y="25" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif" fontStyle="italic">
        VISA
      </text>
      <rect x="0" y="0" width="60" height="3.5" rx="4" fill="#F7B600" />
      <rect x="0" y="34.5" width="60" height="3.5" rx="4" fill="#F7B600" />
    </svg>
  )
}
