import { env } from '../config/env'

const API_URL = env.apiUrl

export type UserRole = 'user' | 'admin' | 'support' | 'supplier_admin' | 'supplier_employee'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  cpf: string | null
  address: string | null
  role: UserRole
  supplier_id?: string | null
  supplier_name?: string | null
  active?: boolean
  permissions?: string[]
  last_login: string | null
  created_at: string
  updated_at: string
  ignore_business_metrics?: boolean
  ignore_reason?: string | null
  ignore_enabled_at?: string | null
  ignore_enabled_by?: string | null
}

export interface Supplier {
  id: string
  name: string
  trade_name?: string | null
  cnpj?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  active: boolean
  payout_frequency?: 'WEEKLY' | 'MONTHLY'
  payout_weekday?: number
  payout_month_day?: number
  totalUsers?: number
  masterUser?: { id: string; name: string; email: string } | null
  created_at: string
  updated_at: string
}

export interface SupplierTeamUser {
  id: string
  name: string
  email: string
  role: 'supplier_admin' | 'supplier_employee'
  active: boolean
  last_login?: string | null
  created_at: string
}

export interface SupplierPayment {
  id: string
  supplier_id: string
  supplier_name?: string
  amount: number
  payment_date: string
  period_start?: string | null
  period_end?: string | null
  payment_method?: string | null
  description?: string | null
  related_order_ids?: string[] | string | null
  status: 'PAID' | 'PENDING' | 'CANCELLED'
  receipt_file_path?: string | null
  receipt_original_name?: string | null
  receipt_mime_type?: string | null
  receipt_size_bytes?: number | null
  created_by?: string | null
  creator_name?: string
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
    totalSupport: number
    totalUsersWithoutCpf: number
    recentUsers: User[]
  }
}

export interface AuditLog {
  id: number
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  resource: string
  resource_id: string | null
  result: 'SUCCESS' | 'FAILURE'
  request_id: string | null
  before_state: string | null
  after_state: string | null
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogsResponse {
  success: boolean
  data: {
    logs: AuditLog[]
    total: number
  }
}

class AdminService {
  private baseUrl = `${API_URL}/admin`

  /**
   * Lista todos os usuários
   */
  async listUsers(
    page: number = 1,
    limit: number = 50,
    search: string = '',
    role: string = '',
    noCpf: string = '',
    ignored: string = '',
    active: string = '',
    supplier_id: string = ''
  ): Promise<UsersListResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(role && { role }),
        ...(noCpf && { noCpf }),
        ...(ignored && { ignored }),
        ...(active && { active }),
        ...(supplier_id && { supplier_id }),
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
      const token = localStorage.getItem('kapsu_token')
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
  async updateUserRole(userId: string, role: 'user' | 'admin' | 'support'): Promise<{ success: boolean; message: string; user: User }> {
    try {
      const token = localStorage.getItem('kapsu_token')
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
   * Atualiza dados básicos de um usuário
   */
  async updateUser(userId: string, data: Partial<User> & { permissions?: string[]; ignore_business_metrics?: boolean; ignore_reason?: string | null; apply_to_existing_orders?: boolean }): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'PATCH',
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

      const responseData = JSON.parse(text)
      if (!response.ok) {
        throw new Error(responseData.message || 'Erro ao atualizar dados do usuário')
      }

      return responseData
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao atualizar dados do usuário')
    }
  }

  /**
   * Obtém estatísticas gerais
   */
  async getStatistics(): Promise<StatisticsResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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

  async assignOrdersSupplier(orderIds: string[], supplierId: string | null): Promise<{ success: boolean; message: string; updated: number }> {
    const token = localStorage.getItem('kapsu_token')
    if (!token) throw new Error('Token não encontrado')

    const response = await fetch(`${this.baseUrl}/orders/supplier`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderIds, supplierId }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao vincular fornecedor aos pedidos')
    return data
  }

