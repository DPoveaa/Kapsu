import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Package, User, MapPin, CreditCard, Calendar, FileText } from 'lucide-react'
import { adminService } from '../services/admin.service'

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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement
    target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
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
    const statusMap: Record<string, { label: string; className: string }> = {
      AWAITING_PAYMENT: { label: 'Aguardando Pagamento', className: 'bg-yellow-100 text-yellow-800' },
      PENDING: { label: 'Aguardando Pagamento', className: 'bg-yellow-100 text-yellow-800' },
      PAID: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      CONFIRMED: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      DISTRIBUTOR_INFORMED: { label: 'Solicitado na Distribuidora', className: 'bg-blue-100 text-blue-800' },
      PROCESSING: { label: 'Processando', className: 'bg-purple-100 text-purple-800' },
      SHIPPED: { label: 'Enviado', className: 'bg-indigo-100 text-indigo-800' },
      DELIVERED: { label: 'Entregue', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    }

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-red-600 text-lg font-semibold mb-2">
              {error || 'Pedido não encontrado'}
            </p>
            <p className="text-gray-500 mb-4">
              O pedido que você está procurando não existe ou foi removido.
            </p>
            <button
              onClick={() => navigate('/admin/pedidos')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Voltar para Pedidos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Detalhes do Pedido</h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-gray-600">Pedido #{order.id.substring(0, 8)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Itens do Pedido */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="mr-2" size={20} />
                  Itens do Pedido
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <div key={item.id} className="p-6 flex items-start space-x-4">
                    {item.product?.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        onError={handleImageError}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {item.product?.name || 'Produto não encontrado'}
                      </h3>
                      {item.product?.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                          {item.product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Quantidade: <span className="font-medium">{item.quantity}</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          R$ {(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        R$ {Number(item.price).toFixed(2).replace('.', ',')} cada
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Endereço de Entrega */}
            {order.shipping_address && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="mr-2" size={20} />
                    Endereço de Entrega
                  </h2>
                </div>
                <div className="px-6 py-4">
                  <p className="text-gray-700 whitespace-pre-line">{order.shipping_address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Informações do Pedido */}
          <div className="space-y-6">
            {/* Resumo do Pedido */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="mr-2" size={20} />
                  Resumo
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal ({order.items.length} {order.items.length === 1 ? 'item' : 'itens'})</span>
                  <span className="text-gray-900 font-medium">
                    R$ {order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      R$ {Number(order.total).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            {order.user && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <User className="mr-2" size={20} />
                    Cliente
                  </h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="text-gray-900 font-medium">{order.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{order.user.email}</p>
                  </div>
                  {order.user.phone && (
                    <div>
                      <p className="text-sm text-gray-500">Telefone</p>
                      <p className="text-gray-900">{order.user.phone}</p>
                    </div>
                  )}
                  {order.user.cpf && (
                    <div>
                      <p className="text-sm text-gray-500">CPF</p>
                      <p className="text-gray-900">{order.user.cpf}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações de Pagamento */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="mr-2" size={20} />
                  Pagamento
                </h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Método de Pagamento</p>
                  <p className="text-gray-900 font-medium">{formatPaymentMethod(order.payment_method)}</p>
                </div>
              </div>
            </div>

            {/* Informações de Data */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Datas
                </h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Data de Criação</p>
                  <p className="text-gray-900 font-medium">{formatDate(order.created_at)}</p>
                </div>
                {order.updated_at !== order.created_at && (
                  <div>
                    <p className="text-sm text-gray-500">Última Atualização</p>
                    <p className="text-gray-900 font-medium">{formatDate(order.updated_at)}</p>
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

