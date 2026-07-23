import { useEffect, useLayoutEffect, useMemo, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  KeyRound, Plus, Play, Pause, Trash2, Clock, CheckCircle2,
  AlertTriangle, Skull, ShieldAlert, RotateCcw, Eye, MoreVertical, Search,
  Loader2, Database, Copy
} from 'lucide-react';
import { aiApiKeysService, AiApiKey, AiKeyPoolStatus, DuplicateApiKeyError } from '../services/ai-api-keys.service';
import { toast, confirm } from '../utils/toast';
import AdminModal from '../components/AdminModal';

const HEALTH_LABELS: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Saudável', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  cooling_down: { label: 'Cooldown', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  daily_quota_reached: { label: 'Quota diária', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  temporary_error: { label: 'Erro temporário', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  suspected_dead: { label: 'Suspeita', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  dead: { label: 'Morta', color: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200' },
  disabled: { label: 'Desativada', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  invalid: { label: 'Inválida', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const SOURCE_LABELS: Record<string, string> = {
  database: 'Banco',
  env: '.env',
  mixed: 'Misto',
  none: 'Nenhuma',
};

type SortOption = 'priority' | 'last_success' | 'last_error' | 'name' | 'updated';

interface Filters {
  search: string;
  provider: string;
  healthStatus: string;
  enabled: 'all' | 'active' | 'inactive';
  sortBy: SortOption;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function keyLabel(key: AiApiKey) {
  return `${key.name} (${key.key_preview})`;
}
function providerLabel(provider: string) {
  const normalized = provider.trim().toLowerCase();
  if (normalized === 'gemini') return 'Gemini';
  if (!normalized) return 'IA';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function parseApiKeys(value: string) {
  return value
    .split(/[\s,;]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

export default function ManageAIKeys() {
  const [keys, setKeys] = useState<AiApiKey[]>([]);
  const [status, setStatus] = useState<AiKeyPoolStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [auditKey, setAuditKey] = useState<AiApiKey | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    message: string;
    existingKey: DuplicateApiKeyError['existingKey'];
    canReactivate: boolean;
  } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    provider: 'all',
    healthStatus: 'all',
    enabled: 'all',
    sortBy: 'priority',
  });
  const [formData, setFormData] = useState({
    name: '',
    provider: 'gemini',
    model: '',
    apiKey: '',
    priority: 0,
    testOnCreate: true,
  });


  const loadData = async () => {
    try {
      setLoading(true);
      const [keysData, statusData] = await Promise.all([
        aiApiKeysService.listKeys(),
        aiApiKeysService.getStatus(),
      ]);
      setKeys(keysData);
      setStatus(statusData);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar chaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const providers = useMemo(() => {
    const set = new Set(keys.map((k) => k.provider));
    return Array.from(set).sort();
  }, [keys]);

  const filteredKeys = useMemo(() => {
    let result = [...keys];

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (k) =>
          k.name.toLowerCase().includes(q) ||
          k.key_preview.toLowerCase().includes(q) ||
          k.provider.toLowerCase().includes(q)
      );
    }
    if (filters.provider !== 'all') {
      result = result.filter((k) => k.provider === filters.provider);
    }
    if (filters.healthStatus !== 'all') {
      result = result.filter((k) => k.health_status === filters.healthStatus);
    }
    if (filters.enabled === 'active') result = result.filter((k) => k.enabled);
    if (filters.enabled === 'inactive') result = result.filter((k) => !k.enabled);

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'last_success': {
          const ta = a.last_success_at ? new Date(a.last_success_at).getTime() : 0;
          const tb = b.last_success_at ? new Date(b.last_success_at).getTime() : 0;
          return tb - ta;
        }
        case 'last_error': {
          const ta = a.last_error_at ? new Date(a.last_error_at).getTime() : 0;
          const tb = b.last_error_at ? new Date(b.last_error_at).getTime() : 0;
          return tb - ta;
        }
        case 'updated': {
          const ta = new Date(a.updated_at).getTime();
          const tb = new Date(b.updated_at).getTime();
          return tb - ta;
        }
        case 'priority':
        default:
          return b.priority - a.priority || a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [keys, filters]);

  const stats = useMemo(() => {
    const active = keys.filter((k) => k.enabled).length;
    const inactive = keys.length - active;
    const lastUpdated = keys.reduce<string | null>((latest, k) => {
      if (!latest || new Date(k.updated_at) > new Date(latest)) return k.updated_at;
      return latest;
    }, null);
    return { active, inactive, lastUpdated };
  }, [keys]);

  const runAction = async (
    key: AiApiKey,
    actionKey: string,
    action: () => Promise<unknown>,
    successMsg: string,
    toastType: 'success' | 'warning' = 'success'
  ) => {
    try {
      setActionLoading(`${key.id}:${actionKey}`);
      setOpenMenuId(null);
      await action();
      if (toastType === 'warning') toast.warning(successMsg);
      else toast.success(successMsg);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro na operação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTest = async (key: AiApiKey) => {
    try {
      setActionLoading(`${key.id}:test`);
      setOpenMenuId(null);
      const result = await aiApiKeysService.testKey(key.id);
      if (result.success) {
        toast.success(
          `Chave "${key.name}" testada com sucesso${result.responseTimeMs ? ` (${result.responseTimeMs}ms)` : ''}`,
          4000
        );
      } else {
        toast.warning(`Teste de "${key.name}" falhou: ${result.message}`, 5000);
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar chave');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDangerous = (
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirmar'
  ) => {
    confirm.show(message, onConfirm, undefined, confirmText, 'Cancelar');
  };

  const handleDisable = (key: AiApiKey) => {
    const isHealthy = key.enabled && key.health_status === 'healthy';
    const execute = () =>
      runAction(key, 'disable', () => aiApiKeysService.disableKey(key.id), `Chave "${key.name}" desativada`);

    if (isHealthy) {
      confirmDangerous(
        `Desativar a chave ${keyLabel(key)}?\n\nEla deixará de ser usada na rotação até ser reativada.`,
        execute,
        'Desativar'
      );
    } else {
      execute();
    }
  };

  const handleMarkDead = (key: AiApiKey) => {
    confirmDangerous(
      `Marcar ${keyLabel(key)} como morta?\n\nA chave será desativada e não será usada na rotação automática.`,
      () =>
        runAction(
          key,
          'dead',
          () => aiApiKeysService.markDead(key.id),
          `Chave "${key.name}" marcada como morta`,
          'warning'
        ),
      'Marcar como morta'
    );
  };

  const handleRemove = (key: AiApiKey) => {
    confirmDangerous(
      `Tem certeza que deseja remover a chave ${keyLabel(key)}?\n\nEssa ação não exibirá a chave novamente.`,
      () =>
        runAction(key, 'remove', () => aiApiKeysService.deleteKey(key.id), `Chave "${key.name}" removida com sucesso`),
      'Remover'
    );
  };

  const handleCreate = async () => {
    const parsedKeys = parseApiKeys(formData.apiKey);
    if (parsedKeys.length === 0) {
      toast.warning('Informe pelo menos uma chave de API');
      return;
    }
    const baseName = formData.name.trim() || `Chave ${providerLabel(formData.provider)}`;
    try {
      setActionLoading('create');
      const results = [];

      for (const [index, apiKey] of parsedKeys.entries()) {
        const name = parsedKeys.length === 1 ? baseName : `${baseName} ${index + 1}`;
        const result = await aiApiKeysService.createKey({
          name,
          provider: formData.provider,
          model: formData.model || undefined,
          apiKey,
          priority: formData.priority,
          testOnCreate: formData.testOnCreate,
        });
        results.push({ name, result });
      }

      const failedTests = results.filter(({ result }) => result.testResult && !result.testResult.success);
      if (parsedKeys.length > 1) {
        if (failedTests.length > 0) {
          toast.warning(`${results.length} chave(s) cadastrada(s), mas ${failedTests.length} falharam no teste`, 5000);
        } else if (formData.testOnCreate) {
          toast.success(`${results.length} chave(s) cadastrada(s) e testada(s) com sucesso`);
        } else {
          toast.success(`${results.length} chave(s) cadastrada(s) com sucesso`);
        }
      } else if (results[0].result.testResult) {
        if (results[0].result.testResult.success) {
          toast.success(`Chave "${results[0].name}" criada e testada com sucesso`);
        } else {
          toast.warning(`Chave criada, mas o teste falhou: ${results[0].result.testResult.message}`, 5000);
        }
      } else {
        toast.success(`Chave "${results[0].name}" criada com sucesso`);
      }
      setShowForm(false);
      setFormData({ name: '', provider: 'gemini', model: '', apiKey: '', priority: 0, testOnCreate: true });
      await loadData();
    } catch (err: any) {
      if (err instanceof DuplicateApiKeyError) {
        setDuplicatePrompt({
          message: err.message,
          existingKey: err.existingKey,
          canReactivate: err.canReactivate,
        });
        setShowForm(false);
        toast.warning(err.message, 5000);
      } else {
        toast.error(err.message || 'Erro ao criar chave');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const openAudit = async (key: AiApiKey) => {
    setOpenMenuId(null);
    setAuditKey(key);
    setAuditLoading(true);
    try {
      const history = await aiApiKeysService.getAuditHistory(key.id);
      setAuditLogs(history.logs || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar histórico');
      setAuditKey(null);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <KeyRound className="text-primary-600" size={22} />
            Chaves de IA
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie chaves com criptografia no banco. Apenas previews mascarados são exibidos.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700"
          >
            <Plus size={15} /> Nova chave
          </button>
        </div>
      </div>

      {/* Metrics */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 sm:gap-3 mb-5">
          <MetricCard label="Total" value={status.totalKeys} icon={KeyRound} />
          <MetricCard label="Ativas" value={stats.active} icon={CheckCircle2} accent="green" />
          <MetricCard label="Desativadas" value={stats.inactive} icon={Pause} />
          <MetricCard label="Saudáveis" value={status.healthyKeys} icon={CheckCircle2} accent="green" />
          <MetricCard label="Cooldown" value={status.cooldownKeys} icon={Clock} accent="yellow" />
          <MetricCard label="Suspeitas" value={status.suspectedDeadKeys} icon={AlertTriangle} accent="orange" />
          <MetricCard label="Mortas" value={status.deadKeys} icon={Skull} accent="red" />
          <MetricCard label="Fonte" value={SOURCE_LABELS[status.keySource] || status.keySource} icon={Database} small />
          <MetricCard
            label="Atualizado"
            value={stats.lastUpdated ? formatDate(stats.lastUpdated).split(',')[0] : '—'}
            icon={Clock}
            small
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 mb-5 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, preview ou provider..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SortOption })}
            className="w-full sm:w-44 shrink-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          >
            <option value="priority">Ordenar: prioridade</option>
            <option value="name">Ordenar: nome</option>
            <option value="last_success">Ordenar: último sucesso</option>
            <option value="last_error">Ordenar: último erro</option>
            <option value="updated">Ordenar: atualização</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <FilterSelect
            label="Provider"
            value={filters.provider}
            onChange={(v) => setFilters({ ...filters, provider: v })}
            options={[{ value: 'all', label: 'Todos' }, ...providers.map((p) => ({ value: p, label: p }))]}
            className="flex-1 min-w-0"
          />
          <FilterSelect
            label="Saúde"
            value={filters.healthStatus}
            onChange={(v) => setFilters({ ...filters, healthStatus: v })}
            options={[
              { value: 'all', label: 'Todas' },
              ...Object.entries(HEALTH_LABELS).map(([value, { label }]) => ({ value, label })),
            ]}
            className="flex-1 min-w-0"
          />
          <FilterSelect
            label="Status"
            value={filters.enabled}
            onChange={(v) => setFilters({ ...filters, enabled: v as Filters['enabled'] })}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'active', label: 'Ativas' },
              { value: 'inactive', label: 'Desativadas' },
            ]}
            className="flex-1 min-w-0"
          />
          {(filters.search || filters.provider !== 'all' || filters.healthStatus !== 'all' || filters.enabled !== 'all') && (
            <button
              onClick={() =>
                setFilters({
                  search: '',
                  provider: 'all',
                  healthStatus: 'all',
                  enabled: 'all',
                  sortBy: 'priority',
                })
              }
              className="shrink-0 px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 whitespace-nowrap"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 pt-0.5">
          {filteredKeys.length} de {keys.length} chave(s) exibida(s)
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 size={20} className="animate-spin" /> Carregando chaves...
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl text-gray-500 text-sm">
          Nenhuma chave cadastrada no banco. O sistema usará fallback do `.env` se configurado.
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl text-gray-500 text-sm">
          Nenhuma chave corresponde aos filtros aplicados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map((key) => (
            <KeyCard
              key={key.id}
              keyData={key}
              actionLoading={actionLoading}
              menuOpen={openMenuId === key.id}
              onToggleMenu={() => setOpenMenuId(openMenuId === key.id ? null : key.id)}
              onCloseMenu={() => setOpenMenuId(null)}
              onTest={() => handleTest(key)}
              onToggleEnabled={() =>
                key.enabled
                  ? handleDisable(key)
                  : runAction(key, 'enable', () => aiApiKeysService.enableKey(key.id), `Chave "${key.name}" ativada`)
              }
              onClearCooldown={() =>
                runAction(key, 'cooldown', () => aiApiKeysService.clearCooldown(key.id), 'Cooldown limpo')
              }
              onMarkReviewed={() =>
                runAction(key, 'reviewed', () => aiApiKeysService.markReviewed(key.id), 'Chave marcada como revisada')
              }
              onMarkDead={() => handleMarkDead(key)}
              onAudit={() => openAudit(key)}
              onRemove={() => handleRemove(key)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <AdminModal isOpen={showForm} onClose={() => setShowForm(false)} title="Nova chave de IA">
        <div className="space-y-4">
          <Field label="Nome/apelido (opcional)" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder={`Chave ${providerLabel(formData.provider)}`} />
          <Field label="Provider" value={formData.provider} onChange={(v) => setFormData({ ...formData, provider: v })} />
          <Field label="Modelo (opcional)" value={formData.model} onChange={(v) => setFormData({ ...formData, model: v })} />
          <Field label="Prioridade" type="number" value={String(formData.priority)} onChange={(v) => setFormData({ ...formData, priority: Number(v) || 0 })} />
          <div>
            <label className="block text-sm font-medium mb-1">Chave(s) de API</label>
            <textarea
              autoComplete="off"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full min-h-28 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-mono"
              placeholder="Cole uma ou várias chaves, separadas por quebra de linha, vírgula, ponto e vírgula ou espaço"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {parseApiKeys(formData.apiKey).length || 0} chave(s) detectada(s). Os nomes vazios usam "{`Chave ${providerLabel(formData.provider)}`}" e numeração automática.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.testOnCreate}
              onChange={(e) => setFormData({ ...formData, testOnCreate: e.target.checked })}
            />
            Testar chave após cadastrar
          </label>
          <button
            onClick={handleCreate}
            disabled={actionLoading === 'create'}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {actionLoading === 'create' ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Cadastrar chave(s)'}
          </button>
        </div>
      </AdminModal>

      {/* Duplicate modal */}
      <AdminModal isOpen={!!duplicatePrompt} onClose={() => setDuplicatePrompt(null)} title="Chave já cadastrada">
        {duplicatePrompt && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{duplicatePrompt.message}</p>
            <div className="rounded-lg border dark:border-gray-700 p-3 text-sm space-y-1 bg-gray-50 dark:bg-gray-800/50">
              <div><strong>Nome:</strong> {duplicatePrompt.existingKey.name}</div>
              <div><strong>Preview:</strong> {duplicatePrompt.existingKey.key_preview}</div>
              <div><strong>Provider:</strong> {duplicatePrompt.existingKey.provider}</div>
              <div><strong>Status:</strong> {duplicatePrompt.existingKey.enabled ? 'Ativa' : 'Desativada'}</div>
            </div>
            {duplicatePrompt.canReactivate ? (
              <button
                onClick={async () => {
                  try {
                    setActionLoading('reactivate-duplicate');
                    await aiApiKeysService.enableKey(duplicatePrompt.existingKey.id);
                    toast.success(`Chave "${duplicatePrompt.existingKey.name}" reativada com sucesso`);
                    setDuplicatePrompt(null);
                    await loadData();
                  } catch (err: any) {
                    toast.error(err.message || 'Erro ao reativar chave');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={actionLoading === 'reactivate-duplicate'}
                className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Reativar chave existente
              </button>
            ) : (
              <p className="text-sm text-gray-500">Esta chave já está ativa. Use a listagem para gerenciá-la.</p>
            )}
          </div>
        )}
      </AdminModal>

      {/* Audit modal */}
      <AdminModal
        isOpen={!!auditKey}
        onClose={() => { setAuditKey(null); setAuditLogs([]); }}
        title={auditKey ? `Auditoria — ${auditKey.name}` : 'Auditoria'}
      >
        {auditLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
            <Loader2 size={18} className="animate-spin" /> Carregando histórico...
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Nenhum registro encontrado.</p>
        ) : (
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 text-sm dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{log.action}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${log.result === 'SUCCESS' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {log.result}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(log.created_at)}</div>
                {log.user_email && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Admin: {log.user_email}</div>
                )}
                {log.error_message && (
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1.5">{log.error_message}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminModal>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  icon: any;
  accent?: 'green' | 'yellow' | 'orange' | 'red';
  small?: boolean;
}) {
  const accentColors = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  };
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">
        <Icon size={12} className={accent ? accentColors[accent] : 'text-gray-400'} />
        {label}
      </div>
      <div className={`font-semibold mt-0.5 truncate ${small ? 'text-sm' : 'text-lg'}`}>{value}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className={`px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {label}: {opt.label}
        </option>
      ))}
    </select>
  );
}

function KeyCard({
  keyData: key,
  actionLoading,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onTest,
  onToggleEnabled,
  onClearCooldown,
  onMarkReviewed,
  onMarkDead,
  onAudit,
  onRemove,
}: {
  keyData: AiApiKey;
  actionLoading: string | null;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onTest: () => void;
  onToggleEnabled: () => void;
  onClearCooldown: () => void;
  onMarkReviewed: () => void;
  onMarkDead: () => void;
  onAudit: () => void;
  onRemove: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const health = HEALTH_LABELS[key.health_status] || HEALTH_LABELS.temporary_error;
  const isTesting = actionLoading === `${key.id}:test`;
  const isBusy = actionLoading?.startsWith(`${key.id}:`) ?? false;
  const isDeadOrDisabled = key.health_status === 'dead' || !key.enabled;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onCloseMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, onCloseMenu]);

  const menuItems: Array<{ label: string; icon: any; onClick: () => void; danger?: boolean; hidden?: boolean }> =
    isDeadOrDisabled
      ? [
          { label: 'Ver auditoria', icon: ShieldAlert, onClick: onAudit },
          { label: 'Remover', icon: Trash2, onClick: onRemove, danger: true },
        ]
      : [
          { label: 'Limpar cooldown', icon: RotateCcw, onClick: onClearCooldown, hidden: !key.cooldown_until },
          { label: 'Marcar como revisada', icon: Eye, onClick: onMarkReviewed },
          { label: 'Marcar como morta', icon: Skull, onClick: onMarkDead, danger: true },
          { label: 'Ver auditoria', icon: ShieldAlert, onClick: onAudit },
          { label: 'Remover', icon: Trash2, onClick: onRemove, danger: true },
        ].filter((item) => !item.hidden);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{key.name}</h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${health.color}`}>{health.label}</span>
              {!key.enabled && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Desativada</span>
              )}
              {key.is_possible_duplicate && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 inline-flex items-center gap-1">
                  <Copy size={10} /> Duplicada
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{key.provider}{key.model ? ` · ${key.model}` : ''}</span>
              <span className="font-mono">{key.key_preview}</span>
            </div>
          </div>
        </div>
        {key.is_possible_duplicate && key.duplicate_canonical_name && (
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
            Possível duplicata de <strong>{key.duplicate_canonical_name}</strong>
          </p>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 text-xs sm:text-sm">
        <StatItem label="Último sucesso" value={formatDate(key.last_success_at)} />
        <StatItem label="Último erro" value={formatDate(key.last_error_at)} />
        <StatItem label="Cooldown até" value={formatDate(key.cooldown_until)} />
        <StatItem label="Falhas consec." value={String(key.consecutive_failures)} />
        <StatItem label="Sucessos/Falhas" value={`${key.total_successes}/${key.total_failures}`} />
        <StatItem label="Prioridade" value={String(key.priority)} />
      </div>

      {key.last_error_message && (
        <div className="mx-4 mb-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 line-clamp-2">
          {key.last_error_message}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2 bg-gray-50/50 dark:bg-gray-800/30">
        <button
          onClick={onTest}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isTesting ? 'Testando...' : 'Testar'}
        </button>

        <button
          onClick={onToggleEnabled}
          disabled={isBusy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-50 ${
            key.enabled
              ? 'border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800'
              : 'border-primary-300 text-primary-700 bg-primary-50 dark:border-primary-800 dark:text-primary-300 dark:bg-primary-900/20'
          }`}
        >
          {key.enabled ? <Pause size={14} /> : <CheckCircle2 size={14} />}
          {key.enabled ? 'Desativar' : 'Ativar'}
        </button>

        <div>
          <button
            ref={buttonRef}
            onClick={onToggleMenu}
            disabled={isBusy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50"
            aria-label="Mais ações"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>

          <KeyActionsMenu
            open={menuOpen}
            anchorRef={buttonRef}
            menuRef={menuRef}
            items={menuItems}
          />
        </div>
      </div>
    </div>
  );
}

function KeyActionsMenu({
  open,
  anchorRef,
  menuRef,
  items,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement>;
  menuRef: RefObject<HTMLDivElement>;
  items: Array<{ label: string; icon: any; onClick: () => void; danger?: boolean }>;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const MENU_WIDTH = 208;
  const ITEM_HEIGHT = 36;
  const PADDING = 8;
  const GAP = 4;

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const menuHeight = items.length * ITEM_HEIGHT + PADDING;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = rect.bottom + GAP;
      let left = rect.right - MENU_WIDTH;

      if (top + menuHeight > vh - GAP) {
        top = rect.top - menuHeight - GAP;
      }
      if (left < GAP) {
        left = GAP;
      }
      if (left + MENU_WIDTH > vw - GAP) {
        left = vw - MENU_WIDTH - GAP;
      }
      if (top < GAP) {
        top = GAP;
      }
      if (top + menuHeight > vh - GAP) {
        top = vh - menuHeight - GAP;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, items.length, anchorRef]);

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1"
      style={{ top: position.top, left: position.left, zIndex: 99990 }}
    >
      {items.map((item) => (
        <MenuItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          onClick={item.onClick}
          danger={item.danger}
        />
      ))}
    </div>,
    document.body
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={value}>{value}</div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
        danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}
