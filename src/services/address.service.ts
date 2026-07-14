import { env } from '../config/env'

const API_URL = env.apiUrl

export interface SavedAddress {
  id: string
  user_id: string
  nickname: string
  cep: string
  address: string
  number: string
  complement: string | null
  bairro: string | null
  city: string
  state: string
  is_default: boolean
  created_at: string
  updated_at: string
}

class AddressService {
  private getAuthHeaders() {
    const token = localStorage.getItem('kapsu_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todos os endereços salvos do usuário
   */
  async getSavedAddresses(): Promise<SavedAddress[]> {
    const response = await fetch(`${API_URL}/addresses`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar endereços salvos')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria um novo endereço salvo
   */
  async createSavedAddress(address: {
    nickname: string
    cep: string
    address: string
    number: string
    complement?: string
    bairro?: string
    city: string
    state: string
    isDefault?: boolean
  }): Promise<SavedAddress> {
    const response = await fetch(`${API_URL}/addresses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(address),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao salvar endereço')
    }

    const data = await response.json()
    // Se retornar apenas { id }, busca o endereço completo
    if (data.data && data.data.id && !data.data.nickname) {
      const addresses = await this.getSavedAddresses()
      const created = addresses.find(a => a.id === data.data.id)
      return created || data.data
    }
    return data.data || data
  }

  /**
   * Atualiza um endereço salvo
   */
  async updateSavedAddress(
    id: string,
    address: Partial<{
      nickname: string
      cep: string
      address: string
      number: string
      complement: string
      bairro: string
      city: string
      state: string
      isDefault: boolean
    }>
  ): Promise<void> {
    const response = await fetch(`${API_URL}/addresses/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(address),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar endereço')
    }
  }

  /**
   * Remove um endereço salvo
   */
  async deleteSavedAddress(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/addresses/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover endereço')
    }
  }

  /**
   * Define um endereço como padrão
   */
  async setDefaultAddress(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/addresses/${id}/set-default`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao definir endereço padrão')
    }
  }
}

export const addressService = new AddressService()

