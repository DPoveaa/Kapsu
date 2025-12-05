import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, FileText, Loader2, CheckCircle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/products.service'
import { cartService } from '../services/cart.service'
import { Product } from '../types'

export default function Cart() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { items, updateQuantity, removeItem, getTotal, addProduct, refreshCart } = useCart()
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [linkingCart, setLinkingCart] = useState(false)
  const [linkMessage, setLinkMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Processa o token do WhatsApp na URL
  useEffect(() => {
    const processWhatsAppToken = async () => {
      const token = searchParams.get('token')
      if (!token || authLoading) return

      // Remove o token da URL para evitar reprocessamento
      searchParams.delete('token')
      setSearchParams(searchParams, { replace: true })

      if (isAuthenticated) {
        // Usuário já está logado, vincula automaticamente
        setLinkingCart(true)
        setLinkMessage({ type: 'info', text: 'Vinculando carrinho do WhatsApp...' })

        try {
          const result = await cartService.validateAndLinkToken(token)
          if (result.success) {
            setLinkMessage({ type: 'success', text: '✅ Carrinho do WhatsApp vinculado com sucesso!' })
            // Recarrega o carrinho para mostrar os novos itens
            await refreshCart()
          } else {
            setLinkMessage({ type: 'error', text: result.message || 'Não foi possível vincular o carrinho' })
          }
        } catch (error: any) {
          setLinkMessage({ type: 'error', text: 'Erro ao vincular carrinho: ' + error.message })
        } finally {
          setLinkingCart(false)
          // Limpa a mensagem após 5 segundos
          setTimeout(() => setLinkMessage(null), 5000)
        }
      } else {
        // Usuário não está logado, salva o token e redireciona para login
        cartService.savePendingToken(token)
        setLinkMessage({ type: 'info', text: 'Faça login ou cadastre-se para ver seu carrinho do WhatsApp' })
        
        // Redireciona para login após mostrar mensagem
        setTimeout(() => {
          navigate('/login?redirect=/carrinho')
        }, 1500)
      }
    }

    processWhatsAppToken()
  }, [searchParams, isAuthenticated, authLoading, navigate, refreshCart, setSearchParams])

  // Obtém categorias únicas dos produtos no carrinho
  const cartCategories = useMemo(() => {
    const categories = items
      .filter(item => item.type === 'product' && item.product)
      .map(item => item.product!.category)
      .filter((cat, index, self) => cat && self.indexOf(cat) === index)
    return categories as string[]
  }, [items])

  // IDs dos produtos já no carrinho
  const cartProductIds = useMemo(() => {
    return items
      .filter(item => item.type === 'product' && item.product)
      .map(item => item.product!.id)
  }, [items])

  // Busca produtos recomendados
  useEffect(() => {
    const loadRecommendations = async () => {
      if (cartCategories.length === 0) {
        setRecommendedProducts([])
        return
      }

      try {
        setLoadingRecommendations(true)
        const allRecommended: Product[] = []

        // Busca produtos de cada categoria
        for (const category of cartCategories) {
          try {
            const products = await productsService.getByCategory(category)
            // Filtra produtos que não estão no carrinho
            const filtered = products.filter(p => !cartProductIds.includes(p.id))
            allRecommended.push(...filtered)
          } catch (error) {
            console.error(`Erro ao buscar produtos da categoria ${category}:`, error)
          }
        }

        // Remove duplicatas e limita a 6 produtos
        const uniqueProducts = allRecommended.filter(
          (product, index, self) => index === self.findIndex(p => p.id === product.id)
        ).slice(0, 6)

        setRecommendedProducts(uniqueProducts)
      } catch (error) {
        console.error('Erro ao carregar recomendações:', error)
      } finally {
        setLoadingRecommendations(false)
      }
    }

    loadRecommendations()
  }, [cartCategories, cartProductIds])

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 min-h-[60vh] flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center px-4">
          <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Adicione produtos ou personalize um medicamento para começar
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/produtos" className="btn-primary text-sm px-6 py-2">
              Explorar Produtos
            </Link>
            <Link to="/personalizar" className="btn-secondary text-sm px-6 py-2">
              Personalizar Medicamento
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-[60vh] pb-8">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Carrinho de Compras</h1>

        {/* Mensagem de vinculação do carrinho WhatsApp */}
        {linkMessage && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            linkMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            linkMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {linkMessage.type === 'success' && <CheckCircle size={20} />}
            {linkMessage.type === 'info' && <Loader2 className="animate-spin" size={20} />}
            <span>{linkMessage.text}</span>
          </div>
        )}

        {/* Loading enquanto vincula o carrinho */}
        {linkingCart && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3 text-blue-800">
            <Loader2 className="animate-spin" size={20} />
            <span>Vinculando carrinho do WhatsApp à sua conta...</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cart Items - Layout mais compacto */}
          <div className="lg:col-span-8 space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                {item.type === 'product' && item.product ? (
                  <div className="flex gap-4">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded border border-gray-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                        {item.product.name}
                      </h3>
                      <p className="text-gray-500 text-xs mb-2 line-clamp-1">{item.product.description}</p>
                      <p className="text-base font-bold text-primary-600">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-50 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-50 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : item.type === 'custom' && item.customMedication ? (
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="text-primary-600" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {item.customMedication.name}
                      </h3>
                      <div className="text-xs text-gray-600 mb-2">
                        <p className="line-clamp-1">
                          <strong>Ativos:</strong> {item.customMedication.activeIngredients.map(i => i.name).join(', ')}
                        </p>
                        {item.customMedication.prescriptionRequired && (
                          <span className="inline-block mt-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
                            Receita necessária
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-primary-600">
                        R$ {(item.customMedication.price * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-50 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-50 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Recomendações */}
            {recommendedProducts.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Produtos que você pode gostar
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recommendedProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/produtos/${product.id}`)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-2 group-hover:scale-105 transition-transform"
                      />
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold text-primary-600">
                          R$ {product.price.toFixed(2).replace('.', ',')}
                        </p>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await addProduct(product, 1)
                            } catch (error) {
                              console.error('Erro ao adicionar produto:', error)
                            }
                          }}
                          className="bg-primary-600 hover:bg-primary-700 text-white p-1.5 rounded transition-colors"
                          title="Adicionar ao carrinho"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingRecommendations && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Carregando recomendações...
                </h2>
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-600" size={32} />
                </div>
              </div>
            )}
          </div>

          {/* Summary - Layout mais compacto */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b">Resumo do Pedido</h2>
              
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">R$ {getTotal().toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Frete</span>
                  <span className="text-xs text-gray-500">Calculado no checkout</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-primary-600">
                      R$ {getTotal().toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-3 flex items-center justify-center"
              >
                Finalizar Compra
                <ArrowRight className="ml-2" size={18} />
              </button>

              <Link
                to="/produtos"
                className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Continuar Comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

