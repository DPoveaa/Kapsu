import { Package, DollarSign, TrendingUp, XCircle, CheckCircle, AlertCircle, Truck, Calendar } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface OrdersStatsTabProps {
  ordersStats: any
  ordersLoading: boolean
}

export default function OrdersStatsTab({ ordersStats, ordersLoading }: OrdersStatsTabProps) {
  if (ordersLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de pedidos...</p>
      </div>
    )
  }

  if (!ordersStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado de pedidos disponível
      </div>
    )
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {ordersStats.overview.totalOrders.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                R$ {ordersStats.overview.totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                R$ {ordersStats.overview.avgValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {ordersStats.overview.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Object.entries(ordersStats.byStatus).map(([status, data]: [string, any]) => {
          const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
            PENDING: { label: 'Aguardando Pagamento', icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
            CONFIRMED: { label: 'Pago', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
            PROCESSING: { label: 'Processando', icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-100' },
            SHIPPED: { label: 'Enviado', icon: Truck, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
            DELIVERED: { label: 'Entregue', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
            CANCELLED: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
          }
          const config = statusConfig[status] || { label: status, icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100' }
          const Icon = config.icon

          return (
            <div key={status} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.count}</p>
              <p className="text-xs text-gray-500 mt-1">
                R$ {data.totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Gráfico de Pedidos por Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribuição de Pedidos por Status
        </h2>
        {Object.keys(ordersStats.byStatus).length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={Object.entries(ordersStats.byStatus).map(([status, data]: [string, any]) => ({
                  name: status === 'PENDING' ? 'Aguardando Pagamento' :
                        status === 'CONFIRMED' ? 'Pago' :
                        status === 'PROCESSING' ? 'Processando' :
                        status === 'SHIPPED' ? 'Enviado' :
                        status === 'DELIVERED' ? 'Entregue' :
                        status === 'CANCELLED' ? 'Cancelado' : status,
                  value: data.count,
                  totalValue: data.totalValue,
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.value}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.keys(ordersStats.byStatus).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} pedidos (R$ ${props.payload.totalValue.toFixed(2).replace('.', ',')})`,
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

      {/* Gráfico de Evolução de Pedidos */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Pedidos no Período
        </h2>
        {ordersStats.period.byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={ordersStats.period.byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                formatter={(value: number) => [value, 'Pedidos']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Quantidade de Pedidos"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalValue" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Valor Total (R$)"
                yAxisId="right"
                dot={{ r: 4 }}
              />
              <YAxis yAxisId="right" orientation="right" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>

      {/* Gráfico de Valores por Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Valores por Status
        </h2>
        {ordersStats.valueByStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ordersStats.valueByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="status" 
                tickFormatter={(value) => {
                  const statusMap: Record<string, string> = {
                    PENDING: 'Aguardando Pagamento',
                    CONFIRMED: 'Pago',
                    PROCESSING: 'Processando',
                    SHIPPED: 'Enviado',
                    DELIVERED: 'Entregue',
                    CANCELLED: 'Cancelado',
                  }
                  return statusMap[value] || value
                }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`}
              />
              <Legend />
              <Bar dataKey="totalValue" fill="#3b82f6" name="Valor Total (R$)" />
              <Bar dataKey="avgValue" fill="#10b981" name="Valor Médio (R$)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Métodos de Pagamento */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Métodos de Pagamento Mais Usados
        </h2>
        {ordersStats.paymentMethods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersStats.paymentMethods.map((method: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {method.method || 'Não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {method.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {method.totalValue.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {(method.totalValue / method.count).toFixed(2).replace('.', ',')}
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

      {/* Top Clientes */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Top 10 Clientes (por Valor Total)
        </h2>
        {ordersStats.topCustomers.length > 0 ? (
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
                    Pedidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersStats.topCustomers.map((customer: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      R$ {customer.totalSpent.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {(customer.totalSpent / customer.orderCount).toFixed(2).replace('.', ',')}
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

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Cancelamento</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {ordersStats.overview.cancellationRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pedidos Recentes (7 dias)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {ordersStats.overview.recentOrders}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aguardando Pagamento (Antigos)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {ordersStats.overview.oldPendingOrders}
              </p>
              <p className="text-xs text-gray-500 mt-1">Mais de 1 dia</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Pedidos por Mês */}
      {ordersStats.byMonth.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Evolução Mensal (Últimos 12 Meses)
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ordersStats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(value) => {
                  const [year, month] = value.split('-')
                  return `${month}/${year}`
                }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [value, 'Pedidos']}
              />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Quantidade de Pedidos" />
              <Bar dataKey="totalValue" fill="#10b981" name="Valor Total (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}


