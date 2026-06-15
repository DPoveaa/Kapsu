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
        throw new Error(data.message || 'Erro ao fazer login')
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
  }): Promise<AuthResponse> {
    try {
      const token = localStorage.getItem('sanare_token')
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
      const token = localStorage.getItem('sanare_token')
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
}

export const authService = new AuthService()

