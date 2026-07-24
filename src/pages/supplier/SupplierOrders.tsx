import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, Truck, Eye, RefreshCw, Copy, ExternalLink, ChevronDown, Check, SlidersHorizontal, X, Pill } from 'lucide-react';
import { supplierService, SupplierOrder } from '../../services/supplier.service';
import { toast } from '../../utils/toast';
import AdminModal from '../../components/AdminModal';
import { formatStoredShippingAddress } from '../../utils/shippingAddress';
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

const getShippingAddressLabel = (order: SupplierOrder): string => (
  formatStoredShippingAddress(order.shipping_address) || 'Endereço não informado'
);

export default function SupplierOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedOrderId = searchParams.get('orderId');
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
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [shippingMethodFilter, setShippingMethodFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Modais
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showReadyModal, setShowReadyModal] = useState(false);
  const [readyConfirmed, setReadyConfirmed] = useState(false);
  const [reviewedItemIds, setReviewedItemIds] = useState<string[]>([]);
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [pendingStatusAfterReady, setPendingStatusAfterReady] = useState<string | null>(null);
  const [pendingStatusAfterTracking, setPendingStatusAfterTracking] = useState<string | null>(null);
  const [trackingMustMarkShipped, setTrackingMustMarkShipped] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [canCancelOrders, setCanCancelOrders] = useState(false);
  const [statusMenu, setStatusMenu] = useState<{ order: SupplierOrder; top: number; left: number; width: number } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');

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
  }, [page, searchTerm, statusFilter, trackingFilter, dateStart, dateEnd, shippingMethodFilter, sortOrder]);

  useEffect(() => {
    supplierService.getProfile().then(res => {
      const user = res.data?.user;
      const permissions = user?.permissions || [];
      setCanCancelOrders(user?.role === 'admin' || user?.role === 'supplier_admin' || permissions.includes('*') || permissions.includes('orders:cancel'));
    }).catch(() => setCanCancelOrders(false));
  }, []);

  // Polling automático em tempo real a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [page, searchTerm, statusFilter, trackingFilter, dateStart, dateEnd, shippingMethodFilter, sortOrder]);

  const loadOrders = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) setLoading(true);
      const res = await supplierService.getOrders({
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter,
        tracking_status: trackingFilter,
        date_start: dateStart,
        date_end: dateEnd,
        shipping_method: shippingMethodFilter,
        sort: sortOrder,
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

  useEffect(() => {
    if (!deepLinkedOrderId) return;
    handleOpenDetailModal(deepLinkedOrderId).finally(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('orderId');
      setSearchParams(next, { replace: true });
    });
  }, [deepLinkedOrderId]);

  const updateStatus = async (order: SupplierOrder, status: string, cancellationReason?: string) => {
    try {
      setStatusUpdatingId(order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
      await supplierService.updateOrderStatus(order.id, status, cancellationReason);
      loadOrders(true);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status');
      loadOrders(true);
      return false;
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleStatusChange = (order: SupplierOrder, status: string) => {
    setStatusMenu(null);
    if (status === order.status) return;
    const currentStage = ({ CONFIRMED: 1, PROCESSING: 2, READY_FOR_SHIPPING: 3, SHIPPED: 4, DELIVERED: 5 } as Record<string, number>)[order.status] || 0;
    if (status === 'READY_FOR_SHIPPING') {
      setSelectedOrder(order);
      setReadyConfirmed(false);
      setReviewedItemIds([]);
      setExpandedItemIds([]);
      setPendingStatusAfterReady(null);
      setShowReadyModal(true);
      return;
    }
    if (status === 'SHIPPED') {
      if (currentStage < 3) {
        setSelectedOrder(order);
        setReadyConfirmed(false);
        setReviewedItemIds([]);
        setExpandedItemIds([]);
        setPendingStatusAfterReady('SHIPPED');
        setShowReadyModal(true);
      } else {
        updateStatus(order, 'SHIPPED');
      }
      return;
    }
    if (status === 'DELIVERED') {
      if (currentStage < 3) {
        setSelectedOrder(order);
        setReadyConfirmed(false);
        setReviewedItemIds([]);
        setExpandedItemIds([]);
        setPendingStatusAfterReady('DELIVERED');
        setShowReadyModal(true);
      } else {
        updateStatus(order, 'DELIVERED');
      }
      return;
    }
    if (status === 'CANCELLED') {
      if (!canCancelOrders) {
        toast.error('Você não possui permissão para cancelar pedidos.');
        return;
      }
      setSelectedOrder(order);
      setCancelReason('');
      setCustomCancelReason('');
      setShowCancelModal(true);
      return;
    }
    updateStatus(order, status);
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const reason = cancelReason === 'OUTRO' ? customCancelReason.trim() : cancelReason;
    if (!reason) {
      toast.error('Selecione ou informe o motivo do cancelamento.');
      return;
    }
    const updated = await updateStatus(selectedOrder, 'CANCELLED', reason);
    if (updated) setShowCancelModal(false);
  };

  const openStatusMenu = (event: React.MouseEvent<HTMLButtonElement>, order: SupplierOrder) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 230;
    setStatusMenu({
      order,
      top: Math.min(rect.bottom + 6, window.innerHeight - 330),
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
    });
  };

  const handleConfirmReady = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !readyConfirmed) return;
    const nextStatus = pendingStatusAfterReady || 'READY_FOR_SHIPPING';
    setShowReadyModal(false);
    setPendingStatusAfterReady(null);
    await updateStatus(selectedOrder, nextStatus);
  };

  const toggleReviewedItem = (itemId: string) => {
    setReviewedItemIds(current => current.includes(itemId) ? current.filter(id => id !== itemId) : [...current, itemId]);
  };

  const toggleExpandedItem = (itemId: string) => {
    setExpandedItemIds(current => current.includes(itemId) ? current.filter(id => id !== itemId) : [...current, itemId]);
  };

  const handleOpenTrackingModal = (order: SupplierOrder, mustMarkShipped = false, statusAfterTracking: string | null = null) => {
    setSelectedOrder(order);
    setTrackingMustMarkShipped(mustMarkShipped);
    setPendingStatusAfterTracking(statusAfterTracking);
    setTrackingForm({
      tracking_code: order.tracking_code || '',
      tracking_url: order.tracking_url || '',
      shipping_carrier: order.shipping_carrier || '',
      shipping_notes: order.shipping_notes || '',
      update_status_to_shipped: mustMarkShipped || !['SHIPPED', 'DELIVERED'].includes(order.status),
    });
    setShowTrackingModal(true);
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setSubmitting(true);
      await supplierService.updateOrderTracking(selectedOrder.id, trackingForm);
      toast.success('Rastreamento salvo com sucesso!');
      setShowTrackingModal(false);
      const finalStatus = pendingStatusAfterTracking;
      setPendingStatusAfterTracking(null);
      setTrackingMustMarkShipped(false);
      if (finalStatus === 'DELIVERED') {
        await updateStatus({ ...selectedOrder, status: 'SHIPPED' }, 'DELIVERED');
      } else {
        loadOrders(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar dados de rastreamento');
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) {
      toast.error(`${label} não informado.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  };

  const formatItemsForCopy = (order: SupplierOrder) => order.items
    .map(item => [
      `${item.quantity}x ${item.product_name}`,
      item.compositions ? `Composição: ${item.compositions}` : '',
      item.intended_form ? `Forma: ${item.intended_form}` : '',
      item.intended_presentation ? `Apresentação: ${item.intended_presentation}` : '',
      item.intended_units_per_dose ? `Unidades por dose: ${item.intended_units_per_dose}` : '',
      item.capsule_color_preference
        ? `Padrão de produção: ${item.capsule_color_preference}`
        : '',
    ].filter(Boolean).join('\n'))
    .join('\n\n');

  const activeFilterCount = [statusFilter, trackingFilter, dateStart, dateEnd, shippingMethodFilter, sortOrder !== 'newest' ? sortOrder : ''].filter(Boolean).length;
  const clearFilters = () => {
    setStatusFilter(''); setTrackingFilter(''); setDateStart(''); setDateEnd(''); setShippingMethodFilter(''); setSortOrder('newest'); setPage(1);
  };

  return (
    <div className="space-y-6">

      {/* Busca e filtros compactos */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por código, cliente ou rastreio..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button type="button" onClick={() => setShowFilters(value => !value)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${showFilters || activeFilterCount ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300' : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}><SlidersHorizontal className="h-4 w-4" /> Filtros {activeFilterCount > 0 && <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>}</button>
          {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-3.5 w-3.5" /> Limpar</button>}
        </div>
        {showFilters && <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-2 xl:grid-cols-6 dark:border-gray-800">
          <label className="text-xs text-gray-500">Status<select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Todos</option><option value="CONFIRMED">Pago / Confirmado</option><option value="PROCESSING">Em Manipulação</option><option value="READY_FOR_SHIPPING">Pronto para Envio</option><option value="SHIPPED">Enviado / Em Trânsito</option><option value="DELIVERED">Entregue</option><option value="CANCELLED">Cancelado</option></select></label>
          <label className="text-xs text-gray-500">Rastreamento<select value={trackingFilter} onChange={e => { setTrackingFilter(e.target.value); setPage(1); }} className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="">Todos</option><option value="with_tracking">Com rastreio</option><option value="without_tracking">Sem rastreio</option></select></label>
          <label className="text-xs text-gray-500">Data inicial<input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }} className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
          <label className="text-xs text-gray-500">Data final<input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }} className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
          <label className="text-xs text-gray-500">Método de envio<input type="text" value={shippingMethodFilter} onChange={e => { setShippingMethodFilter(e.target.value); setPage(1); }} placeholder="Ex.: SEDEX" className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
          <label className="text-xs text-gray-500">Ordenar<select value={sortOrder} onChange={e => { setSortOrder(e.target.value as 'newest' | 'oldest'); setPage(1); }} className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option></select></label>
        </div>}
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
          <>
            <div className="xl:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {orders.map(order => {
                const statusBadge = ORDER_STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' };
                const hasTracking = Boolean(order.tracking_code || order.tracking_url);
                return (
                  <article key={order.id} className="p-4 space-y-3 hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button onClick={() => handleOpenDetailModal(order.id)} className="font-mono font-bold text-primary-700 dark:text-primary-300 hover:underline">#{order.id.slice(-8).toUpperCase()}</button>
                        <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button type="button" disabled={statusUpdatingId === order.id} onClick={e => openStatusMenu(e, order)} className={`min-w-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${statusBadge.color}`}>
                        <span className="truncate">{statusUpdatingId === order.id ? 'Atualizando...' : statusBadge.label}</span>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0 rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Produtos</span>
                          <button type="button" onClick={() => copyText(formatItemsForCopy(order), 'Itens do pedido')} className="p-1 rounded-md text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-950/50" title="Copiar produtos"><Copy size={14} /></button>
                        </div>
                        <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-200" title={order.items.map(item => `${item.quantity}x ${item.product_name}`).join(' • ')}>
                          {order.items.map(item => `${item.quantity}x ${item.product_name}`).join(' • ') || 'Sem itens'}
                        </div>
                      </div>

                      <div className="min-w-0 rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Entrega</span>
                          <button type="button" onClick={() => copyText(getShippingAddressLabel(order), 'Endereço')} className="p-1 rounded-md text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-950/50" title="Copiar endereço"><Copy size={14} /></button>
                        </div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{order.shipping_method || 'Método não informado'}</div>
                        <div className="truncate text-[11px] text-gray-500 dark:text-gray-400" title={getShippingAddressLabel(order)}>{getShippingAddressLabel(order)}</div>
                      </div>
                    </div>

                    {order.status === 'CANCELLED' && order.cancellation_reason && <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">Motivo: {order.cancellation_reason}</div>}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <div className="min-w-0 text-xs">
                        {hasTracking ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {order.tracking_code && <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{order.tracking_code}</span>}
                            {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300 hover:underline">Abrir rastreio <ExternalLink size={12} /></a>}
                          </div>
                        ) : <span className="italic text-amber-600 dark:text-amber-400">Rastreio pendente</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleOpenDetailModal(order.id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><Eye className="w-4 h-4" /> Ver</button>
                        <button onClick={() => handleOpenTrackingModal(order)} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs ${hasTracking ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'}`}><Truck className="w-4 h-4" /> {hasTracking ? 'Editar' : 'Rastreio'}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed text-left text-sm border-collapse">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[27%]" />
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Código / Data</th>
                    <th className="py-3 px-3">Fórmulas & Itens</th>
                    <th className="py-3 px-3">Entrega</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Rastreamento</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map(order => {
                    const statusBadge = ORDER_STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' };

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3.5 px-3 align-top">
                          <button onClick={() => handleOpenDetailModal(order.id)} className="font-mono font-bold text-primary-700 dark:text-primary-300 hover:underline">#{order.id.slice(-8).toUpperCase()}</button>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 align-top">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" title={order.items.map(item => `${item.quantity}x ${item.product_name}`).join(' • ')}>
                              {order.items.map((item, idx) => (
                                <span key={idx} className="inline-block mr-2 text-xs text-gray-800 dark:text-gray-200 font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                                  <span className="text-primary-600 dark:text-primary-400 font-bold">{item.quantity}x</span> {item.product_name}
                                </span>
                              ))}
                            </div>
                            <button type="button" onClick={() => copyText(formatItemsForCopy(order), 'Itens do pedido')} className="shrink-0 p-1.5 rounded-lg text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40" title="Copiar produtos"><Copy size={15} /></button>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 align-top min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{order.shipping_method || 'Método não informado'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={getShippingAddressLabel(order)}>{getShippingAddressLabel(order)}</div>
                            </div>
                            <button type="button" onClick={() => copyText(getShippingAddressLabel(order), 'Endereço')} className="shrink-0 p-1.5 rounded-lg text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40" title="Copiar endereço"><Copy size={15} /></button>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 align-top">
                          <button
                            type="button"
                            disabled={statusUpdatingId === order.id}
                            onClick={e => openStatusMenu(e, order)}
                            className={`inline-flex max-w-[205px] items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-wait disabled:opacity-60 ${statusBadge.color}`}
                            aria-label={`Alterar status do pedido ${order.id}`}
                          >
                            <span className="truncate">{statusUpdatingId === order.id ? 'Atualizando...' : statusBadge.label}</span>
                            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          {order.status === 'CANCELLED' && order.cancellation_reason && (
                            <div className="mt-1.5 max-w-[205px] text-[11px] text-rose-700 dark:text-rose-300" title={order.cancellation_reason}>Motivo: {order.cancellation_reason}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 align-top text-xs overflow-hidden">
                          {order.tracking_code || order.tracking_url ? (
                            <div className="space-y-0.5">
                              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 block">{order.tracking_code}</span>
                              {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300 hover:underline">Abrir link <ExternalLink size={12} /></a>}
                              {order.shipping_carrier && <span className="text-gray-500 dark:text-gray-400 block">{order.shipping_carrier}</span>}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">Pendente rastreio</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenDetailModal(order.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
                              title="Ver Fórmulas e Composição"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenTrackingModal(order)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition ${order.tracking_code || order.tracking_url ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}
                              title={order.tracking_code || order.tracking_url ? 'Editar rastreamento cadastrado' : 'Cadastrar rastreamento pendente'}
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
          </>
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

      {statusMenu && createPortal(
        <div className="fixed inset-0 z-[1100]" onClick={() => setStatusMenu(null)}>
          <div
            className="fixed overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: Math.max(12, statusMenu.top), left: statusMenu.left, width: statusMenu.width }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Alterar status</div>
            {Object.entries(ORDER_STATUS_MAP)
              .filter(([status]) => status !== 'PENDING' && (status !== 'CANCELLED' || canCancelOrders))
              .map(([status, option]) => (
                <button
                  type="button"
                  key={status}
                  disabled={status === statusMenu.order.status}
                  onClick={() => handleStatusChange(statusMenu.order, status)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-default ${status === 'CANCELLED' ? 'mt-1 border-t border-gray-100 dark:border-gray-800' : ''}`}
                >
                  <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold ${option.color}`}>{option.label}</span>
                  {status === statusMenu.order.status && <span className="ml-auto text-[10px] text-gray-400">Atual</span>}
                </button>
              ))}
            {!canCancelOrders && (
              <div className="mt-1 border-t border-gray-100 dark:border-gray-800 px-2.5 py-2 text-[10px] text-gray-400">Cancelamento somente administradores.</div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Modal Detalhes da Fórmula para Produção */}
      <AdminModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Produtos e dados de produção #${selectedOrder?.id?.slice(-8).toUpperCase()}`}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Dados de Entrega do Cliente</div>
                <button type="button" onClick={() => copyText(getShippingAddressLabel(selectedOrder), 'Endereço')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"><Copy size={14} /></button>
              </div>
              <div className="text-gray-600 dark:text-gray-300 font-medium">Envio: {selectedOrder.shipping_method || 'Não informado'}</div>
              <div className="text-gray-600 dark:text-gray-300">{getShippingAddressLabel(selectedOrder)}</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Itens da Fórmula</div>
                <button type="button" onClick={() => copyText(formatItemsForCopy(selectedOrder), 'Itens do pedido')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"><Copy size={14} /></button>
              </div>
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white">
                    <span>{item.quantity}x {item.product_name}</span>
                  </div>

                  {item.compositions && (
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">Composição & Ativos:</span>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        {item.compositions}
                      </p>
                    </div>
                  )}

                  {item.intended_units_per_dose && (
                    <div className="text-gray-600 dark:text-gray-400 pt-1">
                      <span className="font-medium text-gray-900 dark:text-gray-200">Unidades por dose:</span> {item.intended_units_per_dose}
                    </div>
                  )}

                  {item.capsule_color_preference && (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <Pill className="mt-0.5 h-4 w-4 shrink-0" />
                      <div><strong>Padrão de produção:</strong> {item.capsule_color_preference}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminModal>

      {/* Confirmação para liberar o pedido para envio */}
      <AdminModal
        isOpen={showReadyModal}
        onClose={() => { setShowReadyModal(false); setPendingStatusAfterReady(null); }}
        title="Confirmar pedido pronto para envio"
      >
        {selectedOrder && (
          <form onSubmit={handleConfirmReady} className="space-y-4 text-sm">
            <p className="text-gray-600 dark:text-gray-300">Revise todos os produtos antes de liberar este pedido para envio.</p>
            <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
              {selectedOrder.items.map((item, idx) => {
                const itemKey = item.id || `${item.product_id}-${idx}`;
                const reviewed = reviewedItemIds.includes(itemKey);
                const expanded = expandedItemIds.includes(itemKey);
                const hasDetails = Boolean(item.compositions || item.description || item.intended_form || item.intended_presentation || item.intended_units_per_dose || item.capsule_color_preference);
                return (
                  <div key={itemKey} className={`rounded-xl bg-white dark:bg-gray-800 border transition-colors ${reviewed ? 'border-emerald-300 dark:border-emerald-800' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => toggleExpandedItem(itemKey)}
                        disabled={!hasDetails}
                        className="shrink-0 p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-25 disabled:cursor-default"
                        aria-label={expanded ? 'Ocultar composição e instruções' : 'Mostrar composição e instruções'}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
                      </button>
                      <button type="button" onClick={() => toggleReviewedItem(itemKey)} className="min-w-0 flex-1 flex items-center gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <span className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${reviewed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'}`}>
                          {reviewed && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className={`min-w-0 font-semibold ${reviewed ? 'text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/60' : 'text-gray-900 dark:text-white'}`}>
                          <span className="text-primary-600 dark:text-primary-400">{item.quantity}x</span> {item.product_name}
                        </span>
                      </button>
                      <span className="hidden sm:block shrink-0 text-[10px] text-gray-400">Clique no nome para conferir</span>
                    </div>

                    {expanded && hasDetails && (
                      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3 text-xs">
                        {item.compositions && (
                          <div>
                            <div className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Composição</div>
                            <div className="whitespace-pre-line text-gray-600 dark:text-gray-400">{item.compositions}</div>
                          </div>
                        )}
                        {item.description && (
                          <div>
                            <div className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Instruções</div>
                            <div className="whitespace-pre-line text-gray-600 dark:text-gray-400">{item.description}</div>
                          </div>
                        )}
                        {(item.intended_form || item.intended_presentation || item.intended_units_per_dose) && (
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-600 dark:text-gray-400">
                            {item.intended_form && <span><strong className="text-gray-700 dark:text-gray-300">Forma:</strong> {item.intended_form}</span>}
                            {item.intended_presentation && <span><strong className="text-gray-700 dark:text-gray-300">Apresentação:</strong> {item.intended_presentation}</span>}
                            {item.intended_units_per_dose && <span><strong className="text-gray-700 dark:text-gray-300">Unidades por dose:</strong> {item.intended_units_per_dose}</span>}
                          </div>
                        )}

                        {item.capsule_color_preference && (
                          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                            <Pill className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <strong>Padrão de produção:</strong> {item.capsule_color_preference}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">A marcação individual ajuda na conferência, mas não é obrigatória. Apenas a confirmação final abaixo libera o pedido.</div>
            <label className="flex items-start gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-3 cursor-pointer">
              <input type="checkbox" checked={readyConfirmed} onChange={e => setReadyConfirmed(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-xs text-gray-700 dark:text-gray-200">Conferi os produtos, quantidades e composições acima. O pedido está completo e pronto para envio.</span>
            </label>
            <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="submit" disabled={!readyConfirmed || statusUpdatingId === selectedOrder.id} className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                {statusUpdatingId === selectedOrder.id ? 'Confirmando...' : 'Confirmar pedido pronto'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={`Cancelar pedido #${selectedOrder?.id?.slice(-8).toUpperCase()}`}
      >
        <form onSubmit={handleConfirmCancellation} className="space-y-4 text-sm">
          <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-800 dark:text-rose-200">
            O pedido ficará visível ao fornecedor por até três dias para permitir a interrupção da produção ou do envio.
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Motivo do cancelamento *</legend>
            {[
              ['Sem matéria-prima', 'Sem matéria-prima disponível'],
              ['Incapaz de entregar no prazo', 'Incapaz de entregar no prazo'],
              ['Problema técnico na formulação', 'Problema técnico na formulação'],
              ['Pedido duplicado ou inválido', 'Pedido duplicado ou inválido'],
              ['Outro motivo', 'OUTRO'],
            ].map(([label, value]) => (
              <label key={value} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${cancelReason === value ? 'border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <input type="radio" name="cancel-reason" value={value} checked={cancelReason === value} onChange={e => setCancelReason(e.target.value)} className="text-rose-600 focus:ring-rose-500" />
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{label}</span>
              </label>
            ))}
          </fieldset>
          {cancelReason === 'OUTRO' && (
            <textarea value={customCancelReason} onChange={e => setCustomCancelReason(e.target.value)} rows={3} maxLength={500} placeholder="Descreva o motivo do cancelamento" className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
          )}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="submit" disabled={statusUpdatingId === selectedOrder?.id || !cancelReason || (cancelReason === 'OUTRO' && !customCancelReason.trim())} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              {statusUpdatingId === selectedOrder?.id ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Modal Atualizar Rastreamento */}
      <AdminModal
        isOpen={showTrackingModal}
        onClose={() => { setShowTrackingModal(false); setPendingStatusAfterTracking(null); setTrackingMustMarkShipped(false); }}
        title="Informações de Frete e Rastreamento"
      >
        <form onSubmit={handleSaveTracking} className="space-y-4 text-sm">
          {trackingMustMarkShipped}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Rastreio (opcional)</label>
            <input
              type="text"
              placeholder="Ex: AA123456789BR"
              value={trackingForm.tracking_code}
              onChange={e => setTrackingForm({ ...trackingForm, tracking_code: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL de Acompanhamento (opcional; informe código ou link)</label>
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
              disabled={trackingMustMarkShipped}
              onChange={e => setTrackingForm({ ...trackingForm, update_status_to_shipped: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-60"
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
