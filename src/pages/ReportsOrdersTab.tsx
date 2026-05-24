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
      <div className="text-center py-8 sm:py-10 lg:py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando estatísticas de pedidos...</p>
      </div>
    )
  }

  if (!ordersStats) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Nenhum dado de pedidos disponível
      </div>
    )
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Pedidos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {ordersStats.overview.totalOrders.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Valor Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                R$ {ordersStats.overview.totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Ticket Médio</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                R$ {ordersStats.overview.avgValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Taxa de Conversão</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {ordersStats.overview.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-5 lg:mb-6">
        {Object.entries(ordersStats.byStatus).map(([status, data]: [string, any]) => {
          const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; darkColor: string; darkBgColor: string }> = {
            AWAITING_PAYMENT: { label: 'Aguardando Pagamento', icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100', darkColor: 'dark:text-yellow-400', darkBgColor: 'dark:bg-yellow-900/30' },
            PENDING: { label: 'Aguardando Pagamento', icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100', darkColor: 'dark:text-yellow-400', darkBgColor: 'dark:bg-yellow-900/30' },
            PAID: { label: 'Pago', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', darkColor: 'dark:text-green-400', darkBgColor: 'dark:bg-green-900/30' },
            CONFIRMED: { label: 'Pago', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', darkColor: 'dark:text-green-400', darkBgColor: 'dark:bg-green-900/30' },
            DISTRIBUTOR_INFORMED: { label: 'Solicitado na Distribuidora', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100', darkColor: 'dark:text-blue-400', darkBgColor: 'dark:bg-blue-900/30' },
            PROCESSING: { label: 'Processando', icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-100', darkColor: 'dark:text-purple-400', darkBgColor: 'dark:bg-purple-900/30' },
            SHIPPED: { label: 'Enviado', icon: Truck, color: 'text-indigo-600', bgColor: 'bg-indigo-100', darkColor: 'dark:text-indigo-400', darkBgColor: 'dark:bg-indigo-900/30' },
            DELIVERED: { label: 'Entregue', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', darkColor: 'dark:text-green-400', darkBgColor: 'dark:bg-green-900/30' },
            CANCELLED: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', darkColor: 'dark:text-red-400', darkBgColor: 'dark:bg-red-900/30' },
          }
          const config = statusConfig[status] || { label: status, icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100', darkColor: 'dark:text-gray-400', darkBgColor: 'dark:bg-gray-900/30' }
          const Icon = config.icon

          return (
            <div key={status} className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <Icon className={`w-3 h-3 sm:w-4 sm:h-5 lg:w-5 lg:h-5 ${config.color} ${config.darkColor}`} />
                <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${config.bgColor} ${config.color} ${config.darkBgColor} ${config.darkColor} break-words`}>
                  {config.label}
                </span>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white break-words">{data.count}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 break-words">
                R$ {data.totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Gráfico de Pedidos por Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Distribuição de Pedidos por Status
        </h2>
        {Object.keys(ordersStats.byStatus).length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <PieChart>
                <Pie
                  data={Object.entries(ordersStats.byStatus).map(([status, data]: [string, any]) => ({
                    name: status === 'AWAITING_PAYMENT' || status === 'PENDING' ? 'Aguardando Pagamento' :
                          status === 'PAID' || status === 'CONFIRMED' ? 'Pago' :
                          status === 'DISTRIBUTOR_INFORMED' ? 'Solicitado na Distribuidora' :
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
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.keys(ordersStats.byStatus).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} pedidos (R$ ${props.payload.totalValue.toFixed(2).replace('.', ',')})`,
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

      {/* Gráfico de Evolução de Pedidos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Pedidos no Período
        </h2>
        {ordersStats.period.byDay.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <LineChart data={ordersStats.period.byDay} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value: any) => [value, 'Pedidos']}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quantidade de Pedidos"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalValue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Valor Total (R$)"
                  yAxisId="right"
                  dot={{ r: 3 }}
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>

      {/* Gráfico de Valores por Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Valores por Status
        </h2>
        {ordersStats.valueByStatus.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <BarChart data={ordersStats.valueByStatus} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="status" 
                  tickFormatter={(value) => {
                    const statusMap: Record<string, string> = {
                      AWAITING_PAYMENT: 'Aguardando Pagamento',
                      PENDING: 'Aguardando Pagamento',
                      PAID: 'Pago',
                      CONFIRMED: 'Pago',
                      DISTRIBUTOR_INFORMED: 'Solicitado na Distribuidora',
                      PROCESSING: 'Processando',
                      SHIPPED: 'Enviado',
                      DELIVERED: 'Entregue',
                      CANCELLED: 'Cancelado',
                    }
                    return statusMap[value] || value
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: any) => `R$ ${value.toFixed(2).replace('.', ',')}`}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="totalValue" fill="#3b82f6" name="Valor Total (R$)" />
                <Bar dataKey="avgValue" fill="#10b981" name="Valor Médio (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Métodos de Pagamento */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Métodos de Pagamento Mais Usados
        </h2>
        {ordersStats.paymentMethods.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {ordersStats.paymentMethods.map((method: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                        {method.method || 'Não informado'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {method.count}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        R$ {method.totalValue.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        R$ {(method.totalValue / method.count).toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {ordersStats.paymentMethods.map((method: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Método</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{method.method || 'Não informado'}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Quantidade</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{method.count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Total</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">R$ {method.totalValue.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Médio</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">R$ {(method.totalValue / method.count).toFixed(2).replace('.', ',')}</p>
                    </div>
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

      {/* Top Clientes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Top 10 Clientes (por Valor Total)
        </h2>
        {ordersStats.topCustomers.length > 0 ? (
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
                      Pedidos
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ticket Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {ordersStats.topCustomers.map((customer: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                        {customer.userName}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300 break-all">
                        {customer.userEmail}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {customer.orderCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        R$ {customer.totalSpent.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        R$ {(customer.totalSpent / customer.orderCount).toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {ordersStats.topCustomers.map((customer: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cliente</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{customer.userName}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-all">{customer.userEmail}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pedidos</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{customer.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Total</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">R$ {customer.totalSpent.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Ticket Médio</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">R$ {(customer.totalSpent / customer.orderCount).toFixed(2).replace('.', ',')}</p>
                    </div>
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

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Taxa de Cancelamento</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {ordersStats.overview.cancellationRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Pedidos Recentes (7 dias)</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {ordersStats.overview.recentOrders}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Aguardando Pagamento (Antigos)</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {ordersStats.overview.oldPendingOrders}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Mais de 1 dia</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Pedidos por Mês */}
      {ordersStats.byMonth.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mt-4 sm:mt-5 lg:mt-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Evolução Mensal (Últimos 12 Meses)
          </h2>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <BarChart data={ordersStats.byMonth} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-')
                    return `${month}/${year}`
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: any) => [value, 'Pedidos']}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="count" fill="#3b82f6" name="Quantidade de Pedidos" />
                <Bar dataKey="totalValue" fill="#10b981" name="Valor Total (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}


