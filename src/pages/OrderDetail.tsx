import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Package, MapPin, CreditCard, Calendar, FileText, Truck, ExternalLink, Copy } from 'lucide-react'
import { adminService } from '../services/admin.service'
import { Building2 } from 'lucide-react'
import type { Supplier } from '../services/admin.service'
import { productsService } from '../services/products.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { getOrderStatusLabel, getOrderStatusBadgeClass } from '../utils/orderStatus'
import { useAuth } from '../context/AuthContext'
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

  // Invoice (NFe) state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('')
  const [shippingLabelFile, setShippingLabelFile] = useState<File | null>(null)
  const [savingInvoice, setSavingInvoice] = useState(false)

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  useEffect(() => {
    if (id) {
      loadOrderDetails()
    }
  }, [id])

  useEffect(() => {
    if (!isAdmin) return
    adminService.listSuppliers(1, 100)
      .then(response => setSuppliers(response.suppliers || []))
      .catch((err: any) => {
        console.error('Erro ao carregar fornecedores:', err)
        toast.error('Não foi possível carregar a lista de fornecedores.')
      })
  }, [isAdmin])

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
        setInvoiceNumberInput(response.data.invoice_number || '')
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

            
            {/* Nota Fiscal / NFe */}
            {isAdmin && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FileText className="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                    Nota Fiscal (NFe)
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceNumberInput(order.invoice_number || '')
                      setInvoiceFile(null)
                      setShippingLabelFile(null)
                      setShowInvoiceForm(v => !v)
                    }}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {showInvoiceForm ? 'Cancelar' : order.invoice_url || order.invoice_number ? 'Editar' : '+ Vincular'}
                  </button>
                </div>
                <div className="px-6 py-4">
                  {showInvoiceForm ? (
                    <div className="space-y-3">
                      {/* Upload da NFe (PDF) */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Arquivo da NFe (PDF)
                          {order.invoice_url && <span className="ml-2 text-green-600 dark:text-green-400 font-normal">✓ PDF vinculado</span>}
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={e => setInvoiceFile(e.target.files?.[0] ?? null)}
                          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
                        />
                        {invoiceFile && <p className="text-[10px] text-gray-500 mt-1">{invoiceFile.name}</p>}
                      </div>
                      {/* Número / Chave da NFe */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Número / Chave da NFe</label>
                        <input
                          type="text"
                          placeholder="Ex: NF-001234 ou Chave de Acesso"
                          value={invoiceNumberInput}
                          onChange={e => setInvoiceNumberInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      {/* Upload da Etiqueta ML (PDF) */}
                      {order.shipping_method?.toLowerCase().includes('mercado') && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Etiqueta de Envio ML (PDF)
                            {order.shipping_label_url && <span className="ml-2 text-green-600 dark:text-green-400 font-normal">✓ PDF vinculado</span>}
                          </label>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={e => setShippingLabelFile(e.target.files?.[0] ?? null)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-900/30 dark:file:text-amber-300"
                          />
                          {shippingLabelFile && <p className="text-[10px] text-gray-500 mt-1">{shippingLabelFile.name}</p>}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {(order.invoice_url || order.invoice_number) && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setSavingInvoice(true)
                                const fd = new FormData()
                                fd.append('remove', 'true')
                                const token = localStorage.getItem('kapsu_token')
                                const res = await fetch(`${(adminService as any).baseUrl}/orders/${order.id}/invoice`, {
                                  method: 'PATCH',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: fd,
                                })
                                if (!res.ok) throw new Error('Erro ao remover NFe')
                                setOrder(prev => prev ? { ...prev, invoice_url: null, invoice_number: null } : prev)
                                setInvoiceNumberInput('')
                                setInvoiceFile(null)
                                setShowInvoiceForm(false)
                                toast.success('Nota Fiscal removida.')
                              } catch (err: any) {
                                toast.error(err.message || 'Erro ao remover NFe')
                              } finally {
                                setSavingInvoice(false)
                              }
                            }}
                            className="text-[11px] text-rose-500 hover:underline"
                          >
                            Remover NFe
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={savingInvoice || (!invoiceFile && !invoiceNumberInput.trim() && !shippingLabelFile)}
                          onClick={async () => {
                            try {
                              setSavingInvoice(true)
                              // Salvar Etiqueta ML se arquivo selecionado
                              if (shippingLabelFile) {
                                const fd = new FormData()
                                fd.append('file', shippingLabelFile)
                                const token = localStorage.getItem('kapsu_token')
                                const res = await fetch(`${(adminService as any).baseUrl}/orders/${order.id}/shipping-label`, {
                                  method: 'PATCH',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: fd,
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.message || 'Erro ao salvar etiqueta')
                                setOrder(prev => prev ? { ...prev, shipping_label_url: data.shipping_label_url } : prev)
                                setShippingLabelFile(null)
                              }
                              // Salvar NFe (arquivo e/ou número)
                              if (invoiceFile || invoiceNumberInput.trim()) {
                                const fd = new FormData()
                                if (invoiceFile) fd.append('file', invoiceFile)
                                if (invoiceNumberInput.trim()) fd.append('invoice_number', invoiceNumberInput.trim())
                                const token = localStorage.getItem('kapsu_token')
                                const res = await fetch(`${(adminService as any).baseUrl}/orders/${order.id}/invoice`, {
                                  method: 'PATCH',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: fd,
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.message || 'Erro ao salvar NFe')
                                setOrder(prev => prev ? { ...prev, invoice_url: data.invoice_url ?? null, invoice_number: data.invoice_number ?? null } : prev)
                                setInvoiceFile(null)
                              }
                              setShowInvoiceForm(false)
                              toast.success('Documentos salvos com sucesso!')
                            } catch (err: any) {
                              toast.error(err.message || 'Erro ao salvar documentos')
                            } finally {
                              setSavingInvoice(false)
                            }
                          }}
                          className="ml-auto px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold disabled:opacity-50 transition"
                        >
                          {savingInvoice ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : order.invoice_url || order.invoice_number ? (
                    <div className="space-y-2 text-sm">
                      {order.invoice_number && (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Número / Chave</p>
                            <p className="text-gray-900 dark:text-white font-mono text-xs mt-0.5 break-all">{order.invoice_number}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(order.invoice_number!).then(() => toast.success('Copiado!'))}
                            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Copiar chave NFe"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      )}
                      {order.shipping_label_url && (
                        <a
                          href={order.shipping_label_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition"
                        >
                          <FileText size={13} />
                          Abrir Etiqueta (PDF)
                        </a>
                      )}
                      {order.invoice_url && (
                        <a
                          href={order.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-xs font-semibold transition"
                        >
                          <ExternalLink size={13} />
                          Abrir Nota Fiscal
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhuma Nota Fiscal vinculada.</p>
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
