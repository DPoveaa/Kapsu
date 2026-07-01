import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, Loader2, Truck, CheckCircle, AlertCircle,
  Info, Star, ChevronLeft, ChevronRight, X, ShieldCheck,
  RefreshCw, Plus, Minus, ArrowLeft, FlaskConical, Activity,
  AlertTriangle, Check, Camera, Trash2, MessageSquare,
  Share2, Heart
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import { uploadService } from '../services/upload.service'
import { env } from '../config/env'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { animateAddToCart } from '../utils/cartFlyAnimation'
import { generateProductUrl, parseProductId } from '../utils/productUrl'

interface ProductDetails {
  id: string
  name: string
  description: string | null
  price: number
  image: string | null
  category: string | null
  compositions: string | null
  indication: string | null
  contraindication: string | null
  benefits: string | null
}

const getProductBenefits = (productName: string, category: string | null) => {
  const nameLower = productName.toLowerCase()
  const catLower = (category || '').toLowerCase()

  if (nameLower.includes('vitamina') || nameLower.includes('cabelo') || catLower.includes('cabelo') || catLower.includes('vitamina')) {
    return [
      "Auxilia no crescimento saudável dos fios",
      "Fortalece e reduz a queda capilar",
      "Rico em vitaminas e minerais essenciais",
      "Mais brilho, força e resistência",
      "Fácil de consumir, ideal para o dia a dia"
    ]
  }

  if (nameLower.includes('colágeno') || nameLower.includes('pele') || catLower.includes('pele') || catLower.includes('colágeno')) {
    return [
      "Melhora a elasticidade e firmeza da pele",
      "Reduz linhas de expressão e rugas",
      "Fortalece unhas e cabelos",
      "Hidratação profunda de dentro para fora",
      "Fórmula com alta absorção pelo organismo"
    ]
  }

  return [
    "Fórmula de alta eficácia comprovada",
    "Ingredientes premium selecionados",
    "Auxilia no bem-estar e vitalidade diária",
    "Livre de glúten e conservantes artificiais",
    "Fácil absorção e resultados rápidos"
  ]
}


