import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, MapPin, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { orderService } from '../services/order.service'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    paymentMethod: 'credit' as 'credit' | 'debit' | 'pix',
    prescriptionFile: null as File | null
  })

  const hasPrescriptionRequired = items.some(
    item => item.type === 'custom' && item.customMedication?.prescriptionRequired
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, prescriptionFile: e.target.files![0] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      // Finalizar pedido
      try {
        setCreatingOrder(true)
        
        // Monta endereço completo
        const shippingAddress = `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.city} - ${formData.state}, CEP: ${formData.cep}`
        
        // Cria pedido
        const order = await orderService.createOrder(
          formData.paymentMethod,
          shippingAddress
        )
        
        // Limpa carrinho
        await clearCart()
        
        // Redireciona para página de sucesso ou pedidos
        alert(`Pedido #${order.id.substring(0, 8)} criado com sucesso!`)
        navigate('/')
      } catch (error: any) {
        console.error('Erro ao criar pedido:', error)
        alert(error.message || 'Erro ao finalizar pedido. Tente novamente.')
      } finally {
        setCreatingOrder(false)
      }
    }
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

      <h1 className="text-4xl font-bold text-gray-900 mb-8">Finalizar Compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card p-6">
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <MapPin className="mr-2" size={24} />
                  Dados de Entrega
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CPF *
                      </label>
                      <input
                        type="text"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Telefone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="mr-2" size={24} />
                  Pagamento
                </h2>
                {hasPrescriptionRequired && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <FileText className="text-yellow-600 mr-3 mt-0.5" size={20} />
                      <div>
                        <p className="text-yellow-800 font-semibold mb-2">Receita Médica Necessária</p>
                        <label className="block text-sm text-yellow-700 mb-2">
                          Envie uma foto ou PDF da receita médica:
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="text-sm"
                        />
                        {formData.prescriptionFile && (
                          <p className="text-sm text-yellow-700 mt-2">
                            Arquivo selecionado: {formData.prescriptionFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Forma de Pagamento *
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="credit">Cartão de Crédito</option>
                      <option value="debit">Cartão de Débito</option>
                      <option value="pix">PIX</option>
                    </select>
                  </div>
                  {formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Número do Cartão *
                        </label>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Validade *
                          </label>
                          <input
                            type="text"
                            placeholder="MM/AA"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nome no Cartão *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-primary-50 rounded-lg">
                      <p className="text-primary-800">
                        Você receberá o código PIX após confirmar o pedido. O pagamento será processado imediatamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmação</h2>
                <p className="text-gray-600 mb-6">
                  Revise seus dados e confirme o pedido
                </p>
                <div className="text-left bg-primary-50 p-4 rounded-lg mb-6">
                  <p className="font-semibold mb-2">Resumo do Pedido:</p>
                  <p className="text-sm text-gray-600">Total: R$ {getTotal().toFixed(2).replace('.', ',')}</p>
                  <p className="text-sm text-gray-600">Itens: {items.length}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="btn-secondary"
                >
                  Voltar
                </button>
              )}
              <button 
                type="submit" 
                className="btn-primary ml-auto flex items-center"
                disabled={creatingOrder}
              >
                {creatingOrder ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processando...
                  </>
                ) : (
                  step === 3 ? 'Confirmar Pedido' : 'Continuar'
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
              {items.map(item => (
                <div key={item.id} className="text-sm">
                  <p className="font-medium">
                    {item.product?.name || item.customMedication?.name}
                  </p>
                  <p className="text-gray-600">
                    Qtd: {item.quantity} × R$ {((item.product?.price || item.customMedication?.price || 0)).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary-600">
                  R$ {getTotal().toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

