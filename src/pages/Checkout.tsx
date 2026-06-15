import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Loader2, Truck, Plus, Edit2, Trash2, X, TestTube } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { paymentService, buildShippingAddress } from '../services/payment.service'
import { shippingService } from '../services/shipping.service'
import { addressService, SavedAddress } from '../services/address.service'
import { orderService } from '../services/order.service'
import { MultiplePromoCodesValidation } from '../services/promo-codes.service'
import { cepService } from '../services/cep.service'
import { CheckoutPayment } from '../components/Checkout/CheckoutPayment'
import { Copy, Download, CheckCircle } from 'lucide-react'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCart()
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth()
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [creatingOrderWithoutPayment, setCreatingOrderWithoutPayment] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'boleto' | 'credit_card'>('pix')
  const [subscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')


  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [copiedPix, setCopiedPix] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null)

  // Efeito para o contador do PIX
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

  // Polling para verificar se o PIX foi pago via Webhook
  useEffect(() => {
    if (paymentResult?.paymentMethod === 'pix' && paymentResult.orderId) {
      const pollInterval = setInterval(async () => {
        try {
          const order = await orderService.getOrder(paymentResult.orderId)
          const successStatuses = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'PAID']
          
          if (successStatuses.includes(order.status)) {
            clearInterval(pollInterval)
            await clearCart()
            navigate(`/payment-success?order_id=${paymentResult.orderId}`)
          }
        } catch (err) {
          console.error('Erro ao consultar status do PIX:', err)
        }
      }, 5000) // Consulta a cada 5 segundos

      return () => clearInterval(pollInterval)
    }
  }, [paymentResult, clearCart, navigate])

  // Estados para endereços salvos
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<string | null>(null)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [editAddressData, setEditAddressData] = useState<SavedAddress | null>(null)
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(false)
  const [newAddressNickname, setNewAddressNickname] = useState('')
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1)

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
  const [shippingMessage, setShippingMessage] = useState<string | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0)
  const [shippingCalculationFailed, setShippingCalculationFailed] = useState(false)

  // Estados para códigos promocionais (aplicados no carrinho)
  const [promoCodesValidation, setPromoCodesValidation] = useState<MultiplePromoCodesValidation | null>(null)

  // Carrega códigos promocionais aplicados no carrinho (se houver)
  useEffect(() => {
    const savedPromoCodesValidation = localStorage.getItem('cart_promo_codes_validation')

    if (savedPromoCodesValidation) {
      try {
        const validation = JSON.parse(savedPromoCodesValidation)
        setPromoCodesValidation(validation)

        // IMPORTANTE: NÃO seta shippingFee aqui para não interferir na validação de CEP
        // O frete grátis por cupom será aplicado apenas no cálculo do custo final
        // Mas o cálculo de frete ainda precisa ser feito para validar se entregamos no CEP
        if (validation.freeShipping) {
          setIsFreeShipping(true)
          // NÃO seta setShippingFee(0) aqui - deixa o cálculo de frete validar o CEP primeiro
        }
      } catch (error) {
        console.error('Erro ao carregar códigos promocionais:', error)
      }
    }
  }, [])

  // Verifica se o carrinho tem assinatura (REMOVIDO: recurso desativado)
  const isSubscription = false

  // Calcula totais com desconto de assinatura
  const baseTotal = getTotal()
  const subscriptionDiscount = isSubscription ? (subscriptionPlan === 'quarterly' ? 0.15 : 0.10) : 0
  const discountedTotal = baseTotal * (1 - subscriptionDiscount)
  const subtotal = isSubscription ? discountedTotal : baseTotal
  const promoCodeDiscount = promoCodesValidation?.totalDiscount || 0
  const subtotalAfterPromo = subtotal - promoCodeDiscount
  const shippingCost = (promoCodesValidation?.freeShipping || isFreeShipping || isSubscription) ? 0 : (shippingFee && !isFreeShipping ? shippingFee : 0)
  const currentTotal = subtotalAfterPromo + shippingCost

  // Redireciona se não estiver autenticado
  // IMPORTANTE: Só redireciona após o AuthContext terminar de carregar
  // Isso evita logout incorreto ao dar F5 na página
  useEffect(() => {
    // Não redireciona enquanto está verificando autenticação
    if (authLoading) return

    // Só redireciona se realmente não estiver autenticado após verificação
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

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
    loadAddresses()
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

  // Calcula frete quando o CEP é preenchido
  useEffect(() => {
    const calculateShipping = async () => {
      const cleanCep = formData.cep.replace(/\D/g, '')

      if (cleanCep.length === 8) {
        try {
          setCalculatingShipping(true)
          setShippingMessage(null)
          setShippingCalculationFailed(false) // Reset do estado de falha antes de tentar

          // Prepara itens do carrinho para envio
          const cartItems = items
            .filter(item => item.product) // Apenas produtos
            .map(item => ({
              product_id: item.product!.id,
              quantity: item.quantity,
            }))

          const result = await shippingService.calculateShipping(
            formData.cep,
            subtotal,
            cartItems
          )

          // IMPORTANTE: O backend retorna shippingFee: null quando não entregamos para o CEP
          // Mesmo com cupom de frete grátis, precisamos validar se entregamos no CEP
          if (result.shippingFee === null) {
            // CEP não atendido - marca como inválido mesmo com cupom de frete grátis
            setShippingFee(null)
            setIsFreeShipping(false)
            setShippingMessage(result.message || 'Não entregamos para este CEP no momento. Em breve estaremos por aí!')
            setShippingCalculationFailed(true)
            setFreeShippingThreshold(0)
          } else {
            // CEP válido - seta o shippingFee do resultado
            setShippingFee(result.shippingFee)

            // Se houver cupom de frete grátis, mantém isFreeShipping como true
            // Caso contrário, usa o resultado do cálculo
            if (promoCodesValidation?.freeShipping) {
              setIsFreeShipping(true)
            } else {
              setIsFreeShipping(result.isFreeShipping)
            }

            setFreeShippingThreshold(result.freeShippingThreshold || 0)
            setShippingMessage(result.message)
            setShippingCalculationFailed(false) // Sucesso, não falhou - CEP é válido
          }
        } catch (error: any) {
          console.error('Erro ao calcular frete:', error)
          setShippingFee(null)
          setIsFreeShipping(false)

          // Verifica se o erro indica que não entregamos para o CEP
          const errorMessage = (error.message || error.toString() || '').toLowerCase()
          const isCepNotServed = errorMessage.includes('não atendemos') ||
            errorMessage.includes('não entregamos') ||
            errorMessage.includes('cep inválido') ||
            errorMessage.includes('não atendido') ||
            errorMessage.includes('não temos entrega') ||
            errorMessage.includes('região não atendida') ||
            (error.response?.status === 400 && (errorMessage.includes('cep') || errorMessage.includes('entrega')))

          if (isCepNotServed) {
            setShippingMessage('Não entregamos para este CEP no momento. Em breve estaremos por aí!')
            setShippingCalculationFailed(true)
          } else {
            // Erro genérico (rede, servidor, etc.) - não marca como CEP inválido
            setShippingMessage('Erro ao calcular frete. Tente novamente.')
            setShippingCalculationFailed(false)
          }
        } finally {
          setCalculatingShipping(false)
        }
      } else {
        // Limpa valores se CEP não estiver completo
        setShippingFee(null)
        setIsFreeShipping(false)
        setShippingMessage(null)
        setShippingCalculationFailed(false) // Reset quando CEP não está completo
      }
    }

    // Debounce para evitar muitas chamadas
    const timeoutId = setTimeout(calculateShipping, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.cep, subtotal, items])

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
              // Ou se os campos estiverem vazios
              const isAddressEmpty = !prev.address || !prev.city || !prev.state

              // Só atualiza se o usuário estiver digitando o CEP ou se os campos estiverem vazios
              // Isso evita sobrescrever um endereço salvo quando ele é selecionado
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

    // Formata CEP automaticamente
    if (name === 'cep') {
      const cleanValue = value.replace(/\D/g, '')
      if (cleanValue.length <= 8) {
        const formatted = cleanValue.length > 5
          ? `${cleanValue.substring(0, 5)}-${cleanValue.substring(5)}`
          : cleanValue
        setFormData(prev => ({ ...prev, [name]: formatted }))
        // Reset do estado de falha quando o CEP é alterado
        // O cálculo será feito automaticamente pelo useEffect
        setShippingCalculationFailed(false)
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Se estiver editando um endereço salvo, marca como editando
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
        city: formData.city,
        state: formData.state,
      })

      await loadAddresses()
      setEditingAddressId(null)

      // Mantém o endereço selecionado
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
      alert('Erro ao atualizar endereço: ' + (error.message || 'Erro desconhecido'))
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
        city: editAddressData.city,
        state: editAddressData.state,
        isDefault: editAddressData.is_default,
      })

      await loadAddresses()
      setShowEditAddressModal(false)
      setEditAddressData(null)

      // Se o endereço editado estava selecionado, atualiza a seleção
      if (selectedAddressId === editAddressData.id) {
        const addresses = await addressService.getSavedAddresses()
        const updated = addresses.find(addr => addr.id === editAddressData.id)
        if (updated) {
          selectAddress(updated)
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar endereço:', error)
      alert('Erro ao atualizar endereço: ' + (error.message || 'Erro desconhecido'))
    }
  }


  const handleDeleteAddress = async (id: string) => {
    try {
      await addressService.deleteSavedAddress(id)
      await loadAddresses()
      setShowDeleteConfirmModal(null)

      // Se o endereço deletado era o selecionado, limpa o formulário
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
      alert('Erro ao remover endereço: ' + (error.message || 'Erro desconhecido'))
    }
  }

  // Verifica se o CEP não tem entrega disponível
  // Só retorna true se o cálculo foi realmente tentado e falhou
  // IMPORTANTE: CEPs inválidos são inválidos independentemente de cupons de frete grátis
  const hasInvalidCep = () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasCompleteCep = cleanCep.length === 8

    // Só considera inválido se:
    // 1. CEP está completo
    // 2. Não está calculando
    // 3. O cálculo foi tentado e falhou (shippingCalculationFailed)
    // NOTA: Não verifica cupom de frete grátis - CEPs inválidos são sempre inválidos
    // NOTA: shippingFee pode ser 0 (frete grátis válido) ou null (CEP inválido)
    // Por isso verificamos shippingCalculationFailed para distinguir entre os casos
    return hasCompleteCep &&
      !calculatingShipping &&
      shippingCalculationFailed
  }

  // Valida se o endereço está completo e se há entrega disponível
  const isAddressValid = () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasCompleteCep = cleanCep.length === 8
    const hasRequiredFields = formData.address && formData.number && formData.city && formData.state && formData.cep

    // Se o CEP está completo mas não há frete disponível (e não está calculando), não é válido
    // IMPORTANTE: CEPs inválidos são sempre inválidos, mesmo com cupom de frete grátis
    if (hasInvalidCep()) {
      return false
    }

    return hasRequiredFields && hasCompleteCep
  }

  const canProceedToPayment = () => {
    // Não pode prosseguir se estiver processando
    if (creatingOrder) return false

    // Não pode prosseguir se estiver calculando frete
    if (calculatingShipping) return false

    // Não pode prosseguir se o CEP não tiver entrega disponível
    if (hasInvalidCep()) return false

    // Não pode prosseguir se o endereço não estiver válido
    if (!isAddressValid()) return false

    return true
  }

  const canUseSavedAddressId = () =>
    Boolean(selectedAddressId && !showNewAddressForm && editingAddressId !== selectedAddressId)

  const buildCreatePreferenceParams = () => {
    const base = {
      ...(isSubscription ? { subscriptionPlan } : {}),
      ...(shippingCost > 0 ? { shippingFee: shippingCost } : {}),
      paymentMethod: selectedPaymentMethod,
      ...(existingOrderId ? { orderId: existingOrderId } : {})
    }

    if (canUseSavedAddressId()) {
      return { ...base, addressId: selectedAddressId! }
    }

    return { ...base, shippingAddress: buildShippingAddress(formData) }
  }

  const handleContinueToPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Valida endereço
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      alert('Por favor, preencha todos os campos do endereço')
      return
    }

    // Valida se há entrega disponível
    if (hasInvalidCep()) {
      alert('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    } else if (!selectedAddressId && saveAddressToProfile) {
      // Auto-salvar novo endereço
      try {
        await addressService.createSavedAddress({
          nickname: newAddressNickname || 'Meu Endereço',
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement || undefined,
          city: formData.city,
          state: formData.state,
        })
        await loadAddresses()
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
    }

    setCheckoutStep(2)
  }

  const handleContinueWithSavedAddress = () => {
    if (!canProceedToPayment()) return
    setCheckoutStep(2)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (creatingOrder) return

    // Valida endereço
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      alert('Por favor, preencha todos os campos do endereço')
      return
    }

    // Valida se há entrega disponível
    // IMPORTANTE: CEPs inválidos são sempre inválidos, mesmo com cupom de frete grátis
    if (hasInvalidCep()) {
      alert('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    } else if (!selectedAddressId && saveAddressToProfile) {
      // Auto-salvar novo endereço
      try {
        await addressService.createSavedAddress({
          nickname: newAddressNickname || 'Meu Endereço',
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement || undefined,
          city: formData.city,
          state: formData.state,
        })
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
    }
    try {
      setCreatingOrder(true)
      setCheckoutError(null)

      // Se estiver editando um endereço salvo, salva as alterações primeiro
      if (editingAddressId && selectedAddressId) {
        await handleUpdateAddress()
      }

      const params = buildCreatePreferenceParams()

      const preference = await paymentService.createPreference(params as any)

      // Em vez de esvaziar o carrinho, salvamos o ID do pedido gerado
      if (preference.orderId) {
        setExistingOrderId(preference.orderId)
      }

      const pref = preference as any;
      // Se for cartão de crédito e já estiver pago, podemos esvaziar o carrinho
      if (preference.paymentMethod === 'credit_card' && pref.status !== 'FAILED' && pref.status !== 'PENDING_CARD_DETAILS') {
        await clearCart()
      }

      // Redireciona para a nova tela de cartão de crédito
      if (preference.paymentMethod === 'credit_card' && pref.status === 'PENDING_CARD_DETAILS') {
        setCreatingOrder(false)
        navigate(`/checkout/payment/card?orderId=${pref.orderId}`)
        return
      }

      // Define o resultado na tela
      setPaymentResult(preference)
      setCreatingOrder(false)

    } catch (error: any) {
      console.error('Erro ao criar preferência de pagamento:', error)
      setCheckoutError(error.message || 'Erro ao processar pagamento. Tente novamente.')
      setCreatingOrder(false)
    }
  }

  const handleCopyPix = () => {
    if (paymentResult?.pixPayload) {
      navigator.clipboard.writeText(paymentResult.pixPayload)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2000)
    }
  }

  const handleResetPayment = () => {
    // Invalidate the current payment attempt UI locally to allow selecting a new one.
    // The existing order context is kept since the cart is already empty.
    // Wait, if the cart is already empty, how do we recreate the payment?
    // We must pass the orderId to the new createPreference call if we want to reuse the order.
    // Let's assume we store the orderId in a state.
    setPaymentResult(null)
    setCheckoutError(null)
  }

  // Função para criar pedido sem pagamento (apenas para admins)
  const handleCreateOrderWithoutPayment = async () => {
    // Valida endereço
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      alert('Por favor, preencha todos os campos do endereço')
      return
    }

    // Valida se há entrega disponível
    // IMPORTANTE: CEPs inválidos são sempre inválidos, mesmo com cupom de frete grátis
    if (hasInvalidCep()) {
      alert('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    } else if (!selectedAddressId && saveAddressToProfile) {
      // Auto-salvar novo endereço
      try {
        await addressService.createSavedAddress({
          nickname: newAddressNickname || 'Meu Endereço',
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement || undefined,
          city: formData.city,
          state: formData.state,
        })
      } catch (err) {
        console.error('Erro ao auto-salvar endereço (ignorando):', err)
      }
    }

    try {
      setCreatingOrderWithoutPayment(true)
      setCheckoutError(null)

      const shippingAddress = buildShippingAddress(formData)

      // Cria pedido sem pagamento
      const order = await orderService.createOrderWithoutPayment(
        shippingAddress,
        isSubscription ? subscriptionPlan : undefined,
        shippingCost > 0 ? shippingCost : undefined
      )

      console.log('✅ Pedido criado sem pagamento:', order)

      // Esvazia o carrinho
      await clearCart()

      // Redireciona para a página de sucesso
      navigate(`/payment-success?order_id=${order.id}`)
    } catch (error: any) {
      console.error('Erro ao criar pedido sem pagamento:', error)
      setCheckoutError(error.message || 'Erro ao criar pedido. Tente novamente.')
      setCreatingOrderWithoutPayment(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-4" size={48} />
        <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
      </div>
    )
  }

  // Mostra loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Verificando autenticação...</p>
      </div>
    )
  }

  // Se já tivermos o resultado do pagamento, mostramos a tela de sucesso/instruções
  if (paymentResult) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Pedido Confirmado!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Seu pedido foi registrado com sucesso.</p>

          {/* Renderização condicional baseada no método */}
          {paymentResult.paymentMethod === 'pix' && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8 inline-block max-w-sm w-full border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Pague via PIX</h3>
              {timeLeft && (
                <div className="mb-4 inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 px-3 py-1.5 rounded-full text-sm font-semibold">
                  Expira em: {timeLeft}
                </div>
              )}
              <div className="bg-white p-2 rounded-lg inline-block mb-4">
                <img src={`data:image/png;base64,${paymentResult.pixQrCode}`} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Abra o app do seu banco, escolha PIX e aponte a câmera para o QR Code, ou copie a chave abaixo:
              </p>
              <div className="flex flex-col gap-2">
                <input type="text" readOnly value={paymentResult.pixPayload} className="w-full text-xs p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500" />
                <button onClick={handleCopyPix} className="btn-primary flex items-center justify-center gap-2 py-3">
                  <Copy size={16} />
                  {copiedPix ? 'Copiado!' : 'Copiar Código PIX'}
                </button>
                <button onClick={handleResetPayment} className="btn-secondary flex items-center justify-center gap-2 py-3 mt-2">
                  Trocar forma de pagamento
                </button>
              </div>
            </div>
          )}

          {paymentResult.paymentMethod === 'boleto' && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Boleto Gerado</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                O seu boleto foi gerado com sucesso. O pagamento pode demorar até 3 dias úteis para ser confirmado.
              </p>
              <div className="flex flex-col gap-2">
                <a href={paymentResult.bankSlipUrl} target="_blank" rel="noreferrer" className="btn-primary flex items-center justify-center gap-2 py-3 w-full sm:w-auto sm:px-8 mx-auto">
                  <Download size={16} />
                  Baixar Boleto
                </a>
                <button onClick={handleResetPayment} className="btn-secondary flex items-center justify-center gap-2 py-3 w-full sm:w-auto sm:px-8 mx-auto mt-2">
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

          {/* Fallback para redirect */}
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

  // Permite renderizar a tela de pagamento se houver um orderId gerado (mesmo se itens == 0)
  if (items.length === 0 && !existingOrderId) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-12 sm:py-16 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg mb-3 sm:mb-4">Seu carrinho está vazio.</p>
          <button onClick={() => navigate('/produtos')} className="btn-primary cursor-pointer text-sm sm:text-base px-4 sm:px-6 py-2">
            Ver Produtos
          </button>
        </div>
      </div>
    )
  }

  const selectedAddress = selectedAddressId ? savedAddresses.find(addr => addr.id === selectedAddressId) : null
  const isEditingSelected = editingAddressId === selectedAddressId

  const renderPaymentMethodSelector = () => (
    <CheckoutPayment
      selectedMethod={selectedPaymentMethod}
      onSelectMethod={(method) => setSelectedPaymentMethod(method)}
    />
  )

  const renderCheckoutActions = () => (
    <>
      {renderPaymentMethodSelector()}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 sm:mt-6 gap-2 sm:gap-3">
        {isAdmin && (
          <button
            type="button"
            onClick={handleCreateOrderWithoutPayment}
            className="text-xs px-2.5 sm:px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            disabled={!canProceedToPayment() || creatingOrderWithoutPayment || creatingOrder}
            title="Criar pedido sem pagamento (apenas para testes)"
          >
            {creatingOrderWithoutPayment ? (
              <>
                <Loader2 className="animate-spin" size={12} />
                Criando...
              </>
            ) : (
              <>
                <TestTube size={12} />
                Teste (sem pagamento)
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-4 sm:ml-auto"
          disabled={!canProceedToPayment() || creatingOrderWithoutPayment}
        >
          {creatingOrder ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              <span>Processando...</span>
            </>
          ) : (
            <span>{selectedPaymentMethod === 'credit_card' ? 'Continuar para Cartão' : 'Finalizar Compra'}</span>
          )}
        </button>
      </div>
    </>
  )

  return (
    <div className="bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-gray-900 min-h-screen pb-16 animate-fade-in">
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-7xl">

        {/* Modern Stepper header */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-start justify-between w-full max-w-lg relative">
            {/* Progress Bar Line Container */}
            <div className="absolute top-4 left-[16.667%] right-[16.667%] h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0">
              <div
                className={`h-full bg-gradient-to-r ${checkoutStep === 1 ? 'from-green-500 to-primary-600' : 'from-green-500 via-green-600 to-primary-600'} transition-all duration-500 ease-in-out`}
                style={{ width: `${checkoutStep === 1 ? 50 : 100}%` }}
              ></div>
            </div>

            {/* Step 1: Carrinho */}
            <div className="flex-1 flex flex-col items-center gap-1.5 z-10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-black text-xs shadow-md border-4 border-white dark:border-gray-900 transition-all duration-300">
                ✓
              </span>
              <span className="text-[11px] font-extrabold text-green-600 dark:text-green-400 uppercase tracking-wider text-center">Carrinho</span>
            </div>

            {/* Step 2: Endereço */}
            <div className="flex-1 flex flex-col items-center gap-1.5 z-10">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs transition-all duration-300 border-4 border-white dark:border-gray-900 ${checkoutStep === 1
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-green-600 text-white shadow-md'
                }`}>
                {checkoutStep > 1 ? '✓' : '2'}
              </span>
              <span className={`text-[11px] font-extrabold uppercase tracking-wider text-center ${checkoutStep === 1
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-green-600 dark:text-green-400'
                }`}>
                Entrega
              </span>
            </div>

            {/* Step 3: Confirmação */}
            <div className="flex-1 flex flex-col items-center gap-1.5 z-10">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs transition-all duration-300 border-4 border-white dark:border-gray-900 ${checkoutStep === 2
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-800'
                }`}>
                3
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider text-center ${checkoutStep === 2
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
                }`}>
                Confirmação
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card p-4 sm:p-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
                  <MapPin className="mr-2" size={20} />
                  Endereço de Entrega
                </h2>
                {checkoutError && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{checkoutError}</p>
                  </div>
                )}

                {checkoutStep === 1 ? (
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
                              className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer"
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
                              className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center cursor-pointer"
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
                                className={`p-4 sm:p-5 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md ${selectedAddressId === address.id
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
                                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
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
                              // Seleciona novamente um endereço ao cancelar
                              if (savedAddresses.length > 0) {
                                const defaultAddress = savedAddresses.find(addr => addr.is_default) || savedAddresses[0]
                                selectAddress(defaultAddress)
                              }
                            }}
                            className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-3 sm:mb-4 flex items-center cursor-pointer"
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
                              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${hasInvalidCep()
                                ? 'border-red-500 dark:border-red-400 text-red-600 dark:text-red-400'
                                : 'border-gray-300 dark:border-gray-700'
                                }`}
                            />
                            {calculatingShipping && (
                              <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={18} />
                              </div>
                            )}
                          </div>
                          {shippingMessage && isFreeShipping && !promoCodesValidation?.freeShipping && (
                            <div className="mt-2 text-sm flex items-center text-green-600 dark:text-green-400">
                              <Truck className="w-4 h-4 mr-1" />
                              {shippingMessage}
                            </div>
                          )}
                          {!isFreeShipping && shippingFee !== null && subtotal < freeShippingThreshold && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Adicione mais R$ {(freeShippingThreshold - subtotal).toFixed(2).replace('.', ',')} para ganhar frete grátis!
                            </div>
                          )}
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
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-lg cursor-not-allowed"
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
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-lg cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* Checkbox para Salvar Endereço (somente se logado e não for um endereço já salvo em edição) */}
                        {isAuthenticated && !selectedAddressId && (
                          <div className="mt-3 sm:mt-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="saveAddressToProfile"
                                id="saveAddressToProfile"
                                checked={saveAddressToProfile}
                                onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                                className="w-4.5 h-4.5 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500"
                              />
                              <label htmlFor="saveAddressToProfile" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                Salvar endereço na minha conta
                              </label>
                            </div>

                            {saveAddressToProfile && (
                              <div className="mt-2.5 sm:mt-3 pl-6">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  Identificação do Endereço (ex: Casa, Trabalho, Mãe) *
                                </label>
                                <input
                                  type="text"
                                  value={newAddressNickname}
                                  onChange={(e) => setNewAddressNickname(e.target.value)}
                                  required={saveAddressToProfile}
                                  placeholder="Ex: Casa, Trabalho, Mãe..."
                                  className="w-full sm:w-2/3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mensagem de CEP não atendido */}
                        {hasInvalidCep() && (
                          <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300">
                              ⚠️ Não entregamos para o CEP <strong>{formData.cep}</strong> no momento. Em breve estaremos por aí!
                            </p>
                          </div>
                        )}

                        {/* Botão de continuar - só aparece se o CEP for válido */}
                        {!hasInvalidCep() && (
                          <div className="flex flex-col sm:flex-row justify-end mt-4 sm:mt-6">
                            <button
                              type="submit"
                              className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-6"
                              disabled={!canProceedToPayment()}
                            >
                              Continuar
                            </button>
                          </div>
                        )}
                      </form>
                    )}

                    {/* Botão de continuar quando endereço salvo está selecionado (sem edição) */}
                    {!showNewAddressForm && selectedAddressId && !isEditingSelected && (
                      <div className="mt-4 sm:mt-6">
                        {/* Mensagem de CEP não atendido */}
                        {hasInvalidCep() && (
                          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300">
                              ⚠️ Não entregamos para o CEP <strong>{formData.cep}</strong> no momento. Em breve estaremos por aí!
                            </p>
                          </div>
                        )}
                        {/* Botão continuar */}
                        {!hasInvalidCep() && (
                          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={handleContinueWithSavedAddress}
                              className="btn-primary flex items-center justify-center cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-6"
                              disabled={!canProceedToPayment()}
                            >
                              Continuar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Passo 2: Pagamento */}
                    <div className="bg-gray-55 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                          <MapPin className="text-primary-600 dark:text-primary-400" size={16} />
                          Enviar para: {selectedAddressId ? savedAddresses.find(a => a.id === selectedAddressId)?.nickname || 'Endereço Selecionado' : 'Novo Endereço'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(1)}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Edit2 size={12} />
                          Alterar endereço
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 pl-5">
                        {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 pl-5">
                        {formData.bairro ? `${formData.bairro}, ` : ''}{formData.city} - {formData.state}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-5">
                        CEP: {formData.cep}
                      </p>
                    </div>

                    {renderCheckoutActions()}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-4 sm:p-6 sticky top-20 sm:top-24">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Resumo do Pedido</h2>
              <div className="space-y-2 mb-3 sm:mb-4">
                {items.map(item => {
                  const price = item.product?.price || 0
                  const itemTotal = price * item.quantity
                  const itemDiscountedPrice = isSubscription
                    ? itemTotal * (1 - subscriptionDiscount)
                    : itemTotal

                  return (
                    <div key={item.id} className="text-xs sm:text-sm">
                      <p className="font-medium dark:text-white line-clamp-2">
                        {item.product?.name}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Qtd: {item.quantity} × R$ {price.toFixed(2).replace('.', ',')}
                      </p>
                      {isSubscription && itemTotal !== itemDiscountedPrice && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 line-through">
                          R$ {itemTotal.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      {isSubscription && (
                        <p className="text-primary-600 dark:text-primary-400 font-semibold">
                          R$ {itemDiscountedPrice.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>

                {isSubscription && (
                  <div className="bg-primary-50 dark:bg-gray-800 rounded-lg p-2.5 sm:p-3 border border-primary-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs sm:text-sm font-semibold text-primary-700 dark:text-primary-400">Desconto Assinatura</span>
                      <span className="text-xs sm:text-sm font-bold text-primary-600 dark:text-primary-400">
                        -{subscriptionDiscount * 100}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {subscriptionPlan === 'quarterly' ? 'Plano Trimestral' : 'Plano Mensal'}
                    </p>
                  </div>
                )}

                {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {promoCodesValidation.promoCodes.length > 1
                        ? `Cupons (${promoCodesValidation.promoCodes.length})`
                        : 'Cupom'}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      - R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {/* Frete */}
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Frete
                  </span>
                  <div className="text-right">
                    {calculatingShipping ? (
                      <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={14} />
                    ) : hasInvalidCep() ? (
                      // CEP inválido - mostra apenas "Inválido" mesmo com cupom de frete grátis
                      <span className="text-red-600 dark:text-red-400 text-xs">Inválido</span>
                    ) : (promoCodesValidation?.freeShipping || isFreeShipping || isSubscription) ? (
                      // Frete grátis válido (CEP é válido)
                      <span className="text-green-600 dark:text-green-400 font-semibold text-xs sm:text-sm">
                        {isSubscription ? 'Grátis (Assinatura)' : promoCodesValidation?.freeShipping ? 'Grátis (cupom)' : 'Grátis'}
                      </span>
                    ) : shippingFee !== null ? (
                      <span className="text-gray-900 dark:text-white">R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
                    ) : formData.cep.length === 9 ? (
                      <span className="text-red-600 dark:text-red-400 text-xs">Não disponível</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-semibold dark:text-white">Total</span>
                  <div className="text-right">
                    {isSubscription && baseTotal !== subtotal && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-through mb-1">
                        R$ {baseTotal.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <span className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                      R$ {currentTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
                {isSubscription && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    {subscriptionPlan === 'quarterly' ? 'A cada 3 meses' : 'Por mês'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal para salvar endereço */}
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
              {showDeleteConfirmModal && (() => {
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
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteAddress(showDeleteConfirmModal)}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
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
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isDefault" className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-white">
                    Definir como endereço padrão
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setShowEditAddressModal(false)}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditAddress}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

