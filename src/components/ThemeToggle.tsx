import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  const handleToggle = () => {
    toggleTheme()
  }

  return (
    <button
      onClick={handleToggle}
      type="button"
      className={`
        p-2 rounded-lg transition-colors duration-200 border
        ${theme === 'dark' 
          ? 'bg-[#0F828C] hover:bg-[#78B9B5] text-white border-[#0F828C]' 
          : 'bg-white hover:bg-primary-50 text-gray-700 border-gray-200'
        }
      `}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? (
        <Moon size={20} />
      ) : (
        <Sun size={20} />
      )}
    </button>
  )
}

export default ThemeToggle

