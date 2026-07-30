import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Menu, ShoppingCart, Truck, Gift, Tag, CreditCard,
  Image, Layout, Star, Bot, MessageSquare, Users, Globe,
  ShieldCheck, BarChart3, Settings, ArrowRight, Clock, Compass, LucideIcon
} from 'lucide-react'
import {
  getRecentAdminAccesses,
  clearRecentAdminAccesses,
  formatTimeAgo,
  AdminAccessItem,
  ADMIN_PAGES_META,
} from '../utils/recentAdminAccess'

const ICON_MAP: Record<string, LucideIcon> = {
  Package,
  Menu,
  ShoppingCart,
  Truck,
  Gift,
  Tag,
  CreditCard,
  Image,
  Layout,
  Star,
  Bot,
  MessageSquare,
  Users,
  Globe,
  ShieldCheck,
  BarChart3,
  Settings,
}

function resolveIcon(name: string) {
  return ICON_MAP[name] || Compass
}

export default function AdminPanel() {
  const [recentItems, setRecentItems] = useState<AdminAccessItem[]>([])
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todos')

  useEffect(() => {
    setRecentItems(getRecentAdminAccesses())
  }, [])

  const handleClearHistory = () => {
    clearRecentAdminAccesses()
    setRecentItems([])
  }

  const mostRecent = recentItems.length > 0 ? recentItems[0] : null

  // Categorias do sistema para exploração rápida
  const systemCategories = [
    {
      category: 'Catálogo',
      color: 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      routes: ['/admin/products', '/admin/header-categories'],
    },
    {
      category: 'Vendas',
      color: 'border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      routes: ['/admin/orders', '/admin/shipping', '/admin/promotions', '/admin/promo-codes', '/admin/installment-rules'],
    },
    {
      category: 'Vitrine',
      color: 'border-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400',
      badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
      routes: ['/admin/banners', '/admin/home-sections', '/admin/reviews'],
    },
    {
      category: 'Sistema',
      color: 'border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      routes: ['/admin/ai', '/admin/whatsapp', '/admin/users', '/admin/suppliers', '/admin/supplier-payments', '/admin/audit', '/admin/reports', '/admin/settings'],
    },
  ]

  const defaultSuggestedRoutes = ['/admin/products', '/admin/orders', '/admin/ai', '/admin/banners']

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Seção: Últimos Acessos */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-primary-600 dark:text-primary-400" />
              <span>Últimos Acessos</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {recentItems.length > 0
                ? 'Páginas que você visitou recentemente nesta sessão ou dispositivo.'
                : 'Você ainda não possui histórico recente nesta sessão. Veja as sugestões recomendadas:'}
            </p>
          </div>

          {recentItems.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs font-medium text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors self-start sm:self-auto underline"
            >
              Limpar histórico de acessos
            </button>
          )}
        </div>

        {/* Grid de Últimos Acessos (máximo 4 itens recentes para layout responsivo perfeito) */}
        {recentItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {recentItems.slice(0, 4).map((item) => {
              const IconComp = resolveIcon(item.iconName)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center transition-transform group-hover:scale-110">
                        <IconComp size={20} />
                      </div>
                      <span className="text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>

                    <div className="mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                        {item.category}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {item.title}
                      </h3>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400">
                    <span>Acessar página</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          /* Sugestões Padrão quando o histórico está vazio */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {defaultSuggestedRoutes.map((path) => {
              const meta = ADMIN_PAGES_META[path]
              if (!meta) return null
              const IconComp = resolveIcon(meta.iconName)
              return (
                <Link
                  key={path}
                  to={path}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 transition-transform group-hover:scale-110">
                      <IconComp size={20} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                      {meta.category}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {meta.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400">
                    <span>Acessar</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Seção: Todas as Áreas Administrativas (Exploração por Categorias) */}
      <div className="pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Todas as Áreas do Sistema
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Navegue rapidamente por todos os módulos disponíveis na plataforma.
            </p>
          </div>

          {/* Filtros de Categoria */}
          <div className="flex flex-wrap gap-1.5 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            {['todos', 'Catálogo', 'Vendas', 'Vitrine', 'Sistema'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCategoryFilter === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                {cat === 'todos' ? 'Todas' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemCategories
            .filter((c) => activeCategoryFilter === 'todos' || activeCategoryFilter === c.category)
            .map((catGroup) => (
              <div
                key={catGroup.category}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700/70">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wider uppercase ${catGroup.badge}`}>
                      {catGroup.category}
                    </span>
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">
                    {catGroup.routes.length} módulos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catGroup.routes.map((routePath) => {
                    const meta = ADMIN_PAGES_META[routePath]
                    if (!meta) return null
                    const IconComp = resolveIcon(meta.iconName)
                    const isMostRecent = mostRecent?.path === routePath

                    return (
                      <Link
                        key={routePath}
                        to={routePath}
                        className={`group p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${isMostRecent
                          ? 'bg-primary-50/60 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800'
                          : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                          }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <IconComp size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                              {meta.title}
                            </h4>
                            {isMostRecent && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary-600 text-white shrink-0">
                                RECENTE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

    </div>
  )
}
