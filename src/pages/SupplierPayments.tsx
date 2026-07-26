import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Plus, FileText, Trash2, Loader2, Settings } from 'lucide-react';
import { adminService, Supplier, SupplierPayment } from '../services/admin.service';
import { supplierService, SupplierSettlementCycle, SupplierSettlementOverview } from '../services/supplier.service';
import { toast, confirm } from '../utils/toast';
import AdminModal from '../components/AdminModal';
import SupplierSettlementBreakdown from '../components/SupplierSettlementBreakdown';
import SupplierSettlementCards from '../components/SupplierSettlementCards';

export default function SupplierPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [settlement, setSettlement] = useState<SupplierSettlementOverview | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<SupplierSettlementCycle | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [payoutConfig, setPayoutConfig] = useState({ payout_frequency: 'WEEKLY' as 'WEEKLY' | 'MONTHLY', payout_weekday: 1, payout_month_day: 1 });

  // Modal de registro de pagamento
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState({
    supplier_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: '',
    payment_method: 'PIX',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [page, supplierFilter]);

  useEffect(() => {
    if (supplierFilter) loadSettlement();
    else setSettlement(null);
  }, [supplierFilter]);

  useEffect(() => {
    const refresh = () => { loadPayments(true); if (supplierFilter) loadSettlement(true); };
    const interval = window.setInterval(refresh, 10000);
    const handleFocus = () => refresh();
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', handleFocus); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [page, supplierFilter]);

  const loadSuppliers = async () => {
    try {
      const data = await adminService.listSuppliers(1, 100);
      if (data.success) {
        setSuppliers(data.suppliers);
        if (!supplierFilter && data.suppliers.length === 1) setSupplierFilter(data.suppliers[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
    }
  };

  const loadSettlement = async (background = false) => {
    if (!supplierFilter) return;
    try {
      if (!background) setSettlementLoading(true);
      const data = await adminService.getSupplierSettlements(supplierFilter);
      setSettlement(data.data);
    } catch (err: any) {
      if (!background) toast.error('Erro ao calcular repasse: ' + err.message);
    } finally {
      if (!background) setSettlementLoading(false);
    }
  };

  const openManualPayment = () => {
    setSelectedCycle(null);
    setFormState(current => ({ ...current, supplier_id: supplierFilter || current.supplier_id, amount: '', period_start: '', period_end: '' }));
    setShowModal(true);
  };

  const openCyclePayment = (cycle: SupplierSettlementCycle) => {
    setSelectedCycle(cycle);
    setFormState(current => ({
      ...current,
      supplier_id: supplierFilter,
      amount: cycle.balance.toFixed(2),
      period_start: cycle.periodStart,
      period_end: cycle.periodEnd,
      description: `Repasse do período ${cycle.periodStart} a ${cycle.periodEnd}`,
    }));
    setShowModal(true);
  };

  const loadPayments = async (background = false, requestedPage = page) => {
    try {
      if (!background) setLoading(true);
      const data = await adminService.listSupplierPayments(requestedPage, 10, supplierFilter);
      if (data.success) {
        setPayments(data.payments);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err: any) {
      if (!background) toast.error('Erro ao carregar pagamentos: ' + err.message);
    } finally {
      if (!background) setLoading(false);
    }
  };

  const openPayoutSettings = () => {
    const supplier = suppliers.find(item => item.id === supplierFilter);
    if (!supplier) { toast.error('Selecione um fornecedor para configurar o repasse.'); return; }
    setPayoutConfig({ payout_frequency: supplier.payout_frequency || 'WEEKLY', payout_weekday: supplier.payout_weekday ?? 1, payout_month_day: supplier.payout_month_day ?? 1 });
    setShowSettingsModal(true);
  };

  const savePayoutSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplierFilter) return;
    try {
      setSavingSettings(true);
      await adminService.updateSupplier(supplierFilter, payoutConfig);
      setSuppliers(current => current.map(item => item.id === supplierFilter ? { ...item, ...payoutConfig } : item));
      setShowSettingsModal(false);
      await loadSettlement();
      toast.success('Regra de repasse atualizada.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar a regra de repasse.');
    } finally { setSavingSettings(false); }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.supplier_id) {
      toast.error('Selecione o Fornecedor.');
      return;
    }
    const paymentAmount = Number(formState.amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > 999_999_999_999.99) {
      toast.error('Informe um valor válido de pagamento.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('supplier_id', formState.supplier_id);
      formData.append('amount', formState.amount);
      formData.append('payment_date', formState.payment_date);
      if (formState.period_start) formData.append('period_start', formState.period_start);
      if (formState.period_end) formData.append('period_end', formState.period_end);
      if (formState.payment_method) formData.append('payment_method', formState.payment_method);
      if (formState.description) formData.append('description', formState.description);
      if (selectedCycle) formData.append('related_order_ids', JSON.stringify(selectedCycle.orders.map(order => order.id)));
      if (selectedFile) {
        formData.append('receipt', selectedFile);
      }

      await adminService.createSupplierPayment(formData);
      toast.success('Pagamento registrado com sucesso!');
      setShowModal(false);
      setSelectedFile(null);
      setSelectedCycle(null);
      setPage(1);
      await Promise.all([loadPayments(true, 1), loadSettlement(true)]);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    confirm.show('Tem certeza que deseja cancelar/remover este registro de pagamento?', async () => {
      try {
        await adminService.deleteSupplierPayment(id);
        await Promise.all([loadPayments(true), loadSettlement(true)]);
        toast.success('Pagamento removido com sucesso!');
      } catch (err: any) {
        toast.error('Erro ao remover pagamento: ' + err.message);
      }
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
              Pagamentos a Fornecedores & Comprovantes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registre repasses financeiros aos fornecedores com upload seguro de recibos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={openPayoutSettings} disabled={!supplierFilter} className="px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"><Settings className="h-4 w-4" /><span>Configurar repasse</span></button>
          <button
            onClick={openManualPayment}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition shadow-sm flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Pagamento</span>
          </button>
        </div>
      </div>

      {supplierFilter && (
        <div className="space-y-4">
          {settlementLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800"><Loader2 className="h-5 w-5 animate-spin" /> Calculando repasses...</div>
          ) : settlement ? (
            <>
              <SupplierSettlementCards overview={settlement} />
              <SupplierSettlementBreakdown
                overview={settlement}
                onPayCycle={openCyclePayment}
                onRefresh={() => loadSettlement(true)}
                isAdmin={true}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="w-full sm:w-72">
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
      </div>

      {/* Tabela de Pagamentos */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <span>Carregando histórico de pagamentos...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nenhum registro de pagamento cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Fornecedor</th>
                  <th className="py-3.5 px-4">Valor Repassado</th>
                  <th className="py-3.5 px-4">Data do Pagamento</th>
                  <th className="py-3.5 px-4">Forma</th>
                  <th className="py-3.5 px-4">Comprovante</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{pay.supplier_name || 'Fornecedor'}</div>
                          {pay.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{pay.description}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(pay.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>

                    <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                      {new Date(`${String(pay.payment_date).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 text-xs font-medium">
                        {pay.payment_method || 'PIX'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {pay.receipt_file_path ? (
                        <a
                          href={supplierService.getReceiptUrl(pay.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Comprovante</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Sem arquivo</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDeletePayment(pay.id)}
                        className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                        title="Remover Pagamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              Página {page} de {totalPages}
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

      {/* Modal Cadastro de Pagamento */}
      <AdminModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Configuração do repasse">
        <form onSubmit={savePayoutSettings} className="space-y-4 text-sm">
          <div><label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Frequência</label><select value={payoutConfig.payout_frequency} onChange={e => setPayoutConfig(current => ({ ...current, payout_frequency: e.target.value as 'WEEKLY' | 'MONTHLY' }))} className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 dark:border-gray-700 dark:bg-gray-900"><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option></select></div>
          {payoutConfig.payout_frequency === 'WEEKLY' ? <div><label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Dia do pagamento</label><select value={payoutConfig.payout_weekday} onChange={e => setPayoutConfig(current => ({ ...current, payout_weekday: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 dark:border-gray-700 dark:bg-gray-900">{['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].map((label, value) => <option key={label} value={value}>{label}</option>)}</select></div> : <div><label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Dia do pagamento mensal</label><input type="number" min="1" max="28" value={payoutConfig.payout_month_day} onChange={e => setPayoutConfig(current => ({ ...current, payout_month_day: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 dark:border-gray-700 dark:bg-gray-900" /></div>}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><div className="font-semibold">Como ficará</div><div className="mt-1">{payoutConfig.payout_frequency === 'WEEKLY' ? `O ciclo fecha à 00:00 do dia anterior ao pagamento e o repasse ocorre toda ${['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][payoutConfig.payout_weekday]}.` : `O ciclo mensal fecha todo dia ${payoutConfig.payout_month_day} às 00:00 e o pagamento ocorre nesse mesmo dia.`}</div><div className="mt-1 opacity-80">Somente pedidos pagos entram no cálculo. Cancelados e aguardando pagamento ficam de fora.</div></div>
          <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700"><button type="submit" disabled={savingSettings} className="rounded-xl bg-primary-600 px-5 py-2 font-medium text-white disabled:opacity-50">{savingSettings ? 'Salvando...' : 'Salvar configuração'}</button></div>
        </form>
      </AdminModal>

      <AdminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Pagamento a Fornecedor"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4 text-sm">
          {selectedCycle && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              Este pagamento será vinculado a {selectedCycle.orders.length} pedido(s) do fechamento, totalizando {selectedCycle.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em aberto.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor *</label>
            <select
              required
              disabled={!!selectedCycle}
              value={formState.supplier_id}
              onChange={e => setFormState({ ...formState, supplier_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione um fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Pago (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="999999999999.99"
                required
                placeholder="0.00"
                value={formState.amount}
                onChange={e => setFormState({ ...formState, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data do Pagamento *</label>
              <input
                type="date"
                required
                value={formState.payment_date}
                onChange={e => setFormState({ ...formState, payment_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pagamento</label>
              <select
                value={formState.payment_method}
                onChange={e => setFormState({ ...formState, payment_method: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="PIX">PIX</option>
                <option value="TED">Transferência (TED / DOC)</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="CARTAO">Cartão de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Arquivo do Comprovante (PNG, JPG, PDF)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição / Observações do Repasse</label>
            <input
              type="text"
              placeholder="Ex: Repasse semanal referente às fórmulas de Julho"
              value={formState.description}
              onChange={e => setFormState({ ...formState, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {submitting ? 'Salvando...' : 'Registrar Pagamento'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
