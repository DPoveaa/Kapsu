import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { orderService } from '../services/order.service'
import { paymentService } from '../services/payment.service'
import { useCart } from '../context/CartContext'

// Luhn Algorithm validation
const isValidLuhn = (number: string) => {
  let sum = 0
  let isEven = false
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i), 10)
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  return sum % 10 === 0
}

const formatCardNumber = (val: string) => {
  const v = val.replace(/\D/g, '').substring(0, 16)
  return v.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const formatExpiry = (val: string) => {
  const v = val.replace(/\D/g, '').substring(0, 4)
  if (v.length >= 2) {
    return `${v.substring(0, 2)}/${v.substring(2)}`
  }
  return v
}

const formatCPF = (val: string) => {
  let v = val.replace(/\D/g, '').substring(0, 11)
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
  return v
}

export default function CheckoutCardPayment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { clearCart } = useCart()

  const [order, setOrder] = useState<any>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [processing, setProcessing] = useState(false)

  const [formData, setFormData] = useState({
    holderName: '',
    cpf: '',
    number: '',
    expiry: '',
    ccv: '',
    installments: 1
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!orderId) {
      navigate('/checkout')
      return
    }

    const fetchOrder = async () => {
      try {
        setLoadingOrder(true)
        const orderData = await orderService.getOrder(orderId)
        if (orderData.status !== 'PENDING' && orderData.status !== 'PENDING_PAYMENT') {
          navigate('/perfil?section=orders')
          return
        }
        setOrder(orderData)
      } catch (err: any) {
        setError('Não foi possível carregar o pedido.')
      } finally {
        setLoadingOrder(false)
      }
    }

    fetchOrder()
  }, [isAuthenticated, authLoading, orderId, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    let formatted = value
    if (name === 'number') formatted = formatCardNumber(value)
    else if (name === 'expiry') formatted = formatExpiry(value)
    else if (name === 'cpf') formatted = formatCPF(value)

    setFormData(prev => ({ ...prev, [name]: formatted }))
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateLocal = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.holderName.trim()) errors.holderName = 'Nome é obrigatório.'
    
    const cpfRaw = formData.cpf.replace(/\D/g, '')
    if (cpfRaw.length !== 11) errors.cpf = 'CPF inválido.'

    const numberRaw = formData.number.replace(/\D/g, '')
    if (numberRaw.length < 13 || numberRaw.length > 16) errors.number = 'Número do cartão inválido.'
    else if (!isValidLuhn(numberRaw)) errors.number = 'Número do cartão inválido (Luhn).'

    if (formData.expiry.length !== 5) errors.expiry = 'Validade inválida (MM/AA).'
    else {
      const [month, year] = formData.expiry.split('/')
      const monthNum = parseInt(month, 10)
      if (monthNum < 1 || monthNum > 12) errors.expiry = 'Mês inválido.'
      // Basic year check (e.g., > 23 for 2023)
      const currentYear = new Date().getFullYear() % 100
      const currentMonth = new Date().getMonth() + 1
      if (parseInt(year, 10) < currentYear || (parseInt(year, 10) === currentYear && monthNum < currentMonth)) {
        errors.expiry = 'Cartão vencido.'
      }
    }

    if (formData.ccv.length < 3) errors.ccv = 'CVV inválido.'

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleValidate = () => {
    if (validateLocal()) {
      setStep(2)
    }
  }

  const handleConfirmAndPay = async () => {
    try {
      setProcessing(true)
      setError(null)
      
      const [expiryMonth, expiryYear] = formData.expiry.split('/')
      
      const response = await paymentService.payWithCard({
        orderId: orderId!,
        creditCard: {
          holderName: formData.holderName,
          number: formData.number.replace(/\D/g, ''),
          expiryMonth,
          expiryYear: `20${expiryYear}`, // assuming 20XX
          ccv: formData.ccv
        },
        payer: {
          cpfCnpj: formData.cpf.replace(/\D/g, '')
        },
        installments: formData.installments
      })

      // DEBUG: loga a resposta completa da API para diagnóstico
      console.log('[CheckoutCardPayment] Resposta da API payWithCard:', JSON.stringify(response, null, 2))

      const confirmedStatuses = ['CONFIRMED', 'RECEIVED', 'APPROVED', 'AUTHORIZED', 'RECEIVED_IN_CASH']
      const pendingStatuses   = ['PENDING', 'AWAITING_RISK_ANALYSIS', 'AWAITING_CHARGEBACK_REVERSAL', 'IN_ANALYSIS']
      const declinedStatuses  = ['DECLINED', 'REFUSED', 'CHARGEBACK_REQUESTED', 'REFUNDED', 'REFUND_REQUESTED']

      if (confirmedStatuses.includes(response.status)) {
        await clearCart()
        navigate(`/checkout/success?orderId=${orderId}`)
      } else if (pendingStatuses.includes(response.status) || !declinedStatuses.includes(response.status)) {
        // Qualquer status não explicitamente recusado é tratado como pendente (pagamento criado com sucesso)
        console.log('[CheckoutCardPayment] Pagamento criado, status:', response.status, '→ redirecionando para sucesso com status=pending')
        await clearCart()
        navigate(`/checkout/success?orderId=${orderId}&status=pending`)
      } else {
        console.warn('[CheckoutCardPayment] Pagamento recusado. Status:', response.status)
        setError('O pagamento foi recusado. Por favor, verifique os dados ou tente outro cartão.')
        setStep(1)
      }
    } catch (err: any) {
      console.error('[CheckoutCardPayment] Erro ao processar pagamento:', err)
      console.error('[CheckoutCardPayment] err.message:', err?.message)
      console.error('[CheckoutCardPayment] err.response:', err?.response)
      setError(err.message || 'Erro ao processar o pagamento.')
      setStep(1)
    } finally {
      setProcessing(false)
    }
  }

  const handleGoBackToMethods = () => {
    // Retorna para o checkout usando o existingOrderId para não duplicar
    navigate('/checkout')
  }

  if (loadingOrder) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error || 'Pedido não encontrado.'}</p>
        <button onClick={() => navigate('/checkout')} className="btn-primary py-2 px-6">Voltar ao Checkout</button>
      </div>
    )
  }

  const totalAmount = Number(order.total)
  const last4 = formData.number.replace(/\D/g, '').slice(-4)

  return (
    <div className="bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-gray-900 min-h-screen pb-16 animate-fade-in">
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">
        
        {/* Progress header */}
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={step === 2 ? () => setStep(1) : handleGoBackToMethods} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">{step === 2 ? 'Editar cartão' : 'Trocar método de pagamento'}</span>
          </button>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-gray-800 px-4 py-2 rounded-full font-semibold text-sm border border-primary-100 dark:border-gray-700">
            <ShieldCheck className="w-4 h-4" />
            Ambiente Seguro
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {step === 1 && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-gray-800 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dados do Cartão</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome impresso no cartão *</label>
                    <input 
                      type="text" name="holderName" value={formData.holderName} onChange={handleChange} 
                      className={`w-full px-4 py-3 border ${validationErrors.holderName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'} rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 outline-none transition-all`} 
                      placeholder="Ex: JOAO M SILVA" 
                    />
                    {validationErrors.holderName && <p className="text-red-500 text-xs mt-1">{validationErrors.holderName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">CPF do titular *</label>
                    <input 
                      type="text" name="cpf" value={formData.cpf} onChange={handleChange} maxLength={14}
                      className={`w-full px-4 py-3 border ${validationErrors.cpf ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'} rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 outline-none transition-all`} 
                      placeholder="000.000.000-00" 
                    />
                    {validationErrors.cpf && <p className="text-red-500 text-xs mt-1">{validationErrors.cpf}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Número do Cartão *</label>
                    <input 
                      type="text" name="number" value={formData.number} onChange={handleChange} maxLength={19}
                      className={`w-full px-4 py-3 border ${validationErrors.number ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'} rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 outline-none transition-all`} 
                      placeholder="0000 0000 0000 0000" 
                    />
                    {validationErrors.number && <p className="text-red-500 text-xs mt-1">{validationErrors.number}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Validade *</label>
                      <input 
                        type="text" name="expiry" value={formData.expiry} onChange={handleChange} maxLength={5}
                        className={`w-full px-4 py-3 border ${validationErrors.expiry ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'} rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 outline-none transition-all`} 
                        placeholder="MM/AA" 
                      />
                      {validationErrors.expiry && <p className="text-red-500 text-xs mt-1">{validationErrors.expiry}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">CVV *</label>
                      <input 
                        type="text" name="ccv" value={formData.ccv} onChange={handleChange} maxLength={4}
                        className={`w-full px-4 py-3 border ${validationErrors.ccv ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'} rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 outline-none transition-all`} 
                        placeholder="123" 
                      />
                      {validationErrors.ccv && <p className="text-red-500 text-xs mt-1">{validationErrors.ccv}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Opções de Parcelamento *</label>
                    <select 
                      name="installments" value={formData.installments} 
                      onChange={(e) => setFormData(prev => ({ ...prev, installments: Number(e.target.value) }))} 
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                        const val = totalAmount / num;
                        return (
                          <option key={num} value={num}>
                            {num}x de R$ {val.toFixed(2).replace('.', ',')} {num === 1 ? 'sem juros' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <button 
                    onClick={handleValidate} 
                    className="w-full btn-primary py-4 mt-4 text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Validar Cartão
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirmação de Pagamento</h2>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                    <span className="text-gray-600 dark:text-gray-400">Cartão de Crédito</span>
                    <span className="font-semibold text-gray-900 dark:text-white tracking-widest">•••• {last4}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Titular</span>
                    <span className="font-semibold text-gray-900 dark:text-white uppercase">{formData.holderName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Forma de Pagamento</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formData.installments}x de R$ {(totalAmount / formData.installments).toFixed(2).replace('.', ',')}</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total a pagar</span>
                    <span className="text-2xl font-black text-primary-600 dark:text-primary-400">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <button 
                    onClick={handleConfirmAndPay} 
                    disabled={processing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5" /> Processando Pagamento...
                      </>
                    ) : (
                      'Confirmar e Pagar'
                    )}
                  </button>
                  <button 
                    onClick={() => setStep(1)} 
                    disabled={processing}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl py-3 font-semibold transition-all"
                  >
                    Voltar e Editar Dados
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Resumo do Pedido</h3>
              
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex-1 pr-2">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{item.product_name || 'Produto'}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Qtd: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">R$ {(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                </div>
                {/* Note: In a real scenario we'd show shipping separately if the order has it. Here we use the final total. */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-black text-primary-600 dark:text-primary-400">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Endereço de Entrega</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {order.shipping_address ? (
                    typeof order.shipping_address === 'string' ? order.shipping_address : `${order.shipping_address.address}, ${order.shipping_address.number}`
                  ) : 'Endereço padrão'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
