import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import { bannersService, Banner } from '../services/banners.service'
import { reviewsService, Review } from '../services/reviews.service'
import { siteSettingsService } from '../services/site-settings.service'
import { homeSectionsService, HomeSection } from '../services/home-sections.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [sections, setSections] = useState<HomeSection[]>([])
  const [sectionProducts, setSectionProducts] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannerIndex, setBannerIndex] = useState(1) // Começa em 1 porque o índice 0 é um clone
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [autoRotatePaused, setAutoRotatePaused] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)
  const [bannerHeightMobile, setBannerHeightMobile] = useState<number>(300)
  const [bannerHeightDesktop, setBannerHeightDesktop] = useState<number>(500)
  
  // Carrega banners da API ou usa fallback
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const apiBanners = await bannersService.getAll() // Apenas banners ativos
        if (apiBanners && apiBanners.length > 0) {
          // Ordena por order
          const sorted = apiBanners.sort((a, b) => a.order - b.order)
          setBanners(sorted)
        } 
        // Se não houver banners, não usa imagem local; deixa vazio para placeholder genérico
        } catch (error) {
          console.error('Erro ao carregar banners:', error)
          // Em caso de erro, não usa imagem local; deixa vazio para placeholder genérico
          setBanners([])
        }
      }
      loadBanners()
    }, [])
  
  // Carrega altura dos banners das configurações do site
  useEffect(() => {
    const loadBannerHeights = async () => {
      try {
        const settings = await siteSettingsService.getSettings()
        if (typeof settings.banner_height_mobile === 'number') {
          setBannerHeightMobile(settings.banner_height_mobile)
        }
        if (typeof settings.banner_height_desktop === 'number') {
          setBannerHeightDesktop(settings.banner_height_desktop)
        }
      } catch (err) {
        console.warn('Não foi possível carregar altura dos banners', err)
      }
    }
    loadBannerHeights()
  }, [])

  // Reseta o bannerIndex para 1 quando os banners são carregados
  useEffect(() => {
    if (banners.length > 0) {
      // Garante que o índice está dentro dos limites válidos
      setBannerIndex(1) // Sempre começa no primeiro banner após carregar (índice 1 = primeiro banner original)
      setIsTransitioning(true)
    } else {
      // Se não houver banners, reseta o índice
      setBannerIndex(1)
    }
  }, [banners.length])

  // Carrega reviews da API
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const apiReviews = await reviewsService.getAll() // Apenas reviews ativas
        if (apiReviews && apiReviews.length > 0) {
          // Ordena por order
          const sorted = apiReviews.sort((a, b) => a.order - b.order)
          setReviews(sorted)
        }
      } catch (error) {
        console.error('Erro ao carregar reviews:', error)
        // Em caso de erro, mantém array vazio (não exibe reviews)
      }
    }
    loadReviews()
  }, [])
  
  // Usa o array de banners da API (sem fallback durante carregamento)
  const bannerImages = banners
  
  // Cria array com clones para loop infinito: [última, ...originais, primeira]
  // Só cria o array infinito se houver banners carregados
  const infiniteBannerImages = bannerImages.length > 0 ? [
    bannerImages[bannerImages.length - 1], // Clone da última no início
    ...bannerImages, // Banners originais
    bannerImages[0] // Clone da primeira no final
  ] : []

  // Carrega seções da home
  useEffect(() => {
    const loadSections = async () => {
      try {
        const sectionsData = await homeSectionsService.getAll()
        setSections(sectionsData)
      } catch (error) {
        console.error('Erro ao carregar seções:', error)
      }
    }
    loadSections()
  }, [])

  // Carrega produtos por seção usando o novo sistema
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        
        // Busca produtos em destaque da API (seção "featured")
        try {
          const featured = await homeSectionsService.getFeaturedProducts()
          setFeaturedProducts(featured)
        } catch (error) {
          console.error('Erro ao carregar produtos em destaque:', error)
          // Fallback: busca todos e pega os primeiros 6
          const allProducts = await productsService.getAll()
          setFeaturedProducts(allProducts.slice(0, 6))
        }
        
        // Busca produtos de todas as seções ativas (exceto "featured")
        const activeSections = sections.filter(s => s.active && s.key !== 'featured')
        
        const promises = activeSections.map(async (section) => {
          try {
            const products = await homeSectionsService.getSectionProducts(section.id)
            return { sectionId: section.id, products }
          } catch (err) {
            console.error(`Erro ao carregar produtos da seção ${section.name}:`, err)
            return { sectionId: section.id, products: [] }
          }
        })
        
        const results = await Promise.all(promises)
        const productsMap: Record<string, Product[]> = {}
        results.forEach(({ sectionId, products }) => {
          productsMap[sectionId] = products
        })
        setSectionProducts(productsMap)
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
      } finally {
        setLoading(false)
      }
    }
    if (sections.length > 0) {
      loadProducts()
    }
  }, [sections])

  // Auto-rotaciona banners com loop infinito (pausa quando hover/touch)
  useEffect(() => {
    if (autoRotatePaused) return
    
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
  }, [infiniteBannerImages.length, autoRotatePaused])
  
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

  // Detecta mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Event listeners globais para drag (caso o mouse saia do elemento durante o drag)
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      setCurrentX(e.clientX)
    }

    const handleGlobalMouseUp = () => {
      if (!isDragging) return
      
      const diff = startX - currentX
      const threshold = 50
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          // Arrastou da direita para esquerda - próximo banner (seguindo a direção do arrasto)
          setIsTransitioning(true)
          setBannerIndex((prev) => {
            const next = prev + 1
            if (next >= infiniteBannerImages.length - 1) {
              setTimeout(() => {
                setIsTransitioning(false)
                setBannerIndex(1)
                setTimeout(() => setIsTransitioning(true), 50)
              }, 500)
              return next
            }
            return next
          })
        } else {
          // Arrastou da esquerda para direita - banner anterior (seguindo a direção do arrasto)
          setIsTransitioning(true)
          setBannerIndex((prev) => {
            const next = prev - 1
            if (next < 0) {
              setTimeout(() => {
                setIsTransitioning(false)
                setBannerIndex(bannerImages.length)
                setTimeout(() => setIsTransitioning(true), 50)
              }, 500)
              return 0
            }
            return next
          })
        }
      }
      
      setIsDragging(false)
      setStartX(0)
      setCurrentX(0)
      setTimeout(() => {
        setAutoRotatePaused(false)
      }, 1000)
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startX, currentX, infiniteBannerImages.length, bannerImages.length])

  // Auto-rotaciona reviews (1 por vez no mobile, 2 no desktop)
  useEffect(() => {
    if (reviews.length === 0) return
    const interval = setInterval(() => {
      const step = isMobile ? 1 : 2
      setReviewIndex((prev) => {
        const next = prev + step
        // Se passar do limite, volta para o início
        return next >= reviews.length ? 0 : next
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [isMobile, reviews.length])

  const nextReview = () => {
    const step = isMobile ? 1 : 2
    setReviewIndex((prev) => {
      const next = prev + step
      return next >= reviews.length ? 0 : next
    })
  }

  const prevReview = () => {
    const step = isMobile ? 1 : 2
    setReviewIndex((prev) => {
      const next = prev - step
      return next < 0 ? Math.max(0, reviews.length - step) : next
    })
  }

  // Handlers para drag/swipe do banner
  const handleBannerMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
    setCurrentX(e.clientX)
    setAutoRotatePaused(true)
    setIsTransitioning(false)
  }

  const handleBannerMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setCurrentX(e.clientX)
  }

  const handleBannerMouseUp = () => {
    if (!isDragging) return
    
    const diff = startX - currentX
    const threshold = 50 // Pixels mínimos para mudar de banner
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Arrastou da direita para esquerda - próximo banner (seguindo a direção do arrasto)
        setIsTransitioning(true)
        setBannerIndex((prev) => {
          const next = prev + 1
          if (next >= infiniteBannerImages.length - 1) {
            setTimeout(() => {
              setIsTransitioning(false)
              setBannerIndex(1)
              setTimeout(() => setIsTransitioning(true), 50)
            }, 500)
            return next
          }
          return next
        })
      } else {
        // Arrastou da esquerda para direita - banner anterior (seguindo a direção do arrasto)
        setIsTransitioning(true)
        setBannerIndex((prev) => {
          const next = prev - 1
          if (next < 0) {
            setTimeout(() => {
              setIsTransitioning(false)
              setBannerIndex(bannerImages.length)
              setTimeout(() => setIsTransitioning(true), 50)
            }, 500)
            return 0
          }
          return next
        })
      }
    }
    
    setIsDragging(false)
    setStartX(0)
    setCurrentX(0)
    setTimeout(() => {
      setAutoRotatePaused(false)
    }, 1000) // Retoma auto-rotate após 1 segundo
  }

  const handleBannerMouseLeave = () => {
    if (isDragging) {
      handleBannerMouseUp()
    }
  }

  // Touch handlers para mobile
  const handleBannerTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
    setAutoRotatePaused(true)
    setIsTransitioning(false)
  }

  const handleBannerTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentX(e.touches[0].clientX)
  }

  const handleBannerTouchEnd = () => {
    if (!isDragging) return
    
    const diff = startX - currentX
    const threshold = 50 // Pixels mínimos para mudar de banner
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Arrastou da direita para esquerda - próximo banner (seguindo a direção do arrasto)
        setIsTransitioning(true)
        setBannerIndex((prev) => {
          const next = prev + 1
          if (next >= infiniteBannerImages.length - 1) {
            setTimeout(() => {
              setIsTransitioning(false)
              setBannerIndex(1)
              setTimeout(() => setIsTransitioning(true), 50)
            }, 500)
            return next
          }
          return next
        })
      } else {
        // Arrastou da esquerda para direita - banner anterior (seguindo a direção do arrasto)
        setIsTransitioning(true)
        setBannerIndex((prev) => {
          const next = prev - 1
          if (next < 0) {
            setTimeout(() => {
              setIsTransitioning(false)
              setBannerIndex(bannerImages.length)
              setTimeout(() => setIsTransitioning(true), 50)
            }, 500)
            return 0
          }
          return next
        })
      }
    }
    
    setIsDragging(false)
    setStartX(0)
    setCurrentX(0)
    setTimeout(() => {
      setAutoRotatePaused(false)
    }, 1000) // Retoma auto-rotate após 1 segundo
  }

  return (
    <div className="min-h-screen bg-palette-light dark:bg-gray-900 transition-colors duration-300">
      {/* Banner Hero */}
      {infiniteBannerImages.length > 0 ? (
        <section 
          className="relative overflow-hidden mb-4"
          onMouseEnter={() => {
            setAutoRotatePaused(true)
          }}
          onMouseLeave={() => {
            if (!isDragging) {
              setTimeout(() => {
                setAutoRotatePaused(false)
              }, 1000)
            }
          }}
          style={{ height: `${isMobile ? bannerHeightMobile : bannerHeightDesktop}px` }}
        >
          <div 
            ref={bannerRef}
            className={`flex cursor-grab active:cursor-grabbing h-full ${isTransitioning && !isDragging ? 'transition-transform duration-500 ease-in-out' : ''}`}
            style={{ 
              transform: `translateX(calc(-${bannerIndex * 100}% + ${isDragging ? (currentX - startX) : 0}px))`,
              userSelect: 'none',
              height: '100%'
            }}
            onMouseDown={handleBannerMouseDown}
            onMouseMove={handleBannerMouseMove}
            onMouseUp={handleBannerMouseUp}
            onMouseLeave={handleBannerMouseLeave}
            onTouchStart={handleBannerTouchStart}
            onTouchMove={handleBannerTouchMove}
            onTouchEnd={handleBannerTouchEnd}
          >
            {infiniteBannerImages.map((banner, index) => {
              const bannerContent = (
                <div className="w-full h-full relative flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <img
                    src={banner.image_url}
                    alt={banner.title || `Banner ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, #DDF4E7 0%, rgba(221, 244, 231, 0.5) 10%, transparent 20%, transparent 100%)'
                    }}
                  ></div>
                  <div 
                    className="absolute inset-0 z-10 opacity-0 dark:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, #124170 0%, rgba(18, 65, 112, 0.5) 10%, transparent 20%, transparent 100%)'
                    }}
                  ></div>
                </div>
              );

              if (banner.link) {
                const isExternal = banner.link.startsWith('http');
                if (isExternal) {
                  return <a href={banner.link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-full h-full block" key={index}>{bannerContent}</a>
                } else {
                  return <Link to={banner.link} className="flex-shrink-0 w-full h-full block" key={index}>{bannerContent}</Link>
                }
              }

              return <div className="flex-shrink-0 w-full h-full block" key={index}>{bannerContent}</div>
            })}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-2 z-10">
            {bannerImages.map((_, index) => {
              const realIndex = bannerIndex === 0 ? bannerImages.length - 1 : 
                               bannerIndex === infiniteBannerImages.length - 1 ? 0 : 
                               bannerIndex - 1
              return (
                <button
                  key={index}
                  onClick={() => {
                    setIsTransitioning(true)
                    setBannerIndex(index + 1)
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
        </section>
      ) : (
        <section 
          className="relative overflow-hidden mb-4"
          style={{ height: `${isMobile ? bannerHeightMobile : bannerHeightDesktop}px` }}
        >
          <div className="absolute inset-0">
            <div className="w-full h-full"
              style={{
                backgroundImage:
                  'radial-gradient(1000px 300px at 10% 10%, rgba(103,192,144,0.25), transparent 60%), radial-gradient(800px 300px at 90% 20%, rgba(15,130,140,0.30), transparent 60%), linear-gradient(135deg, #DDF4E7 0%, #BFEAD4 50%, #AEE3CB 100%)'
              }}
            />
            <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity"
              style={{
                backgroundImage:
                  'radial-gradient(1000px 300px at 10% 10%, rgba(120,185,181,0.20), transparent 60%), radial-gradient(800px 300px at 90% 20%, rgba(15,130,140,0.35), transparent 60%), linear-gradient(135deg, #0B2E4F 0%, #0E3F6E 50%, #124170 100%)'
              }}
            />
          </div>
          <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
            <div className="max-w-3xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Cuidados que combinam com você
              </h1>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
                Produtos manipulados e prontos, com qualidade e praticidade.
              </p>
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3">
                <Link
                  to="/produtos"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-white font-semibold"
                  style={{ backgroundColor: '#67C090' }}
                >
                  Ver produtos
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Produtos em Destaque - Scroll Horizontal */}
      {(() => {
        const featuredSection = sections.find(s => s.key === 'featured' && s.active)
        if (!featuredSection && featuredProducts.length === 0) return null
        
        return (
          <section className="bg-white dark:bg-gray-800 py-4 sm:py-6 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300 mx-2 sm:mx-4 md:mx-8 lg:mx-16 xl:mx-40">
            <div className="px-2 sm:px-3 md:px-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4 px-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {featuredSection?.name || 'Produtos em Destaque'}
                </h2>
                {featuredSection?.show_link !== false && (
                  <Link to="/produtos" className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold flex items-center">
                    Ver todos
                    <ArrowRight className="ml-1" size={14} />
                  </Link>
                )}
              </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
              {featuredProducts.map(product => (
                <Link
                  key={product.id}
                  to={`/produtos/${product.id}`}
                  className="flex-shrink-0 w-40 sm:w-48 bg-white dark:bg-gray-700 rounded-lg p-2 sm:p-3 hover:shadow-md dark:hover:shadow-xl transition-all"
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
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                  {product.promo_price ? (
                    <div className="mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          R$ {Number(product.promo_price || 0).toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 line-through">
                          R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                        {Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)}% OFF
                      </span>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
                      R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  {product.free_shipping && (
                    <p className="text-xs text-green-600">Frete grátis</p>
                  )}
                </Link>
              ))}
            </div>
          ) : null}
            </div>
          </section>
        )
      })()}

      {/* Renderiza todas as seções dinamicamente */}
      {sections
        .filter(section => section.active && section.key !== 'featured')
        .sort((a, b) => a.order - b.order)
        .map(section => {
          const products = sectionProducts[section.id] || []
          if (products.length === 0) return null

          const categoryLink = section.category 
            ? `/produtos?categoria=${section.category}`
            : '/produtos'

          return (
            <section 
              key={section.id}
              className="bg-white dark:bg-gray-800 py-4 sm:py-6 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300 mx-2 sm:mx-4 md:mx-8 lg:mx-16 xl:mx-40"
            >
              <div className="px-2 sm:px-3 md:px-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4 px-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {section.name}
                  </h2>
                  {section.show_link !== false && (
                    <Link 
                      to={categoryLink} 
                      className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center"
                    >
                      Ver todos
                      <ArrowRight className="ml-1" size={14} />
                    </Link>
                  )}
                </div>
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
                  {products.map(product => (
                    <Link
                      key={product.id}
                      to={`/produtos/${product.id}`}
                      className="flex-shrink-0 w-40 sm:w-48 bg-white dark:bg-gray-700 rounded-lg p-2 sm:p-3 hover:shadow-md dark:hover:shadow-xl transition-all"
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
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
                        R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                      </p>
                      {product.free_shipping && (
                        <p className="text-xs text-green-600">Frete grátis</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )
        })}

      {/* Reviews - Carrossel */}
      {reviews.length > 0 && (
        <section className="bg-white dark:bg-gray-800 py-6 sm:py-8 rounded-lg mb-4 shadow-sm dark:shadow-lg transition-colors duration-300 mx-2 sm:mx-4 md:mx-8 lg:mx-16 xl:mx-40">
          <div className="px-2 sm:px-3 md:px-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center px-2">O que nossos clientes dizem</h2>
            
            <div className="relative">
              {/* Container do carrossel */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${reviewIndex * (isMobile ? 100 : 50)}%)` }}
                >
                  {reviews.map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-full sm:w-1/2 px-2">
                      <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md dark:hover:shadow-xl transition-shadow h-full">
                        <div className="flex items-center mb-2 sm:mb-3">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="text-yellow-400 fill-current" size={16} />
                          ))}
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base mb-3 sm:mb-4">"{review.comment}"</p>
                        {(review.show_image !== false || review.show_name !== false || review.show_date !== false || review.show_product !== false) && (
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Avatar circular - só mostra se show_image for true */}
                            {review.show_image !== false && (
                              <div className="flex-shrink-0">
                                <img
                                  src={review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name || 'Cliente')}&size=64&background=67C090&color=fff&bold=true`}
                                  alt={review.name || 'Cliente'}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name || 'Cliente')}&size=64&background=67C090&color=fff&bold=true`
                                  }}
                                />
                              </div>
                            )}
                            {(review.show_name !== false || review.show_date !== false || review.show_product !== false) && (
                              <div className="flex-1 min-w-0">
                                {review.show_name !== false && review.name && (
                                  <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{review.name}</p>
                                )}
                                {((review.show_product !== false && review.product) || (review.show_date !== false && review.date)) && (
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                                    {review.show_product !== false && review.product && `${review.product}`}
                                    {review.show_product !== false && review.product && review.show_date !== false && review.date && ' • '}
                                    {review.show_date !== false && review.date && review.date}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controles de navegação */}
              <div className="flex items-center justify-center mt-6 space-x-4">
                <button
                  onClick={prevReview}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-primary-500 text-gray-700 dark:text-white transition-colors"
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
                            : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                        style={currentIndex === reviewIndex ? { backgroundColor: '#67C090' } : {}}
                        aria-label={`Ir para reviews ${currentIndex + 1}-${currentIndex + 2}`}
                      />
                    )
                  })}
                </div>
                
                <button
                  onClick={nextReview}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-primary-500 text-gray-700 dark:text-white transition-colors"
                  aria-label="Próximo review"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
