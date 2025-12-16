import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Package, Home, Loader2 } from 'lucide-react'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    // Extrai informações da URL do Mercado Pago
    const externalReference = searchParams.get('external_reference')

    if (externalReference) {
      setOrderId(externalReference)
    }

    // Simula um pequeno delay para melhor UX
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="mx-auto text-green-600 mb-6" size={64} />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Pagamento Aprovado!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Seu pedido foi processado com sucesso.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-8">
              Pedido #{orderId.substring(0, 8)}
            </p>
          )}
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center mb-4">
              <Package className="text-green-600 mr-2" size={24} />
              <p className="text-green-800 font-semibold">
                Seu pedido está sendo processado
              </p>
            </div>
            <p className="text-sm text-green-700">
              Você receberá um e-mail de confirmação em breve com os detalhes do seu pedido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              <Home className="mr-2" size={20} />
              Voltar para Início
            </button>
            <button
              onClick={() => navigate('/produtos')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

