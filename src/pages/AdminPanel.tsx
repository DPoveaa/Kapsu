import { Link } from 'react-router-dom'
import { Settings, MessageSquare, Users, Package, ShoppingCart, BarChart3 } from 'lucide-react'

export default function AdminPanel() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="mt-2 text-gray-600">Gerencie seu sistema Sanare</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card WhatsApp */}
          <Link
            to="/admin/whatsapp"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
                <p className="text-sm text-gray-600">Conectar e gerenciar WhatsApp</p>
              </div>
            </div>
          </Link>

          {/* Card Produtos */}
          <Link
            to="/admin/products"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Produtos</h3>
                <p className="text-sm text-gray-600">Gerenciar produtos</p>
              </div>
            </div>
          </Link>

          {/* Card Pedidos */}
          <Link
            to="/admin/orders"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pedidos</h3>
                <p className="text-sm text-gray-600">Visualizar pedidos</p>
              </div>
            </div>
          </Link>

          {/* Card Usuários */}
          <Link
            to="/admin/users"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Usuários</h3>
                <p className="text-sm text-gray-600">Gerenciar usuários</p>
              </div>
            </div>
          </Link>

          {/* Card Relatórios */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Relatórios</h3>
                <p className="text-sm text-gray-600">Visualizar relatórios</p>
              </div>
            </div>
          </div>

          {/* Card Configurações */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configurações</h3>
                <p className="text-sm text-gray-600">Configurações do sistema</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


