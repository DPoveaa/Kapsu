import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Settings, MessageSquare, Users, Package, ShoppingCart, BarChart3, 
  Truck, Gift, Tag, Image, Star, Layout, Menu, ChevronLeft, ChevronRight, Menu as MenuIcon, X,
  ShieldCheck, Bot, CreditCard, Globe
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const menuGroups = [
    {
      title: "Catálogo",
      items: [
        { title: "Produtos", icon: Package, link: "/admin/products" },
        { title: "Categorias", icon: Menu, link: "/admin/header-categories" }
      ]
    },
    {
      title: "Vendas",
      items: [
        { title: "Pedidos", icon: ShoppingCart, link: "/admin/orders" },
        { title: "Frete", icon: Truck, link: "/admin/shipping" },
        { title: "Promoções", icon: Gift, link: "/admin/promotions" },
        { title: "Cupons", icon: Tag, link: "/admin/promo-codes" },
        { title: "Parcelas sem Juros", icon: CreditCard, link: "/admin/installment-rules" }
      ]
    },
    {
      title: "Vitrine",
      items: [
        { title: "Banners", icon: Image, link: "/admin/banners" },
        { title: "Página Inicial", icon: Layout, link: "/admin/home-sections" },
        { title: "Avaliações", icon: Star, link: "/admin/reviews" }
      ]
    },
    {
      title: "Sistema",
      items: [
        { title: "Central da IA", icon: Bot, link: "/admin/central-ia" },
        { title: "WhatsApp", icon: MessageSquare, link: "/admin/whatsapp" },
        { title: "Usuários", icon: Users, link: "/admin/users" },
        { title: "Auditoria", icon: ShieldCheck, link: "/admin/audit" },
        { title: "Relatórios", icon: BarChart3, link: "/admin/reports" },
        { title: "Google Sheets", icon: Globe, link: "/admin/google-sheets" },
        { title: "Configurações", icon: Settings, link: "/admin/settings" }
      ]
    }
  ]

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  }

  const renderNavItems = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && <h2 className="text-xl font-bold text-gray-800 dark:text-white">Admin</h2>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hidden md:block"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        <div className="px-3 mb-4">
          <Link 
            to="/admin"
            className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/admin') 
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 font-medium' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Layout className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} size={20} />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
        </div>

        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-6">
            {!isCollapsed && (
              <h3 className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            <ul className="space-y-1 px-3">
              {group.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <Link
                    to={item.link}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                      isActive(item.link)
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} size={20} />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
      {/* Mobile Menu Button - só aparece em telas pequenas se não estiver aberto */}
      {!mobileMenuOpen && (
        <div className="md:hidden absolute top-4 left-4 z-20">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <MenuIcon size={24} />
          </button>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className={`hidden md:block transition-all duration-300 ease-in-out z-10 shadow-sm ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {renderNavItems()}
      </aside>

      {/* Sidebar Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)}></div>
          <aside className="relative w-72 bg-white dark:bg-gray-900 h-full flex flex-col shadow-xl animate-in slide-in-from-left-full duration-300">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-full"
            >
              <X size={20} />
            </button>
            {renderNavItems()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 mt-12 md:mt-0 w-full md:max-w-none overflow-y-auto min-h-0">
          {children}
        </div>
      </main>
    </div>
  )
}
