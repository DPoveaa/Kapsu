import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, FileText, Loader2, CheckCircle, Repeat, Check, Sparkles, Truck, Gift, Tag, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/products.service'
import { cartService } from '../services/cart.service'
import { promotionsService, Promotion } from '../services/promotions.service'
import { promoCodesService, MultiplePromoCodesValidation } from '../services/promo-codes.service'
import { shippingService } from '../services/shipping.service'
import { Product } from '../types'

export default function Cart() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const { items, updateQuantity, removeItem, getTotal, addProduct, refreshCart, updateAllPurchaseType } = useCart()
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [linkingCart, setLinkingCart] = useState(false)
  const [linkMessage, setLinkMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  const [localPurchaseType, setLocalPurchaseType] = useState<'one-time' | 'subscription' | null>(null)
  const [applicablePromotions, setApplicablePromotions] = useState<Promotion[]>([])
  const [loadingPromotions, setLoadingPromotions] = useState(false)
  
  // Estados para códigos promocionais
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<string[]>([])
  const [promoCodesValidation, setPromoCodesValidation] = useState<MultiplePromoCodesValidation | null>(null)
  const [validatingPromoCode, setValidatingPromoCode] = useState(false)
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null)
  const [currentCouponIndex, setCurrentCouponIndex] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(0)

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement
    target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
  }
  
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

  // Calcula descontos de promoções
  const calculatePromotionDiscount = (total: number): number => {
    let discount = 0
    const productItems = items.filter(item => item.product)
    
    for (const promo of applicablePromotions) {
      if (promo.type === 'discount_percentage') {
        if (promo.applicable_product_ids && promo.applicable_product_ids.length > 0) {
          // Aplica apenas aos produtos selecionados
          const applicableTotal = productItems
            .filter(item => promo.applicable_product_ids?.includes(item.product!.id))
            .reduce((sum, item) => sum + (item.product!.price * item.quantity), 0)
          discount += applicableTotal * (Number(promo.discount_value) / 100)
        } else {
          // Aplica ao total
          discount += total * (Number(promo.discount_value) / 100)
        }
      } else if (promo.type === 'discount_fixed') {
        if (promo.applicable_product_ids && promo.applicable_product_ids.length > 0) {
          // Aplica apenas aos produtos selecionados
          const applicableTotal = productItems
            .filter(item => promo.applicable_product_ids?.includes(item.product!.id))
            .reduce((sum, item) => sum + (item.product!.price * item.quantity), 0)
          discount += Math.min(Number(promo.discount_value), applicableTotal)
        } else {
          // Aplica ao total (limitado ao valor do desconto)
          discount += Math.min(Number(promo.discount_value), total)
        }
      }
    }
    
    return discount
  }

  const promotionDiscount = calculatePromotionDiscount(isSubscription ? discountedTotal : baseTotal)
  const subtotalAfterPromotions = (isSubscription ? discountedTotal : baseTotal) - promotionDiscount
  
  // Desconto de cupons promocionais
  const promoCodeDiscount = promoCodesValidation?.totalDiscount || 0
  const totalAfterPromotions = subtotalAfterPromotions - promoCodeDiscount

  // Verifica se há frete grátis (por cupom ou valor mínimo)
  const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
  const hasFreeShippingByThreshold = freeShippingThreshold > 0 && totalAfterPromotions >= freeShippingThreshold
  const hasFreeShipping = hasFreeShippingByCoupon || hasFreeShippingByThreshold

  // Remove a barra de progresso de frete grátis hardcoded
  // O frete grátis agora é calculado pelo backend baseado nas configurações
  const currentTotal = totalAfterPromotions

  // Verifica promoções aplicáveis
  useEffect(() => {
    const checkPromotions = async () => {
      if (items.length === 0) {
        setApplicablePromotions([])
        return
      }

      try {
        setLoadingPromotions(true)
        const cartItems = items
          .filter(item => item.product)
          .map(item => ({
            product_id: item.product!.id,
            quantity: item.quantity,
          }))
        
        const promotions = await promotionsService.checkPromotions(
          baseTotal,
          cartItems,
          user?.id
        )
        setApplicablePromotions(promotions)
      } catch (error) {
        console.error('Erro ao verificar promoções:', error)
      } finally {
        setLoadingPromotions(false)
      }
    }

    checkPromotions()
  }, [items, baseTotal, user])

  // Busca configurações de frete grátis
  useEffect(() => {
    const loadShippingSettings = async () => {
      try {
        const settings = await shippingService.getShippingSettings()
        setFreeShippingThreshold(settings.free_shipping_threshold || 0)
      } catch (error) {
        console.error('Erro ao carregar configurações de frete:', error)
        // Mantém o valor padrão 0 em caso de erro
      }
    }
    loadShippingSettings()
  }, [])

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

  // Carrega cupons do localStorage ao montar
  useEffect(() => {
    const savedCodes = localStorage.getItem('cart_promo_codes')
    const savedValidation = localStorage.getItem('cart_promo_codes_validation')
    if (savedCodes) {
      try {
        const codes = JSON.parse(savedCodes)
        setAppliedPromoCodes(codes)
        if (savedValidation) {
          const validation = JSON.parse(savedValidation)
          setPromoCodesValidation(validation)
        }
      } catch (error) {
        console.error('Erro ao carregar cupons:', error)
      }
    }
  }, [])

  // Salva cupons no localStorage quando mudarem
  useEffect(() => {
    if (appliedPromoCodes.length > 0) {
      localStorage.setItem('cart_promo_codes', JSON.stringify(appliedPromoCodes))
      if (promoCodesValidation) {
        localStorage.setItem('cart_promo_codes_validation', JSON.stringify(promoCodesValidation))
      }
    } else {
      localStorage.removeItem('cart_promo_codes')
      localStorage.removeItem('cart_promo_codes_validation')
    }
  }, [appliedPromoCodes, promoCodesValidation])

  // Função para validar código promocional
  const handleValidatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('Digite um código promocional')
      return
    }

    const codeToAdd = promoCode.trim().toUpperCase()
    
    if (appliedPromoCodes.includes(codeToAdd)) {
      setPromoCodeError('Este código já foi aplicado')
      return
    }

    try {
      setValidatingPromoCode(true)
      setPromoCodeError(null)
      
      const cartItems = items
        .filter(item => item.product)
        .map(item => ({
          product_id: item.product!.id,
          quantity: item.quantity,
          price: item.product!.price,
        }))
      
      const codesToValidate = [...appliedPromoCodes, codeToAdd]
      const subtotal = isSubscription ? discountedTotal : baseTotal
      
      const validation = await promoCodesService.validateMultiplePromoCodes(
        codesToValidate,
        subtotal,
        cartItems,
        user?.id
      )
      
      const validatedCodes = validation.promoCodes.map(pc => pc.code.toUpperCase())
      const newCodeWasAccepted = validatedCodes.includes(codeToAdd)
      
      if (!newCodeWasAccepted) {
        let codeError = 'Este código não pode ser aplicado'
        if (validation.errors && validation.errors.length > 0) {
          const specificError = validation.errors.find(err => 
            err.toLowerCase().includes(codeToAdd.toLowerCase())
          )
          codeError = specificError || validation.errors[0] || codeError
        }
        setPromoCodeError(codeError)
        setAppliedPromoCodes(validatedCodes)
        setPromoCodesValidation(validation)
        return
      }
      
      setPromoCodesValidation(validation)
      setAppliedPromoCodes(validatedCodes)
      setPromoCode('')
      setPromoCodeError(null)
      setCurrentCouponIndex(0)
    } catch (error: any) {
      setPromoCodeError(error.message || 'Erro ao validar código promocional')
    } finally {
      setValidatingPromoCode(false)
    }
  }

  // Função para remover cupom
  const handleRemovePromoCode = async (codeToRemove: string) => {
    const newCodes = appliedPromoCodes.filter(code => code !== codeToRemove)
    setAppliedPromoCodes(newCodes)
    
    if (newCodes.length === 0) {
      setPromoCodesValidation(null)
      return
    }

    try {
      setValidatingPromoCode(true)
      const cartItems = items
        .filter(item => item.product)
        .map(item => ({
          product_id: item.product!.id,
          quantity: item.quantity,
          price: item.product!.price,
        }))
      
      const subtotal = isSubscription ? discountedTotal : baseTotal
      const validation = await promoCodesService.validateMultiplePromoCodes(
        newCodes,
        subtotal,
        cartItems,
        user?.id
      )
      
      setPromoCodesValidation(validation)
      setCurrentCouponIndex(prev => prev >= newCodes.length ? Math.max(0, newCodes.length - 1) : prev)
    } catch (error: any) {
      console.error('Erro ao revalidar códigos:', error)
    } finally {
      setValidatingPromoCode(false)
    }
  }

  // Reset índice do carrossel quando cupons mudam
  useEffect(() => {
    if (appliedPromoCodes.length <= 1) {
      setCurrentCouponIndex(0)
    } else if (currentCouponIndex >= appliedPromoCodes.length) {
      setCurrentCouponIndex(0)
    }
  }, [appliedPromoCodes.length])

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
      <div className="bg-gray-50 dark:bg-gray-900 min-h-[60vh] flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center px-4">
          <ShoppingCart size={64} className="mx-auto text-gray-300 dark:text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Seu carrinho está vazio</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
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
    <div className="bg-gradient-to-b from-gray-50 dark:from-gray-900 to-white dark:to-gray-900 min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Carrinho de Compras</h1>

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
              <div className="bg-gradient-to-br from-white dark:from-[#065084] via-primary-50/30 dark:via-[#065084] to-gray-50 dark:to-[#065084] rounded-2xl shadow-xl dark:shadow-lg border-2 border-primary-200 dark:border-[#0F828C] p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={24} className="text-primary-600" />
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  Forma de Compra do Carrinho
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                A opção selecionada será aplicada para <strong>todos os produtos</strong> do seu carrinho
              </p>

              {/* Botões de tipo de compra */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => handlePurchaseTypeChange('subscription')}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-base transition-all duration-200 ${
                    isSubscription
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white scale-105'
                      : 'bg-white dark:bg-[#065084] text-gray-700 dark:text-white border-2 border-gray-200 dark:border-[#0F828C] hover:border-primary-300 dark:hover:border-[#0F828C] hover:shadow-md'
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
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white scale-105'
                      : 'bg-white dark:bg-[#065084] text-gray-700 dark:text-white border-2 border-gray-200 dark:border-[#0F828C] hover:border-gray-300 dark:hover:border-[#0F828C] hover:shadow-md'
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-3">
                      Escolha seu Plano:
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setSubscriptionPlan('monthly')}
                        className={`relative p-5 rounded-xl transition-all ${
                          subscriptionPlan === 'monthly'
                            ? 'bg-white dark:bg-[#065084] border-2 border-primary-500 dark:border-[#0F828C] shadow-lg dark:shadow-xl'
                            : 'bg-white dark:bg-[#065084] border-2 border-gray-200 dark:border-[#0F828C] hover:border-primary-300 dark:hover:border-[#0F828C] hover:shadow-md'
                        }`}
                      >
                        <div className="text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-gray-900 dark:text-white">Mensal</span>
                            {subscriptionPlan === 'monthly' && (
                              <Check size={18} className="text-primary-600" />
                            )}
                          </div>
                          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                            R$ {monthlySubscriptionPrice.toFixed(2).replace('.', ',')}
                            <span className="text-sm text-gray-500 dark:text-gray-300 font-normal">/mês</span>
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => setSubscriptionPlan('quarterly')}
                        className={`relative p-5 rounded-xl transition-all ${
                          subscriptionPlan === 'quarterly'
                            ? 'bg-white dark:bg-[#065084] border-2 border-primary-500 dark:border-[#0F828C] shadow-lg dark:shadow-xl'
                            : 'bg-white dark:bg-[#065084] border-2 border-gray-200 dark:border-[#0F828C] hover:border-primary-300 dark:hover:border-[#0F828C] hover:shadow-md'
                        }`}
                      >
                        <div className="text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-gray-900 dark:text-white">Trimestral</span>
                            {subscriptionPlan === 'quarterly' && (
                              <Check size={18} className="text-primary-600" />
                            )}
                            <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              Mais pedido
                            </span>
                          </div>
                          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                            R$ {quarterlySubscriptionPrice.toFixed(2).replace('.', ',')}
                            <span className="text-sm text-gray-500 dark:text-gray-300 font-normal">/mês</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Economia de 15%</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Benefícios da assinatura */}
                  <div className="bg-gradient-to-r from-primary-50 dark:from-[#065084] to-purple-50 dark:to-[#065084] rounded-xl p-5 border border-primary-100 dark:border-[#0F828C]">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Você receberá:</p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>Seus produtos a cada 30 dias</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>{subscriptionPlan === 'quarterly' ? '15%' : '10%'} de desconto automático</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>Frete grátis em todas as entregas</span>
                      </li>
                    </ul>
                  </div>

                  {/* Política de cancelamento */}
                  <p className="text-xs text-gray-500 dark:text-gray-300 text-center">
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
            {/* Banner de economia com cupons (similar ao Mercado Livre) */}

            {/* Lista de Produtos */}
            <div className="space-y-4">
              {items.map(item => {
                const price = item.product?.price || item.customMedication?.price || 0
                const itemTotal = price * item.quantity
                const itemDiscountedPrice = isSubscription 
                  ? itemTotal * (1 - subscriptionDiscount)
                  : itemTotal

                return (
                  <div key={item.id} className="bg-white dark:bg-[#065084] rounded-xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-[#0F828C] overflow-hidden hover:shadow-md dark:hover:shadow-xl transition-all duration-200">
                    <div className="p-5">
                      <div className="flex gap-5">
                        {/* Imagem do produto */}
                        {item.type === 'product' && item.product ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-100 flex-shrink-0"
                            onError={handleImageError}
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
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                {item.product?.name || item.customMedication?.name}
                              </h3>
                              {item.product && (
                                <p className="text-sm text-gray-500 dark:text-gray-300 line-clamp-1">{item.product.description}</p>
                              )}
                              {item.customMedication && (
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  <p className="line-clamp-1">
                                    <strong>Ativos:</strong> {item.customMedication.activeIngredients.map(i => i.name).join(', ')}
                                  </p>
                                  {item.customMedication.prescriptionRequired && (
                                    <span className="inline-block mt-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full font-medium">
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
                            <div className="flex items-center border-2 border-gray-200 dark:border-[#0F828C] rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-2 hover:bg-gray-50 dark:hover:bg-[#0F828C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={16} />
                              </button>
                              <span className="px-4 py-1.5 text-sm font-semibold min-w-[2.5rem] text-center bg-gray-50 dark:bg-[#0F828C] dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-2 hover:bg-gray-50 dark:hover:bg-[#0F828C] transition-colors"
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
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#0F828C]">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Produtos que você pode gostar
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recommendedProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-white dark:bg-[#065084] rounded-xl border border-gray-200 dark:border-[#0F828C] p-4 hover:shadow-lg dark:hover:shadow-xl transition-all cursor-pointer group"
                      onClick={() => navigate(`/produtos/${product.id}`)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
                        onError={handleImageError}
                      />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-300 mb-3 line-clamp-1">
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
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#0F828C]">
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={32} />
                </div>
              </div>
            )}
          </div>

          {/* Summary - Sidebar moderno */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#065084] rounded-2xl shadow-lg dark:shadow-xl border border-gray-100 dark:border-[#0F828C] p-6 sticky top-24">
              {/* Seção de Cupons Promocionais */}
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-[#0F828C]">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" />
                  Cupons Promocionais
                </h3>
                
                {appliedPromoCodes.length === 0 ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Digite o código"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleValidatePromoCode()
                          }
                        }}
                      />
                      <button
                        onClick={handleValidatePromoCode}
                        disabled={validatingPromoCode || !promoCode.trim()}
                        className="px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validatingPromoCode ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          'Aplicar'
                        )}
                      </button>
                    </div>
                    {promoCodeError && (
                      <p className="text-xs text-red-600">{promoCodeError}</p>
                    )}
                    {!promoCodeError && (
                      <p className="text-xs text-gray-400">
                        Possui um código promocional? Insira acima.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Carrossel de cupons - se tiver mais de 1 */}
                    {appliedPromoCodes.length > 1 && promoCodesValidation ? (
                      <div className="relative">
                        <div className="overflow-hidden">
                          <div 
                            className="flex transition-transform duration-300 ease-in-out"
                            style={{ transform: `translateX(-${currentCouponIndex * 100}%)` }}
                          >
                            {promoCodesValidation.promoCodes.map((promoCode) => {
                              const appliedDiscount = promoCodesValidation.appliedDiscounts.percentage?.code === promoCode.code
                                ? promoCodesValidation.appliedDiscounts.percentage
                                : promoCodesValidation.appliedDiscounts.fixed.find(f => f.code === promoCode.code)
                              
                              return (
                                <div key={promoCode.id} className="min-w-full flex-shrink-0">
                                  <div className="bg-green-50 dark:bg-[#065084] border border-green-200 dark:border-[#0F828C] rounded-md px-3 py-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-green-900 dark:text-green-300 truncate">
                                          {promoCode.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-xs text-green-700 dark:text-green-300">
                                            {promoCode.code}
                                          </span>
                                          {appliedDiscount && (
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                              • {promoCode.discount_type === 'percentage' 
                                                ? `${promoCode.discount_value}% OFF`
                                                : `R$ ${appliedDiscount.discount.toFixed(2).replace('.', ',')} OFF`}
                                            </span>
                                          )}
                                          {promoCode.free_shipping && (
                                            <Truck className="w-3 h-3 text-green-600 dark:text-green-400" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemovePromoCode(promoCode.code)}
                                      className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1 flex-shrink-0 opacity-70 hover:opacity-100"
                                      title="Remover código"
                                      disabled={validatingPromoCode}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        
                        {/* Navegação do carrossel */}
                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={() => setCurrentCouponIndex(prev => prev > 0 ? prev - 1 : promoCodesValidation.promoCodes.length - 1)}
                            className="p-1 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-30"
                            disabled={validatingPromoCode}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="flex gap-1">
                            {promoCodesValidation.promoCodes.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentCouponIndex(index)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                  index === currentCouponIndex ? 'bg-primary-600 dark:bg-primary-400 w-4' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                                disabled={validatingPromoCode}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => setCurrentCouponIndex(prev => prev < promoCodesValidation.promoCodes.length - 1 ? prev + 1 : 0)}
                            className="p-1 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 disabled:opacity-30"
                            disabled={validatingPromoCode}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Cupom único - sem carrossel */
                      appliedPromoCodes.length === 1 && promoCodesValidation && (
                        <div className="bg-green-50 dark:bg-[#065084] border border-green-200 dark:border-[#0F828C] rounded-md px-3 py-2">
                          {promoCodesValidation.promoCodes.map((promoCode) => {
                            const appliedDiscount = promoCodesValidation.appliedDiscounts.percentage?.code === promoCode.code
                              ? promoCodesValidation.appliedDiscounts.percentage
                              : promoCodesValidation.appliedDiscounts.fixed.find(f => f.code === promoCode.code)
                            
                            return (
                              <div key={promoCode.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-green-900 dark:text-green-300 truncate">
                                      {promoCode.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-xs text-green-700 dark:text-green-300">
                                        {promoCode.code}
                                      </span>
                                      {appliedDiscount && (
                                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                          • {promoCode.discount_type === 'percentage' 
                                            ? `${promoCode.discount_value}% OFF`
                                            : `R$ ${appliedDiscount.discount.toFixed(2).replace('.', ',')} OFF`}
                                        </span>
                                      )}
                                      {promoCode.free_shipping && (
                                        <Truck className="w-3 h-3 text-green-600 dark:text-green-400" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemovePromoCode(promoCode.code)}
                                  className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1 flex-shrink-0 opacity-70 hover:opacity-100"
                                  title="Remover código"
                                  disabled={validatingPromoCode}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )
                    )}
                    
                    {/* Input para adicionar novo código */}
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="Digite um código"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleValidatePromoCode()
                            }
                          }}
                          disabled={validatingPromoCode}
                        />
                        <button
                          onClick={handleValidatePromoCode}
                          disabled={validatingPromoCode || !promoCode.trim()}
                          className="px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {validatingPromoCode ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            'Aplicar'
                          )}
                        </button>
                      </div>
                      {promoCodeError && (
                        <p className="text-xs text-red-600">{promoCodeError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-[#0F828C]">
                Resumo do Pedido
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">R$ {baseTotal.toFixed(2).replace('.', ',')}</span>
                </div>

                {isSubscription && (
                  <div className="bg-primary-50 dark:bg-[#065084] rounded-lg p-3 border border-primary-100 dark:border-[#0F828C]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">Desconto Assinatura</span>
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        -{subscriptionDiscount * 100}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {subscriptionPlan === 'quarterly' ? 'Plano Trimestral' : 'Plano Mensal'}
                    </p>
                  </div>
                )}

                {/* Cupons Aplicados */}
                {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {promoCodesValidation.promoCodes.length > 1 
                        ? `Cupom (${promoCodesValidation.promoCodes.length})`
                        : 'Cupom'}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      - R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {/* Promoções Aplicadas */}
                {applicablePromotions.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-[#0F828C] pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Promoções Aplicadas</span>
                    </div>
                    {loadingPromotions ? (
                      <div className="text-xs text-gray-500 dark:text-gray-300">Verificando promoções...</div>
                    ) : (
                      <div className="space-y-2">
                        {applicablePromotions.map((promo) => {
                          let discountText = ''
                          if (promo.type === 'discount_percentage') {
                            discountText = `${promo.discount_value}% OFF`
                          } else if (promo.type === 'discount_fixed') {
                            discountText = `R$ ${Number(promo.discount_value).toFixed(2).replace('.', ',')} OFF`
                          }
                          if (promo.free_shipping) {
                            discountText += discountText ? ' + Frete Grátis' : 'Frete Grátis'
                          }
                          return (
                            <div key={promo.id} className="bg-pink-50 dark:bg-[#065084] border border-pink-200 dark:border-[#0F828C] rounded-lg p-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-pink-900 dark:text-pink-300">{promo.name}</p>
                                  {discountText && (
                                    <p className="text-xs text-pink-700 dark:text-pink-300 mt-1">{discountText}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {promotionDiscount > 0 && (
                          <div className="flex justify-between items-center text-pink-600 dark:text-pink-400 pt-2 border-t border-pink-200 dark:border-[#0F828C]">
                            <span className="text-sm font-semibold">Desconto Total</span>
                            <span className="font-bold">
                              - R$ {promotionDiscount.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}


                {isSubscription && (
                  <div className="bg-gradient-to-r from-primary-50 dark:from-[#065084] to-purple-50 dark:to-[#065084] rounded-xl p-4 border border-primary-100 dark:border-[#0F828C]">
                    <div className="flex items-start gap-2">
                      <Repeat size={18} className="text-primary-600 dark:text-primary-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          Assinatura Ativa
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Seus produtos serão entregues mensalmente
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Frete */}
                {hasFreeShipping && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Frete</span>
                    <div className="text-right">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {hasFreeShippingByCoupon ? 'Grátis - pelo cupom' : 'Grátis'}
                      </span>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {!hasFreeShippingByCoupon && hasFreeShippingByThreshold && (
                          <span>Frete grátis para pedidos acima de R$ {freeShippingThreshold.toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-[#0F828C] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      R$ {currentTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {isSubscription && (
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-right">
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
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 mb-4 flex items-center justify-center gap-2"
              >
                Finalizar Compra
                <ArrowRight size={20} />
              </button>

              <Link
                to="/produtos"
                className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
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

