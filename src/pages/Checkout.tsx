import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Loader2, Truck, Plus, Save, Edit2, Trash2, Check, X, TestTube } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { paymentService } from '../services/payment.service'
import { shippingService } from '../services/shipping.service'
import { addressService, SavedAddress } from '../services/address.service'
import { orderService } from '../services/order.service'
import { MultiplePromoCodesValidation } from '../services/promo-codes.service'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, getTotal } = useCart()
  const { user, isAuthenticated, isAdmin } = useAuth()
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [creatingOrderWithoutPayment, setCreatingOrderWithoutPayment] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  
  // Estados para endereços salvos
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
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
  
  // Estados para códigos promocionais (aplicados no carrinho)
  const [promoCodesValidation, setPromoCodesValidation] = useState<MultiplePromoCodesValidation | null>(null)
  
  // Carrega códigos promocionais aplicados no carrinho (se houver)
  useEffect(() => {
    const savedPromoCodesValidation = localStorage.getItem('cart_promo_codes_validation')
    
    if (savedPromoCodesValidation) {
      try {
        const validation = JSON.parse(savedPromoCodesValidation)
        setPromoCodesValidation(validation)
        
        // Aplica frete grátis se o código promocional oferecer
        if (validation.freeShipping) {
          setIsFreeShipping(true)
          setShippingFee(0)
        }
      } catch (error) {
        console.error('Erro ao carregar códigos promocionais:', error)
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
  const shippingCost = (promoCodesValidation?.freeShipping || isFreeShipping) ? 0 : (shippingFee && !isFreeShipping ? shippingFee : 0)
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
      if (!selectedAddressId && !showNewAddressForm) {
        const defaultAddress = addresses.find(addr => addr.is_default)
        if (defaultAddress) {
          selectAddress(defaultAddress)
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar endereços:', error)
      // Se não houver endereços, mostra formulário novo
      if (savedAddresses.length === 0) {
        setShowNewAddressForm(true)
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

    // Debounce para evitar muitas chamadas
    const timeoutId = setTimeout(calculateShipping, 500)
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

  // Verifica se o CEP não tem entrega disponível
  const hasInvalidCep = () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasCompleteCep = cleanCep.length === 8
    const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
    
    return hasCompleteCep && 
           !calculatingShipping && 
           shippingFee === null && 
           !isFreeShipping && 
           !hasFreeShippingByCoupon
  }

  // Valida se o endereço está completo e se há entrega disponível
  const isAddressValid = () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasCompleteCep = cleanCep.length === 8
    const hasRequiredFields = formData.address && formData.number && formData.city && formData.state && formData.cep
    
    // Se o CEP está completo mas não há frete disponível (e não está calculando), não é válido
    // Exceto se houver frete grátis por cupom promocional
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Valida endereço
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      alert('Por favor, preencha todos os campos do endereço')
      return
    }

    // Valida se há entrega disponível
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
    if (cleanCep.length === 8 && shippingFee === null && !isFreeShipping && !hasFreeShippingByCoupon) {
      alert('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
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

  // Função para criar pedido sem pagamento (apenas para admins)
  const handleCreateOrderWithoutPayment = async () => {
    // Valida endereço
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      alert('Por favor, preencha todos os campos do endereço')
      return
    }

    // Valida se há entrega disponível
    const cleanCep = formData.cep.replace(/\D/g, '')
    const hasFreeShippingByCoupon = promoCodesValidation?.freeShipping || false
    if (cleanCep.length === 8 && shippingFee === null && !isFreeShipping && !hasFreeShippingByCoupon) {
      alert('Infelizmente, não estamos enviando para este CEP no momento. Por favor, verifique o endereço ou entre em contato conosco.')
      return
    }

    // Se estiver editando um endereço salvo, salva as alterações primeiro
    if (editingAddressId && selectedAddressId) {
      await handleUpdateAddress()
    }

    try {
      setCreatingOrderWithoutPayment(true)
      setCheckoutError(null)

      // Monta endereço completo
      const shippingAddress = `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.city} - ${formData.state}, CEP: ${formData.cep}`

      // Cria pedido sem pagamento
      const order = await orderService.createOrderWithoutPayment(
        shippingAddress,
        isSubscription ? subscriptionPlan : undefined,
        shippingCost > 0 ? shippingCost : undefined
      )

      console.log('✅ Pedido criado sem pagamento:', order)

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

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">Seu carrinho está vazio.</p>
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
        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Voltar
      </button>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Finalizar Compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <MapPin className="mr-2" size={24} />
                Endereço de Entrega
              </h2>
              {checkoutError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400">{checkoutError}</p>
                </div>
              )}

              {/* Lista de Endereços Salvos */}
              {!showNewAddressForm && loadingAddresses && (
                <div className="mb-6 text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-2" size={24} />
                  <p className="text-gray-600 dark:text-gray-300">Carregando endereços...</p>
                </div>
              )}

              {!showNewAddressForm && !loadingAddresses && savedAddresses.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Endereços Salvos</h3>
                    <button
                      onClick={() => {
                        setShowNewAddressForm(true)
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
                      }}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Novo Endereço
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {savedAddresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => selectAddress(address)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-[#065084]'
                            : 'border-gray-200 dark:border-[#0F828C] hover:border-primary-300 dark:hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-[#065084]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="font-semibold text-gray-900 dark:text-white mr-2">{address.nickname}</span>
                              {address.is_default && (
                                <span className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded">
                                  Padrão
                                </span>
                              )}
                              {selectedAddressId === address.id && (
                                <Check className="w-5 h-5 text-primary-600 dark:text-primary-400 ml-2" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {address.address}, {address.number}
                              {address.complement && ` - ${address.complement}`}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {address.city} - {address.state}, CEP: {address.cep}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => handleEditAddress(address, e)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1"
                              title="Editar endereço"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowDeleteConfirmModal(address.id)
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                              title="Remover endereço"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulário de Endereço (Novo ou Editando) */}
              {(showNewAddressForm || savedAddresses.length === 0 || (selectedAddressId && isEditingSelected)) && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {savedAddresses.length > 0 && !isEditingSelected && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddressForm(false)
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
                      }}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-4 flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Voltar para endereços salvos
                    </button>
                  )}

                  {isEditingSelected && selectedAddress && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Editando:</strong> {selectedAddress.nickname}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        As alterações serão salvas automaticamente ao finalizar a compra
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
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
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white ${
                          formData.cep.replace(/\D/g, '').length === 8 && 
                          !calculatingShipping && 
                          shippingFee === null && 
                          !isFreeShipping && 
                          !promoCodesValidation?.freeShipping
                            ? 'border-red-500 dark:border-red-400 text-red-600 dark:text-red-400' 
                            : 'border-gray-300 dark:border-[#0F828C]'
                        }`}
                      />
                      {calculatingShipping && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={20} />
                        </div>
                      )}
                    </div>
                    {shippingMessage && isFreeShipping && !promoCodesValidation?.freeShipping && (
                      <div className="mt-2 text-sm flex items-center text-green-600 dark:text-green-400">
                        <Truck className="w-4 h-4 mr-1" />
                        {shippingMessage}
                      </div>
                    )}
                    {shippingMessage && !isFreeShipping && shippingFee !== null && (
                      <div className="mt-2 text-sm flex items-center text-gray-600 dark:text-gray-300">
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                      Endereço *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      placeholder="Rua, Avenida, etc."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                        Número *
                      </label>
                      <input
                        type="text"
                        name="number"
                        value={formData.number}
                        onChange={handleInputChange}
                        required
                        placeholder="123"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        name="complement"
                        value={formData.complement}
                        onChange={handleInputChange}
                        placeholder="Apto, Bloco, etc."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        placeholder="São Paulo"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Botão para salvar endereço (apenas se for novo) */}
                  {!isEditingSelected && formData.cep && formData.address && formData.number && formData.city && formData.state && (
                    <div className="pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setShowSaveAddressModal(true)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Salvar este endereço para entregas futuras
                      </button>
                    </div>
                  )}

                  {/* Mensagem de CEP não atendido */}
                  {hasInvalidCep() && (
                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-800 dark:text-orange-300">
                        ⚠️ Não entregamos para o CEP <strong>{formData.cep}</strong> no momento. Em breve estaremos por aí!
                      </p>
                    </div>
                  )}

                  {/* Botão de continuar - só aparece se o CEP for válido */}
                  {!hasInvalidCep() && (
                    <div className="flex justify-between items-center mt-6 gap-3">
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={handleCreateOrderWithoutPayment}
                          className="text-xs px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                          disabled={!canProceedToPayment() || creatingOrderWithoutPayment}
                          title="Criar pedido sem pagamento (apenas para testes)"
                        >
                          {creatingOrderWithoutPayment ? (
                            <>
                              <Loader2 className="animate-spin" size={14} />
                              Criando...
                            </>
                          ) : (
                            <>
                              <TestTube size={14} />
                              Teste (sem pagamento)
                            </>
                          )}
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="btn-primary ml-auto flex items-center"
                        disabled={!canProceedToPayment() || creatingOrderWithoutPayment}
                      >
                        {creatingOrder ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={20} />
                            Processando e redirecionando para o Mercado Pago...
                          </>
                        ) : (
                          'Continuar para o Pagamento no Mercado Pago'
                        )}
                      </button>
                    </div>
                  )}
                </form>
              )}

              {/* Botão de continuar quando endereço salvo está selecionado (sem edição) */}
              {!showNewAddressForm && selectedAddressId && !isEditingSelected && (
                <div className="mt-6">
                  {/* Mensagem de CEP não atendido */}
                  {hasInvalidCep() && (
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-800 dark:text-orange-300">
                        ⚠️ Não entregamos para o CEP <strong>{formData.cep}</strong> no momento. Em breve estaremos por aí!
                      </p>
                    </div>
                  )}
                  {/* Botão de continuar - só aparece se o CEP for válido */}
                  {!hasInvalidCep() && (
                    <div className="flex gap-3">
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={handleCreateOrderWithoutPayment}
                          className="text-xs px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                          disabled={!canProceedToPayment() || creatingOrderWithoutPayment}
                          title="Criar pedido sem pagamento (apenas para testes)"
                        >
                          {creatingOrderWithoutPayment ? (
                            <>
                              <Loader2 className="animate-spin" size={14} />
                              Criando...
                            </>
                          ) : (
                            <>
                              <TestTube size={14} />
                              Teste (sem pagamento)
                            </>
                          )}
                        </button>
                      )}
                      <button 
                        onClick={() => handleSubmit()}
                        className="btn-primary flex-1 flex items-center justify-center"
                        disabled={!canProceedToPayment() || creatingOrderWithoutPayment}
                      >
                        {creatingOrder ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={20} />
                            Processando e redirecionando para o Mercado Pago...
                          </>
                        ) : (
                          'Continuar para o Pagamento no Mercado Pago'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Resumo do Pedido</h2>
            <div className="space-y-2 mb-4">
              {items.map(item => {
                const price = item.product?.price || item.customMedication?.price || 0
                const itemTotal = price * item.quantity
                const itemDiscountedPrice = isSubscription 
                  ? itemTotal * (1 - subscriptionDiscount)
                  : itemTotal
                
                return (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium dark:text-white">
                      {item.product?.name || item.customMedication?.name}
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
            <div className="border-t border-gray-200 dark:border-[#0F828C] pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
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

              {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-sm">
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
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300 flex items-center">
                  <Truck className="w-4 h-4 mr-1" />
                  Frete
                </span>
                <div className="text-right">
                  {calculatingShipping ? (
                    <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={16} />
                  ) : (promoCodesValidation?.freeShipping || isFreeShipping) ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {promoCodesValidation?.freeShipping ? 'Grátis (cupom)' : 'Grátis'}
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
                <span className="text-lg font-semibold dark:text-white">Total</span>
                <div className="text-right">
                  {isSubscription && baseTotal !== subtotal && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 line-through mb-1">
                      R$ {baseTotal.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
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
      {showSaveAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSaveAddressModal(false)}>
          <div className="bg-white dark:bg-[#065084] rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-[#0F828C]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Salvar Endereço</h3>
              <button onClick={() => setShowSaveAddressModal(false)} className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Dê um apelido para este endereço para facilitar nas próximas compras (ex: Casa, Trabalho, etc.)
            </p>
            <input
              ref={nicknameInputRef}
              type="text"
              placeholder="Ex: Casa, Trabalho, Escritório..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
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
                className="px-4 py-2 border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084]"
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
          <div className="bg-white dark:bg-[#065084] rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-[#0F828C]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Exclusão</h3>
              <button onClick={() => setShowDeleteConfirmModal(null)} className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </p>
            {showDeleteConfirmModal && (() => {
              const addressToDelete = savedAddresses.find(addr => addr.id === showDeleteConfirmModal)
              return addressToDelete && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-[#065084] rounded-lg border border-gray-200 dark:border-[#0F828C]">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{addressToDelete.nickname}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {addressToDelete.address}, {addressToDelete.number}
                    {addressToDelete.complement && ` - ${addressToDelete.complement}`}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {addressToDelete.city} - {addressToDelete.state}, CEP: {addressToDelete.cep}
                  </p>
                </div>
              )
            })()}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084]"
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
          <div className="bg-white dark:bg-[#065084] rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#0F828C]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Editar Endereço</h3>
              <button onClick={() => setShowEditAddressModal(false)} className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                  Apelido *
                </label>
                <input
                  type="text"
                  value={editAddressData.nickname}
                  onChange={(e) => setEditAddressData({ ...editAddressData, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Casa, Trabalho..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={editAddressData.address}
                  onChange={(e) => setEditAddressData({ ...editAddressData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.number}
                    onChange={(e) => setEditAddressData({ ...editAddressData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={editAddressData.complement || ''}
                    onChange={(e) => setEditAddressData({ ...editAddressData, complement: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.city}
                    onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                    Estado *
                  </label>
                  <input
                    type="text"
                    value={editAddressData.state}
                    onChange={(e) => setEditAddressData({ ...editAddressData, state: e.target.value.toUpperCase().substring(0, 2) })}
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700 dark:text-white">
                  Definir como endereço padrão
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditAddressModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084]"
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

