import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useState } from 'react'

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = () => {
    setIsAnimating(true)
    toggleTheme()
    // Remove a classe de animação após a transição
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  return (
    <button
      onClick={handleToggle}
      type="button"
      className={`
        p-2 rounded-lg transition-all duration-300 border relative overflow-hidden
        ${theme === 'dark' 
          ? 'bg-[#0F828C] hover:bg-[#78B9B5] text-white border-[#0F828C]' 
          : 'bg-white hover:bg-primary-50 text-gray-700 border-gray-200'
        }
        ${isAnimating ? 'scale-90' : 'scale-100'}
        transform-gpu
      `}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            transition-all duration-300 ease-in-out transform
            ${theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-0'
            }
          `}
        >
          <Moon size={20} />
        </div>
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            transition-all duration-300 ease-in-out transform
            ${theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
            }
          `}
        >
          <Sun size={20} />
        </div>
      </div>
    </button>
  )
}

export default ThemeToggle

