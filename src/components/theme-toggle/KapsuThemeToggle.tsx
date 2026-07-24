import React, { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import DayPanda from './DayPanda'
import SleepingPanda from './SleepingPanda'
import CapsuleSun from './CapsuleSun'
import CapsuleMoon from './CapsuleMoon'
import ThemeParticles from './ThemeParticles'

export interface KapsuThemeToggleProps {
  /** Modos opcionalmente controlados externamente */
  theme?: 'light' | 'dark'
  /** Handler callback opcional para alternar o tema */
  onToggle?: () => void
  /** Classes CSS adicionais */
  className?: string
  /** Tamanho compacto para telas menores ou headers reduzidos */
  compact?: boolean
}

export const KapsuThemeToggle: React.FC<KapsuThemeToggleProps> = ({
  theme: controlledTheme,
  onToggle: controlledOnToggle,
  className = '',
  compact = false,
}) => {
  // Hook global de contexto de tema do Kapsu
  let contextTheme: 'light' | 'dark' = 'light'
  let contextToggleTheme: () => void = () => {}

  try {
    const themeContext = useTheme()
    contextTheme = themeContext.theme
    contextToggleTheme = themeContext.toggleTheme
  } catch {
    // Permite uso como componente isolado fora do ThemeProvider se necessário
  }

  // Determina se o tema é o fornecido externamente ou pelo contexto
  const currentTheme = controlledTheme ?? contextTheme
  const handleToggle = controlledOnToggle ?? contextToggleTheme

  const isDark = currentTheme === 'dark'
  const [isPressed, setIsPressed] = useState(false)

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      aria-label={isDark ? 'Ativar modo claro (Panda acordado)' : 'Ativar modo escuro (Panda dormindo)'}
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={isDark}
      className={`
        group relative inline-flex items-center select-none overflow-hidden rounded-full
        border transition-all duration-500 ease-in-out cursor-pointer transform-gpu
        focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
        ${compact 
          ? 'w-[78px] h-[36px] p-[2px]' 
          : 'w-[82px] sm:w-[100px] h-[38px] sm:h-[44px] p-[3px]'
        }
        ${isDark
          ? 'bg-gradient-to-r from-[#0B132B] via-[#0F172A] to-[#1E3A8A] border-[#1E293B] hover:border-emerald-500/40 shadow-inner'
          : 'bg-gradient-to-r from-[#FFFFFF] via-[#E8FFF4] to-[#00A86B] border-emerald-200/80 hover:border-emerald-400 shadow-sm'
        }
        ${isPressed ? 'scale-95' : 'scale-100 hover:-translate-y-0.5'}
        ${isDark ? 'hover:shadow-[0_0_16px_rgba(0,200,120,0.25)]' : 'hover:shadow-[0_4px_16px_rgba(0,168,107,0.25)]'}
        ${className}
      `}
    >
      {/* Halo de luz ambiente interno da cápsula Kapsu */}
      <div
        className={`
          absolute inset-0 rounded-full transition-opacity duration-700 pointer-events-none
          ${isDark 
            ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent opacity-100' 
            : 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-transparent opacity-100'
          }
        `}
      />

      {/* Partículas flutuantes (folhas no dia, estrelas à noite) */}
      <ThemeParticles isDark={isDark} />

      {/* Elemento de fundo: SOL (Modo Dia) */}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 transition-all duration-600 ease-in-out pointer-events-none transform-gpu
          ${compact ? 'right-2.5 w-5 h-5' : 'right-3 sm:right-3.5 w-6 sm:w-7 h-6 sm:h-7'}
          ${isDark 
            ? 'opacity-0 scale-50 translate-x-4 rotate-45' 
            : 'opacity-100 scale-100 translate-x-0 rotate-0'
          }
        `}
      >
        <CapsuleSun />
      </div>

      {/* Elemento de fundo: LUA (Modo Noite) */}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 transition-all duration-600 ease-in-out pointer-events-none transform-gpu
          ${compact ? 'left-2.5 w-5 h-5' : 'left-3 sm:left-3.5 w-6 sm:w-7 h-6 sm:h-7'}
          ${isDark 
            ? 'opacity-100 scale-100 translate-x-0 rotate-0' 
            : 'opacity-0 scale-50 -translate-x-4 -rotate-45'
          }
        `}
      >
        <CapsuleMoon />
      </div>

      {/* Botão deslizante (Knob) contendo o Mascote Panda em Forma de Cápsula */}
      <div
        className={`
          relative z-10 rounded-full bg-white shadow-md flex items-center justify-center
          transition-transform duration-600 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu
          border border-emerald-100/60 dark:border-gray-700
          ${compact 
            ? 'w-[30px] h-[30px]' 
            : 'w-[32px] sm:w-[38px] h-[32px] sm:h-[38px]'
          }
          ${isDark
            ? compact ? 'translate-x-[42px]' : 'translate-x-[44px] sm:translate-x-[56px]'
            : 'translate-x-0'
          }
        `}
      >
        {/* Panda do Dia (Comendo Bambu) */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center transition-all duration-500 transform-gpu
            ${isDark 
              ? 'opacity-0 scale-75 rotate-12 pointer-events-none' 
              : 'opacity-100 scale-100 rotate-0'
            }
          `}
        >
          <DayPanda className="w-full h-full p-[2px]" />
        </div>

        {/* Panda da Noite (Dormindo com Bolha de Sono) */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center transition-all duration-500 transform-gpu
            ${isDark 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-75 -rotate-12 pointer-events-none'
            }
          `}
        >
          <SleepingPanda className="w-full h-full p-[2px]" />
        </div>
      </div>
    </button>
  )
}

export default KapsuThemeToggle
