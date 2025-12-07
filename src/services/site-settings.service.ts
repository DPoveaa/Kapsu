import { env } from '../config/env'

const API_URL = env.apiUrl

export interface SiteSettings {
  site_name?: string
  site_description?: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  social_media?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  theme_colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}

export interface SiteSettingsResponse {
  success: boolean
  settings: SiteSettings
}

export interface UpdateSettingsResponse {
  success: boolean
  message: string
}

export interface UploadLogoResponse {
  success: boolean
  message: string
  logoUrl: string
}

class SiteSettingsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as configurações do site
   */
  async getSettings(): Promise<SiteSettings> {
    const response = await fetch(`${API_URL}/site-settings`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter configurações')
    }

    const data: SiteSettingsResponse = await response.json()
    return data.settings
  }

  /**
   * Obtém uma configuração específica
   */
  async getSetting(key: string): Promise<any> {
    const response = await fetch(`${API_URL}/site-settings/${key}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Erro ao obter configuração')
    }

    const data = await response.json()
    return data.setting.value
  }

  /**
   * Atualiza configurações do site (apenas admin)
   */
  async updateSettings(settings: Partial<SiteSettings>): Promise<void> {
    const response = await fetch(`${API_URL}/site-settings`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ settings }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar configurações')
    }
  }

  /**
   * Faz upload da logo do site (apenas admin)
   */
  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('logo', file)

    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/site-settings/upload-logo`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao fazer upload da logo')
    }

    const data: UploadLogoResponse = await response.json()
    return data.logoUrl
  }

  /**
   * Remove a logo do site (apenas admin)
   */
  async deleteLogo(): Promise<void> {
    const response = await fetch(`${API_URL}/site-settings/logo`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover logo')
    }
  }
}

export const siteSettingsService = new SiteSettingsService()

