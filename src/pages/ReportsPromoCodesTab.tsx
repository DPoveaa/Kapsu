import { Tag, DollarSign, TrendingDown, CheckCircle, XCircle, ShoppingCart } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface PromoCodesStatsTabProps {
  promoCodesStats: any
  promoCodesLoading: boolean
}

export default function PromoCodesStatsTab({ promoCodesStats, promoCodesLoading }: PromoCodesStatsTabProps) {
  if (promoCodesLoading) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando estatísticas de cupons...</p>
      </div>
    )
  }

  if (!promoCodesStats) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
                {promoCodesStats.overview.totalUsages.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {promoCodesStats.overview.usagesInPeriod} no período
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Descontado</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(promoCodesStats.overview.totalDiscountInPeriod)}
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
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Desconto Médio</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(promoCodesStats.overview.avgDiscountPerUsage)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Por uso de cupom
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Histórico</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(promoCodesStats.overview.totalDiscountApplied)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Todos os tempos
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Uso de Cupons
        </h2>
        {promoCodesStats.evolutionByDay.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <LineChart data={promoCodesStats.evolutionByDay} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>

      {/* Cupons Mais Usados */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Cupons Mais Usados no Período
        </h2>
        {promoCodesStats.usagesByCode.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nome
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
                      Valor Final
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Desconto Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {promoCodesStats.usagesByCode.map((code: any, index: number) => (
                    <tr key={index} className={index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                        {code.code}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300 break-words">
                        {code.name}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                          code.discountType === 'percentage' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {code.discountType === 'percentage' ? 'Percentual' : 'Fixo'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {code.usageCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(code.totalOriginalValue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(code.totalDiscount)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(code.totalFinalValue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(code.avgDiscount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {promoCodesStats.usagesByCode.map((code: any, index: number) => (
                <div key={index} className={`rounded-lg p-3 border ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{code.code}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-words">{code.name}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</p>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      code.discountType === 'percentage' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                      {code.discountType === 'percentage' ? 'Percentual' : 'Fixo'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Usos</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{code.usageCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Original</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(code.totalOriginalValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Descontado</p>
                      <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(code.totalDiscount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Final</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(code.totalFinalValue)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Desconto Médio</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(code.avgDiscount)}</p>
                  </div>
                </div>
              ))}
            </div>
            {promoCodesStats.usagesByCode.length > 3 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 break-words">
                💡 Os 3 cupons mais usados estão destacados em amarelo
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum cupom foi usado no período
          </div>
        )}
      </div>

      {/* Usos Detalhados */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 lg:mb-4">
          Histórico Detalhado de Usos
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 break-words">
          Lista completa de todos os usos de cupons, mostrando qual cupom foi usado, quando, para qual pedido, valor original, desconto aplicado e valor final.
        </p>
        {promoCodesStats.detailedUsages && promoCodesStats.detailedUsages.length > 0 ? (
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
                      Cupom
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
                      Valor Final
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {promoCodesStats.detailedUsages.map((usage: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(usage.usedAt)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{usage.promoCode}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{usage.promoName}</p>
                        </div>
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
                        -{formatCurrency(usage.lostValue)}
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
              {promoCodesStats.detailedUsages.map((usage: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data/Hora</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatDate(usage.usedAt)}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cupom</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{usage.promoCode}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{usage.promoName}</p>
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
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Valor Original</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(usage.originalValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Desconto</p>
                      <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(usage.lostValue)}</p>
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

      {/* Top Clientes que Mais Usaram Cupons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Clientes que Mais Usaram Cupons
        </h2>
        {promoCodesStats.usagesByUser.length > 0 ? (
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
                      Desconto Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {promoCodesStats.usagesByUser.map((user: any, index: number) => (
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
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(user.totalDiscount / user.usageCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {promoCodesStats.usagesByUser.map((user: any, index: number) => (
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
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Desconto Médio</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(user.totalDiscount / user.usageCount)}</p>
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

      {/* Estatísticas por Tipo de Desconto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Distribuição por Tipo de Desconto
          </h2>
          {promoCodesStats.statsByDiscountType.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
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
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {promoCodesStats.statsByDiscountType.map((_item: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} usos (${formatCurrency(props.payload.totalDiscount)})`,
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
            Top 10 Cupons (Todos os Tempos)
          </h2>
          {promoCodesStats.topPromoCodes.length > 0 ? (
            <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
              {promoCodesStats.topPromoCodes.map((code: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{code.code}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{code.name}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{code.usageCount} usos</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      {code.discountType === 'percentage' 
                        ? `${code.discountValue}%` 
                        : formatCurrency(code.discountValue)}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {code.active ? (
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
              Nenhum cupom cadastrado
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Resumo Financeiro do Período
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Valor Total Original</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
              {formatCurrency(
                promoCodesStats.usagesByCode.reduce((sum: number, code: any) => 
                  sum + code.totalOriginalValue, 0
                )
              )}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor que seria arrecadado sem cupons</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Descontado</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1 break-words">
              -{formatCurrency(promoCodesStats.overview.totalDiscountInPeriod)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor "perdido" em descontos</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800 sm:col-span-2 lg:col-span-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Valor Final Arrecadado</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1 break-words">
              {formatCurrency(
                promoCodesStats.usagesByCode.reduce((sum: number, code: any) => 
                  sum + code.totalOriginalValue, 0
                ) - promoCodesStats.overview.totalDiscountInPeriod
              )}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Valor efetivamente arrecadado</p>
          </div>
        </div>
      </div>
    </>
  )
}


