import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, HelpCircle, Loader2, WalletCards } from 'lucide-react';
import { supplierService, SupplierPayment, SupplierSettlementOverview } from '../../services/supplier.service';
import SupplierSettlementCards from '../../components/SupplierSettlementCards';
import SupplierFinancialChart from '../../components/SupplierFinancialChart';
import SupplierSettlementBreakdown from '../../components/SupplierSettlementBreakdown';
import AdminModal from '../../components/AdminModal';
import { toast } from '../../utils/toast';

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informado';

export default function SupplierPaymentHistory() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [overview, setOverview] = useState<SupplierSettlementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [showRuleModal, setShowRuleModal] = useState(false);

  useEffect(() => { loadData(); }, [page]);

  useEffect(() => {
    const refresh = () => loadData(true);
    const interval = window.setInterval(refresh, 15000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [page]);

  const loadData = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const [paymentResult, settlementResult] = await Promise.all([
        supplierService.getPaymentHistory(page, 10),
        supplierService.getSettlementOverview(),
      ]);
      setPayments(paymentResult.data || []);
      setTotalPayments(Number(paymentResult.pagination?.total) || 0);
      setTotalPages(Math.max(1, Number(paymentResult.pagination?.totalPages) || 1));
      setOverview(settlementResult.data);
    } catch (err: any) {
      if (!background) toast.error('Erro ao carregar os repasses: ' + err.message);
    } finally {
      if (!background) setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repasses financeiros</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Valores vendidos, ciclos de fechamento, pedidos incluídos e pagamentos realizados, todos detalhados.</p>
        </div>
        {overview && (
          <button
            type="button"
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 self-start sm:self-auto"
            title="Como funcionam os repasses?"
          >
            <HelpCircle className="h-4 w-4 text-primary-500" />
            <span>Como funcionam os repasses?</span>
          </button>
        )}
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-12 text-gray-500 dark:border-gray-700 dark:bg-gray-900"><Loader2 className="h-5 w-5 animate-spin" /> Calculando seus repasses...</div>
      ) : overview ? (
        <div className="space-y-6">
          <SupplierSettlementCards overview={overview} moneyFormatter={money} />
          <SupplierFinancialChart />
          <SupplierSettlementBreakdown overview={overview} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div><h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><WalletCards className="h-5 w-5 text-emerald-600" /> Pagamentos realizados</h2><p className="mt-0.5 text-xs text-gray-500">{totalPayments} pagamento(s) cadastrado(s) pela Kapsu</p></div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Carregando pagamentos...</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Nenhum pagamento realizado até o momento.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800/70"><tr><th className="px-4 py-3">Período</th><th className="px-4 py-3">Valor pago</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pago em</th><th className="px-4 py-3">Forma</th><th className="px-4 py-3 text-right">Comprovante</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-4"><div className="font-mono text-xs font-semibold text-gray-900 dark:text-white">#{payment.id.slice(-8).toUpperCase()}</div><div className="mt-1 text-[11px] text-gray-500">{payment.period_start && payment.period_end ? `${date(payment.period_start)} a ${date(payment.period_end)}` : 'Pagamento sem período vinculado'}</div></td>
                    <td className="px-4 py-4 font-bold text-emerald-600">{money(payment.amount)}</td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Pago</span></td>
                    <td className="px-4 py-4 text-xs text-gray-700 dark:text-gray-300">{date(payment.payment_date)}</td>
                    <td className="px-4 py-4 text-xs text-gray-700 dark:text-gray-300">{payment.payment_method || 'Não informada'}</td>
                    <td className="px-4 py-4 text-right">{payment.receipt_file_path ? <a href={supplierService.getReceiptUrl(payment.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><FileText className="h-3.5 w-3.5" /> Ver comprovante</a> : <span className="text-xs text-gray-400">Sem anexo</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs dark:border-gray-700"><span className="text-gray-500">Página {page} de {totalPages}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Anterior</button><button disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Próxima</button></div></div>}
      </div>

      {overview && (
        <AdminModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title="Como funcionam os repasses">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">{overview.configuration.ruleDescription}</p>
            <p>Somente pedidos com pagamento confirmado entram no cálculo. Pedidos cancelados ou aguardando pagamento não entram.</p>
            <p>Os pedidos do ciclo atual aparecem como valor em formação; após o fechamento, passam para o saldo devido.</p>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