export default function ProductDetail() {
  const { idSlug } = useParams<{ idSlug: string }>()
  const id = idSlug ? parseProductId(idSlug) : undefined
  const navigate = useNavigate()
  const location = useLocation()
  const { addProduct, items } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const addToCartBtnRef = useRef<HTMLButtonElement>(null)

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [isEligible, setIsEligible] = useState(false)
  const [eligibilityMessage, setEligibilityMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!(localStorage.getItem('sanare_token') || localStorage.getItem('token')))
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [activeReviewImage, setActiveReviewImage] = useState<string | null>(null)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isEditingReview, setIsEditingReview] = useState(false)

  // Zoom State
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 })
  const [isZoomed, setIsZoomed] = useState(false)

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Tabs State
  const [activeTab, setActiveTab] = useState<'description' | 'compositions' | 'indication' | 'contraindication'>('description')

  // Success button micro-animation state
  const [isAdded, setIsAdded] = useState(false)

  // Load product
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError('ID do produto não fornecido')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await productsService.getById(id)
        setProduct(data)

        // Redirect 301: if slug is missing or wrong in URL, navigate to canonical URL
        const expectedUrl = generateProductUrl(data)
        if (location.pathname !== expectedUrl) {
          navigate(expectedUrl, { replace: true })
        }

        try {
          const response = await fetch(`${env.apiUrl}/products/${id}`)
          const text = await response.text()
          if (text) {
            const fullData = JSON.parse(text)
            if (fullData.success && fullData.data) {
              setProductDetails(fullData.data)
            }
          }
        } catch (err) {
          console.warn('Não foi possível carregar detalhes completos do produto')
        }
      } catch (err: any) {
        console.error('Erro ao carregar produto:', err)
        setError(err.message || 'Erro ao carregar produto')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [id])

  // Load reviews and eligibility
  useEffect(() => {
    const loadReviewsAndEligibility = async () => {
      if (!id) return
      try {
        setLoadingReviews(true)
        const reviewsData = await productsService.getProductReviews(id)
        setReviews(reviewsData)

        const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
        if (token) {
          setIsLoggedIn(true)
          const eligRes = await productsService.checkReviewEligibility(id)
          setIsEligible(eligRes.eligible)
          setEligibilityMessage(eligRes.message || '')
          setHasReviewed(eligRes.hasReviewed || false)

          if (eligRes.existingReview) {
            setNewRating(eligRes.existingReview.rating)
            setNewComment(eligRes.existingReview.comment)
            setIsAnonymous(eligRes.existingReview.is_anonymous || false)
            // We can't easily preset the image file input, but we could display it
          }
        } else {
          setIsLoggedIn(false)
          setIsEligible(false)
          setEligibilityMessage('Faça login para avaliar este produto.')
          setHasReviewed(false)
        }
      } catch (err) {
        console.error('Erro ao carregar avaliações/elegibilidade:', err)
      } finally {
        setLoadingReviews(false)
      }
    }

    loadReviewsAndEligibility()
  }, [id])

  // Select first available tab automatically
  useEffect(() => {
    const details = productDetails || product
    if (details) {
      if (details.description) setActiveTab('description')
      else if (details.compositions) setActiveTab('compositions')
      else if (details.indication) setActiveTab('indication')
      else if (details.contraindication) setActiveTab('contraindication')
    }
  }, [productDetails, product])

  // Stepper increment/decrement handlers
  const handleIncrement = () => {
    setQuantity(prev => Math.min(prev + 1, 99))
  }

  const handleDecrement = () => {
    setQuantity(prev => Math.max(prev - 1, 1))
  }

  const handleAddToCart = () => {
    if (product) {
      addProduct(product, quantity)
      setIsAdded(true)
      setTimeout(() => {
        setIsAdded(false)
      }, 1500)
      if (addToCartBtnRef.current) {
        animateAddToCart({ fromElement: addToCartBtnRef.current })
      }
    }
  }

  const handleBuyNow = async () => {
    if (product) {
      const isAlreadyInCart = items.some(item => item.product?.id === product.id)
      if (!isAlreadyInCart) {
        await addProduct(product, quantity)
      }
      navigate('/carrinho')
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = product?.name || 'Produto'
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        const btn = document.getElementById('share-btn')
        if (btn) {
          btn.setAttribute('data-copied', 'true')
          setTimeout(() => btn.removeAttribute('data-copied'), 2000)
        }
      } catch {
        window.prompt('Copie o link:', url)
      }
    }
  }

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  const getReviewImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }
    return `${env.apiUrl}${imagePath}`
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImageFile(e.target.files[0])
      setNewImageUrl(URL.createObjectURL(e.target.files[0]))
    }
  }

  const handleRemoveImage = () => {
    setNewImageFile(null)
    if (newImageUrl) {
      URL.revokeObjectURL(newImageUrl)
      setNewImageUrl(null)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    if (newRating < 1 || newRating > 5) {
      setSubmitError('Por favor, selecione uma nota de 1 a 5 estrelas.')
      return
    }

    if (!newComment.trim()) {
      setSubmitError('Por favor, escreva um comentário sobre o produto.')
      return
    }

    try {
      setSubmittingReview(true)
      setSubmitError(null)

      let imageUrl: string | null = null

      if (newImageFile) {
        const uploadRes = await uploadService.uploadReviewImage(newImageFile)
        imageUrl = uploadRes.data.path
      }

      if (hasReviewed && isEditingReview) {
        await productsService.updateProductReview(id, {
          rating: newRating,
          comment: newComment,
          image: imageUrl || undefined,
          is_anonymous: isAnonymous
        })
      } else {
        await productsService.createProductReview(id, {
          rating: newRating,
          comment: newComment,
          image: imageUrl,
          is_anonymous: isAnonymous
        })
      }

      setSubmitSuccess(true)
      setIsEditingReview(false)

      // Reload reviews
      const updatedReviews = await productsService.getProductReviews(id)
      setReviews(updatedReviews)
      setHasReviewed(true)

      // Optionally clear form or keep it filled so they see what they wrote
      if (!isEditingReview) {
        setNewImageFile(null)
        setNewImageUrl(null)
      }

      setTimeout(() => {
        setSubmitSuccess(false)
      }, 5000)

    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err)
      setSubmitError(err.message || 'Erro ao enviar sua avaliação. Tente novamente.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (rating: number, size = 14) => {
    return (
      <div className="flex text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            fill={i < rating ? 'currentColor' : 'none'}
            className={i < rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}
          />
        ))}
      </div>
    )
  }

  // Gallery images setup
  const productImages = product?.image && product.image.trim() !== '' && product.image !== PRODUCT_IMAGE_FALLBACK
    ? [product.image]
    : [PRODUCT_IMAGE_FALLBACK]

  const handleNextImage = () => {
    if (productImages.length > 1) {
      setSelectedImage((prev) => (prev + 1) % productImages.length)
    }
  }

  const handlePrevImage = () => {
    if (productImages.length > 1) {
      setSelectedImage((prev) => (prev - 1 + productImages.length) % productImages.length)
    }
  }

  // Keyboard controls for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return
      if (e.key === 'Escape') setIsLightboxOpen(false)
      if (e.key === 'ArrowRight') handleNextImage()
      if (e.key === 'ArrowLeft') handlePrevImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, productImages])

  // Mouse Move for Hover Zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setZoomPos({ x, y })
  }

  // Breadcrumbs path computation
  const getCategoryPath = () => {
    if (!product) return []
    const firstCat = product.category ? product.category.split(',')[0].trim() : ''
    const label = firstCat
      ? firstCat.charAt(0).toUpperCase() + firstCat.slice(1).toLowerCase()
      : 'Produtos'
    return [
      { label: 'Início', path: '/' },
      { label: 'Produtos', path: '/produtos' },
      { label: label, path: `/produtos?category=${encodeURIComponent(firstCat || 'all')}` },
      { label: product.name, path: '' }
    ]
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-green-600 dark:text-green-400" size={48} />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Carregando detalhes do produto...</p>
        </div>
      </div>
    )
  }

  // Error State
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md text-center border border-gray-200 dark:border-gray-700 shadow-lg">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-red-605 dark:text-red-400 text-lg font-bold mb-2">
            {error || 'Produto não encontrado'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            O produto que você está procurando não existe, está inativo ou foi arquivado.
          </p>
          <button
            onClick={() => navigate('/produtos')}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-98"
          >
            Voltar para o catálogo
          </button>
        </div>
      </div>
    )
  }

  const discountPct = product.promo_price
    ? Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)
    : 0

  const activeDetails = productDetails || product

  const totalReviews = reviews.length
  const averageRating = totalReviews > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-[#0A0F0D] dark:via-[#0E131F] dark:to-[#0A0F0D] pb-16 text-gray-700 dark:text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Voltar button & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-white/5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm w-fit cursor-pointer animate-fade-in"
          >
            <ArrowLeft size={14} /> Voltar
          </button>

          <nav className="text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              {getCategoryPath().map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  {index > 0 && <span className="text-gray-700 font-semibold">{'>'}</span>}
                  {item.path ? (
                    <button
                      onClick={() => navigate(item.path)}
                      className="hover:text-[#00C878] transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-[#00C878] font-bold truncate max-w-[150px] sm:max-w-none">{item.label}</span>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* main container grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Gallery card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#131926]/90 backdrop-blur-md rounded-[24px] border border-gray-200 dark:border-white/5 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20 h-full flex flex-col justify-between">
            <div
              className="relative overflow-hidden cursor-zoom-in bg-gray-50 dark:bg-gradient-to-br dark:from-[#0B1F17] dark:via-[#0A0F0D] dark:to-[#0E131F] rounded-2xl border border-gray-200 dark:border-white/5 aspect-square flex items-center justify-center select-none"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onClick={() => setIsLightboxOpen(true)}
            >
              <img
                src={productImages[selectedImage] || PRODUCT_IMAGE_FALLBACK}
                alt={product?.name || ''}
                className="w-full h-full object-cover transition-transform duration-100 ease-out"
                style={{
                  transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                  transformOrigin: isZoomed ? `${zoomPos.x}% ${zoomPos.y}%` : 'center',
                }}
                onError={handleProductImageError}
              />
            </div>

            {/* Thumbnails list with buttons */}
            <div className="flex items-center justify-between gap-2 mt-4">
              {productImages.length > 1 && (
                <button
                  onClick={handlePrevImage}
                  className="p-1.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer border border-gray-200 dark:border-white/5"
                  title="Imagem anterior"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="flex-1 flex gap-3 overflow-x-auto py-1 justify-center scrollbar-none">
                {productImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-gray-50 dark:bg-[#0A0F0D]/60 flex-shrink-0 transition-all ${selectedImage === index
                      ? 'border-[#00C878] scale-105 shadow-sm'
                      : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                      }`}
                  >
                    <img
                      src={img}
                      alt={`${product?.name || ''} thumbnail ${index + 1}`}
                      className="w-full h-full object-contain p-1"
                      onError={handleProductImageError}
                    />
                  </button>
                ))}
              </div>
              {productImages.length > 1 && (
                <button
                  onClick={handleNextImage}
                  className="p-1.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer border border-gray-200 dark:border-white/5"
                  title="Próxima imagem"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Buy box */}
          <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-6">

            {/* Title, heart and share buttons */}
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleFavorite(product)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-md ${isFavorite(product.id)
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 border-gray-200 dark:border-white/5'
                    }`}
                  title={isFavorite(product.id) ? "Remover dos favoritos" : "Favoritar"}
                >
                  <Heart size={18} fill={isFavorite(product.id) ? "currentColor" : "none"} />
                </button>
                <button
                  id="share-btn"
                  onClick={handleShare}
                  className="p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-[#00C878] rounded-xl text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 transition-all cursor-pointer shadow-md group relative"
                  title="Compartilhar"
                >
                  <Share2 size={18} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-data-[copied=true]:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                    Link copiado!
                  </span>
                </button>
              </div>
            </div>

            {/* Stars & Reviews */}
            <div className="flex items-center gap-2 text-xs">
              {renderStars(Math.round(averageRating))}
              {totalReviews > 0 ? (
                <a
                  href="#reviews-section"
                  className="text-gray-500 dark:text-gray-400 hover:text-[#00C878] font-semibold transition-colors"
                >
                  ({totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'})
                </a>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 font-medium">Nenhuma avaliação ainda</span>
              )}
            </div>

            <hr className="border-gray-205 dark:border-gray-700" />

            {/* Price section */}
            <div className="space-y-1">
              {product.promo_price ? (
                <div className="space-y-1">
                  <span className="text-xs text-gray-400 line-through">De R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl font-extrabold text-primary-600 dark:text-primary-400">
                      R$ {Number(product.promo_price).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold px-2 py-1 rounded-lg border border-primary-200 dark:border-primary-900/30 animate-pulse">
                      {discountPct}% OFF
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                  R$ {Number(product.price).toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            {/* Delivery notice */}
            {product.free_shipping ? (
              <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-4 flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  <Truck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">Frete Grátis Disponível</h4>
                  <p className="text-[11px] text-green-700 dark:text-green-400 mt-0.5">Receba no seu endereço com frete 100% grátis em até 3 dias úteis.</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <Truck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Envio Rápido para Todo o Brasil</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Envio imediato após a confirmação do pagamento.</p>
                </div>
              </div>
            )}

            {/* Stock and Stepper quantity selector */}
            <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3.5 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Disponibilidade</span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" /> Estoque Disponível
                </span>
              </div>

              <div className="flex items-center border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl p-1">
                <button
                  onClick={handleDecrement}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg transition-colors active:scale-90"
                  title="Diminuir quantidade"
                >
                  <Minus size={14} />
                </button>
                <span className="px-3.5 text-xs font-extrabold text-gray-800 dark:text-gray-200 select-none min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg transition-colors active:scale-90"
                  title="Aumentar quantidade"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* CTA Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                disabled={!product.active}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-101 duration-200 uppercase tracking-wide animate-pulse-subtle"
              >
                Comprar agora
              </button>

              <button
                ref={addToCartBtnRef}
                onClick={handleAddToCart}
                disabled={!product.active}
                className={`w-full py-3.5 border font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed duration-200 uppercase tracking-wide ${isAdded
                  ? 'bg-green-600 border-green-600 text-white animate-fade-in'
                  : 'border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
                  }`}
              >
                {isAdded ? (
                  <>
                    <Check size={16} /> Adicionado!
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} /> Adicionar ao carrinho
                  </>
                )}
              </button>

              {!product.active && (
                <p className="text-red-500 text-center text-xs font-semibold animate-pulse">Este produto está temporariamente indisponível.</p>
              )}
            </div>

            {/* Secure & Trust Guarantees */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-gray-400 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700/60">
              <div className="flex flex-col items-center gap-1.5 p-1">
                <ShieldCheck size={18} className="text-gray-400 dark:text-gray-400" />
                <span className="font-semibold leading-tight">Compra 100% Segura</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-1">
                <RefreshCw size={16} className="text-gray-400 dark:text-gray-400" />
                <span className="font-semibold leading-tight">7 dias de Devolução</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-1">
                <CheckCircle size={16} className="text-gray-400 dark:text-gray-400" />
                <span className="font-semibold leading-tight">Fórmula Aprovada</span>
              </div>
            </div>

          </div>

          {/* Benefícios do Produto Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#131926]/90 backdrop-blur-md rounded-[24px] border border-gray-200 dark:border-white/5 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20 space-y-4 animate-fade-in h-full flex flex-col">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Benefícios do Produto</h3>
            <ul className="space-y-3">
              {(productDetails?.benefits
                ? productDetails.benefits.split('\n').map(b => b.trim()).filter(Boolean)
                : getProductBenefits(product.name, product.category)
              ).map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="p-1 bg-emerald-500/10 text-[#00C878] rounded-full flex-shrink-0 border border-emerald-500/20">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical details tabs card */}
          <div className="lg:col-span-7 bg-white dark:bg-[#131926]/90 backdrop-blur-md rounded-[24px] border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-black/20 h-full flex flex-col">
            <div className="border-b border-gray-200 dark:border-white/5 px-6 flex gap-6 overflow-x-auto scrollbar-none">
              {activeDetails.description && (
                <button
                  onClick={() => setActiveTab('description')}
                  className={`flex items-center gap-1.5 py-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${activeTab === 'description'
                    ? 'text-[#00C878] border-[#00C878]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent'
                    }`}
                >
                  <Info size={14} /> Detalhes
                </button>
              )}
              {activeDetails.compositions && (
                <button
                  onClick={() => setActiveTab('compositions')}
                  className={`flex items-center gap-1.5 py-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${activeTab === 'compositions'
                    ? 'text-[#00C878] border-[#00C878]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent'
                    }`}
                >
                  <FlaskConical size={14} /> Composição
                </button>
              )}
              {activeDetails.indication && (
                <button
                  onClick={() => setActiveTab('indication')}
                  className={`flex items-center gap-1.5 py-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${activeTab === 'indication'
                    ? 'text-[#00C878] border-[#00C878]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent'
                    }`}
                >
                  <Activity size={14} /> Indicações
                </button>
              )}
              {activeDetails.contraindication && (
                <button
                  onClick={() => setActiveTab('contraindication')}
                  className={`flex items-center gap-1.5 py-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${activeTab === 'contraindication'
                    ? 'text-[#00C878] border-[#00C878]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent'
                    }`}
                >
                  <AlertTriangle size={14} /> Contraindicações
                </button>
              )}
            </div>

            {/* Tab panels */}
            <div className="p-6 min-h-[180px] lg:min-h-[200px] overflow-y-auto">
              {activeTab === 'description' && activeDetails.description && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-xs sm:text-sm text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {activeDetails.description}
                  </p>
                </div>
              )}

              {activeTab === 'compositions' && activeDetails.compositions && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-xs sm:text-sm text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {activeDetails.compositions}
                  </p>
                </div>
              )}

              {activeTab === 'indication' && activeDetails.indication && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-xs sm:text-sm text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {activeDetails.indication}
                  </p>
                </div>
              )}

              {activeTab === 'contraindication' && activeDetails.contraindication && (
                <div className="animate-fade-in space-y-3">
                  <div className="p-4 rounded-xl bg-orange-500/10 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 flex gap-3">
                    <AlertTriangle className="text-orange-600 dark:text-orange-500 flex-shrink-0" size={18} />
                    <p className="text-xs sm:text-sm text-orange-850 dark:text-orange-300 leading-relaxed whitespace-pre-line">
                      {activeDetails.contraindication}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Real Reviews Section */}
        <div id="reviews-section" className="mt-12 bg-white dark:bg-[#131926]/90 backdrop-blur-md rounded-[24px] border border-gray-200 dark:border-white/5 p-6 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/20">
          <div className="flex flex-col gap-6">
            <div className="border-b border-gray-200 dark:border-white/5 pb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                Avaliações dos Clientes
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">

              {/* Ratings Summary (lg:col-span-4) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                    {totalReviews > 0 ? averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500">/ 5</span>
                </div>

                <div className="flex flex-col gap-1">
                  {renderStars(Math.round(averageRating), 18)}
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    Baseado em {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
                  </span>
                </div>

                {/* Stars distribution progress bars */}
                <div className="flex flex-col gap-2.5 mt-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter((r) => r.rating === star).length
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

                    const displayPct = Math.round(percentage)

                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-3 font-semibold text-gray-605 dark:text-gray-300">{star}</span>
                        <Star size={12} className="text-[#00C878] fill-[#00C878] flex-shrink-0" />
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-[#0A0F0D]/60 rounded-full overflow-hidden border border-gray-200 dark:border-white/5">
                          <div
                            className="h-full bg-[#00C878] rounded-full transition-all duration-500"
                            style={{ width: `${displayPct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-400 dark:text-gray-500 font-medium">
                          {displayPct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* REVIEWS LIST ON THE RIGHT (lg:col-span-8) */}
              <div className="lg:col-span-8 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-white/5 pt-6 lg:pt-0 lg:pl-8 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Todas as Opiniões ({reviews.length})
                  </h3>
                  {reviews.length > 2 && (
                    <div className="flex gap-2 hidden md:flex">
                      <button
                        onClick={() => {
                          const container = document.getElementById('reviews-scroll-container')
                          if (container) container.scrollBy({ left: -300, behavior: 'smooth' })
                        }}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const container = document.getElementById('reviews-scroll-container')
                          if (container) container.scrollBy({ left: 300, behavior: 'smooth' })
                        }}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {loadingReviews ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="animate-spin text-[#00C878] mb-2" size={24} />
                    <p className="text-xs text-gray-500">Carregando avaliações...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50 dark:bg-[#0A0F0D]/20 animate-fade-in">
                    <Star size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                    <p className="text-xs text-gray-500 dark:text-gray-450 font-semibold">
                      Nenhuma avaliação para este produto ainda.
                    </p>
                  </div>
                ) : (
                  <div id="reviews-scroll-container" className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="w-[280px] sm:w-[320px] flex-shrink-0 snap-start bg-gray-50 dark:bg-[#0A0F0D]/60 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {rev.is_anonymous ? 'Anônimo' : rev.name}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-450">
                                {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                                {new Date(rev.updated_at).getTime() > new Date(rev.created_at).getTime() + 1000 && (
                                  <span className="ml-1 italic opacity-75">(Editada em {new Date(rev.updated_at).toLocaleDateString('pt-BR')})</span>
                                )}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              {renderStars(rev.rating, 12)}
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic line-clamp-4">
                            "{rev.comment}"
                          </p>
                        </div>

                        {rev.image && (
                          <div className="mt-1">
                            <img
                              src={getReviewImageUrl(rev.image) || PRODUCT_IMAGE_FALLBACK}
                              alt="Foto da avaliação"
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-white/5 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                              onClick={() => setActiveReviewImage(getReviewImageUrl(rev.image))}
                              onError={handleProductImageError}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Form to submit review AT THE BOTTOM */}
          <div id="review-form-anchor" className="mt-8 border-t border-gray-200 dark:border-white/5 pt-8 max-w-3xl mx-auto">
            {isEligible ? (
              !isEditingReview && hasReviewed ? (
                <div className="bg-gray-50 dark:bg-[#0A0F0D]/40 border border-[#00C878]/30 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 text-[#00C878] rounded-xl border border-emerald-500/20 mt-1">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">Você já avaliou este produto</h4>
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                        Obrigado pelo seu feedback! Ele ajuda outros clientes a tomarem a melhor decisão.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingReview(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-transparent border-2 border-[#00C878] hover:bg-[#00C878] text-[#00C878] hover:text-white text-sm font-bold rounded-xl transition-all cursor-pointer text-center whitespace-nowrap"
                  >
                    Editar avaliação
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-5 bg-white dark:bg-[#131926]/40 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                    <span>{isEditingReview ? 'Editar sua Avaliação' : 'Deixe sua Avaliação'}</span>
                    {isEditingReview && (
                      <button
                        type="button"
                        onClick={() => setIsEditingReview(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </h3>

                  {/* Star selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Sua Nota
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Star
                            size={32}
                            fill={star <= newRating ? "currentColor" : "none"}
                            className={star <= newRating ? "text-amber-400" : "text-gray-600"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comments textarea */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="comment" className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Seu Comentário
                    </label>
                    <textarea
                      id="comment"
                      rows={4}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="O que você achou deste produto? Conte-nos sua experiência..."
                      className="w-full text-sm p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0A0F0D]/60 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#00C878] focus:border-transparent outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Image uploader */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Adicionar Foto (opcional)
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer text-sm font-semibold text-gray-700 dark:text-white transition-colors">
                        <Camera size={16} />
                        <span>Selecionar Imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>

                      {newImageUrl && (
                        <div className="relative flex items-center gap-2 p-1.5 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50 dark:bg-[#0A0F0D]/60">
                          <img
                            src={newImageUrl}
                            alt="Pré-visualização"
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="p-1 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Remover imagem"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Anonymous toggle */}
                  <div className="flex items-center gap-2 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C878]"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
                        Avaliar anonimamente
                      </span>
                    </label>
                  </div>

                  {/* Error & Success Messages */}
                  {submitError && (
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-red-950/20 border border-red-900/35 text-sm text-red-400">
                      <AlertCircle size={18} className="flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-green-950/20 border border-green-900/35 text-sm text-[#00C878]">
                      <CheckCircle size={18} className="flex-shrink-0" />
                      <span>{isEditingReview ? 'Avaliação atualizada com sucesso!' : 'Avaliação enviada com sucesso! Obrigado pelo feedback.'}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#00C878] hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <span>{isEditingReview ? 'Salvar Alterações' : 'Enviar Avaliação'}</span>
                      )}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="bg-gray-50 dark:bg-[#0A0F0D]/40 border border-gray-200 dark:border-white/5 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-emerald-500/10 text-[#00C878] rounded-2xl border border-emerald-500/20">
                  <MessageSquare size={32} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Avalie este produto</h4>
                  <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
                    {eligibilityMessage || 'Sua opinião é muito importante para nós e para outros clientes.'}
                  </p>
                </div>
                {!isLoggedIn && (
                  <button
                    onClick={() => navigate('/login')}
                    className="mt-2 px-8 py-3 bg-transparent border-2 border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/5 text-sm font-bold text-gray-700 dark:text-white rounded-xl transition-all cursor-pointer"
                  >
                    Faça login para avaliar
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ═══════════════ LIGHTBOX MODAL (Image Fullscreen) ════════════════════ */}
      {isLightboxOpen && productImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col justify-between p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button at top-right */}
          <div className="flex justify-end p-2">
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10 cursor-pointer"
              title="Fechar (ESC)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main image layout with setas */}
          <div className="flex-1 flex items-center justify-between gap-4 max-w-6xl mx-auto w-full">

            {/* Left arrow */}
            {productImages.length > 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevImage() }}
                className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10 flex-shrink-0 disabled:opacity-40 cursor-pointer"
                title="Imagem anterior (Seta Esquerda)"
              >
                <ChevronLeft size={24} />
              </button>
            ) : <div className="w-14" />}

            {/* Centered Image */}
            <div
              className="max-h-[75vh] max-w-[80vw] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={productImages[selectedImage]}
                alt={product?.name || ''}
                className="max-h-[75vh] max-w-[80vw] object-contain rounded-xl select-none"
                onError={handleProductImageError}
              />
            </div>

            {/* Right arrow */}
            {productImages.length > 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextImage() }}
                className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10 flex-shrink-0 disabled:opacity-40 cursor-pointer"
                title="Próxima imagem (Seta Direita)"
              >
                <ChevronRight size={24} />
              </button>
            ) : <div className="w-14" />}

          </div>

          {/* Thumbnails indicator at the bottom */}
          {productImages.length > 1 && (
            <div className="flex gap-2 justify-center pb-4" onClick={(e) => e.stopPropagation()}>
              {productImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-3.5 h-3.5 rounded-full transition-all border border-white/20 ${selectedImage === idx ? 'bg-[#00C878] w-7' : 'bg-gray-700'
                    }`}
                  title={`Ir para imagem ${idx + 1}`}
                />
              ))}
            </div>
          )}

        </div>
      )}

      {/* ═══════════════ REVIEW IMAGE LIGHTBOX MODAL ════════════════════ */}
      {activeReviewImage && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex flex-col justify-center items-center p-4 animate-fade-in"
          onClick={() => setActiveReviewImage(null)}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setActiveReviewImage(null)}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10 cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="max-h-[85vh] max-w-[90vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeReviewImage || undefined}
              alt="Foto da avaliação ampliada"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl select-none"
            />
          </div>
        </div>
      )}


    </div>
  )
}
