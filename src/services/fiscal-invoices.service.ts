import { env } from '../config/env'

const API_URL = env.apiUrl
const BASE = `${API_URL}/admin/fiscal/notaas`

export interface FiscalInvoice {
  id: string
  local_order_id: string
  provider: string
  environment: string
  status: string
  invoice_number: string | null
  series: string
  access_key: string | null
  protocol: string | null
  total_value: number
  danfe_available: boolean
  xml_available: boolean
  authorized_at: string | null
  created_at: string
  sefaz_status_code: string | null
  sefaz_status_message: string | null
  notaas_invoice_id: string | null
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_cpf: string | null
  last_exported_at: string | null
  last_export_id: string | null
  is_exported: boolean
}

export interface InvoiceSummary {
  total: number
  issued: number
  cancelled: number
  error: number
  processing: number
  totalAuthorizedValue: number
  notExported: number
}

export interface CutoffConfig {
  cutoff_day: number
  period_start?: string
  period_end?: string
}

export interface AccountingExport {
  id: string
  period_start: string
  period_end: string
  cutoff_day: number
  generated_by: string | null
  generated_by_name: string | null
  generated_at: string
  invoice_count: number
  total_value: number
  zip_file_name: string | null
  status: 'GENERATING' | 'COMPLETED' | 'FAILED'
  error_message: string | null
}

export interface OverlapEntry {
  fiscal_invoice_id: string
  export_id: string
  period_start: string
  period_end: string
  generated_at: string
  zip_file_name: string | null
}

export interface ListFiscalInvoicesParams {
  startDate?: string
  endDate?: string
  status?: string
  customer?: string
  orderId?: string
  invoiceNumber?: string
  exported?: 'yes' | 'no' | 'all'
  includeHomologacao?: boolean
  page?: number
  limit?: number
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('kapsu_token') || sessionStorage.getItem('kapsu_token') || ''
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export const fiscalInvoicesService = {
  /** Lista notas fiscais com filtros */
  async list(params: ListFiscalInvoicesParams = {}): Promise<{
    data: FiscalInvoice[]
    total: number
    page: number
    limit: number
  }> {
    const qs = new URLSearchParams()
    if (params.startDate) qs.set('startDate', params.startDate)
    if (params.endDate) qs.set('endDate', params.endDate)
    if (params.status) qs.set('status', params.status)
    if (params.customer) qs.set('customer', params.customer)
    if (params.orderId) qs.set('orderId', params.orderId)
    if (params.invoiceNumber) qs.set('invoiceNumber', params.invoiceNumber)
    if (params.exported) qs.set('exported', params.exported)
    if (params.includeHomologacao) qs.set('includeHomologacao', 'true')
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))

    const res = await fetch(`${BASE}/invoices?${qs.toString()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao buscar notas fiscais')
    return res.json()
  },

  /** Resumo/totalizadores do período */
  async getSummary(params: Pick<ListFiscalInvoicesParams, 'startDate' | 'endDate' | 'includeHomologacao'>): Promise<InvoiceSummary> {
    const qs = new URLSearchParams()
    if (params.startDate) qs.set('startDate', params.startDate)
    if (params.endDate) qs.set('endDate', params.endDate)
    if (params.includeHomologacao) qs.set('includeHomologacao', 'true')
    const res = await fetch(`${BASE}/invoices/summary?${qs.toString()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao buscar resumo')
    return (await res.json()).data
  },

  /** Lê a configuração global de corte */
  async getCutoffConfig(): Promise<CutoffConfig> {
    const res = await fetch(`${BASE}/invoices/cutoff-config`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Erro ao buscar config de corte')
    return (await res.json()).data
  },

  /** Salva a configuração global de corte */
  async saveCutoffConfig(config: CutoffConfig): Promise<void> {
    const res = await fetch(`${BASE}/invoices/cutoff-config`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(config),
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao salvar config de corte')
  },

  /** Verifica sobreposição com exportações anteriores */
  async checkOverlap(invoiceIds: string[]): Promise<OverlapEntry[]> {
    const res = await fetch(`${BASE}/invoices/export/check-overlap`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ invoiceIds }),
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao verificar sobreposição')
    return (await res.json()).data
  },

  /** Gera e baixa um ZIP de exportação contábil */
  async generateExportZip(params: {
    invoiceIds: string[]
    periodStart: string
    periodEnd: string
    cutoffDay?: number
    includeAlreadyExported?: boolean
  }): Promise<void> {
    const res = await fetch(`${BASE}/invoices/export`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Erro ao gerar exportação')
    }

    const blob = await res.blob()
    const contentDisposition = res.headers.get('Content-Disposition') || ''
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
    const fileName = fileNameMatch ? fileNameMatch[1] : 'nfe-export.zip'

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /** Regenera e baixa um ZIP de exportação anterior */
  async regenerateExportZip(exportId: string): Promise<void> {
    const res = await fetch(`${BASE}/invoices/exports/${exportId}/regenerate`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Erro ao regenerar exportação')
    }

    const blob = await res.blob()
    const contentDisposition = res.headers.get('Content-Disposition') || ''
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
    const fileName = fileNameMatch ? fileNameMatch[1] : 'nfe-export.zip'

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /** Histórico de exportações */
  async listExports(page = 1, limit = 20): Promise<{ data: AccountingExport[]; total: number }> {
    const res = await fetch(`${BASE}/invoices/exports?page=${page}&limit=${limit}`, {
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error('Erro ao buscar histórico de exportações')
    return res.json()
  },

  /** URL para baixar XML (via proxy do servidor) */
  getXmlUrl(invoiceId: string): string {
    const token = localStorage.getItem('kapsu_token') || sessionStorage.getItem('kapsu_token') || ''
    return `${BASE}/${invoiceId}/xml?token=${encodeURIComponent(token)}`
  },

  /** URL para baixar DANFE (via proxy do servidor) */
  getDanfeUrl(invoiceId: string): string {
    const token = localStorage.getItem('kapsu_token') || sessionStorage.getItem('kapsu_token') || ''
    return `${BASE}/${invoiceId}/danfe?token=${encodeURIComponent(token)}`
  },

  /** Download XML via fetch + trigger browser download */
  async downloadXml(invoiceId: string, invoiceNumber?: string | null): Promise<void> {
    const res = await fetch(`${BASE}/${invoiceId}/xml`, { headers: authHeaders() })
    if (!res.ok) throw new Error('XML não disponível')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = invoiceNumber ? `nfe-${invoiceNumber}.xml` : `nfe-${invoiceId}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /** Download DANFE via fetch + trigger browser download */
  async downloadDanfe(invoiceId: string, invoiceNumber?: string | null): Promise<void> {
    const res = await fetch(`${BASE}/${invoiceId}/danfe`, { headers: authHeaders() })
    if (!res.ok) throw new Error('DANFE não disponível')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = invoiceNumber ? `danfe-${invoiceNumber}.pdf` : `danfe-${invoiceId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /** Reconcilia status de uma nota no Notaas */
  async reconcile(orderId: string): Promise<void> {
    const res = await fetch(`${BASE}/order/${orderId}/reconcile`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao reconciliar nota')
  },

  /** Reenvia o e-mail oficial da NF-e para o cliente */
  async resendEmail(orderId: string): Promise<void> {
    const res = await fetch(`${BASE}/order/${orderId}/resend-email`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Erro ao reenviar e-mail de Nota Fiscal')
    }
  },
}
