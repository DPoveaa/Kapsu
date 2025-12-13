import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import banner1 from '../images/banner_1.webp'

// Reviews de clientes
const reviews = [
  {
    id: 1,
    name: 'Maria Silva',
    rating: 5,
    comment: 'Excelente qualidade! Os medicamentos manipulados são perfeitos e a entrega foi super rápida. Recomendo muito!',
    product: 'Vitamina D3',
    date: 'Há 2 semanas',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 2,
    name: 'João Santos',
    rating: 5,
    comment: 'Atendimento impecável e produtos de alta qualidade. A personalização funcionou perfeitamente para minhas necessidades.',
    product: 'Magnésio Quelato',
    date: 'Há 1 mês',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 3,
    name: 'Ana Costa',
    rating: 5,
    comment: 'Melhor farmácia de manipulação que já usei! Produtos frescos, bem embalados e com ótimo custo-benefício.',
    product: 'Ginkgo Biloba',
    date: 'Há 3 semanas',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 4,
    name: 'Carlos Oliveira',
    rating: 5,
    comment: 'Profissionais muito competentes. Me ajudaram a encontrar exatamente o que precisava. Super satisfeito!',
    product: 'Complexo B',
    date: 'Há 2 meses',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 5,
    name: 'Patrícia Lima',
    rating: 5,
    comment: 'Entrega rápida e produtos de qualidade superior. Já fiz várias compras e sempre fico satisfeita.',
    product: 'Ômega 3',
    date: 'Há 1 semana',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
  }
]

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [vitaminProducts, setVitaminProducts] = useState<Product[]>([])
  const [mineralProducts, setMineralProducts] = useState<Product[]>([])
  const [fitoterapicoProducts, setFitoterapicoProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  
  // Array de imagens do carrossel - adicione suas imagens aqui
  // Para imagens locais da pasta src/images, importe no topo e use a variável
  // Para imagens na pasta public, use: '/nome-da-imagem.jpg'
  // Para URLs online, use: 'https://exemplo.com/imagem.jpg'
  const bannerImages = [
    banner1, // Imagem importada
    '/banner2.jpg', // Imagem da pasta public (se tiver)
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80' // URL online
  ]

  // Carrega produtos por categoria usando rotas da API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        
        // Busca produtos em paralelo por categoria usando rotas específicas da API
        const [allProducts, vitamins, minerals, fitoterapicos] = await Promise.allSettled([
          productsService.getAll(), // Produtos em destaque
          productsService.getByCategory('vitamina'), // Vitaminas
          productsService.getByCategory('mineral'), // Minerais
          productsService.getByCategory('fitoterapico'), // Fitoterápicos
        ])
        
        // Produtos em destaque (primeiros 6)
        if (allProducts.status === 'fulfilled') {
          setFeaturedProducts(allProducts.value.slice(0, 6))
        } else {
          console.error('Erro ao carregar produtos em destaque:', allProducts.reason)
        }
        
        // Produtos por categoria (limitados a 8)
        if (vitamins.status === 'fulfilled') {
          setVitaminProducts(vitamins.value.slice(0, 8))
        } else {
          console.error('Erro ao carregar vitaminas:', vitamins.reason)
        }
        
        if (minerals.status === 'fulfilled') {
          setMineralProducts(minerals.value.slice(0, 8))
        } else {
          console.error('Erro ao carregar minerais:', minerals.reason)
        }
        
        if (fitoterapicos.status === 'fulfilled') {
          setFitoterapicoProducts(fitoterapicos.value.slice(0, 8))
        } else {
          console.error('Erro ao carregar fitoterápicos:', fitoterapicos.reason)
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Auto-rotaciona banners
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerImages.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Auto-rotaciona reviews (2 por vez)
  useEffect(() => {
    const interval = setInterval(() => {
      // Avança de 2 em 2, mas não ultrapassa o limite
      setReviewIndex((prev) => {
        const next = prev + 2
        // Se passar do limite, volta para o início
        return next >= reviews.length ? 0 : next
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const nextReview = () => {
    setReviewIndex((prev) => {
      const next = prev + 2
      return next >= reviews.length ? 0 : next
    })
  }

  const prevReview = () => {
    setReviewIndex((prev) => {
      const next = prev - 2
      return next < 0 ? Math.max(0, reviews.length - 2) : next
    })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DDF4E7' }}>
      {/* Banner Hero - Carrossel de Imagens */}
      <section 
        className="relative overflow-hidden mb-4"
        onMouseEnter={() => setIsBannerHovered(true)}
        onMouseLeave={() => setIsBannerHovered(false)}
        style={{ minHeight: '400px' }}
      >
        {/* Container do carrossel com efeito de slide */}
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
        >
          {bannerImages.map((image, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-full h-full relative"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minHeight: '400px'
              }}
            >
              {/* Gradiente indo para #DDF4E7 */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, transparent 70%, rgba(221, 244, 231, 0.3) 85%, #DDF4E7 100%)'
                }}
              ></div>
            </div>
          ))}
        </div>
        
        {/* Indicadores (dots) - na parte inferior */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-2 z-10">
          {bannerImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setBannerIndex(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === bannerIndex
                  ? 'bg-white'
                  : 'bg-white/50'
              }`}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Controles do Carrossel - Setas nas laterais da section */}
        <button
          onClick={() => setBannerIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white text-gray-900 shadow-lg transition-all z-10 ${
            isBannerHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Imagem anterior"
          style={{ borderRadius: '0 50% 50% 0', width: '48px', height: '48px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setBannerIndex((prev) => (prev + 1) % bannerImages.length)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white text-gray-900 shadow-lg transition-all z-10 ${
            isBannerHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Próxima imagem"
          style={{ borderRadius: '50% 0 0 50%', width: '48px', height: '48px' }}
        >
          <ChevronRight size={24} />
        </button>
      </section>

      {/* Produtos em Destaque - Scroll Horizontal */}
      <section className="bg-white py-6 rounded-lg mb-4 shadow-sm" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
        <div className="px-2 md:px-3 lg:px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Produtos em Destaque</h2>
            <Link to="/produtos" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              Ver todos
              <ArrowRight className="ml-1" size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {featuredProducts.map(product => (
                <Link
                  key={product.id}
                  to={`/produtos/${product.id}`}
                  className="flex-shrink-0 w-48 bg-white rounded-lg p-3 hover:shadow-md transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                        }}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 mb-1">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-green-600">Frete grátis</p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Vitaminas - Scroll Horizontal */}
      {vitaminProducts.length > 0 && (
        <section className="bg-white py-6 rounded-lg mb-4 shadow-sm" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
          <div className="px-2 md:px-3 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Vitaminas</h2>
              <Link to="/produtos?categoria=vitamina" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center">
                Ver todos
                <ArrowRight className="ml-1" size={16} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {vitaminProducts.map(product => (
                <Link
                  key={product.id}
                  to={`/produtos/${product.id}`}
                  className="flex-shrink-0 w-48 bg-white rounded-lg p-3 hover:shadow-md transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                        }}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 mb-1">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-green-600">Frete grátis</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Minerais - Scroll Horizontal */}
      {mineralProducts.length > 0 && (
        <section className="bg-white py-6 rounded-lg mb-4 shadow-sm" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
          <div className="px-2 md:px-3 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Minerais</h2>
              <Link to="/produtos?categoria=mineral" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center">
                Ver todos
                <ArrowRight className="ml-1" size={16} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {mineralProducts.map(product => (
                <Link
                  key={product.id}
                  to={`/produtos/${product.id}`}
                  className="flex-shrink-0 w-48 bg-white rounded-lg p-3 hover:shadow-md transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                        }}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 mb-1">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-green-600">Frete grátis</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fitoterápicos - Scroll Horizontal */}
      {fitoterapicoProducts.length > 0 && (
        <section className="bg-white py-6 rounded-lg mb-4 shadow-sm" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
          <div className="px-2 md:px-3 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Fitoterápicos</h2>
              <Link to="/produtos?categoria=fitoterapico" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center">
                Ver todos
                <ArrowRight className="ml-1" size={16} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {fitoterapicoProducts.map(product => (
                <Link
                  key={product.id}
                  to={`/produtos/${product.id}`}
                  className="flex-shrink-0 w-48 bg-white rounded-lg p-3 hover:shadow-md transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                        }}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 mb-1">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-green-600">Frete grátis</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews - Carrossel */}
      <section className="bg-white py-8 rounded-lg mb-4 shadow-sm" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
        <div className="px-2 md:px-3 lg:px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">O que nossos clientes dizem</h2>
          
          <div className="relative">
            {/* Container do carrossel */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${reviewIndex * 50}%)` }}
              >
                {reviews.map((review) => (
                  <div key={review.id} className="flex-shrink-0 w-1/2 px-2">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow h-full">
                      <div className="flex items-center mb-3">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="text-yellow-400 fill-current" size={18} />
                        ))}
                      </div>
                      <p className="text-gray-700 text-base mb-4">"{review.comment}"</p>
                      <div className="flex items-center gap-3">
                        {/* Avatar circular */}
                        <div className="flex-shrink-0">
                          <img
                            src={review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&size=64&background=67C090&color=fff&bold=true`}
                            alt={review.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&size=64&background=67C090&color=fff&bold=true`
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{review.name}</p>
                          <p className="text-sm text-gray-500">{review.product} • {review.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center justify-center mt-6 space-x-4">
              <button
                onClick={prevReview}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                aria-label="Review anterior"
              >
                <ChevronLeft size={20} />
              </button>
              
              {/* Indicadores (dots) - mostra um dot para cada par de reviews */}
              <div className="flex space-x-2">
                {Array.from({ length: Math.ceil(reviews.length / 2) }).map((_, index) => {
                  const currentIndex = index * 2
                  return (
                    <button
                      key={index}
                      onClick={() => setReviewIndex(currentIndex)}
                      className={`h-2 w-2 rounded-full transition-all ${
                        currentIndex === reviewIndex
                          ? ''
                          : 'bg-gray-300'
                      }`}
                      style={currentIndex === reviewIndex ? { backgroundColor: '#67C090' } : {}}
                      aria-label={`Ir para reviews ${currentIndex + 1}-${currentIndex + 2}`}
                    />
                  )
                })}
              </div>
              
              <button
                onClick={nextReview}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                aria-label="Próximo review"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
