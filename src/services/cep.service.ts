/**
 * Serviço para busca de endereços por CEP
 * Utiliza múltiplas APIs gratuitas com fallback automático
 */

export interface CepData {
  cep: string
  logradouro: string
  complemento?: string
  bairro: string
  localidade: string // cidade
  uf: string // estado
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  erro?: boolean
}

class CepService {
  /**
   * Busca endereço por CEP usando múltiplas APIs com fallback
   */
  async searchCep(cep: string): Promise<CepData | null> {
    const cleanCep = cep.replace(/\D/g, '')
    
    if (cleanCep.length !== 8) {
      return null
    }

    // Tenta ViaCEP primeiro (mais confiável)
    try {
      const viaCepData = await this.searchViaCep(cleanCep)
      if (viaCepData && !viaCepData.erro) {
        return viaCepData
      }
    } catch (error) {
      console.warn('ViaCEP falhou, tentando fallback:', error)
    }

    // Fallback 1: Brasil API
    try {
      const brasilApiData = await this.searchBrasilApi(cleanCep)
      if (brasilApiData) {
        return brasilApiData
      }
    } catch (error) {
      console.warn('Brasil API falhou, tentando fallback:', error)
    }

    // Fallback 2: CEP.Rest
    try {
      const cepRestData = await this.searchCepRest(cleanCep)
      if (cepRestData) {
        return cepRestData
      }
    } catch (error) {
      console.warn('CEP.Rest falhou:', error)
    }

    return null
  }

  /**
   * Busca CEP usando ViaCEP
   */
  private async searchViaCep(cep: string): Promise<CepData | null> {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`ViaCEP: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.erro) {
      return { ...data, erro: true } as CepData
    }

    return {
      cep: this.formatCep(data.cep),
      logradouro: data.logradouro || '',
      complemento: data.complemento || undefined,
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      ibge: data.ibge,
      gia: data.gia,
      ddd: data.ddd,
      siafi: data.siafi,
    }
  }

  /**
   * Busca CEP usando Brasil API
   */
  private async searchBrasilApi(cep: string): Promise<CepData | null> {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Brasil API: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      cep: this.formatCep(data.cep),
      logradouro: data.street || '',
      bairro: data.neighborhood || '',
      localidade: data.city || '',
      uf: data.state || '',
    }
  }

  /**
   * Busca CEP usando CEP.Rest
   */
  private async searchCepRest(cep: string): Promise<CepData | null> {
    const response = await fetch(`https://cep.rest/${cep}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CEP.Rest: ${response.status}`)
    }

    const data = await response.json()
    
    // CEP.Rest retorna um array ou objeto dependendo do formato
    const cepData = Array.isArray(data) ? data[0] : data
    
    if (!cepData || cepData.erro) {
      return null
    }

    return {
      cep: this.formatCep(cepData.cep || cep),
      logradouro: cepData.logradouro || cepData.address || '',
      bairro: cepData.bairro || cepData.district || '',
      localidade: cepData.localidade || cepData.city || '',
      uf: cepData.uf || cepData.state || '',
      ibge: cepData.ibge,
      ddd: cepData.ddd,
    }
  }

  /**
   * Formata CEP para o padrão brasileiro (00000-000)
   */
  private formatCep(cep: string): string {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      return `${cleanCep.substring(0, 5)}-${cleanCep.substring(5)}`
    }
    return cleanCep
  }
}

export const cepService = new CepService()










