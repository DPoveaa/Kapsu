import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingCart, Plus, Trash2, ArrowRight, Loader2, Check, Sparkles, Truck, Gift, Tag, X, ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft, Edit2, TestTube } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/products.service'
import { cartService } from '../services/cart.service'
import { promotionsService, Promotion } from '../services/promotions.service'
import { promoCodesService, MultiplePromoCodesValidation } from '../services/promo-codes.service'
import { shippingService, ShippingOption } from '../services/shipping.service'
import { addressService, SavedAddress } from '../services/address.service'
import { paymentService, buildShippingAddress } from '../services/payment.service'
import { orderService } from '../services/order.service'
import { cepService } from '../services/cep.service'
import { Product } from '../types'
import { HorizontalScrollContainer } from '../components/HorizontalScrollContainer'
import ProductCard from '../components/ProductCard'
import CheckoutStepper from '../components/Checkout/CheckoutStepper'
import PaymentSelector from '../components/Checkout/PaymentSelector'
import CreditCardPayment from '../components/Checkout/CreditCardPayment'
import ShippingCard from '../components/Checkout/ShippingCard'
import CartItemCard from '../components/Checkout/CartItemCard'
import CheckoutConfirmation from '../components/Checkout/CheckoutConfirmation'
import { CheckoutStep, PaymentMethod, getStepIndex, parseCheckoutStep } from '../types/checkout'
import { CreditCardFormData, validateCreditCardForm } from '../utils/cardValidation'
import { toast } from '../utils/toast'
import {
  clearPendingCheckoutOrderId,
  clearPendingCheckoutPayment,
  clearConfirmedCheckoutPayment,
  clearStoredCheckoutState,
  createPaymentIdempotencyKey,
  getPendingCheckoutOrderId,
  getConfirmedCheckoutPayment,
  getStoredCheckoutState,
  isPaidOrderStatus,
  PendingCheckoutPayment,
  ConfirmedCheckoutPayment,
  resolveCheckoutState,
  resolveCheckoutStep,
  setPendingCheckoutOrderId,
  setConfirmedCheckoutPayment,
  setStoredCheckoutState,
} from '../utils/checkout'
import PixPayment from '../components/Checkout/PixPayment'
import BoletoPayment from '../components/Checkout/BoletoPayment'
import PaymentProcessingState from '../components/Checkout/PaymentProcessingState'
import type { NormalizedPaymentResult } from '../types/payment'
import { toProcessingVisualState } from '../types/payment'
import type { PaymentProcessingVisualState } from '../types/payment'

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
  initialStep?: CheckoutStep
}

const PAYMENT_ATTEMPTS_KEY = 'cart_payment_attempts_by_method'
const SELECTED_PAYMENT_METHOD_KEY = 'cart_selected_payment_method'

type AsyncPaymentMethod = 'pix' | 'boleto'
type PaymentAttemptsByMethod = Partial<Record<AsyncPaymentMethod, PendingCheckoutPayment>>

const parsePaymentMethod = (value: string | null): PaymentMethod => {
  return value === 'pix' || value === 'boleto' || value === 'credit_card' ? value : 'pix'
}

