import { DollarSign, WalletCards, Clock, TrendingUp, Info } from 'lucide-react';
import { SupplierSettlementOverview } from '../services/supplier.service';

interface SupplierSettlementCardsProps {
  overview: SupplierSettlementOverview;
  moneyFormatter?: (val: number) => string;
}

const defaultMoney = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCycleDate = (overview: SupplierSettlementOverview) => {
  const value = overview.cycles.find((c) => c.isCurrent)?.dueDate;
  return value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    : null;
};

export default function SupplierSettlementCards({
  overview,
  moneyFormatter = defaultMoney,
}: SupplierSettlementCardsProps) {
  const summary = overview.summary;
  const nextDueDate = formatCycleDate(overview);

  // Card 1: Vendas Válidas
  const card1Tooltip =
    summary.totalSalesAmount === 0
      ? 'Nenhuma venda faturada ou válida no sistema até o momento.'
      : `Soma acumulada de vendas em pedidos válidos e pagos.`;

  // Card 2: Já Recebido / Total Pago
  const card2Tooltip =
    summary.totalPaid === 0
      ? 'Nenhum repasse financeiro foi realizado até o momento.'
      : `Total de repasses e transferências efetuados pela Kapsu.`;

  // Card 3: Situação do Repasse
  const hasCredit = summary.unallocatedCredit > 0;
  const hasDue = summary.dueAmount > 0;
  const card3Value = hasCredit
    ? `+ ${moneyFormatter(summary.unallocatedCredit)}`
    : moneyFormatter(summary.dueAmount);
  const card3Tooltip = hasCredit
    ? `Saldo positivo a favor do fornecedor. Valor já recebido a ser abatido nos próximos repasses.`
    : hasDue
    ? `Valor de ciclos encerrados pendente de pagamento ao fornecedor.`
    : 'Nenhum valor pendente de pagamento. Todas as contas estão em dia.';

  // Card 4: Próximo Ciclo
  const card4Tooltip =
    summary.currentOrderCount === 0
      ? 'Nenhum pedido acumulado no ciclo atual em aberto.'
      : `Acumulado de ${summary.currentOrderCount} pedido(s) no ciclo em aberto.${
          nextDueDate ? ` Fechamento previsto em ${nextDueDate}.` : ''
        }`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Vendas válidas */}
      <div className="group relative flex flex-col justify-between h-[115px] rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span>Vendas Válidas</span>
          </div>
          <Info className="h-3.5 w-3.5 text-gray-400 opacity-60 transition-opacity group-hover:opacity-100 dark:text-gray-500" />
        </div>
        <div className="mt-auto">
          <div className="text-2xl font-bold font-mono tracking-tight text-gray-900 dark:text-white">
            {moneyFormatter(summary.totalSalesAmount)}
          </div>
        </div>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl bg-gray-900 p-3 text-center text-xs font-medium text-white shadow-xl opacity-0 transition-all duration-200 group-hover:opacity-100 dark:bg-gray-800 border border-gray-700/60 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900 dark:after:border-t-gray-800">
          {card1Tooltip}
        </div>
      </div>

      {/* Card 2: Total Pago / Já recebido */}
      <div className="group relative flex flex-col justify-between h-[115px] rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <WalletCards className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Já Recebido</span>
          </div>
          <Info className="h-3.5 w-3.5 text-emerald-600 opacity-60 transition-opacity group-hover:opacity-100 dark:text-emerald-400" />
        </div>
        <div className="mt-auto">
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-300">
            {moneyFormatter(summary.totalPaid)}
          </div>
        </div>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl bg-gray-900 p-3 text-center text-xs font-medium text-white shadow-xl opacity-0 transition-all duration-200 group-hover:opacity-100 dark:bg-gray-800 border border-gray-700/60 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900 dark:after:border-t-gray-800">
          {card2Tooltip}
        </div>
      </div>

      {/* Card 3: Situação do repasse */}
      <div
        className={`group relative flex flex-col justify-between h-[115px] rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
          hasCredit
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
            : hasDue
            ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20'
            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
              hasCredit
                ? 'text-emerald-700 dark:text-emerald-300'
                : hasDue
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Situação do Repasse</span>
          </div>
          <Info
            className={`h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100 ${
              hasCredit
                ? 'text-emerald-600 dark:text-emerald-400'
                : hasDue
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          />
        </div>
        <div className="mt-auto">
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              hasCredit
                ? 'text-emerald-700 dark:text-emerald-300'
                : hasDue
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {card3Value}
          </div>
        </div>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl bg-gray-900 p-3 text-center text-xs font-medium text-white shadow-xl opacity-0 transition-all duration-200 group-hover:opacity-100 dark:bg-gray-800 border border-gray-700/60 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900 dark:after:border-t-gray-800">
          {card3Tooltip}
        </div>
      </div>

      {/* Card 4: Próximo ciclo */}
      <div className="group relative flex flex-col justify-between h-[115px] rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-blue-900/60 dark:bg-blue-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Próximo Ciclo</span>
          </div>
          <div className="flex items-center gap-1.5">
            {nextDueDate && (
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 tabular-nums dark:bg-blue-900/80 dark:text-blue-200">
                {nextDueDate}
              </span>
            )}
            <Info className="h-3.5 w-3.5 text-blue-600 opacity-60 transition-opacity group-hover:opacity-100 dark:text-blue-400" />
          </div>
        </div>
        <div className="mt-auto">
          <div className="text-2xl font-bold font-mono tracking-tight text-blue-700 dark:text-blue-300">
            {moneyFormatter(summary.currentAccruedAmount)}
          </div>
        </div>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl bg-gray-900 p-3 text-center text-xs font-medium text-white shadow-xl opacity-0 transition-all duration-200 group-hover:opacity-100 dark:bg-gray-800 border border-gray-700/60 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900 dark:after:border-t-gray-800">
          {card4Tooltip}
        </div>
      </div>
    </div>
  );
}
