import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText, Download, RefreshCw, ExternalLink, CheckCircle2, XCircle,
  Clock, AlertTriangle, Filter, ChevronDown, ChevronUp, Search,
  Package, Settings, BarChart3, Archive, Bell, X, Eye,
  ChevronLeft, ChevronRight, RotateCcw, Loader2,
  ArrowLeft, Mail,
} from 'lucide-react'
import { fiscalInvoicesService, FiscalInvoice, InvoiceSummary, AccountingExport, CutoffConfig, OverlapEntry } from '../services/fiscal-invoices.service'
import { toast } from '../utils/toast'
import { useAuth } from '../context/AuthContext'
import { recordAdminAccess } from '../utils/recentAdminAccess'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined, withTime = false) {
  if (!d) return '—'
  const date = new Date(d)
  if (withTime) return date.toLocaleString('pt-BR')
  return date.toLocaleDateString('pt-BR')
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function maskCpf(cpf: string | null | undefined) {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2')
}

// ─── Status Badge ───────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  ISSUED:      { label: 'Autorizada',    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <CheckCircle2 size={11} /> },
  CANCELLED:   { label: 'Cancelada',     className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <XCircle size={11} /> },
  ERROR:       { label: 'Erro',          className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle size={11} /> },
  PROCESSING:  { label: 'Processando',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 size={11} className="animate-spin" /> },
  QUEUED:      { label: 'Na fila',       className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={11} /> },
  PREPARING:   { label: 'Preparando',    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Clock size={11} /> },
  STATUS_UNKNOWN: { label: 'Desconhecido', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <Clock size={11} /> },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, className: 'bg-gray-100 text-gray-500', icon: <Clock size={11} /> }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.className}`}>
      {s.icon}{s.label}
    </span>
  )
}

// ─── Summary Cards ──────────────────────────────────────────────────────────

interface SummaryCardsProps { summary: InvoiceSummary; loading: boolean }

function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    { label: 'Total no Período', value: loading ? '—' : summary.total, sub: 'notas', color: 'from-blue-500 to-blue-600', icon: <FileText size={20} /> },
    { label: 'Autorizadas', value: loading ? '—' : summary.issued, sub: 'notas', color: 'from-emerald-500 to-emerald-600', icon: <CheckCircle2 size={20} /> },
    { label: 'Canceladas', value: loading ? '—' : summary.cancelled, sub: 'notas', color: 'from-gray-500 to-gray-600', icon: <XCircle size={20} /> },
    { label: 'Com Erro', value: loading ? '—' : summary.error, sub: 'notas', color: 'from-red-500 to-red-600', icon: <AlertTriangle size={20} /> },
    { label: 'Valor Autorizado', value: loading ? '—' : formatCurrency(summary.totalAuthorizedValue), sub: 'total', color: 'from-violet-500 to-violet-600', icon: <BarChart3 size={20} /> },
    { label: 'Não Exportadas', value: loading ? '—' : summary.notExported, sub: 'notas', color: summary.notExported > 0 ? 'from-amber-500 to-orange-500' : 'from-teal-500 to-teal-600', icon: <Archive size={20} /> },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-3xl bg-gradient-to-br ${card.color} opacity-10`} />
          <div className={`text-transparent bg-clip-text bg-gradient-to-br ${card.color} mb-1`}>{card.icon}</div>
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">{card.value}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{card.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Overlap Conflict Modal ─────────────────────────────────────────────────

interface OverlapModalProps {
  overlaps: OverlapEntry[]
  invoiceIds: string[]
  periodStart: string
  periodEnd: string
  cutoffDay: number
  onResolve: (action: 'exclude' | 'include' | 'cancel') => void
}

