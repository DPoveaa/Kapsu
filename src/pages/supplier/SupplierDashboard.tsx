import { useState, useEffect } from 'react';
import {
  DollarSign, Package, TrendingUp,
  Clock, ArrowUpRight, BarChart3
} from 'lucide-react';
import { supplierService, SupplierFinancialMetrics } from '../../services/supplier.service';
import { toast } from '../../utils/toast';

export default function SupplierDashboard() {
  const [metrics, setMetrics] = useState<SupplierFinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'revenue' | 'orders'>('revenue');

  useEffect(() => {
    loadDashboard();
  }, [periodDays]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getDashboardMetrics(periodDays);
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar métricas financeiras: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const chartData = metrics?.dailyChart || [];
  const maxVal = Math.max(...chartData.map(d => activeTab === 'revenue' ? d.revenue : d.orders), 1);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Painel Financeiro & Desempenho
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Métricas de repasse, faturamento de custo e produção de fórmulas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodDays}
            onChange={e => setPeriodDays(Number(e.target.value))}
            className="px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
          >
            <option value={7}>Últimos 7 Dias</option>
            <option value={15}>Últimos 15 Dias</option>
            <option value={30}>Últimos 30 Dias</option>
            <option value={90}>Últimos 90 Dias</option>
          </select>
        </div>
      </div>

      {/* Cards de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bruto em Custos */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Custo Total de Produção</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {metrics?.totalRevenue ? metrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Faturamento de custo das fórmulas</span>
            </div>
          </div>
        </div>

        {/* Repasses Efetuados */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Repasses Já Efetuados</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {metrics?.paidAmount ? metrics.paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
              Transferidos para sua conta
            </div>
          </div>
        </div>

        {/* Repasses Pendentes */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo a Receber</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {metrics?.pendingAmount ? metrics.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Pedidos entregues / em processamento
            </div>
          </div>
        </div>

        {/* Fórmulas Produzidas */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fórmulas Manipuladas</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {metrics?.totalItemsSold || 0}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
              Unidades produzidas no período
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Interativo de Desempenho Financeiro */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <span>Evolução do Faturamento & Volume de Pedidos</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Acompanhamento diário no período selecionado ({periodDays} dias)
            </p>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'revenue'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Faturamento (R$)
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Qtd. Pedidos
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
            Carregando dados do gráfico...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
            Nenhum dado registrado para o período.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visualização de Gráfico em Barras Responsivas e Interativas */}
            <div className="h-64 flex items-end justify-between gap-1.5 pt-6 pb-2 px-2 border-b border-gray-200 dark:border-gray-800">
              {chartData.map((d, i) => {
                const val = activeTab === 'revenue' ? d.revenue : d.orders;
                const pct = Math.max(8, Math.round((val / maxVal) * 100));

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                    {/* Tooltip Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition duration-200 absolute -top-12 bg-gray-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap shadow-xl z-20">
                      <div>{d.date}</div>
                      <div className="font-bold text-emerald-400">
                        {activeTab === 'revenue'
                          ? d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : `${d.orders} pedido(s)`}
                      </div>
                    </div>

                    {/* Barra de Gráfico com Efeito Gradient */}
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                        activeTab === 'revenue'
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 dark:from-emerald-700 dark:to-teal-500 group-hover:from-emerald-500 group-hover:to-teal-300'
                          : 'bg-gradient-to-t from-primary-600 to-indigo-500 dark:from-primary-700 dark:to-indigo-600 group-hover:from-primary-500 group-hover:to-indigo-400'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Eixo de Datas do Gráfico */}
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500 px-1">
              <span>{chartData[0]?.date}</span>
              <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
              <span>{chartData[chartData.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
