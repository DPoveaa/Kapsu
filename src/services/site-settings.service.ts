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
  }
  theme_colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  banner_height_mobile?: number
  banner_height_desktop?: number
  header_bar_bg_color?: string
  header_bar_bg_color_dark?: string
  chatbot_enabled?: boolean
  whatsapp_number?: string
  google_merchant_sync_enabled?: boolean
  google_sheets_sync_enabled?: boolean
  google_sheets_id?: string
  google_sheets_range?: string
  human_support_settings?: any
  kaia_long_term_memory_enabled?: boolean
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
  private settingsPromise: Promise<SiteSettings> | null = null
  private settingsCache: { value: SiteSettings; expiresAt: number } | null = null
  private getAuthHeaders() {
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Obtém todas as configurações do site
   */
  async getSettings(): Promise<SiteSettings> {
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token')
    if (!token && this.settingsCache && this.settingsCache.expiresAt > Date.now()) return this.settingsCache.value
    if (!token && this.settingsPromise) return this.settingsPromise
    const request = (async () => {
      const response = await fetch(`${API_URL}/site-settings`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error('Erro ao obter configurações')
      const data: SiteSettingsResponse = await response.json()
      if (!token) this.settingsCache = { value: data.settings, expiresAt: Date.now() + 60_000 }
      return data.settings
    })()
    if (token) return request
    this.settingsPromise = request
    try { return await request } finally { this.settingsPromise = null }
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
      // Se for 404, a configuração não existe ainda - isso é normal
      if (response.status === 404) {
        return null
      }
      throw new Error('Erro ao obter configuração')
    }

    const data = await response.json()
    return data.setting.value
  }

  /**
   * Atualiza configurações do site (apenas admin)
   */
  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token')
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente para salvar as configurações.')
    }
    const headers = this.getAuthHeaders()
    let response = await fetch(`${API_URL}/site-settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ settings }),
    })

    if (response.status === 405 || response.status === 404) {
      response = await fetch(`${API_URL}/site-settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings }),
      })
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar configurações')
    }

    const updated = await this.getSettings()
    this.publishSettings(updated)
    return updated
  }

  publishSettings(settings: SiteSettings): void {
    localStorage.setItem('site_settings', JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: settings }))
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

  private async parseJsonResponse(response: Response, fallbackMessage: string): Promise<any> {
    const text = await response.text()

    try {
      return JSON.parse(text)
    } catch {
      if (response.status === 504 || response.status === 502) {
        throw new Error(
          'A sincronização demorou demais e o servidor encerrou a conexão. Verifique os logs da API — os produtos podem ter sido enviados mesmo assim.'
        )
      }

      throw new Error(`${fallbackMessage} (resposta inválida do servidor, HTTP ${response.status}).`)
    }
  }

  /**
   * Sincroniza todos os produtos com o Google Merchant Center (apenas admin)
   */
  async syncAllMerchantProducts(): Promise<{ success: boolean; message: string; data?: { synced?: number; failed?: number; errors?: string[]; status?: string } }> {
    const response = await fetch(`${API_URL}/admin/merchant/sync-all`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })

    const data = await this.parseJsonResponse(
      response,
      'Erro ao sincronizar produtos com o Google Merchant Center'
    )

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao sincronizar produtos com Google Merchant Center')
    }

    if (data?.data?.failed > 0) {
      const details = Array.isArray(data.data.errors)
        ? data.data.errors.slice(0, 5).join('\n')
        : ''
      const suffix = data.data.errors?.length > 5
        ? `\n...e mais ${data.data.errors.length - 5} erro(s).`
        : ''

      throw new Error(`${data.message || 'Sincronização concluída com falhas.'}${details ? `\n${details}${suffix}` : ''}`)
    }

    return data
  }

  /**
   * Sincroniza todos os produtos com a planilha do Google Sheets (apenas admin)
   */
  async syncAllGoogleSheetsProducts(): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await fetch(`${API_URL}/admin/google-sheets/sync`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })

    const data = await this.parseJsonResponse(
      response,
      'Erro ao sincronizar produtos com o Google Sheets'
    )

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao sincronizar produtos com Google Sheets')
    }

    return data
  }
}

export const siteSettingsService = new SiteSettingsService()
