import { Tag, DollarSign, TrendingDown, Users, Calendar, Package, CheckCircle, XCircle, AlertCircle, ShoppingCart } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface PromoCodesStatsTabProps {
  promoCodesStats: any
  promoCodesLoading: boolean
}

export default function PromoCodesStatsTab({ promoCodesStats, promoCodesLoading }: PromoCodesStatsTabProps) {
  if (promoCodesLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de cupons...</p>
      </div>
    )
  }

  if (!promoCodesStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado de cupons disponível
      </div>
    )
  }

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
                {promoCodesStats.overview.totalUsages.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {promoCodesStats.overview.usagesInPeriod} no período
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Tag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Descontado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(promoCodesStats.overview.totalDiscountInPeriod)}
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
              <p className="text-sm font-medium text-gray-600">Desconto Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(promoCodesStats.overview.avgDiscountPerUsage)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Por uso de cupom
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Histórico</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(promoCodesStats.overview.totalDiscountApplied)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Todos os tempos
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Uso de Cupons
        </h2>
        {promoCodesStats.evolutionByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={promoCodesStats.evolutionByDay}>
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
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>

      {/* Cupons Mais Usados */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Cupons Mais Usados no Período
        </h2>
        {promoCodesStats.usagesByCode.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
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
                    Valor Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desconto Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoCodesStats.usagesByCode.map((code: any, index: number) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {code.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        code.discountType === 'percentage' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {code.discountType === 'percentage' ? 'Percentual' : 'Fixo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.usageCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(code.totalOriginalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      -{formatCurrency(code.totalDiscount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(code.totalFinalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(code.avgDiscount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {promoCodesStats.usagesByCode.length > 3 && (
              <p className="mt-4 text-sm text-yellow-600">
                💡 Os 3 cupons mais usados estão destacados em amarelo
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum cupom foi usado no período
          </div>
        )}
      </div>

      {/* Usos Detalhados */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Histórico Detalhado de Usos
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Lista completa de todos os usos de cupons, mostrando qual cupom foi usado, quando, para qual pedido, valor original, desconto aplicado e valor final.
        </p>
        {promoCodesStats.detailedUsages && promoCodesStats.detailedUsages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cupom
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
                    Valor Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoCodesStats.detailedUsages.map((usage: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(usage.usedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{usage.promoCode}</p>
                        <p className="text-xs text-gray-500">{usage.promoName}</p>
                      </div>
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
                      -{formatCurrency(usage.lostValue)}
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

      {/* Top Clientes que Mais Usaram Cupons */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Clientes que Mais Usaram Cupons
        </h2>
        {promoCodesStats.usagesByUser.length > 0 ? (
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
                    Desconto Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoCodesStats.usagesByUser.map((user: any, index: number) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(user.totalDiscount / user.usageCount)}
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

      {/* Estatísticas por Tipo de Desconto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição por Tipo de Desconto
          </h2>
          {promoCodesStats.statsByDiscountType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={promoCodesStats.statsByDiscountType.map((stat: any) => ({
                    name: stat.discountType === 'percentage' ? 'Percentual' : 'Fixo',
                    value: stat.count,
                    totalDiscount: stat.totalDiscount,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {promoCodesStats.statsByDiscountType.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value} usos (${formatCurrency(props.payload.totalDiscount)})`,
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
            Top 10 Cupons (Todos os Tempos)
          </h2>
          {promoCodesStats.topPromoCodes.length > 0 ? (
            <div className="space-y-3">
              {promoCodesStats.topPromoCodes.map((code: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{code.code}</p>
                    <p className="text-xs text-gray-500">{code.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{code.usageCount} usos</p>
                    <p className="text-xs text-gray-500">
                      {code.discountType === 'percentage' 
                        ? `${code.discountValue}%` 
                        : formatCurrency(code.discountValue)}
                    </p>
                  </div>
                  <div className="ml-4">
                    {code.active ? (
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
              Nenhum cupom cadastrado
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Resumo Financeiro do Período
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Valor Total Original</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(
                promoCodesStats.usagesByCode.reduce((sum: number, code: any) => 
                  sum + code.totalOriginalValue, 0
                )
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor que seria arrecadado sem cupons</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Total Descontado</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              -{formatCurrency(promoCodesStats.overview.totalDiscountInPeriod)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor "perdido" em descontos</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Valor Final Arrecadado</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(
                promoCodesStats.usagesByCode.reduce((sum: number, code: any) => 
                  sum + code.totalOriginalValue, 0
                ) - promoCodesStats.overview.totalDiscountInPeriod
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Valor efetivamente arrecadado</p>
          </div>
        </div>
      </div>
    </>
  )
}


