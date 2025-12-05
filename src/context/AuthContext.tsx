import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { isAdminEmail } from '../config/env'
import { authService } from '../services/auth.service'
import { cartService } from '../services/cart.service'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  isAdmin: boolean
  role?: 'user' | 'admin' | 'pharmacist'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isPharmacist: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Verificar se há usuário salvo no localStorage ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('sanare_user')
      const savedToken = localStorage.getItem('sanare_token')

      if (savedUser && savedToken) {
        try {
          const parsedUser = JSON.parse(savedUser)
          // Verificar se o token ainda é válido
          const isValid = await authService.verifyToken(savedToken)
          if (isValid && isValid.user) {
            // Atualiza os dados do usuário com os dados mais recentes do servidor
            const updatedUser: User = {
              id: isValid.user.id,
              email: isValid.user.email,
              name: isValid.user.name,
              phone: isValid.user.phone,
              role: isValid.user.role || 'user',
              isAdmin: isAdminEmail(isValid.user.email) || isValid.user.isAdmin || isValid.user.role === 'admin' || false
            }
            setUser(updatedUser)
            localStorage.setItem('sanare_user', JSON.stringify(updatedUser))
          } else {
            // Token inválido, limpar dados
            localStorage.removeItem('sanare_user')
            localStorage.removeItem('sanare_token')
            setUser(null)
          }
        } catch (error) {
          console.error('Erro ao carregar usuário:', error)
          localStorage.removeItem('sanare_user')
          localStorage.removeItem('sanare_token')
          setUser(null)
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Verificar periodicamente se o token ainda é válido (a cada 10 minutos)
  useEffect(() => {
    const savedToken = localStorage.getItem('sanare_token')
    if (!savedToken || !user) return

    let consecutiveFailures = 0
    const maxFailures = 3 // Só desconecta após 3 falhas consecutivas

    const verifyTokenPeriodically = async () => {
      try {
        const isValid = await authService.verifyToken(savedToken)
        if (isValid && isValid.user) {
          // Token ainda válido, atualiza dados do usuário
          consecutiveFailures = 0 // Reset contador de falhas
          const updatedUser: User = {
            id: isValid.user.id,
            email: isValid.user.email,
            name: isValid.user.name,
            phone: isValid.user.phone,
            role: isValid.user.role || 'user',
            isAdmin: isAdminEmail(isValid.user.email) || isValid.user.isAdmin || isValid.user.role === 'admin' || false
          }
          setUser(updatedUser)
          localStorage.setItem('sanare_user', JSON.stringify(updatedUser))
        } else {
          // Token expirado ou inválido
          consecutiveFailures++
          if (consecutiveFailures >= maxFailures) {
            console.log('Token expirado após múltiplas tentativas, fazendo logout...')
            setUser(null)
            localStorage.removeItem('sanare_user')
            localStorage.removeItem('sanare_token')
          }
        }
      } catch (error) {
        // Se houver erro na verificação, incrementa contador mas não desconecta imediatamente
        // Pode ser um problema de rede temporário
        consecutiveFailures++
        console.error('Erro ao verificar token (tentativa', consecutiveFailures, '):', error)
        
        // Só desconecta se houver múltiplas falhas consecutivas
        if (consecutiveFailures >= maxFailures) {
          console.log('Múltiplas falhas na verificação do token, fazendo logout...')
          setUser(null)
          localStorage.removeItem('sanare_user')
          localStorage.removeItem('sanare_token')
        }
      }
    }

    // Verifica a cada 10 minutos (aumentado de 5 para 10 para reduzir requisições)
    const interval = setInterval(verifyTokenPeriodically, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user])

  const login = async (email: string, password: string): Promise<void> => {
    const response = await authService.login(email, password)
    
    if (response.success && response.user && response.token) {
      const newUser: User = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        phone: response.user.phone,
        role: response.user.role || 'user',
        isAdmin: isAdminEmail(response.user.email) || response.user.isAdmin || response.user.role === 'admin' || false
      }
      
      setUser(newUser)
      localStorage.setItem('sanare_user', JSON.stringify(newUser))
      localStorage.setItem('sanare_token', response.token)

      // Tenta vincular o carrinho do WhatsApp pendente (se houver)
      setTimeout(async () => {
        try {
          const linked = await cartService.linkPendingToken()
          if (linked) {
            console.log('✅ Carrinho do WhatsApp vinculado automaticamente após login!')
          }
        } catch (error) {
          console.error('Erro ao vincular carrinho pendente:', error)
        }
      }, 500) // Pequeno delay para garantir que o token foi salvo
    } else {
      throw new Error(response.message || 'Erro ao fazer login')
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('sanare_user')
    localStorage.removeItem('sanare_token')
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || user?.role === 'admin' || false,
      isPharmacist: user?.role === 'pharmacist' || false,
      loading
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

