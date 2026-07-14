import { env } from '../config/env'

const API_URL = env.apiUrl

export interface FreeShippingRule {
  id: string
  name: string
  type: 'value' | 'quantity' | 'product_kit'
  active: boolean
  priority: number
  min_order_value?: number
  min_product_quantity?: number
  product_ids?: string[]
  kit_operator?: 'all' | 'any'
  description?: string
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

class FreeShippingRulesService {
  private getAuthHeaders() {
    const token = localStorage.getItem('kapsu_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as regras de frete grátis
   */
  async getFreeShippingRules(): Promise<FreeShippingRule[]> {
    const response = await fetch(`${API_URL}/shipping/free-rules`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar regras de frete grátis')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria uma nova regra de frete grátis
   */
  async createFreeShippingRule(rule: Omit<FreeShippingRule, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/free-rules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rule),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar regra de frete grátis')
    }
  }

  /**
   * Atualiza uma regra de frete grátis
   */
  async updateFreeShippingRule(
    id: string,
    rule: Partial<Omit<FreeShippingRule, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/free-rules/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rule),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar regra de frete grátis')
    }
  }

  /**
   * Remove uma regra de frete grátis
   */
  async deleteFreeShippingRule(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/free-rules/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover regra de frete grátis')
    }
  }
}

export const freeShippingRulesService = new FreeShippingRulesService()


