import { env } from '../config/env'

const API_URL = env.apiUrl

export interface ShippingAddress {
  cep: string
  address: string
  number: string
  city: string
  state: string
  neighborhood?: string
  complement?: string
}

export function buildShippingAddress(input: {
  cep: string
  address: string
  number: string
  city: string
  state: string
  complement?: string
  bairro?: string
  neighborhood?: string
}): ShippingAddress {
  const shippingAddress: ShippingAddress = {
    cep: input.cep.replace(/\D/g, ''),
    address: input.address.trim(),
    number: input.number.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
  }

  const neighborhood = (input.neighborhood || input.bairro)?.trim()
  if (neighborhood) {
    shippingAddress.neighborhood = neighborhood
  }

  const complement = input.complement?.trim()
  if (complement) {
    shippingAddress.complement = complement
  }

  return shippingAddress
}

export interface CreditCardData {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface CreatePreferenceParams {
  paymentMethod?: string
  shippingAddress?: ShippingAddress
  addressId?: string
  subscriptionPlan?: 'monthly' | 'quarterly'
  shippingFee?: number
  // Cartão de crédito
  creditCard?: CreditCardData
  installments?: number
}

// ── Tipos de resposta por método ──────────────────────────────────────────────

export interface PixPaymentResult {
  paymentMethod: 'pix'
  orderId: string
  paymentId: string
  pixQrCode: string    // base64
  pixPayload: string   // copia-e-cola
  expirationDate?: string
}

export interface BoletoPaymentResult {
  paymentMethod: 'boleto'
  orderId: string
  paymentId: string
  bankSlipUrl: string
  identificationField: string
  dueDate: string
}

export interface CreditCardPaymentResult {
  paymentMethod: 'credit_card'
  orderId: string
  paymentId: string
  status: string
  installments: number
}

/** Resultado legado (redirect para checkout externo) */
export interface RedirectPaymentResult {
  paymentMethod?: string
  orderId: string
  redirectUrl: string
  preferenceId?: string
}

export type PaymentResult =
  | PixPaymentResult
  | BoletoPaymentResult
  | CreditCardPaymentResult
  | RedirectPaymentResult

// ─────────────────────────────────────────────────────────────────────────────

interface PaymentStatusResponse {
  success: boolean
  data: {
    id: string
    status: string
    status_detail: string
    external_reference: string
    transaction_amount: number
  }
  message?: string
}

class PaymentService {
  private baseUrl = `${API_URL}/payments`

  private getAuthHeaders() {
    const token = localStorage.getItem('sanare_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Cria pagamento e retorna dados adequados ao método escolhido.
   * PIX     → QR Code + copia-e-cola inline
   * Boleto  → código de barras + URL do PDF
   * Cartão  → resposta de cobrança direta
   * Outros  → URL de redirect (legado)
   */
  async createPreference(params: CreatePreferenceParams): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/create-preference`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      const data = JSON.parse(text) as { success: boolean; data: any; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pagamento')
      }

      const raw = data.data

      // PIX inline
      if (raw.paymentMethod === 'pix') {
        return raw as PixPaymentResult
      }

      // Boleto inline
      if (raw.paymentMethod === 'boleto') {
        return raw as BoletoPaymentResult
      }

      // Cartão direto
      if (raw.paymentMethod === 'credit_card') {
        return raw as CreditCardPaymentResult
      }

      // Legado: redirect
      const redirectUrl = raw.redirectUrl ?? raw.initPoint
      if (!redirectUrl) throw new Error('Resposta sem URL de redirecionamento')

      return {
        paymentMethod: raw.paymentMethod,
        orderId: raw.orderId,
        redirectUrl,
        preferenceId: raw.preferenceId,
      } as RedirectPaymentResult
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Busca status de um pagamento (para polling PIX)
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}/${paymentId}/status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      const data: PaymentStatusResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar status do pagamento')
      }

      return data.data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  /**
   * Altera o método de pagamento de um pedido pendente
   */
  async changePaymentMethod(orderId: string, paymentMethod: 'pix' | 'boleto'): Promise<RedirectPaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/change-method`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ paymentMethod }),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      const data = JSON.parse(text) as { success: boolean; data: any; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao alterar método de pagamento')
      }

      const raw = data.data
      const redirectUrl = raw.redirectUrl ?? raw.initPoint
      if (!redirectUrl) throw new Error('Resposta sem URL de redirecionamento')

      return {
        orderId: raw.orderId,
        redirectUrl,
        preferenceId: raw.preferenceId,
      }
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }
  /**
   * Processa o pagamento via Cartão de Crédito
   */
  async payWithCard(params: {
    orderId: string
    creditCard: {
      holderName: string
      number: string
      expiryMonth: string
      expiryYear: string
      ccv: string
    }
    payer: {
      cpfCnpj: string
    }
    installments: number
  }): Promise<{ status: string; orderId: string; paymentId?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/card/pay`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar cartão de crédito')
      }

      return data.data || data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }
}
export const paymentService = new PaymentService()
