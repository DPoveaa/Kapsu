import { env } from '../config/env'

const API_URL = env.apiUrl

export interface Promotion {
  id: string
  name: string
  description?: string
  type: 'discount_percentage' | 'discount_fixed' | 'free_shipping' | 'kit'
  active: boolean
  discount_value?: number
  min_order_value?: number
  min_product_quantity?: number
  required_product_ids?: string[]
  required_operator?: 'all' | 'any'
  applicable_product_ids?: string[]
  free_shipping: boolean
  start_date?: string
  end_date?: string
  usage_limit?: number
  usage_count: number
  user_usage_limit?: number
  priority: number
  created_at: string
  updated_at: string
}

export interface PromotionCheckResult {
  promotions: Promotion[]
  totalDiscount: number
  freeShipping: boolean
}

class PromotionsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as promoções (apenas admin)
   */
  async getPromotions(active?: boolean): Promise<Promotion[]> {
    const url = active !== undefined 
      ? `${API_URL}/promotions?active=${active}`
      : `${API_URL}/promotions`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar promoções')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Obtém uma promoção específica (apenas admin)
   */
  async getPromotion(id: string): Promise<Promotion> {
    const response = await fetch(`${API_URL}/promotions/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar promoção')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria uma nova promoção (apenas admin)
   */
  async createPromotion(promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<void> {
    const response = await fetch(`${API_URL}/promotions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(promotion),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar promoção')
    }
  }

  /**
   * Atualiza uma promoção (apenas admin)
   */
  async updatePromotion(id: string, promotion: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>>): Promise<void> {
    const response = await fetch(`${API_URL}/promotions/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(promotion),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar promoção')
    }
  }

  /**
   * Remove uma promoção (apenas admin)
   */
  async deletePromotion(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/promotions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover promoção')
    }
  }

  /**
   * Verifica quais promoções se aplicam a um carrinho
   */
  async checkPromotions(cartTotal: number, cartItems: Array<{ product_id: string; quantity: number }>, userId?: string): Promise<Promotion[]> {
    const response = await fetch(`${API_URL}/promotions/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cartTotal, cartItems, userId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao verificar promoções')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Registra uso de uma promoção
   */
  async recordPromotionUsage(promotionId: string, orderId?: string): Promise<void> {
    const token = localStorage.getItem('sanare_token')
    const response = await fetch(`${API_URL}/promotions/${promotionId}/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ orderId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao registrar uso da promoção')
    }
  }
}

export const promotionsService = new PromotionsService()


