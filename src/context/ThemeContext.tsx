import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Função para obter o tema inicial
  const getInitialTheme = (): Theme => {
    // Verifica se há tema salvo no localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme
      }
      // Verifica a preferência do sistema
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'light'
  }

  // Carrega o tema do localStorage ou usa a preferência do sistema
  const [theme, setTheme] = useState<Theme>(() => {
    const initialTheme = getInitialTheme()
    // Aplica o tema imediatamente na inicialização
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      const body = document.body
      if (initialTheme === 'dark') {
        root.classList.add('dark')
        body.classList.add('dark')
        root.style.colorScheme = 'dark'
      } else {
        root.classList.remove('dark')
        body.classList.remove('dark')
        root.style.colorScheme = 'light'
      }
    }
    return initialTheme
  })

  // Função auxiliar para aplicar o tema ao DOM
  const applyTheme = (themeToApply: Theme) => {
    const root = document.documentElement
    const body = document.body
    
    if (themeToApply === 'dark') {
      root.classList.add('dark')
      body.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      body.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }

  // Aplica o tema ao documento sempre que mudar
  useEffect(() => {
    applyTheme(theme)
    // Salva no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => {
      return prevTheme === 'light' ? 'dark' : 'light'
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

