import { MessageSquare, Send, Inbox, Clock, TrendingUp, AlertCircle, Users, MessageCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChatStatsTabProps {
  chatStats: any
  chatLoading: boolean
}

export default function ChatStatsTab({ chatStats, chatLoading }: ChatStatsTabProps) {
  if (chatLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de chat...</p>
      </div>
    )
  }

  if (!chatStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado de chat disponível
      </div>
    )
  }

  const formatTime = (milliseconds: number) => {
    if (milliseconds === 0 || !milliseconds) return '0s'
    
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatTimeShort = (milliseconds: number) => {
    if (milliseconds === 0 || !milliseconds) return '0s'
    
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m`
    }
    return `${seconds}s`
  }

  return (
    <>
      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Conversas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.totalSessions.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {chatStats.overview.sessionsToday} hoje
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Mensagens</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.totalMessages.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {chatStats.overview.messagesToday} hoje
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensagens do Usuário</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.userMessages.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((chatStats.overview.userMessages / chatStats.overview.totalMessages) * 100).toFixed(1)}% do total
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Inbox className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensagens da IA</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.assistantMessages.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((chatStats.overview.assistantMessages / chatStats.overview.totalMessages) * 100).toFixed(1)}% do total
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Send className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Tempo de Resposta e Taxa */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio de Resposta</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatTimeShort(chatStats.responseTime.avgResponseTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {chatStats.responseTime.avgResponseTimeSeconds.toFixed(2)} segundos
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
              <p className="text-sm font-medium text-gray-600">Tempo Mais Longo</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatTime(chatStats.responseTime.longestResponseTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {chatStats.responseTime.longestResponseTimeMinutes.toFixed(2)} minutos
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Mais Rápido</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatTime(chatStats.responseTime.shortestResponseTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {chatStats.responseTime.shortestResponseTimeSeconds.toFixed(2)} segundos
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Resposta</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.responseRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {chatStats.overview.messagesWithResponse} respondidas
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Média de Mensagens por Conversa</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.avgMessagesPerSession.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Mensagens por sessão
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sem Resposta</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {chatStats.overview.messagesWithoutResponse.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Mensagens não respondidas
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição de Tempo de Resposta */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribuição de Tempo de Resposta
        </h2>
        {chatStats.responseTime.distribution ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Instantâneo</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {chatStats.responseTime.distribution.instant}
              </p>
              <p className="text-xs text-gray-500 mt-1">&lt; 5 segundos</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Rápido</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {chatStats.responseTime.distribution.fast}
              </p>
              <p className="text-xs text-gray-500 mt-1">5-30 segundos</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Médio</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {chatStats.responseTime.distribution.medium}
              </p>
              <p className="text-xs text-gray-500 mt-1">30-60 segundos</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Lento</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {chatStats.responseTime.distribution.slow}
              </p>
              <p className="text-xs text-gray-500 mt-1">1-5 minutos</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Muito Lento</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {chatStats.responseTime.distribution.verySlow}
              </p>
              <p className="text-xs text-gray-500 mt-1">&gt; 5 minutos</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Gráfico de Evolução Diária de Mensagens */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Mensagens (Diária)
        </h2>
        {chatStats.evolutionByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chatStats.evolutionByDay}>
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
                formatter={(value: number, name: string) => {
                  if (name === 'totalCount') return [value, 'Total']
                  if (name === 'userCount') return [value, 'Usuário']
                  if (name === 'assistantCount') return [value, 'IA']
                  return [value, name]
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalCount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="userCount" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Usuário"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="assistantCount" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="IA"
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

      {/* Gráfico de Evolução Diária de Conversas */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Conversas (Diária)
        </h2>
        {chatStats.sessionsByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chatStats.sessionsByDay}>
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
                formatter={(value: number) => [value, 'Conversas']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Conversas"
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

      {/* Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Distribuição por Hora do Dia */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Mensagens por Hora do Dia
          </h2>
          {chatStats.distributionByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chatStats.distributionByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="userCount" fill="#10b981" name="Usuário" />
                <Bar dataKey="assistantCount" fill="#8b5cf6" name="IA" />
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
            Mensagens por Dia da Semana
          </h2>
          {chatStats.distributionByDayOfWeek.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chatStats.distributionByDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dayName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="userCount" fill="#10b981" name="Usuário" />
                <Bar dataKey="assistantCount" fill="#8b5cf6" name="IA" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Top Conversas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Top 20 Conversas (por Número de Mensagens)
        </h2>
        {chatStats.topSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data da Conversa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total de Mensagens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensagens do Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensagens da IA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chatStats.topSessions.map((session: any, index: number) => (
                  <tr key={session.sessionId} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">{session.userName}</div>
                      {session.userEmail && (
                        <div className="text-xs text-gray-500">{session.userEmail}</div>
                      )}
                      {session.userId && session.userId.startsWith('SESSION_') && (
                        <div className="text-xs text-gray-400">Não autenticado</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.sessionCreatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {session.messageCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {session.userMessageCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {session.assistantMessageCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {chatStats.topSessions.length > 3 && (
              <p className="mt-4 text-sm text-yellow-600">
                💡 As 3 conversas com mais mensagens estão destacadas em amarelo
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhuma conversa encontrada no período
          </div>
        )}
      </div>
    </>
  )
}


