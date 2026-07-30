import { env } from '../config/env'

const API_URL = env.apiUrl

export interface ShippingPriceAdjustment {
  type: 'promotion' | 'free_shipping_rule' | 'free_shipping_threshold' | 'profit_margin_subsidy'
  label: string
  amount: number
  before: number
  after: number
  source?: string | null
  description?: string | null
}

export interface ShippingPricingDiagnostics {
  quotedFee: number
  finalFee: number
  referenceBaseFee: number | null
  cartValueImpact: number | null
  packageImpact: number | null
  adjustments: ShippingPriceAdjustment[]
}

export interface ShippingPackageDiagnostics {
  weightGrams: number
  lengthCm: number
  widthCm: number
  heightCm: number
  declaredValue: number | null
  originCep: string | null
  destinationCep: string
  itemCount: number
  unitCount: number
  usedDefaultWeight: boolean
  usedDefaultDimensions: boolean
  notes: string[]
}

export interface ShippingMethodDiagnostic {
  method: string
  name: string
  calculationType: string
  active: boolean
  checkoutEnabled: boolean
  eligible: boolean
  reason: string | null
}

export interface DiscardedShippingQuote {
  carrier: string
  service: string
  shippingFee: number
  deliveryTime?: number | null
  reason: string
}

export interface ShippingCalculationDiagnostics {
  cartTotal: number
  package: ShippingPackageDiagnostics
  methods: ShippingMethodDiagnostic[]
  discardedProviderQuotes?: DiscardedShippingQuote[]
  rules: {
    localFreeShippingEnabled: boolean
    localFreeShippingThreshold: number
    correiosFreeShippingEnabled: boolean
    correiosFreeShippingThreshold: number
    profitMarginSubsidyEnabled: boolean
    profitMarginMinThreshold: number
    profitMarginSubsidyShare: number
  }
  notes: string[]
}
export interface ShippingOption {
  method: string
  name: string
  shippingFee: number
  quotedFee?: number | null
  originalFee?: number | null
  isFreeShipping: boolean
  freeShippingThreshold: number | null
  deliveryTime: number | null
  deliveryTimeType: 'business' | 'calendar'
  estimatedDate?: string | null
  municipality?: string | null
  carrier?: string | null
  service?: string | null
  externalShipping?: boolean
  message?: string | null
  matchedPromotion?: { id: string; name: string; type: string }
  matchedRule?: { id?: string; name?: string; type?: string }
  pricing?: ShippingPricingDiagnostics
}

export interface ShippingMethod {
  id: string
  code: string
  name: string
  checkout_enabled: boolean
  internal_enabled: boolean
  calculation_type: 'CORREIOS' | 'SEDEX' | 'LOCAL_TABLE' | 'FIXED' | 'INTERNAL_ONLY'
  fixed_fee: number | null
  delivery_time: number | null
  delivery_time_type: 'business' | 'calendar'
  position: number
  active: boolean
}

export interface ShippingCalculation {
  shippingFee: number | null
  quotedFee?: number | null
  originalFee?: number | null
  isFreeShipping: boolean
  freeShippingThreshold: number | null
  municipality?: string
  message: string
  matchedRule?: {
    id: string
    name: string
    type: string
  }
  deliveryTime?: number | null
  deliveryTimeType?: 'business' | 'calendar'
  estimatedDate?: string | null
  estimatedDateFormatted?: string | null
  externalShipping?: boolean
  carrier?: string | null
  service?: string | null
  options?: ShippingOption[]
  diagnostics?: ShippingCalculationDiagnostics
}

export interface ShippingRegion {
  id: string
  municipality: string
  cep_from: string
  cep_to: string
  shipping_fee: number
  delivery_time?: number | null
  delivery_time_type?: 'business' | 'calendar'
  active: boolean
  created_at: string
  updated_at: string
}

export interface ShippingSettings {
  custom_shipping_enabled?: boolean
  sedex_shipping_enabled?: boolean
  sedex_origin_cep?: string
  custom_free_shipping_enabled?: boolean
  custom_free_shipping_threshold?: number
  sedex_free_shipping_enabled?: boolean
  sedex_free_shipping_threshold?: number
  free_shipping_threshold?: number
  general_delivery_time?: number
  general_delivery_time_type?: 'business' | 'calendar'
  profit_margin_subsidy_enabled?: boolean
  profit_margin_min_threshold?: number
  profit_margin_subsidy_share?: number
}