function OverlapModal({ overlaps, onResolve }: OverlapModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 max-w-lg w-full border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Notas já exportadas detectadas</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{overlaps.length} nota(s) incluída(s) em exportações anteriores</p>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
          {overlaps.map((ov, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-xs border border-amber-100 dark:border-amber-900">
              <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">Nota: {ov.fiscal_invoice_id.substring(0, 8)}...</div>
                <div className="text-gray-500 dark:text-gray-400">
                  Exportado em {formatDate(ov.generated_at, true)} · Período: {formatDate(ov.period_start)} – {formatDate(ov.period_end)}
                </div>
                {ov.zip_file_name && <div className="text-gray-400 truncate">ZIP: {ov.zip_file_name}</div>}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mb-5">Como deseja prosseguir?</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onResolve('exclude')}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            <CheckCircle2 size={16} />
            Excluir já exportadas (recomendado)
          </button>
          <button
            onClick={() => onResolve('include')}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            <Archive size={16} />
            Incluir mesmo assim (exportação duplicada)
          </button>
          <button
            onClick={() => onResolve('cancel')}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors"
          >
            <X size={16} />
            Cancelar exportação
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cutoff Config Panel ────────────────────────────────────────────────────

interface CutoffPanelProps {
  config: CutoffConfig
  onChange: (c: CutoffConfig) => void
  onSave: () => Promise<void>
  saving: boolean
}

function CutoffPanel({ config, onChange, onSave, saving }: CutoffPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <Settings size={16} className="text-primary-500" /> Configuração de Corte Contábil
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Dia de Corte (padrão: 17)</label>
          <input
            type="number"
            min={1} max={31}
            value={config.cutoff_day}
            onChange={(e) => onChange({ ...config, cutoff_day: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Início do Período</label>
          <input
            type="date"
            value={config.period_start || ''}
            onChange={(e) => onChange({ ...config, period_start: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Fim do Período</label>
          <input
            type="date"
            value={config.period_end || ''}
            onChange={(e) => onChange({ ...config, period_end: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Salvar configuração
      </button>
    </div>
  )
}

// ─── Export History Tab ─────────────────────────────────────────────────────

interface ExportHistoryProps {
  exports: AccountingExport[]
  loading: boolean
  onRegenerate: (id: string) => Promise<void>
}

function ExportHistory({ exports, loading, onRegenerate }: ExportHistoryProps) {
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const handleRegenerate = async (id: string) => {
    if (!confirm('Confirma a regeneração do ZIP de exportação? Um novo arquivo será gerado com as mesmas notas.')) return
    setRegeneratingId(id)
    try {
      await onRegenerate(id)
      toast.success('ZIP regenerado e download iniciado.')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao regenerar exportação')
    } finally {
      setRegeneratingId(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Carregando histórico...</div>
  if (!exports.length) return (
    <div className="py-12 text-center text-gray-400">
      <Archive size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">Nenhuma exportação realizada ainda.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700">
            {['Período', 'Gerada em', 'Notas', 'Valor Total', 'Gerada por', 'Status', 'Ações'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
          {exports.map((exp) => (
            <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                {formatDate(exp.period_start)} – {formatDate(exp.period_end)}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(exp.generated_at, true)}</td>
              <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{exp.invoice_count}</td>
              <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(exp.total_value)}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{exp.generated_by_name || '—'}</td>
              <td className="px-4 py-3">
                {exp.status === 'COMPLETED' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><CheckCircle2 size={11} /> OK</span>}
                {exp.status === 'FAILED' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle size={11} /> Falha</span>}
                {exp.status === 'GENERATING' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Loader2 size={11} className="animate-spin" /> Gerando</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="inline-flex gap-2">
                  <button
                    onClick={() => handleRegenerate(exp.id)}
                    disabled={regeneratingId === exp.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/40 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 text-xs font-semibold transition-colors disabled:opacity-50"
                    title="Regenerar ZIP"
                  >
                    {regeneratingId === exp.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    Baixar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type ActiveTab = 'invoices' | 'history' | 'settings'

export default function FiscalInvoices() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin } = useAuth()

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('invoices')

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [orderIdFilter, setOrderIdFilter] = useState(searchParams.get('order') || '')
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState('')
  const [exportedFilter, setExportedFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [includeHomologacao, setIncludeHomologacao] = useState(false)
  const [showFilters, setShowFilters] = useState(!!searchParams.get('order'))

  // Data
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<InvoiceSummary>({ total: 0, issued: 0, cancelled: 0, error: 0, processing: 0, totalAuthorizedValue: 0, notExported: 0 })
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Export
  const [exporting, setExporting] = useState(false)
  const [overlaps, setOverlaps] = useState<OverlapEntry[]>([])
  const [showOverlapModal, setShowOverlapModal] = useState(false)
  const pendingExportAction = useRef<'exclude' | 'include' | null>(null)

  // History
  const [exports, setExports] = useState<AccountingExport[]>([])
  const [exportsLoading, setExportsLoading] = useState(false)

  // Cutoff config
  const [cutoffConfig, setCutoffConfig] = useState<CutoffConfig>({ cutoff_day: 17 })
  const [savingConfig, setSavingConfig] = useState(false)

  // Cutoff reminder
  const [daysUntilCutoff, setDaysUntilCutoff] = useState<number | null>(null)

  // Load invoices
  const loadInvoices = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const result = await fiscalInvoicesService.list({
        startDate, endDate, status: statusFilter || undefined,
        customer: customerFilter || undefined,
        orderId: orderIdFilter || undefined,
        invoiceNumber: invoiceNumberFilter || undefined,
        exported: exportedFilter === 'all' ? undefined : exportedFilter,
        includeHomologacao,
        page: p, limit,
      })
      setInvoices(result.data)
      setTotal(result.total)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar notas fiscais')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, statusFilter, customerFilter, orderIdFilter, invoiceNumberFilter, exportedFilter, includeHomologacao, page])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const data = await fiscalInvoicesService.getSummary({ startDate, endDate, includeHomologacao })
      setSummary(data)
    } catch {
      /* silent */
    } finally {
      setSummaryLoading(false)
    }
  }, [startDate, endDate, includeHomologacao])

  const loadExports = useCallback(async () => {
    setExportsLoading(true)
    try {
      const result = await fiscalInvoicesService.listExports()
      setExports(result.data)
    } catch {
      /* silent */
    } finally {
      setExportsLoading(false)
    }
  }, [])

  const loadCutoffConfig = useCallback(async () => {
    try {
      const config = await fiscalInvoicesService.getCutoffConfig()
      setCutoffConfig(config)
      // Calculate days until cutoff
      const today = new Date()
      const cutoffDay = config.cutoff_day || 17
      let cutoffDate = new Date(today.getFullYear(), today.getMonth(), cutoffDay)
      if (cutoffDate < today) {
        cutoffDate = new Date(today.getFullYear(), today.getMonth() + 1, cutoffDay)
      }
      const diff = Math.ceil((cutoffDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      setDaysUntilCutoff(diff)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    recordAdminAccess('/admin/notas-fiscais')
    loadCutoffConfig()
  }, [loadCutoffConfig])

  useEffect(() => {
    loadInvoices(1)
    setPage(1)
    loadSummary()
  }, [startDate, endDate, statusFilter, customerFilter, orderIdFilter, invoiceNumberFilter, exportedFilter, includeHomologacao])

  useEffect(() => {
    if (activeTab === 'history') loadExports()
  }, [activeTab, loadExports])

  // Filter by order from URL
  useEffect(() => {
    const orderId = searchParams.get('order')
    if (orderId) {
      setOrderIdFilter(orderId)
      setShowFilters(true)
    }
  }, [searchParams])

  if (!isAdmin) return null

  // ── Selection helpers ──
  const allPageSelected = invoices.length > 0 && invoices.every((inv) => selectedIds.has(inv.id))
  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds)
      invoices.forEach((inv) => next.delete(inv.id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      invoices.forEach((inv) => next.add(inv.id))
      setSelectedIds(next)
    }
  }
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  // ── Export flow ──
  const handleExport = async (overrideAction?: 'exclude' | 'include') => {
    const ids = Array.from(selectedIds)
    if (!ids.length) {
      toast.error('Selecione ao menos uma nota para exportar.')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Defina o período de exportação.')
      return
    }

    try {
      setExporting(true)

      const action = overrideAction || pendingExportAction.current

      // Check overlaps first (unless user has already decided)
      if (!action) {
        const existingOverlaps = await fiscalInvoicesService.checkOverlap(ids)
        if (existingOverlaps.length > 0) {
          setOverlaps(existingOverlaps)
          setShowOverlapModal(true)
          setExporting(false)
          return
        }
      }

      const includeAlreadyExported = action === 'include'

      await fiscalInvoicesService.generateExportZip({
        invoiceIds: ids,
        periodStart: startDate,
        periodEnd: endDate,
        cutoffDay: cutoffConfig.cutoff_day,
        includeAlreadyExported,
      })

      toast.success(`ZIP de exportação gerado com ${ids.length} notas!`)
      setSelectedIds(new Set())
      pendingExportAction.current = null
      loadInvoices()
      loadSummary()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar exportação')
    } finally {
      setExporting(false)
    }
  }

  const handleOverlapResolve = (action: 'exclude' | 'include' | 'cancel') => {
    setShowOverlapModal(false)
    if (action === 'cancel') return
    pendingExportAction.current = action
    handleExport(action)
  }

  const handleSaveCutoffConfig = async () => {
    setSavingConfig(true)
    try {
      await fiscalInvoicesService.saveCutoffConfig(cutoffConfig)
      toast.success('Configuração de corte salva!')
      loadCutoffConfig()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configuração')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleDownloadXml = async (inv: FiscalInvoice) => {
    try {
      await fiscalInvoicesService.downloadXml(inv.id, inv.invoice_number)
      toast.success('Download XML iniciado')
    } catch {
      toast.error('XML não disponível')
    }
  }

  const handleDownloadDanfe = async (inv: FiscalInvoice) => {
    try {
      await fiscalInvoicesService.downloadDanfe(inv.id, inv.invoice_number)
      toast.success('Download DANFE iniciado')
    } catch {
      toast.error('DANFE não disponível')
    }
  }

  const handleReconcile = async (inv: FiscalInvoice) => {
    try {
      await fiscalInvoicesService.reconcile(inv.local_order_id)
      toast.success('Status reconciliado')
      loadInvoices()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reconciliar')
    }
  }

  const handleResendEmail = async (inv: FiscalInvoice) => {
    try {
      await fiscalInvoicesService.resendEmail(inv.local_order_id)
      toast.success('E-mail de Nota Fiscal reenviado ao cliente!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reenviar e-mail de NF-e')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={24} className="text-primary-600 dark:text-primary-400" />
              Notas Fiscais
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Controle e exportação contábil de NF-e</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={() => handleExport()}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exportar ZIP ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => { loadInvoices(); loadSummary() }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* Cutoff Reminder Banner */}
      {daysUntilCutoff !== null && daysUntilCutoff <= 3 && daysUntilCutoff >= 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-sm text-amber-800 dark:text-amber-300">
          <Bell size={16} className="shrink-0 text-amber-500 animate-pulse" />
          <span>
            <strong>Contabilidade:</strong> faltam <strong>{daysUntilCutoff === 0 ? 'menos de 1 dia' : `${daysUntilCutoff} dia(s)`}</strong> para o fechamento.
            Há <strong>{summary.notExported}</strong> nota(s) ainda não exportadas.
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={summaryLoading} />

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
        {([
          { key: 'invoices', label: 'Notas Fiscais', icon: <FileText size={14} /> },
          { key: 'history', label: 'Histórico de Exportações', icon: <Archive size={14} /> },
          { key: 'settings', label: 'Configurações', icon: <Settings size={14} /> },
        ] as { key: ActiveTab; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ─── Invoices Tab ─── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
            >
              <span className="flex items-center gap-2"><Filter size={15} /> Filtros</span>
              {showFilters ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showFilters && (
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700/60 pt-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Date range */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Data Início</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Data Fim</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="">Todos</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="ISSUED">Autorizada</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="CANCELLED">Cancelada</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="ERROR">Erro</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="QUEUED">Na fila</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="PROCESSING">Processando</option>
                    </select>
                  </div>

                  {/* Exported */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Exportação</label>
                    <select value={exportedFilter} onChange={(e) => setExportedFilter(e.target.value as 'all' | 'yes' | 'no')}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="all">Todas</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="no">Não exportadas</option>
                      <option className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value="yes">Já exportadas</option>
                    </select>
                  </div>

                  {/* Customer search */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Cliente</label>
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
                        placeholder="Nome, e-mail ou CPF"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>

                  {/* Order ID */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Nº Pedido</label>
                    <input type="text" value={orderIdFilter} onChange={(e) => { setOrderIdFilter(e.target.value); setSearchParams(e.target.value ? { order: e.target.value } : {}) }}
                      placeholder="ID do pedido"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>

                  {/* Invoice number */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Nº Nota Fiscal</label>
                    <input type="text" value={invoiceNumberFilter} onChange={(e) => setInvoiceNumberFilter(e.target.value)}
                      placeholder="Número da NF-e"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="includeHomologacao"
                    checked={includeHomologacao}
                    onChange={(e) => setIncludeHomologacao(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary-600"
                  />
                  <label htmlFor="includeHomologacao" className="text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                    Incluir notas de homologação (testes)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Bulk selection bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-2xl">
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                {selectedIds.size} nota(s) selecionada(s)
              </span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline">Deselecionar</button>
                <button
                  onClick={() => handleExport()}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Exportar ZIP
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm">Carregando notas fiscais...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma nota fiscal encontrada com os filtros aplicados.</p>
                {!includeHomologacao && (
                  <p className="text-xs mt-1 text-gray-400">Notas de homologação estão ocultas por padrão.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-3">
                        <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-primary-600 rounded" />
                      </th>
                      {['Pedido', 'Cliente', 'NF-e / Série', 'Status', 'Emissão', 'Autorização', 'Valor', 'Ambiente', 'Exportada', 'Ações'].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${selectedIds.has(inv.id) ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="w-4 h-4 accent-primary-600 rounded" />
                        </td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <button onClick={() => navigate(`/admin/orders/${inv.local_order_id}`)} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1">
                            {inv.local_order_id.substring(0, 8)}...
                            <ExternalLink size={10} />
                          </button>
                        </td>
                        <td className="px-3 py-3 max-w-[160px]">
                          <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{inv.customer_name || '—'}</div>
                          <div className="text-xs text-gray-400">{maskCpf(inv.customer_cpf)}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {inv.invoice_number ? `${inv.invoice_number}` : '—'}
                          </div>
                          <div className="text-xs text-gray-400">Série {inv.series}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(inv.created_at)}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(inv.authorized_at)}</td>
                        <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(inv.total_value)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {inv.environment === 'homologacao' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">TESTE</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">PROD</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {inv.is_exported ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={11} /> Sim
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {inv.xml_available && (
                              <button onClick={() => handleDownloadXml(inv)} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-colors" title="Baixar XML">
                                <FileText size={13} />
                              </button>
                            )}
                            {inv.danfe_available && (
                              <button onClick={() => handleDownloadDanfe(inv)} className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-600 dark:text-purple-400 transition-colors" title="Baixar DANFE">
                                <Eye size={13} />
                              </button>
                            )}
                            <button onClick={() => navigate(`/admin/orders/${inv.local_order_id}`)} className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors" title="Ver pedido">
                              <Package size={13} />
                            </button>
                            <button onClick={() => handleReconcile(inv)} className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-600 dark:text-amber-400 transition-colors" title="Reconciliar status">
                              <RefreshCw size={13} />
                            </button>
                            {inv.status === 'ISSUED' && (
                              <button onClick={() => handleResendEmail(inv)} className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-950/50 text-teal-600 dark:text-teal-400 transition-colors" title="Reenviar e-mail NF-e">
                                <Mail size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total} notas
                </span>
                <div className="inline-flex gap-1">
                  <button onClick={() => { setPage(p => p - 1); loadInvoices(page - 1) }} disabled={page <= 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">{page}/{totalPages}</span>
                  <button onClick={() => { setPage(p => p + 1); loadInvoices(page + 1) }} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── History Tab ─── */}
      {activeTab === 'history' && (
        <ExportHistory
          exports={exports}
          loading={exportsLoading}
          onRegenerate={fiscalInvoicesService.regenerateExportZip}
        />
      )}

      {/* ─── Settings Tab ─── */}
      {activeTab === 'settings' && (
        <CutoffPanel
          config={cutoffConfig}
          onChange={setCutoffConfig}
          onSave={handleSaveCutoffConfig}
          saving={savingConfig}
        />
      )}

      {/* Overlap Modal */}
      {showOverlapModal && (
        <OverlapModal
          overlaps={overlaps}
          invoiceIds={Array.from(selectedIds)}
          periodStart={startDate}
          periodEnd={endDate}
          cutoffDay={cutoffConfig.cutoff_day}
          onResolve={handleOverlapResolve}
        />
      )}
    </div>
  )
}
