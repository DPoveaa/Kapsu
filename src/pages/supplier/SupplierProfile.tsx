import { useState, useEffect } from 'react';
import { Building2, User, Save } from 'lucide-react';
import { supplierService } from '../../services/supplier.service';
import { toast } from '../../utils/toast';

export default function SupplierProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState({
    user_name: '',
    user_email: '',
    user_phone: '',
    user_password: '',
    supplier_name: '',
    supplier_trade_name: '',
    supplier_cnpj: '',
    supplier_phone: '',
    supplier_address: '',
  });

  const [isSupplierAdmin, setIsSupplierAdmin] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getProfile();
      if (res.success && res.data) {
        const u = res.data.user;
        const s = res.data.supplier;
        setIsSupplierAdmin(u.role === 'supplier_admin' || u.role === 'admin');

        setFormState({
          user_name: u.name || '',
          user_email: u.email || '',
          user_phone: u.phone || '',
          user_password: '',
          supplier_name: s?.name || '',
          supplier_trade_name: s?.trade_name || '',
          supplier_cnpj: s?.cnpj || '',
          supplier_phone: s?.phone || '',
          supplier_address: s?.address || '',
        });
      }
    } catch (err: any) {
      toast.error('Erro ao carregar dados do perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        user: {
          name: formState.user_name,
          email: formState.user_email,
          phone: formState.user_phone,
        },
      };

      if (formState.user_password && formState.user_password.trim().length >= 6) {
        payload.user.password = formState.user_password.trim();
      }

      if (isSupplierAdmin) {
        payload.supplier = {
          name: formState.supplier_name,
          trade_name: formState.supplier_trade_name,
          cnpj: formState.supplier_cnpj,
          phone: formState.supplier_phone,
          address: formState.supplier_address,
        };
      }

      await supplierService.updateProfile(payload);
      toast.success('Perfil atualizado com sucesso!');
      setFormState(prev => ({ ...prev, user_password: '' }));
      loadProfileData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configurações da Empresa & Conta
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atualize suas informações pessoais e os dados cadastrais da farmácia
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Seção 1: Dados do Usuário Logado */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
            <User className="w-5 h-5 text-primary-500" />
            <span>Dados da Sua Conta de Acesso</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Seu Nome *</label>
              <input
                type="text"
                required
                value={formState.user_name}
                onChange={e => setFormState({ ...formState, user_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Seu E-mail *</label>
              <input
                type="email"
                required
                value={formState.user_email}
                onChange={e => setFormState({ ...formState, user_email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={formState.user_phone}
                onChange={e => setFormState({ ...formState, user_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Alterar Senha (Opcional)</label>
              <input
                type="password"
                placeholder="Deixar em branco p/ manter atual"
                value={formState.user_password}
                onChange={e => setFormState({ ...formState, user_password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Dados da Empresa (Apenas para Admin) */}
        {isSupplierAdmin && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
              <Building2 className="w-5 h-5 text-primary-500" />
              <span>Dados da Farmácia / Empresa Fornecedora</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Razão Social *</label>
                <input
                  type="text"
                  required
                  value={formState.supplier_name}
                  onChange={e => setFormState({ ...formState, supplier_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={formState.supplier_trade_name}
                  onChange={e => setFormState({ ...formState, supplier_trade_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={formState.supplier_cnpj}
                  onChange={e => setFormState({ ...formState, supplier_cnpj: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone Comercial da Farmácia</label>
                <input
                  type="text"
                  value={formState.supplier_phone}
                  onChange={e => setFormState({ ...formState, supplier_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço do Laboratório / Sede</label>
                <input
                  type="text"
                  value={formState.supplier_address}
                  onChange={e => setFormState({ ...formState, supplier_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
