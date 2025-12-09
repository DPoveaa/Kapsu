import { env } from '../config/env'
import { Product } from '../types'

const API_URL = env.apiUrl

// Tipo do produto vindo do backend
interface BackendProduct {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  image: string | null
  category: string | null
  active: boolean
  compositions: string | null
  indication: string | null
  contraindication: string | null
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

  /**
   * Converte URL de imagem relativa para URL completa
   */
  private getImageUrl(image: string | null): string {
    // Imagem padrão placeholder
    const defaultImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
    
    if (!image || image.trim() === '') {
      return defaultImage
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
      return defaultImage
    }

    // Se já é uma URL completa (http:// ou https://), retorna como está
    if (isUrl) {
      return trimmedImage
    }

    // Se é um caminho relativo (começa com /), converte para URL completa
    if (isPath) {
      // Remove a barra inicial e adiciona a URL da API
      return `${API_URL.replace('/api', '')}${trimmedImage}`
    }

    // Se não começa com /, assume que é um caminho relativo e adiciona /uploads/products/
    return `${API_URL.replace('/api', '')}/uploads/products/${trimmedImage}`
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
      image: this.getImageUrl(product.image),
      category: (product.category as Product['category']) || 'outros',
      inStock: product.stock > 0,
      isCustomizable: true, // Por padrão, assumimos que todos são customizáveis
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
    stock?: number
    image?: string
    category?: string
    compositions?: string
    indication?: string
    contraindication?: string
  }): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * Busca um produto por ID (incluindo inativo) - para admin
   */
  async getByIdForAdmin(id: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/${id}`, {
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
   * Busca um produto por ID (incluindo inativo) - retorna dados brutos do backend
   */
  async getByIdForAdminRaw(id: string): Promise<BackendProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/${id}`, {
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
    stock?: number
    image?: string
    category?: string
    active?: boolean
    compositions?: string
    indication?: string
    contraindication?: string
  }): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
  async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao excluir produto')
      }
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }
}

export const productsService = new ProductsService()

