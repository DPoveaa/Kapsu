import { useEffect, useState } from 'react'
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
        { title: "Fornecedores", icon: Globe, link: "/admin/suppliers" },
        { title: "Pagamentos Fornecedor", icon: CreditCard, link: "/admin/supplier-payments" },
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

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  const renderNavItems = (isMobile = false) => {
    const collapsed = isCollapsed && !isMobile

    return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-hidden">

      <div className={`flex-1 overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 ${isMobile ? 'pt-14' : 'pt-4'}`}>
        <div className="px-3 mb-4">
          <Link 
            to="/admin"
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`flex items-center px-[18px] py-2.5 rounded-lg transition-colors overflow-hidden ${
              isActive('/admin') 
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 font-medium' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Layout className="flex-shrink-0 mr-3" size={20} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-150 ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100 delay-150'}`}>Dashboard</span>
          </Link>
        </div>

        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-6">
            <h3 className={`h-4 px-6 mb-2 whitespace-nowrap overflow-hidden text-xs font-semibold text-gray-400 uppercase tracking-wider transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100 delay-150'}`}>
              {group.title}
            </h3>
            <ul className="space-y-1 px-3">
              {group.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <Link
                    to={item.link}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-[18px] py-2.5 rounded-lg transition-colors overflow-hidden ${
                      isActive(item.link)
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className="flex-shrink-0 mr-3" size={20} />
                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-150 ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[190px] opacity-100 delay-150'}`}>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
    )
  }

  return (
    <div className="flex h-dvh min-h-0 w-full bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
      {/* Mobile Menu Button - só aparece em telas pequenas se não estiver aberto */}
      {!mobileMenuOpen && (
        <div className="md:hidden absolute top-4 left-4 z-20">
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Abrir menu administrativo"
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-mobile-navigation"
          >
            <MenuIcon size={24} />
          </button>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className={`hidden md:block relative h-dvh min-h-0 sticky top-0 transition-all duration-300 ease-in-out z-10 shadow-sm ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(value => !value)}
          className="absolute -right-3.5 top-6 z-30 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 shadow-md transition hover:scale-110"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        {renderNavItems()}
      </aside>

      {/* Sidebar Mobile Overlay */}
      {mobileMenuOpen && (
        <div id="admin-mobile-navigation" className="md:hidden fixed inset-0 z-[1000] flex" role="dialog" aria-modal="true" aria-label="Menu administrativo">
          <button
            type="button"
            className="fixed inset-0 h-full w-full bg-black/55 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu administrativo"
          />
          <aside className="relative h-full w-[min(88vw,20rem)] bg-white dark:bg-gray-900 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <button 
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Fechar menu administrativo"
            >
              <X size={20} />
            </button>
            {renderNavItems(true)}
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
