import { env } from '../config/env'
import {
  NormalizedPaymentResult,
  unwrapNormalizedPaymentResult,
} from '../types/payment'

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
  shippingMethod?: string
  orderId?: string
  creditCard?: CreditCardData
  installments?: number
}

export type PaymentResult = NormalizedPaymentResult

class PaymentService {
  private baseUrl = `${API_URL}/payments`

  private getAuthHeaders() {
    const token = localStorage.getItem('kapsu_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private parsePaymentResponse(text: string, responseOk: boolean): NormalizedPaymentResult {
    const data = JSON.parse(text) as { success: boolean; data: unknown; message?: string }

    if (!responseOk) {
      throw new Error(data.message || 'Erro ao processar pagamento')
    }

    const normalized = unwrapNormalizedPaymentResult(data.data)
    if (!normalized) {
      throw new Error('Resposta de pagamento inválida do servidor')
    }

    return normalized
  }

  async createPreference(params: CreatePreferenceParams): Promise<NormalizedPaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/create-preference`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      return this.parsePaymentResponse(text, response.ok)
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  async getPaymentStatus(paymentId: string): Promise<NormalizedPaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/${paymentId}/status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      const data = JSON.parse(text) as { success: boolean; data: unknown; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar status do pagamento')
      }

      const normalized = unwrapNormalizedPaymentResult(data.data)
      if (!normalized) {
        throw new Error('Resposta de status inválida do servidor')
      }

      return normalized
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  async changePaymentMethod(
    orderId: string,
    paymentMethod: 'pix' | 'boleto' | 'credit_card'
  ): Promise<NormalizedPaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/change-method`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ paymentMethod }),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      return this.parsePaymentResponse(text, response.ok)
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  async payWithCard(params: {
    orderId: string
    paymentMethod?: 'credit_card'
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
    idempotencyKey?: string
  }): Promise<NormalizedPaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/card/pay`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      return this.parsePaymentResponse(text, response.ok)
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }

  async getInstallmentOptions(total: number): Promise<{
    cartTotal: number
    maxInstallments: number
    maxInterestFreeInstallments: number
    options: Array<{
      installments: number
      installmentValue: number
      totalValue: number
      hasInterest: boolean
      label: string
    }>
    nextRuleIncentive?: {
      minCartValue: number
      maxInterestFreeInstallments: number
      missingValue: number
    } | null
    appliedRuleId?: string | null
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/installment-options?total=${total}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) throw new Error('Resposta vazia do servidor')

      const data = JSON.parse(text)
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar opções de parcelamento')
      }

      return data.data || data
    } catch (error: any) {
      if (error.message) throw error
      throw new Error('Erro de conexão ao buscar opções de parcelamento')
    }
  }
}

export const paymentService = new PaymentService()
