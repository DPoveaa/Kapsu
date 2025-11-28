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
   * Inicializa o WhatsApp e gera QR Code
   */
  async initialize(): Promise<QRCodeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/initialize`, {
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
      const response = await fetch(`${this.baseUrl}/qrcode`)
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
      const response = await fetch(`${this.baseUrl}/regenerate-qrcode`, {
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
      const response = await fetch(`${this.baseUrl}/status`)
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
      const response = await fetch(`${this.baseUrl}/send`, {
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
      const response = await fetch(`${this.baseUrl}/send-media`, {
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
      const response = await fetch(`${this.baseUrl}/webhook`, {
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
      const response = await fetch(`${this.baseUrl}/disconnect`, {
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
      const response = await fetch(`${this.baseUrl}/conversations`)
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
      const response = await fetch(`${this.baseUrl}/conversations/needing-response`)
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
      const response = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(phone)}`)
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
      const response = await fetch(`${this.baseUrl}/conversations/load`, {
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
      const response = await fetch(`${this.baseUrl}/conversations/read`, {
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
      const response = await fetch(`${this.baseUrl}/conversations/intervention-count`, {
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
      const response = await fetch(`${this.baseUrl}/conversations/mark-assumed`, {
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
      const response = await fetch(`${this.baseUrl}/conversations/unmark-assumed`, {
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
}

export const whatsappService = new WhatsAppService()

