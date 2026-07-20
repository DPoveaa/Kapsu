import { env } from '../config/env'
import { BANNER_IMAGE_FALLBACK } from '../utils/imageFallback'
import { getImageUrl, normalizeImagePath } from '../utils/imageUrl'

const API_URL = env.apiUrl

export interface Banner {
  id: string
  image_url: string
  mobile_image_url?: string | null
  title?: string
  subtitle?: string
  link?: string
  order: number
  active: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateBannerData {
  image_url: string
  mobile_image_url?: string | null
  title?: string
  subtitle?: string
  link?: string
  order?: number
  active?: boolean
}

export interface UpdateBannerData {
  image_url?: string
  mobile_image_url?: string | null
  title?: string
  subtitle?: string
  link?: string
  order?: number
  active?: boolean
}

interface BannersResponse {
  success: boolean
  data: Banner[]
  message?: string
}

interface BannerResponse {
  success: boolean
  data: Banner
  message?: string
}

class BannersService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Converte URL de imagem relativa para URL completa
   * Funciona tanto localmente quanto no servidor
   * Usa função utilitária compartilhada para garantir consistência
   */
  private convertImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl || imageUrl.trim() === '') {
      return BANNER_IMAGE_FALLBACK
    }

    const url = getImageUrl(imageUrl)
    return url || BANNER_IMAGE_FALLBACK
  }

  /**
   * Obtém todos os banners (público - apenas ativos)
   */
  async getAll(includeInactive: boolean = false): Promise<Banner[]> {
    const url = includeInactive 
      ? `${API_URL}/banners?include_inactive=true`
      : `${API_URL}/banners`
    
    const token = localStorage.getItem('token') || localStorage.getItem('sanare_token')
    const response = await fetch(url, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined })

    if (!response.ok) {
      throw new Error('Erro ao obter banners')
    }

    const data: BannersResponse = await response.json()
    const banners = data.data || []
    
    // Converte URLs relativas para URLs completas
    return banners.map(banner => ({
      ...banner,
      image_url: this.convertImageUrl(banner.image_url),
      mobile_image_url: banner.mobile_image_url ? this.convertImageUrl(banner.mobile_image_url) : null
    }))
  }

  /**
   * Obtém um banner específico por ID
   */
  async getById(id: string): Promise<Banner> {
    const response = await fetch(`${API_URL}/banners/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter banner')
    }

    const data: BannerResponse = await response.json()
    return {
      ...data.data,
      image_url: this.convertImageUrl(data.data.image_url),
      mobile_image_url: data.data.mobile_image_url ? this.convertImageUrl(data.data.mobile_image_url) : null
    }
  }

  /**
   * Cria um novo banner (apenas admin)
   */
  async create(bannerData: CreateBannerData): Promise<Banner> {
    const response = await fetch(`${API_URL}/banners`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(bannerData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar banner')
    }

    const data: BannerResponse = await response.json()
    return data.data
  }

  /**
   * Atualiza um banner (apenas admin)
   */
  async update(id: string, bannerData: UpdateBannerData): Promise<Banner> {
    const response = await fetch(`${API_URL}/banners/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(bannerData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar banner')
    }

    const data: BannerResponse = await response.json()
    return data.data
  }

  /**
   * Deleta um banner (apenas admin)
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/banners/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao deletar banner')
    }
  }

  /**
   * Faz upload de imagem do banner (apenas admin)
   * Retorna o caminho relativo para ser salvo no banco
   */
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)

    const token = localStorage.getItem('token') || localStorage.getItem('sanare_token')
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 45000)

    let response: Response
    try {
      response = await fetch(`${API_URL}/upload/banner-image`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        signal: controller.signal,
      })
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Tempo esgotado ao enviar a imagem. Verifique sua conexão e tente novamente.')
      }
      throw new Error(error?.message || 'Erro de conexão ao enviar a imagem')
    } finally {
      window.clearTimeout(timeoutId)
    }

    const text = await response.text()
    let data: any = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || 'Erro ao fazer upload da imagem')
    }

    const imagePath = data?.data?.path || data?.data?.url
    if (!imagePath) {
      throw new Error('O servidor não retornou o caminho da imagem enviada')
    }

    return normalizeImagePath(imagePath)
  }

  /**
   * Reordena banners (apenas admin)
   */
  async reorder(bannerIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/banners/reorder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ banner_ids: bannerIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao reordenar banners')
    }
  }
}

export const bannersService = new BannersService()
