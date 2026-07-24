import { useState, useEffect } from 'react';
import { ShieldCheck, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supplierService, SupplierAuditLog } from '../../services/supplier.service';

// ── Tradução das ações do sistema ──────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Acesso ao Portal',
  LOGOUT: 'Encerramento de Sessão',
  VIEW_ORDERS: 'Visualização de Pedidos',
  VIEW_ORDER: 'Visualização de Pedido',
  UPDATE_ORDER_STATUS: 'Alteração de Status da Produção',
  UPDATE_ORDER_TRACKING: 'Cadastro de Código de Rastreio',
  CREATE_USER: 'Criação de Operador',
  UPDATE_USER: 'Edição de Operador',
  DEACTIVATE_USER: 'Desativação de Operador',
  VIEW_DASHBOARD: 'Acesso ao Painel Financeiro',
  VIEW_PAYMENTS: 'Visualização de Repasses',
  UPDATE_PROFILE: 'Atualização de Perfil/Empresa',
  VIEW_AUDIT: 'Acesso ao Histórico de Auditoria',
  ASSIGN_ORDER: 'Atribuição de Pedido',
  ASSIGN_SUPPLIER: 'Vínculo de Fornecedor',
};

const ROLE_LABELS: Record<string, string> = {
  supplier_admin: 'Administrador',
  supplier_employee: 'Operador de Manipulação',
  admin: 'Admin Kapsu',
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
  ERROR: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60',
  FORBIDDEN: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  FAILURE: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60',
};

function formatDateTime(dt?: string) {
  if (!dt) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(dt));
}

export default function SupplierAuditLogs() {
  const [logs, setLogs] = useState<SupplierAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => { fetchLogs(); }, 300);
    return () => window.clearTimeout(timer);
  }, [page, search]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAuditLogs(page, 10, search);
      if (res.success) {
        setLogs(res.data || []);
        setTotalPages(Math.max(1, Number(res.pagination?.totalPages) || 1));
        setTotal(Number(res.pagination?.total) || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  const firstVisiblePage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Registros & Auditoria
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Histórico detalhado de atividades e acessos do portal
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por e-mail, ação ou recurso..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-sm">Carregando registros...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400 text-sm">
            Nenhum registro encontrado{search ? ` para "${search}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Data / Hora
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Operador
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ação Realizada
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recurso
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log, i) => (
                  <tr
                    key={log.id || i}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Data */}
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(log.created_at || log.timestamp)}
                    </td>

                    {/* Operador */}
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100 font-medium text-xs">
                        {log.user_email || '—'}
                      </span>
                    </td>

                    {/* Cargo */}
                    <td className="px-4 py-3">
                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                        {ROLE_LABELS[log.user_role || ''] || log.user_role || '—'}
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100 text-xs">
                        {ACTION_LABELS[log.action] || log.action || '—'}
                      </span>
                    </td>

                    {/* Recurso */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                        {log.resource || '—'}
                        {log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}
                      </span>
                    </td>

                    {/* Resultado */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          RESULT_COLORS[log.result] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {log.result === 'SUCCESS'
                          ? 'Sucesso'
                          : log.result === 'ERROR'
                          ? 'Erro'
                          : log.result === 'FORBIDDEN'
                          ? 'Negado'
                          : log.result || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {total} registro{total === 1 ? '' : 's'} · Página {page} de {totalPages} · 10 por página
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {visiblePages.map(pageNumber => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === page ? 'page' : undefined}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition ${
                    pageNumber === page
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
