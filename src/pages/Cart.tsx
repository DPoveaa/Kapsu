import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Loader2, Calendar, Check, Sparkles, Truck, Gift, Tag, X, ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft, MapPin, Edit2, TestTube, Copy, Download, CheckCircle } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/products.service'
import { cartService } from '../services/cart.service'
import { promotionsService, Promotion } from '../services/promotions.service'
import { promoCodesService, MultiplePromoCodesValidation } from '../services/promo-codes.service'
import { shippingService } from '../services/shipping.service'
import { addressService, SavedAddress } from '../services/address.service'
import { paymentService, buildShippingAddress } from '../services/payment.service'
import { orderService } from '../services/order.service'
import { cepService } from '../services/cep.service'
import { Product } from '../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { HorizontalScrollContainer } from '../components/HorizontalScrollContainer'
import ProductCard from '../components/ProductCard'
import { CheckoutPayment } from '../components/Checkout/CheckoutPayment'
import { toast } from '../utils/toast'
import {
  clearPendingCheckoutOrderId,
  getPendingCheckoutOrderId,
  isPaidOrderStatus,
  setPendingCheckoutOrderId,
} from '../utils/checkout'
import { generateProductUrl } from '../utils/productUrl'

const formatEstimatedDateFriendly = (estimatedDateStr: string): string => {
  if (!estimatedDateStr) return ''
  let date: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(estimatedDateStr)) {
    const [year, month, day] = estimatedDateStr.split('-').map(Number)
    date = new Date(year, month - 1, day)
  } else {
    date = new Date(estimatedDateStr)
  }
  if (isNaN(date.getTime())) return ''
  const weekdays = [
    'domingo',
    'segunda',
    'terça',
    'quarta',
    'quinta',
    'sexta',
    'sábado'
  ]
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ]
  const day = date.getDate()
  const monthName = months[date.getMonth()]
  const weekdayName = weekdays[date.getDay()]
  return `${weekdayName}, ${day} de ${monthName}`
}

interface CartProps {
  initialStep?: 'cart' | 'delivery' | 'payment'
}

