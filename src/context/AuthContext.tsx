import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { isAdminEmail } from '../config/env'

interface User {
  email: string
  name: string
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, name: string) => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Verificar se há usuário salvo no localStorage ao carregar
  useEffect(() => {
    const savedUser = localStorage.getItem('sanare_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error('Erro ao carregar usuário do localStorage:', error)
        localStorage.removeItem('sanare_user')
      }
    }
  }, [])

  const login = (email: string, name: string) => {
    const newUser: User = {
      email,
      name,
      isAdmin: isAdminEmail(email)
    }
    setUser(newUser)
    localStorage.setItem('sanare_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('sanare_user')
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || false
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

