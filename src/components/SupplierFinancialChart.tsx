import { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { supplierService, SupplierFinancialMetrics } from '../services/supplier.service';
import { toast } from '../utils/toast';

type FilterType = '7d' | '30d' | '365d';

interface ProcessedChartPoint {
  label: string;
  tooltipTitle: string;
  revenue: number;
  orders: number;
}

const formatDateLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
};

const formatDateFull = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} de ${months[monthIdx] || parts[1]} de ${year}`;
};

function processChartPoints(
  rawChart: { date: string; revenue: number; orders: number }[],
  filterType: FilterType
): ProcessedChartPoint[] {
  if (!rawChart || rawChart.length === 0) return [];

  if (filterType === '7d') {
    // 7 Dias: cada dia é uma coluna no gráfico
    return rawChart.map((d) => ({
      label: formatDateLabel(d.date),
      tooltipTitle: formatDateFull(d.date),
      revenue: d.revenue,
      orders: d.orders,
    }));
  }

  if (filterType === '30d') {
    // Mês (30 Dias): calcular 4 semanas com intervalos de datas exatos
    const endDateObj = rawChart.length > 0 ? new Date(`${rawChart[rawChart.length - 1].date.slice(0, 10)}T12:00:00`) : new Date();
    const startDateObj = new Date(endDateObj);
    startDateObj.setDate(startDateObj.getDate() - 29);

    const rawMap: Record<string, { revenue: number; orders: number }> = {};
    rawChart.forEach((d) => {
      rawMap[d.date.slice(0, 10)] = { revenue: d.revenue, orders: d.orders };
    });

    const weeks: ProcessedChartPoint[] = [];

    const formatShort = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    };

    for (let w = 0; w < 4; w++) {
      const wStart = new Date(startDateObj);
      wStart.setDate(startDateObj.getDate() + w * 7);

      const wEnd = new Date(startDateObj);
      if (w === 3) {
        wEnd.setTime(endDateObj.getTime());
      } else {
        wEnd.setDate(startDateObj.getDate() + (w * 7 + 6));
      }

      let revSum = 0;
      let ordSum = 0;

      const curr = new Date(wStart);
      while (curr <= wEnd) {
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        const isoKey = `${year}-${month}-${day}`;

        if (rawMap[isoKey]) {
          revSum += rawMap[isoKey].revenue;
          ordSum += rawMap[isoKey].orders;
        }
        curr.setDate(curr.getDate() + 1);
      }

      const startStr = formatShort(wStart);
      const endStr = formatShort(wEnd);

      weeks.push({
        label: `${startStr} a ${endStr}`,
        tooltipTitle: `Semana de ${startStr} a ${endStr}`,
        revenue: revSum,
        orders: ordSum,
      });
    }
    return weeks;
  }

  if (filterType === '365d') {
    // Ano (365 Dias): agrupar por mês (YYYY-MM)
    const monthMap: Record<string, { revenue: number; orders: number; monthKey: string }> = {};

    rawChart.forEach((d) => {
      const monthKey = d.date.slice(0, 7); // 'YYYY-MM'
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { revenue: 0, orders: 0, monthKey };
      }
      monthMap[monthKey].revenue += d.revenue;
      monthMap[monthKey].orders += d.orders;
    });

    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthsFull = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return Object.values(monthMap).map((m) => {
      const parts = m.monthKey.split('-');
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      return {
        label: monthsShort[monthIdx] || parts[1],
        tooltipTitle: `${monthsFull[monthIdx] || parts[1]} de ${year}`,
        revenue: m.revenue,
        orders: m.orders,
      };
    });
  }

  return [];
}

export default function SupplierFinancialChart() {
  const [filterType, setFilterType] = useState<FilterType>('30d');
  const [metrics, setMetrics] = useState<SupplierFinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [filterType]);

  const loadChartData = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const days = filterType === '7d' ? 7 : filterType === '30d' ? 30 : 365;
      const res = await supplierService.getDashboardMetrics(days);
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err: any) {
      if (!background) toast.error('Erro ao carregar gráfico financeiro: ' + err.message);
    } finally {
      if (!background) setLoading(false);
    }
  };

  const rawChart = metrics?.dailyChart || [];
  const processedPoints = processChartPoints(rawChart, filterType);

  const maxRevenue = Math.max(...processedPoints.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...processedPoints.map((d) => d.orders), 1);
  const totalRevenue = processedPoints.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = processedPoints.reduce((acc, curr) => acc + curr.orders, 0);
  const activeCount = processedPoints.filter((d) => d.revenue > 0 || d.orders > 0).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        {/* Top Left: Title & Quick Summary Stats */}
        <div className="space-y-1.5">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            <span>Balanço Geral de Vendas & Pedidos</span>
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 font-semibold dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
              Total Faturado: {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60">
              Pedidos Válidos: {totalOrders} pedido(s)
            </span>
            <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {activeCount} {filterType === '7d' ? 'dia(s)' : filterType === '30d' ? 'semana(s)' : 'mês(es)'} com movimento
            </span>
          </div>
        </div>

        {/* Top Right: Strategic Time Filters & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend indicator */}
          <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-teal-500" />
              <span>Faturamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-indigo-500" />
              <span>Pedidos</span>
            </div>
          </div>

          {/* Preset Time Filters */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setFilterType('7d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === '7d'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Semana (por Dia)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('30d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === '30d'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Mês (por Semana)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('365d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === '365d'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Ano (por Mês)
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {loading ? (
        <div className="flex h-52 items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          <span>Carregando gráfico de desempenho...</span>
        </div>
      ) : processedPoints.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <span>Nenhum dado registrado para o período selecionado.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Chart Grid with Side-by-Side Columns */}
          <div className="flex h-52 items-end justify-between gap-1.5 sm:gap-3 border-b border-gray-200 px-2 pb-2 pt-8 dark:border-gray-800">
            {processedPoints.map((d, i) => {
              const revenuePct = d.revenue > 0 ? Math.max(10, Math.round((d.revenue / maxRevenue) * 100)) : 4;
              const ordersPct = d.orders > 0 ? Math.max(10, Math.round((d.orders / maxOrders) * 100)) : 4;

              return (
                <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-1">
                  {/* Floating Hover Tooltip */}
                  <div className="pointer-events-none absolute -top-14 z-30 whitespace-nowrap rounded-xl bg-gray-900 px-3 py-1.5 text-[11px] font-mono text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100 dark:bg-gray-800 border border-gray-700/60 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900 dark:after:border-t-gray-800">
                    <div className="font-sans font-semibold text-gray-300">{d.tooltipTitle}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-teal-400 font-bold">
                        {d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-indigo-300 font-bold">
                        {d.orders} pedido(s)
                      </span>
                    </div>
                  </div>

                  {/* Column 1: Faturamento (Emerald/Teal Gradient) */}
                  <div
                    style={{ height: `${revenuePct}%` }}
                    className="w-full max-w-[16px] rounded-t-sm bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-300 group-hover:from-emerald-500 group-hover:to-teal-300 dark:from-emerald-700 dark:to-teal-500"
                  />

                  {/* Column 2: Pedidos (Primary/Indigo Gradient) */}
                  <div
                    style={{ height: `${ordersPct}%` }}
                    className="w-full max-w-[16px] rounded-t-sm bg-gradient-to-t from-primary-600 to-indigo-500 transition-all duration-300 group-hover:from-primary-500 group-hover:to-indigo-400 dark:from-primary-700 dark:to-indigo-600"
                  />
                </div>
              );
            })}
          </div>

          {/* Date / Time Axis Label */}
          <div className="flex items-center justify-between px-2 text-[11px] font-mono text-gray-500 dark:text-gray-400">
            {processedPoints.map((p, idx) => (
              <span key={idx} className="flex-1 text-center truncate px-0.5">
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
