import { Clock, AlertCircle, TrendingUp, CheckCircle, XCircle, Timer, MessageSquare } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface WhatsAppHumanSupportStatsTabProps {
  whatsappHumanSupportStats: any
  whatsappHumanSupportLoading: boolean
}

export default function WhatsAppHumanSupportStatsTab({ 
  whatsappHumanSupportStats, 
  whatsappHumanSupportLoading 
}: WhatsAppHumanSupportStatsTabProps) {
  if (whatsappHumanSupportLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de atendimento humano...</p>
      </div>
    )
  }

  if (!whatsappHumanSupportStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado de atendimento humano disponível
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
              <p className="text-sm font-medium text-gray-600">Precisaram de Farmacêutico</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {whatsappHumanSupportStats.overview.totalNeedingPharmacist.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                No período selecionado
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Foram Atendidas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {whatsappHumanSupportStats.overview.totalAssumed.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {whatsappHumanSupportStats.overview.assumedFromPharmacist} de farmacêutico
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Não Atendidas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {whatsappHumanSupportStats.overview.needingPharmacistNotAssumed.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Aguardando atendimento
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
              <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {whatsappHumanSupportStats.overview.conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Atendidas / Precisaram
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Tempo de Espera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio de Espera</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatTimeShort(whatsappHumanSupportStats.waitingTime.avgWaitingTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {whatsappHumanSupportStats.waitingTime.avgWaitingTimeMinutes.toFixed(2)} minutos
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
                {formatTime(whatsappHumanSupportStats.waitingTime.longestWaitingTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {whatsappHumanSupportStats.waitingTime.longestWaitingTimeHours.toFixed(2)} horas
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
                {formatTime(whatsappHumanSupportStats.waitingTime.shortestWaitingTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {whatsappHumanSupportStats.waitingTime.shortestWaitingTimeMinutes.toFixed(2)} minutos
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Timer className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Tempo de Resposta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio de Resposta</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatTimeShort(whatsappHumanSupportStats.responseWaitingTime.avgResponseWaitingTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {whatsappHumanSupportStats.responseWaitingTime.avgResponseWaitingTimeMinutes.toFixed(2)} minutos
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
              <p className="text-sm font-medium text-gray-600">Resposta Mais Longa</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatTime(whatsappHumanSupportStats.responseWaitingTime.longestResponseWaitingTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {whatsappHumanSupportStats.responseWaitingTime.longestResponseWaitingTimeMinutes.toFixed(2)} minutos
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
              <p className="text-sm font-medium text-gray-600">Aguardando Resposta</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {whatsappHumanSupportStats.overview.needingResponse.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Conversas pendentes
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição de Tempo de Espera */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribuição de Tempo de Espera até Atendimento
        </h2>
        {whatsappHumanSupportStats.waitingTime.distribution ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Instantâneo</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {whatsappHumanSupportStats.waitingTime.distribution.instant}
              </p>
              <p className="text-xs text-gray-500 mt-1">&lt; 1 minuto</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Rápido</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {whatsappHumanSupportStats.waitingTime.distribution.fast}
              </p>
              <p className="text-xs text-gray-500 mt-1">1-5 minutos</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Médio</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {whatsappHumanSupportStats.waitingTime.distribution.medium}
              </p>
              <p className="text-xs text-gray-500 mt-1">5-15 minutos</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Lento</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {whatsappHumanSupportStats.waitingTime.distribution.slow}
              </p>
              <p className="text-xs text-gray-500 mt-1">15-60 minutos</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Muito Lento</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {whatsappHumanSupportStats.waitingTime.distribution.verySlow}
              </p>
              <p className="text-xs text-gray-500 mt-1">&gt; 1 hora</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Gráficos de Evolução */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Evolução de Conversas que Precisaram de Farmacêutico */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Conversas que Precisaram de Farmacêutico (Diária)
          </h2>
          {whatsappHumanSupportStats.needingPharmacistByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={whatsappHumanSupportStats.needingPharmacistByDay}>
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
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Precisaram de Farmacêutico"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Evolução de Conversas Atendidas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Conversas Atendidas (Diária)
          </h2>
          {whatsappHumanSupportStats.assumedByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={whatsappHumanSupportStats.assumedByDay}>
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
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Atendidas"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Distribuição por Farmacêutico */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Conversas Atendidas por Farmacêutico
          </h2>
          {whatsappHumanSupportStats.assumedByDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={whatsappHumanSupportStats.assumedByDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="pharmacist"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Conversas Atendidas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Motivos de Assunção */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Motivos de Assunção
          </h2>
          {whatsappHumanSupportStats.assumptionReasons.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={whatsappHumanSupportStats.assumptionReasons}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.reason}: ${entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {whatsappHumanSupportStats.assumptionReasons.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas por Farmacêutico */}
      {whatsappHumanSupportStats.pharmacistStats && whatsappHumanSupportStats.pharmacistStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Estatísticas por Farmacêutico
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farmacêutico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Atendidas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tempo Médio de Espera
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {whatsappHumanSupportStats.pharmacistStats.map((pharm: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pharm.pharmacist}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pharm.totalAssumed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeShort(pharm.avgWaitingTime)} ({pharm.avgWaitingTimeMinutes.toFixed(2)} min)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Conversas que Mais Esperaram */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Top 20 Conversas que Mais Esperaram Atendimento
        </h2>
        {whatsappHumanSupportStats.topWaitingConversations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tempo de Espera
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atendido Por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Atendimento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {whatsappHumanSupportStats.topWaitingConversations.map((conv: any, index: number) => (
                  <tr key={index} className={index < 3 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">{conv.contactName}</div>
                      <div className="text-xs text-gray-500">{conv.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-red-600">
                        {formatTime(conv.waitingTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {conv.waitingTimeHours}h {Math.floor((conv.waitingTime % 3600000) / 60000)}m
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {conv.assumedBy || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {conv.assumptionReason || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(conv.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {conv.assumedAt ? new Date(conv.assumedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {whatsappHumanSupportStats.topWaitingConversations.length > 3 && (
              <p className="mt-4 text-sm text-red-600">
                ⚠️ As 3 conversas que mais esperaram estão destacadas em vermelho
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


