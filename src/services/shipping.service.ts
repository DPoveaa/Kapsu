import { env } from '../config/env'

const API_URL = env.apiUrl

export interface ShippingCalculation {
  shippingFee: number | null
  isFreeShipping: boolean
  freeShippingThreshold: number | null
  municipality?: string
  message: string
  matchedRule?: {
    id: string
    name: string
    type: string
  }
}

export interface ShippingRegion {
  id: string
  municipality: string
  cep_from: string
  cep_to: string
  shipping_fee: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ShippingSettings {
  free_shipping_threshold: number
}

class ShippingService {
  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Calcula o valor do frete baseado no CEP e valor do carrinho
   */
  async calculateShipping(
    cep: string, 
    cartTotal: number, 
    cartItems?: Array<{ product_id: string; quantity: number }>
  ): Promise<ShippingCalculation> {
    const token = localStorage.getItem('sanare_token')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Adiciona token de autenticação se disponível para associar logs ao usuário
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${API_URL}/shipping/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cep, cartTotal, cartItems }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao calcular frete')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Obtém todas as regiões de frete (apenas admin)
   */
  async getShippingRegions(): Promise<ShippingRegion[]> {
    const response = await fetch(`${API_URL}/shipping/regions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar regiões de frete')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria ou atualiza uma região de frete (apenas admin)
   */
  async createOrUpdateShippingRegion(
    region: Partial<ShippingRegion> & {
      municipality: string
      cepFrom: string
      cepTo: string
      shippingFee: number
      active?: boolean
    }
  ): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/regions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        id: region.id,
        municipality: region.municipality,
        cepFrom: region.cepFrom,
        cepTo: region.cepTo,
        shippingFee: region.shippingFee,
        active: region.active !== undefined ? region.active : true,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao salvar região de frete')
    }
  }

  /**
   * Remove uma região de frete (apenas admin)
   */
  async deleteShippingRegion(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/regions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover região de frete')
    }
  }

  /**
   * Obtém configurações de frete
   */
  async getShippingSettings(): Promise<ShippingSettings> {
    const response = await fetch(`${API_URL}/shipping/settings`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar configurações de frete')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Atualiza configurações de frete (apenas admin)
   */
  async updateShippingSettings(settings: Partial<ShippingSettings>): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/settings`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar configurações de frete')
    }
  }
}

export const shippingService = new ShippingService()

