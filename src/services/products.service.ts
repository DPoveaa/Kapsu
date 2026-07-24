import { env } from '../config/env'
import { Product, ProductPriceHistory, ProductTargetAudience } from '../types'
import { PRODUCT_IMAGE_FALLBACK } from '../utils/imageFallback'
import { getUploadsImageUrl } from '../utils/imageUrl'

const API_URL = env.apiUrl

// Tipo do produto vindo do backend
export interface BackendProduct {
  id: string
  supplier_id?: string | null
  supplier_name?: string | null
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
  benefits?: string | null
  free_shipping?: boolean
  target_audience?: ProductTargetAudience | null
  markup?: number | null
  slug: string | null
  sku: string | null
  quantity: string | null
  meta_title: string | null
  meta_description: string | null
  tags: string | null
  last_sync: string | null
  created_at: string | Date
  updated_at: string | Date
  intended_form: string | null
  intended_presentation: string | null
  intended_units_per_dose: string | null
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
    const token = localStorage.getItem('kapsu_token')
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
    const url = getUploadsImageUrl(trimmedImage, 'products')
    return url || (isUrl ? trimmedImage : PRODUCT_IMAGE_FALLBACK)
  }

  /**
   * Converte produto do backend para o formato do frontend
   */
  private mapProduct(product: BackendProduct): Product {
    return {
      id: product.id,
      supplier_id: product.supplier_id || null,
      supplier_name: product.supplier_name || null,
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
      targetAudience: product.target_audience ?? 'unknown',
      target_audience: product.target_audience ?? 'unknown',
      markup: product.markup != null ? Number(product.markup) : null,
      compositions: product.compositions,
      indication: product.indication,
      contraindication: product.contraindication,
      benefits: product.benefits ?? null,
      slug: product.slug || null,
      sku: product.sku || '',
      quantity: product.quantity,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      tags: product.tags,
      last_sync: product.last_sync ? String(product.last_sync) : null,
      created_at: product.created_at ? String(product.created_at) : undefined,
      updated_at: product.updated_at ? String(product.updated_at) : undefined,
      intended_form: product.intended_form || null,
      intended_presentation: product.intended_presentation || null,
      intended_units_per_dose: product.intended_units_per_dose || null,
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
    target_audience?: ProductTargetAudience | null
    markup?: number | null
    sku?: string
    quantity?: string | null
    meta_title?: string | null
    meta_description?: string | null
    tags?: string | null
    intended_form?: string | null
    intended_presentation?: string | null
    intended_units_per_dose?: string | null
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
   * Busca todos os produtos (incluindo inativos) - retorna dados brutos para exportação/admin
   */
  async getAllForAdminRaw(): Promise<BackendProduct[]> {
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

      return data.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Obtém o relatório de produtos em formato PDF binário/blob (admin)
   */
  async getPdfReportBlob(): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/pdf-report`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao gerar relatório em PDF';
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      return await response.blob();
    } catch (error: any) {
      if (error.message) {
        throw error;
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
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
    supplier_id?: string | null
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
    target_audience?: ProductTargetAudience | null
    markup?: number | null
    sku?: string
    quantity?: string | null
    meta_title?: string | null
    meta_description?: string | null
    tags?: string | null
    intended_form?: string | null
    intended_presentation?: string | null
    intended_units_per_dose?: string | null
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

  async assignSupplierBulk(ids: string[], supplierId: string | null): Promise<{ success: boolean; message: string; updated: number }> {
    const response = await fetch(`${this.baseUrl}/admin/bulk-supplier`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ids, supplierId }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao vincular fornecedor aos produtos')
    return data
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
   * Aplica margem mínima para produtos abaixo da meta
   */
  async applyMinimumMargin(
    margin: number,
    roundingMode: 'cents_up' | 'commercial_90_up' | 'commercial_99_up'
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/apply-minimum-margin`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ margin, roundingMode }),
      })
      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao aplicar margem mínima')
      return data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao aplicar margem mínima.')
    }
  }

  async roundPricesByMargin(
    threshold: number,
    ids?: string[],
    preview: boolean = false
  ): Promise<{
    success: boolean
    message: string
    data: {
      updatedCount: number
      roundedDown: number
      roundedUp: number
      unchanged: number
      skippedWithoutCost: number
      skippedPromoConflict: number
      endingCounts?: { '00': number; '50': number; '90': number; '99': number }
      updatedProducts: Array<{
        id: string
        name: string
        oldPrice: number
        newPrice: number
        margin: number
        direction: 'up' | 'down'
      }>
    }
  }> {
    const response = await fetch(`${this.baseUrl}/admin/round-prices-by-margin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ threshold, ids, preview }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao arredondar preços por margem')
    return data
  }

  /**
   * Busca a quantidade de pedidos para uma lista de IDs de produtos (apenas admin)
   */
  async checkProductsOrders(productIds: string[]): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/check-orders`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ productIds }),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.message || 'Erro ao verificar pedidos dos produtos')
      return data.data || {}
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao verificar pedidos dos produtos.')
    }
  }
}

export const productsService = new ProductsService()

