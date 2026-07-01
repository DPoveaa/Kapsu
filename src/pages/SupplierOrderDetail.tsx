import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Loader2, Package, User, MapPin, Calendar, Phone, AlertCircle, Copy, Check, X } from 'lucide-react'
import { env } from '../config/env'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { formatShippingAddressForCopy, parseStoredShippingAddress } from '../utils/shippingAddress'

interface OrderItem {
  id: string
  name: string
  slug: string | null
  quantity: number
  image: string | null
  compositions?: string | null
  updated_at?: string | null
}

interface OrderData {
  id: string
  status: string
  client_name: string
  client_phone: string
  shipping_address: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text.trim()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      title={label}
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {copied ? 'Copiado!' : label}
    </button>
  )
}

export default function SupplierOrderDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<OrderItem | null>(null)

  useEffect(() => {
    if (id && token) {
      loadOrderDetails()
    } else {
      setError('Token de acesso ou ID do pedido não informado.')
      setLoading(false)
    }
  }, [id, token])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${env.apiUrl}/orders/fornecedor/${id}?token=${token}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setOrder(data.data)
      } else {
        setError(data.message || 'Não foi possível carregar os detalhes do pedido.')
      }
    } catch (err: any) {
      console.error('Erro ao buscar pedido do fornecedor:', err)
      setError('Erro de conexão com o servidor. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Aguardando Pagamento'
      case 'CONFIRMED': return 'Pago'
      case 'PROCESSING': return 'Preparando'
      case 'READY_FOR_SHIPPING': return 'Pronto para Envio'
      case 'SHIPPED': return 'Saiu para Entrega'
      case 'DELIVERED': return 'Entregue'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
      case 'PROCESSING':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
      case 'READY_FOR_SHIPPING':
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
      case 'DELIVERED':
        return 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50'
      case 'PENDING':
        return 'bg-gray-150 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-250 dark:border-gray-700'
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin w-10 h-10 text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando detalhes do pedido...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 text-center animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-650 dark:text-gray-400 text-sm leading-relaxed mb-6">
            {error}
          </p>
          <div className="text-xs text-gray-400 dark:text-gray-500 leading-snug">
            Esta página é protegida. Use apenas os links de pedidos fornecidos diretamente nas planilhas autorizadas.
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const addr = parseStoredShippingAddress(order.shipping_address)
  const cityState = addr.city && addr.state ? `${addr.city}/${addr.state}` : addr.city || addr.state || ''
  const addressCopyText = formatShippingAddressForCopy(addr)
  const productsCopyText = order.items.map((item) => item.name).join(', ')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-250/60 dark:border-gray-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-primary-400 tracking-wider uppercase">
              <Package size={14} />
              Portal do Fornecedor
            </div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              Pedido <span className="text-primary-500 font-mono text-lg md:text-xl">#{order.id}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide ${getStatusBadgeClass(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL - GRID DE 2 COLUNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA - CLIENTE & ENTREGA */}
          <div className="lg:col-span-2 space-y-6">
            {/* CARD CLIENTE */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-250/60 dark:border-gray-800 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <User size={16} className="text-primary-500" />
                Dados do Cliente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nome Completo</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{order.client_name}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Telefone de Contato</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    {order.client_phone || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD ENTREGA */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-250/60 dark:border-gray-800 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin size={16} className="text-primary-500" />
                  Endereço de Entrega
                </h2>
                <CopyButton text={addressCopyText} label="Copiar endereço" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">CEP</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{addr.cep || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cidade / Estado</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{cityState || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rua</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{addr.street || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Número</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{addr.number || '—'}</span>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Complemento</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{addr.complement || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA - DATAS & DETALHES DE STATUS */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-250/60 dark:border-gray-800 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <Calendar size={16} className="text-primary-500" />
                Histórico de Datas
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Data do Pedido</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Última Atualização</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {new Date(order.updated_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO DE ITENS / PRODUTOS */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-250/60 dark:border-gray-800 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Package size={16} className="text-primary-500" />
              Produtos do Pedido ({order.items.length})
            </h2>
            <CopyButton text={productsCopyText} label="Copiar produtos" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  <th className="py-3 pl-2">Imagem</th>
                  <th className="py-3">Produto</th>
                  <th className="py-3 text-right pr-4">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {order.items.map((item) => (
                  <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all">
                    <td className="py-4 pl-2">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                        <img
                          src={item.image || PRODUCT_IMAGE_FALLBACK}
                          alt={item.name}
                          onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(item)}
                        className="text-sm font-bold text-left text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors inline-block focus:outline-none"
                      >
                        {item.name}
                      </button>
                    </td>
                    <td className="py-4 text-right font-mono font-bold text-sm text-gray-905 dark:text-white pr-4">
                      {item.quantity}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DETALHES PRODUTO */}
        {selectedProduct && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400">
                    <Package size={20} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                      Detalhes do Produto
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">Catálogo do Fornecedor</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all focus:outline-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Imagem Quadrada */}
              <div className="relative w-full aspect-square max-h-64 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-850 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                <img
                  src={selectedProduct.image || PRODUCT_IMAGE_FALLBACK}
                  alt={selectedProduct.name}
                  onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                  className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Info */}
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest block">Nome do Produto</span>
                  <span className="text-sm font-black text-gray-850 dark:text-gray-100 leading-snug">{selectedProduct.name}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-widest block">Fórmula / Compostos</span>
                    {selectedProduct.compositions && (
                      <CopyButton text={selectedProduct.compositions} label="Copiar compostos" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-355 bg-gray-50/80 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-850 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto shadow-inner">
                    {selectedProduct.compositions || 'Nenhuma composição cadastrada neste produto.'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100/80 dark:border-gray-850/60">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest block">Última Atualização</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                      {selectedProduct.updated_at
                        ? new Date(selectedProduct.updated_at).toLocaleString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black tracking-wide shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-95 transition-all"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
