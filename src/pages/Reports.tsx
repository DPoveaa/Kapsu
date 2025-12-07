import { useEffect, useState } from 'react'
import { BarChart3, Users, Eye, Calendar, Clock, TrendingDown, MousePointer, ArrowRight } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { adminService } from '../services/admin.service'

interface SiteAccessStats {
  totalAccesses: number
  uniqueVisitors: number
  uniqueIPs: number
  uniqueAuthenticatedUsers: number
}

interface ChartDataPoint {
  date: string
  total: number
  unique: number
}

interface BehaviorAnalytics {
  topPages: Array<{ path: string; views: number; avgTime: number; bounceRate: number }>
  avgSessionDuration: number
  bounceRate: number
  totalSessions: number
  bouncedSessions: number
  topEntryPages: Array<{ path: string; count: number }>
  topExitPages: Array<{ path: string; count: number }>
  eventCounts: Record<string, number>
  timeDistribution: Array<{ range: string; count: number }>
  funnelData: Array<{ path: string; views: number }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Reports() {
  const [stats, setStats] = useState<SiteAccessStats | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<BehaviorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [behaviorLoading, setBehaviorLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior'>('overview')
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getSiteAccessStats({
        startDate,
        endDate,
        groupBy,
      })
      setStats(data.statistics)
      setChartData(data.chartData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
      console.error('Erro ao carregar estatísticas:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBehaviorData = async () => {
    try {
      setBehaviorLoading(true)
      const data = await adminService.getBehaviorAnalytics({
        startDate,
        endDate,
      })
      setBehaviorAnalytics(data.analytics)
    } catch (err: any) {
      console.error('Erro ao carregar analytics de comportamento:', err)
    } finally {
      setBehaviorLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchBehaviorData()
  }, [groupBy, startDate, endDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    switch (groupBy) {
      case 'hour':
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      case 'day':
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      case 'week':
        return `Sem ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
      case 'month':
        return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      default:
        return dateString
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="mt-2 text-gray-600">Estatísticas de acesso e comportamento dos usuários</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agrupar Por
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'hour' | 'day' | 'week' | 'month')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="hour">Hora</option>
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  fetchData()
                  fetchBehaviorData()
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('behavior')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'behavior'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comportamento
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Carregando dados...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            ) : (
              <>
                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total de Acessos</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {stats?.totalAccesses.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Eye className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Visitantes Únicos</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {stats?.uniqueVisitors.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">IPs Únicos</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {stats?.uniqueIPs.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Usuários Autenticados</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {stats?.uniqueAuthenticatedUsers.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <Calendar className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Acessos */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Acessos ao Site
                  </h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => formatDate(value)}
                          formatter={(value: number) => value.toLocaleString('pt-BR')}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Total de Acessos"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="unique" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Visitantes Únicos"
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

                {/* Gráfico de Barras Comparativo */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Comparativo: Total vs. Visitantes Únicos
                  </h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => formatDate(value)}
                          formatter={(value: number) => value.toLocaleString('pt-BR')}
                        />
                        <Legend />
                        <Bar dataKey="total" fill="#3b82f6" name="Total de Acessos" />
                        <Bar dataKey="unique" fill="#10b981" name="Visitantes Únicos" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'behavior' && (
          <>
            {behaviorLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Carregando dados de comportamento...</p>
              </div>
            ) : behaviorAnalytics ? (
              <>
                {/* Cards de Métricas de Comportamento */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tempo Médio de Sessão</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatTime(behaviorAnalytics.avgSessionDuration)}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Taxa de Rejeição</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {behaviorAnalytics.bounceRate}%
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
                        <p className="text-sm font-medium text-gray-600">Total de Sessões</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {behaviorAnalytics.totalSessions.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sessões Rejeitadas</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {behaviorAnalytics.bouncedSessions.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <MousePointer className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Páginas Mais Visitadas */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Páginas Mais Visitadas
                  </h2>
                  {behaviorAnalytics.topPages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Página
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Visualizações
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tempo Médio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Taxa de Rejeição
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {behaviorAnalytics.topPages.map((page, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {page.path || '/'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {page.views.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTime(page.avgTime)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  page.bounceRate > 70 ? 'bg-red-100 text-red-800' :
                                  page.bounceRate > 40 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {page.bounceRate}%
                                </span>
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

                {/* Distribuição de Tempo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Distribuição de Tempo na Página
                    </h2>
                    {behaviorAnalytics.timeDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={behaviorAnalytics.timeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {behaviorAnalytics.timeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  {/* Funil de Conversão */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Funil de Conversão
                    </h2>
                    {behaviorAnalytics.funnelData.length > 0 ? (
                      <div className="space-y-4">
                        {behaviorAnalytics.funnelData.map((step, index) => {
                          const maxViews = Math.max(...behaviorAnalytics.funnelData.map(f => f.views))
                          const percentage = maxViews > 0 ? (step.views / maxViews) * 100 : 0
                          const prevViews = index > 0 ? behaviorAnalytics.funnelData[index - 1].views : step.views
                          const conversionRate = prevViews > 0 ? ((step.views / prevViews) * 100).toFixed(1) : '100.0'
                          
                          return (
                            <div key={index}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  {step.path === '/' ? 'Home' : 
                                   step.path === '/produtos' ? 'Produtos' :
                                   step.path === '/carrinho' ? 'Carrinho' :
                                   step.path === '/checkout' ? 'Checkout' : step.path}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-gray-500">
                                    {step.views.toLocaleString('pt-BR')} visualizações
                                  </span>
                                  {index > 0 && (
                                    <span className="text-xs text-gray-400">
                                      {conversionRate}% conversão
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                  className="bg-indigo-600 h-4 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              {index < behaviorAnalytics.funnelData.length - 1 && (
                                <div className="flex justify-center my-2">
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
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
                </div>

                {/* Páginas de Entrada e Saída */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Páginas de Entrada
                    </h2>
                    {behaviorAnalytics.topEntryPages.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={behaviorAnalytics.topEntryPages.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="path" type="category" width={150} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Páginas de Saída
                    </h2>
                    {behaviorAnalytics.topExitPages.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={behaviorAnalytics.topExitPages.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="path" type="category" width={150} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Nenhum dado de comportamento disponível
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
