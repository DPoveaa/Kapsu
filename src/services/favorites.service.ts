import { env } from '../config/env'
import { Product } from '../types'

const API_URL = env.apiUrl

class FavoritesService {
  private baseUrl = `${API_URL}/favorites`

  async getFavorites(): Promise<Product[]> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) return []

      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar favoritos')
      }

      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error('Erro getFavorites:', error)
      return []
    }
  }

  async addFavorite(productId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) return false

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      })

      if (!response.ok) {
        throw new Error('Erro ao adicionar favorito')
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Erro addFavorite:', error)
      return false
    }
  }

  async removeFavorite(productId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) return false

      const response = await fetch(`${this.baseUrl}/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao remover favorito')
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Erro removeFavorite:', error)
      return false
    }
  }
}

export const favoritesService = new FavoritesService()
