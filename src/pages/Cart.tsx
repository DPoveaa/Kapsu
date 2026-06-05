import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Loader2, CheckCircle, Check, Sparkles, Truck, Gift, Tag, X, ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/products.service'
import { cartService } from '../services/cart.service'
import { promotionsService, Promotion } from '../services/promotions.service'
import { promoCodesService, MultiplePromoCodesValidation } from '../services/promo-codes.service'
import { shippingService } from '../services/shipping.service'
import { addressService } from '../services/address.service'
import { Product } from '../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'

export default function Cart() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollRecommendations = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const { items, updateQuantity, removeItem, getTotal, addProduct, refreshCart } = useCart()
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [linkingCart, setLinkingCart] = useState(false)
  const [linkMessage, setLinkMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
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
  const [addingProductId, setAddingProductId] = useState<string | null>(null)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)

  // Estados para simulação e cálculo de frete no carrinho
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [shippingCep, setShippingCep] = useState('')

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  // Tipo de compra global do carrinho (assinaturas desativadas)
  const isSubscription = false

  // Calcula totais
  const baseTotal = getTotal()

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

  const promotionDiscount = calculatePromotionDiscount(baseTotal)
  const subtotalAfterPromotions = baseTotal - promotionDiscount

  // Desconto de cupons promocionais
  const promoCodeDiscount = promoCodesValidation?.totalDiscount || 0
  const totalAfterPromotions = subtotalAfterPromotions - promoCodeDiscount

  // Verifica se há frete grátis (por cupom ou valor mínimo)
  const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
  const hasFreeShippingByThreshold = freeShippingThreshold > 0 && totalAfterPromotions >= freeShippingThreshold
  const hasFreeShipping = hasFreeShippingByCoupon || hasFreeShippingByThreshold

  const shippingCost = hasFreeShipping ? 0 : (shippingFee || 0)
  const currentTotal = totalAfterPromotions + shippingCost


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
      }
    }
    loadShippingSettings()
  }, [])

  // Carrega CEP simulado do localStorage se houver
  useEffect(() => {
    const savedCep = localStorage.getItem('simulated_cep')
    if (savedCep) {
      setShippingCep(savedCep)
    }
  }, [])

  // Carrega endereço padrão e define o CEP inicial para cálculo se logado
  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!isAuthenticated || authLoading) return

      try {
        const addresses = await addressService.getSavedAddresses()
        const defaultAddr = addresses.find(addr => addr.is_default)
        if (defaultAddr && defaultAddr.cep) {
          // Se o usuário não simulou outro CEP manualmente, usa o padrão
          if (!localStorage.getItem('simulated_cep')) {
            setShippingCep(defaultAddr.cep)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar endereço padrão para frete:', error)
      }
    }

    loadDefaultAddress()
  }, [isAuthenticated, authLoading])

  // Calcula frete quando o CEP está preenchido
  useEffect(() => {
    const calculateShippingFee = async () => {
      const cleanCep = shippingCep.replace(/\D/g, '')

      if (cleanCep.length === 8) {
        try {
          setCalculatingShipping(true)

          const cartItems = items
            .filter(item => item.product)
            .map(item => ({
              product_id: item.product!.id,
              quantity: item.quantity,
            }))

          const result = await shippingService.calculateShipping(
            cleanCep,
            totalAfterPromotions,
            cartItems
          )

          if (result.shippingFee === null) {
            setShippingFee(null)
          } else {
            setShippingFee(result.shippingFee)
          }
        } catch (error: any) {
          console.error('Erro ao calcular frete no carrinho:', error)
          setShippingFee(null)
        } finally {
          setCalculatingShipping(false)
        }
      } else {
        setShippingFee(null)
      }
    }

    // Debounce de 500ms
    const timeoutId = setTimeout(calculateShippingFee, 500)
    return () => clearTimeout(timeoutId)
  }, [shippingCep, totalAfterPromotions, items])

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
            await refreshCart()
          } else {
            setLinkMessage({ type: 'error', text: result.message || 'Não foi possível vincular o carrinho' })
          }
        } catch (error: any) {
          setLinkMessage({ type: 'error', text: 'Erro ao vincular carrinho: ' + error.message })
        } finally {
          setLinkingCart(false)
          setTimeout(() => setLinkMessage(null), 5000)
        }
      } else {
        // Usuário não está logado, salva o token e redireciona para login
        cartService.savePendingToken(token)
        setLinkMessage({ type: 'info', text: 'Faça login ou cadastre-se para ver seu carrinho do WhatsApp' })

        setTimeout(() => {
          navigate('/login?redirect=/carrinho')
        }, 1500)
      }
    }

    processWhatsAppToken()
  }, [searchParams, isAuthenticated, authLoading, navigate, refreshCart, setSearchParams])

  // Obtém categorias únicas dos produtos no carrinho (suporta categorias compostas separadas por vírgula)
  const cartCategories = useMemo(() => {
    const categories: string[] = []
    items.forEach(item => {
      if (item.product?.category) {
        item.product.category.split(',').forEach(c => {
          const trimmed = c.trim()
          if (trimmed && !categories.includes(trimmed)) {
            categories.push(trimmed)
          }
        })
      }
    })
    return categories
  }, [items])

  // IDs dos produtos já no carrinho
  const cartProductIds = useMemo(() => {
    return items
      .filter(item => item.product)
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
      const subtotal = baseTotal

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

      const subtotal = baseTotal
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

  // Busca produtos recomendados (até 16 itens para garantir variedade de categorias)
  useEffect(() => {
    const loadRecommendations = async () => {
      if (cartCategories.length === 0) {
        setRecommendedProducts([])
        return
      }

      try {
        setLoadingRecommendations(true)
        const allRecommended: Product[] = []

        for (const category of cartCategories) {
          try {
            const products = await productsService.getByCategory(category)
            const filtered = products.filter(p => !cartProductIds.includes(p.id))
            allRecommended.push(...filtered)
          } catch (error) {
            console.error(`Erro ao buscar produtos da categoria ${category}:`, error)
          }
        }

        const uniqueProducts = allRecommended.filter(
          (product, index, self) => index === self.findIndex(p => p.id === product.id)
        ).slice(0, 16)

        setRecommendedProducts(uniqueProducts)
      } catch (error) {
        console.error('Erro ao carregar recomendações:', error)
      } finally {
        setLoadingRecommendations(false)
      }
    }

    loadRecommendations()
  }, [cartCategories, cartProductIds])

  const handleAddRecommendation = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddingProductId(product.id)
    try {
      await addProduct(product, 1)
      setAddedProductId(product.id)
      setTimeout(() => {
        setAddedProductId(null)
      }, 1500)
    } catch (error) {
      console.error('Erro ao adicionar produto:', error)
    } finally {
      setAddingProductId(null)
    }
  }

  // Tipo de compra recorrente removido.

  // Agrupa as recomendações por categoria para navegação por abas (suporta tags compostas separadas por vírgula)
  const recommendationsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {}
    recommendedProducts.forEach(p => {
      if (p.category) {
        p.category.split(',').forEach(c => {
          const cat = c.trim()
          if (cat) {
            if (!map[cat]) map[cat] = []
            if (!map[cat].some(existing => existing.id === p.id)) {
              map[cat].push(p)
            }
          }
        })
      } else {
        const cat = 'outros'
        if (!map[cat]) map[cat] = []
        map[cat].push(p)
      }
    })
    return map
  }, [recommendedProducts])

  const [activeRecommendationTab, setActiveRecommendationTab] = useState<string>('')

  // Sincroniza a aba ativa quando as recomendações mudarem
  useEffect(() => {
    const cats = Object.keys(recommendationsByCategory)
    if (cats.length > 0 && !cats.includes(activeRecommendationTab)) {
      setActiveRecommendationTab(cats[0])
    }
  }, [recommendationsByCategory, activeRecommendationTab])

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[75vh] flex items-center justify-center py-12 px-4 animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 text-center shadow-xl">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse-subtle">
            <ShoppingBag size={38} className="transition-transform duration-300 hover:rotate-12" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Seu carrinho está vazio</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
            Parece que você ainda não adicionou nenhum item. Explore nossas categorias para encontrar os melhores produtos de saúde e bem-estar.
          </p>
          <Link
            to="/produtos"
            className="w-full inline-flex items-center justify-center bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-98 text-sm gap-2"
          >
            <ShoppingCart size={16} />
            Explorar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-gray-900 min-h-screen pb-16 animate-fade-in">
      {/* Estilos locais para animação do caminhão de frete grátis e adicionar recomendados */}
      <style>{`
        @keyframes truckBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-truck-bounce {
          display: inline-block;
          animation: truckBounce 0.6s ease-in-out infinite;
        }
        @keyframes scaleBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .animate-scale-bounce {
          animation: scaleBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

      `}</style>

      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-7xl">

        {/* Modern Stepper header */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-start justify-between w-full max-w-lg relative">
            {/* Progress Bar Line Container */}
            <div className="absolute top-4 left-[16.667%] right-[16.667%] h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-primary-600 transition-all duration-500 ease-in-out"
                style={{ width: '0%' }}
              ></div>
            </div>

            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 z-10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-black text-xs shadow-md border-4 border-white dark:border-gray-900 transition-all duration-300">
                1
              </span>
              <span className="text-[11px] font-extrabold text-primary-600 dark:text-primary-400 uppercase tracking-wider text-center">Carrinho</span>
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 z-10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-extrabold text-xs border-2 border-gray-200 dark:border-gray-800 transition-all duration-300">
                2
              </span>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Entrega</span>
            </div>

            {/* Step-3 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 z-10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-extrabold text-xs border-2 border-gray-200 dark:border-gray-800 transition-all duration-300">
                3
              </span>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Confirmação</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Link Notifications */}
        {linkMessage && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm shadow-md border animate-fade-in ${linkMessage.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
            : linkMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-805'
            }`}>
            {linkMessage.type === 'success' && <CheckCircle size={18} className="flex-shrink-0 text-green-500" />}
            {linkMessage.type === 'info' && <Loader2 className="animate-spin flex-shrink-0 text-blue-500" size={18} />}
            <span className="flex-1 font-bold leading-relaxed">{linkMessage.text}</span>
          </div>
        )}

        {linkingCart && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-955 rounded-2xl flex items-center gap-3 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shadow-md">
            <Loader2 className="animate-spin flex-shrink-0 text-blue-500" size={18} />
            <span className="font-bold">Vinculando carrinho do WhatsApp à sua conta...</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* Left Column: Cart items and global settings */}
          <div className="lg:col-span-2 space-y-6">

            {/* List of Cart Products */}
            <div className="space-y-4">
              {items.map(item => {
                const price = item.product?.price || 0
                const itemTotal = price * item.quantity
                const itemDiscountedPrice = itemTotal

                return (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 overflow-hidden group">
                    <div className="p-4 sm:p-5 flex gap-4 sm:gap-5 items-center">

                      {/* Product image container */}
                      {item.product && (
                        <Link
                          to={`/produtos/${item.product.id}`}
                          className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center p-2 flex-shrink-0 relative border border-gray-100 dark:border-gray-700 block"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="max-w-full max-h-full object-contain transition-transform duration-300"
                            onError={handleProductImageError}
                          />
                        </Link>
                      )}

                      {/* Product Details info (WITHOUT category text labels as requested) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {item.product ? (
                              <Link to={`/produtos/${item.product.id}`} className="block">
                                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                  {item.product.name}
                                </h3>
                              </Link>
                            ) : (
                              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white truncate">
                                Produto Indisponível
                              </h3>
                            )}
                            {item.product && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                {item.product.description}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-all flex-shrink-0"
                            title="Remover produto do carrinho"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 sm:mt-5">
                          {/* Qty controls */}
                          <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-1 border border-gray-100 dark:border-gray-700">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95 disabled:opacity-30 transition-all"
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-gray-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95 transition-all"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          {/* Item price details */}
                          <div className="text-right">
                            {isSubscription && itemTotal !== itemDiscountedPrice && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-500 line-through">
                                R$ {itemTotal.toFixed(2).replace('.', ',')}
                              </p>
                            )}
                            <p className="text-base sm:text-lg font-black text-primary-700 dark:text-primary-400">
                              R$ {itemDiscountedPrice.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* Right Column: Sticky Checkout Sidebar */}
          <div className="lg:col-span-1 self-stretch">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 sticky top-24">

              {/* Shipping progress indicator with driving truck animation */}
              {freeShippingThreshold > 0 && (
                <div className="mb-6 p-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Icon container with a small street line */}
                      <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden ${hasFreeShipping
                        ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}>
                        <div className="flex flex-col items-center justify-center translate-y-[2px]">
                          <span className={`inline-block ${hasFreeShipping ? "animate-truck-bounce" : ""}`}>
                            <Truck className="w-4 h-4" />
                          </span>
                          {/* Small street underneath */}
                          <div className="w-6 h-[1.5px] bg-gray-300 dark:bg-gray-650 mt-[3px] rounded-full opacity-85"></div>
                        </div>
                      </div>

                      {/* Text label - identical styling on both states to prevent layout shifts */}
                      <span className="text-xs font-black text-gray-800 dark:text-gray-200 flex-1 leading-snug">
                        {hasFreeShipping ? (
                          <span className="text-green-600 dark:text-green-400">Você ganhou Frete Grátis!</span>
                        ) : (
                          <span>
                            Adicione mais <strong className="text-primary-600 dark:text-primary-400">R$ {(freeShippingThreshold - totalAfterPromotions).toFixed(2).replace('.', ',')}</strong> para ter Frete Grátis
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Progress Bar - identical height, rounded corners, and shadow */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${hasFreeShipping
                          ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                          : 'bg-gradient-to-r from-primary-500 to-primary-600'
                          }`}
                        style={{
                          width: `${hasFreeShipping ? 100 : Math.min(100, (totalAfterPromotions / freeShippingThreshold) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Promo code entry with pill badges */}
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white mb-3 flex items-center uppercase tracking-wider">
                  <Tag className="w-4 h-4 mr-2 text-gray-500" />
                  Cupons Promocionais
                </h3>

                {appliedPromoCodes.length === 0 ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="CÓDIGO DO CUPOM"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none uppercase font-bold"
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
                        className="px-4 py-2 text-xs font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {validatingPromoCode ? (
                          <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                          'Aplicar'
                        )}
                      </button>
                    </div>
                    {promoCodeError ? (
                      <p className="text-[11px] text-red-500 dark:text-red-400 font-bold">{promoCodeError}</p>
                    ) : (
                      <p className="text-[10px] text-gray-500">Insira seu cupom para ativar descontos adicionais.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {appliedPromoCodes.length > 1 && promoCodesValidation ? (
                      <div className="relative bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-900/30 rounded-2xl p-3">
                        <div className="overflow-hidden">
                          <div
                            className="flex transition-transform duration-300 ease-in-out"
                            style={{ transform: `translateX(-${currentCouponIndex * 100}%)` }}
                          >
                            {promoCodesValidation.promoCodes.map((pc) => {
                              const appliedDiscount = promoCodesValidation.appliedDiscounts.percentage?.code === pc.code
                                ? promoCodesValidation.appliedDiscounts.percentage
                                : promoCodesValidation.appliedDiscounts.fixed.find(f => f.code === pc.code)

                              return (
                                <div key={pc.id} className="min-w-full flex-shrink-0">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-extrabold text-green-900 dark:text-green-300 truncate">
                                          {pc.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">
                                            {pc.code}
                                          </span>
                                          {appliedDiscount && appliedDiscount.discount > 0 && (
                                            <span className="text-[10px] font-black text-green-600 dark:text-green-400">
                                              • {pc.discount_type === 'percentage'
                                                ? `${pc.discount_value}% OFF`
                                                : `R$ ${appliedDiscount.discount.toFixed(2).replace('.', ',')} OFF`}
                                            </span>
                                          )}
                                          {pc.free_shipping && (
                                            <span className="text-[9px] font-black bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                              FRETE GRÁTIS
                                              <Truck className="w-2.5 h-2.5" />
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemovePromoCode(pc.code)}
                                      className="text-red-500 dark:text-red-400 hover:text-red-600 p-1 flex-shrink-0 opacity-80 hover:opacity-100"
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

                        {/* Carousel navigations */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-green-200/30">
                          <button
                            onClick={() => setCurrentCouponIndex(prev => prev > 0 ? prev - 1 : promoCodesValidation.promoCodes.length - 1)}
                            className="p-1 text-green-700 dark:text-green-400 hover:text-green-900 disabled:opacity-30"
                            disabled={validatingPromoCode}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="flex gap-1">
                            {promoCodesValidation.promoCodes.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentCouponIndex(index)}
                                className={`h-1.5 rounded-full transition-all ${index === currentCouponIndex ? 'bg-green-600 w-4' : 'bg-green-200 w-1.5'}`}
                                disabled={validatingPromoCode}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => setCurrentCouponIndex(prev => prev < promoCodesValidation.promoCodes.length - 1 ? prev + 1 : 0)}
                            className="p-1 text-green-700 dark:text-green-400 hover:text-green-900 disabled:opacity-30"
                            disabled={validatingPromoCode}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      appliedPromoCodes.length === 1 && promoCodesValidation && (
                        <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30 rounded-2xl p-3">
                          {promoCodesValidation.promoCodes.map((pc) => {
                            const appliedDiscount = promoCodesValidation.appliedDiscounts.percentage?.code === pc.code
                              ? promoCodesValidation.appliedDiscounts.percentage
                              : promoCodesValidation.appliedDiscounts.fixed.find(f => f.code === pc.code)

                            return (
                              <div key={pc.id} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-extrabold text-green-900 dark:text-green-300 truncate">
                                      {pc.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">
                                        {pc.code}
                                      </span>
                                      {appliedDiscount && appliedDiscount.discount > 0 && (
                                        <span className="text-[10px] font-black text-green-600 dark:text-green-400">
                                          • {pc.discount_type === 'percentage'
                                            ? `${pc.discount_value}% OFF`
                                            : `R$ ${appliedDiscount.discount.toFixed(2).replace('.', ',')} OFF`}
                                        </span>
                                      )}
                                      {pc.free_shipping && (
                                        <span className="text-[9px] font-black bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          FRETE GRÁTIS
                                          <Truck className="w-2.5 h-2.5" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemovePromoCode(pc.code)}
                                  className="text-red-500 dark:text-red-400 hover:text-red-600 p-1 flex-shrink-0 opacity-80 hover:opacity-100"
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

                    {/* Add another coupon entry input */}
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="ADICIONAR OUTRO CUPOM"
                          className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none uppercase font-bold"
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
                          className="px-4 py-2 text-xs font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {validatingPromoCode ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            'Adicionar'
                          )}
                        </button>
                      </div>
                      {promoCodeError && (
                        <p className="text-[11px] text-red-500 dark:text-red-400 font-bold">{promoCodeError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Items list */}
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 uppercase tracking-wider">
                Resumo do Pedido
              </h2>

              <div className="space-y-3.5 mb-6">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-extrabold text-gray-900 dark:text-white">R$ {baseTotal.toFixed(2).replace('.', ',')}</span>
                </div>



                {/* Coupons Discount */}
                {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {promoCodesValidation.promoCodes.length > 1
                        ? `Cupons (${promoCodesValidation.promoCodes.length})`
                        : 'Cupom'}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-extrabold">
                      - R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {/* Applicable Promotions from API */}
                {applicablePromotions.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-pink-500 flex-shrink-0" />
                      <span className="text-xs font-extrabold text-gray-900 dark:text-white">Ofertas Ativadas</span>
                    </div>

                    {loadingPromotions ? (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Verificando campanhas...</div>
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
                            <div key={promo.id} className="bg-pink-50/30 dark:bg-pink-955 border border-pink-100 dark:border-pink-900/30 rounded-xl p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-extrabold text-pink-900 dark:text-pink-300 truncate">{promo.name}</p>
                                  {discountText && (
                                    <p className="text-[10px] text-pink-700 dark:text-pink-400 font-bold mt-0.5">{discountText}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {promotionDiscount > 0 && (
                          <div className="flex justify-between items-center text-xs text-pink-600 dark:text-pink-400 font-bold pt-2 border-t border-pink-100/50 dark:border-pink-950/20">
                            <span>Desconto Ofertas</span>
                            <span>
                              - R$ {promotionDiscount.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Fee details */}
                <div className="flex justify-between items-center text-xs sm:text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Truck className="w-4 h-4 text-gray-500" />
                    Frete
                  </span>
                  <div className="text-right font-extrabold text-xs sm:text-sm">
                    {isSubscription ? (
                      <span className="text-green-600 dark:text-green-400 font-extrabold">
                        Grátis (Assinatura)
                      </span>
                    ) : hasFreeShipping ? (
                      <span className="text-green-600 dark:text-green-400 font-extrabold">
                        Grátis
                      </span>
                    ) : shippingFee !== null ? (
                      <span className="text-gray-900 dark:text-white font-extrabold">
                        R$ {shippingFee.toFixed(2).replace('.', ',')}
                      </span>
                    ) : calculatingShipping ? (
                      <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 font-semibold">
                        <Loader2 className="animate-spin w-3 h-3" /> Calculando...
                      </span>
                    ) : (
                      <span className="text-gray-900 dark:text-white font-extrabold text-xs">
                        A calcular no checkout
                      </span>
                    )}
                  </div>
                </div>

                {/* Final Total */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-extrabold text-gray-900 dark:text-white">Total Geral</span>
                    <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                      R$ {currentTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action checkout buttons */}
              <button
                onClick={() => {
                  localStorage.removeItem('subscription_plan')
                  navigate('/checkout')
                }}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black py-4 px-6 rounded-2xl transition-all duration-200 mb-4 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg active:scale-98 group"
              >
                <span>Continuar</span>
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <Link
                to="/produtos"
                className="w-full inline-flex items-center justify-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-extrabold transition-colors py-2 text-center"
              >
                <ArrowLeft size={12} />
                <span>Continuar Comprando</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recomendações - Rolagem Lateral (Full Width) */}
        {recommendedProducts.length > 0 && (
          <div className="mt-16 pt-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Complemente seu pedido
              </h2>
              {/* Navigation Arrows for Desktop */}
              <div className="hidden sm:flex gap-2">
                <button
                  onClick={() => scrollRecommendations('left')}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scrollRecommendations('right')}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                  aria-label="Próximo"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-5 scrollbar-hide snap-x scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {recommendedProducts.map(product => (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-gray-800 rounded-3xl border p-4 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between w-48 sm:w-56 flex-shrink-0 snap-start relative overflow-hidden ${addedProductId === product.id
                    ? 'border-green-500 dark:border-green-500 shadow-md ring-1 ring-green-500 animate-scale-bounce'
                    : 'border-gray-200 dark:border-gray-700'
                    }`}
                  onClick={() => navigate(`/produtos/${product.id}`)}
                >
                  <div>
                    {/* Image */}
                    <div className="w-full h-24 sm:h-32 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center p-2 mb-3 relative border border-gray-100 dark:border-gray-700">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain transition-transform duration-300"
                        onError={handleProductImageError}
                      />
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-950 dark:text-white mb-1 line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {product.name}
                    </h3>

                    {/* Desc */}
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">
                      {product.description || 'Sem descrição cadastrada'}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between gap-1 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm sm:text-base font-black text-primary-600 dark:text-primary-400">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </p>
                    <button
                      onClick={(e) => handleAddRecommendation(product, e)}
                      disabled={addingProductId === product.id}
                      className={`p-2 rounded-xl transition-all duration-300 shadow-sm active:scale-95 flex-shrink-0 ${addedProductId === product.id
                        ? 'bg-green-600 text-white scale-110'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                        }`}
                      title="Adicionar ao carrinho"
                    >
                      {addingProductId === product.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : addedProductId === product.id ? (
                        <Check size={14} className="animate-scale-bounce" />
                      ) : (
                        <Plus size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingRecommendations && (
          <div className="mt-16 pt-8">
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={28} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
