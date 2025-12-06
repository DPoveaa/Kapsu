import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, FileText, Loader2, Repeat, Check, Sparkles, Truck } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../context/CartContext'
import { productsService } from '../services/products.service'
import { Product } from '../types'

export default function Cart() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, getTotal, addProduct, updateAllPurchaseType } = useCart()
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  const [localPurchaseType, setLocalPurchaseType] = useState<'one-time' | 'subscription' | null>(null)
  
  // Tipo de compra global do carrinho (usa estado local se disponível, senão usa o primeiro item)
  const globalPurchaseType = localPurchaseType || (items.length > 0 
    ? (items[0].purchaseType || 'one-time')
    : 'one-time')
  const isSubscription = globalPurchaseType === 'subscription'
  
  // Calcula totais com desconto
  const baseTotal = getTotal()
  const subscriptionDiscount = isSubscription ? (subscriptionPlan === 'quarterly' ? 0.15 : 0.10) : 0
  const discountedTotal = baseTotal * (1 - subscriptionDiscount)
  const monthlySubscriptionPrice = baseTotal * 0.9
  const quarterlySubscriptionPrice = baseTotal * 0.85

  // Valor para frete grátis (exemplo: R$ 200)
  const FREE_SHIPPING_THRESHOLD = 200
  const currentTotal = isSubscription ? discountedTotal : baseTotal
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - currentTotal)
  const freeShippingProgress = Math.min(100, (currentTotal / FREE_SHIPPING_THRESHOLD) * 100)

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

  const handlePurchaseTypeChange = async (type: 'one-time' | 'subscription') => {
    // Atualiza estado local imediatamente para evitar o "piscar"
    setLocalPurchaseType(type)
    
    try {
      await updateAllPurchaseType(type)
    } catch (error) {
      console.error('Erro ao atualizar tipo de compra:', error)
      // Em caso de erro, reverte o estado local
      setLocalPurchaseType(null)
    }
  }
  
  // Sincroniza estado local com items quando items mudam
  useEffect(() => {
    if (items.length > 0 && !localPurchaseType) {
      const firstItemType = items[0].purchaseType || 'one-time'
      setLocalPurchaseType(firstItemType)
    }
  }, [items, localPurchaseType])

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
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Carrinho de Compras</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items - Layout expandido e moderno */}
          <div className="lg:col-span-2 space-y-6">
            {/* 
              ⚠️ IMPORTANTE: Esta seção de assinatura deve aparecer APENAS UMA VEZ no topo do carrinho.
              NÃO deve ser renderizada dentro do loop de produtos (items.map).
              A opção de assinatura é GLOBAL para todo o carrinho, não por produto.
            */}
            {/* Seção Global de Escolha de Tipo de Compra - APLICA PARA TODO O CARRINHO */}
            {items.length > 0 && (
              <div className="bg-gradient-to-br from-white via-primary-50/30 to-gray-50 rounded-2xl shadow-xl border-2 border-primary-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={24} className="text-primary-600" />
                <h4 className="text-xl font-bold text-gray-900">
                  Forma de Compra do Carrinho
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                A opção selecionada será aplicada para <strong>todos os produtos</strong> do seu carrinho
              </p>

              {/* Botões de tipo de compra */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => handlePurchaseTypeChange('subscription')}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-base transition-all duration-200 ${
                    isSubscription
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-200 scale-105'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Repeat size={20} />
                    <span>Assinatura</span>
                  </div>
                </button>
                <button
                  onClick={() => handlePurchaseTypeChange('one-time')}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-base transition-all duration-200 ${
                    !isSubscription
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-xl shadow-gray-200 scale-105'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  Compra Única
                </button>
              </div>

              {/* Conteúdo da assinatura */}
              {isSubscription && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Planos de assinatura */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Escolha seu Plano:
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setSubscriptionPlan('monthly')}
                        className={`relative p-5 rounded-xl transition-all ${
                          subscriptionPlan === 'monthly'
                            ? 'bg-white border-2 border-primary-500 shadow-lg'
                            : 'bg-white border-2 border-gray-200 hover:border-primary-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-gray-900">Mensal</span>
                            {subscriptionPlan === 'monthly' && (
                              <Check size={18} className="text-primary-600" />
                            )}
                          </div>
                          <p className="text-xl font-bold text-primary-600">
                            R$ {monthlySubscriptionPrice.toFixed(2).replace('.', ',')}
                            <span className="text-sm text-gray-500 font-normal">/mês</span>
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => setSubscriptionPlan('quarterly')}
                        className={`relative p-5 rounded-xl transition-all ${
                          subscriptionPlan === 'quarterly'
                            ? 'bg-white border-2 border-primary-500 shadow-lg'
                            : 'bg-white border-2 border-gray-200 hover:border-primary-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-gray-900">Trimestral</span>
                            {subscriptionPlan === 'quarterly' && (
                              <Check size={18} className="text-primary-600" />
                            )}
                            <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              Mais pedido
                            </span>
                          </div>
                          <p className="text-xl font-bold text-primary-600">
                            R$ {quarterlySubscriptionPrice.toFixed(2).replace('.', ',')}
                            <span className="text-sm text-gray-500 font-normal">/mês</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Economia de 15%</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Benefícios da assinatura */}
                  <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-5 border border-primary-100">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Você receberá:</p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>Seus produtos a cada 30 dias</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>{subscriptionPlan === 'quarterly' ? '15%' : '10%'} de desconto automático</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>Frete grátis em todas as entregas</span>
                      </li>
                    </ul>
                  </div>

                  {/* Política de cancelamento */}
                  <p className="text-xs text-gray-500 text-center">
                    Cancele ou edite a qualquer momento antes da próxima entrega
                  </p>
                </div>
              )}
              </div>
            )}

            {/* 
              ⚠️ LISTA DE PRODUTOS - SEM opções de assinatura individuais
              Cada produto mostra apenas: imagem, nome, quantidade e preço.
              A opção de assinatura está APENAS no topo (seção global acima).
            */}
            {/* Lista de Produtos */}
            <div className="space-y-4">
              {items.map(item => {
                const price = item.product?.price || item.customMedication?.price || 0
                const itemTotal = price * item.quantity
                const itemDiscountedPrice = isSubscription 
                  ? itemTotal * (1 - subscriptionDiscount)
                  : itemTotal

                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                    <div className="p-5">
                      <div className="flex gap-5">
                        {/* Imagem do produto */}
                        {item.type === 'product' && item.product ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-primary-100 via-primary-50 to-accent-100 rounded-lg border-2 border-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="text-primary-600" size={32} />
                          </div>
                        )}

                        {/* Informações do produto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {item.product?.name || item.customMedication?.name}
                              </h3>
                              {item.product && (
                                <p className="text-sm text-gray-500 line-clamp-1">{item.product.description}</p>
                              )}
                              {item.customMedication && (
                                <div className="text-sm text-gray-600">
                                  <p className="line-clamp-1">
                                    <strong>Ativos:</strong> {item.customMedication.activeIngredients.map(i => i.name).join(', ')}
                                  </p>
                                  {item.customMedication.prescriptionRequired && (
                                    <span className="inline-block mt-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                                      Receita necessária
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg ml-4"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {/* Controles de quantidade e preço */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={16} />
                              </button>
                              <span className="px-4 py-1.5 text-sm font-semibold min-w-[2.5rem] text-center bg-gray-50">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-2 hover:bg-gray-50 transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            <div className="text-right">
                              {isSubscription && itemTotal !== itemDiscountedPrice && (
                                <p className="text-xs text-gray-400 line-through mb-1">
                                  R$ {itemTotal.toFixed(2).replace('.', ',')}
                                </p>
                              )}
                              <p className="text-xl font-bold text-primary-600">
                                R$ {itemDiscountedPrice.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recomendações */}
            {recommendedProducts.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Produtos que você pode gostar
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recommendedProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => navigate(`/produtos/${product.id}`)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
                      />
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1">
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
                              // Produtos são sempre adicionados como 'one-time'
                              // A assinatura só pode ser definida globalmente no carrinho
                              await addProduct(product, 1)
                            } catch (error) {
                              console.error('Erro ao adicionar produto:', error)
                            }
                          }}
                          className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg transition-colors shadow-sm"
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
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-600" size={32} />
                </div>
              </div>
            )}
          </div>

          {/* Summary - Sidebar moderno */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                Resumo do Pedido
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">R$ {baseTotal.toFixed(2).replace('.', ',')}</span>
                </div>

                {isSubscription && (
                  <div className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-primary-700">Desconto Assinatura</span>
                      <span className="text-sm font-bold text-primary-600">
                        -{subscriptionDiscount * 100}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {subscriptionPlan === 'quarterly' ? 'Plano Trimestral' : 'Plano Mensal'}
                    </p>
                  </div>
                )}

                {/* Barra de progresso para frete grátis */}
                {freeShippingRemaining > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck size={16} className="text-green-600" />
                      <span className="text-sm font-semibold text-gray-900">Frete Grátis</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      Adicione mais <strong className="text-green-600">R$ {freeShippingRemaining.toFixed(2).replace('.', ',')}</strong> para ganhar frete grátis!
                    </p>
                  </div>
                )}

                {freeShippingRemaining === 0 && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2">
                      <Check size={20} />
                      <span className="font-semibold">Frete Grátis Aprovado!</span>
                    </div>
                  </div>
                )}

                {isSubscription && (
                  <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-4 border border-primary-100">
                    <div className="flex items-start gap-2">
                      <Repeat size={18} className="text-primary-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          Assinatura Ativa
                        </p>
                        <p className="text-xs text-gray-600">
                          Seus produtos serão entregues mensalmente
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      R$ {currentTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {isSubscription && (
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {subscriptionPlan === 'quarterly' ? 'A cada 3 meses' : 'Por mês'}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  // Salva o plano de assinatura no localStorage para usar no checkout
                  if (isSubscription) {
                    localStorage.setItem('subscription_plan', subscriptionPlan)
                  } else {
                    localStorage.removeItem('subscription_plan')
                  }
                  navigate('/checkout')
                }}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-primary-200 hover:shadow-xl mb-4 flex items-center justify-center gap-2"
              >
                Finalizar Compra
                <ArrowRight size={20} />
              </button>

              <Link
                to="/produtos"
                className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
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

