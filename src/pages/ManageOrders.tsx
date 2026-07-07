import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, Eye, Package, Plus, Trash2, ChevronDown } from 'lucide-react'
import { adminService } from '../services/admin.service'
import CreateOrderModal from '../components/CreateOrderModal'
import { useAuth } from '../context/AuthContext'
import { confirm, toast } from '../utils/toast'
import { getOrderStatusLabel, getOrderStatusBadgeClass } from '../utils/orderStatus'

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

type OrdersTab = 'active' | 'cancelled'
type OrdersSortKey = 'created_at' | 'total' | 'customer' | 'status' | 'payment_method' | 'id'
type SortDirection = 'asc' | 'desc'

const CANCELLED_ORDER_STATUS_CODES = new Set([
  'CANCELLED',
  'REFUNDED',
  'REFUND_REQUESTED',
  'REFUND_IN_PROGRESS',
  'CHARGEBACK_REQUESTED',
  'CHARGEBACK_DISPUTE',
  'AWAITING_CHARGEBACK_REVERSAL',
])

const isCancelledOrderStatus = (status: string | null | undefined) => {
  return CANCELLED_ORDER_STATUS_CODES.has((status || '').toUpperCase())
}

export default function ManageOrders() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<OrdersTab>('active')
  const [ordersSort, setOrdersSort] = useState<{ key: OrdersSortKey; direction: SortDirection }>({
    key: 'created_at',
    direction: 'desc',
  })

  const handleDeleteOrder = (orderId: string) => {
    confirm.show(
      'Tem certeza de que deseja excluir este pedido de teste? Esta ação não pode ser desfeita e removerá permanentemente os itens e registros relacionados.',
      async () => {
        try {
          setDeletingId(orderId)
          await adminService.deleteOrder(orderId)
          toast.success('Pedido de teste excluído com sucesso!')
          loadOrders()
        } catch (err: any) {
          console.error('Erro ao excluir pedido:', err)
          toast.error(err.message || 'Erro ao excluir pedido')
        } finally {
          setDeletingId(null)
        }
      },
      undefined,
      'Excluir',
      'Cancelar'
    )
  }

  const handleDeleteAllTestOrders = () => {
    confirm.show(
      'Tem certeza de que deseja excluir TODOS os pedidos de teste de uma vez? Esta ação removerá permanentemente todos os registros de pedidos com método de pagamento de teste.',
      async () => {
        try {
          setBulkDeleting(true)
          const result = await adminService.deleteTestOrders()
          toast.success(`${result.deletedCount || 0} pedido(s) de teste excluído(s) com sucesso!`)
          loadOrders()
        } catch (err: any) {
          console.error('Erro ao excluir pedidos de teste:', err)
          toast.error(err.message || 'Erro ao excluir pedidos de teste')
        } finally {
          setBulkDeleting(false)
        }
      },
      undefined,
      'Excluir Todos',
      'Cancelar'
    )
  }

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

  const activeOrders = useMemo(() => orders.filter(order => !isCancelledOrderStatus(order.status)), [orders])
  const cancelledOrders = useMemo(() => orders.filter(order => isCancelledOrderStatus(order.status)), [orders])
  const tabOrders = activeTab === 'cancelled' ? cancelledOrders : activeOrders

  const getOrderSortValue = (order: Order, key: OrdersSortKey): string | number => {
    switch (key) {
      case 'created_at':
        return new Date(order.created_at).getTime()
      case 'total':
        return Number(order.total) || 0
      case 'customer':
        return order.user?.name || order.user?.email || 'Usuário não encontrado'
      case 'status':
        return getOrderStatusLabel(order.status)
      case 'payment_method':
        return order.payment_method || 'Não informado'
      case 'id':
        return order.id
      default:
        return ''
    }
  }

  const filteredOrders = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase()
    const list = tabOrders.filter(order => {
      if (!searchLower) return true
      return (
        order.id.toLowerCase().includes(searchLower) ||
        order.user?.name.toLowerCase().includes(searchLower) ||
        order.user?.email.toLowerCase().includes(searchLower) ||
        order.user?.phone?.toLowerCase().includes(searchLower) ||
        order.status.toLowerCase().includes(searchLower) ||
        getOrderStatusLabel(order.status).toLowerCase().includes(searchLower) ||
        (order.payment_method || '').toLowerCase().includes(searchLower)
      )
    })

    const directionFactor = ordersSort.direction === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = getOrderSortValue(a, ordersSort.key)
      const bv = getOrderSortValue(b, ordersSort.key)

      const result = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base', numeric: true })

      if (result !== 0) return result * directionFactor
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [tabOrders, searchTerm, ordersSort])

  const handleOrdersSort = (key: OrdersSortKey) => {
    setOrdersSort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }

      const defaultDirection: SortDirection = key === 'total' || key === 'created_at' ? 'desc' : 'asc'
      return { key, direction: defaultDirection }
    })
  }

  const renderSortableHeader = (key: OrdersSortKey, label: string) => {
    const isActive = ordersSort.key === key
    return (
      <button
        type="button"
        onClick={() => handleOrdersSort(key)}
        className={`group inline-flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${isActive ? 'text-primary-700 dark:text-primary-300' : 'hover:text-gray-700 dark:hover:text-white'}`}
        title={`Ordenar por ${label}`}
        aria-sort={isActive ? (ordersSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          className={`transition-all ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'} ${isActive && ordersSort.direction === 'asc' ? 'rotate-180' : ''}`}
        />
      </button>
    )
  }

  const TABS = [
    {
      key: 'active' as OrdersTab,
      label: 'Ativos',
      count: activeOrders.length,
      active: 'border-green-500 text-green-700 dark:text-green-300',
      badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    },
    {
      key: 'cancelled' as OrdersTab,
      label: 'Cancelados',
      count: cancelledOrders.length,
      active: 'border-red-500 text-red-700 dark:text-red-300',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    },
  ]

  // Formata status
  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusBadgeClass(status)}`}>
        {getOrderStatusLabel(status)}
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
    <div className="w-full">
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

        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Gerenciar Pedidos</h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Visualize e gerencie todos os pedidos do sistema</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            {isAdmin && orders.some(o => o.payment_method && (o.payment_method.toLowerCase() === 'test_payment' || o.payment_method.toLowerCase() === 'test payment')) && (
              <button
                onClick={handleDeleteAllTestOrders}
                disabled={bulkDeleting}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50 shadow-sm shadow-red-500/20"
              >
                {bulkDeleting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                Limpar Pedidos de Teste
              </button>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 text-sm sm:text-base bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto shadow-sm shadow-green-500/20"
            >
              <Plus size={18} className="sm:w-5 sm:h-5" />
              Criar Pedido Manual
            </button>
          </div>
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
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Estatísticas */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 mr-2 sm:mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total de Pedidos</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 mr-2 sm:mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Valor Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                    R$ {activeOrders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400 mr-2 sm:mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Pedidos Pendentes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {activeOrders.filter(o => o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT').length}
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
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-1 pb-3 border-b-2 text-sm font-semibold transition-colors ${
                      activeTab === tab.key
                        ? tab.active
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab.key ? tab.badge : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table wrapper with horizontal scroll and responsive design */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {renderSortableHeader('id', 'ID do Pedido')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {renderSortableHeader('customer', 'Cliente')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {renderSortableHeader('total', 'Total')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {renderSortableHeader('status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {renderSortableHeader('payment_method', 'Método de Pagamento')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {renderSortableHeader('created_at', 'Data')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          {tabOrders.length === 0
                            ? activeTab === 'cancelled'
                              ? 'Nenhum pedido cancelado encontrado'
                              : 'Nenhum pedido ativo encontrado'
                            : 'Nenhum pedido corresponde à busca'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="group hover:bg-gray-50 dark:hover:bg-[#065084]/40 transition-colors">
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
                              {order.payment_method === 'credit_card' || order.payment_method === 'credit'
                                ? 'Cartão de Crédito'
                                : order.payment_method === 'pix'
                                ? 'PIX'
                                : order.payment_method === 'cash'
                                ? 'Dinheiro'
                                : order.payment_method || 'Não informado'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(order.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-[#153e5c] z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.2)] transition-colors">
                            <div className="inline-flex items-center gap-3">
                              <button
                                onClick={() => navigate(`/admin/orders/${order.id}`)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                                title="Ver detalhes"
                              >
                                <Eye size={18} className="mr-1" />
                                Detalhes
                              </button>
                              {isAdmin && order.payment_method && (order.payment_method.toLowerCase() === 'test_payment' || order.payment_method.toLowerCase() === 'test payment') && (
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  disabled={deletingId === order.id}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded px-1.5 py-0.5 disabled:opacity-50 transition-colors"
                                  title="Excluir pedido de teste"
                                >
                                  {deletingId === order.id ? (
                                    <Loader2 size={18} className="animate-spin mr-1" />
                                  ) : (
                                    <Trash2 size={18} className="mr-1" />
                                  )}
                                  Excluir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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

