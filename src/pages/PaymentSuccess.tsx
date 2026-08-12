import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Package, Home, Loader2 } from 'lucide-react'
import { clearPendingCheckoutOrderId } from '../utils/checkout'
import { useCart } from '../context/CartContext'
import { trackConversion } from '../utils/gtag'


export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshCart } = useCart()
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    clearPendingCheckoutOrderId()
    void refreshCart()
    const externalReference = searchParams.get('external_reference')
    const orderIdParam = searchParams.get('order_id')
    const currentOrderId = orderIdParam || externalReference

    if (currentOrderId) {
      setOrderId(currentOrderId)
      trackConversion(undefined, undefined, 'BRL', currentOrderId)
    }


    // Simula um pequeno delay para melhor UX
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [searchParams, refreshCart])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-8">
      <div className="max-w-lg w-full mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-xl border border-gray-100 dark:border-gray-700 p-6 text-center">
          <CheckCircle className="mx-auto text-green-600 dark:text-green-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pagamento Aprovado!
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-1">
            Seu pedido foi processado com sucesso.
          </p>
          {orderId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Pedido #{orderId.substring(0, 8)}
            </p>
          )}
          
          <div className="bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Package className="text-green-600 dark:text-green-400 mr-2" size={20} />
              <p className="text-green-800 dark:text-green-300 font-semibold text-sm">
                Seu pedido está sendo processado
              </p>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              Você receberá um e-mail de confirmação em breve com os detalhes do seu pedido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center justify-center text-sm"
            >
              <Home className="mr-2" size={18} />
              Voltar para Início
            </button>
            <button
              onClick={() => navigate('/produtos')}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors text-sm"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

