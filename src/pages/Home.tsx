import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import { bannersService, Banner } from '../services/banners.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
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
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannerIndex, setBannerIndex] = useState(1) // Começa em 1 porque o índice 0 é um clone
  const [reviewIndex, setReviewIndex] = useState(0)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)
  
  // Carrega banners da API ou usa fallback
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const apiBanners = await bannersService.getAll() // Apenas banners ativos
        if (apiBanners && apiBanners.length > 0) {
          // Ordena por order
          const sorted = apiBanners.sort((a, b) => a.order - b.order)
          setBanners(sorted)
        } else {
          // Fallback para banners padrão se não houver banners na API
          setBanners([
            { id: '1', image_url: banner1, order: 0, active: true, created_at: new Date(), updated_at: new Date() }
          ])
        }
      } catch (error) {
        console.error('Erro ao carregar banners:', error)
        // Fallback para banners padrão em caso de erro
        setBanners([
          { id: '1', image_url: banner1, order: 0, active: true, created_at: new Date(), updated_at: new Date() }
        ])
      }
    }
    loadBanners()
  }, [])
  
  // Array de imagens do carrossel - usa banners da API ou fallback
  const bannerImages = banners.length > 0 
    ? banners.map(banner => banner.image_url)
    : [banner1] // Fallback
  
  // Cria array com clones para loop infinito: [última, ...originais, primeira]
  const infiniteBannerImages = bannerImages.length > 0 ? [
    bannerImages[bannerImages.length - 1], // Clone da última no início
    ...bannerImages, // Imagens originais
    bannerImages[0] // Clone da primeira no final
  ] : [banner1, banner1, banner1] // Fallback mínimo

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

  // Auto-rotaciona banners com loop infinito
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => {
        const next = prev + 1
        // Se chegou no último clone (última imagem duplicada), reseta sem animação para a primeira original
        if (next >= infiniteBannerImages.length - 1) {
          setTimeout(() => {
            setIsTransitioning(false)
            setBannerIndex(1) // Volta para a primeira imagem original
            setTimeout(() => setIsTransitioning(true), 50)
          }, 500) // Espera a animação terminar
          return next
        }
        return next
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [infiniteBannerImages.length])
  
  // Reseta para o final quando volta para o clone inicial
  useEffect(() => {
    if (bannerIndex === 0) {
      setTimeout(() => {
        setIsTransitioning(false)
        setBannerIndex(bannerImages.length) // Vai para a última imagem original
        setTimeout(() => setIsTransitioning(true), 50)
      }, 500)
    }
  }, [bannerIndex, bannerImages.length])

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
    <div className="min-h-screen bg-palette-light dark:bg-gray-900 transition-colors duration-300">
      {/* Banner Hero - Carrossel de Imagens */}
      <section 
        className="relative overflow-hidden mb-4"
        onMouseEnter={() => setIsBannerHovered(true)}
        onMouseLeave={() => setIsBannerHovered(false)}
        style={{ minHeight: '400px' }}
      >
        {/* Container do carrossel com efeito de slide infinito */}
        <div 
          className={`flex h-full ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
          style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
        >
          {infiniteBannerImages.map((image, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-full h-full relative bg-gray-200 dark:bg-gray-800"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minHeight: '400px'
              }}
            >
              {/* Gradiente de baixo para cima, ocupando 1/5 da altura, seguindo a cor do fundo */}
              <div 
                className="absolute inset-0 z-10"
                style={{
                  background: 'linear-gradient(to top, #DDF4E7 0%, rgba(221, 244, 231, 0.5) 10%, transparent 20%, transparent 100%)'
                }}
              ></div>
              {/* Gradiente para modo escuro - sobrepõe o gradiente claro quando dark mode está ativo */}
              <div 
                className="absolute inset-0 z-10 opacity-0 dark:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(to top, #124170 0%, rgba(18, 65, 112, 0.5) 10%, transparent 20%, transparent 100%)'
                }}
              ></div>
            </div>
          ))}
        </div>
        
        {/* Indicadores (dots) - na parte inferior */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-2 z-10">
          {bannerImages.map((_, index) => {
            // Calcula o índice real (considerando que começamos em 1 e temos clones)
            const realIndex = bannerIndex === 0 ? bannerImages.length - 1 : 
                             bannerIndex === infiniteBannerImages.length - 1 ? 0 : 
                             bannerIndex - 1
            return (
              <button
                key={index}
                onClick={() => {
                  setIsTransitioning(true)
                  setBannerIndex(index + 1) // +1 porque o índice 0 é um clone
                }}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === realIndex
                    ? 'bg-white'
                    : 'bg-white/50'
                }`}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            )
          })}
        </div>
        
        {/* Controles do Carrossel - Setas nas laterais da section */}
        <button
          onClick={() => {
            setIsTransitioning(true)
            setBannerIndex((prev) => {
              const next = prev - 1
              // Se voltou para o clone inicial (índice 0), reseta para o final sem animação
              if (next < 0) {
                setTimeout(() => {
                  setIsTransitioning(false)
                  setBannerIndex(bannerImages.length) // Vai para a última imagem original
                  setTimeout(() => setIsTransitioning(true), 50)
                }, 500)
                return 0
              }
              return next
            })
          }}
          className={`absolute left-0 top-1/2 -translate-y-1/2 p-3 text-black dark:text-white transition-all z-10 ${
            isBannerHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Imagem anterior"
          style={{ borderRadius: '0 50% 50% 0', width: '48px', height: '48px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => {
            setIsTransitioning(true)
            setBannerIndex((prev) => {
              const next = prev + 1
              // Se chegou no último clone, reseta para o início sem animação
              if (next >= infiniteBannerImages.length - 1) {
                setTimeout(() => {
                  setIsTransitioning(false)
                  setBannerIndex(1) // Volta para a primeira imagem original
                  setTimeout(() => setIsTransitioning(true), 50)
                }, 500)
                return next
              }
              return next
            })
          }}
          className={`absolute right-0 top-1/2 -translate-y-1/2 p-3 text-black dark:text-white transition-all z-10 ${
            isBannerHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Próxima imagem"
          style={{ borderRadius: '50% 0 0 50%', width: '48px', height: '48px' }}
        >
          <ChevronRight size={24} />
        </button>
      </section>

      {/* Produtos em Destaque - Scroll Horizontal */}
      <section className="bg-white dark:bg-[#065084] py-6 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
        <div className="px-2 md:px-3 lg:px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Produtos em Destaque</h2>
            <Link to="/produtos" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold flex items-center">
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
                  className="flex-shrink-0 w-48 bg-white dark:bg-[#0F828C] rounded-lg p-3 hover:shadow-md dark:hover:shadow-xl transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || PRODUCT_IMAGE_FALLBACK}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
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
        <section className="bg-white dark:bg-[#065084] py-6 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
          <div className="px-2 md:px-3 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vitaminas</h2>
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
                  className="flex-shrink-0 w-48 bg-white dark:bg-[#0F828C] rounded-lg p-3 hover:shadow-md dark:hover:shadow-xl transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || PRODUCT_IMAGE_FALLBACK}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
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
        <section className="bg-white dark:bg-[#065084] py-6 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
          <div className="px-2 md:px-3 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Minerais</h2>
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
                  className="flex-shrink-0 w-48 bg-white dark:bg-[#0F828C] rounded-lg p-3 hover:shadow-md dark:hover:shadow-xl transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || PRODUCT_IMAGE_FALLBACK}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
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
        <section className="bg-white dark:bg-[#065084] py-6 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
          <div className="px-2 md:px-3 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Fitoterápicos</h2>
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
                  className="flex-shrink-0 w-48 bg-white dark:bg-[#0F828C] rounded-lg p-3 hover:shadow-md dark:hover:shadow-xl transition-all"
                >
                  <div className="relative mb-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.image || PRODUCT_IMAGE_FALLBACK}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                      />
                    </div>
                    {product.isCustomizable && (
                      <div className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#67C090' }}>
                        <Sparkles size={10} className="inline mr-1" />
                        Personalizável
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
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
      <section className="bg-white dark:bg-[#065084] py-8 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300" style={{ marginLeft: '10rem', marginRight: '10rem' }}>
        <div className="px-2 md:px-3 lg:px-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">O que nossos clientes dizem</h2>
          
          <div className="relative">
            {/* Container do carrossel */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${reviewIndex * 50}%)` }}
              >
                {reviews.map((review) => (
                  <div key={review.id} className="flex-shrink-0 w-1/2 px-2">
                    <div className="bg-white dark:bg-[#0F828C] rounded-lg border border-gray-200 dark:border-[#0F828C] p-6 hover:shadow-md dark:hover:shadow-xl transition-shadow h-full">
                      <div className="flex items-center mb-3">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="text-yellow-400 fill-current" size={18} />
                        ))}
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 text-base mb-4">"{review.comment}"</p>
                      <div className="flex items-center gap-3">
                        {/* Avatar circular */}
                        <div className="flex-shrink-0">
                          <img
                            src={review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&size=64&background=67C090&color=fff&bold=true`}
                            alt={review.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-[#0F828C]"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&size=64&background=67C090&color=fff&bold=true`
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{review.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-300">{review.product} • {review.date}</p>
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
                className="p-2 rounded-full bg-gray-100 dark:bg-[#0F828C] hover:bg-gray-200 dark:hover:bg-[#78B9B5] text-gray-700 dark:text-white transition-colors"
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
                                : 'bg-gray-300 dark:bg-[#0F828C]'
                      }`}
                      style={currentIndex === reviewIndex ? { backgroundColor: '#67C090' } : {}}
                      aria-label={`Ir para reviews ${currentIndex + 1}-${currentIndex + 2}`}
                    />
                  )
                })}
              </div>
              
              <button
                onClick={nextReview}
                className="p-2 rounded-full bg-gray-100 dark:bg-[#0F828C] hover:bg-gray-200 dark:hover:bg-[#78B9B5] text-gray-700 dark:text-white transition-colors"
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
