import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, Eye, Package, Plus } from 'lucide-react'
import { adminService } from '../services/admin.service'
import CreateOrderModal from '../components/CreateOrderModal'

interface Order {
  id: string
  user_id: string
  total: number
  status: string
  payment_method: string | null
  shipping_address: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  } | null
}

export default function ManageOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Carrega pedidos
  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminService.listOrders()
      setOrders(response.data || [])
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err)
      setError(err.message || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Filtra pedidos
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase()
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.user?.name.toLowerCase().includes(searchLower) ||
      order.user?.email.toLowerCase().includes(searchLower) ||
      order.status.toLowerCase().includes(searchLower)
    )
  })

  // Formata status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      AWAITING_PAYMENT: { label: 'Aguardando Pagamento', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
      PENDING: { label: 'Aguardando Pagamento', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
      PAID: { label: 'Pago', className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
      CONFIRMED: { label: 'Pago', className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
      DISTRIBUTOR_INFORMED: { label: 'Solicitado na Distribuidora', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
      PROCESSING: { label: 'Processando', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
      SHIPPED: { label: 'Enviado', className: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
      DELIVERED: { label: 'Entregue', className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
    }

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  // Formata data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111827]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Voltar
          </button>
        </div>

        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Gerenciar Pedidos</h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Visualize e gerencie todos os pedidos do sistema</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            Criar Pedido Manual
          </button>
        </div>

        {/* Busca */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar pedidos por ID, cliente, email ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Estatísticas */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-[#0F828C]">
              <div className="flex items-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 mr-2 sm:mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total de Pedidos</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-[#0F828C]">
              <div className="flex items-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 mr-2 sm:mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Valor Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                    R$ {orders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-[#0F828C] sm:col-span-2 lg:col-span-1">
              <div className="flex items-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400 mr-2 sm:mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Pedidos Pendentes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {orders.filter(o => o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400 w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadOrders}
              className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabela de Pedidos - Desktop / Cards - Mobile */}
        {!loading && !error && (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden lg:block bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-[#0F828C]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-[#0F828C]">
                  <thead className="bg-gray-50 dark:bg-[#065084]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID do Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Método de Pagamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#065084] divide-y divide-gray-200 dark:divide-[#0F828C]">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          {orders.length === 0 ? 'Nenhum pedido encontrado' : 'Nenhum pedido corresponde à busca'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-[#065084]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              #{order.id.substring(0, 8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.user ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{order.user.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-300">{order.user.email}</div>
                                {order.user.phone && (
                                  <div className="text-xs text-gray-400 dark:text-gray-400">{order.user.phone}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 dark:text-gray-300">Usuário não encontrado</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              R$ {Number(order.total).toFixed(2).replace('.', ',')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {order.payment_method || 'Não informado'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(order.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 inline-flex items-center"
                              title="Ver detalhes"
                            >
                              <Eye size={18} className="mr-1" />
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Cards */}
            <div className="lg:hidden space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {orders.length === 0 ? 'Nenhum pedido encontrado' : 'Nenhum pedido corresponde à busca'}
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">ID:</span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">#{order.id.substring(0, 8)}</span>
                        </div>
                        {order.user ? (
                          <div className="mb-2">
                            <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-words">{order.user.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 break-words">{order.user.email}</p>
                            {order.user.phone && (
                              <p className="text-xs text-gray-400 dark:text-gray-400">{order.user.phone}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mb-2">Usuário não encontrado</p>
                        )}
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 mb-3 pt-2 border-t border-gray-200 dark:border-[#0F828C]">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total:</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          R$ {Number(order.total).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Pagamento:</span>
                        <span className="text-gray-900 dark:text-white break-words text-right">
                          {order.payment_method || 'Não informado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Data:</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-[#0F828C]">
                      <button
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                      >
                        <Eye size={14} className="sm:w-4 sm:h-4" />
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Modal de Criar Pedido */}
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            loadOrders()
            setIsCreateModalOpen(false)
          }}
        />
      </div>
    </div>
  )
}

