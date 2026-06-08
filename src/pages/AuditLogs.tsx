import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Search, Calendar, Shield, Filter, RotateCcw, 
  CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, Eye, RefreshCw,
  Globe, Laptop
} from 'lucide-react'
import { adminService, AuditLog } from '../services/admin.service'
import AdminModal from '../components/AdminModal'

const RESOURCE_LABELS: Record<string, string> = {
  PRODUCT: 'Produto',
  SHIPPING_CONFIG: 'Frete & Configurações',
  PROMOTION: 'Promoção',
  PROMO_CODE: 'Cupom de Desconto',
  BANNER: 'Banner',
  HOME_SECTION: 'Seção Home',
  USER: 'Usuário',
  ORDER: 'Pedido'
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
  REVEAL_PERSONAL_DATA: 'Acesso a Dados',
  CHANGE_STATUS: 'Status Alterado'
}

export default function AuditLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Filtering States
  const [userEmail, setUserEmail] = useState('')
  const [requestId, setRequestId] = useState('')
  const [resource, setResource] = useState('')
  const [action, setAction] = useState('')
  const [result, setResult] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [userAgent, setUserAgent] = useState('')
  
  // Pagination States
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  
  // Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Trigger loads
  useEffect(() => {
    loadLogs()
  }, [page, limit])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const offset = (page - 1) * limit
      const response = await adminService.getAuditLogs({
        limit,
        offset,
        action: action || undefined,
        resource: resource || undefined,
        userEmail: userEmail || undefined,
        result: result || undefined,
        requestId: requestId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      })

      if (response.success) {
        setLogs(response.data.logs)
        setTotal(response.data.total)
      }
    } catch (error: any) {
      console.error('Erro ao buscar logs de auditoria:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadLogs()
  }

  const handleResetFilters = () => {
    setUserEmail('')
    setRequestId('')
    setResource('')
    setAction('')
    setResult('')
    setStartDate('')
    setEndDate('')
    setIpAddress('')
    setUserAgent('')
    setPage(1)
    
    // Quick load after reset
    setTimeout(() => {
      adminService.getAuditLogs({ limit, offset: 0 }).then(response => {
        if (response.success) {
          setLogs(response.data.logs)
          setTotal(response.data.total)
        }
      }).catch(err => console.error(err))
    }, 50)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionBadge = (actionName: string) => {
    const badges: Record<string, string> = {
      CREATE: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
      UPDATE: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      DELETE: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
      REVEAL_PERSONAL_DATA: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
      CHANGE_STATUS: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    }

    const style = badges[actionName] || 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
    const label = ACTION_LABELS[actionName] || actionName

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${style}`}>
        {label}
      </span>
    )
  }

  const getResultBadge = (res: 'SUCCESS' | 'FAILURE') => {
    if (res === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-3.5 h-3.5" />
          Sucesso
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <XCircle className="w-3.5 h-3.5" />
        Falha
      </span>
    )
  }

  const getParsedState = (stateVal: any) => {
    if (!stateVal) return null
    if (typeof stateVal === 'object') return stateVal
    try {
      return JSON.parse(stateVal)
    } catch {
      return stateVal
    }
  }

  const renderStateDiff = (before: any, after: any) => {
    const beforeObj = getParsedState(before)
    const afterObj = getParsedState(after)

    if (!beforeObj && !afterObj) {
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center text-sm text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
          Nenhuma alteração de estado registrada.
        </div>
      )
    }

    // If one of them is primitive (like a string message) or an array, pretty print both
    const isObject = (val: any) => val !== null && typeof val === 'object' && !Array.isArray(val)
    
    if ((beforeObj && !isObject(beforeObj)) || (afterObj && !isObject(afterObj))) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado Anterior</h4>
            <pre className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-mono overflow-auto max-h-60 text-gray-700 dark:text-gray-300">
              {beforeObj ? JSON.stringify(beforeObj, null, 2) : '(vazio)'}
            </pre>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado Posterior</h4>
            <pre className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-mono overflow-auto max-h-60 text-gray-700 dark:text-gray-300">
              {afterObj ? JSON.stringify(afterObj, null, 2) : '(vazio)'}
            </pre>
          </div>
        </div>
      )
    }

    const allKeys = Array.from(new Set([
      ...Object.keys(beforeObj || {}),
      ...Object.keys(afterObj || {})
    ])).filter(key => key !== 'password' && key !== 'token' && key !== 'client_secret') // final check

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-left text-gray-600 dark:text-gray-300">
                <th className="p-3 font-semibold w-1/4">Campo</th>
                <th className="p-3 font-semibold w-3/8">Antes</th>
                <th className="p-3 font-semibold w-3/8">Depois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {allKeys.map(key => {
                const beforeVal = beforeObj ? beforeObj[key] : undefined
                const afterVal = afterObj ? afterObj[key] : undefined
                
                const beforeStr = beforeVal !== undefined ? (typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal)) : undefined
                const afterStr = afterVal !== undefined ? (typeof afterVal === 'object' ? JSON.stringify(afterVal) : String(afterVal)) : undefined
                
                const isDifferent = beforeStr !== afterStr

                if (!isDifferent) {
                  return (
                    <tr key={key} className="text-gray-500 hover:bg-gray-50/20 dark:hover:bg-gray-800/10">
                      <td className="p-3 font-mono text-xs font-semibold">{key}</td>
                      <td className="p-3 font-mono text-xs truncate max-w-[250px]" title={beforeStr}>{beforeStr !== undefined ? beforeStr : '-'}</td>
                      <td className="p-3 font-mono text-xs truncate max-w-[250px]" title={afterStr}>{afterStr !== undefined ? afterStr : '-'}</td>
                    </tr>
                  )
                }

                return (
                  <tr key={key} className="bg-yellow-50/30 dark:bg-yellow-500/5 hover:bg-yellow-50/50 dark:hover:bg-yellow-500/10 font-medium">
                    <td className="p-3 font-mono text-xs text-yellow-800 dark:text-yellow-400 font-bold">{key}</td>
                    <td className="p-3 font-mono text-xs text-rose-600 dark:text-rose-400 bg-rose-50/20 dark:bg-rose-500/5 line-through truncate max-w-[250px]" title={beforeStr}>
                      {beforeStr !== undefined ? beforeStr : <span className="italic text-gray-400 dark:text-gray-600">(inexistente)</span>}
                    </td>
                    <td className="p-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/5 truncate max-w-[250px]" title={afterStr}>
                      {afterStr !== undefined ? afterStr : <span className="italic text-gray-400 dark:text-gray-600">(removido)</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        
        {/* Breadcrumb Header */}
        <div className="mb-6 lg:mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-3 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao painel
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                Auditoria do Sistema
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Log completo e imutável de ações administrativas críticas
              </p>
            </div>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Logs
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 mb-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">Filtros de Busca</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* User Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">E-mail do Administrador</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por e-mail..."
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Request ID */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Request ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por Request ID..."
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Resource Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Recurso Afetado</label>
                <select
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todos os recursos</option>
                  {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label} ({key})</option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Ação Realizada</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todas as ações</option>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Result Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Resultado</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todos os resultados</option>
                  <option value="SUCCESS">Sucesso</option>
                  <option value="FAILURE">Falha</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Data Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Data Final</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* IP Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Endereço IP</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por IP..."
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* User Agent */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">User-Agent</label>
                <div className="relative">
                  <Laptop className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por navegador..."
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex items-end justify-end gap-3 sm:col-span-2 md:col-span-3 lg:col-span-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors bg-white dark:bg-gray-800"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpar
                </button>
                <button
                  type="submit"
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* Logs Table Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Carregando logs de auditoria...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Info className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Nenhum log encontrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                Não existem logs cadastrados que correspondam aos filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between">
              
              {/* Responsive Table Wrapper */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-left text-gray-600 dark:text-gray-300">
                      <th className="p-4 font-semibold">Data / Hora</th>
                      <th className="p-4 font-semibold">Usuário (Admin)</th>
                      <th className="p-4 font-semibold">Ação</th>
                      <th className="p-4 font-semibold">Recurso Afetado</th>
                      <th className="p-4 font-semibold">ID Recurso</th>
                      <th className="p-4 font-semibold">IP</th>
                      <th className="p-4 font-semibold">Resultado</th>
                      <th className="p-4 font-semibold">Request ID</th>
                      <th className="p-4 font-semibold text-center">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <td className="p-4 font-medium whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="font-semibold block">{log.user_email || 'Sistema'}</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">{log.user_role || 'system'}</span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">
                          {RESOURCE_LABELS[log.resource] || log.resource}
                        </td>
                        <td className="p-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">
                          {log.resource_id || '-'}
                        </td>
                        <td className="p-4 whitespace-nowrap font-mono text-xs text-gray-700 dark:text-gray-300">
                          {log.ip_address || '-'}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {getResultBadge(log.result)}
                        </td>
                        <td className="p-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">
                          {log.request_id ? `${log.request_id.substring(0, 8)}...` : '-'}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedLog(log)
                              setIsModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Custom Sticky Footer Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
                <div className="flex items-center gap-4">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Mostrando <strong className="font-semibold text-gray-800 dark:text-white">{logs.length}</strong> de <strong className="font-semibold text-gray-800 dark:text-white">{total}</strong> registros
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Exibir:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value))
                        setPage(1)
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-white focus:ring-primary-500"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Página {page} de {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <AdminModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedLog(null)
          }}
          title={`Detalhes do Log #${selectedLog.id}`}
          widthClass="max-w-4xl"
          footer={
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedLog(null)
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            
            {/* Meta Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 rounded-2xl text-sm">
              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Data & Hora</span>
                <p className="font-semibold text-gray-800 dark:text-white">{formatDate(selectedLog.created_at)}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Administrador Responsável</span>
                <p className="font-semibold text-gray-800 dark:text-white truncate" title={selectedLog.user_email || 'Sistema'}>
                  {selectedLog.user_email || 'Sistema'}
                </p>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono font-semibold">{selectedLog.user_role || 'system'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Ação Realizada</span>
                <div>{getActionBadge(selectedLog.action)}</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Recurso Afetado</span>
                <p className="font-semibold text-gray-800 dark:text-white">{RESOURCE_LABELS[selectedLog.resource] || selectedLog.resource}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">ID do Recurso</span>
                <p className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{selectedLog.resource_id || '-'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Resultado</span>
                <div>{getResultBadge(selectedLog.result)}</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Endereço IP</span>
                <p className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  {selectedLog.ip_address || '-'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 font-semibold uppercase">Request ID</span>
                <p className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 break-all">{selectedLog.request_id || '-'}</p>
              </div>

              <div className="space-y-0.5 sm:col-span-3">
                <span className="text-xs text-gray-400 font-semibold uppercase">Navegador / User-Agent</span>
                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5 break-all">
                  <Laptop className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {selectedLog.user_agent || '-'}
                </p>
              </div>
            </div>

            {/* Error Message if FAILURE */}
            {selectedLog.result === 'FAILURE' && selectedLog.error_message && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase block mb-1">Mensagem de Erro / Falha</span>
                <p className="font-mono text-xs text-rose-700 dark:text-rose-300 break-all bg-white dark:bg-gray-900/60 p-2.5 rounded-lg border border-rose-100 dark:border-rose-950/80">
                  {selectedLog.error_message}
                </p>
              </div>
            )}

            {/* Before / After State Changes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">Alterações de Estado (Dados Mascarados)</h3>
              </div>
              
              {renderStateDiff(selectedLog.before_state, selectedLog.after_state)}
            </div>

          </div>
        </AdminModal>
      )}

    </div>
  )
}
