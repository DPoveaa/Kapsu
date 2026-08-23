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

export interface AdminProductReview {
  id: string
  product_id: string
  user_id?: string | null
  name: string
  rating: number
  comment?: string | null
  image?: string | null
  is_anonymous: boolean
  is_seed: boolean
  active: boolean
  is_replaced?: boolean
  product_name?: string
  product_image?: string
  created_at: string | Date
  updated_at: string | Date
}

export interface ProductReviewMetrics {
  total: number
  realCount: number
  seedActiveCount: number
  seedReplacedCount: number
  inactiveCount: number
}

export interface ProductReviewsAdminFilter {
  productId?: string
  origin?: 'all' | 'real' | 'seed'
  status?: 'all' | 'active' | 'replaced' | 'inactive'
  search?: string
}

export interface CreateAdminProductReviewData {
  product_id: string
  name?: string
  rating: number
  comment?: string
  image?: string | null
  is_anonymous?: boolean
  is_seed?: boolean
  active?: boolean
  date?: string
}

export interface UpdateAdminProductReviewData {
  name?: string
  rating?: number
  comment?: string
  image?: string | null
  is_anonymous?: boolean
  is_seed?: boolean
  active?: boolean
  date?: string
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
   * Obtém todas as reviews da home (público - apenas ativas)
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
   * Cria uma nova review da home (apenas admin)
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
   * Atualiza uma review da home (apenas admin)
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
   * Deleta uma review da home (apenas admin)
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
   * Reordena reviews da home (apenas admin)
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

  // ==========================================
  // MÉTODOS DE AVALIAÇÕES DE PRODUTOS (ADMIN)
  // ==========================================

  /**
   * Obtém avaliações de produtos para o painel de administração com métricas
   */
  async getProductReviewsAdmin(filters: ProductReviewsAdminFilter = {}): Promise<{
    reviews: AdminProductReview[]
    metrics: ProductReviewMetrics
  }> {
    const params = new URLSearchParams()
    if (filters.productId) params.append('product_id', filters.productId)
    if (filters.origin && filters.origin !== 'all') params.append('origin', filters.origin)
    if (filters.status && filters.status !== 'all') params.append('status', filters.status)
    if (filters.search) params.append('search', filters.search)

    const url = `${API_URL}/products/reviews/admin?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Erro ao carregar avaliações de produtos')
    }

    const res = await response.json()
    return {
      reviews: res.data || [],
      metrics: res.metrics || {
        total: 0,
        realCount: 0,
        seedActiveCount: 0,
        seedReplacedCount: 0,
        inactiveCount: 0,
      },
    }
  }

  /**
   * Criação de avaliação de produto pelo Admin
   */
  async createProductReviewAdmin(data: CreateAdminProductReviewData): Promise<AdminProductReview> {
    const response = await fetch(`${API_URL}/products/reviews/admin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Erro ao criar avaliação de produto')
    }

    const res = await response.json()
    return res.data
  }

  /**
   * Atualização de avaliação de produto pelo Admin
   */
  async updateProductReviewAdmin(id: string, data: UpdateAdminProductReviewData): Promise<AdminProductReview> {
    const response = await fetch(`${API_URL}/products/reviews/admin/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Erro ao atualizar avaliação de produto')
    }

    const res = await response.json()
    return res.data
  }

  /**
   * Alterna status ativo/inativo de uma avaliação de produto pelo Admin
   */
  async toggleProductReviewActive(id: string): Promise<AdminProductReview> {
    const response = await fetch(`${API_URL}/products/reviews/admin/${id}/toggle-active`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Erro ao alterar status da avaliação')
    }

    const res = await response.json()
    return res.data
  }

  /**
   * Exclusão de avaliação de produto pelo Admin
   */
  async deleteProductReviewAdmin(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/reviews/admin/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Erro ao excluir avaliação de produto')
    }
  }
}

export const reviewsService = new ReviewsService()
