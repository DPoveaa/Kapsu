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
   * Obtém estatísticas detalhadas de Atendimento Humano no WhatsApp
   */
  async getWhatsAppHumanSupportStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl}/whatsapp/human-support/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de atendimento humano')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de atendimento humano')
    }
  }

  /**
   * Obtém estatísticas detalhadas de Chat Interno (Frontend)
   */
  async getChatStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl}/chat/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de chat')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de chat')
    }
  }

  /**
   * Obtém estatísticas detalhadas de WhatsApp
   */
  async getWhatsAppStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl}/whatsapp/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de WhatsApp')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de WhatsApp')
    }
  }

  /**
   * Obtém estatísticas detalhadas de produtos
   */
  async getProductsStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl}/products/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de produtos')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de produtos')
    }
  }

  /**
   * Obtém estatísticas detalhadas de usuários/clientes
   */
  async getUsersStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl}/users/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de usuários')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de usuários')
    }
  }

  /**
   * Obtém estatísticas detalhadas de promoções
   */
  async getPromotionsStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl.replace('/admin', '')}/promotions/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin.service.ts:462',message:'API response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const error = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin.service.ts:470',message:'API error response',data:{errorMessage:error.message,error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        throw new Error(error.message || 'Erro ao buscar estatísticas de promoções')
      }

      const result = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin.service.ts:474',message:'API result parsed',data:{hasSuccess:!!result.success,hasData:!!result.data,dataKeys:result.data?Object.keys(result.data):'no data',dataType:typeof result.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return result
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de promoções')
    }
  }

  /**
   * Obtém estatísticas detalhadas de cupons promocionais
   */
  async getPromoCodesStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl.replace('/admin', '')}/promo-codes/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de cupons')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de cupons')
    }
  }

  /**
   * Obtém estatísticas detalhadas de frete
   */
  async getShippingStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${API_URL}/shipping/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de frete')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de frete')
    }
  }

  /**
   * Obtém estatísticas detalhadas de pedidos
   */
  async getOrdersStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const url = `${this.baseUrl}/orders/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar estatísticas de pedidos')
      }

      return await response.json()
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter estatísticas de pedidos')
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

  /**
   * Cria um pedido manualmente (apenas admin)
   */
  async createOrder(orderData: {
    userId: string
    items: Array<{ productId: string; quantity: number }>
    paymentMethod?: string
    shippingAddress?: string
    status?: string
  }): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pedido')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao criar pedido')
    }
  }

  /**
   * Busca detalhes de um pedido específico (apenas admin)
   */
  async getOrderDetails(orderId: string): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
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
        throw new Error(data.message || 'Erro ao buscar detalhes do pedido')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao buscar detalhes do pedido')
    }
  }

  /**
   * Cria um pedido e marca como pago diretamente (apenas admin)
   */
  async createOrderAsPaid(shippingAddress?: string, subscriptionPlan?: 'monthly' | 'quarterly'): Promise<{ orderId: string; subscriptionId?: string; isSubscription: boolean }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders/pay-as-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingAddress,
          subscriptionPlan,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar pedido como pago')
      }

      const result = await response.json()
      return result.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao criar pedido como pago')
    }
  }
}

export const adminService = new AdminService()


