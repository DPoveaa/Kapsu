import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Search, Plus, Edit2,
  Loader2, ArrowLeft, KeyRound, Copy, Check, Users, Trash2, Shield
} from 'lucide-react';
import { adminService, Supplier, SupplierTeamUser } from '../services/admin.service';
import AdminModal from '../components/AdminModal';
import { toast } from '../utils/toast';

export default function SupplierManagement() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);

  const [teamSupplier, setTeamSupplier] = useState<Supplier | null>(null);
  const [teamUsers, setTeamUsers] = useState<SupplierTeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [showTeamUserModal, setShowTeamUserModal] = useState(false);
  const [editingTeamUser, setEditingTeamUser] = useState<SupplierTeamUser | null>(null);
  const [teamUserForm, setTeamUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'supplier_employee' as 'supplier_admin' | 'supplier_employee',
    phone: '',
    active: true,
  });
  const [submittingTeamUser, setSubmittingTeamUser] = useState(false);

  // Modal de Criação / Edição do Fornecedor
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    active: true,
    payout_frequency: 'WEEKLY' as 'WEEKLY' | 'MONTHLY',
    payout_weekday: 1,
    payout_month_day: 1,
    master_name: '',
    master_email: '',
    master_password: '',
    employee_name: '',
    employee_email: '',
    employee_password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal de Credenciais Geradas
  const [createdCredentials, setCreatedCredentials] = useState<{
    supplierName: string;
    loginCode: string;
    tempPassword?: string;
    email?: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [page, searchTerm, activeFilter]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await adminService.listSuppliers(page, 20, searchTerm, activeFilter);
      if (res.success) {
        setSuppliers(res.suppliers);
        setTotalPages(res.pagination.totalPages);
        setTotalSuppliers(res.pagination.total);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar fornecedores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTeam = async (supplier: Supplier) => {
    setTeamSupplier(supplier);
    setTeamUsers([]);
    setTeamLoading(true);
    try {
      const response = await adminService.listSupplierUsers(supplier.id);
      setTeamUsers(response.users || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar equipe do fornecedor.');
      setTeamSupplier(null);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleOpenCreateTeamUser = () => {
    setEditingTeamUser(null);
    setTeamUserForm({
      name: '',
      email: '',
      password: '',
      role: 'supplier_employee',
      phone: '',
      active: true,
    });
    setShowTeamUserModal(true);
  };

  const handleOpenEditTeamUser = (user: SupplierTeamUser) => {
    setEditingTeamUser(user);
    setTeamUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: '',
      active: user.active !== false,
    });
    setShowTeamUserModal(true);
  };

  const handleSaveTeamUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamSupplier) return;
    if (!teamUserForm.name.trim()) {
      toast.error('O nome do integrante é obrigatório.');
      return;
    }

    try {
      setSubmittingTeamUser(true);
      if (editingTeamUser) {
        await adminService.updateSupplierUser(teamSupplier.id, editingTeamUser.id, {
          name: teamUserForm.name,
          email: teamUserForm.email || undefined,
          password: teamUserForm.password || undefined,
          role: teamUserForm.role,
          phone: teamUserForm.phone || undefined,
          active: teamUserForm.active,
        });
        toast.success('Integrante da equipe atualizado!');
        setTeamUsers(current => current.map(u => u.id === editingTeamUser.id ? {
          ...u,
          name: teamUserForm.name,
          email: teamUserForm.email || u.email,
          role: teamUserForm.role,
          active: teamUserForm.active,
        } : u));
      } else {
        const res = await adminService.createSupplierUser(teamSupplier.id, {
          name: teamUserForm.name,
          email: teamUserForm.email || undefined,
          password: teamUserForm.password || undefined,
          role: teamUserForm.role,
          phone: teamUserForm.phone || undefined,
          active: teamUserForm.active,
        });
        toast.success('Integrante da equipe criado com sucesso!');
        if (res.user) {
          setTeamUsers(current => [...current, res.user]);
          setSuppliers(current => current.map(s => s.id === teamSupplier.id ? {
            ...s,
            totalUsers: (s.totalUsers || 0) + 1,
          } : s));
        }
        if (res.credentials) {
          setCreatedCredentials({
            supplierName: teamSupplier.name,
            loginCode: res.credentials.loginCode,
            tempPassword: res.credentials.tempPassword,
            email: teamUserForm.email || null,
          });
        }
      }
      setShowTeamUserModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar integrante da equipe.');
    } finally {
      setSubmittingTeamUser(false);
    }
  };

  const handleDeleteTeamUser = async (user: SupplierTeamUser) => {
    if (!teamSupplier) return;
    if (!window.confirm(`Excluir permanentemente o perfil de ${user.name}? O histórico de pedidos será preservado.`)) return;

    try {
      setDeletingUserId(user.id);
      await adminService.deleteSupplierUser(teamSupplier.id, user.id);
      setTeamUsers(current => current.filter(item => item.id !== user.id));
      setSuppliers(current => current.map(supplier => (
        supplier.id === teamSupplier.id
          ? { ...supplier, totalUsers: Math.max(0, (supplier.totalUsers || 1) - 1) }
          : supplier
      )));
      toast.success('Usuário excluído com sucesso.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir usuário.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormState({
      name: '',
      trade_name: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      active: true,
      payout_frequency: 'WEEKLY',
      payout_weekday: 1,
      payout_month_day: 1,
      master_name: '',
      master_email: '',
      master_password: '',
      employee_name: '',
      employee_email: '',
      employee_password: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormState({
      name: supplier.name,
      trade_name: supplier.trade_name || '',
      cnpj: supplier.cnpj || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      active: supplier.active !== false,
      payout_frequency: supplier.payout_frequency || 'WEEKLY',
      payout_weekday: supplier.payout_weekday ?? 1,
      payout_month_day: supplier.payout_month_day ?? 1,
      master_name: supplier.masterUser?.name || '',
      master_email: supplier.masterUser?.email || '',
      master_password: '',
      employee_name: '',
      employee_email: '',
      employee_password: '',
    });
    setShowModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      toast.error('O Nome da Empresa Fornecedora é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        name: formState.name,
        trade_name: formState.trade_name,
        cnpj: formState.cnpj,
        email: formState.email,
        phone: formState.phone,
        address: formState.address,
        active: formState.active,
        payout_frequency: formState.payout_frequency,
        payout_weekday: formState.payout_weekday,
        payout_month_day: formState.payout_month_day,
      };

      if (!editingSupplier || formState.master_name || formState.master_email || formState.master_password) {
        payload.master_user = {
          name: formState.master_name || `${formState.name} (Mestre)`,
          email: formState.master_email,
          password: formState.master_password,
        };
      }

      if (!editingSupplier && formState.employee_name) {
        payload.employee_user = {
          name: formState.employee_name,
          email: formState.employee_email,
          password: formState.employee_password,
        };
      }

      if (editingSupplier) {
        await adminService.updateSupplier(editingSupplier.id, payload);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        const res = await adminService.createSupplier(payload);
        toast.success('Fornecedor cadastrado com sucesso!');
        if (res.masterUserCredentials) {
          setCreatedCredentials({
            supplierName: formState.name,
            loginCode: res.masterUserCredentials.loginCode || res.masterUserCredentials.username || '',
            tempPassword: res.masterUserCredentials.tempPassword,
            email: res.masterUserCredentials.email,
          });
        }
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `CREDENCIAIS DE ACESSO AO PORTAL KAPSU FORNECEDOR:\nEmpresa: ${createdCredentials.supplierName}\nUsuário / Código de Login: ${createdCredentials.loginCode}\nSenha Temporária: ${createdCredentials.tempPassword || '(definida pelo admin)'}\n\nAcesse: ${window.location.origin}/login para fazer o primeiro acesso.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credenciais copiadas para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
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
              Gestão de Fornecedores & Farmácias Parceiras
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cadastre e gerencie laboratórios de manipulação e fornecedores parceiros ({totalSuppliers} cadastrados)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition shadow-sm flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia, CNPJ ou e-mail..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <select
            value={activeFilter}
            onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Status</option>
            <option value="true">Apenas Ativos</option>
            <option value="false">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Lista de Fornecedores */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <span>Carregando empresas parceiras...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nenhum fornecedor encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Empresa / Razão Social</th>
                  <th className="py-3.5 px-4">Contato / CNPJ</th>
                  <th className="py-3.5 px-4">Usuário Mestre (Admin)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <span>{sup.name}</span>
                      </div>
                      {sup.trade_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          Fantasia: {sup.trade_name}
                        </div>
                      )}
                      <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 ml-6">
                        Repasse {sup.payout_frequency === 'MONTHLY' ? `mensal · dia ${sup.payout_month_day || 1}` : 'semanal · segunda-feira'}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      <div className="space-y-0.5">
                        {sup.cnpj && <div className="font-mono text-gray-700 dark:text-gray-300">CNPJ: {sup.cnpj}</div>}
                        {sup.email && <div className="text-gray-500 dark:text-gray-400">{sup.email}</div>}
                        {sup.phone && <div className="text-gray-500 dark:text-gray-400">{sup.phone}</div>}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      {sup.masterUser ? (
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{sup.masterUser.name}</div>
                          <div className="font-mono text-gray-500 dark:text-gray-400">{sup.masterUser.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">Sem master</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {sup.active !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenTeam(sup)}
                          className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 text-primary-600 dark:text-primary-400 transition"
                          title={`Gerenciar equipe (${sup.totalUsers || 0})`}
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(sup)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                          title="Editar Fornecedor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} ({totalSuppliers} registros)
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

      {/* Modal Cadastro/Edição */}
      <AdminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSupplier ? `Editar: ${editingSupplier.name}` : 'Cadastrar Fornecedor'}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Razão Social *</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={e => setFormState({ ...formState, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={formState.trade_name}
                onChange={e => setFormState({ ...formState, trade_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
              <input
                type="text"
                value={formState.cnpj}
                onChange={e => setFormState({ ...formState, cnpj: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail de Contato da Empresa</label>
              <input
                type="email"
                value={formState.email}
                onChange={e => setFormState({ ...formState, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={formState.phone}
                onChange={e => setFormState({ ...formState, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço Comercial</label>
            <input
              type="text"
              value={formState.address}
              onChange={e => setFormState({ ...formState, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-200">Configuração dos repasses</h3>
            <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">Define como as vendas pagas são agrupadas para pagamento ao fornecedor.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">Periodicidade</label>
                <select value={formState.payout_frequency} onChange={e => setFormState({ ...formState, payout_frequency: e.target.value as 'WEEKLY' | 'MONTHLY' })} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensal</option>
                </select>
              </div>
              {formState.payout_frequency === 'WEEKLY' ? (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">Dia do pagamento</label>
                  <select value={formState.payout_weekday} onChange={e => setFormState({ ...formState, payout_weekday: Number(e.target.value) })} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    <option value={1}>Segunda-feira</option><option value={2}>Terça-feira</option><option value={3}>Quarta-feira</option><option value={4}>Quinta-feira</option><option value={5}>Sexta-feira</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">Dia do pagamento no mês</label>
                  <input type="number" min={1} max={28} value={formState.payout_month_day} onChange={e => setFormState({ ...formState, payout_month_day: Number(e.target.value) })} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                </div>
              )}
            </div>
            {formState.payout_frequency === 'WEEKLY' && formState.payout_weekday === 1 && <p className="mt-3 text-[11px] text-blue-700 dark:text-blue-300">Fechamento domingo às 00:00. Vendas feitas a partir desse horário entram no pagamento da segunda-feira seguinte.</p>}
          </div>

          {/* Seção Usuário Mestre (Admin do Fornecedor) */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Usuário Mestre (Administrador do Fornecedor)
              </h3>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Role: supplier_admin</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Admin</label>
                <input
                  type="text"
                  placeholder="Ex: João Mestre"
                  value={formState.master_name}
                  onChange={e => setFormState({ ...formState, master_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-mail do Admin <span className="text-primary-500 font-normal">(Opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="Deixe em branco p/ gerar código"
                  value={formState.master_email}
                  onChange={e => setFormState({ ...formState, master_email: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha de Acesso <span className="text-primary-500 font-normal">(Opcional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Deixe em branco p/ gerar temp"
                  value={formState.master_password}
                  onChange={e => setFormState({ ...formState, master_password: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              💡 Caso o e-mail não seja informado, o sistema gerará automaticamente um código de login único (ex: <strong>FORN-84920</strong>) e uma senha temporária.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={e => setFormState({ ...formState, active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Fornecedor Ativo no Sistema</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Salvando...' : 'Salvar Fornecedor'}
              </button>
            </div>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        isOpen={!!teamSupplier}
        onClose={() => setTeamSupplier(null)}
        title={`Equipe: ${teamSupplier?.name || ''}`}
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gerencie a equipe de colaboradores e administradores vinculados a esta empresa.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateTeamUser}
              className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs transition shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Integrante</span>
            </button>
          </div>

          {teamLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando equipe...
            </div>
          ) : teamUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-gray-500 dark:border-gray-700">
              Nenhum usuário vinculado a este fornecedor.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {teamUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-gray-900 dark:text-white">{user.name}</span>
                      {user.role === 'supplier_admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold">
                          <Shield className="h-3 w-3 text-indigo-500" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
                          Operador
                        </span>
                      )}
                      {user.active === false && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-semibold">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTeamUser(user)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                      title="Editar Integrante"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeamUser(user)}
                      disabled={deletingUserId === user.id}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition disabled:opacity-50"
                      title="Excluir Integrante"
                    >
                      {deletingUserId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminModal>

      {/* Modal Criar/Editar Usuário da Equipe */}
      <AdminModal
        isOpen={showTeamUserModal}
        onClose={() => setShowTeamUserModal(false)}
        title={editingTeamUser ? `Editar: ${editingTeamUser.name}` : `Novo Integrante - ${teamSupplier?.name || ''}`}
      >
        <form onSubmit={handleSaveTeamUser} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={teamUserForm.name}
              onChange={e => setTeamUserForm({ ...teamUserForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail de Acesso <span className="text-primary-500 font-normal">(Opcional)</span>
              </label>
              <input
                type="email"
                placeholder="Deixe em branco p/ gerar código"
                value={teamUserForm.email}
                onChange={e => setTeamUserForm({ ...teamUserForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha {editingTeamUser ? '(Deixe em branco p/ não alterar)' : '(Opcional)'}
              </label>
              <input
                type="password"
                placeholder={editingTeamUser ? '••••••••' : 'Deixe em branco p/ gerar'}
                value={teamUserForm.password}
                onChange={e => setTeamUserForm({ ...teamUserForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo / Função *</label>
              <select
                value={teamUserForm.role}
                onChange={e => setTeamUserForm({ ...teamUserForm, role: e.target.value as 'supplier_admin' | 'supplier_employee' })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              >
                <option value="supplier_employee">Operador / Funcionário</option>
                <option value="supplier_admin">Administrador do Fornecedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={teamUserForm.phone}
                onChange={e => setTeamUserForm({ ...teamUserForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={teamUserForm.active}
                onChange={e => setTeamUserForm({ ...teamUserForm, active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Usuário Ativo</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTeamUserModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingTeamUser}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 text-xs shadow-sm"
              >
                {submittingTeamUser ? 'Salvando...' : 'Salvar Integrante'}
              </button>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* Modal Exibir Credenciais Geradas */}
      <AdminModal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title={`Credenciais Geradas: ${createdCredentials?.supplierName}`}
      >
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-2 text-sm">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Fornecedor Cadastrado com Sucesso!</span>
            </div>
            <p>
              Passe as informações abaixo para o representante da farmácia parceira. No primeiro acesso, o sistema exigirá o cadastro do e-mail definitivo e da senha pessoal.
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-3 font-mono text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Código / Usuário para Login:</span>
              <span className="text-base font-bold text-primary-600 dark:text-primary-400 select-all block">
                {createdCredentials?.loginCode}
              </span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Senha Temporária:</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 select-all block">
                {createdCredentials?.tempPassword}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleCopyCredentials}
              className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition flex items-center justify-center gap-2 text-xs shadow-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Credenciais de Acesso'}</span>
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
