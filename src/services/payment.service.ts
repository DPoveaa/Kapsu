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

interface CreatePreferenceResponse {
  success: boolean
  data: {
    preferenceId: string
    initPoint: string
    orderId: string
  }
  message?: string
}

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
   * Cria uma preferência de pagamento no Mercado Pago
   */
  async createPreference(shippingAddress: ShippingAddress, paymentMethod?: string, subscriptionPlan?: 'monthly' | 'quarterly', shippingFee?: number): Promise<CreatePreferenceResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}/create-preference`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ shippingAddress, paymentMethod, subscriptionPlan, shippingFee }),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: CreatePreferenceResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar preferência de pagamento')
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
   * Busca status de um pagamento
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}/${paymentId}/status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      const text = await response.text()
      if (!text) {
        throw new Error('Resposta vazia do servidor')
      }

      const data: PaymentStatusResponse = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar status do pagamento')
      }

      return data.data
    } catch (error: any) {
      if (error.message) {
        throw error
      }
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.')
    }
  }
}

export const paymentService = new PaymentService()

