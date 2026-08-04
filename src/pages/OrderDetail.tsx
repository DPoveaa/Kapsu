import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Package, MapPin, CreditCard, Calendar, FileText, Truck, ExternalLink } from 'lucide-react'
import { adminService } from '../services/admin.service'
import { Building2 } from 'lucide-react'
import type { Supplier } from '../services/admin.service'
import { productsService } from '../services/products.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { getOrderStatusLabel, getOrderStatusBadgeClass } from '../utils/orderStatus'
import { useAuth } from '../context/AuthContext'
import { realtimeEventsClient } from '../services/realtime-events.client'
import { toast } from '../utils/toast'

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
  supplier_id?: string | null
  total: number
  status: string
  payment_method: string | null
  shipping_address: string | null
  shipping_method?: string | null
  shipping_postal_code?: string | null
  shipping_street?: string | null
  shipping_number?: string | null
  shipping_complement?: string | null
  shipping_neighborhood?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  created_at: string
  updated_at: string
  card_installments?: number | null
  card_installment_value?: number | string | null
  card_interest_free?: boolean | null
  installment_rule_id?: string | null
  invoice_url?: string | null
  invoice_number?: string | null
  shipping_label_url?: string | null
  shipping_fee?: number | null
  carrier_shipping_cost?: number | null
  shipping_subsidy_amount?: number | null
  financials?: {
    itemsSaleTotal: number
    itemsPurchaseTotal: number
    customerShippingFee: number
    carrierShippingCost: number
    shippingSubsidyAmount: number
    totalChargedCustomer: number
    totalSupplierPayout: number
    netProfit: number
  }
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

