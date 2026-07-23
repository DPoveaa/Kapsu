import React, { useState, useEffect, useRef } from 'react';
import { Search, Truck, CheckCircle, Eye, RefreshCw } from 'lucide-react';
import { supplierService, SupplierOrder } from '../../services/supplier.service';
import { toast } from '../../utils/toast';
import AdminModal from '../../components/AdminModal';
import { playNewOrderSound } from '../../utils/sound';

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Aguardando Pagamento', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  CONFIRMED: { label: 'Pago / Confirmado', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  PROCESSING: { label: 'Em Manipulação', color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  READY_FOR_SHIPPING: { label: 'Pronto para Envio', color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  SHIPPED: { label: 'Enviado / Em Trânsito', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  DELIVERED: { label: 'Entregue', color: 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
};

export default function SupplierOrders() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Referência para armazenar o número e lista de pedidos anteriores e detectar novos pedidos em tempo real
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingFilter, setTrackingFilter] = useState('');

  // Modais
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    tracking_code: '',
    tracking_url: '',
    shipping_carrier: '',
    shipping_notes: '',
    update_status_to_shipped: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Carregamento inicial e busca por filtros
  useEffect(() => {
    loadOrders(false);
  }, [page, searchTerm, statusFilter, trackingFilter]);

  // Polling automático em tempo real a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, searchTerm, statusFilter, trackingFilter]);

  const loadOrders = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) setLoading(true);
      const res = await supplierService.getOrders({
        page,
        limit: 20,
        search: searchTerm,
        status: statusFilter,
        tracking_status: trackingFilter,
      });

      if (res.success && res.data) {
        // Detectar novos pedidos para tocar aviso sonoro e toast
        if (isBackgroundPoll && !isFirstLoadRef.current) {
          const currentIds = new Set(res.data.map(o => o.id));
          const hasNewOrder = res.data.some(o => !previousOrderIdsRef.current.has(o.id));

          if (hasNewOrder && currentIds.size > 0) {
            playNewOrderSound();
            toast.info('🔔 Novo pedido de manipulação recebido!');
          }
        }

        previousOrderIdsRef.current = new Set(res.data.map(o => o.id));
        isFirstLoadRef.current = false;

        setOrders(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalOrders(res.pagination.total);
      }
    } catch (err: any) {
      if (!isBackgroundPoll) {
        toast.error('Erro ao carregar pedidos de produção: ' + err.message);
      }
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  const handleOpenDetailModal = async (orderId: string) => {
    try {
      const res = await supplierService.getOrderById(orderId);
      if (res.success) {
        setSelectedOrder(res.data);
        setShowDetailModal(true);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar detalhe da fórmula: ' + err.message);
    }
  };

  const handleOpenStatusModal = (order: SupplierOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShowStatusModal(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setSubmitting(true);
      await supplierService.updateOrderStatus(selectedOrder.id, newStatus);
      toast.success('Status da fórmula atualizado com sucesso!');
      setShowStatusModal(false);
      loadOrders(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenTrackingModal = (order: SupplierOrder) => {
    setSelectedOrder(order);
    setTrackingForm({
      tracking_code: order.tracking_code || '',
      tracking_url: order.tracking_url || '',
      shipping_carrier: order.shipping_carrier || '',
      shipping_notes: order.shipping_notes || '',
      update_status_to_shipped: true,
    });
    setShowTrackingModal(true);
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!trackingForm.tracking_code.trim()) {
      toast.error('Informe o código de rastreio.');
      return;
    }

    try {
      setSubmitting(true);
      await supplierService.updateOrderTracking(selectedOrder.id, trackingForm);
      toast.success('Código de rastreamento salvo com sucesso!');
      setShowTrackingModal(false);
      loadOrders(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar dados de rastreamento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Limpo sem Botão Atualizar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Pedidos de Manipulação & Produção
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Acompanhamento em tempo real das solicitações de manipulação ({totalOrders} pedidos)
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por código, cliente ou rastreio..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Status de Produção</option>
            <option value="CONFIRMED">Pago / Confirmado</option>
            <option value="PROCESSING">Em Manipulação</option>
            <option value="READY_FOR_SHIPPING">Pronto para Envio</option>
            <option value="SHIPPED">Enviado / Em Trânsito</option>
            <option value="DELIVERED">Entregue</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <div>
          <select
            value={trackingFilter}
            onChange={e => { setTrackingFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Filtro de Rastreamento</option>
            <option value="with_tracking">Com Rastreio Cadastrado</option>
            <option value="without_tracking">Pendente de Rastreio</option>
          </select>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            <span>Carregando pedidos de produção...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nenhum pedido encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Código / Data</th>
                  <th className="py-3.5 px-4">Fórmulas & Itens</th>
                  <th className="py-3.5 px-4">Status de Produção</th>
                  <th className="py-3.5 px-4">Rastreamento</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map(order => {
                  const statusBadge = ORDER_STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' };

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-gray-900 dark:text-white">#{order.id.slice(-8).toUpperCase()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                              <span className="text-primary-600 dark:text-primary-400 font-bold">{item.quantity}x</span> {item.product_name}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        {order.tracking_code ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 block">{order.tracking_code}</span>
                            {order.shipping_carrier && <span className="text-gray-500 dark:text-gray-400 block">{order.shipping_carrier}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">Pendente rastreio</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(order.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
                            title="Ver Fórmulas e Composição"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenStatusModal(order)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
                            title="Alterar Status da Produção"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenTrackingModal(order)}
                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition"
                            title="Cadastrar Rastreamento"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} ({totalOrders} pedidos)
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

      {/* Modal Detalhes da Fórmula para Produção */}
      <AdminModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Fórmula & Instruções de Manipulação #${selectedOrder?.id?.slice(-8).toUpperCase()}`}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-1">
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Dados de Entrega do Cliente</div>
              <div className="text-gray-600 dark:text-gray-300">{selectedOrder.shipping_address || 'Endereço não informado'}</div>
            </div>

            <div className="space-y-3">
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Itens da Fórmula</div>
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white">
                    <span>{item.quantity}x {item.product_name}</span>
                    {item.purchase_price !== undefined && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                        Custo: {Number(item.purchase_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </div>

                  {item.compositions && (
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">Composição & Ativos:</span>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        {item.compositions}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 pt-1">
                    <div><span className="font-medium text-gray-900 dark:text-gray-200">Forma Farmacêutica:</span> {item.intended_form || 'Cápsulas'}</div>
                    <div><span className="font-medium text-gray-900 dark:text-gray-200">Apresentação:</span> {item.intended_presentation || 'Frasco'}</div>
                    <div><span className="font-medium text-gray-900 dark:text-gray-200">Dose Diária:</span> {item.intended_units_per_dose || '2 cápsulas/dia'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminModal>

      {/* Modal Alterar Status */}
      <AdminModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Atualizar Status de Produção"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status do Pedido</label>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="CONFIRMED">Pago / Confirmado</option>
              <option value="PROCESSING">Em Manipulação</option>
              <option value="READY_FOR_SHIPPING">Pronto para Envio</option>
              <option value="SHIPPED">Enviado / Em Trânsito</option>
              <option value="DELIVERED">Entregue</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Salvando...' : 'Atualizar Status'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Modal Atualizar Rastreamento */}
      <AdminModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        title="Informações de Frete e Rastreamento"
      >
        <form onSubmit={handleSaveTracking} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Rastreio *</label>
            <input
              type="text"
              required
              placeholder="Ex: AA123456789BR"
              value={trackingForm.tracking_code}
              onChange={e => setTrackingForm({ ...trackingForm, tracking_code: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL de Acompanhamento (Com https://)</label>
            <input
              type="url"
              placeholder="https://rastreamento.correios.com.br/app/index.php?codigo=..."
              value={trackingForm.tracking_url}
              onChange={e => setTrackingForm({ ...trackingForm, tracking_url: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transportadora / Operador de Envio</label>
            <input
              type="text"
              placeholder="Ex: Correios SEDEX, Loggi, Jadlog"
              value={trackingForm.shipping_carrier}
              onChange={e => setTrackingForm({ ...trackingForm, shipping_carrier: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observações do Envio</label>
            <input
              type="text"
              placeholder="Ex: Coletado às 15:00 na farmácia central"
              value={trackingForm.shipping_notes}
              onChange={e => setTrackingForm({ ...trackingForm, shipping_notes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={trackingForm.update_status_to_shipped}
              onChange={e => setTrackingForm({ ...trackingForm, update_status_to_shipped: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Alterar automaticamente o status do pedido para "Enviado / Em Trânsito"</span>
          </label>

          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Salvando...' : 'Salvar e Enviar Rastreio'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