  /**
   * Obtém estatísticas detalhadas de Atendimento Humano no WhatsApp
   */
  async getWhatsAppHumanSupportStatistics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
      const token = localStorage.getItem('kapsu_token')
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
    shippingMethod?: string
    shippingAddress?: {
      postalCode?: string
      street?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
    }
    status?: string
    invoiceUrl?: string
    invoice_url?: string
    invoiceNumber?: string
    invoice_number?: string
    shippingLabelUrl?: string
    shipping_label_url?: string
    mlPickupDeadline?: string
    ml_pickup_deadline?: string
  }): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = localStorage.getItem('kapsu_token')
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


  async updateOrderBusinessIgnore(orderId: string, ignore: boolean, reason?: string): Promise<{ success: boolean; order: any }> {
    const token = localStorage.getItem('kapsu_token')
    if (!token) throw new Error('Token não encontrado')

    const response = await fetch(`${this.baseUrl}/orders/${orderId}/business-ignore`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ignore, reason }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar pedido ignorado')
    return data
  }

  /**
   * Busca detalhes de um pedido específico (apenas admin)
   */
  async getOrderDetails(orderId: string): Promise<{ success: boolean; data: any }> {
    try {
      const token = localStorage.getItem('kapsu_token')
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
   * Atualiza o status de um pedido manualmente (apenas admin)
   */
  async updateOrderStatus(orderId: string, status: string, statusExplanation?: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status, status_explanation: statusExplanation }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar status do pedido')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao atualizar status do pedido')
    }
  }

  /**
   * Exclui um pedido de teste específico por ID (apenas admin)
   */
  async deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'DELETE',
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
        throw new Error(data.message || 'Erro ao excluir pedido')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao excluir pedido')
    }
  }

  /**
   * Exclui todos os pedidos de teste (apenas admin)
   */
  async deleteTestOrders(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`${this.baseUrl}/orders/test-payments`, {
        method: 'DELETE',
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
        throw new Error(data.message || 'Erro ao excluir pedidos de teste')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao excluir pedidos de teste')
    }
  }


  /**
   * Cria um pedido e marca como pago diretamente (apenas admin)
   */
  async createOrderAsPaid(shippingAddress?: string, subscriptionPlan?: 'monthly' | 'quarterly'): Promise<{ orderId: string; subscriptionId?: string; isSubscription: boolean }> {
    try {
      const token = localStorage.getItem('kapsu_token')
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

  /**
   * Busca os logs de auditoria (apenas admin)
   */
  async getAuditLogs(params?: {
    limit?: number
    offset?: number
    action?: string
    resource?: string
    resourceId?: string
    userEmail?: string
    result?: string
    requestId?: string
    startDate?: string
    endDate?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLogsResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(`${this.baseUrl}/audit-logs?${queryParams}`, {
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
        throw new Error(data.message || 'Erro ao buscar logs de auditoria')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao buscar logs de auditoria')
    }
  }

  /**
   * Lista todas as conversas do site/WhatsApp/e-mail
   */
  async listConversations(params?: {
    status?: string
    channel?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ success: boolean; data: { conversations: any[]; pagination: any } }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(`${this.baseUrl}/conversations?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao listar conversas')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao listar conversas')
    }
  }

  /**
   * Obtém detalhes e mensagens de uma conversa
   */
  async getConversationDetail(id: string): Promise<{
    success: boolean
    data: {
      conversation: any
      messages: any[]
      events: any[]
      customer: any | null
      cart: any | null
      orders: any[]
    }
  }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao buscar detalhes da conversa')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao buscar detalhes da conversa')
    }
  }

  /**
   * Envia uma resposta para o cliente na conversa
   */
  async replyConversation(id: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao responder conversa')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao responder conversa')
    }
  }

  /**
   * Atribui conversa a um admin
   */
  async assignConversation(id: string, adminId: string | null): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ adminId }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao atribuir conversa')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao atribuir conversa')
    }
  }

  /**
   * Pausa as respostas automáticas da IA na conversa
   */
  async pauseAI(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}/pause-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao pausar IA')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao pausar IA')
    }
  }

  /**
   * Reativa as respostas automáticas da IA na conversa
   */
  async resumeAI(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}/resume-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao reativar IA')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao reativar IA')
    }
  }

  /**
   * Marca a conversa como resolvida
   */
  async resolveConversation(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao resolver conversa')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao resolver conversa')
    }
  }

  /**
   * Salva uma nota interna visível apenas para administradores
   */
  async addInternalNote(id: string, note: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/conversations/${id}/internal-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ note }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao salvar nota interna')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao salvar nota interna')
    }
  }

  /**
   * Retorna o status das chaves Gemini configuradas
   */
  async getAIKeysStatus(): Promise<{
    success: boolean
    data: {
      chatModel: string
      extractionModel: string
      currentIndex?: number
      initialKeyIndex?: number
      lastSuccessfulKeyIndex?: number | null
      availableKeys?: number
      cooldownKeys?: number
      stats: Array<{
        keyIndex: number
        maskedKey: string
        status: string
        cooldownUntil: string | null
        nextAvailableAt?: string | null
        successCount: number
        errorCount: number
        consecutiveErrors: number
        lastUsedAt: string | null
        lastErrorReason: string | null
        lastRotationReason?: string | null
        disabledUntil?: string | null
      }>
    }
  }> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`${this.baseUrl}/ai/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Erro ao buscar status das chaves Gemini')
      }

      return await response.json()
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao buscar status das chaves Gemini')
    }
  }

  /**
   * Criação direta de usuário por admin
   */
  async createUser(payload: {
    name: string
    email?: string
    password?: string
    phone?: string
    cpf?: string
    role: string
    supplier_id?: string | null
    active?: boolean
    permissions?: string[]
  }): Promise<{ success: boolean; message: string; user: User }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao criar usuário')
    return data
  }

  /**
   * Alterna status ativo/inativo de um usuário
   */
  async toggleUserActive(userId: string): Promise<{ success: boolean; message: string; active: boolean }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/users/${userId}/toggle-active`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao alterar status do usuário')
    return data
  }


  /**
   * Lista fornecedores
   */
  async listSuppliers(page: number = 1, limit: number = 50, search: string = '', active: string = ''): Promise<{
    success: boolean
    suppliers: Supplier[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const token = localStorage.getItem('kapsu_token')
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(active && { active }),
    })
    const response = await fetch(`${this.baseUrl}/suppliers?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao listar fornecedores')
    return data
  }

  /**
   * Cria fornecedor
   */
  async createSupplier(payload: Partial<Supplier> & { master_user?: any; employee_user?: any }): Promise<{
    success: boolean;
    message: string;
    supplier: Supplier;
    masterUserCredentials?: {
      id: string;
      name: string;
      email?: string | null;
      username?: string | null;
      loginCode: string;
      tempPassword?: string;
      mustChangePassword: boolean;
    };
  }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao criar fornecedor')
    return data
  }

  /**
   * Atualiza fornecedor
   */
  async updateSupplier(supplierId: string, payload: Partial<Supplier>): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/suppliers/${supplierId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar fornecedor')
    return data
  }

  /**
   * Lista pagamentos a fornecedores
   */
  async listSupplierPayments(page: number = 1, limit: number = 50, supplierId: string = '', status: string = ''): Promise<{
    success: boolean
    payments: SupplierPayment[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const token = localStorage.getItem('kapsu_token')
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(supplierId && { supplier_id: supplierId }),
      ...(status && { status }),
    })
    const response = await fetch(`${this.baseUrl}/supplier-payments?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao listar pagamentos')
    return data
  }

  async getSupplierSettlements(supplierId: string): Promise<{ success: boolean; data: import('./supplier.service').SupplierSettlementOverview }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/supplier-settlements/${encodeURIComponent(supplierId)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao calcular os repasses')
    return data
  }

  async listPendingMercadoLivreReceipts(): Promise<{ success: boolean; orders: Array<{ id: string; supplierId: string; supplierName: string; customerName: string; status: string; createdAt: string; expectedPaymentDate: string; amount: number }> }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/mercado-livre/pending-receipts`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao listar pendências do Mercado Livre')
    return data
  }

  async confirmMercadoLivreReceipts(orderIds: string[]): Promise<{ success: boolean; confirmed: number; message: string }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/mercado-livre/confirm-receipts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ order_ids: orderIds }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao confirmar recebimentos')
    return data
  }
  /**
   * Cadastra pagamento efetuado ao fornecedor com upload de comprovante
   */
  async createSupplierPayment(formData: FormData): Promise<{ success: boolean; message: string; payment: SupplierPayment }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/supplier-payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao registrar pagamento')
    return data
  }

  /**
   * Remove registro de pagamento
   */
  async deleteSupplierPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/supplier-payments/${paymentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao remover pagamento')
    return data
  }

  /**
   * Atualiza a Nota Fiscal (NFe) de um pedido
   */
  async updateOrderInvoice(orderId: string, payload: { invoice_url?: string | null; invoice_number?: string | null }): Promise<{ success: boolean; message: string; invoice_url?: string | null; invoice_number?: string | null }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/invoice`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar Nota Fiscal')
    return data
  }

  /**
   * Busca a Nota Fiscal Notaas de um pedido
   */
  async getNotaasInvoiceByOrder(orderId: string): Promise<any> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/fiscal/notaas/order/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.data
  }

  /**
   * Dispara a emissão manual de NF-e no Notaas
   */
  async issueNotaasInvoice(orderId: string): Promise<any> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/fiscal/notaas/order/${orderId}/issue`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao emitir Nota Fiscal')
    return data.data
  }

  /**
   * Reconcilia o status da Nota Fiscal no Notaas
   */
  async reconcileNotaasInvoice(orderId: string): Promise<any> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/fiscal/notaas/order/${orderId}/reconcile`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao reconciliar Nota Fiscal')
    return data.data
  }

  /** Retorna a URL autenticada do proxy DANFE */
  getNotaasDanfeUrl(invoiceId: string): string {
    return `${this.baseUrl}/fiscal/notaas/${invoiceId}/danfe`
  }

  /** Retorna a URL autenticada do proxy XML */
  getNotaasXmlUrl(invoiceId: string): string {
    return `${this.baseUrl}/fiscal/notaas/${invoiceId}/xml`
  }

  /**
   * Atualiza a etiqueta de envio (PDF) do Mercado Livre de um pedido
   */
  async updateOrderShippingLabel(orderId: string, payload: { shipping_label_url?: string | null }): Promise<{ success: boolean; message: string; shipping_label_url?: string | null }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/shipping-label`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar etiqueta de envio')
    return data
  }

  async updateOrderMlDeadline(orderId: string, ml_pickup_deadline: string | null): Promise<{ success: boolean; ml_pickup_deadline: string | null }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/ml-deadline`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ml_pickup_deadline }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar prazo ML')
    return data
  }

  async updateOrderShippingFee(orderId: string, newValue: number, reason?: string): Promise<{ success: boolean; oldValue: number; newValue: number; history: any[] }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}/shipping-fee`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newValue, reason }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar valor do frete')
    return data
  }

  async listSupplierUsers(supplierId: string): Promise<{ success: boolean; users: any[] }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/suppliers/${supplierId}/users`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao listar equipe do fornecedor')
    return data
  }

  async createSupplierUser(supplierId: string, payload: { name: string; email?: string; password?: string; role?: string; phone?: string; active?: boolean }): Promise<{ success: boolean; message: string; user: any; credentials?: { loginCode: string; tempPassword?: string } }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/suppliers/${supplierId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao criar usuário da equipe')
    return data
  }

  async updateSupplierUser(supplierId: string, userId: string, payload: { name?: string; email?: string; password?: string; active?: boolean; role?: string; phone?: string }): Promise<{ success: boolean; message: string; user: any }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/suppliers/${supplierId}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar usuário da equipe')
    return data
  }

  async deleteSupplierUser(supplierId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('kapsu_token')
    const response = await fetch(`${this.baseUrl}/suppliers/${supplierId}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao remover usuário da equipe')
    return data
  }

}

export const adminService = new AdminService()
