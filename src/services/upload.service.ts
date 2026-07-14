import { env } from '../config/env'

const API_URL = env.apiUrl

export interface UploadResponse {
  success: boolean
  message: string
  data: {
    url: string
    path: string
    filename: string
    size: number
    mimetype: string
  }
}

class UploadService {
  private baseUrl = `${API_URL}/upload`

  /**
   * Faz upload de uma imagem de produto
   */
  async uploadProductImage(file: File): Promise<UploadResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      // Cria FormData
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${this.baseUrl}/product-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Não definir Content-Type - o navegador define automaticamente com boundary para FormData
        },
        body: formData,
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: UploadResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer upload da imagem')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao fazer upload da imagem')
    }
  }

  /**
   * Deleta uma imagem de produto
   */
  async deleteProductImage(filename: string): Promise<void> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/product-image/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao deletar imagem')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao deletar imagem')
    }
  }

  /**
   * Faz upload de uma imagem de perfil
   */
  async uploadProfileImage(file: File): Promise<UploadResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      // Cria FormData
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${this.baseUrl}/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Não definir Content-Type - o navegador define automaticamente com boundary para FormData
        },
        body: formData,
      })

      const text = await response.text()
      
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: UploadResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer upload da imagem de perfil')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao fazer upload da imagem de perfil')
    }
  }

  /**
   * Deleta uma imagem de perfil
   */
  async deleteProfileImage(filename: string): Promise<void> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/profile-image/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao deletar imagem de perfil')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao deletar imagem de perfil')
    }
  }

  /**
   * Faz upload de uma imagem de avaliação
   */
  async uploadReviewImage(file: File): Promise<UploadResponse> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${this.baseUrl}/review-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: UploadResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer upload da imagem de avaliação')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao fazer upload da imagem de avaliação')
    }
  }

  /**
   * Deleta uma imagem de avaliação
   */
  async deleteReviewImage(filename: string): Promise<void> {
    try {
      const token = localStorage.getItem('kapsu_token')
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/review-image/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao deletar imagem de avaliação')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao deletar imagem de avaliação')
    }
  }
}

export const uploadService = new UploadService()

