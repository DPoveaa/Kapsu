import { env } from '../config/env'

const API_URL = env.apiUrl

export interface Review {
  id: string
  name: string
  rating: number
  comment: string
  product?: string | null
  date?: string | null
  avatar?: string | null
  order: number
  active: boolean
  show_image?: boolean
  show_name?: boolean
  show_date?: boolean
  show_product?: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateReviewData {
  name?: string
  rating: number
  comment: string
  product?: string
  date?: string
  avatar?: string
  order?: number
  active?: boolean
  show_image?: boolean
  show_name?: boolean
  show_date?: boolean
  show_product?: boolean
}

export interface UpdateReviewData {
  name?: string
  rating?: number
  comment?: string
  product?: string | null
  date?: string | null
  avatar?: string | null
  order?: number
  active?: boolean
  show_image?: boolean
  show_name?: boolean
  show_date?: boolean
  show_product?: boolean
}

interface ReviewsResponse {
  success: boolean
  data: Review[]
  message?: string
}

interface ReviewResponse {
  success: boolean
  data: Review
  message?: string
}

class ReviewsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('kapsu_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as reviews (público - apenas ativas)
   */
  async getAll(includeInactive: boolean = false): Promise<Review[]> {
    const url = includeInactive 
      ? `${API_URL}/reviews?include_inactive=true`
      : `${API_URL}/reviews`
    
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token')
    const response = await fetch(url, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined })

    if (!response.ok) {
      throw new Error('Erro ao obter reviews')
    }

    const data: ReviewsResponse = await response.json()
    return data.data || []
  }

  /**
   * Obtém uma review específica por ID
   */
  async getById(id: string): Promise<Review> {
    const response = await fetch(`${API_URL}/reviews/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter review')
    }

    const data: ReviewResponse = await response.json()
    return data.data
  }

  /**
   * Cria uma nova review (apenas admin)
   */
  async create(reviewData: CreateReviewData): Promise<Review> {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(reviewData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar review')
    }

    const data: ReviewResponse = await response.json()
    return data.data
  }

  /**
   * Atualiza uma review (apenas admin)
   */
  async update(id: string, reviewData: UpdateReviewData): Promise<Review> {
    const response = await fetch(`${API_URL}/reviews/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(reviewData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar review')
    }

    const data: ReviewResponse = await response.json()
    return data.data
  }

  /**
   * Deleta uma review (apenas admin)
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/reviews/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao deletar review')
    }
  }

  /**
   * Reordena reviews (apenas admin)
   */
  async reorder(reviewIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/reviews/reorder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ review_ids: reviewIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao reordenar reviews')
    }
  }
}

export const reviewsService = new ReviewsService()



