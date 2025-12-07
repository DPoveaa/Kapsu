import { env } from '../config/env'

const API_URL = env.apiUrl

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  cpf: string | null
  address: string | null
  role: 'user' | 'admin' | 'pharmacist'
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserDetails extends User {
  statistics: {
    totalOrders: number
    totalSpent: number
    lastOrder: {
      id: string
      total: number
      status: string
      created_at: string
    } | null
  }
}

export interface UsersListResponse {
  success: boolean
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface StatisticsResponse {
  success: boolean
  statistics: {
    totalUsers: number
    totalAdmins: number
    totalPharmacists: number
    recentUsers: User[]
  }
}

class AdminService {
  private baseUrl = `${API_URL}/admin`

  /**
   * Lista todos os usuários
   */
  async listUsers(page: number = 1, limit: number = 50, search: string = ''): Promise<UsersListResponse> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`${this.baseUrl}/users?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao listar usuários')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao listar usuários')
    }
  }

  /**
   * Obtém detalhes de um usuário
   */
  async getUserDetails(userId: string): Promise<{ success: boolean; user: UserDetails }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter detalhes do usuário')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter detalhes do usuário')
    }
  }

  /**
   * Atualiza o role de um usuário
   */
  async updateUserRole(userId: string, role: 'user' | 'admin' | 'pharmacist'): Promise<{ success: boolean; message: string; user: User }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar role do usuário')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao atualizar role do usuário')
    }
  }

  /**
   * Obtém estatísticas gerais
   */
  async getStatistics(): Promise<StatisticsResponse> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/statistics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter estatísticas')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas')
    }
  }

  /**
   * Lista todos os pedidos (apenas admin)
   */
  async listOrders(): Promise<{ success: boolean; data: any[] }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao listar pedidos')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao listar pedidos')
    }
  }

  /**
   * Obtém estatísticas de acesso ao site
   */
  async getSiteAccessStats(params?: {
    startDate?: string
    endDate?: string
    groupBy?: 'hour' | 'day' | 'week' | 'month'
  }): Promise<{
    success: boolean
    statistics: {
      totalAccesses: number
      uniqueVisitors: number
      uniqueIPs: number
      uniqueAuthenticatedUsers: number
    }
    chartData: Array<{
      date: string
      total: number
      unique: number
    }>
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)
      if (params?.groupBy) queryParams.append('groupBy', params.groupBy)

      const response = await fetch(`${this.baseUrl}/site-access-stats?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter estatísticas de acesso')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de acesso')
    }
  }

  /**
   * Obtém analytics detalhados de comportamento dos usuários
   */
  async getBehaviorAnalytics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{
    success: boolean
    analytics: {
      topPages: Array<{ path: string; views: number; avgTime: number; bounceRate: number }>
      avgSessionDuration: number
      bounceRate: number
      totalSessions: number
      bouncedSessions: number
      topEntryPages: Array<{ path: string; count: number }>
      topExitPages: Array<{ path: string; count: number }>
      eventCounts: Record<string, number>
      timeDistribution: Array<{ range: string; count: number }>
      funnelData: Array<{ path: string; views: number }>
    }
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const response = await fetch(`${this.baseUrl}/behavior-analytics?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter analytics de comportamento')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter analytics de comportamento')
    }
  }
}

export const adminService = new AdminService()


