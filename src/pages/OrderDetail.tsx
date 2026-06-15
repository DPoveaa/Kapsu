import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Package, User, MapPin, CreditCard, Calendar, FileText } from 'lucide-react'
import { adminService } from '../services/admin.service'
import { productsService } from '../services/products.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { getOrderStatusLabel, getOrderStatusBadgeClass } from '../utils/orderStatus'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    description: string | null
    price: number
    image: string | null
  } | null
}

interface OrderDetail {
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
    address: string | null
    cpf: string | null
  } | null
  items: OrderItem[]
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  useEffect(() => {
    if (id) {
      loadOrderDetails()
    }
  }, [id])

  const loadOrderDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const response = await adminService.getOrderDetails(id)
      if (response.success) {
        setOrder(response.data)
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do pedido:', err)
      setError(err.message || 'Erro ao carregar detalhes do pedido')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getOrderStatusBadgeClass(status)}`}>
        {getOrderStatusLabel(status)}
      </span>
    )
  }

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

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'Não informado'
    const methods: Record<string, string> = {
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
      pix: 'PIX',
      cash: 'Dinheiro',
    }
    return methods[method] || method
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary-600" size={48} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md p-6 text-center">
            <p className="text-red-650 dark:text-red-400 text-lg font-semibold mb-2">
              {error || 'Pedido não encontrado'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              O pedido que você está procurando não existe ou foi removido.
            </p>
            <button
              onClick={() => navigate('/admin/orders')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Voltar para Pedidos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detalhes do Pedido</h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Pedido #{order.id.substring(0, 8)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Itens do Pedido */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Package className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                  Itens do Pedido
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {order.items.map((item) => (
                  <div key={item.id} className="p-6 flex items-start space-x-4">
                    {item.product?.image && (
                      <img
                        src={productsService.getImageUrl(item.product.image)}
                        alt={item.product.name}
                        className="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-1"
                        onError={handleProductImageError}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {item.product?.name || 'Produto não encontrado'}
                      </h3>
                      {item.product?.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                          {item.product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Quantidade: <span className="font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          R$ {(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        R$ {Number(item.price).toFixed(2).replace('.', ',')} cada
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Endereço de Entrega */}
            {order.shipping_address && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MapPin className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                    Endereço de Entrega
                  </h2>
                </div>
                <div className="px-6 py-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{order.shipping_address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Informações do Pedido */}
          <div className="space-y-6">
            {/* Resumo do Pedido */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileText className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                  Resumo
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal ({order.items.length} {order.items.length === 1 ? 'item' : 'itens'})</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    R$ {order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      R$ {Number(order.total).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            {order.user && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <User className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                    Cliente
                  </h2>
                </div>
                <div className="px-6 py-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Nome</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-0.5">{order.user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                    <p className="text-gray-900 dark:text-gray-300 mt-0.5 break-all">{order.user.email}</p>
                  </div>
                  {order.user.phone && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Telefone</p>
                      <p className="text-gray-900 dark:text-gray-300 mt-0.5">{order.user.phone}</p>
                    </div>
                  )}
                  {order.user.cpf && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">CPF</p>
                      <p className="text-gray-900 dark:text-gray-300 mt-0.5">{order.user.cpf}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações de Pagamento */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <CreditCard className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                  Pagamento
                </h2>
              </div>
              <div className="px-6 py-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Método de Pagamento</p>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">{formatPaymentMethod(order.payment_method)}</p>
                </div>
              </div>
            </div>

            {/* Informações de Data */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                  Datas
                </h2>
              </div>
              <div className="px-6 py-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Data de Criação</p>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                {order.updated_at !== order.created_at && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Última Atualização</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-0.5">{formatDate(order.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
