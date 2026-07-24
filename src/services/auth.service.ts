import { env } from '../config/env'

const API_URL = env.apiUrl

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  phone: string
  cpf: string
  termsOfServiceVersion: string
  privacyPolicyVersion: string
}

export interface AuthResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    phone?: string
    profile_image?: string
    isAdmin?: boolean
    whatsapp_notifications_enabled?: boolean
    email_notifications_enabled?: boolean
    order_status_notifications_enabled?: boolean
    promotions_notifications_enabled?: boolean
    whatsapp_order_confirmation_enabled?: boolean
    email_promotions_notifications_enabled?: boolean
    whatsapp_promotions_notifications_enabled?: boolean
    email_order_status_notifications_enabled?: boolean
  }
  token?: string
  message?: string
}

class AuthService {
  private baseUrl = `${API_URL}/auth`

  /**
   * Faz login
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // Verifica se a resposta tem conteúdo antes de fazer parse
      const text = await response.text()
      let data: AuthResponse

      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        const error: any = new Error(data.message || 'Erro ao fazer login')
        if ((data as any).code) {
          error.code = (data as any).code
        }
        throw error
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Registra novo usuário
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      // Verifica se a resposta tem conteúdo antes de fazer parse
      const text = await response.text()
      let data: AuthResponse

      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar conta')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Verifica se o token é válido e retorna os dados do usuário
   */
  async verifyToken(token: string): Promise<{ success: boolean; user?: AuthResponse['user']; isNetworkError?: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        // Resposta vazia - pode ser erro de rede ou servidor
        return { success: false, isNetworkError: true }
      }

      const data = JSON.parse(text)
      
      if (response.ok && data.success && data.user) {
        return {
          success: true,
          user: data.user,
        }
      }

      // Token inválido confirmado pelo servidor (não é erro de rede)
      return { success: false, isNetworkError: false }
    } catch (error) {
      // Erro de rede ou conexão
      return { success: false, isNetworkError: true }
    }
  }

  /**
   * Atualiza o perfil do usuário
   */
  async updateProfile(data: {
    name?: string
    phone?: string
    currentPassword?: string
    newPassword?: string
    whatsapp_notifications_enabled?: boolean
    email_notifications_enabled?: boolean
    order_status_notifications_enabled?: boolean
    promotions_notifications_enabled?: boolean
    whatsapp_order_confirmation_enabled?: boolean
    email_promotions_notifications_enabled?: boolean
    whatsapp_promotions_notifications_enabled?: boolean
    email_order_status_notifications_enabled?: boolean
  }): Promise<AuthResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const result = JSON.parse(text)

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao atualizar perfil')
      }

      return result
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao atualizar perfil')
    }
  }

  /**
   * Atualiza a imagem de perfil do usuário
   */
  async updateProfileImage(profileImage: string): Promise<AuthResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      const requestBody = { profile_image: profileImage }

      const response = await fetch(`${this.baseUrl}/profile-image`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      const text = await response.text()
      
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const result = JSON.parse(text)

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao atualizar imagem de perfil')
      }

      return result
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao atualizar imagem de perfil')
    }
  }

  /**
   * Envia solicitação de recuperação de senha (Forgot Password)
   */
  async forgotPassword(identifier: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      })

      const text = await response.text()
      let result
      try {
        result = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao solicitar recuperação de senha')
      }

      return result
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao solicitar recuperação de senha')
    }
  }

  /**
   * Envia redefinição de senha com o token (Reset Password)
   */
  async validateResetToken(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reset-password/validate?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const text = await response.text()
      let result
      try {
        result = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(result.message || 'Link inválido ou expirado')
      }

      return result
    } catch (error: any) {
        throw new Error(error.message || 'Erro de conexão ao validar link de redefinição')
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password: newPassword }),
      })

      const text = await response.text()
      let result
      try {
        result = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao redefinir senha')
      }

      return result
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao redefinir senha')
    }
  }

  /**
   * Login social
   */
  async socialLogin(provider: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/social/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, token }),
      })

      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        const error: any = new Error(data.message || 'Erro no login social')
        if (data && data.code) {
          error.code = data.code
        }
        throw error
      }

      return data
    } catch (error: any) {
      if (error.code) {
        throw error
      }
      throw new Error(error.message || 'Erro de conexão no login social')
    }
  }

  /**
   * Completa cadastro social
   */
  async socialRegister(
    provider: string,
    token: string,
    phone: string,
    cpf: string,
    name?: string,
    legalAcceptance?: { termsOfServiceVersion: string; privacyPolicyVersion: string }
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/social/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          token,
          phone,
          cpf,
          name,
          ...legalAcceptance,
        }),
      })

      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao concluir cadastro social')
      }

      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao concluir cadastro social')
    }
  }

  /**
   * Vincula conta social
   */
  async linkSocial(provider: string, token: string): Promise<any> {
    try {
      const sessionToken = localStorage.getItem('kapsu_token')
      if (!sessionToken) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(`${this.baseUrl}/social/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ provider, token }),
      })

      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao vincular conta')
      }

      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao vincular conta')
    }
  }

  /**
   * Desvincula conta social
   */
  async unlinkSocial(provider: string): Promise<any> {
    try {
      const sessionToken = localStorage.getItem('kapsu_token')
      if (!sessionToken) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(`${this.baseUrl}/social/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ provider }),
      })

      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao desvincular conta')
      }

      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao desvincular conta')
    }
  }

  /**
   * Obtém provedores vinculados
   */
  async getLinkedProviders(): Promise<any> {
    try {
      const sessionToken = localStorage.getItem('kapsu_token')
      if (!sessionToken) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(`${this.baseUrl}/social/providers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      })

      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter provedores vinculados')
      }

      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao obter provedores vinculados')
    }
  }
}

export const authService = new AuthService()
