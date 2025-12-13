import { Users, UserPlus, TrendingUp, Clock, Calendar, Activity, ShoppingCart, UserCheck, UserX, BarChart3 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface UsersStatsTabProps {
  usersStats: any
  usersLoading: boolean
}

export default function UsersStatsTab({ usersStats, usersLoading }: UsersStatsTabProps) {
  if (usersLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de clientes...</p>
      </div>
    )
  }

  if (!usersStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado de clientes disponível
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usersStats.overview.totalUsers.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {usersStats.overview.usersInPeriod} no período
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usersStats.overview.activeUsers.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Login nos últimos 30 dias
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Novos Hoje</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usersStats.overview.usersToday.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {usersStats.overview.recentUsers} nos últimos 7 dias
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Crescimento</p>
              <p className={`text-2xl font-bold mt-1 ${
                usersStats.overview.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {usersStats.overview.growthRate >= 0 ? '+' : ''}{usersStats.overview.growthRate.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Comparado ao período anterior
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Com Pedidos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usersStats.overview.usersWithOrders.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {usersStats.overview.totalUsers > 0 
                  ? ((usersStats.overview.usersWithOrders / usersStats.overview.totalUsers) * 100).toFixed(1)
                  : 0}% do total
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Nunca Fizeram Login</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usersStats.overview.neverLoggedIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Contas inativas
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usersStats.overview.totalUsers > 0 
                  ? ((usersStats.overview.usersWithOrders / usersStats.overview.totalUsers) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Clientes que compraram
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Diária */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Criação de Clientes (Diária)
        </h2>
        {usersStats.evolutionByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={usersStats.evolutionByDay}>
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
                formatter={(value: number) => [value, 'Novos Clientes']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Novos Clientes"
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

      {/* Gráfico de Evolução Mensal */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Criação de Clientes (Mensal - Últimos 12 Meses)
        </h2>
        {usersStats.evolutionByMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={usersStats.evolutionByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(value) => {
                  const [year, month] = value.split('-')
                  return `${month}/${year.substring(2)}`
                }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => {
                  const [year, month] = value.split('-')
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                  return `${monthNames[parseInt(month) - 1]}/${year}`
                }}
                formatter={(value: number) => [value, 'Novos Clientes']}
              />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Novos Clientes" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Distribuição por Hora do Dia */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição por Hora do Dia
          </h2>
          {usersStats.distributionByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usersStats.distributionByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }}
                />
                <YAxis />
                <Tooltip formatter={(value: number) => [value, 'Clientes']} />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Novos Clientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Distribuição por Dia da Semana */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição por Dia da Semana
          </h2>
          {usersStats.distributionByDayOfWeek.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usersStats.distributionByDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dayName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip formatter={(value: number) => [value, 'Clientes']} />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Novos Clientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Distribuição por Período do Dia */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribuição por Período do Dia
        </h2>
        {usersStats.distributionByTimeOfDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={usersStats.distributionByTimeOfDay}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.period}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {usersStats.distributionByTimeOfDay.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Clientes']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Distribuição por Role */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribuição por Tipo de Usuário
        </h2>
        {usersStats.roleStats && Object.keys(usersStats.roleStats).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(usersStats.roleStats).map(([role, count]: [string, any]) => {
              const roleLabels: Record<string, string> = {
                'user': 'Cliente',
                'admin': 'Administrador',
                'pharmacist': 'Farmacêutico',
              }
              return (
                <div key={role} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">{roleLabels[role] || role}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{Number(count).toLocaleString('pt-BR')}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Top Clientes por Pedidos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Top 10 Clientes por Número de Pedidos
        </h2>
        {usersStats.topUsersByOrders && usersStats.topUsersByOrders.length > 0 ? (
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
                    Total Gasto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersStats.topUsersByOrders.map((user: any, index: number) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(user.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(user.avgTicket)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usersStats.topUsersByOrders.length > 3 && (
              <p className="mt-4 text-sm text-yellow-600">
                💡 Os 3 clientes com mais pedidos estão destacados em amarelo
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum cliente com pedidos encontrado
          </div>
        )}
      </div>
    </>
  )
}


