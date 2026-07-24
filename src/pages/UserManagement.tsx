import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Building2, Clock, Edit2,
  Loader2, Power, ArrowLeft, Eye
} from 'lucide-react';
import { adminService, User, Supplier } from '../services/admin.service';
import AdminModal from '../components/AdminModal';
import { formatPhone } from '../utils/validators';
import { toast, confirm } from '../utils/toast';

type UserRole = 'user' | 'admin' | 'support' | 'supplier_admin' | 'supplier_employee';

const ROLE_LABELS: Record<UserRole, { label: string; style: string }> = {
  admin: {
    label: 'Admin Kapsu',
    style: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  supplier_admin: {
    label: 'Admin Fornecedor',
    style: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  supplier_employee: {
    label: 'Operador Fornecedor',
    style: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  support: {
    label: 'Suporte',
    style: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  user: {
    label: 'Cliente Final',
    style: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  },
};

const AVAILABLE_PERMISSIONS = [
  { key: 'orders:read', label: 'Visualizar Pedidos' },
  { key: 'orders:write', label: 'Gerenciar & Alterar Pedidos' },
  { key: 'financial:read', label: 'Visualizar Financeiro & Custos' },
  { key: 'payments:read', label: 'Visualizar Pagamentos & Comprovantes' },
  { key: 'users:manage', label: 'Gerenciar Usuários da Equipe' },
  { key: 'audit:read', label: 'Visualizar Logs de Auditoria' },
  { key: 'tracking:write', label: 'Atualizar Rastreamento & Envio' },
];

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Detalhes / Gaveta expandida
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Modal de Criação / Edição
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    role: 'user' as UserRole,
    supplier_id: '',
    active: true,
    permissions: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliersList();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, searchTerm, roleFilter, supplierFilter, activeFilter]);

  const loadSuppliersList = async () => {
    try {
      const res = await adminService.listSuppliers(1, 100);
      if (res.success) {
        setSuppliers(res.suppliers);
      }
    } catch (err) {
      console.error('Erro ao listar fornecedores:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.listUsers(
        page,
        20,
        searchTerm,
        roleFilter,
        '',
        '',
        activeFilter,
        supplierFilter
      );

      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
        setTotalUsersCount(data.pagination.total);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      if (expandedUserId === userId) {
        setExpandedUserId(null);
        setSelectedUser(null);
        return;
      }
      const data = await adminService.getUserDetails(userId);
      if (data.success) {
        setSelectedUser(data.user);
        setExpandedUserId(userId);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar detalhes do usuário: ' + error.message);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormState({
      name: '',
      email: '',
      password: '',
      phone: '',
      cpf: '',
      role: 'user',
      supplier_id: '',
      active: true,
      permissions: [],
    });
    setShowUserModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormState({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      cpf: user.cpf || '',
      role: user.role as UserRole,
      supplier_id: user.supplier_id || '',
      active: user.active !== false,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
    setShowUserModal(true);
  };

  const handleToggleActive = async (user: User) => {
    const actionLabel = user.active === false ? 'ativar' : 'desativar';
    confirm.show(`Deseja realmente ${actionLabel} a conta do usuário "${user.name}"?`, async () => {
      try {
        const res = await adminService.toggleUserActive(user.id);
        toast.success(res.message);
        loadUsers();
      } catch (err: any) {
        toast.error('Erro ao alterar status: ' + err.message);
      }
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.email.trim()) {
      toast.error('Nome e E-mail são obrigatórios.');
      return;
    }
    if (!editingUser && !formState.password) {
      toast.error('Senha é obrigatória para cadastrar novo usuário.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await adminService.updateUser(editingUser.id, {
          name: formState.name,
          email: formState.email,
          phone: formState.phone || undefined,
          cpf: formState.cpf || undefined,
          role: formState.role,
          supplier_id: formState.supplier_id || undefined,
          active: formState.active,
          permissions: formState.permissions,
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await adminService.createUser({
          name: formState.name,
          email: formState.email,
          password: formState.password,
          phone: formState.phone || undefined,
          cpf: formState.cpf || undefined,
          role: formState.role,
          supplier_id: formState.supplier_id || undefined,
          active: formState.active,
          permissions: formState.permissions,
        });
        toast.success('Usuário criado com sucesso!');
      }
      setShowUserModal(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (permKey: string) => {
    setFormState(prev => {
      const exists = prev.permissions.includes(permKey);
      const next = exists ? prev.permissions.filter(p => p !== permKey) : [...prev.permissions, permKey];
      return { ...prev, permissions: next };
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title="Voltar ao Painel Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestão de Usuários & Acessos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie contas, permissões, cargos e vínculo com fornecedores ({totalUsersCount} cadastrados)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition shadow-sm flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Cargos</option>
            <option value="admin">Administrador Kapsu</option>
            <option value="supplier_admin">Admin do Fornecedor</option>
            <option value="supplier_employee">Operador do Fornecedor</option>
            <option value="support">Atendimento / Suporte</option>
            <option value="user">Cliente Final</option>
          </select>
        </div>

        <div>
          <select
            value={supplierFilter}
            onChange={e => { setSupplierFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Fornecedores</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={activeFilter}
            onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Status</option>
            <option value="true">Apenas Contas Ativas</option>
            <option value="false">Apenas Contas Inativas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <span>Carregando usuários...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nenhum usuário encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Usuário / Nome</th>
                  <th className="py-3.5 px-4">Cargo / Função</th>
                  <th className="py-3.5 px-4">Fornecedor Vinculado</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Último Login</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map(user => {
                  const roleConfig = ROLE_LABELS[user.role as UserRole] || ROLE_LABELS.user;
                  const isExpanded = expandedUserId === user.id;

                  return (
                    <Fragment key={user.id}>
                      <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                {user.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${roleConfig.style}`}>
                            {roleConfig.label}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs">
                          {user.supplier_name ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-primary-500" />
                              {user.supplier_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {user.active !== false ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Inativo
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {user.last_login
                            ? new Date(user.last_login).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Nunca acessou'}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => loadUserDetails(user.id)}
                              className={`p-2 rounded-lg transition ${
                                isExpanded
                                  ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                              }`}
                              title="Ver Detalhes & Atividades"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
                              title="Editar Usuário"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-2 rounded-lg transition ${
                                user.active !== false
                                  ? 'hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                  : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              }`}
                              title={user.active !== false ? 'Desativar Conta' : 'Ativar Conta'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Drawer para Atividades Recentes */}
                      {isExpanded && selectedUser && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/80 dark:bg-gray-900/60 p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="space-y-4 max-w-4xl mx-auto">
                              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary-500" />
                                  Histórico & Atividades Recentes do Usuário
                                </h3>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Cadastrado em: {new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                  <p><span className="font-semibold text-gray-700 dark:text-gray-300">Telefone:</span> {selectedUser.phone || 'Não informado'}</p>
                                  <p><span className="font-semibold text-gray-700 dark:text-gray-300">CPF:</span> {selectedUser.cpf || 'Não informado'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p><span className="font-semibold text-gray-700 dark:text-gray-300">Total de Pedidos Realizados:</span> {selectedUser.totalOrdersCount || 0}</p>
                                </div>
                              </div>

                              {/* Permissões Específicas */}
                              {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Permissões Concedidas:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(selectedUser.permissions as string[]).map(p => (
                                      <span key={p} className="px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-[11px]">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} ({totalUsersCount} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                Anterior
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação e Edição de Usuários */}
      <AdminModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={editingUser ? `Editar Usuário: ${editingUser.name}` : 'Cadastrar Novo Usuário'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={e => setFormState({ ...formState, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={formState.email}
                onChange={e => setFormState({ ...formState, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {!editingUser && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Inicial *</label>
                <input
                  type="password"
                  required
                  value={formState.password}
                  onChange={e => setFormState({ ...formState, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
              <input
                type="text"
                value={formState.phone}
                onChange={e => setFormState({ ...formState, phone: formatPhone(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo / Role *</label>
              <select
                value={formState.role}
                onChange={e => setFormState({ ...formState, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="user">Cliente Final (Comprador)</option>
                <option value="admin">Administrador Geral Kapsu</option>
                <option value="support">Atendimento / Suporte</option>
                <option value="supplier_admin">Administrador do Fornecedor</option>
                <option value="supplier_employee">Operador de Produção do Fornecedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa Fornecedora Vinculada</label>
              <select
                value={formState.supplier_id}
                onChange={e => setFormState({ ...formState, supplier_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Nenhum (Usuário Kapsu / Cliente)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissões Granulares */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Permissões de Acesso do Usuário</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map(p => {
                const checked = formState.permissions.includes(p.key);
                return (
                  <label
                    key={p.key}
                    onClick={() => togglePermission(p.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      checked
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-900 dark:text-primary-200'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={e => setFormState({ ...formState, active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Conta Ativa no Sistema</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Salvando...' : 'Salvar Usuário'}
              </button>
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