const ORDER_STATUS_OPTIONS = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_SHIPPING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [pendingStatus, setPendingStatus] = useState('')
  const [statusExplanation, setStatusExplanation] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pendingSupplierId, setPendingSupplierId] = useState('')
  const [updatingSupplier, setUpdatingSupplier] = useState(false)

  // Notaas NF-e State
  const [notaasInvoice, setNotaasInvoice] = useState<any | null>(null)
  const [issuingNotaas, setIssuingNotaas] = useState(false)
  const [reconcilingNotaas, setReconcilingNotaas] = useState(false)

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  useEffect(() => {
    if (id) {
      loadOrderDetails()
      if (isAdmin) {
        loadNotaasInvoice()
      }
    }
  }, [id, isAdmin])

  const loadNotaasInvoice = async () => {
    if (!id) return
    try {
      const inv = await adminService.getNotaasInvoiceByOrder(id)
      setNotaasInvoice(inv)
    } catch (err) {
      console.warn('Falha ao carregar NF-e Notaas:', err)
    }
  }

  const handleIssueNotaas = async () => {
    if (!id) return
    if (!window.confirm('Confirma a solicitação de emissão da NF-e no Notaas para este pedido?')) return
    try {
      setIssuingNotaas(true)
      const data = await adminService.issueNotaasInvoice(id)
      toast.success('Solicitação de NF-e enviada ao Notaas com sucesso!')
      setNotaasInvoice(data)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao emitir NF-e Notaas')
    } finally {
      setIssuingNotaas(false)
    }
  }

  const handleReconcileNotaas = async () => {
    if (!id) return
    try {
      setReconcilingNotaas(true)
      const data = await adminService.reconcileNotaasInvoice(id)
      toast.success('Status da NF-e reconciliado com sucesso!')
      setNotaasInvoice(data)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reconciliar NF-e')
    } finally {
      setReconcilingNotaas(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    adminService.listSuppliers(1, 100)
      .then(response => setSuppliers(response.suppliers || []))
      .catch((err: any) => {
        console.error('Erro ao carregar fornecedores:', err)
        toast.error('Não foi possível carregar a lista de fornecedores.')
      })
  }, [isAdmin])

  useEffect(() => {
    if (!id) return
    const unsubscribe = realtimeEventsClient.subscribe((event) => {
      if (event.orderId === id) {
        loadNotaasInvoice()
        loadOrderDetails()
      }
    })
    return () => unsubscribe()
  }, [id])

  useEffect(() => {
    if (!id || !notaasInvoice) return
    const status = String(notaasInvoice.status || '').toUpperCase()
    if (['QUEUED', 'PROCESSING'].includes(status)) {
      const interval = setInterval(() => {
        loadNotaasInvoice()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [id, notaasInvoice?.status])

  const loadOrderDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const response = await adminService.getOrderDetails(id)
      if (response.success) {
        setOrder(response.data)
        setPendingStatus(response.data.status)
        setPendingSupplierId(response.data.supplier_id || '')
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
      credit_card: 'Cartão de Crédito',
      pix: 'PIX',
      cash: 'Dinheiro',
      mercado_pago: 'Mercado Pago',
    }
    return methods[method] || method
  }

  const handleUpdateStatus = async () => {
    if (!id || !order || pendingStatus === order.status) return

    if (!statusExplanation.trim()) {
      toast.error('Por favor, insira a justificativa/motivo para esta alteração manual.')
      return
    }

    try {
      setUpdatingStatus(true)
      const response = await adminService.updateOrderStatus(id, pendingStatus, statusExplanation)
      if (response.success) {
        setOrder(response.data)
        setPendingStatus(response.data.status)
        setStatusExplanation('')
        toast.success('Status do pedido atualizado com sucesso')
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status do pedido:', err)
      toast.error(err.message || 'Erro ao atualizar status do pedido')
      setPendingStatus(order.status)
    } finally {
      setUpdatingStatus(false)
    }
  }


  const handleUpdateSupplier = async () => {
    if (!id || !order || pendingSupplierId === (order.supplier_id || '')) return
    try {
      setUpdatingSupplier(true)
      const supplierId = pendingSupplierId || null
      await adminService.assignOrdersSupplier([id], supplierId)
      setOrder(current => current ? { ...current, supplier_id: supplierId } : current)
      toast.success(supplierId ? 'Fornecedor vinculado com sucesso.' : 'Vínculo com fornecedor removido.')
    } catch (err: any) {
      console.error('Erro ao vincular fornecedor:', err)
      toast.error(err.message || 'Erro ao vincular fornecedor ao pedido.')
      setPendingSupplierId(order.supplier_id || '')
    } finally {
      setUpdatingSupplier(false)
    }
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

        {isAdmin && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 items-end border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex-1 w-full">
                  <label htmlFor="order-supplier" className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Fornecedor responsável
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-3 text-gray-400" />
                    <select
                      id="order-supplier"
                      value={pendingSupplierId}
                      onChange={(event) => setPendingSupplierId(event.target.value)}
                      disabled={updatingSupplier}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                    >
                      <option value="">Sem fornecedor vinculado</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id} disabled={!supplier.active && supplier.id !== order.supplier_id}>
                          {supplier.trade_name || supplier.name}{supplier.active ? '' : ' (inativo)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" onClick={handleUpdateSupplier} disabled={updatingSupplier || pendingSupplierId === (order.supplier_id || '')} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg min-w-[160px]">
                  {updatingSupplier && <Loader2 size={17} className="animate-spin mr-2" />}
                  Salvar fornecedor
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 w-full">
                  <label htmlFor="order-status" className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Status do pedido
                  </label>
                  <select
                    id="order-status"
                    value={pendingStatus}
                    onChange={(e) => setPendingStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {getOrderStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
                {pendingStatus === order.status && (
                  <button
                    type="button"
                    disabled
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-gray-400 dark:bg-gray-700 text-white rounded-lg min-w-[140px]"
                  >
                    Salvar status
                  </button>
                )}
              </div>

              {pendingStatus !== order.status && (
                <div className="mt-2 w-full animate-fade-in">
                  <label htmlFor="status-explanation" className="block text-xs font-semibold uppercase text-red-500 dark:text-red-400 mb-1">
                    Justificativa da Alteração Manual *
                  </label>
                  <textarea
                    id="status-explanation"
                    placeholder="Explique o porquê desta alteração de status (ex: Cliente solicitou cancelamento por arrependimento, pagamento via pix não compensado, etc). Esta justificativa ficará disponível para auditoria e no chatbot."
                    value={statusExplanation}
                    onChange={(e) => setStatusExplanation(e.target.value)}
                    disabled={updatingStatus}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-60"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={updatingStatus || !statusExplanation.trim()}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors min-w-[150px] shadow"
                    >
                      {updatingStatus ? (
                        <Loader2 size={18} className="animate-spin mr-2" />
                      ) : null}
                      Confirmar Alteração
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            {(order.shipping_address || order.shipping_method) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MapPin className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                    Endereço de Entrega
                  </h2>
                </div>
                <div className="px-6 py-4">
                  {order.shipping_method && <p className="mb-3 text-sm font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2"><Truck size={17} /> {order.shipping_method}</p>}
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{order.shipping_address || 'Endereço não informado'}</p>
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
              <div className="px-6 py-4 space-y-3.5">
                {/* Subtotal dos Produtos */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Produtos ({order.items.length} {order.items.length === 1 ? 'item' : 'itens'})</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    R$ {(order.financials?.itemsSaleTotal ?? order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Frete do Cliente */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Truck size={15} className="text-gray-400" />
                    Frete do Cliente
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {(order.financials?.customerShippingFee ?? order.shipping_fee ?? 0) === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Grátis</span>
                    ) : (
                      `R$ ${(order.financials?.customerShippingFee ?? order.shipping_fee ?? 0).toFixed(2).replace('.', ',')}`
                    )}
                  </span>
                </div>

                {/* Detalhamento de Frete e Subsídio para o Admin */}
                {isAdmin && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700/70 bg-gray-50/80 dark:bg-gray-900/60 p-3 space-y-2 text-xs">
                    <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-1.5">
                      <span>Detalhamento de Frete</span>
                      <span className="text-[10px] text-gray-400 font-normal">{order.shipping_method || 'Correios'}</span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>Custo na Transportadora:</span>
                      <span className="font-mono font-medium text-gray-900 dark:text-white">
                        R$ {(order.financials?.carrierShippingCost ?? order.carrier_shipping_cost ?? order.shipping_fee ?? 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {(order.financials?.shippingSubsidyAmount ?? order.shipping_subsidy_amount ?? 0) > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                        <span>Subsídio Absorvido (Kapsu):</span>
                        <span className="font-mono font-semibold">
                          - R$ {(order.financials?.shippingSubsidyAmount ?? order.shipping_subsidy_amount ?? 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Cobrado do Cliente */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total Cobrado</span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      R$ {Number(order.total).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Lucro Líquido & Repasse Fornecedor (Visível para Admin) */}
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>Custo de Compra (Fornecedor):</span>
                      <span className="font-mono">R$ {(order.financials?.itemsPurchaseTotal ?? 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>Repasse Total (Produtos + Frete):</span>
                      <span className="font-mono">R$ {(order.financials?.totalSupplierPayout ?? 0).toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div className={`mt-2 flex justify-between items-center p-2.5 rounded-xl border font-semibold ${
                      (order.financials?.netProfit ?? 0) >= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider">Lucro Líquido Kapsu</span>
                      <span className="text-base font-mono font-black">
                        {(order.financials?.netProfit ?? 0) >= 0 ? '+' : ''} R$ {(order.financials?.netProfit ?? 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                {order.payment_method === 'credit_card' && order.card_installments && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Parcelamento</p>
                    <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                      {order.card_installments}x de R${' '}
                      {Number(order.card_installment_value || 0)
                        .toFixed(2)
                        .replace('.', ',')}{' '}
                      {order.card_interest_free ? 'sem juros' : 'com juros'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            
            {/* Nota Fiscal Eletrônica (Notaas NF-e Modelo 55) */}
            {isAdmin && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FileText className="mr-2 text-primary-500" size={20} />
                    Nota Fiscal Eletrônica (NF-e Modelo 55)
                  </h2>
                  {notaasInvoice && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      notaasInvoice.environment === 'producao' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {notaasInvoice.environment === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
                    </span>
                  )}
                </div>
                <div className="px-6 py-4 space-y-4">
                  {notaasInvoice ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500 font-medium">Provedor Fiscal</p>
                          <p className="font-semibold text-gray-900 dark:text-white uppercase">{notaasInvoice.provider || 'Notaas'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Status da Emissão</p>
                          <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-xs font-semibold ${
                            notaasInvoice.status === 'ISSUED' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                            notaasInvoice.status === 'ERROR' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                            notaasInvoice.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {notaasInvoice.status}
                          </span>
                        </div>
                        {notaasInvoice.invoice_number && (
                          <div>
                            <p className="text-gray-500 font-medium">Número / Série</p>
                            <p className="font-semibold text-gray-900 dark:text-white">Nº {notaasInvoice.invoice_number} (Série {notaasInvoice.series || '3'})</p>
                          </div>
                        )}
                        {notaasInvoice.notaas_invoice_id && (
                          <div>
                            <p className="text-gray-500 font-medium">Notaas Invoice ID</p>
                            <p className="font-mono text-gray-700 dark:text-gray-300">{notaasInvoice.notaas_invoice_id}</p>
                          </div>
                        )}
                      </div>

                      {notaasInvoice.access_key && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Chave de Acesso SEFAZ</p>
                          <p className="font-mono text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 break-all select-all mt-1">
                            {notaasInvoice.access_key}
                          </p>
                        </div>
                      )}

                      {notaasInvoice.sefaz_status_message && (
                        <div className={`p-2.5 rounded text-xs border ${
                          notaasInvoice.status === 'ERROR' ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'
                        }`}>
                          <p className="font-semibold">SEFAZ: {notaasInvoice.sefaz_status_code || ''}</p>
                          <p>{notaasInvoice.sefaz_status_message}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {notaasInvoice.danfe_available && (
                          <a
                            href={adminService.getNotaasDanfeUrl(notaasInvoice.notaas_invoice_id || notaasInvoice.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition"
                          >
                            <ExternalLink size={13} />
                            Baixar DANFE (PDF)
                          </a>
                        )}
                        {notaasInvoice.xml_available && (
                          <a
                            href={adminService.getNotaasXmlUrl(notaasInvoice.notaas_invoice_id || notaasInvoice.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold transition"
                          >
                            <FileText size={13} />
                            Baixar XML
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={reconcilingNotaas}
                          onClick={handleReconcileNotaas}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition"
                        >
                          {reconcilingNotaas ? 'Consultando...' : 'Reconciliar Status'}
                        </button>

                        {notaasInvoice.status === 'ERROR' && (
                          <button
                            type="button"
                            disabled={issuingNotaas}
                            onClick={handleIssueNotaas}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
                          >
                            {issuingNotaas ? 'Reenviando...' : 'Tentar Reemissão'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Nenhuma NF-e emitida para este pedido no Notaas.
                      </p>
                      <button
                        type="button"
                        disabled={issuingNotaas}
                        onClick={handleIssueNotaas}
                        className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition shadow-sm"
                      >
                        {issuingNotaas ? 'Solicitando...' : 'Emitir NF-e Notaas'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
