import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react'

export default function PaymentFailure() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="mx-auto text-red-600 mb-6" size={64} />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Pagamento Não Aprovado
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <p className="text-red-800 font-semibold mb-2">
              Possíveis motivos:
            </p>
            <ul className="text-sm text-red-700 text-left space-y-1">
              <li>• Dados do cartão incorretos</li>
              <li>• Saldo insuficiente</li>
              <li>• Cartão bloqueado ou expirado</li>
              <li>• Problema temporário com o processador</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/carrinho')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              <RotateCcw className="mr-2" size={20} />
              Tentar Novamente
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="mr-2" size={20} />
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