const getStoredPaymentAttempts = (): PaymentAttemptsByMethod => {
  try {
    const saved = sessionStorage.getItem(PAYMENT_ATTEMPTS_KEY)
    if (!saved) return {}
    const parsed = JSON.parse(saved) as PaymentAttemptsByMethod
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const setStoredPaymentAttempts = (attempts: PaymentAttemptsByMethod) => {
  const activeAttempts = Object.fromEntries(
    Object.entries(attempts).filter(([, attempt]) => attempt && !isPendingPaymentExpired(attempt))
  ) as PaymentAttemptsByMethod

  if (Object.keys(activeAttempts).length > 0) {
    sessionStorage.setItem(PAYMENT_ATTEMPTS_KEY, JSON.stringify(activeAttempts))
  } else {
    sessionStorage.removeItem(PAYMENT_ATTEMPTS_KEY)
  }
}
const isPendingPaymentExpired = (payment: PendingCheckoutPayment | null | undefined): boolean => {
  if (!payment) return true

  const dateValue = payment.paymentMethod === 'pix' ? payment.expirationDate : payment.dueDate
  if (!dateValue) return false

  const expiresAt = new Date(dateValue)
  if (Number.isNaN(expiresAt.getTime())) return false

  if (payment.paymentMethod === 'boleto' && dateValue.length <= 10) {
    expiresAt.setHours(23, 59, 59, 999)
  }

  return expiresAt.getTime() <= Date.now()
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
  const urlStep = parseCheckoutStep(searchParams.get('step')) || (initialStep !== 'confirmed' ? initialStep : 'cart')
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(urlStep)
  const [maxReachableStep, setMaxReachableStep] = useState<CheckoutStep>(urlStep)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [creatingOrderWithoutPayment, setCreatingOrderWithoutPayment] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(() => parsePaymentMethod(sessionStorage.getItem(SELECTED_PAYMENT_METHOD_KEY)))
  const [cardFormData, setCardFormData] = useState<CreditCardFormData>({
    holderName: '', cpf: '', number: '', expiry: '', ccv: '', installments: 1,
  })
  const [cardFormErrors, setCardFormErrors] = useState<Record<string, string>>({})
  const [installmentOptions, setInstallmentOptions] = useState<any[]>([])
  const [maxInterestFree, setMaxInterestFree] = useState(1)
  const [loadingInstallments, setLoadingInstallments] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)
  const [subscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  const [paymentResult, setPaymentResult] = useState<ConfirmedCheckoutPayment | null>(() => {
    const step = parseCheckoutStep(searchParams.get('step'))
    return step === 'confirmed' ? getConfirmedCheckoutPayment() : null
  })
  const [pendingPayment, setPendingPayment] = useState<PendingCheckoutPayment | null>(null)
  const [pendingAsyncPayments, setPendingAsyncPayments] = useState<PaymentAttemptsByMethod>(() => getStoredPaymentAttempts())
  const [cartId, setCartId] = useState<string | null>(null)
  const [paymentProcessingState, setPaymentProcessingState] = useState<PaymentProcessingVisualState | null>(null)
  const [pendingCheckoutConfirmation, setPendingCheckoutConfirmation] = useState<ConfirmedCheckoutPayment | null>(null)
  const [activePaymentAttemptKey, setActivePaymentAttemptKey] = useState<string | null>(null)
  const [copiedPix, setCopiedPix] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null)
  const [resolvingPendingOrder, setResolvingPendingOrder] = useState(false)
  const resolvingPendingOrderRef = useRef(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    clearPendingCheckoutPayment()
  }, [])

  useEffect(() => {
    sessionStorage.setItem(SELECTED_PAYMENT_METHOD_KEY, selectedPaymentMethod)
  }, [selectedPaymentMethod])

  useEffect(() => {
    setStoredPaymentAttempts(pendingAsyncPayments)

    if (selectedPaymentMethod !== 'pix' && selectedPaymentMethod !== 'boleto') return
    const selectedAttempt = pendingAsyncPayments[selectedPaymentMethod]
    if (selectedAttempt && !isPendingPaymentExpired(selectedAttempt)) {
      setPendingPayment(selectedAttempt)
      return
    }
    setPendingPayment(null)
  }, [pendingAsyncPayments, selectedPaymentMethod])

  useEffect(() => {
    let cancelled = false

    const loadCartMeta = async () => {
      try {
        const cartData = await cartService.getCart()
        if (cancelled) return
        setCartId(cartData.id)
      } catch {
        if (!cancelled) setCartId(null)
      }
    }

    void loadCartMeta()
    return () => {
      cancelled = true
    }
  }, [items.length])

  useEffect(() => {
    const resolution = resolveCheckoutState({
      cartId,
      orderId: existingOrderId,
      cartItems: items,
      storedCheckoutState: getStoredCheckoutState(),
      confirmedPayment: paymentResult,
      pendingPayment,
    })

    if (!resolution.shouldReset) return

    if (resolution.clearConfirmed) {
      clearConfirmedCheckoutPayment()
      setPaymentResult(null)
    }
    if (resolution.clearPending) {
      clearPendingCheckoutPayment()
      setPendingPayment(null)
      setPendingAsyncPayments({})
      clearPendingCheckoutOrderId()
      setExistingOrderId(null)
    }
    if (resolution.clearStoredState) {
      clearStoredCheckoutState()
    }

    setPaymentProcessingState(null)
    setActivePaymentAttemptKey(null)
    setCheckoutStep('cart')
    setMaxReachableStep('cart')
    if (searchParams.get('step') === 'confirmed' || searchParams.get('paid')) {
      setSearchParams({ step: 'cart' }, { replace: true })
    }
  }, [cartId, items, paymentResult, pendingPayment, existingOrderId, searchParams, setSearchParams])
  useEffect(() => {
    const step = parseCheckoutStep(searchParams.get('step'))
    if (step === 'confirmed') return

    clearConfirmedCheckoutPayment()
    if (!paymentResult) return

    clearStoredCheckoutState()
    setPaymentResult(null)
    setCheckoutStep('cart')
    setMaxReachableStep('cart')
  }, [paymentResult, searchParams])

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
    if (items.length === 0 && !paymentResult && !pendingPayment) return

    const urlOrderId = searchParams.get('orderId')
    const storedOrderId = getPendingCheckoutOrderId()
    const resolvedOrderId = urlOrderId || storedOrderId || pendingPayment?.orderId || paymentResult?.orderId
    if (resolvedOrderId) {
      setExistingOrderId(resolvedOrderId)
    }
  }, [searchParams, items.length, paymentResult, pendingPayment])

  // Carrinho vazio: limpa checkout e só redireciona se o pedido pendente já foi pago
  useEffect(() => {
    if (authLoading || cartLoading || items.length > 0 || paymentResult || pendingPayment) return

    const pendingOrderId = getPendingCheckoutOrderId() || existingOrderId || searchParams.get('orderId')

    const clearCheckoutUi = () => {
      setExistingOrderId(null)
      clearPendingCheckoutOrderId()
      setCheckoutStep('cart')
      setMaxReachableStep('cart')
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
          showOrderConfirmation(
            pendingOrderId,
            normalizePaymentMethod(order.payment_method),
            { status: order.status }
          )
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
  }, [authLoading, cartLoading, items.length, paymentResult, pendingPayment, existingOrderId, navigate, searchParams, setSearchParams])

  useEffect(() => {
    if (['delivery', 'payment'].includes(checkoutStep) && isAuthenticated) {
      loadAddresses()
    }
  }, [checkoutStep, isAuthenticated])

  useEffect(() => {
    if (!authLoading && !isAuthenticated && ['delivery', 'payment'].includes(checkoutStep)) {
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
  const [calculatingShipping, setCalculatingShipping] = useState<boolean>(() => {
    const savedCep = localStorage.getItem('simulated_cep')
    return savedCep ? savedCep.replace(/\D/g, '').length === 8 : false
  })
  const [shippingCalculationFailed, setShippingCalculationFailed] = useState(false)
  const [deliveryTime, setDeliveryTime] = useState<number | null>(null)
  const [deliveryTimeType, setDeliveryTimeType] = useState<'business' | 'calendar' | null>(null)
  const [estimatedDate, setEstimatedDate] = useState<string | null>(null)
  const [estimatedDateFormatted, setEstimatedDateFormatted] = useState<string | null>(null)
  const [service, setService] = useState<string | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string | null>(null)
  const [defaultDeliveryTime] = useState<number | null>(null)
  const [defaultDeliveryTimeType] = useState<'business' | 'calendar'>('business')
  const [cepWarning, setCepWarning] = useState<string | null>(null)
  const [showCepWarning, setShowCepWarning] = useState(false)
  const [isFreeShippingApplicable, setIsFreeShippingApplicable] = useState<boolean>(false)
  const [isNationalFreeShipping] = useState<boolean>(false)
  const shippingAbortControllerRef = useRef<AbortController | null>(null)
  const prevCartItemsKeyRef = useRef<string>('')

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
    if (pendingPayment?.paymentMethod === 'pix' && pendingPayment.expirationDate) {
      const expirationTime = new Date(pendingPayment.expirationDate).getTime()

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
    } else {
      setTimeLeft('')
    }
  }, [pendingPayment])

  useEffect(() => {
    const orderId =
      pendingPayment?.orderId ||
      paymentResult?.orderId ||
      existingOrderId ||
      getPendingCheckoutOrderId() ||
      searchParams.get('orderId')

    if (!orderId || paymentResult?.confirmationType === 'paid' || paymentResult?.isPaid) return
    if (!pendingPayment && !paymentProcessingState) return

    const pollInterval = setInterval(async () => {
      try {
        const status = await orderService.getOrderPaymentStatus(orderId)

        if (status.shouldAdvanceToConfirmation) {
          clearInterval(pollInterval)
          const paidMethod = pendingPayment?.paymentMethod || status.paymentMethod
          clearPendingCheckoutOrderId()
          clearPendingCheckoutPayment()
          setPendingPayment(null)
          setExistingOrderId(null)
          setPaymentProcessingState('confirmed')

          if (status.shouldClearCart) {
            await clearCart()
          }

          const confirmationType =
            paidMethod === 'boleto' ? 'awaiting_boleto' : 'paid'

          const confirmed: ConfirmedCheckoutPayment = {
            orderId,
            paymentMethod: paidMethod,
            isPaid: confirmationType === 'paid',
            confirmationType,
            paymentStatus: status.paymentStatus,
            status: status.providerStatus,
            paymentId: status.paymentId,
            paymentAttemptId: status.paymentAttemptId,
            cartId,
          }
          beginConfirmationTransition(confirmed)

          return
        }

        if (status.paymentStatus === 'failed' || status.paymentStatus === 'cancelled' || status.paymentStatus === 'expired') {
          clearInterval(pollInterval)
          setPaymentProcessingState('failed')
          setCheckoutError('O pagamento não foi aprovado. Verifique os dados ou tente outro método.')
          toast.error('Pagamento não aprovado.')
          return
        }

        if (status.paymentStatus === 'awaiting_payment') {
          if (selectedPaymentMethod === 'pix' || selectedPaymentMethod === 'boleto') {
            setPaymentProcessingState('awaiting_payment')
          }
        } else if (status.paymentStatus === 'processing') {
          setPaymentProcessingState('processing')
        }
      } catch (err) {
        console.error('Erro ao consultar status do pagamento:', err)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [pendingPayment, paymentResult, existingOrderId, paymentProcessingState, searchParams, clearCart, setSearchParams, cartId, selectedPaymentMethod])

  // Alias para retrocompatibilidade com o simulador de frete do carrinho
  const shippingCep = formData.cep
  const setShippingCep = (cep: string) => setFormData(prev => ({ ...prev, cep }))



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

  // Verifica se há frete grátis (por cupom, valor mínimo ou opção zerada por subsídio/regra)
  const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
  const hasFreeShippingByThreshold = freeShippingThreshold > 0 && totalAfterPromotions >= freeShippingThreshold

  // Elegibilidade estrita para exibição da régua/card de frete grátis
  const isEligibleForFreeShipping = useMemo(() => {
    if (hasFreeShippingByCoupon) return true
    if (isNationalFreeShipping) return true
    const cleanCep = shippingCep.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      return !calculatingShipping && !shippingCalculationFailed && isFreeShippingApplicable
    }
    return false
  }, [hasFreeShippingByCoupon, isNationalFreeShipping, shippingCep, calculatingShipping, shippingCalculationFailed, isFreeShippingApplicable])

  const hasFreeShipping = hasFreeShippingByCoupon || (!calculatingShipping && shippingFee !== null && ((isEligibleForFreeShipping && hasFreeShippingByThreshold) || isFreeShipping || shippingFee === 0))

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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
        const threshold = Number(settings.sedex_free_shipping_threshold) || Number(settings.custom_free_shipping_threshold) || Number(settings.free_shipping_threshold) || 0
        setFreeShippingThreshold(threshold)
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

  // Chave estável para identificar alterações reais nos itens do carrinho
  const cartItemsKey = useMemo(() => {
    return items
      .filter(item => item.product)
      .map(item => `${item.product!.id}:${item.quantity}`)
      .join(',')
  }, [items])

  // Ativa spinner de recalculando frete imediatamente quando os itens do carrinho mudarem
  useEffect(() => {
    if (prevCartItemsKeyRef.current && prevCartItemsKeyRef.current !== cartItemsKey) {
      const cleanCep = shippingCep.replace(/\D/g, '')
      if (cleanCep.length === 8) {
        setCalculatingShipping(true)
      }
    }
  }, [cartItemsKey, shippingCep])

  // Calcula frete quando o CEP está preenchido
  useEffect(() => {
    const isItemsChanged = prevCartItemsKeyRef.current !== '' && prevCartItemsKeyRef.current !== cartItemsKey

    const calculateShippingFee = async () => {
      const cleanCep = shippingCep.replace(/\D/g, '')

      if (cleanCep.length === 8) {
        if (shippingAbortControllerRef.current) {
          shippingAbortControllerRef.current.abort()
        }
        const controller = new AbortController()
        shippingAbortControllerRef.current = controller

        let wasAborted = false

        try {
          setCalculatingShipping(true)
          setShippingCalculationFailed(false)

          const cartItems = items
            .filter(item => item.product)
            .map(item => ({
              product_id: item.product!.id,
              quantity: item.quantity,
              weight_grams: (item.product as any).weight_grams ?? (item.product as any).weight ?? null,
              length_cm: (item.product as any).length_cm ?? (item.product as any).length ?? null,
              width_cm: (item.product as any).width_cm ?? (item.product as any).width ?? null,
              height_cm: (item.product as any).height_cm ?? (item.product as any).height ?? null,
            }))

          const result = await shippingService.calculateShipping(
            cleanCep,
            totalAfterPromotions,
            cartItems,
            controller.signal
          )

          if (result.shippingFee === null) {
            setShippingFee(null)
            setShippingCalculationFailed(true)
            setDeliveryTime(null)
            setDeliveryTimeType(null)
            setEstimatedDate(null)
            setEstimatedDateFormatted(null)
            setService(null)
            setShippingOptions([])
            setSelectedShippingMethod(null)
            setCepWarning(result.message || 'CEP inválido ou não atendido.')
            setShowCepWarning(true)
            setIsFreeShippingApplicable(false)
          } else {
            const availableOptions = result.options?.length ? result.options : []
            const alreadyPicked = availableOptions.find(option => option.method === selectedShippingMethod)
            const fastestOption = availableOptions.reduce<ShippingOption | null>((fastest, option) => {
              if (!fastest) return option
              const a = fastest.deliveryTime ?? Infinity
              const b = option.deliveryTime ?? Infinity
              return b < a ? option : fastest
            }, null)
            const selectedOption = alreadyPicked || fastestOption || availableOptions[0]
            setShippingOptions(availableOptions)
            setSelectedShippingMethod(selectedOption?.method || null)
            setShippingFee(selectedOption?.shippingFee ?? result.shippingFee)
            setIsFreeShipping(selectedOption?.isFreeShipping ?? result.isFreeShipping)
            setDeliveryTime(selectedOption?.deliveryTime ?? result.deliveryTime ?? null)
            setDeliveryTimeType(selectedOption?.deliveryTimeType ?? result.deliveryTimeType ?? null)
            setEstimatedDate(selectedOption?.estimatedDate ?? result.estimatedDate ?? null)
            setEstimatedDateFormatted(result.estimatedDateFormatted || null)
            setService(selectedOption?.service || selectedOption?.name || result.service || null)
            setShowCepWarning(false)
            setIsFreeShippingApplicable(!(selectedOption?.externalShipping ?? result.externalShipping))
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            wasAborted = true
            return
          }
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
          if (!wasAborted) {
            setCalculatingShipping(false)
            prevCartItemsKeyRef.current = cartItemsKey
          }
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
        setShippingOptions([])
        setSelectedShippingMethod(null)
        setIsFreeShippingApplicable(true)
        setCalculatingShipping(false)
        prevCartItemsKeyRef.current = cartItemsKey
      }
    }

    // Debounce mais veloz (150ms) se for mudança de itens do carrinho ou 400ms para digitação de CEP
    const delay = isItemsChanged ? 150 : 400
    const timeoutId = setTimeout(calculateShippingFee, delay)
    return () => clearTimeout(timeoutId)
  }, [shippingCep, totalAfterPromotions, cartItemsKey])

  const selectShippingOption = (option: ShippingOption) => {
    setSelectedShippingMethod(option.method)
    setShippingFee(option.shippingFee)
    setIsFreeShipping(option.isFreeShipping)
    setDeliveryTime(option.deliveryTime)
    setDeliveryTimeType(option.deliveryTimeType)
    setEstimatedDate(option.estimatedDate || null)
    setEstimatedDateFormatted(null)
    setService(option.service || option.name)
    setIsFreeShippingApplicable(!option.externalShipping)
  }

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

  const persistCheckoutAddressIfNeeded = async () => {
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
        if (savedAddr?.id) selectAddress(savedAddr)
        setNewAddressNickname('')
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
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
      ...(selectedShippingMethod ? { shippingMethod: shippingOptions.find(option => option.method === selectedShippingMethod)?.name || selectedShippingMethod } : {}),
      paymentMethod: selectedPaymentMethod,
      ...(resolvedOrderId ? { orderId: resolvedOrderId } : {}),
    }

    if (canUseSavedAddressId()) {
      return { ...base, addressId: selectedAddressId! }
    }

    return { ...base, shippingAddress: buildShippingAddress(formData) }
  }

  const goToStep = (step: CheckoutStep, replace = true) => {
    const resolvedStep = step === 'confirmed' && !paymentResult?.isPaid ? 'payment' : step
    setCheckoutStep(resolvedStep)
    const orderId =
      pendingPayment?.orderId ||
      paymentResult?.orderId ||
      existingOrderId ||
      getPendingCheckoutOrderId() ||
      searchParams.get('order_id') ||
      searchParams.get('orderId')
    const params: Record<string, string> = { step: resolvedStep }
    if (orderId && resolvedStep !== 'cart') {
      params.orderId = orderId
      if (resolvedStep === 'confirmed') {
        params.paid = paymentResult?.isPaid ? '1' : '0'
      }
    }
    setSearchParams(params, { replace })
    const order: CheckoutStep[] = ['cart', 'delivery', 'payment', 'confirmed']
    if (order.indexOf(resolvedStep) > order.indexOf(maxReachableStep)) {
      setMaxReachableStep(resolvedStep)
    }
    if (resolvedStep === 'confirmed') {
      setMaxReachableStep('confirmed')
    }
  }

  const handleStepClick = (step: CheckoutStep) => {
    if (step === 'confirmed' && !paymentResult?.isPaid) return
    const order: CheckoutStep[] = ['cart', 'delivery', 'payment', 'confirmed']
    if (order.indexOf(step) > order.indexOf(maxReachableStep)) return

    if (paymentResult?.isPaid || pendingPayment) {
      setPendingPayment(null)
      clearPendingCheckoutPayment()
      setPaymentResult(null)
      clearConfirmedCheckoutPayment()
      setCheckoutError(null)
      setCardFormData({
        holderName: '',
        cpf: '',
        number: '',
        expiry: '',
        ccv: '',
        installments: 1,
      })
      setCardFormErrors({})
      setMaxReachableStep(step)
    }

    goToStep(step)
  }

  const normalizePaymentMethod = (method: string | null | undefined): PaymentMethod => {
    if (method === 'credit_card' || method === 'boleto' || method === 'pix') return method
    return 'pix'
  }

  const resetCompletedCheckoutSession = () => {
    clearPendingCheckoutPayment()
    clearPendingCheckoutOrderId()
    clearStoredCheckoutState()
    setStoredPaymentAttempts({})
    sessionStorage.removeItem(SELECTED_PAYMENT_METHOD_KEY)
    setPendingPayment(null)
    setPendingAsyncPayments({})
    setActivePaymentAttemptKey(null)
    setCheckoutError(null)
  }

  const showOrderConfirmation = (
    orderId: string,
    paymentMethod: PaymentMethod | string,
    extra: Partial<ConfirmedCheckoutPayment> = {}
  ) => {
    resetCompletedCheckoutSession()
    setPaymentProcessingState(null)
    setPendingCheckoutConfirmation(null)

    const confirmationType: ConfirmedCheckoutPayment['confirmationType'] =
      extra.confirmationType ||
      (paymentMethod === 'boleto' ? 'awaiting_boleto' : 'paid')

    const result: ConfirmedCheckoutPayment = {
      orderId,
      paymentMethod,
      isPaid: confirmationType === 'paid',
      confirmationType,
      cartId,
      ...extra,
    }

    setConfirmedCheckoutPayment(result)
    setPaymentResult(result)
    setMaxReachableStep('confirmed')
    setCheckoutStep('confirmed')
    setSearchParams(
      {
        step: 'confirmed',
        orderId,
        paid: result.isPaid ? '1' : '0',
      },
      { replace: true }
    )
  }

  const beginConfirmationTransition = (confirmation: ConfirmedCheckoutPayment) => {
    resetCompletedCheckoutSession()
    setPendingCheckoutConfirmation(confirmation)
    setPaymentProcessingState('confirmed')
  }

  const finishConfirmationTransition = () => {
    if (!pendingCheckoutConfirmation) return
    showOrderConfirmation(
      pendingCheckoutConfirmation.orderId,
      pendingCheckoutConfirmation.paymentMethod,
      pendingCheckoutConfirmation
    )
  }

  const handleNormalizedPaymentResult = async (
    result: NormalizedPaymentResult,
    paymentMethod: PaymentMethod
  ) => {
    if (result.paymentAttemptId) {
      setStoredCheckoutState({
        cartId,
        orderId: result.orderId,
        paymentAttemptId: result.paymentAttemptId,
      })
    }

    if (result.shouldAdvanceToConfirmation) {
      if (result.shouldClearCart) {
        await clearCart()
      }

      beginConfirmationTransition({
        orderId: result.orderId,
        paymentMethod,
        paymentStatus: result.paymentStatus,
        status: result.providerStatus,
        paymentId: result.paymentId,
        paymentAttemptId: result.paymentAttemptId,
        confirmationType: paymentMethod === 'boleto' ? 'awaiting_boleto' : 'paid',
        isPaid: paymentMethod !== 'boleto',
        cartId,
      })
      return
    }

    if (result.paymentStatus === 'failed' || result.paymentStatus === 'cancelled' || result.paymentStatus === 'expired') {
      setPaymentProcessingState('failed')
      setCheckoutError('O pagamento foi recusado. Verifique os dados ou tente outro cartão.')
      toast.error('Pagamento recusado. Verifique os dados do cartão.')
      return
    }

    if (
      !result.shouldAdvanceToConfirmation &&
      (result.paymentStatus === 'processing' || result.paymentStatus === 'awaiting_payment')
    ) {
      setPaymentProcessingState(toProcessingVisualState(result.paymentStatus))
      if (result.paymentStatus === 'processing') {
        toast.info('Pagamento em processamento. Aguarde a confirmação.')
      }
      return
    }
  }

  const applyPendingPayment = (result: PendingCheckoutPayment) => {
    clearPendingCheckoutPayment()
    setPendingPayment(result)
    setPendingAsyncPayments((current) => ({ ...current, [result.paymentMethod]: result }))
    setCheckoutStep('payment')
    if (maxReachableStep !== 'payment' && maxReachableStep !== 'confirmed') {
      setMaxReachableStep('payment')
    }
    const orderId = result.orderId
    setExistingOrderId(orderId)
    setPendingCheckoutOrderId(orderId)
    setStoredCheckoutState({
      cartId,
      orderId,
      paymentAttemptId: result.paymentAttemptId,
    })
    setSearchParams({ step: 'payment', orderId }, { replace: true })
  }

  const handleBoletoOpened = async () => {
    if (!pendingPayment || pendingPayment.paymentMethod !== 'boleto') return

    const orderId = pendingPayment.orderId
    clearPendingCheckoutPayment()
    setPendingPayment(null)
    setPaymentProcessingState(null)
    await clearCart()
    showOrderConfirmation(orderId, 'boleto', {
      confirmationType: 'awaiting_boleto',
      isPaid: false,
      paymentStatus: 'awaiting_payment',
      paymentId: pendingPayment.paymentId,
      paymentAttemptId: pendingPayment.paymentAttemptId,
    })
  }

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (creatingOrder) return
    if (method !== selectedPaymentMethod) {
      setCheckoutError(null)

      setPaymentProcessingState(null)
      setActivePaymentAttemptKey(null)

      if (method !== 'pix' && method !== 'boleto') {
        setPendingPayment(null)
        clearPendingCheckoutPayment()
      }

      if (method === 'pix' || method === 'boleto') {
        const cachedPayment = pendingAsyncPayments[method]
        if (cachedPayment && !isPendingPaymentExpired(cachedPayment)) {
          clearPendingCheckoutPayment()
          setPendingPayment(cachedPayment)
        } else {
          setPendingPayment(null)
          clearPendingCheckoutPayment()
          if (cachedPayment) {
            setPendingAsyncPayments((current) => {
              const next = { ...current }
              delete next[method]
              return next
            })
          }
        }
      }
    }
    setSelectedPaymentMethod(method)
  }

  // Restaura confirmação a partir da URL (ex.: redirect de /payment-success)
  useEffect(() => {
    const step = parseCheckoutStep(searchParams.get('step'))
    const orderIdParam = searchParams.get('order_id') || searchParams.get('orderId')
    const paidFromUrl = searchParams.get('paid') === '1'

    if (step !== 'confirmed' || !orderIdParam || paymentResult) return

    try {
      const saved = getConfirmedCheckoutPayment()
      if (saved?.orderId === orderIdParam) {
        if (items.length > 0) {
          const resolution = resolveCheckoutState({
            cartId,
            orderId: orderIdParam,
            cartItems: items,
            storedCheckoutState: getStoredCheckoutState(),
            confirmedPayment: saved,
            pendingPayment,
          })
          if (resolution.shouldReset) {
            clearConfirmedCheckoutPayment()
            setPaymentResult(null)
            setCheckoutStep('cart')
            setSearchParams({ step: 'cart' }, { replace: true })
            return
          }
        }
        setPaymentResult(saved)
        setCheckoutStep('confirmed')
        setMaxReachableStep('confirmed')
        return
      }
    } catch { }

    let cancelled = false

    const loadConfirmedOrder = async () => {
      setResolvingPendingOrder(true)
      try {
        const order = await orderService.getOrder(orderIdParam)
        if (cancelled) return

        const isPaid = paidFromUrl || isPaidOrderStatus(order.status)
        if (!isPaid) {
          if (!cancelled) {
            setCheckoutStep('payment')
            setSearchParams({ step: 'payment', orderId: orderIdParam }, { replace: true })
          }
          return
        }
        const result: ConfirmedCheckoutPayment = {
          orderId: orderIdParam,
          paymentMethod: normalizePaymentMethod(order.payment_method),
          isPaid: normalizePaymentMethod(order.payment_method) !== 'boleto',
          confirmationType:
            normalizePaymentMethod(order.payment_method) === 'boleto' ? 'awaiting_boleto' : 'paid',
          status: order.status,
          cartId,
        }
        setConfirmedCheckoutPayment(result)
        setPaymentResult(result)
        setCheckoutStep('confirmed')
        setMaxReachableStep('confirmed')

        if (isPaid) {
          clearPendingCheckoutOrderId()
        }
      } catch (err) {
        console.error('Erro ao carregar pedido confirmado:', err)
        if (!cancelled) {
          toast.error('Não foi possível carregar o pedido.')
          setCheckoutStep('cart')
          setSearchParams({ step: 'cart' }, { replace: true })
        }
      } finally {
        if (!cancelled) setResolvingPendingOrder(false)
      }
    }

    void loadConfirmedOrder()
    return () => { cancelled = true }
  }, [searchParams, paymentResult, items.length, cartId, pendingPayment, setSearchParams])

  const handleContinueToDelivery = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/carrinho?step=delivery')
      return
    }
    goToStep('delivery')
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

    goToStep('payment')
  }

  const handleContinueWithSavedAddress = () => {
    if (!canProceedToPayment()) {
      const reason = getPaymentBlockReason()
      if (reason) toast.warning(reason)
      return
    }
    goToStep('payment')
  }



  useEffect(() => {
    if (checkoutStep === 'payment' && selectedPaymentMethod === 'credit_card' && currentTotal > 0) {
      let cancelled = false
        ; (async () => {
          try {
            setLoadingInstallments(true)
            const opts = await paymentService.getInstallmentOptions(currentTotal)
            if (cancelled) return
            setInstallmentOptions(opts.options)
            setMaxInterestFree(opts.maxInterestFreeInstallments)
          } catch {
            if (!cancelled) {
              setInstallmentOptions([{
                installments: 1, installmentValue: currentTotal, totalValue: currentTotal,
                hasInterest: false, label: `1x de R$ ${currentTotal.toFixed(2).replace('.', ',')} sem juros`,
              }])
            }
          } finally {
            if (!cancelled) setLoadingInstallments(false)
          }
        })()
      return () => { cancelled = true }
    }
  }, [checkoutStep, selectedPaymentMethod, currentTotal])

  const handleCopyBoleto = () => {
    if (pendingPayment?.identificationField) {
      navigator.clipboard.writeText(pendingPayment.identificationField)
      setCopiedBoleto(true)
      setTimeout(() => setCopiedBoleto(false), 2000)
    }
  }

  useEffect(() => {
    if (items.length === 0 && !paymentResult && !pendingPayment) return
    const stepParam = parseCheckoutStep(searchParams.get('step'))
    if (stepParam === 'confirmed' && !paymentResult?.isPaid) {
      if (pendingPayment) {
        setCheckoutStep('payment')
      }
      return
    }
    if (stepParam && stepParam !== checkoutStep && stepParam !== 'confirmed') {
      setCheckoutStep(stepParam)
      setMaxReachableStep((current) =>
        getStepIndex(stepParam) > getStepIndex(current) ? stepParam : current
      )
    }
    else if (!stepParam && checkoutStep !== 'cart' && checkoutStep !== 'confirmed' && checkoutStep !== 'payment') setCheckoutStep('cart')
  }, [searchParams, items.length, paymentResult, pendingPayment, checkoutStep])

  const handleCopyPix = () => {
    const pixAttempt = pendingAsyncPayments.pix
    if (pixAttempt?.pixPayload) {
      navigator.clipboard.writeText(pixAttempt.pixPayload)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2000)
    }
  }

  const handlePaymentSubmit = () => {
    if (selectedPaymentMethod === 'pix' || selectedPaymentMethod === 'boleto') {
      void handleGenerateAsyncPayment()
      return
    }
    void handleSubmit()
  }

  const handleGenerateAsyncPayment = async () => {
    if (creatingOrder) return
    const cachedPayment = selectedPaymentMethod === 'pix' || selectedPaymentMethod === 'boleto'
      ? pendingAsyncPayments[selectedPaymentMethod]
      : null

    if (cachedPayment && !isPendingPaymentExpired(cachedPayment)) {
      clearPendingCheckoutPayment()
      if (selectedPaymentMethod === 'pix' || selectedPaymentMethod === 'boleto') {
        setPendingPayment(cachedPayment)
      }
      return
    }

    if (cachedPayment && isPendingPaymentExpired(cachedPayment)) {
      setPendingAsyncPayments((current) => {
        const next = { ...current }
        delete next[selectedPaymentMethod as 'pix' | 'boleto']
        return next
      })
    }

    const blockReason = getPaymentBlockReason()
    if (blockReason) {
      toast.warning(blockReason)
      return
    }

    try {
      setCreatingOrder(true)
      setCheckoutError(null)
      await persistCheckoutAddressIfNeeded()

      const params = buildCreatePreferenceParams()
      const preference = await paymentService.createPreference(params as any)
      const orderId = preference.orderId
      if (!orderId) {
        throw new Error('Pedido não foi criado. Tente novamente.')
      }

      setExistingOrderId(orderId)
      setPendingCheckoutOrderId(orderId)

      if (preference.paymentMethod === 'pix') {
        applyPendingPayment({
          orderId,
          paymentMethod: 'pix',
          paymentId: preference.paymentId,
          paymentAttemptId: preference.paymentAttemptId,
          paymentStatus: preference.paymentStatus,
          pixQrCode: preference.pixQrCode,
          pixPayload: preference.pixPayload,
          expirationDate: preference.expirationDate,
        })
        if (selectedPaymentMethod === 'pix') {
          setPaymentProcessingState('awaiting_payment')
        }
      } else if (preference.paymentMethod === 'boleto') {
        applyPendingPayment({
          orderId,
          paymentMethod: 'boleto',
          paymentId: preference.paymentId,
          paymentAttemptId: preference.paymentAttemptId,
          paymentStatus: preference.paymentStatus,
          bankSlipUrl: preference.bankSlipUrl,
          identificationField: preference.identificationField,
          dueDate: preference.dueDate,
        })
        if (selectedPaymentMethod === 'boleto') {
          setPaymentProcessingState('awaiting_payment')
        }
      } else {
        throw new Error('Resposta inesperada ao gerar pagamento.')
      }
    } catch (error: any) {
      console.error('Erro ao gerar pagamento:', error)
      const message = error.message || 'Erro ao processar pagamento. Tente novamente.'
      setCheckoutError(message)
      toast.error(message)
    } finally {
      setCreatingOrder(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (creatingOrder) return

    const blockReason = getPaymentBlockReason()
    if (blockReason) {
      toast.warning(blockReason)
      return
    }

    if (selectedPaymentMethod !== 'credit_card') {
      void handleGenerateAsyncPayment()
      return
    }

    const errors = validateCreditCardForm(cardFormData)
    setCardFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.warning('Verifique os dados do cartão')
      return
    }

    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      toast.warning('Por favor, preencha todos os campos do endereço')
      return
    }

    if (hasInvalidCep()) {
      toast.error('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    await persistCheckoutAddressIfNeeded()

    try {
      setCreatingOrder(true)
      setCheckoutError(null)
      setPaymentProcessingState('processing')

      const params = buildCreatePreferenceParams()
      const preference = await paymentService.createPreference(params as any)

      if (preference.orderId) {
        setExistingOrderId(preference.orderId)
        setPendingCheckoutOrderId(preference.orderId)
      }

      const isCardFlow =
        preference.paymentMethod === 'credit_card' &&
        (preference.providerStatus === 'PENDING_CARD_DETAILS' ||
          preference.paymentStatus === 'awaiting_payment')

      if (!isCardFlow) {
        throw new Error('Não foi possível iniciar o pagamento com cartão.')
      }

      const orderId = preference.orderId
      const idempotencyKey = activePaymentAttemptKey || createPaymentIdempotencyKey(orderId)
      setActivePaymentAttemptKey(idempotencyKey)

      const [expiryMonth, expiryYear] = cardFormData.expiry.split('/')
      const response = await paymentService.payWithCard({
        orderId: orderId!,
        paymentMethod: selectedPaymentMethod,
        idempotencyKey,
        creditCard: {
          holderName: cardFormData.holderName,
          number: cardFormData.number.replace(/\D/g, ''),
          expiryMonth,
          expiryYear: `20${expiryYear}`,
          ccv: cardFormData.ccv,
        },
        payer: {
          cpfCnpj: cardFormData.cpf.replace(/\D/g, ''),
        },
        installments: cardFormData.installments,
      })

      await handleNormalizedPaymentResult(response, selectedPaymentMethod)
      setCreatingOrder(false)
    } catch (error: any) {
      console.error('Erro ao criar preferência de pagamento:', error)
      const message = error.message || 'Erro ao processar pagamento. Tente novamente.'
      setCheckoutError(message)
      setPaymentProcessingState('failed')
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

      const selectedOpt = shippingOptions.find(option => option.method === selectedShippingMethod) || shippingOptions[0]
      const carrierCost = (selectedOpt as any)?.pricing?.quotedFee ?? (selectedOpt as any)?.originalFee ?? selectedOpt?.shippingFee ?? (shippingCost || 0)
      const subsidyAmt = (selectedOpt as any)?.pricing?.discountApplied ?? (carrierCost > (shippingCost || 0) ? carrierCost - (shippingCost || 0) : 0)

      const order = await orderService.createOrderWithoutPayment(
        shippingAddress,
        isSubscription ? subscriptionPlan : undefined,
        shippingCost ?? 0,
        selectedShippingMethod ? selectedOpt?.name || selectedShippingMethod : undefined,
        carrierCost,
        subsidyAmt
      )

      await clearCart()

      showOrderConfirmation(order.id, 'pix', { status: 'CONFIRMED' })
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

  // Busca produtos recomendados (carrinho com itens: por categoria; vazio: destaques)
  useEffect(() => {
    const loadRecommendations = async () => {
      if (items.length === 0) {
        try {
          const products = await productsService.getAll()
          const active = products.filter((p) => p.active !== false)
          setRecommendedProducts(active.slice(0, 16))
        } catch (error) {
          console.error('Erro ao carregar recomendações para carrinho vazio:', error)
          setRecommendedProducts([])
        }
        return
      }

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
  }, [cartCategories, cartProductIds, items.length])
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

  if (authLoading || resolvingPendingOrder || (cartLoading && items.length === 0 && !paymentResult && !pendingPayment)) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[75vh] flex items-center justify-center py-12 px-4 animate-fade-in">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-4" size={38} />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Carregando dados do carrinho...</p>
        </div>
      </div>
    )
  }

  const isEmptyCart = items.length === 0 && !paymentResult && !pendingPayment && !existingOrderId

  const effectiveStep: CheckoutStep = resolveCheckoutStep(checkoutStep, pendingPayment, paymentResult)



  const renderStepper = () => (
    <CheckoutStepper
      currentStep={effectiveStep}
      maxReachableStep={paymentResult?.isPaid ? 'confirmed' : (pendingPayment ? 'payment' : maxReachableStep)}
      onStepClick={handleStepClick}
    />
  )

  const renderCartItems = () => (
    <div className="space-y-4">
      {items.map((item) => (
        <CartItemCard
          key={item.id}
          item={item}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          getImageUrl={productsService.getImageUrl}
        />
      ))}
    </div>
  )

  const renderCartSidebar = () => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 sticky top-24 animate-fade-in">
        {freeShippingThreshold > 0 && (
          <div className="mb-6 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 dark:border-green-500/30 rounded-2xl p-4 sm:p-4.5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                {/* Truck icon container com animação de partida */}
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xs ${
                  hasFreeShipping || totalAfterPromotions >= freeShippingThreshold
                    ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}>
                  <div className="flex flex-col items-center justify-center translate-y-[2px]">
                    <span className="relative inline-block animate-truck-start">
                      <Truck className="w-4 h-4" />

                      {/* Fumaça da partida */}
                      <span className="absolute left-[-5px] bottom-[2px] flex gap-[2px] pointer-events-none z-10 animate-smoke-puff">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 opacity-60"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 opacity-40"></span>
                      </span>

                      {/* Sparkles */}
                      <div className="absolute left-[4.5px] bottom-[2.5px] pointer-events-none overflow-visible">
                        <span className={`absolute left-0 bottom-0 w-1.5 h-1.5 rounded-full bg-green-400 dark:bg-green-300 opacity-0 ${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? 'animate-free-shipping-sparkle' : ''}`} style={{ animationDelay: '1.5s' }}></span>
                        <span className={`absolute left-0 bottom-0 w-1 h-1 rounded-full bg-yellow-400 dark:bg-yellow-300 opacity-0 ${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? 'animate-free-shipping-sparkle' : ''}`} style={{ animationDelay: '2.3s' }}></span>
                      </div>
                    </span>
                    <div className={`w-6 h-[1.5px] mt-[-2px] opacity-85 animate-road-move-delayed ${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                      }`} />
                  </div>
                </div>

                <div className="flex-1">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 leading-snug block">
                    {hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? (
                      <span className="text-green-600 dark:text-green-400">Você ganhou Frete Grátis!</span>
                    ) : (
                      <span>
                        Adicione mais <strong className="text-primary-600 dark:text-primary-400">R$ {Math.max(0, freeShippingThreshold - totalAfterPromotions).toFixed(2).replace('.', ',')}</strong> para ter Frete Grátis{shippingCep.replace(/\D/g, '').length !== 8 ? '*' : ''}
                      </span>
                    )}
                  </span>
                  {!(hasFreeShipping || totalAfterPromotions >= freeShippingThreshold) && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                      {shippingCep.replace(/\D/g, '').length === 8
                        ? '* Válido para o seu CEP.'
                        : '* Consulte seu CEP para verificar as opções de frete.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all ease-out ${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold
                  ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600'
                  }`}
                style={{
                  width: `${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? 100 : Math.min(100, (totalAfterPromotions / freeShippingThreshold) * 100)}%`,
                  transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              ></div>
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
                  'Aplicar'
                )}
              </button>
            </div>
            {promoCodeError && (
              <p className="text-[11px] text-red-500 dark:text-red-400 font-bold">{promoCodeError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {appliedPromoCodes.length > 1 && promoCodesValidation ? (
              <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30 rounded-2xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {promoCodesValidation.promoCodes.map((pc, index) => {
                      if (index !== currentCouponIndex) return null
                      const appliedDiscount = promoCodesValidation.appliedDiscounts.percentage?.code === pc.code
                        ? promoCodesValidation.appliedDiscounts.percentage
                        : promoCodesValidation.appliedDiscounts.fixed.find(f => f.code === pc.code)

                      return (
                        <div key={pc.id} className="animate-fade-in">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
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
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{promo.name}</p>
                          {promo.description && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{promo.description}</p>
                          )}
                        </div>
                        {discountText && (
                          <span className="text-xs font-black text-pink-600 dark:text-pink-400 bg-pink-100/60 dark:bg-pink-900/40 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            {discountText}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center text-xs sm:text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">
            Frete
          </span>
          <div className="font-extrabold text-right">
            {calculatingShipping ? (
              <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center justify-end gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                calculando...
              </span>
            ) : (
              <>
                {(() => {
                  const selectedOpt = shippingOptions.find(o => o.method === selectedShippingMethod) || shippingOptions[0]
                  const quotedFee = selectedOpt?.quotedFee ?? selectedOpt?.pricing?.quotedFee ?? selectedOpt?.originalFee ?? null
                  const showOriginal = quotedFee != null && quotedFee > (hasFreeShipping ? 0 : (shippingFee || 0))
                  return showOriginal ? (
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500 line-through mr-1.5">
                      R$ {quotedFee.toFixed(2).replace('.', ',')}
                    </span>
                  ) : null
                })()}
                {hasFreeShipping ? (
                  <span className="text-green-600 dark:text-green-400 font-extrabold">Grátis</span>
                ) : hasInvalidCep() ? (
                  <span className="text-red-500 dark:text-red-400 font-black">CEP inválido</span>
                ) : shippingFee !== null ? (
                  <span className="text-gray-900 dark:text-white font-extrabold">R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 font-medium">a calcular</span>
                )}
              </>
            )}
          </div>
        </div>

        {shippingFee !== null && displayedDeliveryTime && displayedDeliveryTimeType && !hasInvalidCep() && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/60 animate-fade-in text-left">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-bold">
              {(checkoutStep === 'cart' || effectiveStep === 'cart') && freeShippingThreshold <= 0 ? (
                <div className="h-6 w-6 rounded-lg flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  <div className="flex flex-col items-center justify-center translate-y-[1px]">
                    <span className="relative inline-block animate-truck-start">
                      <Truck className="w-3.5 h-3.5" />
                      <span className="absolute left-[-4px] bottom-[1px] flex gap-[1px] pointer-events-none z-10 animate-smoke-puff">
                        <span className="w-1 h-1 rounded-full bg-gray-400 opacity-60"></span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 opacity-40"></span>
                      </span>
                    </span>
                    <div className="w-4 h-[1px] mt-[-1px] opacity-85 animate-road-move-delayed text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              ) : (
                <Truck className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span>Previsão:</span>
            </span>
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-right ml-2">
              {displayedDeliveryTime} {displayedDeliveryTimeType === 'business' ? (Number(displayedDeliveryTime) === 1 ? 'dia útil' : 'dias úteis') : (Number(displayedDeliveryTime) === 1 ? 'dia corrido' : 'dias corridos')}{displayedEstimatedDate ? ` (${displayedEstimatedDate})` : ''}{service ? ` via ${service.toLowerCase()}` : ''}
            </span>
          </div>
        )}
      </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 pb-2 mb-4 sm:mb-6">
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-gray-900 dark:text-white">Total Geral</span>
            {calculatingShipping && shippingFee !== null ? (
              <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                calculando...
              </span>
            ) : (
              <div className="text-right flex items-baseline justify-end gap-2">
                {(() => {
                  const selectedOpt = shippingOptions.find(o => o.method === selectedShippingMethod) || shippingOptions[0]
                  const quotedFee = selectedOpt?.quotedFee ?? selectedOpt?.pricing?.quotedFee ?? selectedOpt?.originalFee ?? null
                  const originalTotal = baseTotal + (quotedFee != null ? quotedFee : (shippingFee || 0))
                  return originalTotal > currentTotal ? (
                    <span className="text-xs sm:text-sm font-normal text-gray-400 dark:text-gray-500 line-through">
                      R$ {originalTotal.toFixed(2).replace('.', ',')}
                    </span>
                  ) : null
                })()}
                <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                  R$ {currentTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        </div>

      <button
        onClick={handleContinueToDelivery}
        className="w-full mt-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black py-4 px-6 rounded-2xl transition-all duration-200 mb-4 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg active:scale-98 group cursor-pointer"
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

  const renderEmptyCartMain = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 animate-fade-in">
      <div className="flex flex-col items-center text-center py-6 sm:py-10">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <ShoppingBag size={40} className="sm:w-11 sm:h-11" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2">
          Seu carrinho está vazio
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm leading-relaxed">
          Adicione produtos de saúde e bem-estar para começar seu pedido. Confira as sugestões abaixo!
        </p>
        <Link
          to="/produtos"
          className="inline-flex items-center justify-center bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-extrabold py-3.5 px-8 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] text-sm gap-2"
        >
          <ShoppingCart size={16} />
          Explorar produtos
        </Link>
      </div>
    </div>
  )

  const renderEmptyCartSidebar = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 sticky top-24 animate-fade-in">
      <h2 className="text-xs font-black text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
        Resumo do Pedido
      </h2>

      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-5 text-center mb-5">
        <ShoppingCart className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
          Nenhum item no carrinho
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Os valores aparecerão aqui quando você adicionar produtos.
        </p>
      </div>

      {freeShippingThreshold > 0 && (
        <div className="mb-5 p-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug">
              Frete grátis a partir de{' '}
              <span className="text-primary-600 dark:text-primary-400">
                R$ {freeShippingThreshold.toFixed(2).replace('.', ',')}
              </span>
            </p>
          </div>
        </div>
      )}

      <Link
        to="/produtos"
        className="w-full inline-flex items-center justify-center bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg text-sm gap-2"
      >
        <ArrowRight size={16} />
        Começar a comprar
      </Link>

      <Link
        to="/"
        className="w-full inline-flex items-center justify-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-extrabold transition-colors py-3 text-center"
      >
        <ArrowLeft size={12} />
        Voltar ao início
      </Link>
    </div>
  )



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

            {formData.cep.replace(/\D/g, '').length === 8 && (
              <div className="mt-4 sm:mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Frete</h3>
                <ShippingCard
                  service={service}
                  deliveryTime={displayedDeliveryTime}
                  deliveryTimeType={displayedDeliveryTimeType}
                  estimatedDateFormatted={displayedEstimatedDate || ''}
                  shippingFee={shippingFee}
                  hasFreeShipping={hasFreeShipping}
                  calculatingShipping={calculatingShipping}
                  hasInvalidCep={hasInvalidCep()}
                  options={shippingOptions}
                  selectedMethod={selectedShippingMethod}
                  onSelect={selectShippingOption}
                />
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
            {formData.cep.replace(/\D/g, '').length === 8 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Frete</h3>
                <ShippingCard
                  service={service}
                  deliveryTime={displayedDeliveryTime}
                  deliveryTimeType={displayedDeliveryTimeType}
                  estimatedDateFormatted={displayedEstimatedDate || ''}
                  shippingFee={shippingFee}
                  hasFreeShipping={hasFreeShipping}
                  calculatingShipping={calculatingShipping}
                  hasInvalidCep={hasInvalidCep()}
                  options={shippingOptions}
                  selectedMethod={selectedShippingMethod}
                  onSelect={selectShippingOption}
                />
              </div>
            )}
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
    const pendingPix = pendingAsyncPayments.pix && !isPendingPaymentExpired(pendingAsyncPayments.pix) ? pendingAsyncPayments.pix : null
    const pendingBoleto = pendingAsyncPayments.boleto && !isPendingPaymentExpired(pendingAsyncPayments.boleto) ? pendingAsyncPayments.boleto : null
    const hasPendingPix = selectedPaymentMethod === 'pix' && Boolean(pendingPix)
    const hasPendingBoleto = selectedPaymentMethod === 'boleto' && Boolean(pendingBoleto)
    const selectedAsyncPayment = selectedPaymentMethod === 'pix' ? pendingPix : selectedPaymentMethod === 'boleto' ? pendingBoleto : null
    const isCardProcessing = selectedPaymentMethod === 'credit_card' && paymentProcessingState && paymentProcessingState !== 'awaiting_payment'

    return (
      <>
        <div className="mb-4">
          <PaymentSelector
            selectedMethod={selectedPaymentMethod}
            onSelectMethod={handlePaymentMethodChange}
            disabled={creatingOrder}
          />
        </div>

        <div className="mt-4">
          {pendingCheckoutConfirmation && paymentProcessingState === 'confirmed' ? (
            <PaymentProcessingState
              state="confirmed"
              onConfirmedTransitionEnd={finishConfirmationTransition}
            />
          ) : selectedPaymentMethod === 'pix' && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5">
              <PixPayment
                pixQrCode={hasPendingPix ? pendingPix?.pixQrCode : undefined}
                pixPayload={hasPendingPix ? pendingPix?.pixPayload : undefined}
                timeLeft={hasPendingPix ? timeLeft : undefined}
                copied={copiedPix}
                onCopy={handleCopyPix}
                isGenerating={creatingOrder && selectedPaymentMethod === 'pix' && !hasPendingPix}
                awaitingPayment={hasPendingPix}
              />
            </div>
          )}
          {!pendingCheckoutConfirmation && selectedPaymentMethod === 'boleto' && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5">
              <BoletoPayment
                bankSlipUrl={hasPendingBoleto ? pendingBoleto?.bankSlipUrl : undefined}
                identificationField={hasPendingBoleto ? pendingBoleto?.identificationField : undefined}
                dueDate={hasPendingBoleto ? pendingBoleto?.dueDate : undefined}
                copied={copiedBoleto}
                onCopy={handleCopyBoleto}
                isGenerating={creatingOrder && selectedPaymentMethod === 'boleto' && !hasPendingBoleto}
                onBoletoOpen={handleBoletoOpened}
              />
            </div>
          )}
          {!pendingCheckoutConfirmation && isCardProcessing ? (
            <PaymentProcessingState
              state={paymentProcessingState}
              onRetry={() => {
                setPaymentProcessingState(null)
                setCheckoutError(null)
                setActivePaymentAttemptKey(null)
              }}
            />
          ) : !pendingCheckoutConfirmation && selectedPaymentMethod === 'credit_card' && (
            <CreditCardPayment
              formData={cardFormData}
              onChange={(data) => {
                setCardFormData(data)
                if (Object.keys(cardFormErrors).length > 0) setCardFormErrors({})
              }}
              errors={cardFormErrors}
              installmentOptions={installmentOptions}
              loadingOptions={loadingInstallments}
              maxInterestFree={maxInterestFree}
              disabled={creatingOrder}
            />
          )}
        </div>

        {checkoutError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
            {checkoutError}
          </div>
        )}

        {getPaymentBlockReason() && !creatingOrder && !calculatingShipping && (
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
          {!pendingCheckoutConfirmation && !selectedAsyncPayment && (!isCardProcessing || paymentProcessingState === 'failed') && (
            <button
              type="button"
              onClick={handlePaymentSubmit}
              className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-6 sm:ml-auto font-bold disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
              disabled={creatingOrder || creatingOrderWithoutPayment || !canProceedToPayment()}
            >
              {creatingOrder ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  <span>Processando...</span>
                </>
              ) : (
                <span>
                  {selectedPaymentMethod === 'credit_card'
                    ? 'Pagar com Cartão'
                    : selectedPaymentMethod === 'pix'
                      ? 'Continuar'
                      : 'Continuar'}
                </span>
              )}
            </button>
          )}
        </div>
      </>
    )
  }



  const renderCheckoutSidebar = () => {
    const selectedOpt = shippingOptions.find(o => o.method === selectedShippingMethod) || shippingOptions[0]
    const quotedFee = selectedOpt?.quotedFee ?? selectedOpt?.pricing?.quotedFee ?? selectedOpt?.originalFee ?? null
    const showOriginalShipping = quotedFee != null && quotedFee > (hasFreeShipping ? 0 : (shippingFee || 0))

    const originalTotal = baseTotal + (quotedFee != null ? quotedFee : (shippingFee || 0))
    const showOriginalTotal = originalTotal > currentTotal

    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 sticky top-24 animate-fade-in">
        <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white mb-3 sm:mb-4 uppercase tracking-wider">
          Resumo do Pedido
        </h2>

        {/* Lista de itens no checkout */}
        <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-1">
          {items.map((item) => {
            const hasDiscount = item.product && item.product.promo_price && item.product.promo_price < item.product.price
            const originalUnitPrice = item.product?.price ?? 0
            const currentUnitPrice = item.product?.promo_price ?? item.product?.price ?? 0

            return (
              <div key={item.id} className="text-xs pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">{item.product?.name}</p>
                <div className="flex justify-between text-gray-500 mt-1">
                  <span>Qtd: {item.quantity}</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {hasDiscount && (
                      <span className="line-through text-gray-400 font-normal">
                        R$ {(originalUnitPrice * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <span className={hasDiscount ? 'text-green-600 dark:text-green-400 font-extrabold' : 'text-gray-900 dark:text-white'}>
                      R$ {(currentUnitPrice * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
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
                {promoCodesValidation.promoCodes.length > 1
                  ? `Cupons (${promoCodesValidation.promoCodes.map(p => p.code).join(', ')})`
                  : `Cupom (${promoCodesValidation.promoCodes[0]?.code})`}
              </span>
              <span className="text-green-600 dark:text-green-400 font-extrabold">
                - R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {applicablePromotions.length > 0 && (
            <div className="space-y-1 bg-pink-50/30 dark:bg-pink-955/20 border border-pink-100 dark:border-pink-900/30 rounded-xl p-2.5">
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
                <div className="flex justify-between items-center text-xs text-pink-600 dark:text-pink-400 font-bold pt-1 border-t border-pink-100/50">
                  <span>Desconto Ofertas</span>
                  <span>- R$ {promotionDiscount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-gray-150 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400 font-bold">Frete</span>
            <div className="text-right flex items-center justify-end gap-1.5">
              {calculatingShipping ? (
                <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 font-semibold animate-pulse">
                  <Loader2 className="animate-spin w-3 h-3" /> Calculando...
                </span>
              ) : isSubscription ? (
                <span className="text-green-600 dark:text-green-400 font-extrabold">Grátis (Assinatura)</span>
              ) : (
                <>
                  {showOriginalShipping && (
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500 line-through">
                      R$ {quotedFee.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  {hasFreeShipping ? (
                    <span className="text-green-600 dark:text-green-400 font-extrabold">Grátis</span>
                  ) : hasInvalidCep() ? (
                    <span className="text-red-500 dark:text-red-400 text-xs font-black">CEP inválido</span>
                  ) : shippingFee !== null ? (
                    <span className="text-gray-900 dark:text-white font-extrabold">
                      R$ {shippingFee.toFixed(2).replace('.', ',')}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 font-semibold">-</span>
                  )}
                </>
              )}
            </div>
          </div>

          {shippingFee !== null && displayedDeliveryTime && displayedDeliveryTimeType && !hasInvalidCep() && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/60 animate-fade-in text-left">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-bold">
                <Truck className="w-3.5 h-3.5 text-gray-500" />
                <span>Previsão:</span>
              </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-right ml-2">
                {displayedDeliveryTime} {displayedDeliveryTimeType === 'business' ? (Number(displayedDeliveryTime) === 1 ? 'dia útil' : 'dias úteis') : (Number(displayedDeliveryTime) === 1 ? 'dia corrido' : 'dias corridos')}{displayedEstimatedDate ? ` (${displayedEstimatedDate})` : ''}{service ? ` via ${service.toLowerCase()}` : ''}
              </span>
            </div>
          )}

          {checkoutStep === 'payment' && (
            <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-gray-150 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Pagamento</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">
                {selectedPaymentMethod === 'pix' && 'PIX'}
                {selectedPaymentMethod === 'boleto' && 'Boleto'}
                {selectedPaymentMethod === 'credit_card' && (
                  <>
                    Cartão de Crédito
                    {cardFormData.installments > 1 ? ` • ${cardFormData.installments}x` : ''}
                  </>
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4">
            <span className="text-base font-extrabold text-gray-900 dark:text-white">Total Geral</span>
            <div className="text-right flex items-baseline justify-end gap-2">
              {showOriginalTotal && (
                <span className="text-xs sm:text-sm font-normal text-gray-400 dark:text-gray-500 line-through">
                  R$ {originalTotal.toFixed(2).replace('.', ',')}
                </span>
              )}
              <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                R$ {currentTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderRecommendations = () => (
    <>
      {(checkoutStep === 'cart' || isEmptyCart) && recommendedProducts.length > 0 && (
        <div className={`mt-8 sm:mt-12 pt-6 sm:pt-8`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              {isEmptyCart ? 'Você também pode gostar' : 'Complemente seu pedido'}
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
        {effectiveStep !== 'confirmed' && renderStepper()}

        {effectiveStep === 'confirmed' && paymentResult ? (
          <CheckoutConfirmation
            paymentResult={paymentResult}
            maxReachableStep="confirmed"
            onStepClick={handleStepClick}
          />
        ) : isEmptyCart ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 order-1">
              {renderEmptyCartMain()}
            </div>
            <div className="lg:col-span-1 order-2">
              {renderEmptyCartSidebar()}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {checkoutStep === 'cart' ? (
              <>
                <div className="lg:col-span-2 space-y-6 order-1">
                  {renderCartItems()}
                </div>
                <div className="lg:col-span-1 self-stretch order-2">
                  {renderCartSidebar()}
                </div>
              </>
            ) : (
              <>
                <div className="lg:col-span-2 order-1">
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 animate-fade-in">

                    {checkoutStep === 'delivery' && renderDeliveryStep()}
                    {checkoutStep === 'payment' && renderPaymentStep()}
                  </div>
                </div>
                <div className="lg:col-span-1 order-2">
                  {renderCheckoutSidebar()}
                </div>
              </>
            )}
          </div>
        )}

        {renderRecommendations()}
        {renderModals()}
      </div>
    </div>
  )
}
