import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { isAdminEmail } from '../config/env'
import { authService } from '../services/auth.service'
import { cartService } from '../services/cart.service'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  profile_image?: string
  cpf?: string
  isAdmin: boolean
  role?: 'user' | 'admin' | 'pharmacist'
  whatsapp_notifications_enabled?: boolean
  email_notifications_enabled?: boolean
  order_status_notifications_enabled?: boolean
  promotions_notifications_enabled?: boolean
  whatsapp_order_confirmation_enabled?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
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
          // Tenta restaurar o usuário do localStorage primeiro (mais rápido)
          const parsedUser = JSON.parse(savedUser)
          setUser(parsedUser)
          
          // Depois verifica se o token ainda é válido (sem bloquear a UI)
          try {
            const isValid = await authService.verifyToken(savedToken)
            if (isValid && isValid.user) {
              // Atualiza os dados do usuário com os dados mais recentes do servidor
              const updatedUser: User = {
                id: isValid.user.id,
                email: isValid.user.email,
                name: isValid.user.name,
                phone: isValid.user.phone,
                profile_image: (isValid.user as any).profile_image,
                cpf: (isValid.user as any).cpf,
                role: 'user',
                isAdmin: isAdminEmail(isValid.user.email) || isValid.user.isAdmin || false,
                whatsapp_notifications_enabled: (isValid.user as any).whatsapp_notifications_enabled !== undefined ? Boolean((isValid.user as any).whatsapp_notifications_enabled) : true,
                email_notifications_enabled: (isValid.user as any).email_notifications_enabled !== undefined ? Boolean((isValid.user as any).email_notifications_enabled) : true,
                order_status_notifications_enabled: (isValid.user as any).order_status_notifications_enabled !== undefined ? Boolean((isValid.user as any).order_status_notifications_enabled) : true,
                promotions_notifications_enabled: (isValid.user as any).promotions_notifications_enabled !== undefined ? Boolean((isValid.user as any).promotions_notifications_enabled) : true,
                whatsapp_order_confirmation_enabled: Boolean((isValid.user as any).whatsapp_order_confirmation_enabled)
              }
              setUser(updatedUser)
              localStorage.setItem('sanare_user', JSON.stringify(updatedUser))
            } else if (isValid && !isValid.success && !isValid.isNetworkError) {
              // Token inválido confirmado pelo servidor (não é erro de rede), limpar dados
              console.log('Token inválido confirmado pelo servidor')
              localStorage.removeItem('sanare_user')
              localStorage.removeItem('sanare_token')
              setUser(null)
            }
            // Se for erro de rede (isNetworkError === true), mantém o usuário logado
            // O token pode ainda ser válido, só não conseguimos verificar agora
          } catch (verifyError) {
            // Erro ao verificar token (pode ser rede), mas mantém o usuário logado
            // O token pode ainda ser válido, só não conseguimos verificar agora
            console.warn('Erro ao verificar token (mantendo sessão):', verifyError)
            // Não limpa o token em caso de erro de rede
          }
        } catch (error) {
          // Erro ao fazer parse do usuário salvo, limpar dados corrompidos
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

  // Verificar periodicamente se o token ainda é válido (a cada 15 minutos)
  useEffect(() => {
    const savedToken = localStorage.getItem('sanare_token')
    if (!savedToken || !user) return

    let consecutiveFailures = 0
    const maxFailures = 5 // Só desconecta após 5 falhas consecutivas (mais tolerante)

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
            profile_image: (isValid.user as any).profile_image,
            role: 'user',
            isAdmin: isAdminEmail(isValid.user.email) || isValid.user.isAdmin || false,
            whatsapp_notifications_enabled: (isValid.user as any).whatsapp_notifications_enabled !== undefined ? Boolean((isValid.user as any).whatsapp_notifications_enabled) : true,
            email_notifications_enabled: (isValid.user as any).email_notifications_enabled !== undefined ? Boolean((isValid.user as any).email_notifications_enabled) : true,
            order_status_notifications_enabled: (isValid.user as any).order_status_notifications_enabled !== undefined ? Boolean((isValid.user as any).order_status_notifications_enabled) : true,
            promotions_notifications_enabled: (isValid.user as any).promotions_notifications_enabled !== undefined ? Boolean((isValid.user as any).promotions_notifications_enabled) : true,
            whatsapp_order_confirmation_enabled: Boolean((isValid.user as any).whatsapp_order_confirmation_enabled)
          }
          setUser(updatedUser)
          localStorage.setItem('sanare_user', JSON.stringify(updatedUser))
        } else if (isValid && !isValid.success && !isValid.isNetworkError) {
          // Token inválido confirmado pelo servidor (não é erro de rede)
          consecutiveFailures++
          console.warn('Token inválido confirmado pelo servidor (tentativa', consecutiveFailures, ')')
          if (consecutiveFailures >= maxFailures) {
            console.log('Token inválido após múltiplas confirmações, fazendo logout...')
            setUser(null)
            localStorage.removeItem('sanare_user')
            localStorage.removeItem('sanare_token')
          }
        } else if (isValid && isValid.isNetworkError) {
          // Erro de rede - NÃO incrementa contador de falhas
          // Mantém o usuário logado pois pode ser problema temporário
          console.warn('Erro de rede ao verificar token (mantendo sessão)')
          consecutiveFailures = 0 // Reset pois não é falha do token
        }
      } catch (error) {
        // Erro de rede ou conexão - NÃO incrementa contador de falhas
        // Mantém o usuário logado pois pode ser problema temporário
        console.warn('Erro de rede ao verificar token (mantendo sessão):', error)
        // Não desconecta em caso de erro de rede
      }
    }

    // Verifica a cada 15 minutos (reduzido de 10 para menos requisições)
    const interval = setInterval(verifyTokenPeriodically, 15 * 60 * 1000)

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
        profile_image: (response.user as any).profile_image,
        cpf: (response.user as any).cpf,
        role: 'user',
        isAdmin: isAdminEmail(response.user.email) || response.user.isAdmin || false,
        whatsapp_notifications_enabled: response.user.whatsapp_notifications_enabled !== undefined ? Boolean(response.user.whatsapp_notifications_enabled) : true,
        email_notifications_enabled: response.user.email_notifications_enabled !== undefined ? Boolean(response.user.email_notifications_enabled) : true,
        order_status_notifications_enabled: response.user.order_status_notifications_enabled !== undefined ? Boolean(response.user.order_status_notifications_enabled) : true,
        promotions_notifications_enabled: response.user.promotions_notifications_enabled !== undefined ? Boolean(response.user.promotions_notifications_enabled) : true,
        whatsapp_order_confirmation_enabled: Boolean(response.user.whatsapp_order_confirmation_enabled)
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

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('sanare_user', JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateUser,
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

