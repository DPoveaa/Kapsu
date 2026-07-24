import React from 'react'

interface ThemeParticlesProps {
  isDark: boolean
}

export const ThemeParticles: React.FC<ThemeParticlesProps> = ({ isDark }) => {
  if (isDark) {
    // Modo Noite: Estrelas cintilantes e poeira estelar
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
        {/* Estrela 1 */}
        <div className="absolute top-2 left-3 w-1.5 h-1.5 text-emerald-200 animate-star-twinkle-1">
          <svg viewBox="0 0 10 10" className="w-full h-full fill-current">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
          </svg>
        </div>
        {/* Estrela 2 */}
        <div className="absolute top-5 left-7 w-1 h-1 bg-teal-200 rounded-full animate-star-twinkle-2 opacity-80" />
        {/* Estrela 3 */}
        <div className="absolute bottom-2 left-4 w-1.5 h-1.5 text-teal-300 animate-star-twinkle-3">
          <svg viewBox="0 0 10 10" className="w-full h-full fill-current">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
          </svg>
        </div>
        {/* Ponto de Brilho Estelar */}
        <div className="absolute top-3 right-8 w-1 h-1 bg-white rounded-full animate-pulse-subtle opacity-70" />
      </div>
    )
  }

  // Modo Dia: Partículas de folhas e luz suave
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
      {/* Folhinha 1 */}
      <div className="absolute top-2 right-4 w-2 h-2 text-emerald-500 animate-leaf-float-1 opacity-70">
        <svg viewBox="0 0 12 12" className="w-full h-full fill-current">
          <path d="M 1 11 Q 6 1 11 1 Q 11 6 1 11 Z" />
        </svg>
      </div>
      {/* Folhinha 2 */}
      <div className="absolute bottom-2 right-8 w-1.5 h-1.5 text-emerald-400 animate-leaf-float-2 opacity-60">
        <svg viewBox="0 0 12 12" className="w-full h-full fill-current">
          <path d="M 1 11 Q 6 1 11 1 Q 11 6 1 11 Z" />
        </svg>
      </div>
      {/* Raio de Sol Suave */}
      <div className="absolute top-1 right-12 w-1 h-1 bg-amber-300 rounded-full animate-pulse-subtle opacity-80" />
    </div>
  )
}

export default ThemeParticles
