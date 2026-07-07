import { env } from '../config/env'

const API_URL = env.apiUrl

export interface InstallmentRule {
  id: string
  min_cart_value: number
  max_interest_free_installments: number
  is_active: boolean
  rule_type: 'standard' | 'every_x_reais'
  every_x_reais: number | null
  created_at: string
  updated_at: string
}

class InstallmentRulesService {
  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as regras de parcelamento
   */
  async getInstallmentRules(): Promise<InstallmentRule[]> {
    const response = await fetch(`${API_URL}/admin/installment-rules`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar regras de parcelamento')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria uma nova regra de parcelamento
   */
  async createInstallmentRule(rule: Omit<InstallmentRule, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const response = await fetch(`${API_URL}/admin/installment-rules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rule),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar regra de parcelamento')
    }
  }

  /**
   * Atualiza uma regra de parcelamento
   */
  async updateInstallmentRule(
    id: string,
    rule: Partial<Omit<InstallmentRule, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const response = await fetch(`${API_URL}/admin/installment-rules/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(rule),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar regra de parcelamento')
    }
  }

  /**
   * Remove uma regra de parcelamento
   */
  async deleteInstallmentRule(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/admin/installment-rules/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover regra de parcelamento')
    }
  }
}

export const installmentRulesService = new InstallmentRulesService()
