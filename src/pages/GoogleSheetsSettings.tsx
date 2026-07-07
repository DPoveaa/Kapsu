import { useState, useEffect } from 'react'
import {
  Globe, Save, RefreshCw, FolderPlus, Check, ArrowLeft, Loader2,
  ExternalLink, ShieldAlert, Unlink, AlertTriangle, Plus, Trash2,
  Power, PowerOff, Settings2, ChevronRight, X, Link2, ChevronDown, ChevronUp
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from '../utils/toast'
import {
  googleSheetsService,
  GoogleSheetsIntegration,
  GoogleSheetsSyncLog,
  GoogleSheetsQueueStatus,
  GoogleSheetsOAuthStatus,
  IntegrationType,
} from '../services/google-sheets.service'

const TYPE_LABELS: Record<IntegrationType, string> = {
  ADMIN: 'Admin (completa)',
  FORNECEDOR: 'Fornecedor (simplificada)',
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
    connecting: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 animate-pulse',
    syncing: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
    error: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
    disconnected: 'bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700/40',
  }
  const labels: Record<string, string> = {
    connected: 'Conectado',
    connecting: 'Conectando...',
    syncing: 'Sincronizando',
    error: 'Erro',
    disconnected: 'Desconectado',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${colors[status] || colors.disconnected}`}>
      {labels[status] || status}
    </span>
  )
}

export default function GoogleSheetsSettings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrations, setIntegrations] = useState<GoogleSheetsIntegration[]>([])
  const [techConfigured, setTechConfigured] = useState(false)
  const [oauthStatus, setOauthStatus] = useState<GoogleSheetsOAuthStatus | null>(null)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<GoogleSheetsIntegration | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'ADMIN' as IntegrationType,
    share_email: '',
    share_role: 'writer',
    bidirectional: true,
    auto_create_sheet: true,
  })



  const [editForm, setEditForm] = useState({
    name: '',
    share_email: '',
    share_role: 'writer',
    bidirectional: true,
  })

  const [logs, setLogs] = useState<GoogleSheetsSyncLog[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logPages, setLogPages] = useState(1)
  const [queueStatus, setQueueStatus] = useState<GoogleSheetsQueueStatus | null>(null)
  const [queueExpanded, setQueueExpanded] = useState(false)
  const [queuePage, setQueuePage] = useState(1)

  useEffect(() => {
    loadAll()
    loadQueueStatus()
    const interval = setInterval(() => {
      loadAll(true)
      loadQueueStatus()
      if (selectedId) {
        loadIntegrationDetail(selectedId, true)
      }
    }, 4000)

    const oauthResult = searchParams.get('oauth')
    if (oauthResult === 'success') {
      toast.success('Conta Google conectada com sucesso!')
      searchParams.delete('oauth')
      searchParams.delete('message')
      setSearchParams(searchParams, { replace: true })
    } else if (oauthResult === 'error') {
      toast.error(searchParams.get('message') || 'Falha ao conectar conta Google')
      searchParams.delete('oauth')
      searchParams.delete('message')
      setSearchParams(searchParams, { replace: true })
    }

    return () => clearInterval(interval)
  }, [selectedId])

  useEffect(() => {
    if (selectedId) {
      loadIntegrationDetail(selectedId)
      loadLogs(selectedId, 1)
    }
  }, [selectedId])

  const loadAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await googleSheetsService.listIntegrations()
      setIntegrations(data.integrations || [])
      setTechConfigured(data.google_sheets_tech_configured)
      if (data.oauth) {
        setOauthStatus(data.oauth)
      } else {
        const oauth = await googleSheetsService.getOAuthStatus()
        setOauthStatus(oauth)
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || 'Erro ao carregar integrações')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const loadIntegrationDetail = async (id: string, silent = false) => {
    try {
      const data = await googleSheetsService.getIntegration(id)
      setSelected(data)
      setEditForm({
        name: data.name,
        share_email: data.share_email,
        share_role: data.share_role,
        bidirectional: data.bidirectional,
      })
    } catch (err: any) {
      if (!silent) toast.error(err.message)
    }
  }

  const loadLogs = async (integrationId: string, page: number) => {
    try {
      const data = await googleSheetsService.getSyncLogs(page, 10, integrationId)
      setLogs(data.logs)
      setLogPage(page)
      setLogPages(data.pages)
    } catch (err) {
      console.error(err)
    }
  }

  const loadQueueStatus = async () => {
    try {
      const data = await googleSheetsService.getQueueStatus()
      setQueueStatus(data)
    } catch (err) {
      console.error(err)
    }
  }



  const runAction = async (key: string, fn: () => Promise<any>, successMsg?: string) => {
    try {
      setActionLoading(key)
      const res = await fn()
      if (successMsg || res.message) toast.success(successMsg || res.message)
      if (res.data?.url) window.open(res.data.url, '_blank')
      await loadAll()
      if (selectedId) await loadIntegrationDetail(selectedId)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta tarefa de sincronização?')) return
    await runAction(`cancel-job-${jobId}`, () => googleSheetsService.cancelQueueJob(jobId), 'Tarefa cancelada com sucesso!')
    await loadQueueStatus()
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error('Informe o nome da integração')
      return
    }
    if (createForm.type === 'FORNECEDOR' && !createForm.share_email.trim()) {
      toast.error('Informe o e-mail do fornecedor para compartilhamento automático')
      return
    }
    await runAction('create', () => googleSheetsService.createIntegration({
      ...createForm,
      enabled: true,
    }), 'Integração criada!')
    setShowCreate(false)
    setCreateForm({ name: '', type: 'ADMIN', share_email: '', share_role: 'writer', bidirectional: true, auto_create_sheet: true })
  }

  const handleOAuthConnect = async () => {
    try {
      setOauthLoading(true)
      const url = await googleSheetsService.getOAuthAuthorizeUrl()
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message)
      setOauthLoading(false)
    }
  }

  const handleOAuthDisconnect = async () => {
    if (!confirm('Desconectar a conta Google? As integrações deixarão de sincronizar até reconectar.')) return
    try {
      setOauthLoading(true)
      const res = await googleSheetsService.disconnectOAuth()
      toast.success(res.message)
      await loadAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOauthLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedId) return
    try {
      setSaving(true)
      await googleSheetsService.updateIntegration(selectedId, editForm)
      toast.success('Configurações salvas!')
      await loadAll()
      await loadIntegrationDetail(selectedId)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin/settings')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para Configurações
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Globe className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            Integrações Google Sheets
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie múltiplas planilhas sincronizadas com perfis distintos</p>
        </div>
        <div className="flex items-center gap-2">

          <button
            onClick={() => setShowCreate(true)}
            disabled={!techConfigured}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 font-semibold text-sm transition-all shadow-sm"
          >
            <Plus className="w-4.5 h-4.5" /> Nova Integração
          </button>
        </div>
      </div>

      {!oauthStatus?.oauth_env_configured && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">OAuth do Google Sheets não configurado</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Configure no servidor: {oauthStatus?.missing_env_vars?.join(', ') || 'GOOGLE_SHEETS_OAUTH_CLIENT_ID, GOOGLE_SHEETS_OAUTH_CLIENT_SECRET, GOOGLE_SHEETS_OAUTH_REDIRECT_URI'}
            </p>
          </div>
        </div>
      )}

      {oauthStatus?.oauth_env_configured && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${oauthStatus.oauth_connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Link2 className={`w-5 h-5 ${oauthStatus.oauth_connected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Conta Google (OAuth 2.0)</h2>
                {oauthStatus.oauth_connected ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{oauthStatus.connected_email}</p>
                    {oauthStatus.connected_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Conectado em {new Date(oauthStatus.connected_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Nenhuma conta conectada. Faça login uma vez para habilitar sincronização.</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!oauthStatus.oauth_connected ? (
                <button
                  onClick={handleOAuthConnect}
                  disabled={oauthLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Conectar com Google
                </button>
              ) : (
                <>
                  <button
                    onClick={handleOAuthConnect}
                    disabled={oauthLoading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" /> Reconectar
                  </button>
                  <button
                    onClick={handleOAuthDisconnect}
                    disabled={oauthLoading}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                  >
                    <Unlink className="w-4 h-4" /> Desconectar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de integrações */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-wider uppercase">Integrações ({integrations.length})</h2>
          {integrations.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 shadow-sm">
              <FolderPlus className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">Nenhuma integração configurada</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline">
                Criar primeira integração
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => setSelectedId(integration.id)}
                  className={`w-full text-left bg-white dark:bg-gray-800 border rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 ${selectedId === integration.id ? 'border-primary-600 dark:border-primary-400 ring-2 ring-primary-500/20 dark:ring-primary-400/20 shadow-sm' : 'border-gray-200/80 dark:border-gray-700 shadow-sm'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{integration.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{TYPE_LABELS[integration.type]}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-1" />
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={integration.connection_status} />
                    {integration.enabled ? (
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-2 py-0.5 rounded">Ativa</span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Inativa</span>
                    )}
                    {integration.watch_channel_active && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">Watch ativo</span>
                    )}
                    {integration.auto_created && (
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded">Auto-criada</span>
                    )}
                  </div>
                  {integration.last_sync && (
                    <p className="text-xs text-gray-400 dark:text-gray-550 mt-2.5">
                      Última sync: {new Date(integration.last_sync).toLocaleString('pt-BR')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhe da integração */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center text-gray-450 dark:text-gray-500 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <Settings2 className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700 animate-pulse" />
              <p className="text-sm font-medium">Selecione uma integração para ver detalhes e ações operacionais</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{TYPE_LABELS[selected.type]}</p>
                  </div>
                  <StatusBadge status={selected.connection_status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800/40">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Spreadsheet ID:</span>
                    <br />
                    <code className="text-xs bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-1.5 py-0.5 rounded break-all mt-1 block dark:text-gray-300">
                      {selected.spreadsheet_id || '—'}
                    </code>
                  </div>
                  <div><span className="text-gray-500 dark:text-gray-400 font-medium">Produtos sincronizados:</span><br /><span className="text-base font-semibold dark:text-gray-200">{selected.synced_products_count ?? 0}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400 font-medium">Abas ativas na Planilha:</span><br /><span className="dark:text-gray-200">{selected.tabs.join(', ')}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400 font-medium">Watch Channel de Alterações:</span><br /><span className="dark:text-gray-200">{selected.watch_channel_active ? 'Ativo' : 'Inativo'}</span></div>
                </div>

                {selected.last_error && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 flex gap-2.5 mb-2 shadow-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                    <p>{selected.last_error}</p>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nome da Integração</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">E-mail para Compartilhamento</label>
                      <input
                        value={editForm.share_email}
                        onChange={(e) => setEditForm({ ...editForm, share_email: e.target.value })}
                        className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
                        placeholder="fornecedor@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Permissão de Compartilhamento</label>
                      <select
                        value={editForm.share_role}
                        onChange={(e) => setEditForm({ ...editForm, share_role: e.target.value })}
                        className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
                      >
                        <option value="writer">Editor (Gravação)</option>
                        <option value="reader">Leitor (Apenas leitura)</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.bidirectional}
                      onChange={(e) => setEditForm({ ...editForm, bidirectional: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4.5 h-4.5"
                    />
                    Sincronização bidirecional (planilha → painel local)
                  </label>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                    Salvar Configurações
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-sm space-y-6">
                <h3 className="font-bold text-gray-900 dark:text-white text-base border-b dark:border-gray-700 pb-2 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-gray-500" />
                  Ações Operacionais
                </h3>
                
                {selected.spreadsheet_id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Grupo 1: Sincronização & Visualização */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Visualizar e Sincronizar</h4>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${selected.spreadsheet_id}`, '_blank')}
                          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 text-gray-750 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all shadow-sm"
                        >
                          <ExternalLink className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" /> Abrir no Google Sheets
                        </button>
                        <button
                          onClick={() => runAction('sync', () => googleSheetsService.syncIntegration(selected.id))}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 text-gray-750 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading === 'sync' ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <RefreshCw className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />}
                          Sincronizar Dados Agora
                        </button>
                        <button
                          onClick={() => runAction('test', () => googleSheetsService.testConnection(selected.id))}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 text-gray-750 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading === 'test' ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5 text-green-500" />}
                          Testar Conectividade
                        </button>
                      </div>
                    </div>

                    {/* Grupo 2: Estrutura & Manutenção */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Manutenção de Estrutura</h4>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => runAction('recreate', () => googleSheetsService.recreateStructure(selected.id))}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 dark:bg-amber-950/20 rounded-xl text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all shadow-sm disabled:opacity-50"
                        >
                          <Settings2 className="w-4.5 h-4.5" /> Recriar Estrutura e Formatar
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          Recria as abas oficiais da planilha, aplica as cores de cabeçalho verdes, validações suspensas e formatações de colunas sem apagar os dados existentes.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <button
                      onClick={() => runAction('create-sheet', () => googleSheetsService.createSheet(selected.id))}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-md"
                    >
                      {actionLoading === 'create-sheet' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderPlus className="w-5 h-5" />}
                      Criar Planilha no Drive Automaticamente
                    </button>
                  </div>
                )}

                {/* Grupo 3: Gerenciamento e Exclusão */}
                <div className="border-t dark:border-gray-700 pt-4 mt-6">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Status e Remoção</h4>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {selected.enabled ? (
                      <button
                        onClick={() => runAction('disable', () => googleSheetsService.disableIntegration(selected.id))}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-750 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors shadow-sm"
                      >
                        <PowerOff className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Desativar Integração
                      </button>
                    ) : (
                      <button
                        onClick={() => runAction('enable', () => googleSheetsService.enableIntegration(selected.id))}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-750 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors shadow-sm"
                      >
                        <Power className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Ativar Integração
                      </button>
                    )}

                    {selected.spreadsheet_id && (
                      <button
                        onClick={() => runAction('disconnect', () => googleSheetsService.disconnectIntegration(selected.id))}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-400 dark:bg-orange-950/20 rounded-xl text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Unlink className="w-4 h-4" /> Desconectar Planilha
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (!confirm('Excluir esta integração? A planilha no Google Drive não será apagada.')) return
                        const idToDelete = selected.id
                        setSelectedId(null)
                        setSelected(null)
                        await runAction('delete', () => googleSheetsService.deleteIntegration(idToDelete))
                      }}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 dark:bg-red-950/20 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shadow-sm disabled:opacity-50 sm:ml-auto"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir Integração
                    </button>
                  </div>
                </div>
              </div>

              {selected.spreadsheet_id && selected.tabs.some(t => t.toLowerCase() === 'pedidos' || t.toLowerCase() === 'produtos') && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary-600" />
                    Gatilho de Atualização de Status (Apps Script)
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Para que a planilha envie atualizações de status instantaneamente ao banco de dados sem precisar de varreduras completas lentas, configure este script na sua planilha:
                  </p>
                  <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal pl-5 space-y-2 leading-relaxed">
                    <li>Na planilha do Google Sheets, clique em <strong>Extensões</strong> no menu superior e depois em <strong>Apps Script</strong>.</li>
                    <li>Apague todo o código existente lá e cole o código abaixo.</li>
                    <li>Clique em <strong>Salvar Projeto</strong> (ícone de disquete) na barra superior do editor.</li>
                    <li>No menu lateral esquerdo do Apps Script, clique no ícone de relógio (<strong>Acionadores</strong> ou <strong>Triggers</strong>).</li>
                    <li>Clique em <strong>Adicionar Acionador</strong> no canto inferior direito.</li>
                    <li>Selecione a função <code>aoEditar</code>, escolha o evento <strong>Ao editar</strong> (On edit) e clique em <strong>Salvar</strong>.</li>
                    <li>Autorize o script a fazer conexões externas seguindo as instruções da janela do Google (clique em seu e-mail, depois em <strong>Avançado</strong> e em <strong>Acessar Projeto (não seguro)</strong>).</li>
                  </ol>
                  <div className="relative">
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900/80 border border-gray-150 dark:border-gray-850 p-4 rounded-xl overflow-x-auto select-all max-h-[300px] text-gray-850 dark:text-gray-350 leading-relaxed font-mono">
{`function aoEditar(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName().toLowerCase();
  
  if (sheetName !== "pedidos" && sheetName !== "pedido" && sheetName !== "orders") return;
  
  var row = range.getRow();
  var col = range.getColumn();
  if (row === 1) return;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var statusColIdx = headers.findIndex(function(h) {
    var nh = h.toString().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, '');
    return nh === "statusentrega" || nh === "status";
  }) + 1;
  
  var idColIdx = headers.findIndex(function(h) {
    var nh = h.toString().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, '');
    return nh === "idpedido" || nh === "id";
  }) + 1;
  
  if (statusColIdx <= 0 || idColIdx <= 0) return;
  
  if (col === statusColIdx) {
    var newStatus = range.getValue().toString();
    var orderFormulaOrId = sheet.getRange(row, idColIdx).getValue().toString();
    var orderId = orderFormulaOrId;
    
    if (orderFormulaOrId.toUpperCase().indexOf("=HYPERLINK(") === 0) {
      var match = orderFormulaOrId.match(/^=HYPERLINK\\(\\s*"[^"]*"\\s*[,;]\\s*"([^"]*)"\\s*\\)$/i);
      if (match) {
        orderId = match[1];
      }
    }
    
    if (!orderId) return;
    
    var payload = {
      integrationId: "${selected.id}",
      orderId: orderId,
      status: newStatus,
      rowIndex: row,
      token: "${selected.trigger_token}"
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    try {
      UrlFetchApp.fetch("${selected.api_url}/api/admin/google-sheets/update-status", options);
    } catch(err) {
      Logger.log("Erro ao enviar: " + err.message);
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Campos Sincronizados de Produtos</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.synced_fields.map((field) => (
                    <span key={field} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Logs de Sincronização Recentes</h3>
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum log registrado para esta integração</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="text-sm border border-gray-100 dark:border-gray-700/60 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-900/40 shadow-sm">
                        <div className="flex justify-between">
                          <span className={`font-bold ${log.status === 'SUCCESS' ? 'text-green-700 dark:text-green-400' : log.status === 'FAILURE' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {log.status === 'SUCCESS' ? 'Sucesso' : log.status === 'FAILURE' ? 'Falha' : log.status}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">{new Date(log.started_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-450 mt-1.5 leading-relaxed">
                          Processados: <strong>{log.processed_count}</strong> | Criados: <strong>{log.created_count}</strong> | Atualizados: <strong>{log.updated_count}</strong> | Falhas: <strong className={log.failed_count > 0 ? 'text-red-600 dark:text-red-400' : ''}>{log.failed_count}</strong>
                        </p>
                      </div>
                    ))}
                    {logPages > 1 && (
                      <div className="flex gap-2 justify-center pt-2">
                        <button disabled={logPage <= 1} onClick={() => loadLogs(selected.id, logPage - 1)} className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40">Anterior</button>
                        <span className="text-sm text-gray-500 dark:text-gray-400 py-1.5 px-3 font-semibold">{logPage}/{logPages}</span>
                        <button disabled={logPage >= logPages} onClick={() => loadLogs(selected.id, logPage + 1)} className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40">Próxima</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fila global */}
      {queueStatus && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Fila de Sincronização (PostgreSQL)
            </h3>
            <button
              onClick={() => setQueueExpanded(!queueExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              {queueExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Recolher Fila
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Detalhar Fila
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-sm mb-4">
            {Object.entries(queueStatus.counts).map(([status, count]) => (
              <div key={status} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/40 rounded-xl p-3 shadow-sm">
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">{count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-455 capitalize font-medium mt-0.5">{status}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runAction('queue', () => googleSheetsService.processQueueNow())}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-755 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              Processar Fila
            </button>
            <button
              onClick={() => runAction('clear-finished', async () => {
                const res = await googleSheetsService.clearFinishedQueue();
                await loadQueueStatus();
                return res;
              })}
              className="px-4 py-2 border border-red-200 dark:border-red-800/50 dark:bg-red-950/10 text-red-700 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shadow-sm"
            >
              Limpar Finalizadas e Falhas
            </button>
            <button
              onClick={() => runAction('cleanup', () => googleSheetsService.cleanupQueueHistory())}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-755 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              Limpar Histórico (30 dias)
            </button>
          </div>

          {/* Detailed Job Queue List - Collapsible & Paginated */}
          {queueExpanded && queueStatus.recentJobs && queueStatus.recentJobs.length > 0 && (() => {
            const pageSize = 5;
            const totalJobs = queueStatus.recentJobs.length;
            const totalPages = Math.ceil(totalJobs / pageSize);
            const currentPage = Math.min(queuePage, totalPages || 1);
            const startIndex = (currentPage - 1) * pageSize;
            const paginatedJobs = queueStatus.recentJobs.slice(startIndex, startIndex + pageSize);

            return (
              <div className="mt-6 border-t dark:border-gray-700 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-wider uppercase mb-3">
                  Tarefas na Fila (Exibindo {startIndex + 1}-{Math.min(startIndex + pageSize, totalJobs)} de {totalJobs})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-150 dark:border-gray-700/60 shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Tipo / ID</th>
                        <th className="px-4 py-3">Integração / Tabela</th>
                        <th className="px-4 py-3">Entidade</th>
                        <th className="px-4 py-3">Tentativas</th>
                        <th className="px-4 py-3">Data Criação</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/40">
                      {paginatedJobs.map((job) => {
                        const isActive = ['pending', 'processing', 'failed'].includes(job.status)
                        const isPending = job.status === 'pending'
                        const isProcessing = job.status === 'processing'
                        const isCompleted = job.status === 'completed'
                        const isFailed = job.status === 'failed'
                        const isCancelled = job.status === 'cancelled'

                        let statusBadge = 'bg-gray-100 text-gray-600'
                        if (isPending) statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        if (isProcessing) statusBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse'
                        if (isCompleted) statusBadge = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        if (isFailed) statusBadge = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        if (isCancelled) statusBadge = 'bg-gray-200 text-gray-700 dark:bg-gray-750 dark:text-gray-400'

                        return (
                          <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                            <td className="px-4 py-3.5 font-medium">
                              <span className="block text-gray-900 dark:text-white font-semibold">{job.job_type}</span>
                              <span className="block text-xs text-gray-450 dark:text-gray-500 font-mono mt-0.5">{job.id}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="block font-semibold text-gray-850 dark:text-gray-200">
                                {job.integration_name || 'Global / Todos'}
                              </span>
                              {job.integration_type && (
                                <span className="block text-xs text-gray-400">
                                  {TYPE_LABELS[job.integration_type as IntegrationType] || job.integration_type}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {job.entity_id ? (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-105 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 rounded dark:text-gray-300 font-mono">
                                  {job.entity_id}
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-medium dark:text-gray-300">
                              {job.attempts} / {job.max_attempts}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-gray-400 font-medium">
                              {new Date(job.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadge}`}>
                                {job.status === 'pending' ? 'Pendente' :
                                 job.status === 'processing' ? 'Processando' :
                                 job.status === 'completed' ? 'Sucesso' :
                                 job.status === 'failed' ? 'Falha' :
                                 job.status === 'cancelled' ? 'Cancelado' : job.status}
                              </span>
                              {job.last_error && (
                                <span className="block text-xs text-red-500 max-w-[200px] truncate mt-1" title={job.last_error}>
                                  {job.last_error}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {isActive && (
                                <button
                                  onClick={() => handleCancelJob(job.id)}
                                  disabled={actionLoading === `cancel-job-${job.id}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                                >
                                  {actionLoading === `cancel-job-${job.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <X className="w-3.5 h-3.5" />
                                  )}
                                  Cancelar
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex gap-2 justify-center pt-4">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setQueuePage(currentPage - 1)}
                      className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 py-1.5 px-3 font-semibold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setQueuePage(currentPage + 1)}
                      className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal criar integração */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 border-b dark:border-gray-700 pb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Integração Google Sheets</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nome Identificador</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
                  placeholder="Ex: Fornecedor Farmácia X"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de Perfil</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as IntegrationType })}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
                >
                  <option value="ADMIN">ADMIN — Planilha completa interna</option>
                  <option value="FORNECEDOR">FORNECEDOR — Planilha simplificada de catálogo</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">E-mail de Acesso {createForm.type === 'FORNECEDOR' && <span className="text-red-500">*</span>}</label>
                <input
                  value={createForm.share_email}
                  onChange={(e) => setCreateForm({ ...createForm, share_email: e.target.value })}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
                  placeholder="email@fornecedor.com"
                />
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-350 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={createForm.auto_create_sheet}
                  onChange={(e) => setCreateForm({ ...createForm, auto_create_sheet: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4.5 h-4.5"
                />
                Criar arquivo de planilha automaticamente no Drive
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-355 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.bidirectional}
                  onChange={(e) => setCreateForm({ ...createForm, bidirectional: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4.5 h-4.5"
                />
                Sincronizar alterações da planilha de volta para o painel
              </label>
            </div>
            <div className="flex gap-3 mt-6 border-t dark:border-gray-700 pt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-750 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl text-sm font-semibold transition-colors">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={!!actionLoading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Integração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
