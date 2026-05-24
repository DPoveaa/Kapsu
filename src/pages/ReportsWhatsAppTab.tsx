import { MessageSquare, Send, Inbox, Clock, TrendingUp, AlertCircle, Users } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface WhatsAppStatsTabProps {
  whatsappStats: any
  whatsappLoading: boolean
}

export default function WhatsAppStatsTab({ whatsappStats, whatsappLoading }: WhatsAppStatsTabProps) {
  if (whatsappLoading) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando estatísticas de WhatsApp...</p>
      </div>
    )
  }

  if (!whatsappStats) {
    return (
      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Nenhum dado de WhatsApp disponível
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Mensagens</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {whatsappStats.overview.totalMessages.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                No período selecionado
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Mensagens Recebidas</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {whatsappStats.overview.receivedMessages.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {whatsappStats.overview.receivedToday} hoje
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Inbox className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Mensagens Enviadas</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {whatsappStats.overview.sentMessages.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {whatsappStats.overview.sentToday} hoje
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Taxa de Resposta</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {whatsappStats.overview.responseRate.toFixed(1)}%
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {whatsappStats.overview.messagesWithResponse} respondidas
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Tempo de Resposta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Tempo Médio de Resposta</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {formatTimeShort(whatsappStats.responseTime.avgResponseTime)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {whatsappStats.responseTime.avgResponseTimeSeconds.toFixed(2)} segundos
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Tempo Mais Longo</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1 break-words">
                {formatTime(whatsappStats.responseTime.longestResponseTime)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {whatsappStats.responseTime.longestResponseTimeMinutes.toFixed(2)} minutos
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Tempo Mais Rápido</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1 break-words">
                {formatTime(whatsappStats.responseTime.shortestResponseTime)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {whatsappStats.responseTime.shortestResponseTimeSeconds.toFixed(2)} segundos
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Sem Resposta</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {whatsappStats.overview.messagesWithoutResponse.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Mensagens não respondidas
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Conversas</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                {whatsappStats.overview.totalConversations.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                No período selecionado
              </p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Precisam de Resposta</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 break-words">
                {whatsappStats.overview.conversationsNeedingResponse.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                Conversas pendentes
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição de Tempo de Resposta */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Distribuição de Tempo de Resposta
        </h2>
        {whatsappStats.responseTime.distribution ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Instantâneo</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 break-words">
                {whatsappStats.responseTime.distribution.instant}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">&lt; 5 segundos</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Rápido</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1 break-words">
                {whatsappStats.responseTime.distribution.fast}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">5-30 segundos</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Médio</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 break-words">
                {whatsappStats.responseTime.distribution.medium}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">30-60 segundos</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 sm:p-4 border border-orange-200 dark:border-orange-800">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Lento</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1 break-words">
                {whatsappStats.responseTime.distribution.slow}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">1-5 minutos</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800 sm:col-span-3 lg:col-span-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Muito Lento</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1 break-words">
                {whatsappStats.responseTime.distribution.verySlow}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">&gt; 5 minutos</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Gráfico de Evolução Diária */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Evolução de Mensagens (Diária)
        </h2>
        {whatsappStats.evolutionByDay.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <LineChart data={whatsappStats.evolutionByDay} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
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
                  formatter={(value: number, name: string) => {
                    if (name === 'totalCount') return [value, 'Total']
                    if (name === 'receivedCount') return [value, 'Recebidas']
                    if (name === 'sentCount') return [value, 'Enviadas']
                    return [value, name]
                  }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="totalCount" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="receivedCount" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Recebidas"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sentCount" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Enviadas"
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

      {/* Distribuições */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
        {/* Distribuição por Hora do Dia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Mensagens por Hora do Dia
          </h2>
          {whatsappStats.distributionByHour.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <BarChart data={whatsappStats.distributionByHour} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="receivedCount" fill="#10b981" name="Recebidas" />
                  <Bar dataKey="sentCount" fill="#8b5cf6" name="Enviadas" />
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
            Mensagens por Dia da Semana
          </h2>
          {whatsappStats.distributionByDayOfWeek.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={250} minHeight={200}>
                <BarChart data={whatsappStats.distributionByDayOfWeek} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dayName"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="receivedCount" fill="#10b981" name="Recebidas" />
                  <Bar dataKey="sentCount" fill="#8b5cf6" name="Enviadas" />
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

      {/* Mensagens por Tipo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Mensagens por Tipo
        </h2>
        {whatsappStats.messagesByType.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            {whatsappStats.messagesByType.map((type: any, index: number) => {
              const typeLabels: Record<string, string> = {
                'text': 'Texto',
                'image': 'Imagem',
                'video': 'Vídeo',
                'audio': 'Áudio',
                'document': 'Documento',
                'other': 'Outro',
              }
              return (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">{typeLabels[type.type] || type.type}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">{Number(type.count).toLocaleString('pt-BR')}</p>
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

      {/* Top Conversas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Top 20 Conversas (por Número de Mensagens)
        </h2>
        {whatsappStats.topConversations.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total de Mensagens
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Recebidas
                    </th>
                    <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Enviadas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {whatsappStats.topConversations.map((conv: any, index: number) => (
                    <tr key={index} className={index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                        {conv.contactName}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300 break-all">
                        {conv.phone}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {conv.messageCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600 dark:text-green-400">
                        {conv.receivedCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-purple-600 dark:text-purple-400">
                        {conv.sentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {whatsappStats.topConversations.map((conv: any, index: number) => (
                <div key={index} className={`rounded-lg p-3 border ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contato</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{conv.contactName}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Telefone</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-all">{conv.phone}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Total</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{conv.messageCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Recebidas</p>
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">{conv.receivedCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Enviadas</p>
                      <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">{conv.sentCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {whatsappStats.topConversations.length > 3 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 break-words">
                💡 As 3 conversas com mais mensagens estão destacadas em amarelo
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Nenhuma conversa encontrada no período
          </div>
        )}
      </div>
    </>
  )
}


