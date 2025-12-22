import { Link } from 'react-router-dom'
import { Settings, MessageSquare, Users, Package, ShoppingCart, BarChart3, Truck, Gift, Tag, Image, Star, Layout } from 'lucide-react'

export default function AdminPanel() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">Gerencie seu sistema Kapsu</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Card WhatsApp */}
          <Link
            to="/admin/whatsapp"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">WhatsApp</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Conectar e gerenciar WhatsApp</p>
              </div>
            </div>
          </Link>

          {/* Card Produtos */}
          <Link
            to="/admin/products"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Produtos</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Gerenciar produtos</p>
              </div>
            </div>
          </Link>

          {/* Card Pedidos */}
          <Link
            to="/admin/orders"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Pedidos</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Visualizar pedidos</p>
              </div>
            </div>
          </Link>

          {/* Card Usuários */}
          <Link
            to="/admin/users"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Usuários</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Gerenciar usuários</p>
              </div>
            </div>
          </Link>

          {/* Card Relatórios */}
          <Link
            to="/admin/reports"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Relatórios</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Visualizar relatórios</p>
              </div>
            </div>
          </Link>

          {/* Card Configurações */}
          <Link
            to="/admin/settings"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Configurações</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Configurações do sistema</p>
              </div>
            </div>
          </Link>

          {/* Card Frete */}
          <Link
            to="/admin/shipping"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Frete</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Configurar frete e regiões</p>
              </div>
            </div>
          </Link>

          {/* Card Promoções */}
          <Link
            to="/admin/promotions"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-pink-100 dark:bg-pink-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Promoções</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Criar e gerenciar promoções</p>
              </div>
            </div>
          </Link>

          {/* Card Códigos Promocionais */}
          <Link
            to="/admin/promo-codes"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Códigos Promocionais</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Criar cupons e códigos de desconto</p>
              </div>
            </div>
          </Link>

          {/* Card Banners */}
          <Link
            to="/admin/banners"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-teal-100 dark:bg-teal-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Image className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Banners</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Gerenciar banners da página inicial</p>
              </div>
            </div>
          </Link>

          {/* Card Avaliações */}
          <Link
            to="/admin/reviews"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Avaliações</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Gerenciar avaliações da página inicial</p>
              </div>
            </div>
          </Link>

          {/* Card Página Inicial */}
          <Link
            to="/admin/home-sections"
            className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-[#0F828C]"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Página Inicial</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Gerenciar seções e produtos em destaque</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}


