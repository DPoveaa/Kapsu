import React from 'react'

interface CapsuleMoonProps {
  className?: string
}

export const CapsuleMoon: React.FC<CapsuleMoonProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 60 60"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#34D399" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="moonBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#A7F3D0" />
          </linearGradient>
        </defs>

        {/* Aura da Lua */}
        <circle cx="30" cy="30" r="24" fill="url(#moonGlow)" opacity="0.4" />

        {/* Lua Crescente Flutuando */}
        <g className="animate-moon-float" transform-origin="30 30">
          <path
            d="M 38 12 C 24 12 14 22 14 36 C 14 48 24 54 36 54 C 28 50 24 40 25 31 C 26 21 32 15 38 12 Z"
            fill="url(#moonBody)"
            stroke="#6EE7B7"
            strokeWidth="0.8"
          />

          {/* Micro Crateras Fofas */}
          <circle cx="25" cy="28" r="2.2" fill="#94A3B8" opacity="0.4" />
          <circle cx="28" cy="38" r="1.5" fill="#94A3B8" opacity="0.3" />
          <circle cx="32" cy="45" r="1.8" fill="#94A3B8" opacity="0.35" />

          {/* Brilho da Ponta */}
          <circle cx="37" cy="14" r="1.2" fill="#FFFFFF" opacity="0.8" />
        </g>
      </svg>
    </div>
  )
}

export default CapsuleMoon
