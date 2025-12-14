import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Loader2, Truck, Plus, Save, Edit2, Trash2, Check, Tag, User, Mail } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { paymentService } from '../services/payment.service'
import { shippingService } from '../services/shipping.service'
import { addressService, SavedAddress } from '../services/address.service'
import { promoCodesService, PromoCodeValidation, MultiplePromoCodesValidation } from '../services/promo-codes.service'
import { adminService } from '../services/admin.service'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  
  // Estados para endereços salvos
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [deliveryOption, setDeliveryOption] = useState<'saved' | 'new'>('saved')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [showSaveAddressModal, setShowSaveAddressModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<string | null>(null)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [editAddressData, setEditAddressData] = useState<SavedAddress | null>(null)
  const nicknameInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: ''
  })
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [isFreeShipping, setIsFreeShipping] = useState(false)
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [shippingMessage, setShippingMessage] = useState<string | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0)
  
  // Estados para códigos promocionais (carregados do carrinho)
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<string[]>([])
  const [promoCodesValidation, setPromoCodesValidation] = useState<MultiplePromoCodesValidation | null>(null)
  
  // Carrega cupons do localStorage (aplicados no carrinho)
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

  // Verifica se o carrinho tem assinatura e obtém o plano
  const isSubscription = items.length > 0 && items.some(item => item.purchaseType === 'subscription')
  
  // Obtém o plano de assinatura do localStorage (salvo no carrinho)
  useEffect(() => {
    if (isSubscription) {
      const savedPlan = localStorage.getItem('subscription_plan') as 'monthly' | 'quarterly' | null
      if (savedPlan) {
        setSubscriptionPlan(savedPlan)
      }
    }
  }, [isSubscription])


  // Calcula totais com desconto de assinatura
  const baseTotal = getTotal()
  const subscriptionDiscount = isSubscription ? (subscriptionPlan === 'quarterly' ? 0.15 : 0.10) : 0
  const discountedTotal = baseTotal * (1 - subscriptionDiscount)
  const subtotal = isSubscription ? discountedTotal : baseTotal
  const promoCodeDiscount = promoCodesValidation?.totalDiscount || 0
  const subtotalAfterPromo = subtotal - promoCodeDiscount
  // Verifica se há frete grátis (por cupom ou valor mínimo válido)
  const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
  const hasFreeShippingByThreshold = isFreeShipping && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold
  const hasFreeShipping = hasFreeShippingByCoupon || hasFreeShippingByThreshold
  const shippingCost = hasFreeShipping ? 0 : (shippingFee && !isFreeShipping ? shippingFee : 0)
  const currentTotal = subtotalAfterPromo + shippingCost

  // Redireciona se não estiver autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // Carrega endereços salvos
  const loadAddresses = async () => {
    if (!isAuthenticated) return
    
    try {
      setLoadingAddresses(true)
      const addresses = await addressService.getSavedAddresses()
      setSavedAddresses(addresses)
      
      // Se houver endereço padrão e nenhum selecionado, seleciona automaticamente
      if (!selectedAddressId && deliveryOption === 'saved') {
        const defaultAddress = addresses.find(addr => addr.is_default)
        if (defaultAddress) {
          selectAddress(defaultAddress)
          setSelectedAddressId(defaultAddress.id)
        } else if (addresses.length > 0) {
          selectAddress(addresses[0])
          setSelectedAddressId(addresses[0].id)
        }
      }
      
      // Se não houver endereços salvos, mostra formulário novo
      if (addresses.length === 0) {
        setDeliveryOption('new')
      }
    } catch (error: any) {
      console.error('Erro ao carregar endereços:', error)
      // Se não houver endereços, mostra formulário novo
      if (savedAddresses.length === 0) {
        setDeliveryOption('new')
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
    setDeliveryOption('saved')
    setFormData({
      cep: address.cep,
      address: address.address,
      number: address.number,
      complement: address.complement || '',
      city: address.city,
      state: address.state
    })
  }

  // Função para calcular frete manualmente
  const handleCalculateShipping = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    
    if (cleanCep.length === 8) {
      try {
        setCalculatingShipping(true)
        setShippingMessage(null)
        
        const cartItems = items
          .filter(item => item.product)
          .map(item => ({
            product_id: item.product!.id,
            quantity: item.quantity,
          }))
        
        const result = await shippingService.calculateShipping(
          formData.cep, 
          subtotal,
          cartItems
        )
        
        setShippingFee(result.shippingFee)
        setIsFreeShipping(result.isFreeShipping)
        setFreeShippingThreshold(result.freeShippingThreshold || 0)
        setShippingMessage(result.message)
      } catch (error: any) {
        console.error('Erro ao calcular frete:', error)
        setShippingFee(null)
        setIsFreeShipping(false)
        setShippingMessage('Erro ao calcular frete. Tente novamente.')
      } finally {
        setCalculatingShipping(false)
      }
    }
  }

  // Calcula frete quando o CEP é preenchido
  useEffect(() => {
    const calculateShipping = async () => {
      const cleanCep = formData.cep.replace(/\D/g, '')
      
      if (cleanCep.length === 8) {
        try {
          setCalculatingShipping(true)
          setShippingMessage(null)
          
          // Prepara itens do carrinho para envio
          const cartItems = items
            .filter(item => item.product) // Apenas produtos (não customMedication)
            .map(item => ({
              product_id: item.product!.id,
              quantity: item.quantity,
            }))
          
          const result = await shippingService.calculateShipping(
            formData.cep, 
            subtotal,
            cartItems
          )
          
          setShippingFee(result.shippingFee)
          setIsFreeShipping(result.isFreeShipping)
          setFreeShippingThreshold(result.freeShippingThreshold || 0)
          setShippingMessage(result.message)
        } catch (error: any) {
          console.error('Erro ao calcular frete:', error)
          setShippingFee(null)
          setIsFreeShipping(false)
          setShippingMessage('Erro ao calcular frete. Tente novamente.')
        } finally {
          setCalculatingShipping(false)
        }
      } else {
        // Limpa valores se CEP não estiver completo
        setShippingFee(null)
        setIsFreeShipping(false)
        setShippingMessage(null)
      }
    }

    // Debounce de 2 segundos para evitar CEPs incorretos e registrar apenas tentativas válidas
    const timeoutId = setTimeout(calculateShipping, 2000)
    return () => clearTimeout(timeoutId)
  }, [formData.cep, subtotal, items])

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
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Se estiver editando um endereço salvo, marca como editando
    if (selectedAddressId && !editingAddressId) {
      setEditingAddressId(selectedAddressId)
    }
  }

  const handleSaveAddress = async (nickname: string) => {
    try {
      await addressService.createSavedAddress({
        nickname,
        cep: formData.cep,
        address: formData.address,
        number: formData.number,
        complement: formData.complement || undefined,
        city: formData.city,
        state: formData.state,
      })
      
      await loadAddresses()
      setShowSaveAddressModal(false)
      
      // Seleciona o endereço recém-criado
      const addresses = await addressService.getSavedAddresses()
      const newAddress = addresses.find(addr => addr.nickname === nickname)
      if (newAddress) {
        selectAddress(newAddress)
      }
    } catch (error: any) {
      console.error('Erro ao salvar endereço:', error)
      alert('Erro ao salvar endereço: ' + (error.message || 'Erro desconhecido'))
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

  // Verifica se há frete grátis dos cupons aplicados no carrinho
  useEffect(() => {
    if (promoCodesValidation?.freeShipping && formData.cep) {
        setIsFreeShipping(true)
        setShippingFee(0)
        setShippingMessage('Frete grátis aplicado pelo(s) código(s) promocional(is)!')
    } else if (promoCodesValidation && !promoCodesValidation.freeShipping && formData.cep) {
      setIsFreeShipping(false)
        const cleanCep = formData.cep.replace(/\D/g, '')
        if (cleanCep.length === 8) {
          handleCalculateShipping()
        }
      }
  }, [promoCodesValidation, formData.cep])

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
          city: '',
          state: ''
        })
      }
    } catch (error: any) {
      console.error('Erro ao remover endereço:', error)
      alert('Erro ao remover endereço: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Valida se o frete está disponível para o CEP informado
    const cleanCep = formData.cep.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      // Se o CEP está completo, verifica se o frete está disponível
      if (shippingFee === null && shippingMessage && shippingMessage.includes('não estamos enviando')) {
        alert('Infelizmente, no momento não estamos enviando para esse local. Mas logo mais estaremos trazendo mais localidades!')
        return
      }
      // Se ainda está calculando, aguarda
      if (calculatingShipping) {
        alert('Aguarde o cálculo do frete ser concluído')
        return
      }
      // Se o CEP está completo mas não há frete calculado e não há mensagem de erro, força recálculo
      if (shippingFee === null && !shippingMessage && !calculatingShipping) {
        alert('Por favor, aguarde o cálculo do frete ou verifique se o CEP está correto')
        return
      }
    }
    
    // Valida endereço baseado na opção selecionada
    if (deliveryOption === 'new') {
      if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
        alert('Por favor, preencha todos os campos do endereço')
        return
      }
      
      // Se checkbox estiver marcado, salva o endereço
      if (saveNewAddress) {
        try {
          await addressService.createSavedAddress({
            nickname: `Endereço ${new Date().toLocaleDateString()}`,
            cep: formData.cep,
            address: formData.address,
            number: formData.number,
            complement: formData.complement || undefined,
            city: formData.city,
            state: formData.state,
          })
        } catch (error: any) {
          console.error('Erro ao salvar endereço:', error)
          // Continua mesmo se falhar ao salvar
        }
      }
    } else if (deliveryOption === 'saved') {
      if (!selectedAddressId || !selectedAddress) {
        alert('Por favor, selecione um endereço')
        return
      }
      // Usa dados do endereço selecionado
      setFormData({
        cep: selectedAddress.cep,
        address: selectedAddress.address,
        number: selectedAddress.number,
        complement: selectedAddress.complement || '',
        city: selectedAddress.city,
        state: selectedAddress.state
      })
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    }

    try {
      setCreatingOrder(true)
      setCheckoutError(null)

      // Monta endereço completo
      const shippingAddress = `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.city} - ${formData.state}, CEP: ${formData.cep}`

      // Cria preferência de pagamento ou assinatura no Mercado Pago
      const preference = await paymentService.createPreference(
        shippingAddress,
        undefined,
        isSubscription ? subscriptionPlan : undefined,
        shippingCost > 0 ? shippingCost : undefined
      )

      console.log('✅ Preferência criada:', preference)

      // Garante que temos a URL do checkout hospedado do Mercado Pago
      if (!preference.initPoint) {
        throw new Error('Não foi possível obter a URL do checkout do Mercado Pago.')
      }

      // Valida se a URL é válida
      if (!preference.initPoint || !preference.initPoint.startsWith('http')) {
        throw new Error('URL de checkout inválida recebida do Mercado Pago')
      }

      console.log('🔗 Redirecionando para:', preference.initPoint)

      // Redireciona diretamente para a tela de checkout do Mercado Pago (Checkout Pro)
      window.location.href = preference.initPoint
    } catch (error: any) {
      console.error('Erro ao criar preferência de pagamento:', error)
      setCheckoutError(error.message || 'Erro ao processar pagamento. Tente novamente.')
      setCreatingOrder(false)
    }
  }

  // Função para pagar como admin (sem passar pelo Mercado Pago)
  const handlePayAsAdmin = async () => {
    // Valida se o frete está disponível para o CEP informado
    const cleanCep = formData.cep.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      if (shippingFee === null && shippingMessage && shippingMessage.includes('não estamos enviando')) {
        alert('Infelizmente, no momento não estamos enviando para esse local. Mas logo mais estaremos trazendo mais localidades!')
        return
      }
      if (calculatingShipping) {
        alert('Aguarde o cálculo do frete ser concluído')
        return
      }
    }
    
    // Valida endereço baseado na opção selecionada
    if (deliveryOption === 'new') {
      if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
        alert('Por favor, preencha todos os campos do endereço')
        return
      }
      
      // Se checkbox estiver marcado, salva o endereço
      if (saveNewAddress) {
        try {
          await addressService.createSavedAddress({
            nickname: `Endereço ${new Date().toLocaleDateString()}`,
            cep: formData.cep,
            address: formData.address,
            number: formData.number,
            complement: formData.complement || undefined,
            city: formData.city,
            state: formData.state,
          })
        } catch (error: any) {
          console.error('Erro ao salvar endereço:', error)
        }
      }
    } else if (deliveryOption === 'saved') {
      if (!selectedAddressId || !selectedAddress) {
        alert('Por favor, selecione um endereço')
        return
      }
      setFormData({
        cep: selectedAddress.cep,
        address: selectedAddress.address,
        number: selectedAddress.number,
        complement: selectedAddress.complement || '',
        city: selectedAddress.city,
        state: selectedAddress.state
      })
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    }

    try {
      setCreatingOrder(true)
      setCheckoutError(null)

      // Monta endereço completo
      const shippingAddress = `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.city} - ${formData.state}, CEP: ${formData.cep}`

      // Cria pedido e marca como pago diretamente
      const result = await adminService.createOrderAsPaid(
        shippingAddress,
        isSubscription ? subscriptionPlan : undefined
      )

      console.log('✅ Pedido criado e marcado como pago (admin):', result)

      // Limpa o carrinho
      await clearCart()

      // Redireciona para página de sucesso
      navigate(`/checkout/success?orderId=${result.orderId}${result.isSubscription ? `&subscriptionId=${result.subscriptionId}` : ''}`)
    } catch (error: any) {
      console.error('Erro ao criar pedido como pago:', error)
      setCheckoutError(error.message || 'Erro ao processar pagamento como admin. Tente novamente.')
      setCreatingOrder(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="animate-spin mx-auto text-primary-600 mb-4" size={48} />
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 text-lg mb-4">Seu carrinho está vazio.</p>
        <button onClick={() => navigate('/produtos')} className="btn-primary">
          Ver Produtos
        </button>
      </div>
    )
  }

  const selectedAddress = selectedAddressId ? savedAddresses.find(addr => addr.id === selectedAddressId) : null
  const isEditingSelected = editingAddressId === selectedAddressId

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-5">Finalizar Compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form - Escolha de endereço */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Escolha a forma de entrega
              </h2>
              {checkoutError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{checkoutError}</p>
                </div>
              )}

              {/* Opções de Entrega com Radio Buttons (estilo Mercado Livre) */}
              <div className="space-y-4">
                {/* Endereços Salvos */}
                {loadingAddresses ? (
                  <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-primary-600 mb-2" size={24} />
                  <p className="text-gray-600">Carregando endereços...</p>
                </div>
                ) : (
                  <>
                    {savedAddresses.map((address) => {
                      const isSelected = deliveryOption === 'saved' && selectedAddressId === address.id
                      return (
                      <div
                        key={address.id}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected
                            ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setDeliveryOption('saved')
                            selectAddress(address)
                            setSelectedAddressId(address.id)
                            setEditingAddressId(null)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="deliveryOption"
                              checked={isSelected}
                              onChange={() => {
                                setDeliveryOption('saved')
                                selectAddress(address)
                                setSelectedAddressId(address.id)
                                setEditingAddressId(null)
                              }}
                              className="mt-1 w-4 h-4 text-primary-600"
                            />
                          <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-gray-900">Enviar no meu endereço</span>
                                {(promoCodesValidation?.freeShipping || isFreeShipping) ? (
                                  <span className="text-green-600 font-medium text-sm">Grátis</span>
                                ) : shippingFee !== null ? (
                                  <span className="text-gray-900 text-sm">R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
                                ) : null}
                            </div>
                            <p className="text-sm text-gray-600">
                              {address.address}, {address.number}
                              {address.complement && ` - ${address.complement}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.city} - {address.state}, CEP: {address.cep}
                            </p>
                              {address.nickname && (
                                <p className="text-xs text-gray-500 mt-1">{address.nickname}</p>
                              )}
                              {isSelected && (
                            <button
                                  type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                    setShowEditAddressModal(true)
                                    setEditAddressData(address)
                              }}
                                  className="text-sm text-primary-600 hover:text-primary-700 mt-2"
                            >
                                  Alterar ou escolher outro endereço
                            </button>
                              )}
                          </div>
                        </div>
                      </div>
                      )
                    })}

                    {/* Opção: Novo Endereço */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        deliveryOption === 'new'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setDeliveryOption('new')
                        setSelectedAddressId(null)
                        setEditingAddressId(null)
                        // Limpa o frete quando muda para novo endereço e CEP está vazio
                        setShippingFee(null)
                        setIsFreeShipping(false)
                        setShippingMessage(null)
                        setFormData({
                          cep: '',
                          address: '',
                          number: '',
                          complement: '',
                          city: '',
                          state: ''
                        })
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="deliveryOption"
                          checked={deliveryOption === 'new'}
                          onChange={() => {
                            setDeliveryOption('new')
                            setSelectedAddressId(null)
                            setEditingAddressId(null)
                            // Limpa o frete quando muda para novo endereço e CEP está vazio
                            setShippingFee(null)
                            setIsFreeShipping(false)
                            setShippingMessage(null)
                            setFormData({
                              cep: '',
                              address: '',
                              number: '',
                              complement: '',
                              city: '',
                              state: ''
                            })
                          }}
                          className="mt-1 w-4 h-4 text-primary-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">Novo endereço</span>
                            {/* Só mostra frete se deliveryOption for 'new', CEP estiver completo (9 caracteres) E frete foi calculado */}
                            {deliveryOption === 'new' && formData.cep.length === 9 && (
                              (promoCodesValidation?.freeShipping || isFreeShipping) ? (
                                <span className="text-green-600 font-medium text-sm">Grátis</span>
                              ) : shippingFee !== null ? (
                                <span className="text-gray-900 text-sm">R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
                              ) : null
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Preencha um novo endereço de entrega
                      </p>
                    </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Formulário de Novo Endereço */}
                {deliveryOption === 'new' && (
                  <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">

                  {/* Grupo 1: Localização */}
                  <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {calculatingShipping && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="animate-spin text-primary-600" size={20} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Endereço *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      placeholder="Rua, Avenida, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  </div>

                  {/* Grupo 2: Detalhes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Número *
                      </label>
                      <input
                        type="text"
                        name="number"
                        value={formData.number}
                        onChange={handleInputChange}
                        required
                        placeholder="123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        name="complement"
                        value={formData.complement}
                        onChange={handleInputChange}
                        placeholder="Apto, Bloco, etc."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Grupo 3: Região */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        placeholder="São Paulo"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Estado *
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        placeholder="SP"
                        maxLength={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                    {/* Checkbox para salvar endereço */}
                    {formData.cep && formData.address && formData.number && formData.city && formData.state && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveNewAddress}
                            onChange={(e) => setSaveNewAddress(e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm text-gray-700">
                        Salvar este endereço para entregas futuras
                          </span>
                        </label>
                    </div>
                  )}
                </form>
              )}

                {/* Botão Continuar */}
                <div className="mt-6">
                  <button 
                    onClick={() => handleSubmit()}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      creatingOrder || 
                      (deliveryOption === 'saved' && !selectedAddressId) || 
                      (deliveryOption === 'new' && (!formData.cep || !formData.address || !formData.number || !formData.city || !formData.state)) ||
                      calculatingShipping ||
                      (formData.cep.replace(/\D/g, '').length === 8 && shippingFee === null && shippingMessage && shippingMessage.includes('não estamos enviando'))
                    }
                  >
                    {creatingOrder ? (
                      <>
                        <Loader2 className="animate-spin mr-2 inline" size={20} />
                        Processando...
                      </>
                    ) : (
                      'Continuar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Order Summary - Resumo simplificado (estilo Mercado Livre) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Resumo da compra
            </h2>

            <div className="space-y-4">
              {/* Produtos */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Produtos ({items.length})
                    </span>
                <div className="text-right">
                  {isSubscription && baseTotal !== subtotal && (
                    <p className="text-xs text-gray-400 line-through mb-0.5">
                      R$ {baseTotal.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <span className="font-medium text-gray-900">
                    R$ {subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              
              {/* Frete */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Frete</span>
                <div className="text-right">
                  {calculatingShipping ? (
                    <Loader2 className="animate-spin text-gray-400 inline" size={14} />
                  ) : (promoCodesValidation?.freeShipping || (isFreeShipping && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold)) ? (
                    <span className="text-green-600 font-medium">Grátis</span>
                  ) : shippingFee !== null ? (
                    <span className="text-gray-900">R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
                  ) : formData.cep.length === 9 ? (
                    <span className="text-red-500 text-xs">Não disponível</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
              
              {/* Mensagem de frete não disponível */}
              {shippingFee === null && shippingMessage && shippingMessage.includes('não estamos enviando') && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    {shippingMessage}
                  </p>
                </div>
              )}
              
              {/* Motivo do frete grátis */}
              {(promoCodesValidation?.freeShipping || (isFreeShipping && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold)) && (
                <div className="text-xs text-green-600 mt-1 mb-2">
                  {promoCodesValidation?.freeShipping ? (
                    <span>Frete grátis por cupom promocional</span>
                  ) : isFreeShipping && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? (
                    <span>Frete grátis para pedidos acima de R$ {freeShippingThreshold.toFixed(2).replace('.', ',')}</span>
                  ) : null}
                </div>
              )}

              {/* Cupons */}
              {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {promoCodesValidation.promoCodes.length > 1 
                      ? `Cupons (${promoCodesValidation.promoCodes.length})`
                      : 'Cupom'}
                  </span>
                  <span className="text-green-600 font-medium">
                    - R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">
                    R$ {currentTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

              {/* Botão de Pagamento como Admin */}
              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handlePayAsAdmin}
                    disabled={creatingOrder || 
                      (deliveryOption === 'saved' && !selectedAddressId) || 
                      (deliveryOption === 'new' && (!formData.cep || !formData.address || !formData.number || !formData.city || !formData.state)) ||
                      calculatingShipping ||
                      (formData.cep.replace(/\D/g, '').length === 8 && shippingFee === null && shippingMessage && shippingMessage.includes('não estamos enviando'))
                    }
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creatingOrder ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Pagar como Admin (Sem Mercado Pago)
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Este botão só aparece para administradores. O pedido será marcado como pago automaticamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSaveAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSaveAddressModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Salvar Endereço</h3>
              <button onClick={() => setShowSaveAddressModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Dê um apelido para este endereço para facilitar nas próximas compras (ex: Casa, Trabalho, etc.)
            </p>
            <input
              ref={nicknameInputRef}
              type="text"
              placeholder="Ex: Casa, Trabalho, Escritório..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const input = e.target as HTMLInputElement
                  if (input.value.trim()) {
                    handleSaveAddress(input.value.trim())
                  }
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSaveAddressModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = nicknameInputRef.current
                  if (input?.value.trim()) {
                    handleSaveAddress(input.value.trim())
                  } else {
                    alert('Por favor, digite um apelido para o endereço')
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirmModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
              <button onClick={() => setShowDeleteConfirmModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </p>
            {showDeleteConfirmModal && (() => {
              const addressToDelete = savedAddresses.find(addr => addr.id === showDeleteConfirmModal)
              return addressToDelete && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">{addressToDelete.nickname}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {addressToDelete.address}, {addressToDelete.number}
                    {addressToDelete.complement && ` - ${addressToDelete.complement}`}
                  </p>
                  <p className="text-xs text-gray-600">
                    {addressToDelete.city} - {addressToDelete.state}, CEP: {addressToDelete.cep}
                  </p>
                </div>
              )
            })()}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteAddress(showDeleteConfirmModal)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar endereço */}
      {showEditAddressModal && editAddressData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditAddressModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Editar Endereço</h3>
              <button onClick={() => setShowEditAddressModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apelido *
                </label>
                <input
                  type="text"
                  value={editAddressData.nickname}
                  onChange={(e) => setEditAddressData({ ...editAddressData, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Casa, Trabalho..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={editAddressData.address}
                  onChange={(e) => setEditAddressData({ ...editAddressData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.number}
                    onChange={(e) => setEditAddressData({ ...editAddressData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={editAddressData.complement || ''}
                    onChange={(e) => setEditAddressData({ ...editAddressData, complement: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.city}
                    onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.state}
                    onChange={(e) => setEditAddressData({ ...editAddressData, state: e.target.value.toUpperCase().substring(0, 2) })}
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                  Definir como endereço padrão
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditAddressModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditAddress}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

