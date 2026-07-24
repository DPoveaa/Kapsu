import { useState, useEffect } from 'react';
import { Plus, Edit2, Shield, Check, X } from 'lucide-react';
import { supplierService, SupplierUser } from '../../services/supplier.service';
import AdminModal from '../../components/AdminModal';
import { toast } from '../../utils/toast';

export default function SupplierUserManagement() {
  const [users, setUsers] = useState<SupplierUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SupplierUser | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    role: 'supplier_employee' as 'supplier_admin' | 'supplier_employee',
    active: true,
    canCancelOrders: false,
    existingPermissions: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await supplierService.listUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar equipe: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormState({
      name: '',
      email: '',
      password: '',
      role: 'supplier_employee',
      active: true,
      canCancelOrders: false,
      existingPermissions: [],
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (u: SupplierUser) => {
    setEditingUser(u);
    let permissions: string[] = [];
    try {
      permissions = Array.isArray(u.permissions) ? u.permissions : JSON.parse(u.permissions || '[]');
    } catch { permissions = []; }
    setFormState({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role as 'supplier_admin' | 'supplier_employee',
      active: u.active !== false,
      canCancelOrders: permissions.includes('orders:cancel'),
      existingPermissions: permissions,
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      toast.error('O Nome do funcionário é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await supplierService.updateUser(editingUser.id, {
          name: formState.name,
          email: formState.email,
          password: formState.password || undefined,
          role: formState.role,
          active: formState.active,
          permissions: Array.from(new Set([...formState.existingPermissions.filter(p => p !== 'orders:cancel'), 'orders:read', 'orders:write', 'tracking:write', ...(formState.canCancelOrders ? ['orders:cancel'] : [])])),
        });
        toast.success('Dados do funcionário atualizados!');
      } else {
        await supplierService.createUser({
          name: formState.name,
          email: formState.email,
          password: formState.password,
          role: formState.role,
          permissions: Array.from(new Set(['orders:read', 'orders:write', 'tracking:write', ...(formState.canCancelOrders ? ['orders:cancel'] : [])])),
        });
        toast.success('Novo funcionário cadastrado com sucesso!');
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar funcionário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Gestão da Equipe do Fornecedor
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cadastre operadores e administradores com acesso ao portal da farmácia
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition shadow-sm flex items-center gap-2 text-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Funcionário</span>
        </button>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Carregando equipe do fornecedor...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nenhum funcionário cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Nome / E-mail</th>
                  <th className="py-3.5 px-4">Cargo / Função</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{u.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-4 px-4">
                      {u.role === 'supplier_admin' || u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
                          <Shield className="w-3.5 h-3.5" /> Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-medium">
                          Operador de Manipulação
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {u.active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                          <Check className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
                          <X className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
                        title="Editar Permissões"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      <AdminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? `Editar Funcionário: ${editingUser.name}` : 'Cadastrar Novo Funcionário'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-sm">
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail de Acesso *</label>
            <input
              type="email"
              required
              value={formState.email}
              onChange={e => setFormState({ ...formState, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {editingUser ? 'Nova Senha (Opcional)' : 'Senha de Acesso *'}
            </label>
            <input
              type="password"
              placeholder={editingUser ? 'Manter senha atual' : 'Mínimo 6 caracteres'}
              value={formState.password}
              onChange={e => setFormState({ ...formState, password: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo / Nível de Permissão</label>
            <select
              value={formState.role}
              onChange={e => setFormState({ ...formState, role: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="supplier_employee">Operador de Manipulação (Acesso a Pedidos e Produção)</option>
              <option value="supplier_admin">Administrador do Fornecedor (Acesso Total + Financeiro)</option>
            </select>
          </div>

          {formState.role === 'supplier_employee' && (
            <label className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/20 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.canCancelOrders}
                onChange={e => setFormState({ ...formState, canCancelOrders: e.target.checked })}
                className="mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                <span className="block text-xs font-semibold text-gray-900 dark:text-white">Permitir cancelamento de pedidos</span>
                <span className="block mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Permissão sensível: exige motivo e fica registrada na auditoria.</span>
              </span>
            </label>
          )}

          {editingUser && (
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={e => setFormState({ ...formState, active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Usuário Ativo no Portal</span>
            </label>
          )}

          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
