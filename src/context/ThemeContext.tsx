import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: (transitionDurationMs?: number) => void
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
  const transitionTimerRef = useRef<number | null>(null)
  const nativeControlsTimerRef = useRef<number | null>(null)

  // Função para obter o tema inicial
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'light'
  }

  const [theme, setTheme] = useState<Theme>(() => {
    const initialTheme = getInitialTheme()
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

  // Aplicação de transição gradual e suave das cores do site sem qualquer piscada amarela.
  // A duração é controlada pelo evento kapsu-theme-transition-duration (disparado pelo KapsuOrbitalPortal
  // no momento exato da troca de tema), sincronizando o fim da transição com o fechamento da cápsula.
  const applyTheme = (themeToApply: Theme, transitionDurationMs = 1900) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const body = document.body

    // Aplica duração dinâmica via CSS custom property
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
    }
    if (nativeControlsTimerRef.current !== null) {
      window.clearTimeout(nativeControlsTimerRef.current)
    }

    root.style.setProperty('--kapsu-theme-transition-duration', `${transitionDurationMs}ms`)
    root.classList.add('theme-transitioning')

    // Registra as cores iniciais antes de aplicar o destino. Sem esta leitura,
    // as duas classes podem cair no mesmo frame e a mudança parece instantânea.
    // Resolve apenas estilos; ler offsetWidth forçava o layout completo da página.
    void window.getComputedStyle(root).transitionProperty

    if (themeToApply === 'dark') {
      root.classList.add('dark')
      body.classList.add('dark')
    } else {
      root.classList.remove('dark')
      body.classList.remove('dark')
    }

    // Scrollbars, checkboxes e controles nativos não interpolam color-scheme.
    // A troca discreta acontece no meio do blend, quando fica menos perceptível.
    nativeControlsTimerRef.current = window.setTimeout(() => {
      root.style.colorScheme = themeToApply
      nativeControlsTimerRef.current = null
    }, Math.round(transitionDurationMs * 0.4))

    transitionTimerRef.current = window.setTimeout(() => {
      root.style.colorScheme = themeToApply
      root.classList.remove('theme-transitioning')
      root.style.removeProperty('--kapsu-theme-transition-duration')
      transitionTimerRef.current = null
    }, transitionDurationMs)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
    }
    if (nativeControlsTimerRef.current !== null) {
      window.clearTimeout(nativeControlsTimerRef.current)
    }
  }, [])

  const toggleTheme = (transitionDurationMs?: number) => {
    setTheme(prevTheme => {
      const next = prevTheme === 'light' ? 'dark' : 'light'
      // Aplica o tema com a duração dinâmica fornecida pelo KapsuOrbitalPortal
      applyTheme(next, transitionDurationMs ?? 1900)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
