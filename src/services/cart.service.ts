import { env } from '../config/env'
import { Product } from '../types'

const API_URL = env.apiUrl

interface CartItem {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  product?: Product
  created_at: Date
  updated_at: Date
}

interface CartResponse {
  success: boolean
  data: {
    id: string | null
    items: CartItem[]
  }
  message?: string
}

class CartService {
  private baseUrl = `${API_URL}/cart`

  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Busca o carrinho do usuário
   */
  async getCart(): Promise<CartResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: CartResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar carrinho')
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
   * Adiciona um produto ao carrinho
   */
  async addItem(productId: string, quantity: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ productId, quantity }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao adicionar item ao carrinho')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Atualiza a quantidade de um item
   */
  async updateItem(itemId: string, quantity: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ quantity }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar item')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Remove um item do carrinho
   */
  async removeItem(itemId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao remover item')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Limpa o carrinho
   */
  async clearCart(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao limpar carrinho')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }
}

export const cartService = new CartService()

