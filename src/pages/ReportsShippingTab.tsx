import { Truck, MapPin, XCircle, CheckCircle, DollarSign, TrendingUp, Users, AlertCircle, Gift, Tag, Package } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface ShippingStatsTabProps {
  shippingStats: any
  shippingLoading: boolean
}

export default function ShippingStatsTab({ shippingStats, shippingLoading }: ShippingStatsTabProps) {
  if (shippingLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Carregando estatísticas de frete...</p>
      </div>
    )
  }

  if (!shippingStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado de frete disponível
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
              <p className="text-sm font-medium text-gray-600">Total de Cálculos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shippingStats.overview.totalCalculations.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {shippingStats.overview.calculationsInPeriod} no período
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shippingStats.overview.successRate.toFixed(1)}%
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
              <p className="text-sm font-medium text-gray-600">Taxa de Recusa</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shippingStats.overview.rejectionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {shippingStats.rejectedCeps.length} CEPs diferentes
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
              <p className="text-sm font-medium text-gray-600">Frete Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                R$ {shippingStats.overview.avgShippingFee.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total: R$ {shippingStats.overview.totalShippingFees.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fretes Grátis</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shippingStats.overview.freeShippingCount}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fretes Pagos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shippingStats.overview.paidShippingCount}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Arrecadado em Frete</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                R$ {shippingStats.overview.totalShippingFees.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio Recusado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                R$ {shippingStats.overview.avgCartValueRejected.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-gray-500 mt-1">Valor médio quando recusado</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Detalhamento de Fretes Grátis por Motivo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Fretes Grátis por Motivo
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Detalhamento de quantos fretes grátis foram concedidos e por qual motivo.
        </p>
        {shippingStats.freeShippingByReason && shippingStats.freeShippingByReason.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shippingStats.freeShippingByReason.map((stat: any, index: number) => {
              const colorMap: Record<string, { bg: string; text: string; icon: any }> = {
                'promotion': { bg: 'bg-blue-100', text: 'text-blue-600', icon: Gift },
                'free_rule': { bg: 'bg-green-100', text: 'text-green-600', icon: CheckCircle },
                'threshold': { bg: 'bg-purple-100', text: 'text-purple-600', icon: TrendingUp },
                'promo_code': { bg: 'bg-orange-100', text: 'text-orange-600', icon: Tag },
              };
              const config = colorMap[stat.reason] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: Package };
              const Icon = config.icon;

              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${config.text}`} />
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
                      {stat.reasonLabel}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Valor total: R$ {stat.totalValue.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ticket médio: R$ {stat.avgValue.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhum frete grátis registrado no período
          </div>
        )}
      </div>

      {/* Gráfico de Fretes Grátis por Motivo */}
      {shippingStats.freeShippingByReason && shippingStats.freeShippingByReason.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição de Fretes Grátis por Motivo
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={shippingStats.freeShippingByReason}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="reasonLabel" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [value, 'Fretes Grátis']}
              />
              <Legend />
              <Bar dataKey="count" fill="#10b981" name="Quantidade de Fretes Grátis" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de Evolução */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Evolução de Cálculos de Frete
        </h2>
        {shippingStats.evolutionByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={shippingStats.evolutionByDay}>
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
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalCount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total de Cálculos"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="foundCount" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Regiões Encontradas"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="rejectedCount" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Regiões Recusadas"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="freeCount" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Fretes Grátis"
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

      {/* Top Regiões Mais Usadas */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Top 20 Regiões Mais Usadas
        </h2>
        {shippingStats.topRegions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Município
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Arrecadado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frete Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shippingStats.topRegions.map((region: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {region.municipality}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {region.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {region.totalFee.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {region.avgFee.toFixed(2).replace('.', ',')}
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

      {/* CEPs Recusados - Detalhado */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          CEPs Recusados (Regiões Não Atendidas)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Estes são os CEPs que clientes tentaram usar mas não estão configurados no sistema. 
          Use esta informação para identificar quais regiões expandir.
        </p>
        {shippingStats.rejectedCeps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CEP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tentativas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total dos Carrinhos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shippingStats.rejectedCeps.map((rejected: any, index: number) => (
                  <tr key={index} className={index < 10 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rejected.cep}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rejected.attemptCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {rejected.totalCartValue.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {rejected.avgCartValue.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shippingStats.rejectedCeps.length > 10 && (
              <p className="mt-4 text-sm text-yellow-600">
                💡 Os 10 primeiros CEPs estão destacados em amarelo - são os mais críticos para expansão
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhum CEP recusado no período
          </div>
        )}
      </div>

      {/* Regiões Recusadas por Prefixo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Regiões Recusadas Agrupadas por Prefixo de CEP
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          CEPs agrupados pelos primeiros 5 dígitos para identificar áreas geográficas que precisam de expansão.
        </p>
        {shippingStats.rejectedByPrefix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prefixo CEP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tentativas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CEPs Únicos
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
                {shippingStats.rejectedByPrefix.map((prefix: any, index: number) => (
                  <tr key={index} className={index < 5 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prefix.cepPrefix}XX-XXX
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prefix.attemptCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prefix.uniqueCeps}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {prefix.totalCartValue.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {prefix.avgCartValue.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shippingStats.rejectedByPrefix.length > 5 && (
              <p className="mt-4 text-sm text-red-600">
                🔴 As 5 primeiras regiões estão destacadas em vermelho - prioridade máxima para expansão
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Nenhuma região recusada no período
          </div>
        )}
      </div>

      {/* Top Usuários com CEPs Recusados */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Clientes que Mais Tentaram CEPs Recusados
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Estes clientes tentaram usar CEPs não configurados. Pode ser útil entrar em contato para entender suas necessidades.
        </p>
        {shippingStats.topUsersWithRejected.length > 0 ? (
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
                    Tentativas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CEPs Únicos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shippingStats.topUsersWithRejected.map((user: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.rejectionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.uniqueRejectedCeps}
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

      {/* Gráfico de Distribuição */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição: Sucesso vs Recusa
          </h2>
          {shippingStats.overview.totalCalculations > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Regiões Encontradas', value: shippingStats.overview.totalCalculations - (shippingStats.overview.totalCalculations * shippingStats.overview.rejectionRate / 100) },
                    { name: 'Regiões Recusadas', value: shippingStats.overview.totalCalculations * shippingStats.overview.rejectionRate / 100 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value.toFixed(0)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribuição: Grátis vs Pago
          </h2>
          {(shippingStats.overview.freeShippingCount + shippingStats.overview.paidShippingCount) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Fretes Grátis', value: shippingStats.overview.freeShippingCount },
                    { name: 'Fretes Pagos', value: shippingStats.overview.paidShippingCount },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
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
    </>
  )
}

