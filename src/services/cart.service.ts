import { env } from '../config/env'
import { Product } from '../types'

const API_URL = env.apiUrl

interface CartItem {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  purchase_type?: 'one-time' | 'subscription' | null
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
    const token = localStorage.getItem('kapsu_token')
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
  async addItem(productId: string, quantity: number, purchaseType?: 'one-time' | 'subscription'): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ productId, quantity, purchaseType }),
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
   * Atualiza a quantidade e/ou tipo de compra de um item
   */
  async updateItem(itemId: string, quantity?: number, purchaseType?: 'one-time' | 'subscription'): Promise<void> {
    try {
      const body: any = {}
      if (quantity !== undefined) body.quantity = quantity
      if (purchaseType !== undefined) body.purchaseType = purchaseType

      const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
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

  // =====================================================
  // MÉTODOS PARA CARRINHO TEMPORÁRIO (VIA WHATSAPP)
  // =====================================================

  /**
   * Busca informações do token de carrinho temporário (sem autenticação)
   */
  async getTokenInfo(token: string): Promise<{
    success: boolean
    data?: {
      token: string
      temp_cart_id: string
      phone: string | null
      expires_at: string
      used_at: string | null
    }
    message?: string
  }> {
    try {
      const response = await fetch(`${API_URL}/temp-cart/token/${token}/info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Erro ao buscar informações do token:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Valida e vincula o token ao usuário logado
   * Isso transfere os itens do carrinho temporário para o carrinho do usuário
   */
  async validateAndLinkToken(token: string): Promise<{
    success: boolean
    data?: { cartId: string }
    message?: string
  }> {
    try {
      const response = await fetch(`${API_URL}/temp-cart/token/${token}/validate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Erro ao vincular token:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Salva o token pendente para vincular após login/cadastro
   */
  savePendingToken(token: string): void {
    sessionStorage.setItem('kapsu_pending_cart_token', token)
  }

  /**
   * Obtém o token pendente
   */
  getPendingToken(): string | null {
    return sessionStorage.getItem('kapsu_pending_cart_token')
  }

  /**
   * Remove o token pendente
   */
  clearPendingToken(): void {
    sessionStorage.removeItem('kapsu_pending_cart_token')
  }

  /**
   * Tenta vincular o token pendente (chamado após login/cadastro)
   */
  async linkPendingToken(): Promise<boolean> {
    const pendingToken = this.getPendingToken()
    if (!pendingToken) {
      return false
    }

    try {
      const result = await this.validateAndLinkToken(pendingToken)
      if (result.success) {
        this.clearPendingToken()
        console.log('✅ Carrinho do WhatsApp vinculado com sucesso!')
        return true
      } else {
        console.warn('⚠️ Não foi possível vincular o carrinho:', result.message)
        // Remove token se for inválido ou expirado
        if (result.message?.includes('inválido') || result.message?.includes('expirado')) {
          this.clearPendingToken()
        }
        return false
      }
    } catch (error) {
      console.error('Erro ao vincular token pendente:', error)
      return false
    }
  }
}

export const cartService = new CartService()

