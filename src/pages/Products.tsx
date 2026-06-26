import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Filter, Loader2, SlidersHorizontal, ArrowUpDown, X,
  RotateCcw, Truck, Percent
} from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import { searchProducts } from '../utils/productSearch'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null)
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null)
  const [isPromoOnly, setIsPromoOnly] = useState(false)
  const [isFreeShipping, setIsFreeShipping] = useState(false)
  const [sortBy, setSortBy] = useState<string>('popular')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Pagination & Category filtering states
  const [currentPage, setCurrentPage] = useState(1)
  const [categorySearch, setCategorySearch] = useState('')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const productsPerPage = 21 // múltiplo de 3 colunas → sem linha incompleta no fim

  const [params, setParams] = useSearchParams()

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await productsService.getAll()
        setProducts(data)
      } catch (err: any) {
        console.error('Erro ao carregar produtos:', err)
        setError(err.message || 'Erro ao carregar produtos')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Sync Search Query from URL parameters if redirecting from another page
  useEffect(() => {
    const q = params.get('q') || ''
    setSearchTerm(q)

    const catParam = params.get('category')
    const cats = catParam ? catParam.split(',').filter(Boolean) : []
    setSelectedCategories(cats)

    // FIX: ler 'promo' (não 'promocao') para compatibilidade com /produtos?promo=true
    const promo = params.get('promo') === 'true' || params.get('promocao') === 'true'
    setIsPromoOnly(promo)
    if (promo) {
      setSortBy('discount_desc')
    }
  }, [params])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategories, appliedMinPrice, appliedMaxPrice, isPromoOnly, isFreeShipping, sortBy])

  // Reset all filters helper
  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedCategories([])
    setMinPrice('')
    setMaxPrice('')
    setAppliedMinPrice(null)
    setAppliedMaxPrice(null)
    setIsPromoOnly(false)
    setIsFreeShipping(false)
    setSortBy('popular')
    setCategorySearch('')
    setShowAllCategories(false)
    setParams({})
  }

  const handleToggleCategory = (cat: string) => {
    let newCats: string[]
    if (selectedCategories.map(c => c.toLowerCase()).includes(cat.toLowerCase())) {
      newCats = selectedCategories.filter(c => c.toLowerCase() !== cat.toLowerCase())
    } else {
      newCats = [...selectedCategories, cat]
    }
    setSelectedCategories(newCats)
    
    const newParams = new URLSearchParams(params)
    if (newCats.length > 0) {
      newParams.set('category', newCats.join(','))
    } else {
      newParams.delete('category')
    }
    setParams(newParams)
  }

  const handleClearCategories = () => {
    setSelectedCategories([])
    const newParams = new URLSearchParams(params)
    newParams.delete('category')
    setParams(newParams)
  }

  // Extract all categories dynamically from active products
  const dynamicCategories = useMemo(() => {
    const catsSet = new Set<string>()
    for (const p of products) {
      if (!p.active) continue
      if (p.category) {
        p.category.split(',').forEach(c => {
          const trimmed = c.trim()
          if (trimmed) {
            catsSet.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase())
          }
        })
      }
    }
    return Array.from(catsSet).sort((a, b) => a.localeCompare(b))
  }, [products])

  // Calculate dynamic product counts for categories (only counting active ones)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (!p.active) continue
      const cats = (p.category || 'Outros').split(',').map(c => c.trim().toLowerCase())
      for (const cat of cats) {
        const key = cat.charAt(0).toUpperCase() + cat.slice(1)
        counts[key] = (counts[key] || 0) + 1
      }
    }
    return counts
  }, [products])

  // Filtra as categorias da barra de pesquisa de categorias
  const visibleCategories = useMemo(() => {
    let list = dynamicCategories
    if (categorySearch.trim() !== '') {
      list = list.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
    }
    return list
  }, [dynamicCategories, categorySearch])

  // Limita as categorias a serem exibidas (se não estiver buscando)
  const displayedCategories = useMemo(() => {
    if (showAllCategories || categorySearch.trim() !== '') {
      return visibleCategories
    }
    return visibleCategories.slice(0, 7)
  }, [visibleCategories, showAllCategories, categorySearch])

  // Filter and Sort logic
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim()
    const searchScores = new Map<string, number>()
    const matchingProductIds = new Set<string>()

    if (term) {
      for (const result of searchProducts(products, term)) {
        matchingProductIds.add(result.product.id)
        searchScores.set(result.product.id, result.score)
      }
    }

    const list = products.filter(product => {
      // 1. Search Query Match
      const matchesSearch = !term || matchingProductIds.has(product.id)

      // 2. Category Match
      const matchesCategory = selectedCategories.length === 0 ||
        (product.category && product.category.split(',').map(s => s.trim().toLowerCase()).some(prodCat => 
          selectedCategories.map(c => c.toLowerCase()).includes(prodCat)
        ))

      // 3. Price Filter Match
      const effectivePrice = product.promo_price !== null && product.promo_price !== undefined ? Number(product.promo_price) : Number(product.price)
      const matchesMinPrice = appliedMinPrice === null || effectivePrice >= appliedMinPrice
      const matchesMaxPrice = appliedMaxPrice === null || effectivePrice <= appliedMaxPrice

      // 4. Promo Match
      const matchesPromo = !isPromoOnly || (product.promo_price !== null && product.promo_price !== undefined && product.promo_price < product.price)

      // 5. Free Shipping Match
      const matchesShipping = !isFreeShipping || product.free_shipping === true

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesPromo && matchesShipping
    })

    // Sort Result list
    return [...list].sort((a, b) => {
      const getPrice = (p: Product) => p.promo_price !== null && p.promo_price !== undefined ? Number(p.promo_price) : Number(p.price)
      const getDiscount = (p: Product) => {
        if (p.promo_price && p.price > 0) {
          return ((Number(p.price) - Number(p.promo_price)) / Number(p.price)) * 100
        }
        return 0
      }

      if (sortBy === 'price_asc') {
        return getPrice(a) - getPrice(b)
      }
      if (sortBy === 'price_desc') {
        return getPrice(b) - getPrice(a)
      }
      if (sortBy === 'discount_desc') {
        return getDiscount(b) - getDiscount(a)
      }
      if (term) {
        return (searchScores.get(b.id) || 0) - (searchScores.get(a.id) || 0)
      }
      // 'popular' keeps server/database default (newest first)
      return 0
    })
  }, [products, searchTerm, selectedCategories, appliedMinPrice, appliedMaxPrice, isPromoOnly, isFreeShipping, sortBy])

  // Produtos Paginados
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * productsPerPage
    return filteredProducts.slice(startIndex, startIndex + productsPerPage)
  }, [filteredProducts, currentPage, productsPerPage])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredProducts.length / productsPerPage)
  }, [filteredProducts, productsPerPage])

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault()
    const min = minPrice.trim() !== '' ? parseFloat(minPrice) : null
    const max = maxPrice.trim() !== '' ? parseFloat(maxPrice) : null
    setAppliedMinPrice(min)
    setAppliedMaxPrice(max)
  }

  const hasActiveFilters = selectedCategories.length > 0 || appliedMinPrice !== null || appliedMaxPrice !== null || isPromoOnly || isFreeShipping || searchTerm !== ''

  // Shared Filters JSX
  const renderFiltersList = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Categorias</h3>
        
        {/* Category search input */}
        {dynamicCategories.length > 7 && (
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Filtrar categorias..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
            />
            {categorySearch && (
              <button
                onClick={() => setCategorySearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          <label
            className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCategories.length === 0}
                onChange={handleClearCategories}
                className="h-3.5 w-3.5 text-green-600 border-gray-300 dark:border-gray-700 rounded focus:ring-green-500"
              />
              <span className={selectedCategories.length === 0 ? 'font-bold text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}>
                Todos
              </span>
            </div>
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-medium text-gray-500">
              {products.filter(p => p.active).length}
            </span>
          </label>
          {displayedCategories.map(cat => {
            const isChecked = selectedCategories.map(c => c.toLowerCase()).includes(cat.toLowerCase())
            return (
              <label
                key={cat}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCategory(cat)}
                    className="h-3.5 w-3.5 text-green-600 border-gray-300 dark:border-gray-700 rounded focus:ring-green-500"
                  />
                  <span className={isChecked ? 'font-bold text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}>
                    {cat}
                  </span>
                </div>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-medium text-gray-500">
                  {categoryCounts[cat] || 0}
                </span>
              </label>
            )
          })}
        </div>

        {/* Show more toggle */}
        {visibleCategories.length > 7 && !categorySearch && (
          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="mt-2 text-[11px] text-green-600 dark:text-green-400 font-medium hover:underline flex items-center gap-1"
          >
            {showAllCategories ? 'Ver menos' : `Ver mais (${visibleCategories.length - 7})`}
          </button>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Preço</h3>
        <form onSubmit={handleApplyPrice} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Mínimo"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-gray-400 self-center">—</span>
            <input
              type="number"
              placeholder="Máximo"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
          >
            Aplicar Faixa
          </button>
        </form>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Special Offers / Toggles */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Opções</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPromoOnly}
              onChange={e => {
                const newPromo = e.target.checked
                setIsPromoOnly(newPromo)
                const newParams = new URLSearchParams(params)
                if (newPromo) {
                  newParams.set('promocao', 'true')
                } else {
                  newParams.delete('promocao')
                  newParams.delete('promo')
                }
                setParams(newParams)
              }}
              className="h-4 w-4 text-green-600 border-gray-300 dark:border-gray-700 rounded focus:ring-green-500"
            />
            <span className="flex items-center gap-1.5"><Percent size={13} className="text-red-500"/>Apenas Promoção</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFreeShipping}
              onChange={e => setIsFreeShipping(e.target.checked)}
              className="h-4 w-4 text-green-600 border-gray-300 dark:border-gray-700 rounded focus:ring-green-500"
            />
            <span className="flex items-center gap-1.5"><Truck size={13} className="text-green-600"/>Frete Grátis</span>
          </label>
        </div>
      </div>

      {/* Redundant clear button removed from sidebar. Only the active filters bar "Limpar tudo" button is kept. */}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header section with sorting/filter buttons */}
        <div className="mb-4 flex flex-row items-center justify-between sm:justify-end gap-3">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={16}/>
            Filtros
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-green-500"/>
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <ArrowUpDown size={14} className="text-gray-400"/>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-2 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
            >
              <option value="popular">Ordenar por: Relevância</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="discount_desc">Melhores Descontos</option>
            </select>
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="flex gap-8 items-start">
          
          {/* Sidebar - Desktop (Sem sticky bloqueante para rolar junto com a página) */}
          <aside className="hidden lg:block w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            {renderFiltersList()}
          </aside>

          {/* Catalog Content area */}
          <div className="flex-1 min-w-0">
            {isPromoOnly && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl flex items-center justify-between">
                <h1 className="text-sm font-bold text-green-800 dark:text-green-300">Produtos em promoção</h1>
                <button onClick={handleClearFilters} className="text-xs text-green-700 dark:text-green-400 hover:underline font-semibold cursor-pointer">Limpar filtro</button>
              </div>
            )}
            {/* Active Filters Tag list */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                <span className="text-xs text-gray-400 font-medium">Filtros ativos:</span>
                {selectedCategories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    Categoria: {cat}
                    <button 
                      onClick={() => handleToggleCategory(cat)} 
                      className="hover:opacity-70 p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                    >
                      <X size={11}/>
                    </button>
                  </span>
                ))}
                {searchTerm !== '' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    Busca: "{searchTerm}"
                    <button 
                      onClick={() => {
                        setSearchTerm('')
                        const newParams = new URLSearchParams(params)
                        newParams.delete('q')
                        setParams(newParams)
                      }} 
                      className="hover:opacity-70 p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                    >
                      <X size={11}/>
                    </button>
                  </span>
                )}
                {(appliedMinPrice !== null || appliedMaxPrice !== null) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    Preço: {appliedMinPrice !== null ? `R$ ${appliedMinPrice}` : 'R$ 0'} - {appliedMaxPrice !== null ? `R$ ${appliedMaxPrice}` : '∞'}
                    <button
                      onClick={() => {
                        setMinPrice('')
                        setMaxPrice('')
                        setAppliedMinPrice(null)
                        setAppliedMaxPrice(null)
                      }}
                      className="hover:opacity-70 p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                    >
                      <X size={11}/>
                    </button>
                  </span>
                )}
                {isPromoOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    Apenas Promoções
                    <button onClick={() => {
                      setIsPromoOnly(false)
                      const newParams = new URLSearchParams(params)
                      newParams.delete('promocao')
                  newParams.delete('promo')
                      setParams(newParams)
                    }} className="hover:opacity-70 p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
                      <X size={11}/>
                    </button>
                  </span>
                )}
                {isFreeShipping && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    Frete Grátis
                    <button onClick={() => setIsFreeShipping(false)} className="hover:opacity-70 p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
                      <X size={11}/>
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold ml-auto transition-colors hover:underline"
                >
                  Limpar tudo
                </button>
              </div>
            )}

            {/* Loading / Error States */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-green-600" size={48} />
                <p className="text-sm font-medium text-gray-500">Buscando catálogo de produtos...</p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/60 rounded-2xl p-6 text-center shadow-xs">
                <p className="text-base font-semibold text-red-700 dark:text-red-400">Falha ao obter os produtos</p>
                <p className="text-xs text-gray-500 mt-2">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && !error && paginatedProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3">
                {paginatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Controles de Paginação */}
            {!loading && !error && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredProducts.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
                <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-900 inline-block text-gray-400 mb-4">
                  <SlidersHorizontal size={36}/>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nenhum produto correspondente</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                  Não encontramos nenhum item manipulado ou fórmula correspondente aos filtros selecionados. Tente expandir sua busca.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-5 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw size={14}/>
                  Redefinir Filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Slide-out Filters */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* backdrop */}
          <div
            onClick={() => setMobileFiltersOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          {/* slide container */}
          <div className="relative w-80 bg-white dark:bg-gray-900 h-full p-6 shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800 overflow-y-auto animate-slide-in">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2"><Filter size={18}/>Filtros</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-colors"
                >
                  <X size={20}/>
                </button>
              </div>
              {renderFiltersList()}
            </div>
            
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-8 w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors text-sm shadow-sm"
            >
              Ver {filteredProducts.length} Produto(s)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
