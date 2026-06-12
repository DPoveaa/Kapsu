import { env } from '../config/env'
import { Product, ProductPriceHistory } from '../types'
import { PRODUCT_IMAGE_FALLBACK } from '../utils/imageFallback'

const API_URL = env.apiUrl

// Tipo do produto vindo do backend
interface BackendProduct {
  id: string
  name: string
  description: string | null
  price: number
  promo_price: number | null
  purchase_price: number | null
  image: string | null
  category: string | null
  active: boolean
  archived: boolean
  compositions: string | null
  indication: string | null
  contraindication: string | null
  free_shipping?: boolean
  markup?: number | null
  created_at: Date
  updated_at: Date
}

interface ProductsResponse {
  success: boolean
  data: BackendProduct[]
  message?: string
}

interface ProductResponse {
  success: boolean
  data: BackendProduct
  message?: string
}

class ProductsService {
  private baseUrl = `${API_URL}/products`

  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Converte URL de imagem relativa para URL completa
   */
  public getImageUrl(image: string | null | undefined): string {
    if (!image || image.trim() === '') {
      return PRODUCT_IMAGE_FALLBACK
    }

    const trimmedImage = image.trim()

    // Se a imagem parece ser texto (não contém extensão de imagem comum e não é URL), retorna placeholder
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const hasImageExtension = imageExtensions.some(ext => 
      trimmedImage.toLowerCase().includes(ext)
    )
    const isUrl = trimmedImage.startsWith('http://') || trimmedImage.startsWith('https://')
    const isPath = trimmedImage.startsWith('/')
    
    // Se não é URL, não é caminho e não tem extensão de imagem, provavelmente é texto inválido
    if (!isUrl && !isPath && !hasImageExtension && trimmedImage.length > 50) {
      return PRODUCT_IMAGE_FALLBACK
    }

    // Se já é uma URL completa (http:// ou https://), retorna como está
    if (isUrl) {
      return trimmedImage
    }

    // Se é um caminho relativo (começa com /), converte para URL completa
    if (isPath) {
      // Mantém a URL da API incluindo o /api
      return `${API_URL}${trimmedImage}`
    }

    // Se não começa com /, assume que é um caminho relativo e adiciona /uploads/products/
    return `${API_URL}/uploads/products/${trimmedImage}`
  }

  /**
   * Converte produto do backend para o formato do frontend
   */
  private mapProduct(product: BackendProduct): Product {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      promo_price: product.promo_price ? Number(product.promo_price) : null,
      purchase_price: product.purchase_price != null ? Number(product.purchase_price) : null,
      image: this.getImageUrl(product.image),
      category: (product.category as Product['category']) || 'outros',
      active: product.active,
      archived: product.archived ?? false,
      free_shipping: product.free_shipping ?? false,
      markup: product.markup != null ? Number(product.markup) : null,
    }
  }

  /**
   * Busca todos os produtos disponíveis
   */
  async getAll(): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductsResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produtos')
      }

      return data.data.map(product => this.mapProduct(product))
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca um produto por ID
   */
  async getById(id: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produto')
      }

      return this.mapProduct(data.data)
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca produtos por categoria
   */
  async getByCategory(category: string): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/category/${category}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductsResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produtos por categoria')
      }

      return data.data.map(product => this.mapProduct(product))
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca produtos por termo de busca
   */
  async search(searchTerm: string): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductsResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produtos')
      }

      return data.data.map(product => this.mapProduct(product))
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Cria um novo produto
   */
  async create(productData: {
    name: string
    description?: string
    price: number
    promo_price?: number | null
    purchase_price?: number | null
    image?: string
    category?: string
    active?: boolean
    compositions?: string
    indication?: string
    contraindication?: string
    free_shipping?: boolean
    markup?: number | null
  }): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar produto')
      }

      return this.mapProduct(data.data)
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca todos os produtos (incluindo inativos) - para admin
   */
  async getAllForAdmin(): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/all`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductsResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produtos')
      }

      return data.data.map(product => this.mapProduct(product))
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca um produto por ID (incluindo inativo) - para admin
   */
  async getByIdForAdmin(id: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produto')
      }

      return this.mapProduct(data.data)
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca um produto por ID (incluindo inativo) - retorna dados brutos do backend
   */
  async getByIdForAdminRaw(id: string): Promise<BackendProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar produto')
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
   * Atualiza um produto
   */
  async update(id: string, productData: {
    name?: string
    description?: string
    price?: number
    promo_price?: number | null
    purchase_price?: number | null
    image?: string
    category?: string
    active?: boolean
    archived?: boolean
    compositions?: string
    indication?: string
    contraindication?: string
    free_shipping?: boolean
    markup?: number | null
  }): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: ProductResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar produto')
      }

      return this.mapProduct(data.data)
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Deleta um produto (soft delete)
   */
  async delete(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao excluir produto')
      }

      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Deleta múltiplos produtos (bulk delete)
   */
  async deleteBulk(ids: string[]): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/bulk-delete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ ids }),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao excluir produtos em massa')
      return data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca o histórico de preços de um produto específico
   */
  async getPriceHistory(id: string): Promise<ProductPriceHistory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/${id}/price-history`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao buscar histórico de preços')
      return data.data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca o histórico de preços de todos os produtos agrupado
   */
  async getAllPriceHistory(): Promise<{
    product: { id: string; name: string; active: boolean; archived: boolean };
    history: ProductPriceHistory[];
  }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/price-history/all`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao buscar histórico de preços')
      return data.data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca as avaliações de um produto
   */
  async getProductReviews(productId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${productId}/reviews`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao buscar avaliações')
      return data.data || []
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao buscar avaliações.')
    }
  }

  /**
   * Verifica se o usuário é elegível para avaliar o produto
   */
  async checkReviewEligibility(productId: string): Promise<{ eligible: boolean; message?: string; hasReviewed?: boolean; existingReview?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/${productId}/reviews/eligibility`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) {
        return { eligible: false, message: data.message || 'Faça login para avaliar', hasReviewed: data.hasReviewed, existingReview: data.existingReview }
      }
      return { eligible: data.eligible, message: data.message, hasReviewed: data.hasReviewed, existingReview: data.existingReview }
    } catch (error: any) {
      return { eligible: false, message: 'Não foi possível verificar a elegibilidade.' }
    }
  }

  /**
   * Cria uma avaliação para o produto
   */
  async createProductReview(
    productId: string,
    review: { rating: number; comment: string; image?: string | null; is_anonymous?: boolean }
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${productId}/reviews`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(review),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao enviar avaliação')
      return data.data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao enviar avaliação.')
    }
  }

  /**
   * Atualiza uma avaliação para o produto
   */
  async updateProductReview(
    productId: string,
    review: { rating: number; comment: string; image?: string | null; is_anonymous?: boolean }
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${productId}/reviews`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(review),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao atualizar avaliação')
      return data.data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao atualizar avaliação.')
    }
  }

  /**
   * Aplica um markup global para todos os produtos
   */
  async applyGlobalMarkup(markup: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/apply-global-markup`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ markup }),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao aplicar markup global')
      return data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao aplicar markup global.')
    }
  }
}

export const productsService = new ProductsService()

