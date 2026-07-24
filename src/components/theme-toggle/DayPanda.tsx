import React from 'react'

interface DayPandaProps {
  className?: string
}

export const DayPanda: React.FC<DayPandaProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Sombra suave e gradiente do bambu */}
          <linearGradient id="bambooGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="pandaBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F3F4F6" />
          </linearGradient>
        </defs>

        {/* Grupo Principal com micro animação de felicidade */}
        <g className="animate-panda-idle">
          {/* Orelha Esquerda */}
          <ellipse
            cx="24"
            cy="26"
            rx="13"
            ry="13"
            fill="#111827"
            transform="rotate(-15 24 26)"
          />
          {/* Orelha Direita */}
          <ellipse
            cx="76"
            cy="26"
            rx="13"
            ry="13"
            fill="#111827"
            transform="rotate(15 76 26)"
          />

          {/* Cabeça do Panda */}
          <circle cx="50" cy="46" r="34" fill="url(#pandaBodyGrad)" stroke="#E5E7EB" strokeWidth="1" />

          {/* Mancha do Olho Esquerdo */}
          <ellipse
            cx="35"
            cy="44"
            rx="11"
            ry="13"
            fill="#111827"
            transform="rotate(-12 35 44)"
          />

          {/* Mancha do Olho Direito */}
          <ellipse
            cx="65"
            cy="44"
            rx="11"
            ry="13"
            fill="#111827"
            transform="rotate(12 65 44)"
          />

          {/* Olho Esquerdo + Pupila Brilha */}
          <g className="animate-panda-blink">
            <circle cx="36" cy="44" r="4.5" fill="#FFFFFF" />
            <circle cx="37" cy="43" r="2" fill="#111827" />
            <circle cx="38" cy="42" r="0.8" fill="#FFFFFF" />
          </g>

          {/* Olho Direito + Pupila Brilha */}
          <g className="animate-panda-blink">
            <circle cx="64" cy="44" r="4.5" fill="#FFFFFF" />
            <circle cx="63" cy="43" r="2" fill="#111827" />
            <circle cx="62" cy="42" r="0.8" fill="#FFFFFF" />
          </g>

          {/* Bochechas Rosadas / Verdes Saúde Kapsu */}
          <ellipse cx="28" cy="54" rx="5" ry="3" fill="#A7F3D0" opacity="0.6" />
          <ellipse cx="72" cy="54" rx="5" ry="3" fill="#A7F3D0" opacity="0.6" />

          {/* Nariz Fofinho */}
          <path
            d="M45 52 Q50 49 55 52 Q50 57 45 52 Z"
            fill="#111827"
          />

          {/* Boquinha Feliz Chewing Animation */}
          <path
            d="M45 57 Q50 62 55 57"
            fill="none"
            stroke="#111827"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-panda-chew-mouth"
          />

          {/* Corpo / Cápsula do Panda */}
          <path
            d="M 26 72 C 26 60, 74 60, 74 72 C 74 88, 26 88, 26 72 Z"
            fill="url(#pandaBodyGrad)"
          />

          {/* Detalhe da Cápsula Kapsu na base do peito */}
          <rect
            x="40"
            y="67"
            width="20"
            height="10"
            rx="5"
            fill="#00A86B"
            opacity="0.85"
          />

          {/* Pata segurando o bambu */}
          <ellipse cx="32" cy="68" rx="7" ry="8" fill="#111827" transform="rotate(20 32 68)" />
          <ellipse cx="68" cy="68" rx="7" ry="8" fill="#111827" transform="rotate(-20 68 68)" />

          {/* Ramos de Bambu + Folha com Animação de Comer */}
          <g className="animate-bamboo-chew" transform-origin="45 60">
            {/* Haste do Bambu */}
            <path
              d="M 28 78 Q 40 65 48 57"
              fill="none"
              stroke="url(#bambooGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Folhas de Bambu */}
            <path
              d="M 48 57 Q 56 50 62 54 Q 54 60 48 57 Z"
              fill="url(#bambooGrad)"
            />
            <path
              d="M 44 60 Q 52 57 56 63 Q 48 65 44 60 Z"
              fill="#10B981"
            />
          </g>
        </g>
      </svg>
    </div>
  )
}

export default DayPanda
