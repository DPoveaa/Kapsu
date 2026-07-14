import { env } from '../config/env'

const API_URL = env.apiUrl

export type IntegrationType = 'ADMIN' | 'FORNECEDOR'

export interface GoogleSheetsIntegration {
  id: string
  name: string
  type: IntegrationType
  spreadsheet_id: string
  enabled: boolean
  bidirectional: boolean
  share_email: string
  share_role: string
  connection_status: string
  last_sync: string | null
  last_error: string | null
  auto_created: boolean
  watch_channel_active: boolean
  watch_channel_id: string | null
  watch_expiration: string | null
  synced_fields: string[]
  tabs: string[]
  synced_products_count?: number
  trigger_token?: string
  api_url?: string
}

export interface GoogleSheetsOAuthStatus {
  oauth_env_configured: boolean
  oauth_connected: boolean
  connected_email: string | null
  connected_at: string | null
  missing_env_vars: string[]
  google_sheets_tech_configured?: boolean
}

export interface GoogleSheetsGlobalConfig {
  integrations: GoogleSheetsIntegration[]
  google_sheets_tech_configured: boolean
  oauth?: GoogleSheetsOAuthStatus
  google_sheets_sync_enabled?: boolean
  google_sheets_id?: string
  google_sheets_bidirectional_enabled?: boolean
  google_sheets_share_email?: string
  google_sheets_share_role?: string
  google_sheets_connection_status?: string
  google_sheets_last_sync?: string | null
  synced_products_count?: number
  last_error?: string | null
}

export interface GoogleSheetsSyncLog {
  id: string
  integration_id?: string | null
  started_at: string
  completed_at: string | null
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL'
  direction: string
  processed_count: number
  created_count: number
  updated_count: number
  failed_count: number
  details: string
}

export interface GoogleSheetsQueueStatus {
  counts: {
    pending: number
    processing: number
    completed: number
    failed: number
    cancelled: number
  }
  lastProcessedAt: string | null
  lastError: string | null
  avgExecutionTime: number
  config: {
    google_sheets_queue_max_attempts: string
    google_sheets_queue_retry_interval: string
    google_sheets_queue_cleanup_days: string
    google_sheets_queue_batch_size: string
    google_sheets_queue_max_processing_time: string
  }
  recentJobs: Array<{
    id: string
    job_type: string
    integration_id: string | null
    integration_name?: string | null
    integration_type?: string | null
    entity_id: string | null
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    attempts: number
    max_attempts: number
    created_at: string
    finished_at: string | null
    last_error: string | null
  }>
}

class GoogleSheetsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async parseJsonResponse(response: Response, defaultError: string) {
    try {
      return await response.json()
    } catch {
      throw new Error(defaultError)
    }
  }

  async listIntegrations(): Promise<GoogleSheetsGlobalConfig> {
    const response = await fetch(`${API_URL}/admin/google-sheets/integrations`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao listar integrações')
    if (!response.ok) throw new Error(data.message || 'Erro ao listar integrações')
    return data.data
  }

  async getIntegration(id: string): Promise<GoogleSheetsIntegration> {
    const response = await fetch(`${API_URL}/admin/google-sheets/integrations/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao carregar integração')
    if (!response.ok) throw new Error(data.message || 'Erro ao carregar integração')
    return data.data
  }

  async createIntegration(payload: {
    name: string
    type: IntegrationType
    share_email?: string
    share_role?: string
    bidirectional?: boolean
    enabled?: boolean
    auto_create_sheet?: boolean
  }): Promise<{ success: boolean; message: string; data: GoogleSheetsIntegration & { url?: string } }> {
    const response = await fetch(`${API_URL}/admin/google-sheets/integrations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao criar integração')
    if (!response.ok) throw new Error(data.message || 'Erro ao criar integração')
    return data
  }

  async updateIntegration(id: string, payload: Partial<GoogleSheetsIntegration>): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/admin/google-sheets/integrations/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao atualizar integração')
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar integração')
    return data
  }

  async deleteIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/admin/google-sheets/integrations/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao excluir integração')
    if (!response.ok) throw new Error(data.message || 'Erro ao excluir integração')
    return data
  }

  async enableIntegration(id: string) {
    return this.postAction(`/integrations/${id}/enable`, 'Erro ao ativar integração')
  }

  async disableIntegration(id: string) {
    return this.postAction(`/integrations/${id}/disable`, 'Erro ao desativar integração')
  }

  async testConnection(id: string) {
    return this.postAction(`/integrations/${id}/test-connection`, 'Erro ao testar conexão')
  }

  async createSheet(id: string) {
    return this.postAction(`/integrations/${id}/create-sheet`, 'Erro ao criar planilha')
  }

  async syncIntegration(id: string) {
    return this.postAction(`/integrations/${id}/sync`, 'Erro ao sincronizar')
  }

  async recreateStructure(id: string) {
    return this.postAction(`/integrations/${id}/recreate-structure`, 'Erro ao recriar estrutura')
  }

  async disconnectIntegration(id: string) {
    return this.postAction(`/integrations/${id}/disconnect`, 'Erro ao desconectar')
  }

  private async postAction(path: string, defaultError: string) {
    const response = await fetch(`${API_URL}/admin/google-sheets${path}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, defaultError)
    if (!response.ok) throw new Error(data.message || defaultError)
    return data
  }

  async syncAllProducts(): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await fetch(`${API_URL}/admin/google-sheets/sync`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao sincronizar')
    if (!response.ok) throw new Error(data.message || 'Erro ao sincronizar')
    return data
  }

  async getSyncLogs(page = 1, limit = 20, integrationId?: string) {
    const query = integrationId ? `&integration_id=${integrationId}` : ''
    const response = await fetch(`${API_URL}/admin/google-sheets/logs?page=${page}&limit=${limit}${query}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao carregar logs')
    if (!response.ok) throw new Error(data.message || 'Erro ao carregar logs')
    return {
      logs: data.data as GoogleSheetsSyncLog[],
      total: data.pagination.total,
      pages: data.pagination.pages,
    }
  }

  async getQueueStatus(): Promise<GoogleSheetsQueueStatus> {
    const response = await fetch(`${API_URL}/admin/google-sheets/queue/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao carregar fila')
    if (!response.ok) throw new Error(data.message || 'Erro ao carregar fila')
    return data.data
  }

  async processQueueNow() {
    return this.postAction('/queue/process', 'Erro ao processar fila')
  }

  async cleanupQueueHistory() {
    return this.postAction('/queue/cleanup', 'Erro ao limpar fila')
  }

  async clearFinishedQueue() {
    return this.postAction('/queue/clear-finished', 'Erro ao limpar tarefas finalizadas')
  }

  async saveQueueConfig(payload: Record<string, number>) {
    const response = await fetch(`${API_URL}/admin/google-sheets/queue/config`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao salvar configurações da fila')
    if (!response.ok) throw new Error(data.message || 'Erro ao salvar configurações da fila')
    return data
  }

  async cancelQueueJob(id: string) {
    const response = await fetch(`${API_URL}/admin/google-sheets/queue/jobs/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao cancelar tarefa da fila')
    if (!response.ok) throw new Error(data.message || 'Erro ao cancelar tarefa da fila')
    return data
  }

  async getOAuthStatus(): Promise<GoogleSheetsOAuthStatus> {
    const response = await fetch(`${API_URL}/admin/google-sheets/oauth/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao carregar status OAuth')
    if (!response.ok) throw new Error(data.message || 'Erro ao carregar status OAuth')
    return data.data
  }

  async getOAuthAuthorizeUrl(): Promise<string> {
    const response = await fetch(`${API_URL}/admin/google-sheets/oauth/authorize-url`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao obter URL de autorização')
    if (!response.ok) throw new Error(data.message || 'Erro ao obter URL de autorização')
    return data.data.url
  }

  async disconnectOAuth(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/admin/google-sheets/oauth/disconnect`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })
    const data = await this.parseJsonResponse(response, 'Erro ao desconectar conta Google')
    if (!response.ok) throw new Error(data.message || 'Erro ao desconectar conta Google')
    return data
  }
}

export const googleSheetsService = new GoogleSheetsService()
