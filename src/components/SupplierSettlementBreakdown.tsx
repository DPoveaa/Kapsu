import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, CircleDollarSign, HelpCircle, Package, Truck, Pencil, History, ArrowRight } from 'lucide-react';
import { adminService } from '../services/admin.service';
import { supplierService, SupplierSettlementCycle, SupplierSettlementOrder, SupplierSettlementOverview } from '../services/supplier.service';
import { toast } from '../utils/toast';
import AdminModal from './AdminModal';

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR');

const STATUS = {
  PAID: { label: 'Pago', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  PARTIAL: { label: 'Pago parcialmente', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  DUE: { label: 'Pagamento devido', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  ACCRUING: { label: 'Em formação', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
  EMPTY: { label: 'Sem movimento', className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
};

interface Props {
  overview: SupplierSettlementOverview;
  onPayCycle?: (cycle: SupplierSettlementCycle) => void;
  showRuleHelp?: boolean;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

const CYCLES_PER_PAGE = 10;
const ORDERS_PER_PAGE = 10;

export default function SupplierSettlementBreakdown({
  overview,
  onPayCycle,
  showRuleHelp = false,
  onRefresh,
  isAdmin = false,
}: Props) {
  const [openCycles, setOpenCycles] = useState<Record<string, boolean>>({});
  const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({});
  const [orderPages, setOrderPages] = useState<Record<string, number>>({});
  const [cyclePage, setCyclePage] = useState(1);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Modal de edição de frete
  const [editingOrder, setEditingOrder] = useState<SupplierSettlementOrder | null>(null);
  const [newShippingValue, setNewShippingValue] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [savingShipping, setSavingShipping] = useState<boolean>(false);

  // Modal de histórico de alterações de frete
  const [historyOrder, setHistoryOrder] = useState<SupplierSettlementOrder | null>(null);

  const totalCyclePages = Math.max(1, Math.ceil(overview.cycles.length / CYCLES_PER_PAGE));
  const visibleCycles = overview.cycles.slice((cyclePage - 1) * CYCLES_PER_PAGE, cyclePage * CYCLES_PER_PAGE);

  useEffect(() => setCyclePage(current => Math.min(current, totalCyclePages)), [totalCyclePages]);

  const handleSaveShippingFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const parsedVal = parseFloat(newShippingValue);
    if (!Number.isFinite(parsedVal) || parsedVal < 0) {
      toast.error('Informe um valor de frete válido.');
      return;
    }

    try {
      setSavingShipping(true);
      if (isAdmin) {
        await adminService.updateOrderShippingFee(editingOrder.id, parsedVal, editReason);
      } else {
        await supplierService.updateOrderShippingFee(editingOrder.id, parsedVal, editReason);
      }
      toast.success('Valor do frete atualizado com sucesso!');
      setEditingOrder(null);
      setNewShippingValue('');
      setEditReason('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar o frete.');
    } finally {
      setSavingShipping(false);
    }
  };

  return (
    <div className="space-y-4">
      {showRuleHelp && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowRuleModal(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-primary-950/30"
            title="Como funcionam os repasses?"
            aria-label="Como funcionam os repasses?"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {visibleCycles.map(cycle => {
          const status = STATUS[cycle.status];
          const isOpen = Boolean(openCycles[cycle.id]);
          const orderPage = orderPages[cycle.id] || 1;
          const totalOrderPages = Math.max(1, Math.ceil(cycle.orders.length / ORDERS_PER_PAGE));
          const visibleOrders = cycle.orders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);
          const hasShipping = (cycle.shippingAmount ?? 0) > 0;
          return (
            <div key={cycle.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <button
                  type="button"
                  onClick={() => setOpenCycles(current => ({ ...current, [cycle.id]: !isOpen }))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 flex-none text-gray-400" /> : <ChevronRight className="h-4 w-4 flex-none text-gray-400" />}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">Início {date(cycle.periodStart)} · fechamento {date(cycle.periodEnd)} às 00:00</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {cycle.orders.length} pedido{cycle.orders.length === 1 ? '' : 's'} · pagamento em {date(cycle.dueDate)}
                    </div>
                  </div>
                </button>

                {/* Cycle financial summary — shows product cost + shipping separately */}
                <div className={`grid gap-4 text-right text-xs lg:min-w-[${hasShipping ? '500px' : '390px'}]`} style={{ gridTemplateColumns: hasShipping ? 'repeat(5, auto)' : 'repeat(3, auto)' }}>
                  {hasShipping && (
                    <>
                      <div>
                        <div className="text-gray-500">Produtos</div>
                        <div className="font-bold text-gray-900 dark:text-white">{money(cycle.itemsAmount ?? 0)}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
                          <Truck className="h-3 w-3" />
                          <span>Frete</span>
                        </div>
                        <div className="font-bold text-blue-600 dark:text-blue-400">{money(cycle.shippingAmount ?? 0)}</div>
                      </div>
                    </>
                  )}
                  <div><div className="text-gray-500">Vendas</div><div className="font-bold text-gray-900 dark:text-white">{money(cycle.amount)}</div></div>
                  <div><div className="text-gray-500">Pago</div><div className="font-bold text-emerald-600">{money(cycle.paidAmount)}</div></div>
                  <div><div className="text-gray-500">Saldo</div><div className="font-bold text-rose-600">{money(cycle.balance)}</div></div>
                </div>

                {onPayCycle && !cycle.isCurrent && cycle.balance > 0 && (
                  <button type="button" onClick={() => onPayCycle(cycle)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">
                    <CircleDollarSign className="h-4 w-4" /> Registrar pagamento
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-950/30">
                  {cycle.orders.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">Nenhum pedido neste período.</div>
                  ) : (
                    <div className="space-y-2">
                      {visibleOrders.map(order => {
                        const orderOpen = Boolean(openOrders[order.id]);
                        const orderShipping = order.shippingFee ?? 0;
                        const orderItems = order.itemsCost ?? order.amount;
                        const hasOrderShipping = orderShipping > 0 || order.shippingFeeOverridden;
                        return (
                          <div key={order.id} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                            <button type="button" onClick={() => setOpenOrders(current => ({ ...current, [order.id]: !orderOpen }))} className="grid w-full grid-cols-1 gap-2 p-3 text-left sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5">
                              <div className="flex min-w-0 items-center gap-2">
                                {orderOpen ? <ChevronDown className="h-4 w-4 flex-none text-gray-400" /> : <ChevronRight className="h-4 w-4 flex-none text-gray-400" />}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-xs font-semibold text-gray-900 dark:text-white">Pedido #{order.id.slice(-8).toUpperCase()} · {order.customerName}</span>
                                    {order.shippingFeeOverridden && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        Frete Alterado
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-500">{dateTime(order.createdAt)} · {order.status}</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)</div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{money(order.amount)}</div>
                                {hasOrderShipping && (
                                  <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                    Prod. {money(orderItems)} + Frete {money(orderShipping)}
                                  </div>
                                )}
                              </div>
                            </button>

                            {orderOpen && (
                              <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                                {/* Product line items */}
                                {order.items.map((item, index) => (
                                  <div key={`${item.productId}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 py-1.5 text-xs">
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><Package className="h-3.5 w-3.5 text-gray-400" /><span>{item.productName} · {item.quantity} × {money(item.unitCost)}</span></div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{money(item.totalCost)}</div>
                                  </div>
                                ))}

                                {/* Shipping reimbursement row */}
                                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50/80 px-2.5 py-1.5 text-xs dark:bg-blue-950/30">
                                  <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                                    <Truck className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                    <span>Reembolso de frete (despacho pelo fornecedor)</span>
                                    {order.shippingFeeOverridden && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        Frete Alterado
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {order.shippingFeeOverridden && order.shippingFeeHistory && order.shippingFeeHistory.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setHistoryOrder(order)}
                                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-amber-800 shadow-sm border border-amber-300 hover:bg-amber-50 dark:bg-gray-800 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-gray-700 transition"
                                        title="Ver histórico completo de alterações do frete"
                                      >
                                        <History className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                        <span>Histórico</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOrder(order);
                                        setNewShippingValue(String(orderShipping));
                                        setEditReason('');
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-100 dark:bg-gray-800 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-gray-700 transition"
                                      title="Alterar valor do frete deste pedido"
                                    >
                                      <Pencil className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                      <span>Alterar</span>
                                    </button>

                                    <div className="font-bold text-blue-700 dark:text-blue-300">{money(orderShipping)}</div>
                                  </div>
                                </div>

                                {/* Order total divider */}
                                {(order.items.length > 0 || hasOrderShipping) && (
                                  <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs dark:border-gray-800">
                                    <span className="text-gray-500">Total do pedido</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{money(order.amount)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {totalOrderPages > 1 && <div className="flex items-center justify-between px-1 pt-2 text-xs text-gray-500"><span>Pedidos: página {orderPage} de {totalOrderPages}</span><div className="flex gap-2"><button type="button" disabled={orderPage === 1} onClick={() => setOrderPages(current => ({ ...current, [cycle.id]: Math.max(1, orderPage - 1) }))} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Anterior</button><button type="button" disabled={orderPage === totalOrderPages} onClick={() => setOrderPages(current => ({ ...current, [cycle.id]: Math.min(totalOrderPages, orderPage + 1) }))} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Próxima</button></div></div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalCyclePages > 1 && <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs dark:border-gray-700 dark:bg-gray-900"><span className="text-gray-500">Repasses: página {cyclePage} de {totalCyclePages}</span><div className="flex gap-2"><button type="button" disabled={cyclePage === 1} onClick={() => setCyclePage(value => Math.max(1, value - 1))} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Anterior</button><button type="button" disabled={cyclePage === totalCyclePages} onClick={() => setCyclePage(value => Math.min(totalCyclePages, value + 1))} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600">Próxima</button></div></div>}

      <AdminModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title="Como funcionam os repasses">
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white">{overview.configuration.ruleDescription}</p>
          <p>Somente pedidos com pagamento confirmado entram no cálculo. Pedidos cancelados ou aguardando pagamento não entram.</p>
          <p>Os pedidos do ciclo atual aparecem como valor em formação; após o fechamento, passam para o saldo devido.</p>
          <p className="text-blue-700 dark:text-blue-300 font-medium">O valor de frete cobrado do cliente é incluído no repasse total, pois o fornecedor realiza o despacho e o pagamento ao transportador.</p>
        </div>
      </AdminModal>

      {/* Modal de Edição de Frete */}
      {editingOrder && (
        <AdminModal
          isOpen={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
          title={`Alterar valor do frete - Pedido #${editingOrder.id.slice(-8).toUpperCase()}`}
        >
          <form onSubmit={handleSaveShippingFee} className="space-y-4 text-sm">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              <div className="font-semibold">Informação importante</div>
              <div className="mt-1">
                Ao alterar o valor do frete, o valor total do pedido e o repasse para este ciclo serão atualizados automaticamente. A alteração ficará registrada no histórico.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor Atual do Frete</label>
                <div className="px-3.5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold font-mono text-gray-900 dark:text-white">
                  {money(editingOrder.shippingFee ?? 0)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Novo Valor do Frete (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  value={newShippingValue}
                  onChange={(e) => setNewShippingValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo da alteração (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Valor no balcão dos Correios diferiu da cotação inicial"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingShipping}
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-50 shadow-sm"
              >
                {savingShipping ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Modal de Histórico de Alterações de Frete */}
      {historyOrder && (
        <AdminModal
          isOpen={Boolean(historyOrder)}
          onClose={() => setHistoryOrder(null)}
          title={`Histórico de Alterações de Frete - Pedido #${historyOrder.id.slice(-8).toUpperCase()}`}
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Cliente</div>
                <div className="font-semibold text-gray-900 dark:text-white">{historyOrder.customerName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Frete Atual</div>
                <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{money(historyOrder.shippingFee ?? 0)}</div>
              </div>
            </div>

            {(!historyOrder.shippingFeeHistory || historyOrder.shippingFeeHistory.length === 0) ? (
              <div className="p-6 text-center text-xs text-gray-500">Nenhuma alteração registrada para este pedido.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Histórico ({historyOrder.shippingFeeHistory.length} alteração(ões))
                </div>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden dark:divide-gray-800 dark:border-gray-700">
                  {historyOrder.shippingFeeHistory.map((item, idx) => {
                    const diff = item.newValue - item.oldValue;
                    const isPositive = diff > 0;
                    return (
                      <div key={item.id || idx} className="p-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                              {item.changedByRole === 'admin' ? 'Admin' : 'Fornecedor'}
                            </span>
                            <span>{item.changedByName}</span>
                          </div>
                          <span className="text-[11px] text-gray-400">{dateTime(item.createdAt)}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 line-through">{money(item.oldValue)}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-bold text-gray-900 dark:text-white">{money(item.newValue)}</span>
                          </div>
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            Diferença: {isPositive ? '+' : ''}{money(diff)}
                          </span>
                        </div>

                        {item.reason && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg italic">
                            Motivo: "{item.reason}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  );
}
