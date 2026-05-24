import { Users, UserPlus, TrendingUp, Activity, ShoppingCart, UserCheck, UserX } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TooltipValue, formatTooltipNumber } from '../types/recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface UsersStatsTabProps {
  usersStats: any
  usersLoading: boolean
}

export default function UsersStatsTab({ usersStats, usersLoading }: UsersStatsTabProps) {
  if (usersLoading) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando estatísticas de clientes...</p>
      </div>
    )
  }

  if (!usersStats) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Nenhum dado de clientes disponível
      </div>
    )
  }

  const formatCurrency = (value: TooltipValue) => {
    return `R$ ${formatTooltipNumber(value).toFixed(2).replace('.', ',')}`
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Clientes</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {usersStats.overview.totalUsers.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {usersStats.overview.usersInPeriod} no período
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Clientes Ativos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {usersStats.overview.activeUsers.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Login nos últimos 30 dias
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Novos Hoje</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {usersStats.overview.usersToday.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {usersStats.overview.recentUsers} nos últimos 7 dias
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Taxa de Crescimento</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 break-words ${
                usersStats.overview.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {usersStats.overview.growthRate >= 0 ? '+' : ''}{usersStats.overview.growthRate.toFixed(2)}%
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Comparado ao período anterior
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
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Com Pedidos</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {usersStats.overview.usersWithOrders.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {usersStats.overview.totalUsers > 0 
                  ? ((usersStats.overview.usersWithOrders / usersStats.overview.totalUsers) * 100).toFixed(1)
                  : 0}% do total
              </p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Nunca Fizeram Login</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {usersStats.overview.neverLoggedIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Contas inativas
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <UserX className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Taxa de Conversão</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {usersStats.overview.totalUsers > 0 
                  ? ((usersStats.overview.usersWithOrders / usersStats.overview.totalUsers) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Clientes que compraram
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Diária */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Criação de Clientes (Diária)
        </h2>
        {usersStats.evolutionByDay.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <LineChart data={usersStats.evolutionByDay} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
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
                  formatter={(value: TooltipValue) => [formatTooltipNumber(value), 'Novos Clientes']}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Novos Clientes"
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
          Evolução de Criação de Clientes (Mensal - Últimos 12 Meses)
        </h2>
        {usersStats.evolutionByMonth.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <BarChart data={usersStats.evolutionByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
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
                <YAxis tick={{ fontSize: 10 }} width={80} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const [year, month] = value.split('-')
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                    return `${monthNames[parseInt(month) - 1]}/${year}`
                  }}
                  formatter={(value: TooltipValue) => [formatTooltipNumber(value), 'Novos Clientes']}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="count" fill="#3b82f6" name="Novos Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Distribuições */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        {/* Distribuição por Hora do Dia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Distribuição por Hora do Dia
          </h2>
          {usersStats.distributionByHour.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <BarChart data={usersStats.distributionByHour} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(value: TooltipValue) => [formatTooltipNumber(value), 'Clientes']} contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#10b981" name="Novos Clientes" />
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
            Distribuição por Dia da Semana
          </h2>
          {usersStats.distributionByDayOfWeek.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <BarChart data={usersStats.distributionByDayOfWeek} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dayName"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(value: TooltipValue) => [formatTooltipNumber(value), 'Clientes']} contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" name="Novos Clientes" />
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

      {/* Distribuição por Período do Dia */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Distribuição por Período do Dia
        </h2>
        {usersStats.distributionByTimeOfDay.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={250} minHeight={200}>
              <PieChart>
                <Pie
                  data={usersStats.distributionByTimeOfDay}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.period}: ${entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {usersStats.distributionByTimeOfDay.map((_item: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: TooltipValue) => [formatTooltipNumber(value), 'Clientes']} contentStyle={{ fontSize: '12px' }} />
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

      {/* Distribuição por Role */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Distribuição por Tipo de Usuário
        </h2>
        {usersStats.roleStats && Object.keys(usersStats.roleStats).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(usersStats.roleStats).map(([role, count]: [string, any]) => {
              const roleLabels: Record<string, string> = {
                'user': 'Cliente',
                'admin': 'Administrador',
                'pharmacist': 'Farmacêutico',
              }
              return (
                <div key={role} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">{roleLabels[role] || role}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">{Number(count).toLocaleString('pt-BR')}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Top Clientes por Pedidos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Top 10 Clientes por Número de Pedidos
        </h2>
        {usersStats.topUsersByOrders && usersStats.topUsersByOrders.length > 0 ? (
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
                      Total Gasto
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ticket Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {usersStats.topUsersByOrders.map((user: any, index: number) => (
                    <tr key={index} className={index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                        {user.userName}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300 break-all">
                        {user.userEmail}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {user.orderCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(user.totalSpent)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(user.avgTicket)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {usersStats.topUsersByOrders.map((user: any, index: number) => (
                <div key={index} className={`rounded-lg p-3 border ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
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
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pedidos</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{user.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Total Gasto</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(user.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Ticket Médio</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(user.avgTicket)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {usersStats.topUsersByOrders.length > 3 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 break-words">
                💡 Os 3 clientes com mais pedidos estão destacados em amarelo
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum cliente com pedidos encontrado
          </div>
        )}
      </div>
    </>
  )
}


