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
   * Converte produto do backend para o formato do frontend
   */
  private mapProduct(product: BackendProduct): Product {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      image: product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
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

