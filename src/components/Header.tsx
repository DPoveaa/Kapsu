import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Menu, LogOut, Shield, MessageCircle, UserCircle, Search, Loader2, Building2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { whatsappService } from '../services/whatsapp.service'
import AnimatedLogo from './AnimatedLogo'
import ThemeToggle from './ThemeToggle'
import HeaderCategories from './HeaderCategories'
import { env } from '../config/env'
import { productsService } from '../services/products.service'
import { Product } from '../types'
import { getImageUrl } from '../utils/imageUrl'
import { searchProducts } from '../utils/productSearch'
import { generateProductUrl } from '../utils/productUrl'

const SEARCH_PLACEHOLDERS = [
  'Quero mais energia',
  'Quero emagrecer',
  'Quero dormir melhor',
  'Quero mais foco',
  'Quero pele bonita',
  'Quero cabelo forte',
  'Quero menos inchaço',
  'Quero mais disposição',
  'Quero acelerar o metabolismo',
  'Quero cuidar da imunidade',
  'Quero mais performance',
  'Quero mais libido',
  'Quero corpo definido',
  'Quero controlar a ansiedade',
  'Quero uma rotina mais saudável'
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [interventionCount, setInterventionCount] = useState(0)
  const { getItemCount } = useCart()
  const { user, logout, isAdmin, isPharmacist, isSupplier } = useAuth()
  const itemCount = getItemCount()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [searchCatalog, setSearchCatalog] = useState<Product[] | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(SEARCH_PLACEHOLDERS[0])
  const desktopSearchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Função para obter a URL da imagem de perfil
  const getProfileImageUrl = (profileImage?: string): string | null => {
    if (!profileImage) return null
    if (profileImage.startsWith('http')) return profileImage
    // Remove /api da URL base para arquivos estáticos
    const baseUrl = env.apiUrl.replace('/api', '')
    return `${baseUrl}${profileImage}`
  }

  // Função para obter as iniciais do nome
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Busca contagem de intervenções para admin e farmacêutico
  useEffect(() => {
    if ((isAdmin || isPharmacist) && user) {
      const fetchInterventionCount = async () => {
        try {
          const data = await whatsappService.getInterventionCount()
          if (data.success) {
            setInterventionCount(data.total)
          }
        } catch (error) {
          console.error('Erro ao buscar contagem de intervenções:', error)
        }
      }

      fetchInterventionCount()
      // Atualiza a cada 30 segundos
      const interval = setInterval(fetchInterventionCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin, isPharmacist, user])

  // Fechar menu do usuário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      const target = event.target as Node
      const clickedInsideSearch =
        desktopSearchRef.current?.contains(target) ||
        mobileSearchRef.current?.contains(target)

      if (!clickedInsideSearch) {
        setShowSuggestions(false)
      }
    }

    if (userMenuOpen || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen, showSuggestions])

  useEffect(() => {
    const q = searchTerm.trim()
    if (q.length < 2) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }
    setLoadingSuggestions(true)
    const t = setTimeout(async () => {
      try {
        let catalog = searchCatalog
        let serverResults: Product[] = []

        const requests = await Promise.allSettled([
          productsService.search(q),
          catalog ? Promise.resolve(catalog) : productsService.getAll(),
        ])

        if (requests[0].status === 'fulfilled') {
          serverResults = requests[0].value
        }

        if (requests[1].status === 'fulfilled') {
          catalog = requests[1].value
          if (!searchCatalog) setSearchCatalog(catalog)
        }

        const fuzzyResults = searchProducts((catalog || serverResults).filter(p => p.active), q, 8).map(result => result.product)
        const merged = [...fuzzyResults, ...serverResults.filter(p => p.active)]
        const uniqueResults = Array.from(new Map(merged.map(product => [product.id, product])).values())

        setSuggestions(uniqueResults.slice(0, 6))
      } catch {
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)
    return () => {
      clearTimeout(t)
    }
  }, [searchTerm, searchCatalog])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPlaceholder(SEARCH_PLACEHOLDERS[0])
      return
    }

    let phraseIndex = 0
    let charIndex = SEARCH_PLACEHOLDERS[0].length
    let deleting = false
    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      const phrase = SEARCH_PLACEHOLDERS[phraseIndex]

      if (!deleting) {
        charIndex += 1
        setAnimatedPlaceholder(phrase.slice(0, charIndex))

        if (charIndex >= phrase.length) {
          deleting = true
          timeoutId = setTimeout(tick, 6200)
          return
        }

        timeoutId = setTimeout(tick, 55)
        return
      }

      charIndex -= 1
      setAnimatedPlaceholder(phrase.slice(0, charIndex))

      if (charIndex <= 0) {
        deleting = false
        phraseIndex = (phraseIndex + 1) % SEARCH_PLACEHOLDERS.length
        timeoutId = setTimeout(tick, 420)
        return
      }

      timeoutId = setTimeout(tick, 28)
    }

    timeoutId = setTimeout(tick, 6200)
    return () => clearTimeout(timeoutId)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchTerm.trim()
    if (!q) return
    setShowSuggestions(false)
    navigate(`/produtos?q=${encodeURIComponent(q)}`)
  }

  const formatPrice = (product: Product) => {
    const price = product.promo_price ?? product.price
    return Number(price || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const renderSearchSuggestions = () => {
    const q = searchTerm.trim()
    if (!showSuggestions || (!loadingSuggestions && q.length < 2)) return null

    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30">
        <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Sugestões de produtos
          </p>
        </div>
        {loadingSuggestions && (
          <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={16} />
            <span>Buscando produtos parecidos...</span>
          </div>
        )}
        {!loadingSuggestions && suggestions.length > 0 && (
          <div className="max-h-[22rem] overflow-y-auto p-2">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setShowSuggestions(false)
                  setSearchTerm('')
                  navigate(generateProductUrl(p))
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-gray-700/70"
              >
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <img
                    src={getImageUrl(p.image)}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary-700 dark:text-gray-100 dark:group-hover:text-primary-300">
                      {p.name}
                    </p>
                    <span className="whitespace-nowrap text-xs font-bold text-primary-700 dark:text-primary-300">
                      {formatPrice(p)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                    {p.category || 'Produto'}{p.description ? ` • ` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        {!loadingSuggestions && suggestions.length === 0 && q.length >= 2 && (
          <div className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
            Nenhum produto parecido foi encontrado.
          </div>
        )}
      </div>
    )
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      {/* Barra superior verde */}
      <div className="h-1 bg-primary-500"></div>

      <nav className="container mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <AnimatedLogo
              className="h-11 w-11 object-contain group-hover:opacity-90 transition-opacity duration-200"
              alt="Kapsu Logo"
            />
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Kapsu</span>
          </Link>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-3xl" ref={desktopSearchRef}>
            <div className="flex items-center gap-2 flex-shrink-0">
            </div>
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={animatedPlaceholder}
                className="h-11 w-full rounded-full border border-gray-300 bg-white pl-4 pr-12 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <Search size={16} />
              </button>
              {renderSearchSuggestions()}
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Link
              to="/carrinho"
              data-cart-icon-target
              className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-bold text-white shadow-md">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            {(isAdmin || isPharmacist) && (
              <Link
                to="/admin/whatsapp/support"
                className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                title="Conversas que precisam de intervenção"
              >
                <MessageCircle size={22} />
                {interventionCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md animate-pulse">
                    {interventionCount > 99 ? '99+' : interventionCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 group"
                >
                  {getProfileImageUrl(user.profile_image) ? (
                    <img
                      src={getProfileImageUrl(user.profile_image)!}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-800"
                      onError={(e) => {
                        // Se a imagem falhar ao carregar, mostra a inicial
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-primary-500'
                          fallback.textContent = getInitials(user.name)
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-primary-500">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-200 text-sm max-w-[120px] truncate">{user.name}</span>
                  {isAdmin && <Shield size={14} className="text-yellow-500" />}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50 overflow-hidden">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-300 flex items-center space-x-2 transition-colors"
                      >
                        <Shield size={16} />
                        <span>Painel Admin</span>
                      </Link>
                    )}
                    {(isSupplier || user.role === 'supplier_admin' || user.role === 'supplier_employee' || user.supplier_id) && (
                      <Link
                        to="/supplier/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-300 flex items-center space-x-2 transition-colors"
                      >
                        <Building2 size={16} className="text-primary-500" />
                        <span>Portal do Fornecedor</span>
                      </Link>
                    )}
                    <Link
                      to="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-300 flex items-center space-x-2 transition-colors"
                    >
                      <UserCircle size={16} />
                      <span>Meu Perfil</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setUserMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                <User size={20} />
                <span>Entrar</span>
              </Link>
            )}
            <button
              className="md:hidden p-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
        <div className="md:hidden px-3 pb-3" ref={mobileSearchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={animatedPlaceholder}
              className="h-11 w-full rounded-full border border-gray-300 bg-white pl-4 pr-12 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white transition-colors"
            >
              <Search size={16} />
            </button>
            {renderSearchSuggestions()}
          </form>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-700 pt-4 pb-4 space-y-1">
            <Link
              to="/produtos"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Produtos
            </Link>

            <Link
              to="/sobre"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sobre
            </Link>
            <Link
              to="/contato"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contato
            </Link>
            {user ? (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-2 space-y-1">
                <div className="flex items-center space-x-2 px-4 py-2.5 mb-2">
                  {getProfileImageUrl(user.profile_image) ? (
                    <img
                      src={getProfileImageUrl(user.profile_image)!}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-800"
                      onError={(e) => {
                        // Se a imagem falhar ao carregar, mostra a inicial
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-primary-500'
                          fallback.textContent = getInitials(user.name)
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-primary-500">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{user.email}</p>
                  </div>
                  {isAdmin && <Shield size={14} className="text-yellow-500" />}
                </div>
                {(isAdmin || isPharmacist) && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Shield size={16} />
                      <span>Painel Admin</span>
                    </Link>
                    <Link
                      to="/admin/whatsapp/support"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                    >
                      <MessageCircle size={16} />
                      <span>Atendimento</span>
                      {interventionCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {interventionCount > 99 ? '99+' : interventionCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                <Link
                  to="/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <UserCircle size={16} />
                  <span>Meu Perfil</span>
                </Link>
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={20} />
                <span>Entrar</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Faixa de Categorias */}
      <HeaderCategories />
    </header>
  )
}


