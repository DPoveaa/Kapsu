import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { paymentService } from '../services/payment.service'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, getTotal } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'quarterly'>('monthly')
  const [formData, setFormData] = useState({
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: ''
  })

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
  const currentTotal = isSubscription ? discountedTotal : baseTotal

  // Redireciona se não estiver autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Valida endereço e já cria preferência de pagamento, redirecionando para o checkout do Mercado Pago
    if (!formData.address || !formData.number || !formData.city || !formData.state || !formData.cep) {
      alert('Por favor, preencha todos os campos do endereço')
      return
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
        isSubscription ? subscriptionPlan : undefined
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

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Voltar
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Finalizar Compra</h1>

      {/* Informações do usuário */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600 mb-1">
          <strong>Nome:</strong> {user.name}
        </p>
        <p className="text-sm text-gray-600">
          <strong>E-mail:</strong> {user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MapPin className="mr-2" size={24} />
                Endereço de Entrega
              </h2>
              {checkoutError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{checkoutError}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CEP *
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    required
                    placeholder="00000-000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
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
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button 
                type="submit" 
                className="btn-primary ml-auto flex items-center"
                disabled={creatingOrder}
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
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo do Pedido</h2>
            <div className="space-y-2 mb-4">
              {items.map(item => {
                const price = item.product?.price || item.customMedication?.price || 0
                const itemTotal = price * item.quantity
                const itemDiscountedPrice = isSubscription 
                  ? itemTotal * (1 - subscriptionDiscount)
                  : itemTotal
                
                return (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium">
                      {item.product?.name || item.customMedication?.name}
                    </p>
                    <p className="text-gray-600">
                      Qtd: {item.quantity} × R$ {price.toFixed(2).replace('.', ',')}
                    </p>
                    {isSubscription && itemTotal !== itemDiscountedPrice && (
                      <p className="text-xs text-gray-400 line-through">
                        R$ {itemTotal.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    {isSubscription && (
                      <p className="text-primary-600 font-semibold">
                        R$ {itemDiscountedPrice.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="border-t pt-4 space-y-3">
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
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <div className="text-right">
                  {isSubscription && baseTotal !== currentTotal && (
                    <p className="text-xs text-gray-400 line-through mb-1">
                      R$ {baseTotal.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <span className="text-2xl font-bold text-primary-600">
                    R$ {currentTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
              {isSubscription && (
                <p className="text-xs text-gray-500 text-right">
                  {subscriptionPlan === 'quarterly' ? 'A cada 3 meses' : 'Por mês'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

