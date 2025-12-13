import { env } from '../config/env'

const API_URL = env.apiUrl

export interface PromoCode {
  id: string
  code: string
  name: string
  description?: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value?: number
  min_product_quantity?: number
  applicable_product_ids?: string[]
  free_shipping: boolean
  start_date?: string
  end_date?: string
  usage_limit?: number
  usage_count: number
  user_usage_limit?: number
  active: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface PromoCodeValidation {
  promoCode: PromoCode
  discount: number
  freeShipping: boolean
  message: string
}

export interface MultiplePromoCodesValidation {
  promoCodes: PromoCode[]
  totalDiscount: number
  freeShipping: boolean
  appliedDiscounts: {
    percentage: {
      code: string
      name: string
      value: number
      discount: number
    } | null
    fixed: Array<{
      code: string
      name: string
      discount: number
    }>
  }
  message: string
  errors?: string[]
}

class PromoCodesService {
  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todos os códigos promocionais (apenas admin)
   */
  async getPromoCodes(active?: boolean): Promise<PromoCode[]> {
    const url = active !== undefined 
      ? `${API_URL}/promo-codes?active=${active}`
      : `${API_URL}/promo-codes`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar códigos promocionais')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Obtém um código promocional específico (apenas admin)
   */
  async getPromoCode(id: string): Promise<PromoCode> {
    const response = await fetch(`${API_URL}/promo-codes/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar código promocional')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria um novo código promocional (apenas admin)
   */
  async createPromoCode(promoCode: Omit<PromoCode, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<void> {
    const response = await fetch(`${API_URL}/promo-codes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(promoCode),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar código promocional')
    }
  }

  /**
   * Atualiza um código promocional (apenas admin)
   */
  async updatePromoCode(id: string, promoCode: Partial<Omit<PromoCode, 'id' | 'created_at' | 'updated_at' | 'usage_count'>>): Promise<void> {
    const response = await fetch(`${API_URL}/promo-codes/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(promoCode),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar código promocional')
    }
  }

  /**
   * Remove um código promocional (apenas admin)
   */
  async deletePromoCode(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/promo-codes/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover código promocional')
    }
  }

  /**
   * Valida um código promocional
   */
  async validatePromoCode(
    code: string,
    cartTotal: number,
    cartItems: Array<{ product_id: string; quantity: number; price?: number }>,
    userId?: string
  ): Promise<PromoCodeValidation> {
    const response = await fetch(`${API_URL}/promo-codes/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, cartTotal, cartItems, userId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao validar código promocional')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Valida múltiplos códigos promocionais com lógica de conflito
   */
  async validateMultiplePromoCodes(
    codes: string[],
    cartTotal: number,
    cartItems: Array<{ product_id: string; quantity: number; price?: number }>,
    userId?: string
  ): Promise<MultiplePromoCodesValidation> {
    const response = await fetch(`${API_URL}/promo-codes/validate-multiple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codes, cartTotal, cartItems, userId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao validar códigos promocionais')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Registra uso de um código promocional
   */
  async recordPromoCodeUsage(promoCodeId: string, orderId?: string, discountApplied?: number): Promise<void> {
    const token = localStorage.getItem('sanare_token')
    const response = await fetch(`${API_URL}/promo-codes/${promoCodeId}/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ orderId, discountApplied }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao registrar uso do código promocional')
    }
  }
}

export const promoCodesService = new PromoCodesService()

