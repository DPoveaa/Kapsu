import { Package, TrendingUp, DollarSign, ShoppingCart, AlertTriangle, XCircle, Calendar } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProductsStatsTabProps {
  productsStats: any
  productsLoading: boolean
}

export default function ProductsStatsTab({ productsStats, productsLoading }: ProductsStatsTabProps) {
  if (productsLoading) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando estatísticas de produtos...</p>
      </div>
    )
  }

  if (!productsStats) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Nenhum dado de produtos disponível
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Produtos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {productsStats.overview.totalProducts.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Cadastrados no sistema
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
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Vendidos no Período</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {productsStats.overview.productsSoldInPeriod.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Unidades vendidas
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Receita no Período</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatCurrency(productsStats.overview.revenueInPeriod)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Total arrecadado
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
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Vendidos Hoje</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {productsStats.overview.productsSoldToday.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {formatCurrency(productsStats.overview.revenueToday)}
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Vendidos na Semana</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {productsStats.overview.productsSoldLastWeek.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {formatCurrency(productsStats.overview.revenueLastWeek)}
              </p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Estoque Baixo</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1 break-words">
                {productsStats.overview.lowStockCount}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Menos de 10 unidades
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Produtos Inativos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {productsStats.overview.inactiveProducts.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Desativados
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Diária */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Vendas (Diária)
        </h2>
        {productsStats.evolutionByDay.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <LineChart data={productsStats.evolutionByDay} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
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
                    if (name === 'totalRevenue') {
                      return [formatCurrency(value), 'Receita']
                    }
                    return [value, 'Quantidade']
                  }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="totalQuantity" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quantidade Vendida"
                  yAxisId="left"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Receita (R$)"
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

      {/* Gráfico de Evolução Mensal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Vendas (Mensal - Últimos 12 Meses)
        </h2>
        {productsStats.evolutionByMonth.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <BarChart data={productsStats.evolutionByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-')
                    return `${month}/${year.substring(2)}`
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={80} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={80} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const [year, month] = value.split('-')
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                    return `${monthNames[parseInt(month) - 1]}/${year}`
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'totalRevenue') {
                      return [formatCurrency(value), 'Receita']
                    }
                    return [value, 'Quantidade']
                  }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="totalQuantity" fill="#3b82f6" name="Quantidade Vendida" yAxisId="left" />
                <Bar dataKey="totalRevenue" fill="#10b981" name="Receita (R$)" yAxisId="right" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Top Produtos por Quantidade */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Top 20 Produtos Mais Vendidos (por Quantidade)
        </h2>
        {productsStats.topProductsByQuantity.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Vezes Vendido
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Receita Total
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço Médio
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {productsStats.topProductsByQuantity.map((product: any, index: number) => (
                    <tr key={product.id} className={index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{product.name}</p>
                          {product.description && (
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {product.totalQuantity.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {product.timesSold}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(product.avgSalePrice)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                          product.stock < 10 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                            : product.stock < 50
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm">
                        {product.active ? (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
                            Inativo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {productsStats.topProductsByQuantity.map((product: any, index: number) => (
                <div key={product.id} className={`rounded-lg p-3 border ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Produto</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Quantidade</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{product.totalQuantity.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Vezes Vendido</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{product.timesSold}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Receita Total</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Preço Médio</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(product.avgSalePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Estoque</p>
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        product.stock < 10 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                          : product.stock < 50
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {product.stock}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Status</p>
                      {product.active ? (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {productsStats.topProductsByQuantity.length > 3 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 break-words">
                💡 Os 3 produtos mais vendidos estão destacados em amarelo
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum produto vendido no período
          </div>
        )}
      </div>

      {/* Top Produtos por Receita */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Top 20 Produtos por Receita
        </h2>
        {productsStats.topProductsByRevenue.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Receita Total
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Vezes Vendido
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço Médio
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Estoque
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {productsStats.topProductsByRevenue.map((product: any, index: number) => (
                    <tr key={product.id} className={index < 3 ? 'bg-green-50 dark:bg-green-900/30' : ''}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{product.name}</p>
                          {product.description && (
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {product.totalQuantity.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {product.timesSold}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(product.avgSalePrice)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                          product.stock < 10 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                            : product.stock < 50
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {productsStats.topProductsByRevenue.map((product: any, index: number) => (
                <div key={product.id} className={`rounded-lg p-3 border ${index < 3 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Produto</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Receita Total</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Quantidade</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{product.totalQuantity.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Vezes Vendido</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{product.timesSold}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Preço Médio</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(product.avgSalePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Estoque</p>
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        product.stock < 10 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                          : product.stock < 50
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {productsStats.topProductsByRevenue.length > 3 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-green-600 dark:text-green-400 break-words">
                💡 Os 3 produtos com maior receita estão destacados em verde
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum produto vendido no período
          </div>
        )}
      </div>

      {/* Distribuições */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        {/* Distribuição por Hora do Dia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Vendas por Hora do Dia
          </h2>
          {productsStats.distributionByHour.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <BarChart data={productsStats.distributionByHour} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={80} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'totalRevenue') {
                        return [formatCurrency(value), 'Receita']
                      }
                      return [value, 'Quantidade']
                    }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="totalQuantity" fill="#3b82f6" name="Quantidade" />
                  <Bar dataKey="totalRevenue" fill="#10b981" name="Receita (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Distribuição por Dia da Semana */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Vendas por Dia da Semana
          </h2>
          {productsStats.distributionByDayOfWeek.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <BarChart data={productsStats.distributionByDayOfWeek} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dayName"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={80} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'totalRevenue') {
                        return [formatCurrency(value), 'Receita']
                      }
                      return [value, 'Quantidade']
                    }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="totalQuantity" fill="#8b5cf6" name="Quantidade" />
                  <Bar dataKey="totalRevenue" fill="#10b981" name="Receita (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Produtos com Estoque Baixo */}
      {productsStats.lowStockProducts && productsStats.lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            ⚠️ Produtos com Estoque Baixo (Menos de 10 unidades)
          </h2>
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {productsStats.lowStockProducts.map((product: any) => (
                    <tr key={product.id} className="bg-red-50 dark:bg-red-900/30">
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{product.name}</p>
                          {product.description && (
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                        {product.stock}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(product.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {productsStats.lowStockProducts.map((product: any) => (
                <div key={product.id} className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Produto</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Estoque</p>
                      <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">{product.stock}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Preço</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(product.price)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        </div>
      )}

      {/* Produtos Nunca Vendidos */}
      {productsStats.neverSoldProducts && productsStats.neverSoldProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Produtos Nunca Vendidos
          </h2>
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {productsStats.neverSoldProducts.map((product: any) => (
                    <tr key={product.id}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{product.name}</p>
                          {product.description && (
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {product.stock}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm">
                        {product.active ? (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
                            Inativo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {productsStats.neverSoldProducts.map((product: any) => (
                <div key={product.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Produto</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Preço</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(product.price)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Estoque</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{product.stock}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Status</p>
                      {product.active ? (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        </div>
      )}
    </>
  )
}


