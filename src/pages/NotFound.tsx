import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Home } from 'lucide-react'
import SEO from '../components/SEO'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[70vh] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <SEO title="Página Não Encontrada | Kapsu" noindex={true} />
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={36} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
          Página não encontrada (404)
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          O endereço que você tentou acessar não existe, foi removido ou mudou de local.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home size={16} /> Ir para o Início
          </button>
        </div>
      </div>
    </div>
  )
}
