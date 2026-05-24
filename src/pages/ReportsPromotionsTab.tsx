import { Gift, DollarSign, TrendingDown, CheckCircle, XCircle, Truck } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface PromotionsStatsTabProps {
  promotionsStats: any
  promotionsLoading: boolean
}

export default function PromotionsStatsTab({ promotionsStats, promotionsLoading }: PromotionsStatsTabProps) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportsPromotionsTab.tsx:12',message:'PromotionsStatsTab render',data:{hasPromotionsStats:!!promotionsStats,promotionsLoading,statsType:typeof promotionsStats,statsKeys:promotionsStats?Object.keys(promotionsStats):'no stats',hasOverview:promotionsStats?.overview!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (promotionsLoading) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando estatísticas de promoções...</p>
      </div>
    )
  }

  if (!promotionsStats) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportsPromotionsTab.tsx:22',message:'promotionsStats is null/undefined',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Nenhum dado de promoções disponível
      </div>
    )
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportsPromotionsTab.tsx:29',message:'before accessing overview',data:{hasOverview:promotionsStats?.overview!==undefined,overviewType:typeof promotionsStats?.overview,statsKeys:Object.keys(promotionsStats)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'discount_percentage': 'Desconto Percentual',
      'discount_fixed': 'Desconto Fixo',
      'free_shipping': 'Frete Grátis',
      'kit': 'Kit/Pacote',
    }
    return typeMap[type] || type
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string; darkColor: string; darkBgColor: string }> = {
      PENDING: { label: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-100', darkColor: 'dark:text-yellow-400', darkBgColor: 'dark:bg-yellow-900/30' },
      CONFIRMED: { label: 'Confirmado', color: 'text-blue-600', bgColor: 'bg-blue-100', darkColor: 'dark:text-blue-400', darkBgColor: 'dark:bg-blue-900/30' },
      PROCESSING: { label: 'Processando', color: 'text-purple-600', bgColor: 'bg-purple-100', darkColor: 'dark:text-purple-400', darkBgColor: 'dark:bg-purple-900/30' },
      SHIPPED: { label: 'Enviado', color: 'text-indigo-600', bgColor: 'bg-indigo-100', darkColor: 'dark:text-indigo-400', darkBgColor: 'dark:bg-indigo-900/30' },
      DELIVERED: { label: 'Entregue', color: 'text-green-600', bgColor: 'bg-green-100', darkColor: 'dark:text-green-400', darkBgColor: 'dark:bg-green-900/30' },
      CANCELLED: { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-100', darkColor: 'dark:text-red-400', darkBgColor: 'dark:bg-red-900/30' },
    }
    const config = statusMap[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-100', darkColor: 'dark:text-gray-400', darkBgColor: 'dark:bg-gray-900/30' }
    return (
      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${config.bgColor} ${config.color} ${config.darkBgColor} ${config.darkColor}`}>
        {config.label}
      </span>
    )
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Usos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {(() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportsPromotionsTab.tsx:80',message:'accessing overview.totalUsages',data:{hasOverview:promotionsStats?.overview!==undefined,hasTotalUsages:promotionsStats?.overview?.totalUsages!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
                  // #endregion
                  return promotionsStats?.overview?.totalUsages?.toLocaleString('pt-BR') || '0';
                })()}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {promotionsStats?.overview?.usagesInPeriod || 0} no período
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Descontado</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(promotionsStats?.overview?.totalDiscountInPeriod || 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                No período selecionado
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Frete Economizado</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(promotionsStats?.overview?.totalShippingSavedInPeriod || 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {promotionsStats?.overview?.freeShippingCount || 0} fretes grátis
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Economizado</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(promotionsStats?.overview?.totalValueSaved || 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Desconto + Frete
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Uso de Promoções
        </h2>
        {promotionsStats?.evolutionByDay?.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <LineChart data={promotionsStats?.evolutionByDay || []} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value: number, name: string) => {
                    if (name === 'totalDiscount') {
                      return [formatCurrency(value), 'Desconto Total']
                    }
                    if (name === 'totalShippingSaved') {
                      return [formatCurrency(value), 'Frete Economizado']
                    }
                    if (name === 'totalValueSaved') {
                      return [formatCurrency(value), 'Total Economizado']
                    }
                    return [value, 'Quantidade de Usos']
                  }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quantidade de Usos"
                  yAxisId="left"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalDiscount" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Desconto Total (R$)"
                  yAxisId="right"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalShippingSaved" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Frete Economizado (R$)"
                  yAxisId="right"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>

      {/* Promoções Mais Usadas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Promoções Mais Usadas no Período
        </h2>
        {promotionsStats?.usagesByPromotion?.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Promoção
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Usos
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Original Total
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Descontado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Frete Economizado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Economizado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Final
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(promotionsStats?.usagesByPromotion || []).map((promo: any, index: number) => (
                    <tr key={index} className={index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{promo.name}</p>
                          {promo.freeShipping && (
                            <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">✓ Frete Grátis</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                          promo.type === 'discount_percentage' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                            : promo.type === 'discount_fixed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : promo.type === 'free_shipping'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                        }`}>
                          {getTypeLabel(promo.type)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {promo.usageCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(promo.totalOriginalValue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(promo.totalDiscount)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(promo.totalShippingSaved)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(promo.totalValueSaved)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(promo.totalFinalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {(promotionsStats?.usagesByPromotion || []).map((promo: any, index: number) => (
                <div key={index} className={`rounded-lg p-3 border ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Promoção</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{promo.name}</p>
                    {promo.freeShipping && (
                      <span className="text-[10px] text-green-600 dark:text-green-400">✓ Frete Grátis</span>
                    )}
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</p>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      promo.type === 'discount_percentage' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                        : promo.type === 'discount_fixed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : promo.type === 'free_shipping'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                    }`}>
                      {getTypeLabel(promo.type)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Usos</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{promo.usageCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Original</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(promo.totalOriginalValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Descontado</p>
                      <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(promo.totalDiscount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Frete Economizado</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(promo.totalShippingSaved)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Total Economizado</p>
                      <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(promo.totalValueSaved)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Final</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(promo.totalFinalValue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(promotionsStats?.usagesByPromotion?.length || 0) > 3 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 break-words">
                💡 As 3 promoções mais usadas estão destacadas em amarelo
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhuma promoção foi usada no período
          </div>
        )}
      </div>

      {/* Usos Detalhados */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 lg:mb-4">
          Histórico Detalhado de Usos
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 break-words">
          Lista completa de todos os usos de promoções, mostrando qual promoção foi usada, quando, para qual pedido, valor original, desconto aplicado, frete economizado e valor final.
        </p>
        {promotionsStats?.detailedUsages && promotionsStats.detailedUsages.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Promoção
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Original
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Desconto
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Frete Economizado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Economizado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Final
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(promotionsStats?.detailedUsages || []).map((usage: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(usage.usedAt)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{usage.promotionName}</p>
                          {usage.freeShipping && (
                            <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">✓ Frete Grátis</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                          usage.promotionType === 'discount_percentage' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                            : usage.promotionType === 'discount_fixed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : usage.promotionType === 'free_shipping'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                        }`}>
                          {getTypeLabel(usage.promotionType)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-words">{usage.userName || 'Não informado'}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-all">{usage.userEmail || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {usage.orderId ? (
                          <Link 
                            to={`/admin/orders/${usage.orderId}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline break-all"
                          >
                            {usage.orderId.substring(0, 8)}...
                          </Link>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Sem pedido</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(usage.originalValue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                        {usage.discountApplied > 0 ? `-${formatCurrency(usage.discountApplied)}` : '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {usage.shippingSaved > 0 ? formatCurrency(usage.shippingSaved) : '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(usage.totalValueSaved)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(usage.finalValue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm">
                        {usage.orderStatus ? getStatusBadge(usage.orderStatus) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {(promotionsStats?.detailedUsages || []).map((usage: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data/Hora</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatDate(usage.usedAt)}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Promoção</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{usage.promotionName}</p>
                    {usage.freeShipping && (
                      <span className="text-[10px] text-green-600 dark:text-green-400">✓ Frete Grátis</span>
                    )}
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</p>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      usage.promotionType === 'discount_percentage' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                        : usage.promotionType === 'discount_fixed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : usage.promotionType === 'free_shipping'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                    }`}>
                      {getTypeLabel(usage.promotionType)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cliente</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-words">{usage.userName || 'Não informado'}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-all">{usage.userEmail || ''}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pedido</p>
                    {usage.orderId ? (
                      <Link 
                        to={`/admin/orders/${usage.orderId}`}
                        className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline break-all"
                      >
                        {usage.orderId.substring(0, 8)}...
                      </Link>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Sem pedido</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Original</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(usage.originalValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Desconto</p>
                      <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">{usage.discountApplied > 0 ? `-${formatCurrency(usage.discountApplied)}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Frete Economizado</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{usage.shippingSaved > 0 ? formatCurrency(usage.shippingSaved) : '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Total Economizado</p>
                      <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(usage.totalValueSaved)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Final</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(usage.finalValue)}</p>
                    </div>
                  </div>
                  {usage.orderStatus && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
                      {getStatusBadge(usage.orderStatus)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum uso registrado no período
          </div>
        )}
      </div>

      {/* Top Clientes que Mais Usaram Promoções */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Clientes que Mais Usaram Promoções
        </h2>
        {promotionsStats?.usagesByUser?.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Usos
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Descontado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Frete Economizado
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Economizado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(promotionsStats?.usagesByUser || []).map((user: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                        {user.userName}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300 break-all">
                        {user.userEmail}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {user.usageCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(user.totalDiscount)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(user.totalShippingSaved)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(user.totalValueSaved)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {(promotionsStats?.usagesByUser || []).map((user: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cliente</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{user.userName}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-all">{user.userEmail}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Usos</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{user.usageCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Total Descontado</p>
                      <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(user.totalDiscount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Frete Economizado</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(user.totalShippingSaved)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Total Economizado</p>
                    <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(user.totalValueSaved)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Estatísticas por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Distribuição por Tipo de Promoção
          </h2>
          {promotionsStats?.statsByType?.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <PieChart>
                  <Pie
                    data={(promotionsStats?.statsByType || []).map((stat: any) => ({
                      name: getTypeLabel(stat.type),
                      value: stat.count,
                      totalValueSaved: stat.totalValueSaved,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(promotionsStats?.statsByType || []).map((_item: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} usos (${formatCurrency(props.payload.totalValueSaved)})`,
                      props.payload.name
                    ]}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Nenhum dado disponível
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Top 10 Promoções (Todos os Tempos)
          </h2>
          {promotionsStats?.topPromotions?.length > 0 ? (
            <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
              {(promotionsStats?.topPromotions || []).map((promo: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{promo.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{getTypeLabel(promo.type)}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{promo.usageCount} usos</p>
                    {promo.discountValue && (
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {promo.type === 'discount_percentage' 
                          ? `${promo.discountValue}%` 
                          : formatCurrency(promo.discountValue)}
                      </p>
                    )}
                    {promo.freeShipping && (
                      <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">Frete Grátis</p>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {promo.active ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 dark:text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Nenhuma promoção cadastrada
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Resumo Financeiro do Período
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Valor Total Original</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
              {formatCurrency(
                (promotionsStats?.usagesByPromotion || []).reduce((sum: number, promo: any) => 
                  sum + promo.totalOriginalValue, 0
                )
              )}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor que seria arrecadado sem promoções</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Descontado</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1 break-words">
              -{formatCurrency(promotionsStats?.overview?.totalDiscountInPeriod || 0)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor "perdido" em descontos</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Frete Economizado</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1 break-words">
              {formatCurrency(promotionsStats?.overview?.totalShippingSavedInPeriod || 0)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor economizado em frete grátis</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-800 sm:col-span-2 lg:col-span-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Valor Final Arrecadado</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 break-words">
              {formatCurrency(
                (promotionsStats?.usagesByPromotion || []).reduce((sum: number, promo: any) => 
                  sum + promo.totalOriginalValue, 0
                ) - (promotionsStats?.overview?.totalDiscountInPeriod || 0)
              )}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor efetivamente arrecadado</p>
          </div>
        </div>
      </div>
    </>
  )
}

