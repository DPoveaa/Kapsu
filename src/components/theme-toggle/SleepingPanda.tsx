import React from 'react'

interface SleepingPandaProps {
  className?: string
}

export const SleepingPanda: React.FC<SleepingPandaProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Gradientes do Panda Noturno */}
          <linearGradient id="sleepPandaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F9FAFB" />
            <stop offset="100%" stopColor="#E5E7EB" />
          </linearGradient>

          {/* Gradiente da Bolha de Sono */}
          <radialGradient id="sleepBubbleGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#34D399" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
          </radialGradient>
        </defs>

        {/* Grupo Principal com Animação de Respiração Leve */}
        <g className="animate-panda-breathe">
          {/* Orelha Esquerda */}
          <ellipse
            cx="25"
            cy="29"
            rx="12"
            ry="12"
            fill="#1E293B"
            transform="rotate(-15 25 29)"
          />
          {/* Orelha Direita */}
          <ellipse
            cx="75"
            cy="29"
            rx="12"
            ry="12"
            fill="#1E293B"
            transform="rotate(15 75 29)"
          />

          {/* Cabeça do Panda */}
          <circle cx="50" cy="48" r="33" fill="url(#sleepPandaGrad)" stroke="#CBD5E1" strokeWidth="1" />

          {/* Mancha do Olho Esquerdo */}
          <ellipse
            cx="36"
            cy="46"
            rx="11"
            ry="13"
            fill="#1E293B"
            transform="rotate(-10 36 46)"
          />

          {/* Mancha do Olho Direito */}
          <ellipse
            cx="64"
            cy="46"
            rx="11"
            ry="13"
            fill="#1E293B"
            transform="rotate(10 64 46)"
          />

          {/* Olhos Fechados Dormindo (Arcos ◠ ◠) */}
          <path
            d="M 30 46 Q 36 41 42 46"
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 58 46 Q 64 41 70 46"
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Cílios fofos / Detalhes de sono */}
          <path d="M 36 48 L 36 50" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 64 48 L 64 50" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" />

          {/* Bochechas Calmas */}
          <ellipse cx="28" cy="54" rx="4" ry="2.5" fill="#6EE7B7" opacity="0.45" />
          <ellipse cx="72" cy="54" rx="4" ry="2.5" fill="#6EE7B7" opacity="0.45" />

          {/* Nariz */}
          <path
            d="M46 53 Q50 50 54 53 Q50 57 46 53 Z"
            fill="#1E293B"
          />

          {/* Boquinha Tranquila */}
          <path
            d="M47 58 Q50 60 53 58"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Corpo Curvado em Repouso */}
          <path
            d="M 26 73 C 26 62, 74 62, 74 73 C 74 88, 26 88, 26 73 Z"
            fill="url(#sleepPandaGrad)"
          />

          {/* Detalhe da Cápsula Kapsu Noturna */}
          <rect
            x="40"
            y="68"
            width="20"
            height="9"
            rx="4.5"
            fill="#00C878"
            opacity="0.8"
          />

          {/* Patinhas Cruzadas Dormindo */}
          <ellipse cx="36" cy="71" rx="8" ry="6" fill="#1E293B" transform="rotate(15 36 71)" />
          <ellipse cx="64" cy="71" rx="8" ry="6" fill="#1E293B" transform="rotate(-15 64 71)" />

          {/* Bolha de Sono Saindo do Nariz (Infla e Defla) */}
          <g className="animate-sleep-bubble" transform-origin="54 54">
            <circle
              cx="58"
              cy="50"
              r="7.5"
              fill="url(#sleepBubbleGrad)"
              stroke="#A7F3D0"
              strokeWidth="0.8"
            />
            {/* Brilho da Bolha */}
            <circle cx="56" cy="48" r="2" fill="#FFFFFF" opacity="0.75" />
          </g>

          {/* Letras Z flutuando e sumindo */}
          <g className="animate-z-float-1" transform-origin="65 35">
            <text x="66" y="32" fill="#6EE7B7" fontSize="11" fontWeight="bold" fontFamily="sans-serif" opacity="0.9">Z</text>
          </g>
          <g className="animate-z-float-2" transform-origin="75 22">
            <text x="76" y="20" fill="#34D399" fontSize="8" fontWeight="bold" fontFamily="sans-serif" opacity="0.7">z</text>
          </g>
        </g>
      </svg>
    </div>
  )
}

export default SleepingPanda