export default function Cart({ initialStep = 'cart' }: CartProps) {
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
  const { isAuthenticated, loading: authLoading, user, isAdmin } = useAuth()
  const { items, updateQuantity, removeItem, getTotal, refreshCart, clearCart, loading: cartLoading } = useCart()
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
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

  // --- ESTADOS DO CHECKOUT ---
  const urlStep = searchParams.get('step') as 'cart' | 'delivery' | 'payment' | null
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'delivery' | 'payment'>(urlStep || initialStep)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [creatingOrderWithoutPayment, setCreatingOrderWithoutPayment] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'boleto' | 'credit_card'>('pix')
  const [subscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [copiedPix, setCopiedPix] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null)
  const [resolvingPendingOrder, setResolvingPendingOrder] = useState(false)
  const resolvingPendingOrderRef = useRef(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Estados para endereços salvos
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<string | null>(null)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [editAddressData, setEditAddressData] = useState<SavedAddress | null>(null)
  const [newAddressNickname, setNewAddressNickname] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true)

  useEffect(() => {
    if (items.length === 0 && !paymentResult) return

    const urlOrderId = searchParams.get('orderId')
    const storedOrderId = getPendingCheckoutOrderId()
    const resolvedOrderId = urlOrderId || storedOrderId
    if (resolvedOrderId) {
      setExistingOrderId(resolvedOrderId)
    }
  }, [searchParams, items.length, paymentResult])

  // Carrinho vazio: limpa checkout e só redireciona se o pedido pendente já foi pago
  useEffect(() => {
    if (authLoading || cartLoading || items.length > 0 || paymentResult) return

    const pendingOrderId = getPendingCheckoutOrderId() || existingOrderId || searchParams.get('orderId')

    const clearCheckoutUi = () => {
      setExistingOrderId(null)
      clearPendingCheckoutOrderId()
      setCheckoutStep('cart')
      if (searchParams.get('step') || searchParams.get('orderId')) {
        setSearchParams({}, { replace: true })
      }
    }

    if (!pendingOrderId) {
      clearCheckoutUi()
      return
    }

    if (resolvingPendingOrderRef.current) return

    let cancelled = false
    resolvingPendingOrderRef.current = true

    const verifyPaidOrder = async () => {
      setResolvingPendingOrder(true)
      try {
        const order = await orderService.getOrder(pendingOrderId)
        if (cancelled) return

        if (isPaidOrderStatus(order.status)) {
          clearPendingCheckoutOrderId()
          setExistingOrderId(null)
          navigate(`/payment-success?order_id=${pendingOrderId}`, { replace: true })
          return
        }

        clearCheckoutUi()
      } catch (err) {
        console.error('Erro ao verificar pedido pendente:', err)
        if (!cancelled) clearCheckoutUi()
      } finally {
        resolvingPendingOrderRef.current = false
        if (!cancelled) setResolvingPendingOrder(false)
      }
    }

    void verifyPaidOrder()

    return () => {
      cancelled = true
    }
  }, [authLoading, cartLoading, items.length, paymentResult, existingOrderId, navigate, searchParams, setSearchParams])

  useEffect(() => {
    if ((checkoutStep === 'delivery' || checkoutStep === 'payment') && isAuthenticated) {
      loadAddresses()
    }
  }, [checkoutStep, isAuthenticated])

  useEffect(() => {
    if (!authLoading && !isAuthenticated && (checkoutStep === 'delivery' || checkoutStep === 'payment')) {
      navigate(`/login?redirect=/carrinho?step=${checkoutStep}`)
    }
  }, [authLoading, isAuthenticated, checkoutStep, navigate])

  const isFieldInvalid = (name: 'cep' | 'address' | 'number' | 'bairro' | 'city' | 'state') => {
    if (!attemptedSubmit) return false
    if (name === 'cep') {
      const cleanCep = formData.cep.replace(/\D/g, '')
      return !formData.cep || cleanCep.length !== 8
    }
    return !formData[name]
  }

  useEffect(() => {
    setAttemptedSubmit(false)
  }, [checkoutStep, showNewAddressForm, selectedAddressId, editingAddressId])

  useEffect(() => {
    if (savedAddresses.length > 0) {
      setShowNewAddressForm(false)
    }
  }, [checkoutStep, savedAddresses.length])

  const [formData, setFormData] = useState({
    cep: localStorage.getItem('simulated_cep') || '',
    address: '',
    number: '',
    complement: '',
    bairro: '',
    city: '',
    state: ''
  })
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [isFreeShipping, setIsFreeShipping] = useState(false)
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [shippingCalculationFailed, setShippingCalculationFailed] = useState(false)
  const [deliveryTime, setDeliveryTime] = useState<number | null>(null)
  const [deliveryTimeType, setDeliveryTimeType] = useState<'business' | 'calendar' | null>(null)
  const [estimatedDate, setEstimatedDate] = useState<string | null>(null)
  const [estimatedDateFormatted, setEstimatedDateFormatted] = useState<string | null>(null)
  const [service, setService] = useState<string | null>(null)
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState<number | null>(null)
  const [defaultDeliveryTimeType, setDefaultDeliveryTimeType] = useState<'business' | 'calendar'>('business')
  const [cepWarning, setCepWarning] = useState<string | null>(null)
  const [showCepWarning, setShowCepWarning] = useState(false)
  const [isFreeShippingApplicable, setIsFreeShippingApplicable] = useState<boolean>(true)

  // Oculta aviso de CEP automaticamente após 5 segundos
  useEffect(() => {
    if (showCepWarning) {
      const timer = setTimeout(() => {
        setShowCepWarning(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showCepWarning])

  useEffect(() => {
    if (paymentResult?.paymentMethod === 'pix' && paymentResult.expirationDate) {
      const expirationTime = new Date(paymentResult.expirationDate).getTime()

      const interval = setInterval(() => {
        const now = new Date().getTime()
        const distance = expirationTime - now

        if (distance < 0) {
          clearInterval(interval)
          setTimeLeft('Expirado')
          return
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)

        setTimeLeft(
          `${hours > 0 ? hours + 'h ' : ''}${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
        )
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [paymentResult])

  useEffect(() => {
    const orderId =
      paymentResult?.orderId ||
      existingOrderId ||
      getPendingCheckoutOrderId() ||
      searchParams.get('orderId')

    if (!orderId || !paymentResult) return

    const pollInterval = setInterval(async () => {
      try {
        const order = await orderService.getOrder(orderId)

        if (isPaidOrderStatus(order.status)) {
          clearInterval(pollInterval)
          clearPendingCheckoutOrderId()
          setExistingOrderId(null)
          await clearCart()
          navigate(`/payment-success?order_id=${orderId}`, { replace: true })
        }
      } catch (err) {
        console.error('Erro ao consultar status do pagamento:', err)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [paymentResult, existingOrderId, searchParams, clearCart, navigate])

  // Alias para retrocompatibilidade com o simulador de frete do carrinho
  const shippingCep = formData.cep
  const setShippingCep = (cep: string) => setFormData(prev => ({ ...prev, cep }))

  // Verifica elegibilidade da região de forma rápida assim que o CEP atinge 8 dígitos
  useEffect(() => {
    const checkRegionEligibility = async () => {
      const cleanCep = shippingCep.replace(/\D/g, '')
      if (cleanCep.length === 8) {
        try {
          const res = await shippingService.checkRegion(cleanCep)
          setIsFreeShippingApplicable(res.isLocal)
        } catch (err) {
          console.error('Erro ao verificar elegibilidade da região:', err)
          setIsFreeShippingApplicable(false)
        }
      } else {
        setIsFreeShippingApplicable(true)
      }
    }

    checkRegionEligibility()
  }, [shippingCep])

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
  const hasFreeShipping = hasFreeShippingByCoupon || hasFreeShippingByThreshold || isFreeShipping

  const shippingCost = hasFreeShipping ? 0 : (shippingFee || 0)
  const currentTotal = totalAfterPromotions + shippingCost
  const displayedDeliveryTime = deliveryTime ?? defaultDeliveryTime
  const displayedDeliveryTimeType = deliveryTimeType ?? defaultDeliveryTimeType

  const calculatedEstimatedDateStr = useMemo(() => {
    if (displayedDeliveryTime === null || displayedDeliveryTime === undefined) return ''
    let date = new Date()
    let remainingDays = displayedDeliveryTime
    if (displayedDeliveryTimeType === 'calendar') {
      date.setDate(date.getDate() + remainingDays)
    } else {
      while (remainingDays > 0) {
        date.setDate(date.getDate() + 1)
        const dayOfWeek = date.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          remainingDays--
        }
      }
    }
    return date.toISOString().split('T')[0]
  }, [displayedDeliveryTime, displayedDeliveryTimeType])

  const displayedEstimatedDate = estimatedDateFormatted || (estimatedDate ? formatEstimatedDateFriendly(estimatedDate) : (calculatedEstimatedDateStr ? formatEstimatedDateFriendly(calculatedEstimatedDateStr) : ''))


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
        setDefaultDeliveryTime(settings.general_delivery_time || null)
        setDefaultDeliveryTimeType(settings.general_delivery_time_type || 'business')
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
        const defaultAddr = addresses.find(addr => addr.is_default) || addresses[0]
        if (defaultAddr?.cep) {
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
          setShippingCalculationFailed(false)

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
            setShippingCalculationFailed(true)
            setDeliveryTime(null)
            setDeliveryTimeType(null)
            setEstimatedDate(null)
            setEstimatedDateFormatted(null)
            setService(null)
            setCepWarning(result.message || 'CEP inválido ou não atendido.')
            setShowCepWarning(true)
            setIsFreeShippingApplicable(false)
          } else {
            setShippingFee(result.shippingFee)
            setIsFreeShipping(result.isFreeShipping)
            setDeliveryTime(result.deliveryTime || null)
            setDeliveryTimeType(result.deliveryTimeType || null)
            setEstimatedDate(result.estimatedDate || null)
            setEstimatedDateFormatted(result.estimatedDateFormatted || null)
            setService(result.service || null)
            setShowCepWarning(false)
            setIsFreeShippingApplicable(!result.externalShipping)
          }
        } catch (error: any) {
          console.error('Erro ao calcular frete no carrinho:', error)
          setShippingFee(null)
          setShippingCalculationFailed(true)
          setDeliveryTime(null)
          setDeliveryTimeType(null)
          setEstimatedDate(null)
          setEstimatedDateFormatted(null)
          setService(null)
          setCepWarning(error.message || 'Erro ao calcular frete. Verifique os dados e tente novamente.')
          setShowCepWarning(true)
          setIsFreeShippingApplicable(false)
        } finally {
          setCalculatingShipping(false)
        }
      } else {
        setShippingFee(null)
        setIsFreeShipping(false)
        setShippingCalculationFailed(false)
        setDeliveryTime(null)
        setDeliveryTimeType(null)
        setEstimatedDate(null)
        setEstimatedDateFormatted(null)
        setService(null)
        setIsFreeShippingApplicable(true)
      }
    }

    // Debounce de 500ms
    const timeoutId = setTimeout(calculateShippingFee, 500)
    return () => clearTimeout(timeoutId)
  }, [shippingCep, totalAfterPromotions, items])

  // Carrega endereços salvos
  const loadAddresses = async () => {
    if (!isAuthenticated) return

    try {
      setLoadingAddresses(true)
      const addresses = await addressService.getSavedAddresses()
      setSavedAddresses(addresses)

      // Se houver endereço padrão e nenhum selecionado, seleciona automaticamente
      if (!selectedAddressId && !showNewAddressForm && addresses.length > 0) {
        const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0]
        selectAddress(defaultAddress)
      }

      // Se não houver nenhum endereço, marca a opção de salvar por padrão e abre formulário
      if (addresses.length === 0) {
        setShowNewAddressForm(true)
        setSaveAddressToProfile(true)
      }
    } catch (error: any) {
      console.error('Erro ao carregar endereços:', error)
      if (savedAddresses.length === 0) {
        setShowNewAddressForm(true)
        setSaveAddressToProfile(true)
      }
    } finally {
      setLoadingAddresses(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses()
    }
  }, [isAuthenticated])

  // Seleciona um endereço salvo
  const selectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id)
    setEditingAddressId(null)
    setFormData({
      cep: address.cep,
      address: address.address,
      number: address.number,
      complement: address.complement || '',
      bairro: address.bairro || '',
      city: address.city,
      state: address.state
    })
    setShowNewAddressForm(false)
  }

  // Busca endereço por CEP
  useEffect(() => {
    const fetchAddress = async () => {
      const cleanCep = formData.cep.replace(/\D/g, '')

      if (cleanCep.length === 8) {
        // Verifica se o usuário está focado no input de CEP (ou seja, digitando ativamente)
        const isCepInputActive = document.activeElement?.getAttribute('name') === 'cep'

        try {
          const addressData = await cepService.searchCep(cleanCep)
          if (addressData) {
            setFormData(prev => {
              const isAddressEmpty = !prev.address || !prev.city || !prev.state

              if (isCepInputActive || isAddressEmpty) {
                return {
                  ...prev,
                  address: addressData.logradouro || prev.address,
                  bairro: addressData.bairro || prev.bairro,
                  city: addressData.localidade || prev.city,
                  state: addressData.uf || prev.state
                }
              }
              return prev
            })
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error)
        }
      }
    }

    const timeoutId = setTimeout(fetchAddress, 400)
    return () => clearTimeout(timeoutId)
  }, [formData.cep])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'cep') {
      const cleanValue = value.replace(/\D/g, '')
      if (cleanValue.length <= 8) {
        const formatted = cleanValue.length > 5
          ? `${cleanValue.substring(0, 5)}-${cleanValue.substring(5)}`
          : cleanValue
        setFormData(prev => ({ ...prev, [name]: formatted }))
        setShippingCalculationFailed(false)
        setShowCepWarning(false)
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    if (selectedAddressId && !editingAddressId) {
      setEditingAddressId(selectedAddressId)
    }
  }

  const handleUpdateAddress = async () => {
    if (!editingAddressId) return

    try {
      await addressService.updateSavedAddress(editingAddressId, {
        cep: formData.cep,
        address: formData.address,
        number: formData.number,
        complement: formData.complement || undefined,
        bairro: formData.bairro || undefined,
        city: formData.city,
        state: formData.state,
      })

      await loadAddresses()
      setEditingAddressId(null)
      toast.success('Endereço atualizado com sucesso!')

      const updatedAddress = savedAddresses.find(addr => addr.id === editingAddressId)
      if (updatedAddress) {
        const addresses = await addressService.getSavedAddresses()
        const refreshed = addresses.find(addr => addr.id === editingAddressId)
        if (refreshed) {
          selectAddress(refreshed)
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar endereço:', error)
      toast.error('Erro ao atualizar endereço: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const handleEditAddress = (address: SavedAddress, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditAddressData(address)
    setShowEditAddressModal(true)
  }

  const handleSaveEditAddress = async () => {
    if (!editAddressData) return

    try {
      await addressService.updateSavedAddress(editAddressData.id, {
        nickname: editAddressData.nickname,
        cep: editAddressData.cep,
        address: editAddressData.address,
        number: editAddressData.number,
        complement: editAddressData.complement || undefined,
        bairro: editAddressData.bairro || undefined,
        city: editAddressData.city,
        state: editAddressData.state,
        isDefault: editAddressData.is_default,
      })

      await loadAddresses()
      setShowEditAddressModal(false)
      setEditAddressData(null)
      toast.success('Endereço atualizado com sucesso!')

      if (selectedAddressId === editAddressData.id) {
        const addresses = await addressService.getSavedAddresses()
        const updated = addresses.find(addr => addr.id === editAddressData.id)
        if (updated) {
          selectAddress(updated)
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar endereço:', error)
      toast.error('Erro ao atualizar endereço: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      await addressService.deleteSavedAddress(id)
      await loadAddresses()
      setShowDeleteConfirmModal(null)

      if (selectedAddressId === id) {
        setSelectedAddressId(null)
        setEditingAddressId(null)
        setFormData({
          cep: '',
          address: '',
          number: '',
          complement: '',
          bairro: '',
          city: '',
          state: ''
        })
      }
    } catch (error: any) {
      console.error('Erro ao remover endereço:', error)
      toast.error('Erro ao remover endereço: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const hasInvalidCep = () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasCompleteCep = cleanCep.length === 8
    return hasCompleteCep && !calculatingShipping && shippingCalculationFailed
  }

  const isAddressValid = () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasCompleteCep = cleanCep.length === 8
    const hasRequiredFields = formData.address && formData.number && formData.city && formData.state && formData.cep

    if (hasInvalidCep()) {
      return false
    }

    return hasRequiredFields && hasCompleteCep
  }

  const canProceedToPayment = () => {
    if (creatingOrder) return false
    if (calculatingShipping) return false
    if (hasInvalidCep()) return false
    if (!isAddressValid()) return false
    return true
  }

  const getPaymentBlockReason = (): string | null => {
    if (creatingOrder) return 'Aguarde, processando pagamento...'
    if (calculatingShipping) return 'Aguarde o cálculo do frete...'
    if (hasInvalidCep()) return 'Não entregamos neste CEP. Volte e altere o endereço.'
    if (!formData.cep || formData.cep.replace(/\D/g, '').length !== 8) return 'CEP inválido. Volte e complete o endereço.'
    if (!formData.address || !formData.number || !formData.city || !formData.state) {
      return 'Endereço incompleto. Volte e preencha a entrega.'
    }
    return null
  }

  const canUseSavedAddressId = () =>
    Boolean(selectedAddressId && !showNewAddressForm && editingAddressId !== selectedAddressId)

  const buildCreatePreferenceParams = () => {
    const resolvedOrderId =
      existingOrderId || getPendingCheckoutOrderId() || undefined

    const base = {
      ...(isSubscription ? { subscriptionPlan } : {}),
      ...(shippingCost > 0 ? { shippingFee: shippingCost } : {}),
      paymentMethod: selectedPaymentMethod,
      ...(resolvedOrderId ? { orderId: resolvedOrderId } : {}),
    }

    if (canUseSavedAddressId()) {
      return { ...base, addressId: selectedAddressId! }
    }

    return { ...base, shippingAddress: buildShippingAddress(formData) }
  }

  const handleContinueToDelivery = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/carrinho?step=delivery')
      return
    }
    setCheckoutStep('delivery')
    setSearchParams({ step: 'delivery' })
  }

  const handleContinueToPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setAttemptedSubmit(true)

    // Valida endereço (bairro opcional — alinhado ao fluxo do Matheus)
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      toast.warning('Por favor, preencha todos os campos do endereço')
      return
    }

    const cleanCep = formData.cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      toast.warning('Por favor, insira um CEP válido')
      return
    }

    // Valida se há entrega disponível
    if (hasInvalidCep()) {
      toast.error('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    } else if (!selectedAddressId && saveAddressToProfile) {
      // Auto-salvar novo endereço
      try {
        const savedAddr = await addressService.createSavedAddress({
          nickname: newAddressNickname || formData.bairro || 'Meu Endereço',
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement || undefined,
          bairro: formData.bairro,
          city: formData.city,
          state: formData.state,
        })
        await loadAddresses()
        if (savedAddr && savedAddr.id) {
          selectAddress(savedAddr)
        }
        setNewAddressNickname('')
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
    }

    setCheckoutStep('payment')
    setSearchParams({ step: 'payment' })
  }

  const handleContinueWithSavedAddress = () => {
    if (!canProceedToPayment()) {
      const reason = getPaymentBlockReason()
      if (reason) toast.warning(reason)
      return
    }
    setCheckoutStep('payment')
    setSearchParams({ step: 'payment' })
  }

  const handleBackToCart = () => {
    setCheckoutStep('cart')
    setSearchParams({ step: 'cart' })
  }

  const handleBackToDelivery = () => {
    setCheckoutStep('delivery')
    setSearchParams({ step: 'delivery' })
  }

  // Efeito para escutar mudanças no histórico do navegador
  useEffect(() => {
    if (items.length === 0 && !paymentResult) return

    const stepParam = searchParams.get('step') as 'cart' | 'delivery' | 'payment' | null
    if (stepParam && stepParam !== checkoutStep) {
      setCheckoutStep(stepParam)
    } else if (!stepParam && checkoutStep !== 'cart') {
      setCheckoutStep('cart')
    }
  }, [searchParams, items.length, paymentResult, checkoutStep])

  const handleCopyPix = () => {
    if (paymentResult?.pixPayload) {
      navigator.clipboard.writeText(paymentResult.pixPayload)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2000)
    }
  }

  const handleResetPayment = () => {
    const orderId = paymentResult?.orderId || existingOrderId || getPendingCheckoutOrderId()

    setPaymentResult(null)
    setCheckoutError(null)

    if (items.length === 0) {
      setExistingOrderId(null)
      clearPendingCheckoutOrderId()
      setCheckoutStep('cart')
      setSearchParams({}, { replace: true })
      return
    }

    if (orderId) {
      setExistingOrderId(orderId)
      setPendingCheckoutOrderId(orderId)
    }
    setCheckoutStep('payment')
    setSearchParams(orderId ? { step: 'payment', orderId } : { step: 'payment' })
  }

  const handlePaymentSubmit = () => {
    const blockReason = getPaymentBlockReason()
    if (blockReason) {
      toast.warning(blockReason)
      return
    }
    void handleSubmit()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (creatingOrder) return

    // Valida endereço
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      toast.warning('Por favor, preencha todos os campos do endereço')
      return
    }

    // Valida se há entrega disponível
    if (hasInvalidCep()) {
      toast.error('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    } else if (!selectedAddressId && saveAddressToProfile) {
      try {
        const savedAddr = await addressService.createSavedAddress({
          nickname: newAddressNickname || formData.bairro || 'Meu Endereço',
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement || undefined,
          bairro: formData.bairro,
          city: formData.city,
          state: formData.state,
        })
        await loadAddresses()
        if (savedAddr && savedAddr.id) {
          selectAddress(savedAddr)
        }
        setNewAddressNickname('')
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
    }

    try {
      setCreatingOrder(true)
      setCheckoutError(null)

      if (editingAddressId && selectedAddressId) {
        await handleUpdateAddress()
      }

      const params = buildCreatePreferenceParams()
      const preference = await paymentService.createPreference(params as any)

      if (preference.orderId) {
        setExistingOrderId(preference.orderId)
        setPendingCheckoutOrderId(preference.orderId)
      }

      const pref = preference as any

      if (preference.paymentMethod === 'credit_card' && pref.status !== 'FAILED' && pref.status !== 'PENDING_CARD_DETAILS') {
        await clearCart()
      }

      if (preference.paymentMethod === 'credit_card' && pref.status === 'PENDING_CARD_DETAILS') {
        setCreatingOrder(false)
        navigate(`/carrinho/payment/card?orderId=${pref.orderId}`)
        return
      }

      setPaymentResult(preference)
      setCreatingOrder(false)
    } catch (error: any) {
      console.error('Erro ao criar preferência de pagamento:', error)
      const message = error.message || 'Erro ao processar pagamento. Tente novamente.'
      setCheckoutError(message)
      toast.error(message)
      setCreatingOrder(false)
    }
  }

  const handleCreateOrderWithoutPayment = async () => {
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      toast.warning('Por favor, preencha todos os campos do endereço')
      return
    }

    if (hasInvalidCep()) {
      toast.error('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    } else if (!selectedAddressId && saveAddressToProfile) {
      try {
        const savedAddr = await addressService.createSavedAddress({
          nickname: newAddressNickname || formData.bairro || 'Meu Endereço',
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement || undefined,
          bairro: formData.bairro,
          city: formData.city,
          state: formData.state,
        })
        await loadAddresses()
        if (savedAddr && savedAddr.id) {
          selectAddress(savedAddr)
        }
        setNewAddressNickname('')
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
    }

    try {
      setCreatingOrderWithoutPayment(true)

      const shippingAddress = buildShippingAddress(formData)

      const order = await orderService.createOrderWithoutPayment(
        shippingAddress,
        isSubscription ? subscriptionPlan : undefined,
        shippingCost > 0 ? shippingCost : undefined
      )

      await clearCart()

      navigate(`/payment-success?order_id=${order.id}`)
    } catch (error: any) {
      console.error('Erro ao criar pedido sem pagamento:', error)
      toast.error(error.message || 'Erro ao criar pedido. Tente novamente.')
      setCreatingOrderWithoutPayment(false)
    }
  }

  useEffect(() => {
    const processWhatsAppToken = async () => {
      const token = searchParams.get('token')
      if (!token || authLoading) return

      // Remove o token da URL para evitar reprocessamento
      searchParams.delete('token')
      setSearchParams(searchParams, { replace: true })

      if (isAuthenticated) {
        // Usuário já está logado, vincula automaticamente
        toast.info('Vinculando carrinho do WhatsApp...')

        try {
          const result = await cartService.validateAndLinkToken(token)
          if (result.success) {
            toast.success('Carrinho do WhatsApp vinculado com sucesso!')
            await refreshCart()
          } else {
            toast.error(result.message || 'Não foi possível vincular o carrinho')
          }
        } catch (error: any) {
          toast.error('Erro ao vincular carrinho: ' + error.message)
        }
      } else {
        // Usuário não está logado, salva o token e redireciona para login
        cartService.savePendingToken(token)
        toast.info('Faça login ou cadastre-se para ver seu carrinho do WhatsApp')

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
      }
    }

    loadRecommendations()
  }, [cartCategories, cartProductIds])
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

  if (authLoading || resolvingPendingOrder || (cartLoading && items.length === 0 && !paymentResult)) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[75vh] flex items-center justify-center py-12 px-4 animate-fade-in">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-4" size={38} />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Carregando dados do carrinho...</p>
        </div>
      </div>
    )
  }

  if (paymentResult) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[75vh] flex items-center justify-center py-12 px-4 animate-fade-in">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 text-center shadow-xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">Pedido Confirmado!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Seu pedido foi registrado com sucesso.</p>

          {paymentResult.paymentMethod === 'pix' && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8 inline-block max-w-sm w-full border border-gray-200 dark:border-gray-700 text-left">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-center">Pague via PIX</h3>
              {timeLeft && (
                <div className="mb-4 flex justify-center">
                  <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 px-3 py-1.5 rounded-full text-sm font-semibold">
                    Expira em: {timeLeft}
                  </span>
                </div>
              )}
              <div className="bg-white p-2 rounded-lg flex justify-center mb-4">
                <img src={`data:image/png;base64,${paymentResult.pixQrCode}`} alt="QR Code PIX" className="w-48 h-48" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Abra o app do seu banco, escolha PIX e aponte a câmera para o QR Code, ou copie a chave abaixo:
              </p>
              <div className="flex flex-col gap-2 items-stretch">
                <input type="text" readOnly value={paymentResult.pixPayload} className="w-full text-xs p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500" />
                <button onClick={handleCopyPix} className="btn-primary flex items-center justify-center gap-2 py-3 w-full">
                  <Copy size={16} />
                  {copiedPix ? 'Copiado!' : 'Copiar Código PIX'}
                </button>
                <button onClick={handleResetPayment} className="btn-secondary flex items-center justify-center gap-2 py-3 w-full">
                  Trocar forma de pagamento
                </button>
              </div>
            </div>
          )}

          {paymentResult.paymentMethod === 'boleto' && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8 inline-block max-w-sm w-full border border-gray-200 dark:border-gray-700 text-left">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-center">Boleto Gerado</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                O seu boleto foi gerado com sucesso. O pagamento pode demorar até 3 dias úteis para ser confirmado.
              </p>
              <div className="flex flex-col gap-2 items-stretch">
                <a href={paymentResult.bankSlipUrl} target="_blank" rel="noreferrer" className="btn-primary flex items-center justify-center gap-2 py-3 w-full">
                  <Download size={16} />
                  Baixar Boleto
                </a>
                <button onClick={handleResetPayment} className="btn-secondary flex items-center justify-center gap-2 py-3 w-full">
                  Trocar forma de pagamento
                </button>
              </div>
            </div>
          )}

          {paymentResult.paymentMethod === 'credit_card' && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-green-600 dark:text-green-400 mb-2">Pagamento Aprovado</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Seu pagamento no cartão de crédito foi confirmado e seu pedido já está sendo preparado!
              </p>
            </div>
          )}

          {paymentResult.redirectUrl && !['pix', 'boleto', 'credit_card'].includes(paymentResult.paymentMethod) && (
            <div className="mb-8">
              <a href={paymentResult.redirectUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center justify-center gap-2 py-3 px-8">
                Continuar Pagamento
              </a>
            </div>
          )}

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => navigate('/perfil?section=orders')} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Acompanhar meus pedidos
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0 && !paymentResult) {
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

  const renderStepper = () => {
    let progressPercent = 0
    if (checkoutStep === 'delivery') progressPercent = 50
    if (checkoutStep === 'payment') progressPercent = 100

    return (
      <div className="mb-8 flex items-center justify-center animate-fade-in">
        <div className="flex items-start justify-between w-full max-w-lg relative">
          {/* Progress Bar Line */}
          <div className="absolute top-4 left-[16.667%] right-[16.667%] h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-green-600 to-primary-600 transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Step 1: Carrinho */}
          <button
            onClick={() => checkoutStep !== 'cart' && handleBackToCart()}
            className="flex-1 flex flex-col items-center gap-1.5 z-10 focus:outline-none group cursor-pointer"
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs border-4 border-white dark:border-gray-900 transition-all duration-300 ${checkoutStep !== 'cart'
              ? 'bg-green-600 text-white shadow-md group-hover:scale-105'
              : 'bg-primary-600 text-white shadow-md'
              }`}>
              {checkoutStep !== 'cart' ? '✓' : '1'}
            </span>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider text-center ${checkoutStep !== 'cart'
              ? 'text-green-600 dark:text-green-400 group-hover:text-green-700'
              : 'text-primary-600 dark:text-primary-400'
              }`}>
              Carrinho
            </span>
          </button>

          {/* Step 2: Entrega */}
          <button
            onClick={() => checkoutStep === 'payment' ? handleBackToDelivery() : undefined}
            disabled={checkoutStep === 'cart'}
            className="flex-1 flex flex-col items-center gap-1.5 z-10 focus:outline-none group disabled:cursor-not-allowed cursor-pointer"
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs transition-all duration-300 border-4 border-white dark:border-gray-900 ${checkoutStep === 'cart'
              ? 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-800'
              : checkoutStep === 'payment'
                ? 'bg-green-600 text-white shadow-md group-hover:scale-105'
                : 'bg-primary-600 text-white shadow-md'
              }`}>
              {checkoutStep === 'payment' ? '✓' : '2'}
            </span>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider text-center ${checkoutStep === 'cart'
              ? 'text-gray-500 dark:text-gray-400'
              : checkoutStep === 'payment'
                ? 'text-green-600 dark:text-green-400 group-hover:text-green-700'
                : 'text-primary-600 dark:text-primary-400'
              }`}>
              Entrega
            </span>
          </button>

          {/* Step 3: Confirmação */}
          <button
            disabled={checkoutStep !== 'payment'}
            className="flex-1 flex flex-col items-center gap-1.5 z-10 focus:outline-none disabled:cursor-default"
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs transition-all duration-300 border-4 border-white dark:border-gray-900 ${checkoutStep === 'payment'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-800'
              }`}>
              3
            </span>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider text-center ${checkoutStep === 'payment'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
              }`}>
              Confirmação
            </span>
          </button>
        </div>
      </div>
    )
  }



  const renderCartItems = () => (
    <div className="space-y-4">
      {items.map(item => {
        const price = item.product?.price || 0
        const itemTotal = price * item.quantity
        const itemDiscountedPrice = itemTotal

        return (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 overflow-hidden group animate-fade-in">
            <div className="p-4 sm:p-5 flex gap-4 sm:gap-5 items-center">

              {/* Product image container */}
              {item.product && (
                <Link
                  to={generateProductUrl(item.product)}
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0 relative border border-gray-100 dark:border-gray-700 block"
                >
                  <img
                    src={productsService.getImageUrl(item.product.image)}
                    alt={item.product.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    onError={handleProductImageError}
                  />
                </Link>
              )}

              {/* Product Details info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {item.product ? (
                      <Link to={generateProductUrl(item.product)} className="block">
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
                    type="button"
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
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95 transition-all cursor-pointer"
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
  )

  const renderCartSidebar = () => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 sticky top-24 animate-fade-in">
      {freeShippingThreshold > 0 && isFreeShippingApplicable && (
        <div className="mb-6 p-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden ${hasFreeShipping
                ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                <div className="flex flex-col items-center justify-center translate-y-[2px]">
                  <span className="relative inline-block animate-truck-start">
                    <Truck className="w-4 h-4" />

                    {/* Fumaça da partida (atrás do caminhão na esquerda) */}
                    <span className="absolute left-[-5px] bottom-[2px] flex gap-[2px] pointer-events-none z-10 animate-smoke-puff">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 opacity-60"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 opacity-40"></span>
                    </span>

                    {/* Partículas saindo do contato da roda traseira com a estrada ao conquistar frete grátis */}
                    <div className="absolute left-[4.5px] bottom-[2.5px] pointer-events-none overflow-visible">
                      <span className={`absolute left-0 bottom-0 w-1.5 h-1.5 rounded-full bg-green-400 dark:bg-green-300 opacity-0 ${hasFreeShipping ? 'animate-free-shipping-sparkle' : ''}`} style={{ animationDelay: '1.5s' }}></span>
                      <span className={`absolute left-0 bottom-0 w-1 h-1 rounded-full bg-yellow-400 dark:bg-yellow-300 opacity-0 ${hasFreeShipping ? 'animate-free-shipping-sparkle' : ''}`} style={{ animationDelay: '2.3s' }}></span>
                    </div>
                  </span>
                  <div className={`w-6 h-[1.5px] mt-[-2px] opacity-85 animate-road-move-delayed ${hasFreeShipping
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                    }`} />
                </div>
              </div>

              <div className="flex-1">
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 leading-snug block">
                  {hasFreeShipping ? (
                    <span className="text-green-600 dark:text-green-400">Você ganhou Frete Grátis!</span>
                  ) : (
                    <span>
                      Adicione mais <strong className="text-primary-600 dark:text-primary-400">R$ {(freeShippingThreshold - totalAfterPromotions).toFixed(2).replace('.', ',')}</strong> para ter Frete Grátis{shippingCep.replace(/\D/g, '').length !== 8 ? '*' : ''}
                    </span>
                  )}
                </span>
                {!hasFreeShipping && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                    {shippingCep.replace(/\D/g, '').length === 8
                      ? '* Válido para São Paulo e cidades proximas.'
                      : '* Consulte seu CEP para verificar as opções de frete.'}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all ease-out ${hasFreeShipping
                  ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600'
                  }`}
                style={{
                  width: `${hasFreeShipping ? 100 : Math.min(100, (totalAfterPromotions / freeShippingThreshold) * 100)}%`,
                  transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

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
                className="px-4 py-2 text-xs font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
              >
                {validatingPromoCode ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  'Aplicar'
                )}
              </button>
            </div>
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
                              className="text-red-500 dark:text-red-400 hover:text-red-600 p-1 flex-shrink-0 opacity-80 hover:opacity-100 cursor-pointer"
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

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-green-200/30">
                  <button
                    onClick={() => setCurrentCouponIndex(prev => prev > 0 ? prev - 1 : promoCodesValidation.promoCodes.length - 1)}
                    className="p-1 text-green-700 dark:text-green-400 hover:text-green-900 disabled:opacity-30 cursor-pointer"
                    disabled={validatingPromoCode}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1">
                    {promoCodesValidation.promoCodes.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentCouponIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${index === currentCouponIndex ? 'bg-green-600 w-4' : 'bg-green-200 w-1.5'} cursor-pointer`}
                        disabled={validatingPromoCode}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentCouponIndex(prev => prev < promoCodesValidation.promoCodes.length - 1 ? prev + 1 : 0)}
                    className="p-1 text-green-700 dark:text-green-400 hover:text-green-900 disabled:opacity-30 cursor-pointer"
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
                          className="text-red-500 dark:text-red-400 hover:text-red-600 p-1 flex-shrink-0 opacity-80 hover:opacity-100 cursor-pointer"
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

            <div className="space-y-1 mt-4">
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
                  className="px-4 py-2 text-xs font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
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

      <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 uppercase tracking-wider">
        Resumo do Pedido
      </h2>

      <div className="space-y-3.5 mb-6">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="font-extrabold text-gray-900 dark:text-white">R$ {baseTotal.toFixed(2).replace('.', ',')}</span>
        </div>

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

        <div className="flex justify-between items-center text-xs sm:text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
            ) : hasInvalidCep() ? (
              <span className="text-red-655 dark:text-red-400 text-xs font-black">CEP inválido</span>
            ) : shippingFee !== null ? (
              <span className="text-gray-900 dark:text-white font-extrabold">
                R$ {shippingFee.toFixed(2).replace('.', ',')}
              </span>
            ) : calculatingShipping ? (
              <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 font-semibold animate-pulse">
                <Loader2 className="animate-spin w-3 h-3" /> Calculando...
              </span>
            ) : (
              <span className="text-gray-900 dark:text-white font-extrabold text-xs">
                a calcular na próxima etapa
              </span>
            )}
          </div>
        </div>

        {shippingFee !== null && displayedDeliveryTime && displayedDeliveryTimeType && !hasInvalidCep() && (
          <div className="text-[11px] text-gray-550 dark:text-gray-455 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/60 animate-fade-in text-left">
            <span className="text-gray-455 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" /> Previsão:
            </span>
            <span className="font-semibold text-gray-750 dark:text-gray-305 text-right ml-2">
              {displayedDeliveryTime} {displayedDeliveryTimeType === 'business' ? (Number(displayedDeliveryTime) === 1 ? 'dia útil' : 'dias úteis') : (Number(displayedDeliveryTime) === 1 ? 'dia corrido' : 'dias corridos')}{displayedEstimatedDate ? ` (${displayedEstimatedDate})` : ''}{service ? ` via ${service.toLowerCase()}` : ''}
            </span>
          </div>
        )}



        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-gray-900 dark:text-white">Total Geral</span>
            <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
              R$ {currentTotal.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleContinueToDelivery}
        className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black py-4 px-6 rounded-2xl transition-all duration-200 mb-4 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg active:scale-98 group cursor-pointer"
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
  )

  const renderCheckoutStepsHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-150 dark:border-gray-700">
        <button
          onClick={checkoutStep === 'payment' ? handleBackToDelivery : handleBackToCart}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
      </div>
    )
  }

  const renderDeliveryStep = () => {
    const isEditingSelected = editingAddressId === selectedAddressId
    const selectedAddress = selectedAddressId ? savedAddresses.find(addr => addr.id === selectedAddressId) : null

    return (
      <>
        {/* Lista de Endereços Salvos */}
        {!showNewAddressForm && loadingAddresses && (
          <div className="mb-6 text-center py-8">
            <Loader2 className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-2" size={24} />
            <p className="text-gray-600 dark:text-gray-300">Carregando endereços...</p>
          </div>
        )}

        {!loadingAddresses && savedAddresses.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Endereços Salvos</h3>
              {showNewAddressForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAddressForm(false)
                    setEditingAddressId(null)
                    setFormData({
                      cep: '',
                      address: '',
                      number: '',
                      complement: '',
                      bairro: '',
                      city: '',
                      state: ''
                    })
                    if (savedAddresses.length > 0) {
                      const defaultAddress = savedAddresses.find(addr => addr.is_default) || savedAddresses[0]
                      selectAddress(defaultAddress)
                    }
                  }}
                  className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAddressForm(true)
                    setSelectedAddressId(null)
                    setEditingAddressId(null)
                    setFormData({
                      cep: '',
                      address: '',
                      number: '',
                      complement: '',
                      bairro: '',
                      city: '',
                      state: ''
                    })
                  }}
                  className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center cursor-pointer font-bold"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Novo Endereço
                </button>
              )}
            </div>

            {!showNewAddressForm && (
              <div className="space-y-3 sm:space-y-4">
                {savedAddresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => selectAddress(address)}
                    className={`p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md ${selectedAddressId === address.id
                      ? 'border-primary-500 dark:border-primary-400 bg-primary-50/50 dark:bg-primary-900/10 ring-1 ring-primary-500 dark:ring-primary-400'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600'
                      }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Radio Indicator */}
                      <div className="mt-0.5 flex-shrink-0">
                        {selectedAddressId === address.id ? (
                          <div className="w-5 h-5 rounded-full border-[5px] border-primary-600 dark:border-primary-400 bg-white dark:bg-gray-900" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-1.5 sm:mb-2 flex-wrap gap-2">
                          <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{address.nickname}</span>
                          {address.is_default && (
                            <span className="text-[10px] sm:text-xs font-medium tracking-wide bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full uppercase">
                              Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">
                          {address.address}, {address.number}
                          {address.complement && ` - ${address.complement}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {address.city} - {address.state}, CEP: {address.cep}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditAddress(address, e)}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                          title="Editar endereço"
                        >
                          <Edit2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirmModal(address.id)
                          }}
                          className="text-gray-400 hover:text-red-650 dark:hover:text-red-400 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                          title="Remover endereço"
                        >
                          <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Formulário de Endereço (Novo ou Editando) */}
        {(showNewAddressForm || savedAddresses.length === 0 || (selectedAddressId && isEditingSelected)) && (
          <form onSubmit={handleContinueToPayment} className="space-y-3 sm:space-y-4">
            {savedAddresses.length > 0 && !isEditingSelected && (
              <button
                type="button"
                onClick={() => {
                  setShowNewAddressForm(false)
                  setEditingAddressId(null)
                  setFormData({
                    cep: '',
                    address: '',
                    number: '',
                    complement: '',
                    bairro: '',
                    city: '',
                    state: ''
                  })
                  if (savedAddresses.length > 0) {
                    const defaultAddress = savedAddresses.find(addr => addr.is_default) || savedAddresses[0]
                    selectAddress(defaultAddress)
                  }
                }}
                className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-3 sm:mb-4 flex items-center cursor-pointer font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                Voltar para endereços salvos
              </button>
            )}

            {isEditingSelected && selectedAddress && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                  <strong>Editando:</strong> {selectedAddress.nickname}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  As alterações serão salvas ao continuar
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                CEP *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleInputChange}
                  required
                  placeholder="00000-000"
                  maxLength={9}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${hasInvalidCep() || isFieldInvalid('cep')
                    ? 'border-red-500 dark:border-red-400 text-red-650 dark:text-red-400 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                    }`}
                />
                {calculatingShipping && (
                  <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={18} />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Endereço *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                placeholder="Rua, Avenida, etc."
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${isFieldInvalid('address')
                  ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-700'
                  }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Número *
                </label>
                <input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  required
                  placeholder="123"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${isFieldInvalid('number')
                    ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  name="complement"
                  value={formData.complement}
                  onChange={handleInputChange}
                  placeholder="Apt, Bloco, etc."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Bairro *
                </label>
                <input
                  type="text"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleInputChange}
                  required
                  placeholder="Bairro"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${isFieldInvalid('bairro')
                    ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                    }`}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Cidade *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  disabled
                  placeholder="Cidade"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border bg-gray-50 dark:bg-gray-855 dark:text-gray-300 rounded-lg cursor-not-allowed ${isFieldInvalid('city')
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-700'
                    }`}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Estado *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  disabled
                  placeholder="UF"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border bg-gray-50 dark:bg-gray-855 dark:text-gray-300 rounded-lg cursor-not-allowed ${isFieldInvalid('state')
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-gray-700'
                    }`}
                />
              </div>
            </div>

            {isAuthenticated && !selectedAddressId && (
              <div className="mt-4 sm:mt-5 bg-gray-50/50 dark:bg-gray-800/30 p-3.5 sm:p-4 rounded-2xl border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label htmlFor="saveAddressToProfile" className="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer select-none">
                      Salvar endereço na minha conta
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Facilite suas próximas compras deixando este endereço salvo.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="saveAddressToProfile"
                    onClick={() => setSaveAddressToProfile(!saveAddressToProfile)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${saveAddressToProfile ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${saveAddressToProfile ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {saveAddressToProfile && (
                  <div className="mt-3.5 pt-3 border-t border-gray-300 dark:border-gray-700">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Identificação do Endereço (ex: Casa, Trabalho, Mãe)
                    </label>
                    <input
                      type="text"
                      value={newAddressNickname}
                      onChange={(e) => setNewAddressNickname(e.target.value)}
                      placeholder="Ex: Casa, Trabalho, Mãe..."
                      className="w-full sm:w-2/3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>
            )}

            {showCepWarning && cepWarning && (
              <div className="mt-3 sm:mt-4 p-2 sm:p-2.5 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/20 rounded-xl animate-fade-in transition-all duration-300">
                <p className="text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-1.5">
                  <span>⚠️</span> {cepWarning}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end mt-4 sm:mt-6">
              <button
                type="submit"
                className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-6 font-bold"
                disabled={creatingOrder}
              >
                Continuar
              </button>
            </div>
          </form>
        )}

        {!showNewAddressForm && selectedAddressId && !isEditingSelected && (
          <div className="mt-4 sm:mt-6">
            {showCepWarning && cepWarning && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-2.5 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/20 rounded-xl animate-fade-in transition-all duration-300">
                <p className="text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-1.5">
                  <span>⚠️</span> {cepWarning}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleContinueWithSavedAddress}
                className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-6 font-bold"
                disabled={creatingOrder}
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderPaymentStep = () => {
    return (
      <>
        <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-150 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-start mb-2">
            <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="text-primary-600 dark:text-primary-400" size={16} />
              Enviar para: {selectedAddressId ? savedAddresses.find(a => a.id === selectedAddressId)?.nickname || 'Endereço Selecionado' : 'Novo Endereço'}
            </span>
            <button
              type="button"
              onClick={handleBackToDelivery}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <Edit2 size={12} />
              Alterar endereço
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 pl-5">
            {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 pl-5">
            {formData.bairro ? `${formData.bairro}, ` : ''}{formData.city} - {formData.state}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-5 font-semibold">
            CEP: {formData.cep}
          </p>
        </div>

        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <CheckoutPayment
            selectedMethod={selectedPaymentMethod}
            onSelectMethod={(method) => setSelectedPaymentMethod(method)}
          />
        </div>

        {checkoutError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
            {checkoutError}
          </div>
        )}

        {getPaymentBlockReason() && !creatingOrder && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            {getPaymentBlockReason()}
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-6 sm:mt-8 gap-2 sm:gap-3 border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
          {isAdmin && (
            <button
              type="button"
              onClick={handleCreateOrderWithoutPayment}
              className="text-xs px-2.5 sm:px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-black shadow-sm"
              disabled={!canProceedToPayment() || creatingOrderWithoutPayment || creatingOrder}
              title="Criar pedido sem pagamento (apenas para testes)"
            >
              {creatingOrderWithoutPayment ? (
                <>
                  <Loader2 className="animate-spin" size={12} /> Criando...
                </>
              ) : (
                <>
                  <TestTube size={12} /> Teste (sem pagamento)
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handlePaymentSubmit}
            className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-6 sm:ml-auto font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={creatingOrder || creatingOrderWithoutPayment}
          >
            {creatingOrder ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} /> <span>Processando...</span>
              </>
            ) : (
              <span>{selectedPaymentMethod === 'credit_card' ? 'Continuar para Cartão' : 'Finalizar Compra'}</span>
            )}
          </button>
        </div>
      </>
    )
  }

  const renderCheckoutSidebar = () => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 sticky top-24 animate-fade-in">
      <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-3 sm:mb-4 uppercase tracking-wider text-xs">Resumo do Pedido</h2>
      <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
        {items.map(item => {
          const price = item.product?.price || 0
          const itemTotal = price * item.quantity
          const itemDiscountedPrice = itemTotal

          return (
            <div key={item.id} className="text-xs sm:text-sm pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
              <p className="font-semibold text-gray-850 dark:text-gray-200 line-clamp-2">
                {item.product?.name}
              </p>
              <div className="flex justify-between text-gray-500 mt-1">
                <span>Qtd: {item.quantity} × R$ {price.toFixed(2).replace('.', ',')}</span>
                <span className="font-extrabold text-gray-700 dark:text-gray-300">
                  R$ {itemDiscountedPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 space-y-2.5 sm:space-y-3">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="font-extrabold text-gray-900 dark:text-white">R$ {baseTotal.toFixed(2).replace('.', ',')}</span>
        </div>

        {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {promoCodesValidation.promoCodes.length > 1 ? `Cupons (${promoCodesValidation.promoCodes.length})` : 'Cupom'}
            </span>
            <span className="text-green-600 dark:text-green-400 font-extrabold">
              - R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}
            </span>
          </div>
        )}

        {applicablePromotions.length > 0 && (
          <div className="space-y-1">
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
                <div key={promo.id} className="flex justify-between text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                  <span className="truncate max-w-[150px]">{promo.name}</span>
                  <span>{discountText}</span>
                </div>
              )
            })}
            {promotionDiscount > 0 && (
              <div className="flex justify-between items-center text-xs text-pink-600 dark:text-pink-400 font-bold pt-1">
                <span>Desconto Ofertas</span>
                <span>- R$ {promotionDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-gray-150 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <div className={`h-8 w-8 rounded-lg flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden ${hasFreeShipping
              ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
              }`}>
              <div className="flex flex-col items-center justify-center translate-y-[1.5px]">
                <Truck className="w-3.5 h-3.5" />
                <div className={`w-5 h-[1px] mt-[-1.5px] opacity-85 animate-road-move ${hasFreeShipping
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-500'
                  }`} />
              </div>
            </div>
            Frete
          </span>
          <div className="text-right">
            {calculatingShipping ? (
              <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 font-semibold">
                <Loader2 className="animate-spin w-3 h-3" /> Calculando...
              </span>
            ) : hasInvalidCep() ? (
              <span className="text-red-655 dark:text-red-400 text-xs font-black">Inválido</span>
            ) : hasFreeShipping ? (
              <span className="text-green-600 dark:text-green-400 font-extrabold text-xs sm:text-sm">Grátis</span>
            ) : shippingFee !== null ? (
              <span className="text-gray-900 dark:text-white font-extrabold">R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 font-semibold">-</span>
            )}
          </div>
        </div>

        {shippingFee !== null && displayedDeliveryTime && displayedDeliveryTimeType && !hasInvalidCep() && (
          <div className="text-[11px] text-gray-550 dark:text-gray-455 mt-2 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/60 animate-fade-in text-left">
            <span className="text-gray-455 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" /> Previsão:
            </span>
            <span className="font-semibold text-gray-750 dark:text-gray-305 text-right ml-2">
              {displayedDeliveryTime} {displayedDeliveryTimeType === 'business' ? (Number(displayedDeliveryTime) === 1 ? 'dia útil' : 'dias úteis') : (Number(displayedDeliveryTime) === 1 ? 'dia corrido' : 'dias corridos')}{displayedEstimatedDate ? ` (${displayedEstimatedDate})` : ''}{service ? ` via ${service.toLowerCase()}` : ''}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-gray-250 dark:border-gray-700 pt-3">
          <span className="text-base font-extrabold text-gray-900 dark:text-white">Total</span>
          <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
            R$ {currentTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </div>
  )

  const renderRecommendations = () => (
    <>
      {checkoutStep === 'cart' && recommendedProducts.length > 0 && (
        <div className="mt-16 pt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Complemente seu pedido
            </h2>
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

          <HorizontalScrollContainer
            ref={scrollRef}
            showArrows={false}
            className="flex gap-4 pb-5 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recommendedProducts.map(product => (
              <div key={product.id} className="w-[calc(80%-8px)] sm:w-[calc(40%-11px)] md:w-[calc(33.33%-12px)] lg:w-[calc(20%-12.8px)] flex-shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </HorizontalScrollContainer>
        </div>
      )}
    </>
  )

  const renderModals = () => (
    <>
      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowDeleteConfirmModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Confirmar Exclusão</h3>
              <button onClick={() => setShowDeleteConfirmModal(null)} className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </p>
            {(() => {
              const addressToDelete = savedAddresses.find(addr => addr.id === showDeleteConfirmModal)
              return addressToDelete && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{addressToDelete.nickname}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 break-words">
                    {addressToDelete.address}, {addressToDelete.number}
                    {addressToDelete.complement && ` - ${addressToDelete.complement}`}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {addressToDelete.city} - {addressToDelete.state}, CEP: {addressToDelete.cep}
                  </p>
                </div>
              )
            })()}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3">
              <button
                onClick={() => setShowDeleteConfirmModal(null)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] cursor-pointer font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleDeleteAddress(showDeleteConfirmModal)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer font-bold"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar endereço */}
      {showEditAddressModal && editAddressData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 cursor-pointer p-3 sm:p-4" onClick={() => setShowEditAddressModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Editar Endereço</h3>
              <button onClick={() => setShowEditAddressModal(false)} className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Apelido *
                </label>
                <input
                  type="text"
                  value={editAddressData.nickname}
                  onChange={(e) => setEditAddressData({ ...editAddressData, nickname: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Casa, Trabalho..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  CEP *
                </label>
                <input
                  type="text"
                  value={editAddressData.cep}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/\D/g, '')
                    if (cleanValue.length <= 8) {
                      const formatted = cleanValue.length > 5
                        ? `${cleanValue.substring(0, 5)}-${cleanValue.substring(5)}`
                        : cleanValue
                      setEditAddressData({ ...editAddressData, cep: formatted })
                    }
                  }}
                  maxLength={9}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={editAddressData.address}
                  onChange={(e) => setEditAddressData({ ...editAddressData, address: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.number}
                    onChange={(e) => setEditAddressData({ ...editAddressData, number: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={editAddressData.complement || ''}
                    onChange={(e) => setEditAddressData({ ...editAddressData, complement: e.target.value || null })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.city}
                    onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                    Estado *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.state}
                    onChange={(e) => setEditAddressData({ ...editAddressData, state: e.target.value.toUpperCase().substring(0, 2) })}
                    maxLength={2}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={editAddressData.is_default}
                  onChange={(e) => setEditAddressData({ ...editAddressData, is_default: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="isDefault" className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-white cursor-pointer select-none">
                  Definir como endereço padrão
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowEditAddressModal(false)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] cursor-pointer font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSaveEditAddress()}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <style>{`
        @keyframes truckBounce {
          0%, 100% { transform: translateY(-1.5px); }
          50% { transform: translateY(0.5px); }
        }
        .animate-truck-bounce {
          display: inline-block;
          animation: truckBounce 1.4s ease-in-out infinite;
        }
        @keyframes scaleBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .animate-scale-bounce {
          animation: scaleBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes roadMove {
          0% { background-position: 0 0; }
          100% { background-position: -8px 0; }
        }
        .animate-road-move {
          background-image: linear-gradient(to right, currentColor 60%, transparent 60%);
          background-size: 8px 100%;
          animation: roadMove 0.3s linear infinite;
        }
        @keyframes roadMoveDelayed {
          0% { background-position: 0 0; }
          100% { background-position: -8px 0; }
        }
        .animate-road-move-delayed {
          background-image: linear-gradient(to right, currentColor 60%, transparent 60%);
          background-size: 8px 100%;
          animation: roadMoveDelayed 0.3s linear infinite;
          animation-delay: 1.5s;
          animation-fill-mode: backwards;
        }
        @keyframes truckStart {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          15% { transform: rotate(-0.5deg) translateX(-0.5px); }
          35% { transform: rotate(0.5deg) translateX(0.5px); }
          55% { transform: rotate(-0.25deg) translateX(-0.25px); }
          75% { transform: rotate(0.25deg) translateX(0.25px); }
          90% { transform: rotate(0deg) translateX(0); }
        }
        .animate-truck-start {
          display: inline-block;
          animation: truckStart 1s ease-in-out;
          animation-delay: 0.5s;
          animation-fill-mode: both;
        }
        @keyframes smokePuff {
          0% { transform: scale(0.3) translate(0, 0); opacity: 0; }
          30% { opacity: 0.7; }
          100% { transform: scale(1.3) translate(-6px, -3px); opacity: 0; }
        }
        .animate-smoke-puff {
          animation: smokePuff 1s ease-out;
          animation-delay: 0.5s;
          animation-fill-mode: both;
        }
        @keyframes fsSparkle {
          0% { transform: translate(-50%, 50%) scale(0.4); opacity: 0; }
          15% { opacity: 0.9; }
          45% { transform: translate(calc(-50% - 8px), calc(50% - 2px)) scale(1.2); opacity: 0; }
          100% { transform: translate(calc(-50% - 8px), calc(50% - 2px)) scale(1.2); opacity: 0; }
        }
        .animate-free-shipping-sparkle {
          animation: fsSparkle 3s infinite ease-out;
          animation-delay: 1.5s;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-truck-start,
          .animate-smoke-puff,
          .animate-free-shipping-sparkle,
          .animate-road-move,
          .animate-road-move-delayed {
            animation: none !important;
            animation-delay: 0s !important;
          }
          .animate-smoke-puff,
          .animate-free-shipping-sparkle {
            opacity: 0 !important;
          }
          .animate-road-move,
          .animate-road-move-delayed {
            background-image: linear-gradient(to right, currentColor 60%, transparent 60%) !important;
            background-size: 8px 100% !important;
          }
        }
      `}</style>

      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-7xl">
        {renderStepper()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {checkoutStep === 'cart' ? (
            <>
              <div className="lg:col-span-2 space-y-6">
                {renderCartItems()}
              </div>
              <div className="lg:col-span-1 self-stretch">
                {renderCartSidebar()}
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-fade-in">
                  {renderCheckoutStepsHeader()}
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
                    <MapPin className="mr-2" size={20} />
                    {checkoutStep === 'delivery' ? 'Endereço de Entrega' : 'Pagamento'}
                  </h2>
                  {checkoutStep === 'delivery' ? renderDeliveryStep() : renderPaymentStep()}
                </div>
              </div>
              <div className="lg:col-span-1">
                {renderCheckoutSidebar()}
              </div>
            </>
          )}
        </div>

        {renderRecommendations()}
        {renderModals()}
      </div>
    </div>
  )
}
