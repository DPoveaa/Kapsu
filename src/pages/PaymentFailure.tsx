import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react'

export default function PaymentFailure() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-8">
      <div className="max-w-lg w-full mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-xl border border-gray-100 dark:border-gray-700 p-6 text-center">
          <XCircle className="mx-auto text-red-600 dark:text-red-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pagamento Não Aprovado
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </p>
          
          <div className="bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 font-semibold mb-2 text-sm">
              Possíveis motivos:
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 text-left space-y-1">
              <li>• Dados do cartão incorretos</li>
              <li>• Saldo insuficiente</li>
              <li>• Cartão bloqueado ou expirado</li>
              <li>• Problema temporário com o processador</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/carrinho')}
              className="px-5 py-2.5 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center justify-center text-sm"
            >
              <RotateCcw className="mr-2" size={18} />
              Tentar Novamente
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors flex items-center justify-center text-sm"
            >
              <ArrowLeft className="mr-2" size={18} />
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