class ShippingService {
  /**
   * Verifica de forma rápida se o CEP está cadastrado nas regiões locais
   */
  async checkRegion(cep: string): Promise<{ success: boolean; isLocal: boolean }> {
    const response = await fetch(`${API_URL}/shipping/check-region/${cep}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao verificar região')
    }

    return response.json()
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('kapsu_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  /**
   * Calcula o valor do frete baseado no CEP e valor do carrinho
   */
  async calculateShipping(
    cep: string, 
    cartTotal: number, 
    cartItems?: Array<{
      product_id: string
      quantity: number
      weight_grams?: number | null
      length_cm?: number | null
      width_cm?: number | null
      height_cm?: number | null
    }>,
    signal?: AbortSignal
  ): Promise<ShippingCalculation> {
    const token = localStorage.getItem('kapsu_token')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Adiciona token de autenticação se disponível para associar logs ao usuário
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${API_URL}/shipping/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cep, cartTotal, cartItems }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao calcular frete')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Obtém todas as regiões de frete (apenas admin)
   */
  async getShippingRegions(): Promise<ShippingRegion[]> {
    const response = await fetch(`${API_URL}/shipping/regions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar regiões de frete')
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Cria ou atualiza uma região de frete (apenas admin)
   */
  async createOrUpdateShippingRegion(
    region: Partial<ShippingRegion> & {
      municipality: string
      cepFrom: string
      cepTo: string
      shippingFee: number
      deliveryTime?: number | null
      deliveryTimeType?: string
      active?: boolean
    }
  ): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/regions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        id: region.id,
        municipality: region.municipality,
        cepFrom: region.cepFrom,
        cepTo: region.cepTo,
        shippingFee: region.shippingFee,
        deliveryTime: region.deliveryTime,
        deliveryTimeType: region.deliveryTimeType,
        active: region.active !== undefined ? region.active : true,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao salvar região de frete')
    }
  }

  /**
   * Remove uma região de frete (apenas admin)
   */
  async deleteShippingRegion(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/regions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao remover região de frete')
    }
  }

  /**
   * Obtém configurações de frete
   */
  async getShippingSettings(): Promise<ShippingSettings> {
    const response = await fetch(`${API_URL}/shipping/settings`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao buscar configurações de frete')
    }

    const data = await response.json()
    return data.data
  }

  async getShippingMethods(scope: 'all' | 'checkout' | 'internal' = 'all'): Promise<ShippingMethod[]> {
    const response = await fetch(`${API_URL}/shipping/methods?scope=${scope}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar métodos de entrega')
    return data.data
  }

  async updateShippingMethod(id: string, method: Partial<ShippingMethod>): Promise<ShippingMethod> {
    const response = await fetch(`${API_URL}/shipping/methods/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(method),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar método de entrega')
    return data.data
  }

  /**
   * Atualiza configurações de frete (apenas admin)
   */
  async updateShippingSettings(settings: Partial<ShippingSettings>): Promise<void> {
    const response = await fetch(`${API_URL}/shipping/settings`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao atualizar configurações de frete')
    }
  }

  /**
   * Testar cotação de frete diretamente do painel de admin.
   * @param includeDeclaredValue  When true, sends extra_declared_value to Conect Envios.
   *                              Omit (false) for the base quote without insurance.
   * @param declaredValue         The declared value amount to insure. Only used when includeDeclaredValue=true.
   */
  async testShippingQuote(
    cep: string,
    cartTotal = 0,
    cartItems?: Array<any>,
    promoCode?: string,
    originCep?: string,
    includeDeclaredValue = false,
    declaredValue?: number
  ): Promise<ShippingCalculation> {
    const response = await fetch(`${API_URL}/shipping/test-quote`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        cep,
        cartTotal,
        cartItems,
        promoCode,
        sedex_origin_cep: originCep,
        includeDeclaredValue,
        declaredValue: includeDeclaredValue ? declaredValue : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao testar cotação de frete')
    }

    const data = await response.json()
    return data.data
  }
}

export const shippingService = new ShippingService()

