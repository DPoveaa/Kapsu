import { env } from '../config/env'
import { Product } from '../types'

const API_URL = env.apiUrl

export interface HomeSection {
  id: string
  key: string
  name: string
  category?: string | null
  limit: number
  order: number
  active: boolean
  show_link: boolean
  display_type?: 'manual' | 'best_selling' | 'newest' | 'category' | 'promotions'
  created_at: Date
  updated_at: Date
}

export interface HomeFeaturedProduct {
  id: string
  product_id: string
  order: number
  active: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateHomeSectionData {
  key: string
  name: string
  category?: string
  limit?: number
  order?: number
  active?: boolean
  show_link?: boolean
  display_type?: 'manual' | 'best_selling' | 'newest' | 'category' | 'promotions'
}

export interface UpdateHomeSectionData {
  name?: string
  category?: string | null
  limit?: number
  order?: number
  active?: boolean
  show_link?: boolean
  display_type?: 'manual' | 'best_selling' | 'newest' | 'category' | 'promotions'
}

interface HomeSectionsResponse {
  success: boolean
  data: HomeSection[]
  message?: string
}

interface HomeSectionResponse {
  success: boolean
  data: HomeSection
  message?: string
}

interface FeaturedProductsResponse {
  success: boolean
  data: Product[]
  message?: string
}

class HomeSectionsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('kapsu_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as seções (público - apenas ativas)
   */
  async getAll(includeInactive: boolean = false): Promise<HomeSection[]> {
    const url = includeInactive 
      ? `${API_URL}/home-sections?include_inactive=true`
      : `${API_URL}/home-sections`
    
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token')
    const response = await fetch(url, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined })

    if (!response.ok) {
      throw new Error('Erro ao obter seções')
    }

    const data: HomeSectionsResponse = await response.json()
    return data.data || []
  }

  /**
   * Obtém uma seção específica por ID
   */
  async getById(id: string): Promise<HomeSection> {
    const response = await fetch(`${API_URL}/home-sections/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter seção')
    }

    const data: HomeSectionResponse = await response.json()
    return data.data
  }

  /**
   * Cria uma nova seção (apenas admin)
   */
  async create(sectionData: CreateHomeSectionData): Promise<HomeSection> {
    const response = await fetch(`${API_URL}/home-sections`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sectionData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar seção')
    }

    const data: HomeSectionResponse = await response.json()
    return data.data
  }

  /**
   * Atualiza uma seção (apenas admin)
   */
  async update(id: string, sectionData: UpdateHomeSectionData): Promise<HomeSection> {
    const response = await fetch(`${API_URL}/home-sections/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sectionData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar seção')
    }

    const data: HomeSectionResponse = await response.json()
    return data.data
  }

  /**
   * Deleta uma seção (apenas admin)
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/home-sections/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao deletar seção')
    }
  }

  /**
   * Reordena seções (apenas admin)
   */
  async reorder(sectionIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/home-sections/reorder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ section_ids: sectionIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao reordenar seções')
    }
  }

  /**
   * Obtém todos os produtos em destaque (público)
   * Retorna produtos com featured_id incluído
   */
  async getFeaturedProducts(includeInactive: boolean = false): Promise<(Product & { featured_id?: string })[]> {
    const url = includeInactive 
      ? `${API_URL}/home-sections/featured/products?include_inactive=true`
      : `${API_URL}/home-sections/featured/products`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter produtos em destaque')
    }

    const data: FeaturedProductsResponse = await response.json()
    return data.data || []
  }

  /**
   * Adiciona um produto em destaque (apenas admin)
   */
  async addFeaturedProduct(productId: string, order?: number, active?: boolean): Promise<HomeFeaturedProduct> {
    const response = await fetch(`${API_URL}/home-sections/featured/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ product_id: productId, order, active }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao adicionar produto em destaque')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Remove um produto de destaque (apenas admin)
   */
  async removeFeaturedProduct(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/home-sections/featured/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover produto de destaque')
    }
  }

  /**
   * Reordena produtos em destaque (apenas admin)
   */
  async reorderFeaturedProducts(productIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/home-sections/featured/products/reorder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ product_ids: productIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao reordenar produtos')
    }
  }

  /**
   * Obtém produtos de uma seção baseado no display_type (público)
   */
  async getSectionProducts(sectionId: string, includeInactive: boolean = false): Promise<Product[]> {
    const url = includeInactive 
      ? `${API_URL}/home-sections/${sectionId}/products?include_inactive=true`
      : `${API_URL}/home-sections/${sectionId}/products`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter produtos da seção')
    }

    const data: FeaturedProductsResponse = await response.json()
    return data.data || []
  }

  /**
   * Adiciona um produto manual a uma seção (apenas admin)
   */
  async addSectionProduct(sectionId: string, productId: string, order?: number, active?: boolean): Promise<any> {
    const response = await fetch(`${API_URL}/home-sections/${sectionId}/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ product_id: productId, order, active }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao adicionar produto à seção')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Remove um produto de uma seção (apenas admin)
   */
  async removeSectionProduct(sectionId: string, productId: string): Promise<void> {
    const response = await fetch(`${API_URL}/home-sections/${sectionId}/products/${productId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover produto da seção')
    }
  }

  /**
   * Reordena produtos de uma seção (apenas admin)
   */
  async reorderSectionProducts(sectionId: string, productIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/home-sections/${sectionId}/products/reorder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ product_ids: productIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao reordenar produtos')
    }
  }
}

export const homeSectionsService = new HomeSectionsService()



