import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, CircleDollarSign, HelpCircle, Package } from 'lucide-react';
import type { SupplierSettlementCycle, SupplierSettlementOverview } from '../services/supplier.service';
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
}

const CYCLES_PER_PAGE = 10;
const ORDERS_PER_PAGE = 10;

export default function SupplierSettlementBreakdown({ overview, onPayCycle, showRuleHelp = false }: Props) {
  const [openCycles, setOpenCycles] = useState<Record<string, boolean>>({});
  const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({});
  const [orderPages, setOrderPages] = useState<Record<string, number>>({});
  const [cyclePage, setCyclePage] = useState(1);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const totalCyclePages = Math.max(1, Math.ceil(overview.cycles.length / CYCLES_PER_PAGE));
  const visibleCycles = overview.cycles.slice((cyclePage - 1) * CYCLES_PER_PAGE, cyclePage * CYCLES_PER_PAGE);

  useEffect(() => setCyclePage(current => Math.min(current, totalCyclePages)), [totalCyclePages]);

  return (
    <div className="space-y-4">
      {showRuleHelp && <div className="flex justify-end"><button type="button" onClick={() => setShowRuleModal(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-primary-950/30" title="Como funcionam os repasses?" aria-label="Como funcionam os repasses?"><HelpCircle className="h-5 w-5" /></button></div>}

      <div className="space-y-3">
        {visibleCycles.map(cycle => {
          const status = STATUS[cycle.status];
          const isOpen = Boolean(openCycles[cycle.id]);
          const orderPage = orderPages[cycle.id] || 1;
          const totalOrderPages = Math.max(1, Math.ceil(cycle.orders.length / ORDERS_PER_PAGE));
          const visibleOrders = cycle.orders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);
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

                <div className="grid grid-cols-3 gap-4 text-right text-xs lg:min-w-[390px]">
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
                        return (
                          <div key={order.id} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                            <button type="button" onClick={() => setOpenOrders(current => ({ ...current, [order.id]: !orderOpen }))} className="grid w-full grid-cols-1 gap-2 p-3 text-left sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5">
                              <div className="flex min-w-0 items-center gap-2">
                                {orderOpen ? <ChevronDown className="h-4 w-4 flex-none text-gray-400" /> : <ChevronRight className="h-4 w-4 flex-none text-gray-400" />}
                                <div className="min-w-0"><div className="truncate text-xs font-semibold text-gray-900 dark:text-white">Pedido #{order.id.slice(-8).toUpperCase()} · {order.customerName}</div><div className="text-[11px] text-gray-500">{dateTime(order.createdAt)} · {order.status}</div></div>
                              </div>
                              <div className="text-xs text-gray-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{money(order.amount)}</div>
                            </button>
                            {orderOpen && (
                              <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                                {order.items.map((item, index) => (
                                  <div key={`${item.productId}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 py-1.5 text-xs">
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><Package className="h-3.5 w-3.5 text-gray-400" /><span>{item.productName} · {item.quantity} × {money(item.unitCost)}</span></div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{money(item.totalCost)}</div>
                                  </div>
                                ))}
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
      <AdminModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title="Como funcionam os repasses"><div className="space-y-3 text-sm text-gray-700 dark:text-gray-300"><p className="font-semibold text-gray-900 dark:text-white">{overview.configuration.ruleDescription}</p><p>Somente pedidos com pagamento confirmado entram no cálculo. Pedidos cancelados ou aguardando pagamento não entram.</p><p>Os pedidos do ciclo atual aparecem como valor em formação; após o fechamento, passam para o saldo devido.</p></div></AdminModal>
    </div>
  );
}
