import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Loader2, Truck, CheckCircle, AlertCircle,
  Info, Star, ChevronLeft, ChevronRight, X, ShieldCheck,
  RefreshCw, Plus, Minus, ArrowLeft, FlaskConical, Activity,
  AlertTriangle, Check, Camera, Trash2, MessageSquare
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import { uploadService } from '../services/upload.service'
import { env } from '../config/env'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'

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
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [isEligible, setIsEligible] = useState(false)
  const [eligibilityMessage, setEligibilityMessage] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [activeReviewImage, setActiveReviewImage] = useState<string | null>(null)

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
          const eligRes = await productsService.checkReviewEligibility(id)
          setIsEligible(eligRes.eligible)
          setEligibilityMessage(eligRes.message || '')
        } else {
          setIsEligible(false)
          setEligibilityMessage('Faça login para avaliar este produto.')
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
    }
  }

  const handleBuyNow = () => {
    if (product) {
      addProduct(product, quantity)
      navigate('/checkout')
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
    return `${env.apiUrl.replace('/api', '')}${imagePath}`
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

      let uploadedImagePath: string | null = null

      if (newImageFile) {
        const uploadRes = await uploadService.uploadReviewImage(newImageFile)
        if (uploadRes.success && uploadRes.data) {
          uploadedImagePath = uploadRes.data.path
        }
      }

      await productsService.createProductReview(id, {
        rating: newRating,
        comment: newComment,
        image: uploadedImagePath,
      })

      setSubmitSuccess(true)
      setIsEligible(false)
      
      const updatedReviews = await productsService.getProductReviews(id)
      setReviews(updatedReviews)

      setNewComment('')
      setNewRating(5)
      setNewImageFile(null)
      setNewImageUrl(null)
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

  // Gallery images setup (mocks auxiliary packaging/ingredient images for natural theme)
  const productImages = product?.image 
    ? [
        product.image,
        'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600'
      ]
    : []

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

  const finalPrice = product.promo_price || product.price || 0
  const installmentValue = (finalPrice / 12).toFixed(2)
  const discountPct = product.promo_price 
    ? Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)
    : 0

  const activeDetails = productDetails || product

  const totalReviews = reviews.length
  const averageRating = totalReviews > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Voltar button & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors bg-white dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-fit"
          >
            <ArrowLeft size={14}/> Voltar
          </button>
          
          <nav className="text-xs text-gray-500 dark:text-gray-400">
            <div className="flex flex-wrap items-center gap-1.5">
              {getCategoryPath().map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  {index > 0 && <span className="text-gray-300 dark:text-gray-700">/</span>}
                  {item.path ? (
                    <button
                      onClick={() => navigate(item.path)}
                      className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-gray-800 dark:text-white font-semibold truncate max-w-[150px] sm:max-w-none">{item.label}</span>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* main container grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Image Gallery */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Gallery card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div 
                className="relative overflow-hidden cursor-zoom-in bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 aspect-video sm:aspect-square md:max-h-[480px] flex items-center justify-center select-none"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={productImages[selectedImage] || PRODUCT_IMAGE_FALLBACK}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain p-6 transition-transform duration-100 ease-out"
                  style={{
                    transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                    transformOrigin: isZoomed ? `${zoomPos.x}% ${zoomPos.y}%` : 'center',
                  }}
                  onError={handleProductImageError}
                />
                
                {/* Expand overlay tip */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg pointer-events-none">
                  Clique para ampliar
                </div>
              </div>

              {/* Thumbnails list */}
              {productImages.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto py-1 justify-center sm:justify-start">
                  {productImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-white dark:bg-gray-900 flex-shrink-0 transition-all ${
                        selectedImage === index 
                          ? 'border-green-600 dark:border-green-500 scale-105 shadow-sm' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-contain p-1.5"
                        onError={handleProductImageError}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Buy box & Technical Tabs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Buy box */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-6">
              
              {/* Trust Badge & Rating */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-900/50">
                  <ShieldCheck size={12}/> Fórmula Certificada
                </span>
                
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {totalReviews > 0 ? (
                    <>
                      {renderStars(Math.round(averageRating), 14)}
                      <span className="font-bold text-gray-800 dark:text-gray-200">{averageRating.toFixed(1)}</span>
                      <span>({totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'})</span>
                    </>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Sem avaliações ainda</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-955 dark:text-white tracking-tight">{product.name}</h1>
              </div>

              <hr className="border-gray-205 dark:border-gray-700" />

              {/* Price section */}
              <div className="space-y-1">
                {product.promo_price ? (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 line-through">De R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl sm:text-4xl font-extrabold text-red-600 dark:text-red-400">
                        R$ {Number(product.promo_price).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-2 py-1 rounded-lg border border-red-200 dark:border-red-900/30 animate-pulse">
                        {discountPct}% OFF
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-955 dark:text-white">
                    R$ {Number(product.price).toFixed(2).replace('.', ',')}
                  </span>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Ou em até <span className="font-bold text-gray-800 dark:text-gray-200">12x de R$ {installmentValue.replace('.', ',')}</span> sem juros
                </p>
              </div>

              {/* Delivery notice */}
              {product.free_shipping ? (
                <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    <Truck size={18}/>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">Frete Grátis Disponível</h4>
                    <p className="text-[11px] text-green-700 dark:text-green-400 mt-0.5">Receba no seu endereço com frete 100% grátis em até 3 dias úteis.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <Truck size={18}/>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Envio Rápido para Todo o Brasil</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Envio imediato após a confirmação do pagamento, com rastreio em tempo real.</p>
                  </div>
                </div>
              )}

              {/* Stock and Stepper quantity selector */}
              <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3.5 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Disponibilidade</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"/> Estoque Disponível
                  </span>
                </div>
                
                <div className="flex items-center border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl p-1">
                  <button 
                    onClick={handleDecrement}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg transition-colors active:scale-90"
                    title="Diminuir quantidade"
                  >
                    <Minus size={14}/>
                  </button>
                  <span className="px-3.5 text-xs font-extrabold text-gray-800 dark:text-gray-200 select-none min-w-[32px] text-center">
                    {quantity}
                  </span>
                  <button 
                    onClick={handleIncrement}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg transition-colors active:scale-90"
                    title="Aumentar quantidade"
                  >
                    <Plus size={14}/>
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
                  onClick={handleAddToCart}
                  disabled={!product.active}
                  className={`w-full py-3.5 border font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed duration-200 uppercase tracking-wide ${
                    isAdded 
                      ? 'bg-green-600 border-green-600 text-white animate-fade-in' 
                      : 'border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={16}/> Adicionado!
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
                  <ShieldCheck size={18} className="text-gray-400 dark:text-gray-400"/>
                  <span className="font-semibold leading-tight">Compra 100% Segura</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-1">
                  <RefreshCw size={16} className="text-gray-400 dark:text-gray-400"/>
                  <span className="font-semibold leading-tight">7 dias de Devolução</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-1">
                  <CheckCircle size={16} className="text-gray-400 dark:text-gray-400"/>
                  <span className="font-semibold leading-tight">Fórmula Aprovada</span>
                </div>
              </div>

            </div>

            {/* Technical Information Tab card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Tab headers */}
              <div className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none">
                {activeDetails.description && (
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'description'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Info size={14}/> Detalhes
                  </button>
                )}
                {activeDetails.compositions && (
                  <button
                    onClick={() => setActiveTab('compositions')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'compositions'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FlaskConical size={14}/> Composição
                  </button>
                )}
                {activeDetails.indication && (
                  <button
                    onClick={() => setActiveTab('indication')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'indication'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Activity size={14}/> Indicações
                  </button>
                )}
                {activeDetails.contraindication && (
                  <button
                    onClick={() => setActiveTab('contraindication')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'contraindication'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <AlertTriangle size={14}/> Contraindicações
                  </button>
                )}
              </div>

              {/* Tab panels */}
              <div className="p-6 min-h-[250px]">
                {activeTab === 'description' && activeDetails.description && (
                  <div className="animate-fade-in space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Descrição do Produto</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {activeDetails.description}
                    </p>
                  </div>
                )}

                {activeTab === 'compositions' && activeDetails.compositions && (
                  <div className="animate-fade-in space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Formulação / Fórmulas Ativas</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {activeDetails.compositions}
                    </p>
                  </div>
                )}

                {activeTab === 'indication' && activeDetails.indication && (
                  <div className="animate-fade-in space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Recomendações e Indicações de Uso</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {activeDetails.indication}
                    </p>
                  </div>
                )}

                {activeTab === 'contraindication' && activeDetails.contraindication && (
                  <div className="animate-fade-in space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Precauções e Contraindicações</h4>
                    <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 flex gap-3">
                      <AlertTriangle className="text-orange-600 flex-shrink-0" size={18}/>
                      <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300 leading-relaxed whitespace-pre-line">
                        {activeDetails.contraindication}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Real Reviews Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                Avaliações dos Clientes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Opiniões reais de clientes que adquiriram este produto.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
              
              {/* Ratings Summary (lg:col-span-4) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {totalReviews > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                        {averageRating.toFixed(1)}
                      </span>
                      <span className="text-sm font-bold text-gray-400 dark:text-gray-500">/ 5</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {renderStars(Math.round(averageRating), 18)}
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
                      </span>
                    </div>

                    {/* Stars distribution progress bars */}
                    <div className="flex flex-col gap-2.5 mt-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r) => r.rating === star).length
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                        return (
                          <div key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-3 font-semibold text-gray-700 dark:text-gray-300">{star}</span>
                            <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-gray-400 dark:text-gray-500 font-medium">
                              {count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={22} className="text-gray-200 dark:text-gray-700" />
                      ))}
                    </div>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Sem avaliações ainda</p>
                    <p className="text-xs text-gray-400 dark:text-gray-400">Seja o primeiro a avaliar!</p>
                  </div>
                )}
              </div>

              {/* Form to submit review or message (lg:col-span-8) */}
              <div className="lg:col-span-8 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 pt-6 lg:pt-0 lg:pl-8">
                {isEligible ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Deixe sua Avaliação
                    </h3>

                    {/* Star selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Sua Nota
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className="text-amber-400 hover:scale-110 active:scale-95 transition-transform"
                          >
                            <Star
                              size={24}
                              fill={star <= newRating ? "currentColor" : "none"}
                              className={star <= newRating ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comments textarea */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="comment" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Seu Comentário
                      </label>
                      <textarea
                        id="comment"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="O que você achou deste produto? Conte-nos sua experiência..."
                        className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Image uploader */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Adicionar Foto (opcional)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-300 transition-colors">
                          <Camera size={14} />
                          <span>Selecionar Imagem</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>

                        {newImageUrl && (
                          <div className="relative flex items-center gap-2 p-1.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900">
                            <img
                              src={newImageUrl}
                              alt="Pré-visualização"
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-gray-400 rounded-lg transition-colors"
                              title="Remover imagem"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error & Success Messages */}
                    {submitError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/35 text-xs text-red-700 dark:text-red-450">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {submitSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/35 text-xs text-green-700 dark:text-green-450">
                        <CheckCircle size={14} className="flex-shrink-0" />
                        <span>Avaliação enviada com sucesso! Obrigado pelo feedback.</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-fit px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <span>Enviar Avaliação</span>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col justify-center items-center h-full min-h-[140px] text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <MessageSquare className="text-gray-400 dark:text-gray-600 mb-2.5" size={26} />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                      {eligibilityMessage || 'Apenas clientes que compraram este produto podem deixar uma avaliação.'}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* List of reviews */}
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
                Todas as Opiniões ({reviews.length})
              </h3>

              {loadingReviews ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="animate-spin text-green-600 dark:text-green-400 mb-2" size={24} />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Carregando avaliações...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                  <Star size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Nenhuma avaliação para este produto ainda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-2">
                        {/* Header: Name, Date, Rating, Badge */}
                        <div className="flex flex-wrap items-start justify-between gap-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              {rev.name}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5">
                            {renderStars(rev.rating, 12)}
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/20 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900/30">
                              <ShieldCheck size={9} /> Compra Confirmada
                            </span>
                          </div>
                        </div>

                        {/* Comment text */}
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                          "{rev.comment}"
                        </p>
                      </div>

                      {/* Review photo thumbnail */}
                      {rev.image && (
                        <div className="mt-1">
                          <img
                            src={getReviewImageUrl(rev.image) || PRODUCT_IMAGE_FALLBACK}
                            alt="Foto da avaliação"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
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

      </div>

      {/* ═══════════════ LIGHTBOX MODAL (Image Fullscreen) ════════════════════ */}
      {isLightboxOpen && productImages.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button at top-right */}
          <div className="flex justify-end p-2">
            <button 
              onClick={() => setIsLightboxOpen(false)}
              className="p-3 bg-gray-900/60 hover:bg-gray-800 text-white rounded-full transition-colors border border-gray-800"
              title="Fechar (ESC)"
            >
              <X size={20}/>
            </button>
          </div>

          {/* Main image layout with setas */}
          <div className="flex-1 flex items-center justify-between gap-4 max-w-6xl mx-auto w-full">
            
            {/* Left arrow */}
            {productImages.length > 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevImage() }}
                className="p-4 bg-gray-900/60 hover:bg-gray-800 text-white rounded-full transition-colors border border-gray-800 flex-shrink-0 disabled:opacity-40"
                title="Imagem anterior (Seta Esquerda)"
              >
                <ChevronLeft size={24}/>
              </button>
            ) : <div className="w-14"/>}

            {/* Centered Image */}
            <div 
              className="max-h-[75vh] max-w-[80vw] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="max-h-[75vh] max-w-[80vw] object-contain rounded-xl select-none"
                onError={handleProductImageError}
              />
            </div>

            {/* Right arrow */}
            {productImages.length > 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextImage() }}
                className="p-4 bg-gray-900/60 hover:bg-gray-800 text-white rounded-full transition-colors border border-gray-800 flex-shrink-0 disabled:opacity-40"
                title="Próxima imagem (Seta Direita)"
              >
                <ChevronRight size={24}/>
              </button>
            ) : <div className="w-14"/>}

          </div>

          {/* Thumbnails indicator at the bottom */}
          {productImages.length > 1 && (
            <div className="flex gap-2 justify-center pb-4" onClick={(e) => e.stopPropagation()}>
              {productImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-3.5 h-3.5 rounded-full transition-all border border-gray-600 ${
                    selectedImage === idx ? 'bg-green-500 w-7' : 'bg-gray-700'
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
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex flex-col justify-center items-center p-4 animate-fade-in"
          onClick={() => setActiveReviewImage(null)}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setActiveReviewImage(null)}
              className="p-3 bg-gray-900/60 hover:bg-gray-800 text-white rounded-full transition-colors border border-gray-800"
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
              src={activeReviewImage}
              alt="Foto da avaliação ampliada"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl select-none"
            />
          </div>
        </div>
      )}

    </div>
  )
}
