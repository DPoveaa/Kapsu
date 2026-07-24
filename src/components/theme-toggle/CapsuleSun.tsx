import React from 'react'

interface CapsuleSunProps {
  className?: string
}

export const CapsuleSun: React.FC<CapsuleSunProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 60 60"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
          </radialGradient>

          <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Halo de Brilho Externo */}
        <circle cx="30" cy="30" r="26" fill="url(#sunGlow)" opacity="0.35" className="animate-pulse-subtle" />

        {/* Raios Giratórios */}
        <g className="animate-sun-spin" transform-origin="30 30">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
            <line
              key={index}
              x1="30"
              y1="10"
              x2="30"
              y2="5"
              stroke="url(#rayGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${angle} 30 30)`}
            />
          ))}
        </g>

        {/* Núcleo do Sol */}
        <circle cx="30" cy="30" r="12" fill="url(#sunGlow)" />
        <circle cx="27" cy="27" r="3" fill="#FFFFFF" opacity="0.6" />
      </svg>
    </div>
  )
}

export default CapsuleSun
