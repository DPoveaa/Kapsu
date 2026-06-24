import { env } from '../config/env'

const API_URL = env.apiUrl

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'QRCODE_GENERATED'

export interface WhatsAppStatus {
  success: boolean
  status: ConnectionStatus
  connected: boolean
  message: string
  qrCode?: string // QR Code opcional (quando disponível)
}

export interface QRCodeResponse {
  success: boolean
  status: ConnectionStatus
  connected: boolean
  qrCode?: string
  message: string
}

export interface SendMessageRequest {
  phone: string
  message: string
}

export interface SendMessageResponse {
  success: boolean
  data: {
    messageId: string
    phone: string
    message: string
  }
  message: string
}

class WhatsAppService {
  private baseUrl = `${API_URL}/whatsapp`

  /**
   * Helper para chamadas com autenticação Bearer
   */
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
    const headers = new Headers(options.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })
  }

  /**
   * Inicializa o WhatsApp e gera QR Code
   */
  async initialize(): Promise<QRCodeResponse> {
    try {
      const response = await this.fetchWithAuth('/initialize', {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao inicializar WhatsApp')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao inicializar WhatsApp')
    }
  }

  /**
   * Obtém o QR Code para conectar
   */
  async getQRCode(): Promise<QRCodeResponse> {
    try {
      const response = await this.fetchWithAuth('/qrcode')
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter QR Code')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter QR Code')
    }
  }

  /**
   * Regenera o QR Code
   */
  async regenerateQRCode(): Promise<QRCodeResponse> {
    try {
      const response = await this.fetchWithAuth('/regenerate-qrcode', {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao regenerar QR Code')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao regenerar QR Code')
    }
  }

  /**
   * Verifica o status da conexão
   */
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await this.fetchWithAuth('/status')
      if (!response.ok) {
        throw new Error('Erro ao verificar status')
      }
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      return JSON.parse(text)
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao verificar status')
    }
  }

  /**
   * Envia uma mensagem
   */
  async sendMessage(phone: string, message: string): Promise<SendMessageResponse> {
    try {
      const response = await this.fetchWithAuth('/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar mensagem')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao enviar mensagem')
    }
  }

  /**
   * Envia uma mensagem de teste de venda
   */
  async sendTestSaleMessage(phone: string): Promise<SendMessageResponse> {
    try {
      const response = await this.fetchWithAuth('/test-sale-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar mensagem de teste de venda')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao enviar mensagem de teste de venda')
    }
  }

  /**
   * Envia mídia
   */
  async sendMedia(
    phone: string, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    filename?: string
  ): Promise<SendMessageResponse> {
    try {
      const response = await this.fetchWithAuth('/send-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, mediaUrl, mediaType, caption, filename }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar mídia')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao enviar mídia')
    }
  }

  /**
   * Configura webhook
   */
  async setupWebhook(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth('/webhook', {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error('Erro ao configurar webhook')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao configurar webhook')
    }
  }

  /**
   * Desconecta e remove a sessão do WhatsApp
   */
  async disconnect(): Promise<WhatsAppStatus> {
    try {
      const response = await this.fetchWithAuth('/disconnect', {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao desconectar WhatsApp')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao desconectar WhatsApp')
    }
  }

  /**
   * Obtém todas as conversas
   */
  async getConversations(): Promise<{ success: boolean; conversations: any[] }> {
    try {
      const response = await this.fetchWithAuth('/conversations')
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter conversas')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter conversas')
    }
  }

  /**
   * Obtém conversas que precisam de resposta (fila de atendimento)
   */
  async getConversationsNeedingResponse(): Promise<{ success: boolean; conversations: any[]; count: number }> {
    try {
      const response = await this.fetchWithAuth('/conversations/needing-response')
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter conversas que precisam de resposta')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter conversas que precisam de resposta')
    }
  }

  /**
   * Obtém mensagens de uma conversa específica
   */
  async getConversationMessages(phone: string): Promise<{ success: boolean; messages: any[] }> {
    try {
      const response = await this.fetchWithAuth(`/conversations/${encodeURIComponent(phone)}`)
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter mensagens')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter mensagens')
    }
  }

  /**
   * Força o carregamento de conversas existentes
   */
  async loadChats(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const response = await this.fetchWithAuth('/conversations/load', {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar conversas')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao carregar conversas')
    }
  }

  /**
   * Marca conversa como lida
   */
  async markConversationAsRead(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth('/conversations/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao marcar conversa como lida')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao marcar conversa como lida')
    }
  }

  /**
   * Obtém contagem de conversas que precisam de intervenção
   */
  async getInterventionCount(): Promise<{
    success: boolean
    total: number
    needsPharmacist: number
    needsResponse: number
  }> {
    try {
      const response = await this.fetchWithAuth('/conversations/intervention-count', {
        method: 'GET',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter contagem de intervenções')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao obter contagem de intervenções')
    }
  }

  /**
   * Marca uma conversa como assumida (bloqueia a IA)
   */
  async markConversationAsAssumed(phone: string, assumedBy?: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth('/conversations/mark-assumed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone,
          assumedBy: assumedBy || 'Administrador',
          reason: reason || 'Conversa assumida manualmente'
        }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao marcar conversa como assumida')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao marcar conversa como assumida')
    }
  }

  /**
   * Desmarca uma conversa como assumida (libera para a IA)
   */
  async unmarkConversationAsAssumed(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth('/conversations/unmark-assumed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao desmarcar conversa como assumida')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão ao desmarcar conversa como assumida')
    }
  }

  /**
   * Testa o processamento de uma mensagem pela IA
   */
  async testAI(
    message: string, 
    phone?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }>
  ): Promise<{
    success: boolean
    data: {
      extractedMessage: any
      aiResponse: string | null
      isControlled: boolean
      controlledSubstance: string | null
      needsPharmacist: boolean
      infoMessage: string | null
      confirmationMessage: string | null
      wouldNotifyPharmacist: boolean
      processingDetails?: {
        extractionTime: number
        hasExtractedMessage: boolean
        extractedIntent: string | null
        extractedEntities: any
        aiResponseGenerated: boolean
        aiResponseLength: number
      }
      purchaseLink?: string | null
      cartInfo?: {
        itemCount: number
        total: number
        items?: Array<{ name: string; quantity: number; price: number }>
      } | null
    }
  }> {
    try {
      const response = await this.fetchWithAuth('/test-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, phone, conversationHistory }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao testar IA')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro ao testar IA: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Chat do site - usa a mesma IA mas para clientes no site
   */
  async siteChat(
    message: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }>,
    cartInfo?: { itemCount: number; total: number; items?: Array<{ name: string; quantity: number; price: number }> } | null,
    userId?: string,
    isAuthenticated?: boolean,
    userInfo?: { id: string; name: string; email: string; phone?: string } | undefined
  ): Promise<{
    success: boolean
    data: {
      extractedMessage: any
      aiResponse: string | null
      isControlled: boolean
      controlledSubstance: string | null
      needsPharmacist: boolean
      infoMessage: string | null
      confirmationMessage: string | null
      wouldNotifyPharmacist: boolean
      processingDetails?: {
        extractionTime: number
        hasExtractedMessage: boolean
        extractedIntent: string | null
        extractedEntities: any
        aiResponseGenerated: boolean
        aiResponseLength: number
      }
      purchaseLink?: string | null
      cartInfo?: {
        itemCount: number
        total: number
        items?: Array<{ name: string; quantity: number; price: number }>
      } | null
    }
  }> {
    try {
      // Público - não usa fetchWithAuth
      const response = await fetch(`${this.baseUrl}/site-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message, 
          conversationHistory: conversationHistory || [],
          cartInfo: cartInfo || null,
          userId: userId || undefined,
          isAuthenticated: isAuthenticated || false,
          userInfo: userInfo || undefined
        }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar mensagem')
      }
      return data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro ao processar mensagem')
    }
  }

  /**
   * Lista todos os números de farmacêuticos configurados
   */
  async getPharmacistNumbers(): Promise<Array<{
    id: string
    phone: string
    name: string | null
    userId: string | null
    userEmail: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/pharmacist-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao buscar números de farmacêuticos')
      }

      const data = await response.json()
      return data.pharmacistNumbers || []
    } catch (error: any) {
      throw new Error('Erro ao buscar números de farmacêuticos: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Adiciona um novo número de farmacêutico
   */
  async addPharmacistNumber(phone: string, userId?: string, name?: string): Promise<{
    id: string
    phone: string
    name: string | null
    userId: string | null
    userEmail: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/pharmacist-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, userId, name }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao adicionar número de farmacêutico')
      }

      const data = await response.json()
      return data.pharmacistNumber
    } catch (error: any) {
      throw new Error('Erro ao adicionar número de farmacêutico: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Remove um número de farmacêutico
   */
  async removePharmacistNumber(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/pharmacist-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao remover número de farmacêutico')
      }
    } catch (error: any) {
      throw new Error('Erro ao remover número de farmacêutico: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Lista usuários do sistema que têm telefone cadastrado
   */
  async getUsersWithPhone(): Promise<Array<{
    id: string
    name: string
    email: string
    phone: string
  }>> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/users-with-phone`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao buscar usuários')
      }

      const data = await response.json()
      return data.users || []
    } catch (error: any) {
      throw new Error('Erro ao buscar usuários: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Testa a notificação do farmacêutico (para interface de teste)
   */
  async testNotifyPharmacist(phone: string, message: string, controlledSubstance: string, extractedMessage?: any, originalMessage?: string): Promise<{
    success: boolean
    message: string
    notifiedNumbers: Array<{ phone: string; name: string | null }>
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/test-notify-pharmacist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          message,
          controlledSubstance,
          extractedMessage,
          originalMessage, // Mensagem original que iniciou o processo
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao notificar farmacêutico')
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      throw new Error('Erro ao notificar farmacêutico: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Reseta a sessão de teste de IA (limpa carrinho, contexto, etc.)
   * Útil para simular um cliente totalmente novo
   */
  async resetTestSession(phone: string): Promise<{
    success: boolean
    message: string
    deleted: {
      carts: number
      context: boolean
      conversation: boolean
    }
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/reset-test-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao resetar sessão de teste')
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      throw new Error('Erro ao resetar sessão de teste: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Lista números permitidos para receber respostas automáticas da IA
   */
  async getAllowedAINumbers(): Promise<Array<{
    id: string
    phone: string
    description: string | null
    addedBy: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/allowed-ai-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido ou expirado
          localStorage.removeItem('token')
          throw new Error('Sessão expirada. Faça login novamente.')
        }
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao buscar números permitidos')
      }

      const data = await response.json()
      return data.allowedNumbers || []
    } catch (error: any) {
      throw new Error('Erro ao buscar números permitidos: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Adiciona um número à lista de permitidos para receber respostas automáticas da IA
   */
  async addAllowedAINumber(phone: string, description?: string): Promise<{
    id: string
    phone: string
    description: string | null
    addedBy: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/allowed-ai-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, description }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido ou expirado - não remove automaticamente, deixa o componente decidir
          const errorData = await response.json().catch(() => ({ message: 'Sessão expirada. Faça login novamente.' }))
          throw new Error(errorData.message || 'Sessão expirada. Faça login novamente.')
        }
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao adicionar número permitido')
      }

      const data = await response.json()
      return data.allowedNumber
    } catch (error: any) {
      throw new Error('Erro ao adicionar número permitido: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Remove um número da lista de permitidos
   */
  async removeAllowedAINumber(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.')
      }

      const response = await fetch(`${this.baseUrl}/allowed-ai-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido ou expirado - não remove automaticamente, deixa o componente decidir
          const errorData = await response.json().catch(() => ({ message: 'Sessão expirada. Faça login novamente.' }))
          throw new Error(errorData.message || 'Sessão expirada. Faça login novamente.')
        }
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao remover número permitido')
      }
    } catch (error: any) {
      throw new Error('Erro ao remover número permitido: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Verifica se um número está na lista de permitidos (busca por telefone)
   */
  async isNumberAllowed(phone: string): Promise<{
    isAllowed: boolean
    allowedNumber?: {
      id: string
      phone: string
      description: string | null
      isActive: boolean
    }
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      if (!token) {
        // Se não tem token, retorna false silenciosamente (não é erro crítico)
        return { isAllowed: false }
      }

      const allowedNumbers = await this.getAllowedAINumbers()
      // Normaliza o telefone (remove caracteres não numéricos)
      const normalizedPhone = phone.replace(/\D/g, '')
      
      const found = allowedNumbers.find(num => {
        const normalizedNum = num.phone.replace(/\D/g, '')
        return normalizedNum === normalizedPhone && num.isActive
      })

      return {
        isAllowed: !!found,
        allowedNumber: found ? {
          id: found.id,
          phone: found.phone,
          description: found.description,
          isActive: found.isActive,
        } : undefined,
      }
    } catch (error: any) {
      // Em caso de erro (incluindo 401), retorna false silenciosamente (não é erro crítico)
      // Não queremos que erros de autenticação quebrem a interface
      console.warn('Erro ao verificar número permitido:', error.message)
      return { isAllowed: false }
    }
  }

  /**
   * Lista todos os números da distribuidora configurados
   */
  async getDistributorNumbers(): Promise<Array<{
    id: string
    phone: string
    name: string | null
    userId: string | null
    userEmail: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/distributor-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao buscar números da distribuidora')
      }

      const data = await response.json()
      return data.distributorNumbers || []
    } catch (error: any) {
      throw new Error('Erro ao buscar números da distribuidora: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Adiciona um novo número da distribuidora
   */
  async addDistributorNumber(phone: string, userId?: string, name?: string): Promise<{
    id: string
    phone: string
    name: string | null
    userId: string | null
    userEmail: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/distributor-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, userId, name }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao adicionar número da distribuidora')
      }

      const data = await response.json()
      return data.distributorNumber
    } catch (error: any) {
      throw new Error('Erro ao adicionar número da distribuidora: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Remove um número da distribuidora
   */
  async removeDistributorNumber(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('sanare_token')
      const response = await fetch(`${this.baseUrl}/distributor-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        throw new Error(errorData.message || 'Erro ao remover número da distribuidora')
      }
    } catch (error: any) {
      throw new Error('Erro ao remover número da distribuidora: ' + (error.message || 'Erro desconhecido'))
    }
  }

  /**
   * Envia uma mensagem de teste para todos os números da distribuidora ativos
   */
  async sendTestDistributorMessage(message?: string): Promise<{ success: boolean; message: string; notifiedNumbers: any[] }> {
    try {
      const response = await this.fetchWithAuth('/test-distributor-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar mensagem de teste para a distribuidora')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao enviar mensagem de teste para a distribuidora')
    }
  }

  /**
   * Envia notificação de pedido simulado para a distribuidora (sem valores, foco em logística)
   */
  async sendDistributorOrderNotification(): Promise<{ success: boolean; message: string; notifiedNumbers: any[]; orderId?: string }> {
    try {
      const response = await this.fetchWithAuth('/distributor-order-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar notificação de pedido para a distribuidora')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao enviar notificação de pedido para a distribuidora')
    }
  }

  /**
   * Obtém todas as mensagens que falharam no envio
   */
  async getFailedMessages(): Promise<{ success: boolean; failedMessages: any[] }> {
    try {
      const response = await this.fetchWithAuth('/failed-messages')
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter mensagens falhas')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao obter mensagens falhas')
    }
  }

  /**
   * Reenvia uma mensagem falha específica
   */
  async retryFailedMessage(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth(`/failed-messages/${id}/retry`, {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao reenviar mensagem')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao reenviar mensagem')
    }
  }

  /**
   * Reenvia todas as mensagens falhas
   */
  async retryAllFailedMessages(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth('/failed-messages/retry-all', {
        method: 'POST',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao iniciar reenvio de todas as mensagens')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao reenviar todas as mensagens')
    }
  }

  /**
   * Deleta uma mensagem falha da lista
   */
  async deleteFailedMessage(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth(`/failed-messages/${id}`, {
        method: 'DELETE',
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao remover mensagem falha')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao remover mensagem falha')
    }
  }

  /**
   * Obtém a configuração de reenvio
   */
  async getRetrySettings(): Promise<{ success: boolean; mode: 'manual' | 'auto' }> {
    try {
      const response = await this.fetchWithAuth('/retry-settings')
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter configurações de reenvio')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao obter configurações de reenvio')
    }
  }

  /**
   * Atualiza a configuração de reenvio
   */
  async updateRetrySettings(mode: 'manual' | 'auto'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.fetchWithAuth('/retry-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      })
      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }
      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar configurações de reenvio')
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Erro de conexão ao atualizar configurações de reenvio')
    }
  }

  /**
   * Site Chat: Envia mensagem
   */
  async sendSiteMessage(
    message: string,
    userId?: string,
    cartInfo?: any,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }>,
    isAuthenticated?: boolean,
    userInfo?: { id: string; name: string; email: string; phone?: string },
    notificationChoice?: {
      type: 'notification_preference_choice';
      channel?: 'email' | 'whatsapp';
      notificationType: string;
      action: string;
      source?: string;
    }
  ): Promise<any> {
    const sessionId = localStorage.getItem('sanare_site_session') || '';
    try {
      const token = localStorage.getItem('sanare_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_URL}/kaia/v2/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          sessionId,
          userId,
          isAuthenticated,
          cartInfo,
          conversationHistory,
          userInfo,
          notificationChoice,
        }),
      });
      const text = await response.text();
      if (!text) {
        throw new Error('Resposta vazia do servidor');
      }
      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar mensagem');
      }
      return data;
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.message || 'Erro de conexão', sessionId };
    }
  }

  /**
   * Site Chat: Escala conversa para suporte humano
   */
  async escalateSiteChat(
    preferredContact: 'site' | 'whatsapp' | 'email',
    name?: string,
    phone?: string,
    email?: string,
    reason?: string
  ): Promise<any> {
    const sessionId = localStorage.getItem('sanare_site_session') || '';
    try {
      const response = await fetch(`${API_URL}/kaia/v2/human-support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          preferredContact,
          name,
          phone,
          email,
          reason,
          message: reason || 'Solicitação de suporte'
        }),
      });
      const text = await response.text();
      if (!text) {
        throw new Error('Resposta vazia do servidor');
      }
      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao escalar atendimento');
      }
      return data;
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.message || 'Erro de conexão' };
    }
  }

  /**
   * Site Chat: De-escala conversa voltando para IA
   */
  async deEscalateSiteChat(): Promise<any> {
    const sessionId = localStorage.getItem('sanare_site_session') || '';
    try {
      const response = await fetch(`${API_URL}/kaia/v2/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: 'Retornar para IA'
        }),
      });
      const text = await response.text();
      if (!text) {
        throw new Error('Resposta vazia do servidor');
      }
      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao retornar para IA');
      }
      return data;
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.message || 'Erro de conexão' };
    }
  }
}

export const whatsappService = new WhatsAppService()
