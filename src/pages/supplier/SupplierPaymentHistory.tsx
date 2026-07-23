import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { supplierService, SupplierPayment } from '../../services/supplier.service';
import { toast } from '../../utils/toast';

export default function SupplierPaymentHistory() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadPayments();
  }, [page, statusFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getPaymentHistory(page, 20, statusFilter);
      if (res.success && res.data) {
        setPayments(res.data);
        if (res.pagination) setTotalPayments(res.pagination.total);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar histórico de repasses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Histórico de Repasses Financeiros
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consulte os pagamentos efetuados e pendentes da plataforma Kapsu ({totalPayments} registros)
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
        <div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Status de Repasse</option>
            <option value="PAID">Repasses Concluídos / Pagos</option>
            <option value="PENDING">Repasses Pendentes</option>
            <option value="PROCESSING">Em Processamento Bancário</option>
          </select>
        </div>
      </div>

      {/* Tabela de Repasses */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Carregando histórico de repasses...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nenhum registro de repasse encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Período / Referência</th>
                  <th className="py-3.5 px-4">Valor Total do Repasse</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Data de Pagamento</th>
                  <th className="py-3.5 px-4 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-4 font-mono">
                      <div className="font-bold text-gray-900 dark:text-white">#{payment.id.slice(-8).toUpperCase()}</div>
                      {payment.reference_period && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{payment.reference_period}</div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400">
                        {Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {payment.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pendente
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                      {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('pt-BR') : 'Aguardando repasse'}
                    </td>

                    <td className="py-4 px-4 text-right">
                      {payment.receipt_url ? (
                        <a
                          href={payment.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs text-gray-800 dark:text-gray-200 transition font-medium"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary-500" />
                          <span>Ver Comprovante</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sem anexo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
