import { env } from '../config/env'

const API_URL = env.apiUrl

interface Order {
  id: string
  user_id: string
  total: number
  status: string
  payment_method: string | null
  shipping_address: string | null
  created_at: Date
  updated_at: Date
  items?: any[]
}

interface OrderResponse {
  success: boolean
  data: Order
  message?: string
}

interface OrdersResponse {
  success: boolean
  data: Order[]
  message?: string
}

class OrderService {
  private baseUrl = `${API_URL}/orders`

  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Cria um pedido a partir do carrinho
   */
  async createOrder(paymentMethod: string, shippingAddress: string): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ paymentMethod, shippingAddress }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: OrderResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pedido')
      }

      return data.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Lista todos os pedidos do usuário
   */
  async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: OrdersResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar pedidos')
      }

      return data.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca um pedido específico
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: OrderResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar pedido')
      }

      return data.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Atualiza o status de um pedido (apenas para admins em testes)
   */
  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: OrderResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar status do pedido')
      }

      return data.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }
}

export const orderService = new OrderService()

