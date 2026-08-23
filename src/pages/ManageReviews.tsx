import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Star,
  Save,
  ArrowUp,
  ArrowDown,
  User,
  CheckCircle,
  Package,
  Search,
  Sparkles,
  MessageSquare,
  Eye,
  EyeOff,
  X
} from 'lucide-react'
import {
  reviewsService,
  Review,
  CreateReviewData,
  AdminProductReview,
  ProductReviewMetrics
} from '../services/reviews.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'
import ImageUpload from '../components/ImageUpload'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'
import { env } from '../config/env'

type ActiveTab = 'products' | 'home'

export default function ManageReviews() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>('products')

  // --- STATE: HOME REVIEWS ---
  const [homeReviews, setHomeReviews] = useState<Review[]>([])
  const [loadingHome, setLoadingHome] = useState(false)
  const [editingHomeReview, setEditingHomeReview] = useState<Review | null>(null)
  const [showCreateHomeForm, setShowCreateHomeForm] = useState(false)
  const [homeFormData, setHomeFormData] = useState<CreateReviewData>({
    name: '',
    rating: 5,
    comment: '',
    product: '',
    date: '',
    avatar: '',
    order: 0,
    active: true,
    show_image: true,
    show_name: true,
    show_date: true,
    show_product: true,
  })

  // --- STATE: PRODUCT REVIEWS ---
  const [productReviews, setProductReviews] = useState<AdminProductReview[]>([])
  const [metrics, setMetrics] = useState<ProductReviewMetrics>({
    total: 0,
    realCount: 0,
    seedActiveCount: 0,
    seedReplacedCount: 0,
    inactiveCount: 0,
  })
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [originFilter, setOriginFilter] = useState<'all' | 'real' | 'seed'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'replaced' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Product Review Modal (Create / Edit)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProductReview, setEditingProductReview] = useState<AdminProductReview | null>(null)
  const [productFormData, setProductFormData] = useState<{
    product_id: string
    name: string
    rating: number
    comment: string
    image: string
    is_anonymous: boolean
    is_seed: boolean
    active: boolean
    date: string
  }>({
    product_id: '',
    name: '',
    rating: 5,
    comment: '',
    image: '',
    is_anonymous: false,
    is_seed: true,
    active: true,
    date: '',
  })

  // Zoom Image Modal
  const [zoomImage, setZoomImage] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 1. Initial Data Loading
  useEffect(() => {
    loadAllCatalogProducts()
    loadHomeReviews()
    loadProductReviews()
  }, [])

  const loadAllCatalogProducts = async () => {
    try {
      const data = await productsService.getAllForAdmin()
      setAllProducts(data)
    } catch (err) {
      console.error('Erro ao carregar lista de produtos:', err)
    }
  }

  const loadHomeReviews = async () => {
    try {
      setLoadingHome(true)
      const data = await reviewsService.getAll(true)
      setHomeReviews(data.sort((a, b) => a.order - b.order))
    } catch (err: any) {
      console.error('Erro ao carregar reviews da home:', err)
      setError(err.message || 'Erro ao carregar reviews da home')
    } finally {
      setLoadingHome(false)
    }
  }

  const loadProductReviews = async () => {
    try {
      setLoadingProducts(true)
      const res = await reviewsService.getProductReviewsAdmin({
        productId: selectedProductId || undefined,
        origin: originFilter,
        status: statusFilter,
        search: searchQuery || undefined,
      })
      setProductReviews(res.reviews)
      setMetrics(res.metrics)
    } catch (err: any) {
      console.error('Erro ao carregar avaliações de produtos:', err)
      setError(err.message || 'Erro ao carregar avaliações de produtos')
    } finally {
      setLoadingProducts(false)
    }
  }

  // Reload when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProductReviews()
    }, 200)
    return () => clearTimeout(timer)
  }, [selectedProductId, originFilter, statusFilter, searchQuery])

  // --- ACTIONS: PRODUCT REVIEWS ---
  const handleOpenCreateProductReview = () => {
    setEditingProductReview(null)
    setProductFormData({
      product_id: selectedProductId || (allProducts[0]?.id || ''),
      name: '',
      rating: 5,
      comment: '',
      image: '',
      is_anonymous: false,
      is_seed: true,
      active: true,
      date: new Date().toISOString().split('T')[0],
    })
    setShowProductModal(true)
  }

  const handleOpenEditProductReview = (rev: AdminProductReview) => {
    setEditingProductReview(rev)
    const formattedDate = rev.created_at ? new Date(rev.created_at).toISOString().split('T')[0] : ''
    setProductFormData({
      product_id: rev.product_id,
      name: rev.name || '',
      rating: rev.rating,
      comment: rev.comment || '',
      image: rev.image || '',
      is_anonymous: !!rev.is_anonymous,
      is_seed: !!rev.is_seed,
      active: rev.active !== false,
      date: formattedDate,
    })
    setShowProductModal(true)
  }

  const handleSaveProductReview = async () => {
    if (!productFormData.product_id) {
      alert('Selecione um produto')
      return
    }

    try {
      if (editingProductReview) {
        await reviewsService.updateProductReviewAdmin(editingProductReview.id, {
          name: productFormData.name || undefined,
          rating: productFormData.rating,
          comment: productFormData.comment || '',
          image: productFormData.image || null,
          is_anonymous: productFormData.is_anonymous,
          is_seed: productFormData.is_seed,
          active: productFormData.active,
          date: productFormData.date || undefined,
        })
      } else {
        await reviewsService.createProductReviewAdmin({
          product_id: productFormData.product_id,
          name: productFormData.name || 'Cliente Satisfeito',
          rating: productFormData.rating,
          comment: productFormData.comment || '',
          image: productFormData.image || null,
          is_anonymous: productFormData.is_anonymous,
          is_seed: productFormData.is_seed,
          active: productFormData.active,
          date: productFormData.date || undefined,
        })
      }
      setShowProductModal(false)
      setEditingProductReview(null)
      await loadProductReviews()
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar avaliação do produto')
    }
  }

  const handleToggleProductReviewActive = async (id: string) => {
    try {
      await reviewsService.toggleProductReviewActive(id)
      await loadProductReviews()
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status da avaliação')
    }
  }

  const handleDeleteProductReview = (id: string) => {
    confirm.show('Tem certeza que deseja excluir esta avaliação de produto?', async () => {
      try {
        setDeletingId(id)
        await reviewsService.deleteProductReviewAdmin(id)
        await loadProductReviews()
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir avaliação de produto')
      } finally {
        setDeletingId(null)
      }
    })
  }

  // --- ACTIONS: HOME REVIEWS ---
  const handleCreateHome = async () => {
    if (!homeFormData.comment || homeFormData.rating === undefined) {
      alert('Por favor, preencha o comentário e selecione a avaliação (estrelas)')
      return
    }
    try {
      const maxOrder = homeReviews.length > 0 ? Math.max(...homeReviews.map(r => r.order)) : -1
      await reviewsService.create({
        ...homeFormData,
        order: maxOrder + 1,
      })
      await loadHomeReviews()
      setShowCreateHomeForm(false)
    } catch (err: any) {
      alert(err.message || 'Erro ao criar review')
    }
  }

  const handleUpdateHome = async () => {
    if (!editingHomeReview) return
    if (!homeFormData.comment || homeFormData.rating === undefined) {
      alert('Por favor, preencha o comentário e selecione a avaliação (estrelas)')
      return
    }
    try {
      await reviewsService.update(editingHomeReview.id, homeFormData)
      await loadHomeReviews()
      setEditingHomeReview(null)
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar review')
    }
  }

  const handleDeleteHome = (id: string) => {
    confirm.show('Tem certeza que deseja excluir esta avaliação da home?', async () => {
      try {
        setDeletingId(id)
        await reviewsService.delete(id)
        await loadHomeReviews()
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir review')
      } finally {
        setDeletingId(null)
      }
    })
  }

  const handleMoveHome = async (review: Review, direction: 'up' | 'down') => {
    const currentIndex = homeReviews.findIndex(r => r.id === review.id)
    if (currentIndex === -1) return
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= homeReviews.length) return
    const newReviews = [...homeReviews]
    const [removed] = newReviews.splice(currentIndex, 1)
    newReviews.splice(newIndex, 0, removed)
    const reviewIds = newReviews.map((r) => r.id)
    try {
      await reviewsService.reorder(reviewIds)
      await loadHomeReviews()
    } catch (err: any) {
      alert(err.message || 'Erro ao reordenar reviews')
    }
  }

  const getFullImageUrl = (path?: string | null) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    return `${env.apiUrl}${path}`
  }

  // Filtered products list for selector
  const productOptions = useMemo(() => {
    return allProducts.map(p => ({
      id: p.id,
      name: p.name,
      archived: !!p.archived,
      active: !!p.active
    }))
  }, [allProducts])

  return (
    <div className="w-full min-h-screen bg-gray-50/50 dark:bg-[#0c121e] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer text-sm font-medium"
          >
            <ArrowLeft size={18} className="mr-2" />
            Voltar ao Painel
          </button>

          {activeTab === 'products' ? (
            <button
              onClick={handleOpenCreateProductReview}
              className="flex items-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} className="mr-2" />
              Adicionar Avaliação de Produto
            </button>
          ) : (
            <button
              onClick={() => {
                setHomeFormData({
                  name: '',
                  rating: 5,
                  comment: '',
                  product: '',
                  date: '',
                  avatar: '',
                  order: 0,
                  active: true,
                  show_image: true,
                  show_name: true,
                  show_date: true,
                  show_product: true,
                })
                setShowCreateHomeForm(true)
                setEditingHomeReview(null)
              }}
              className="flex items-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} className="mr-2" />
              Adicionar Depoimento da Home
            </button>
          )}
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Central de Avaliações
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie as avaliações individuais de produtos da loja e os depoimentos da página inicial
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-8 gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Package size={18} />
            <span>Avaliações dos Produtos</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 font-semibold">
              {metrics.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare size={18} />
            <span>Depoimentos da Página Inicial</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
              {homeReviews.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: AVALIAÇÕES DOS PRODUTOS */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            
            {/* Metric Badges / Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                  Total de Avaliações
                </span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metrics.total}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">Cadastradas no catálogo</span>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm flex flex-col bg-emerald-50/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} /> Avaliações Reais
                </span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {metrics.realCount}
                </span>
                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                  Clientes verificados
                </span>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 shadow-sm flex flex-col bg-purple-50/20">
                <span className="text-xs text-purple-700 dark:text-purple-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Seeds Ativas
                </span>
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
                  {metrics.seedActiveCount}
                </span>
                <span className="text-[11px] text-purple-600/80 dark:text-purple-400/70 mt-0.5">
                  Exibidas na loja
                </span>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex flex-col bg-amber-50/20">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <EyeOff size={14} /> Seeds Substituídas
                </span>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {metrics.seedReplacedCount}
                </span>
                <span className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                  Substituídas por reais
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente, texto..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                {/* Product Select */}
                <div>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Todos os Produtos ({allProducts.length})</option>
                    {productOptions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {!p.active ? '(Inativo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Origin Filter */}
                <div>
                  <select
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="all">Todas as Origens</option>
                    <option value="real">Apenas Reais</option>
                    <option value="seed">Apenas Demonstração (Seed)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Visíveis na Loja</option>
                    <option value="replaced">Substituídas por Reais</option>
                    <option value="inactive">Inativas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product Reviews List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loadingProducts ? (
                <div className="p-12 text-center">
                  <Loader2 className="animate-spin text-primary-600 mx-auto mb-3" size={36} />
                  <p className="text-sm text-gray-500">Carregando avaliações dos produtos...</p>
                </div>
              ) : productReviews.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="mx-auto text-gray-400 mb-3" size={44} />
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Nenhuma avaliação encontrada
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tente ajustar os filtros ou adicione uma nova avaliação.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {productReviews.map((rev) => {
                    const isVisibleInStore = rev.active && !rev.is_replaced
                    return (
                      <div
                        key={rev.id}
                        className={`p-4 sm:p-5 transition-colors hover:bg-gray-50/70 dark:hover:bg-[#131b2e] ${
                          !rev.active ? 'opacity-50 bg-gray-50/30' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          
                          {/* Left: Product & Customer Info */}
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* Product Image */}
                            <div className="flex-shrink-0 relative">
                              {rev.product_image ? (
                                <img
                                  src={getFullImageUrl(rev.product_image) || ''}
                                  alt={rev.product_name || 'Produto'}
                                  className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 bg-white"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                                  {rev.product_name || 'Produto'}
                                </span>

                                {/* Origin Tag */}
                                {rev.is_seed ? (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    Seed / Demonstração
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Avaliação Real
                                  </span>
                                )}

                                {/* Status Tag */}
                                {isVisibleInStore ? (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Eye size={12} /> Visível na Loja
                                  </span>
                                ) : rev.is_replaced ? (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1" title="Oculta na loja pública porque já existem avaliações reais suficientes no produto">
                                    <EyeOff size={12} /> Substituída por Real
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    Inativa
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {rev.is_anonymous ? `${rev.name} (Anônimo)` : rev.name}
                                </span>
                                <div className="flex items-center">
                                  {[...Array(rev.rating)].map((_, i) => (
                                    <Star key={i} size={14} className="text-amber-400 fill-current" />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>

                              {rev.comment ? (
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                  "{rev.comment}"
                                </p>
                              ) : (
                                <span className="inline-block text-[11px] text-gray-400 italic bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded">
                                  Apenas avaliação por estrelas (sem texto)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Attached Image & Action Buttons */}
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {rev.image && (
                              <button
                                type="button"
                                onClick={() => setZoomImage(getFullImageUrl(rev.image))}
                                className="relative group cursor-pointer"
                                title="Ver foto anexada"
                              >
                                <img
                                  src={getFullImageUrl(rev.image) || ''}
                                  alt="Foto da avaliação"
                                  className="w-12 h-12 rounded-xl object-cover border-2 border-primary-500/40 group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye size={16} />
                                </div>
                              </button>
                            )}

                            {/* Toggle Active Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleProductReviewActive(rev.id)}
                              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                rev.active
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={rev.active ? 'Desativar avaliação' : 'Ativar avaliação'}
                            >
                              {rev.active ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditProductReview(rev)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                              title="Editar avaliação"
                            >
                              <Edit size={18} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProductReview(rev.id)}
                              disabled={deletingId === rev.id}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl border border-transparent hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Excluir avaliação"
                            >
                              {deletingId === rev.id ? (
                                <Loader2 className="animate-spin" size={18} />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>

                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DEPOIMENTOS DA PÁGINA INICIAL */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loadingHome ? (
                <div className="p-12 text-center">
                  <Loader2 className="animate-spin text-primary-600 mx-auto mb-3" size={36} />
                  <p className="text-sm text-gray-500">Carregando depoimentos da home...</p>
                </div>
              ) : homeReviews.length === 0 ? (
                <div className="p-12 text-center">
                  <User className="mx-auto text-gray-400 mb-3" size={44} />
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Nenhum depoimento cadastrado
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {homeReviews.map((review, index) => (
                    <div
                      key={review.id}
                      className={`p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        !review.active ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Order Controls */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveHome(review, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Mover para cima"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveHome(review, 'down')}
                            disabled={index === homeReviews.length - 1}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>

                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {review.avatar ? (
                            <img
                              src={review.avatar}
                              alt={review.name}
                              className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&size=64&background=67C090&color=fff&bold=true`
                              }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                              {review.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                              {review.name}
                            </h3>
                            {!review.active && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                Inativa
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                              Posição: {review.order + 1}
                            </span>
                          </div>

                          <div className="flex items-center mb-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="text-yellow-400 fill-current" size={14} />
                            ))}
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            "{review.comment}"
                          </p>

                          {(review.product || review.date) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {review.product && `${review.product}`}
                              {review.product && review.date && ' • '}
                              {review.date && review.date}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingHomeReview(review)
                              setHomeFormData({
                                name: review.name || '',
                                rating: review.rating,
                                comment: review.comment,
                                product: review.product || '',
                                date: review.date || '',
                                avatar: review.avatar || '',
                                order: review.order,
                                active: review.active,
                                show_image: review.show_image !== undefined ? review.show_image : true,
                                show_name: review.show_name !== undefined ? review.show_name : true,
                                show_date: review.show_date !== undefined ? review.show_date : true,
                                show_product: review.show_product !== undefined ? review.show_product : true,
                              })
                              setShowCreateHomeForm(false)
                            }}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteHome(review.id)}
                            disabled={deletingId === review.id}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            title="Excluir"
                          >
                            {deletingId === review.id ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CRIAR / EDITAR AVALIAÇÃO DE PRODUTO */}
        {/* ========================================================================= */}
        <AdminModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          title={editingProductReview ? 'Editar Avaliação de Produto' : 'Nova Avaliação de Produto'}
          widthClass="max-w-2xl"
          footer={
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProductReview}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors flex items-center text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Save size={16} className="mr-2" />
                {editingProductReview ? 'Salvar Alterações' : 'Criar Avaliação'}
              </button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Produto */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Produto *
              </label>
              <select
                value={productFormData.product_id}
                onChange={(e) => setProductFormData(p => ({ ...p, product_id: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Selecione o produto</option>
                {productOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {!p.active ? '(Inativo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Nome do Cliente */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={productFormData.name}
                onChange={(e) => setProductFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Mariana S."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Estrelas */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Avaliação (Estrelas) *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setProductFormData(p => ({ ...p, rating: star }))}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      size={26}
                      className={
                        productFormData.rating >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  {productFormData.rating} estrelas
                </span>
              </div>
            </div>

            {/* Comentário */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Comentário (Opcional - deixe vazio para avaliação apenas de estrelas)
              </label>
              <textarea
                value={productFormData.comment}
                onChange={(e) => setProductFormData(p => ({ ...p, comment: e.target.value }))}
                rows={3}
                placeholder="Ex: Excelente qualidade, comecei a sentir os efeitos logo na primeira semana..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Imagem / Foto do Produto */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Foto do Cliente / Recebimento (Opcional)
              </label>
              <ImageUpload
                value={productFormData.image}
                onChange={(url) => setProductFormData(p => ({ ...p, image: url }))}
                onError={(err) => err && alert(err)}
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Data da Avaliação
              </label>
              <input
                type="date"
                value={productFormData.date}
                onChange={(e) => setProductFormData(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            {/* Switches: Seed, Anônimo, Ativo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Seed / Demo</span>
                <button
                  type="button"
                  onClick={() => setProductFormData(p => ({ ...p, is_seed: !p.is_seed }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    productFormData.is_seed ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    productFormData.is_seed ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Anônimo</span>
                <button
                  type="button"
                  onClick={() => setProductFormData(p => ({ ...p, is_anonymous: !p.is_anonymous }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    productFormData.is_anonymous ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    productFormData.is_anonymous ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Ativa</span>
                <button
                  type="button"
                  onClick={() => setProductFormData(p => ({ ...p, active: !p.active }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    productFormData.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    productFormData.active ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

          </div>
        </AdminModal>

        {/* ========================================================================= */}
        {/* MODAL: CRIAR / EDITAR DEPOIMENTO DA HOME */}
        {/* ========================================================================= */}
        <AdminModal
          isOpen={!!(showCreateHomeForm || editingHomeReview)}
          onClose={() => {
            setShowCreateHomeForm(false)
            setEditingHomeReview(null)
          }}
          title={editingHomeReview ? 'Editar Depoimento da Home' : 'Novo Depoimento da Home'}
          widthClass="max-w-2xl"
          footer={
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateHomeForm(false)
                  setEditingHomeReview(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={editingHomeReview ? handleUpdateHome : handleCreateHome}
                disabled={!homeFormData.comment || homeFormData.rating === undefined}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Save size={16} className="mr-2" />
                {editingHomeReview ? 'Salvar' : 'Criar'}
              </button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Imagem do Avatar (Opcional)
              </label>
              <ImageUpload
                value={homeFormData.avatar || ''}
                onChange={(url) => setHomeFormData(prev => ({ ...prev, avatar: url }))}
                onError={(err) => err && alert(err)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={homeFormData.name}
                onChange={(e) => setHomeFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="Ex: Maria Silva"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Avaliação (Estrelas) *
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setHomeFormData(prev => ({ ...prev, rating }))}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      size={26}
                      className={
                        homeFormData.rating >= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 dark:text-gray-600'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Comentário *
              </label>
              <textarea
                value={homeFormData.comment}
                onChange={(e) => setHomeFormData(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="Ex: Excelente qualidade! Os suplementos são perfeitos..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Produto Mencionado
              </label>
              <input
                type="text"
                value={homeFormData.product || ''}
                onChange={(e) => setHomeFormData(prev => ({ ...prev, product: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="Ex: Vitamina D3"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                Tempo Decorrido
              </label>
              <input
                type="text"
                value={homeFormData.date || ''}
                onChange={(e) => setHomeFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="Ex: Há 2 semanas, Há 1 mês"
              />
            </div>

            {/* Ativo toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Depoimento Ativo na Home</span>
              <button
                type="button"
                onClick={() => setHomeFormData(prev => ({ ...prev, active: !prev.active }))}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  homeFormData.active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  homeFormData.active ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </AdminModal>

        {/* ========================================================================= */}
        {/* MODAL: ZOOM DA IMAGEM */}
        {/* ========================================================================= */}
        {zoomImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setZoomImage(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden shadow-2xl">
              <button
                onClick={() => setZoomImage(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer z-10"
              >
                <X size={20} />
              </button>
              <img
                src={zoomImage}
                alt="Foto ampliada da avaliação"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
