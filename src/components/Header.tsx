import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, LogOut, Shield, UserCircle, Search, Loader2, Building2, X, Home, Package, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AnimatedLogo from './AnimatedLogo';
import KapsuThemeControl from './theme-toggle/KapsuThemeControl';
import HeaderCategories from './HeaderCategories';
import { env } from '../config/env';
import { productsService } from '../services/products.service';
import { Product } from '../types';
import { getImageUrl } from '../utils/imageUrl';
import { searchProducts } from '../utils/productSearch';
import { generateProductUrl } from '../utils/productUrl';

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
  'Quero uma rotina mais saudável',
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { getItemCount } = useCart();
  const { user, logout, isAdmin, isSupplier } = useAuth();
  const itemCount = getItemCount();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [searchCatalog, setSearchCatalog] = useState<Product[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const getProfileImageUrl = (profileImage?: string): string | null => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    const baseUrl = env.apiUrl.replace('/api', '');
    return `${baseUrl}${profileImage}`;
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      const target = event.target as Node;
      const clickedInsideSearch =
        desktopSearchRef.current?.contains(target) || mobileSearchRef.current?.contains(target);

      if (!clickedInsideSearch) {
        setShowSuggestions(false);
      }
    }

    if (userMenuOpen || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, showSuggestions]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => mobileMenuCloseRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        window.setTimeout(() => mobileMenuTriggerRef.current?.focus(), 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleMobileLogout = () => {
    logout();
    closeMobileMenu();
  };

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    const t = setTimeout(async () => {
      try {
        let catalog = searchCatalog;
        let serverResults: Product[] = [];

        const requests = await Promise.allSettled([
          productsService.search(q),
          catalog ? Promise.resolve(catalog) : productsService.getAll(),
        ]);

        if (requests[0].status === 'fulfilled') {
          serverResults = requests[0].value;
        }

        if (requests[1].status === 'fulfilled') {
          catalog = requests[1].value;
          if (!searchCatalog) setSearchCatalog(catalog);
        }

        const fuzzyResults = searchProducts(
          (catalog || serverResults).filter((p) => p.active),
          q,
          8
        ).map((result) => result.product);
        const merged = [...fuzzyResults, ...serverResults.filter((p) => p.active)];
        const uniqueResults = Array.from(new Map(merged.map((product) => [product.id, product])).values());

        setSuggestions(uniqueResults.slice(0, 6));
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
    };
  }, [searchTerm, searchCatalog]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPlaceholder(SEARCH_PLACEHOLDERS[0]);
      return;
    }

    let phraseIndex = 0;
    let charIndex = SEARCH_PLACEHOLDERS[0].length;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = SEARCH_PLACEHOLDERS[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        setAnimatedPlaceholder(phrase.slice(0, charIndex));

        if (charIndex >= phrase.length) {
          deleting = true;
          timeoutId = setTimeout(tick, 6200);
          return;
        }

        timeoutId = setTimeout(tick, 55);
        return;
      }

      charIndex -= 1;
      setAnimatedPlaceholder(phrase.slice(0, charIndex));

      if (charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % SEARCH_PLACEHOLDERS.length;
        timeoutId = setTimeout(tick, 420);
        return;
      }

      timeoutId = setTimeout(tick, 28);
    };

    timeoutId = setTimeout(tick, 6200);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    setShowSuggestions(false);
    closeMobileMenu();
    navigate(`/produtos?q=${encodeURIComponent(q)}`);
  };

  const formatPrice = (product: Product) => {
    const price = product.promo_price ?? product.price;
    return Number(price || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const renderSearchSuggestions = () => {
    const q = searchTerm.trim();
    if (!showSuggestions || (!loadingSuggestions && q.length < 2)) return null;

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
                  setShowSuggestions(false);
                  setSearchTerm('');
                  navigate(generateProductUrl(p));
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-gray-700/70"
              >
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <img
                    src={getImageUrl(p.image)}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
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
                    {p.category || 'Produto'}
                    {p.description ? ` • ` : ''}
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
    );
  };

  const mobileMenu = mobileMenuOpen && typeof document !== 'undefined'
    ? createPortal(
      <div
        id="mobile-navigation"
        className="fixed inset-0 z-[1000] md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
      >
        <button
          type="button"
          className="absolute inset-0 h-full w-full bg-gray-950/55 backdrop-blur-[2px]"
          aria-label="Fechar menu"
          onClick={closeMobileMenu}
        />
        <aside className="absolute inset-y-0 right-0 flex w-[min(92vw,24rem)] flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#121C18]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
            <Link to="/" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-2.5 rounded-lg">
              <AnimatedLogo className="h-9 w-9 object-contain" alt="Kapsu Logo" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-gray-900 dark:text-white">Kapsu</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Navegue pela loja</p>
              </div>
            </Link>
            <button
              ref={mobileMenuCloseRef}
              type="button"
              onClick={closeMobileMenu}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Fechar menu"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div ref={mobileSearchRef}>
            <form onSubmit={handleSearchSubmit} className="relative mb-4">
              <label htmlFor="mobile-menu-search" className="sr-only">Buscar produtos</label>
              <input
                id="mobile-menu-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={animatedPlaceholder}
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-12 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>
            </form>
            </div>

            <nav aria-label="Navegação principal" className="space-y-1">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-gray-100 dark:hover:bg-primary-950/30 dark:hover:text-primary-300"
              >
                <Home size={20} className="text-primary-600" />
                <span className="flex-1">Início</span>
                <ChevronRight size={17} className="text-gray-400" />
              </Link>
              <Link
                to="/produtos"
                onClick={closeMobileMenu}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-gray-100 dark:hover:bg-primary-950/30 dark:hover:text-primary-300"
              >
                <Package size={20} className="text-primary-600" />
                <span className="flex-1">Todos os produtos</span>
                <ChevronRight size={17} className="text-gray-400" />
              </Link>
              <Link
                to="/carrinho"
                onClick={closeMobileMenu}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-gray-100 dark:hover:bg-primary-950/30 dark:hover:text-primary-300"
              >
                <ShoppingCart size={20} className="text-primary-600" />
                <span className="flex-1">Carrinho</span>
                {itemCount > 0 && (
                  <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-bold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            </nav>

            <div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />
            <HeaderCategories variant="menu" onNavigate={closeMobileMenu} />

            <div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">Sua conta</p>
            <div className="space-y-1">
              {user ? (
                <>
                  <Link to="/perfil" onClick={closeMobileMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800">
                    <UserCircle size={20} className="text-primary-600" />
                    <span className="min-w-0 flex-1 truncate">{user.name || 'Meu perfil'}</span>
                    <ChevronRight size={17} className="text-gray-400" />
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={closeMobileMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800">
                      <Shield size={20} className="text-amber-500" />
                      <span className="flex-1">Painel administrativo</span>
                      <ChevronRight size={17} className="text-gray-400" />
                    </Link>
                  )}
                  {(isSupplier || user.role === 'supplier_admin' || user.role === 'supplier_employee' || user.supplier_id) && (
                    <Link to="/supplier/orders" onClick={closeMobileMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800">
                      <Building2 size={20} className="text-primary-600" />
                      <span className="flex-1">Portal do fornecedor</span>
                      <ChevronRight size={17} className="text-gray-400" />
                    </Link>
                  )}
                  <button type="button" onClick={handleMobileLogout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                    <LogOut size={20} />
                    <span>Sair da conta</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={closeMobileMenu} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary-600 px-3 py-3 text-sm font-bold text-primary-700 dark:text-primary-300">
                    <User size={18} />
                    Entrar
                  </Link>
                  <Link to="/cadastro" onClick={closeMobileMenu} className="flex min-h-12 items-center justify-center rounded-xl bg-primary-600 px-3 py-3 text-sm font-bold text-white">
                    Criar conta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>,
      document.body
    )
    : null;

  return (
    <>
    <header className="bg-white dark:bg-[#121C18] border-b border-gray-100 dark:border-[#202C26] sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-[#121C18]/95 transition-colors duration-500 relative">
      {/* Barra superior verde */}
      <div className="h-1 bg-primary-500"></div>

      {/* CAMADA INTERNA DAS ESTRELAS CADENTES — clip-path permite entrada pelo topo sem overflow-hidden */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ clipPath: 'inset(-200px 0 0 0)', WebkitClipPath: 'inset(-200px 0 0 0)' }}
        data-kapsu-header-stars-container="true"
      />

      <nav className="container mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Controle de Tema em Formato de Cápsula Posicionado ao lado da Logo */}
          <div className="flex items-center gap-3.5 relative z-10">
            <Link to="/" className="flex items-center space-x-2.5 group relative z-10">
              <AnimatedLogo
                className="h-10 w-10 object-contain group-hover:opacity-90 transition-opacity duration-200"
                alt="Kapsu Logo"
              />
              <span className="text-2xl font-bold text-gray-900 dark:text-[#F4F7F5] tracking-tight relative z-10">Kapsu</span>
            </Link>

            {/* Controle de Tema dedicado ao lado da Logo Kapsu */}
            <KapsuThemeControl />
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl ml-4 relative z-10" ref={desktopSearchRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={animatedPlaceholder}
                className="h-11 w-full rounded-full border border-gray-300 bg-white pl-4 pr-12 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-[#17211D] dark:text-[#F4F7F5] dark:placeholder:text-gray-500"
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
            <Link
              to="/carrinho"
              data-cart-icon-target
              className="relative p-2.5 text-gray-600 dark:text-[#AAB5AF] hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-[#17211D] rounded-lg transition-all duration-200"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-bold text-white shadow-md">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#17211D] transition-colors duration-200 group"
                >
                  {getProfileImageUrl(user.profile_image) ? (
                    <img
                      src={getProfileImageUrl(user.profile_image)!}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-800"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className =
                            'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-primary-500';
                          fallback.textContent = getInitials(user.name);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-primary-500">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className="font-medium text-gray-700 dark:text-[#F4F7F5] text-sm max-w-[120px] truncate">
                    {user.name}
                  </span>
                  {isAdmin && <Shield size={14} className="text-yellow-500" />}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#17211D] rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-800/80 py-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-2.5 mx-1 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                      >
                        <Shield size={16} className="text-amber-500 flex-shrink-0" />
                        <span>Painel Admin</span>
                      </Link>
                    )}
                    {(isSupplier ||
                      user.role === 'supplier_admin' ||
                      user.role === 'supplier_employee' ||
                      user.supplier_id) && (
                      <Link
                        to="/supplier/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-2.5 mx-1 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                      >
                        <Building2 size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        <span>Portal do Fornecedor</span>
                      </Link>
                    )}
                    <Link
                      to="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2.5 px-3.5 py-2.5 mx-1 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                    >
                      <UserCircle size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      <span>Meu Perfil</span>
                    </Link>
                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-[calc(100%-8px)] text-left flex items-center space-x-2.5 px-3.5 py-2.5 mx-1 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <LogOut size={16} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#F4F7F5] hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <User size={20} />
                <span>Entrar</span>
              </Link>
            )}
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Faixa de Categorias */}
      <HeaderCategories />
    </header>
    {mobileMenu}
    </>
  );
}
