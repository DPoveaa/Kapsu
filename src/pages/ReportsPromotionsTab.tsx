import { Gift, DollarSign, TrendingDown, Users, Calendar, Package, CheckCircle, XCircle, AlertCircle, ShoppingCart, Truck } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
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
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de promoções...</p>
      </div>
    )
  }

  if (!promotionsStats) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportsPromotionsTab.tsx:22',message:'promotionsStats is null/undefined',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <div className="text-center py-12 text-gray-500">
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
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      PENDING: { label: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      CONFIRMED: { label: 'Confirmado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      PROCESSING: { label: 'Processando', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      SHIPPED: { label: 'Enviado', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
      DELIVERED: { label: 'Entregue', color: 'text-green-600', bgColor: 'bg-green-100' },
      CANCELLED: { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-100' },
    }
    const config = statusMap[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-100' }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Usos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReportsPromotionsTab.tsx:80',message:'accessing overview.totalUsages',data:{hasOverview:promotionsStats?.overview!==undefined,hasTotalUsages:promotionsStats?.overview?.totalUsages!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
                  // #endregion
                  return promotionsStats?.overview?.totalUsages?.toLocaleString('pt-BR') || '0';
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {promotionsStats?.overview?.usagesInPeriod || 0} no período
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Gift className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Descontado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(promotionsStats?.overview?.totalDiscountInPeriod || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                No período selecionado
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Frete Economizado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(promotionsStats?.overview?.totalShippingSavedInPeriod || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {promotionsStats?.overview?.freeShippingCount || 0} fretes grátis
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Economizado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(promotionsStats?.overview?.totalValueSaved || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Desconto + Frete
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Uso de Promoções
        </h2>
        {promotionsStats?.evolutionByDay?.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={promotionsStats?.evolutionByDay || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
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
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Quantidade de Usos"
                yAxisId="left"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalDiscount" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Desconto Total (R$)"
                yAxisId="right"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalShippingSaved" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Frete Economizado (R$)"
                yAxisId="right"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>

      {/* Promoções Mais Usadas */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Promoções Mais Usadas no Período
        </h2>
        {promotionsStats?.usagesByPromotion?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promoção
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Original Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Descontado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frete Economizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Economizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Final
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(promotionsStats?.usagesByPromotion || []).map((promo: any, index: number) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{promo.name}</p>
                        {promo.freeShipping && (
                          <span className="text-xs text-green-600">✓ Frete Grátis</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        promo.type === 'discount_percentage' 
                          ? 'bg-blue-100 text-blue-800' 
                          : promo.type === 'discount_fixed'
                          ? 'bg-green-100 text-green-800'
                          : promo.type === 'free_shipping'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getTypeLabel(promo.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promo.usageCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(promo.totalOriginalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      -{formatCurrency(promo.totalDiscount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(promo.totalShippingSaved)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {formatCurrency(promo.totalValueSaved)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(promo.totalFinalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(promotionsStats?.usagesByPromotion?.length || 0) > 3 && (
              <p className="mt-4 text-sm text-yellow-600">
                💡 As 3 promoções mais usadas estão destacadas em amarelo
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhuma promoção foi usada no período
          </div>
        )}
      </div>

      {/* Usos Detalhados */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Histórico Detalhado de Usos
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Lista completa de todos os usos de promoções, mostrando qual promoção foi usada, quando, para qual pedido, valor original, desconto aplicado, frete economizado e valor final.
        </p>
        {promotionsStats?.detailedUsages && promotionsStats.detailedUsages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promoção
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Original
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desconto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frete Economizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Economizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(promotionsStats?.detailedUsages || []).map((usage: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(usage.usedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{usage.promotionName}</p>
                        {usage.freeShipping && (
                          <span className="text-xs text-green-600">✓ Frete Grátis</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        usage.promotionType === 'discount_percentage' 
                          ? 'bg-blue-100 text-blue-800' 
                          : usage.promotionType === 'discount_fixed'
                          ? 'bg-green-100 text-green-800'
                          : usage.promotionType === 'free_shipping'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getTypeLabel(usage.promotionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-gray-900">{usage.userName || 'Não informado'}</p>
                        <p className="text-xs text-gray-500">{usage.userEmail || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.orderId ? (
                        <Link 
                          to={`/admin/orders/${usage.orderId}`}
                          className="text-indigo-600 hover:text-indigo-900 underline"
                        >
                          {usage.orderId.substring(0, 8)}...
                        </Link>
                      ) : (
                        <span className="text-gray-400">Sem pedido</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(usage.originalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {usage.discountApplied > 0 ? `-${formatCurrency(usage.discountApplied)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {usage.shippingSaved > 0 ? formatCurrency(usage.shippingSaved) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {formatCurrency(usage.totalValueSaved)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(usage.finalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {usage.orderStatus ? getStatusBadge(usage.orderStatus) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum uso registrado no período
          </div>
        )}
      </div>

      {/* Top Clientes que Mais Usaram Promoções */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Clientes que Mais Usaram Promoções
        </h2>
        {promotionsStats?.usagesByUser?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Descontado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frete Economizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Economizado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(promotionsStats?.usagesByUser || []).map((user: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.usageCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      -{formatCurrency(user.totalDiscount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(user.totalShippingSaved)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {formatCurrency(user.totalValueSaved)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Estatísticas por Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição por Tipo de Promoção
          </h2>
          {promotionsStats?.statsByType?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
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
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(promotionsStats?.statsByType || []).map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value} usos (${formatCurrency(props.payload.totalValueSaved)})`,
                    props.payload.name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Top 10 Promoções (Todos os Tempos)
          </h2>
          {promotionsStats?.topPromotions?.length > 0 ? (
            <div className="space-y-3">
              {(promotionsStats?.topPromotions || []).map((promo: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{promo.name}</p>
                    <p className="text-xs text-gray-500">{getTypeLabel(promo.type)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{promo.usageCount} usos</p>
                    {promo.discountValue && (
                      <p className="text-xs text-gray-500">
                        {promo.type === 'discount_percentage' 
                          ? `${promo.discountValue}%` 
                          : formatCurrency(promo.discountValue)}
                      </p>
                    )}
                    {promo.freeShipping && (
                      <p className="text-xs text-green-600">Frete Grátis</p>
                    )}
                  </div>
                  <div className="ml-4">
                    {promo.active ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhuma promoção cadastrada
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Resumo Financeiro do Período
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Valor Total Original</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(
                (promotionsStats?.usagesByPromotion || []).reduce((sum: number, promo: any) => 
                  sum + promo.totalOriginalValue, 0
                )
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor que seria arrecadado sem promoções</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Total Descontado</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              -{formatCurrency(promotionsStats?.overview?.totalDiscountInPeriod || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor "perdido" em descontos</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Frete Economizado</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(promotionsStats?.overview?.totalShippingSavedInPeriod || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor economizado em frete grátis</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Valor Final Arrecadado</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {formatCurrency(
                (promotionsStats?.usagesByPromotion || []).reduce((sum: number, promo: any) => 
                  sum + promo.totalOriginalValue, 0
                ) - (promotionsStats?.overview?.totalDiscountInPeriod || 0)
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor efetivamente arrecadado</p>
          </div>
        </div>
      </div>
    </>
  )
}

