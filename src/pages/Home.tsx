import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Pill, Sparkles, Shield, Star, ChevronLeft, ChevronRight, Truck, CheckCircle, Heart, Award, Users } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'
import { productsService } from '../services/products.service'

// Reviews de clientes
const reviews = [
  {
    id: 1,
    name: 'Maria Silva',
    rating: 5,
    comment: 'Excelente qualidade! Os medicamentos manipulados são perfeitos e a entrega foi super rápida. Recomendo muito!',
    product: 'Vitamina D3',
    date: 'Há 2 semanas'
  },
  {
    id: 2,
    name: 'João Santos',
    rating: 5,
    comment: 'Atendimento impecável e produtos de alta qualidade. A personalização funcionou perfeitamente para minhas necessidades.',
    product: 'Magnésio Quelato',
    date: 'Há 1 mês'
  },
  {
    id: 3,
    name: 'Ana Costa',
    rating: 5,
    comment: 'Melhor farmácia de manipulação que já usei! Produtos frescos, bem embalados e com ótimo custo-benefício.',
    product: 'Ginkgo Biloba',
    date: 'Há 3 semanas'
  },
  {
    id: 4,
    name: 'Carlos Oliveira',
    rating: 5,
    comment: 'Profissionais muito competentes. Me ajudaram a encontrar exatamente o que precisava. Super satisfeito!',
    product: 'Complexo B',
    date: 'Há 2 meses'
  },
  {
    id: 5,
    name: 'Patrícia Lima',
    rating: 5,
    comment: 'Entrega rápida e produtos de qualidade superior. Já fiz várias compras e sempre fico satisfeita.',
    product: 'Ômega 3',
    date: 'Há 1 semana'
  }
]

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carrega produtos em destaque
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await productsService.getAll()
        // Pega os primeiros 6 produtos ou todos se houver menos
        setFeaturedProducts(products.slice(0, 6))
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Auto-rotaciona reviews
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % reviews.length)
  }

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Medicamentos Manipulados de{' '}
              <span className="text-primary-600">Qualidade Premium</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Kapsu oferece medicamentos manipulados personalizados, desenvolvidos com os melhores 
              ativos farmacêuticos para sua saúde e bem-estar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/produtos" className="btn-primary inline-flex items-center justify-center">
                Explorar Produtos
                <ArrowRight className="ml-2" size={20} />
              </Link>
              <Link to="/personalizar" className="btn-secondary inline-flex items-center justify-center">
                Personalizar Medicamento
                <Sparkles className="ml-2" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Estatísticas */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">10K+</div>
              <div className="text-sm text-gray-600">Clientes Satisfeitos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-sm text-gray-600">Produtos Disponíveis</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">4.9</div>
              <div className="text-sm text-gray-600">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">15+</div>
              <div className="text-sm text-gray-600">Anos de Experiência</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Por que escolher a Kapsu?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Oferecemos soluções completas em medicamentos manipulados com qualidade e personalização
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl hover:bg-primary-50 transition-colors">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="text-primary-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalização Total</h3>
              <p className="text-gray-600">
                Crie medicamentos sob medida com dosagens e combinações específicas para suas necessidades.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl hover:bg-primary-50 transition-colors">
              <div className="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-medical-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Qualidade Garantida</h3>
              <p className="text-gray-600">
                Utilizamos apenas os melhores ativos farmacêuticos, com rigoroso controle de qualidade.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl hover:bg-primary-50 transition-colors">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="text-primary-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Entrega Rápida</h3>
              <p className="text-gray-600">
                Receba seus medicamentos com segurança e agilidade em todo o Brasil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <section className="py-16 bg-primary-50/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Produtos em Destaque</h2>
              <p className="text-gray-600">Seleção especial dos nossos melhores produtos</p>
            </div>
            <Link to="/produtos" className="text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              Ver Todos
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum produto disponível no momento
            </div>
          )}
        </div>
      </section>

      {/* Reviews Carousel */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">O que nossos clientes dizem</h2>
            <p className="text-gray-600">Avaliações reais de clientes satisfeitos</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-4">
                {[...Array(reviews[currentReviewIndex].rating)].map((_, i) => (
                  <Star key={i} className="text-yellow-400 fill-current" size={24} />
                ))}
              </div>
              <p className="text-gray-700 text-lg mb-6 italic">
                "{reviews[currentReviewIndex].comment}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{reviews[currentReviewIndex].name}</p>
                  <p className="text-sm text-gray-500">
                    {reviews[currentReviewIndex].product} • {reviews[currentReviewIndex].date}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevReview}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Review anterior"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <div className="flex space-x-1">
                    {reviews.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentReviewIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentReviewIndex
                            ? 'w-8 bg-primary-600'
                            : 'w-2 bg-gray-300'
                        }`}
                        aria-label={`Ir para review ${index + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextReview}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Próximo review"
                  >
                    <ChevronRight size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mini reviews grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                <div className="flex items-center mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="text-yellow-400 fill-current" size={16} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-4 line-clamp-3">"{review.comment}"</p>
                <p className="font-semibold text-gray-900 text-sm">{review.name}</p>
                <p className="text-xs text-gray-500">{review.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-16 bg-gradient-to-br from-primary-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossas Categorias</h2>
            <p className="text-gray-600">Explore nossa variedade de produtos</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Link
              to="/produtos?categoria=vitamina"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all hover:scale-105 border border-gray-100"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="text-primary-600" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Vitaminas</h3>
              <p className="text-sm text-gray-600">Suplementos vitamínicos</p>
            </Link>
            <Link
              to="/produtos?categoria=mineral"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all hover:scale-105 border border-gray-100"
            >
              <div className="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-medical-600" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Minerais</h3>
              <p className="text-sm text-gray-600">Suplementos minerais</p>
            </Link>
            <Link
              to="/produtos?categoria=fitoterapico"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all hover:scale-105 border border-gray-100"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-primary-600" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fitoterápicos</h3>
              <p className="text-sm text-gray-600">Produtos naturais</p>
            </Link>
            <Link
              to="/personalizar"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all hover:scale-105 border border-gray-100"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-primary-600" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Personalizar</h3>
              <p className="text-sm text-gray-600">Crie seu medicamento</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Banner Promocional */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-white/20 rounded-full px-4 py-2 mb-6">
              <span className="text-sm font-semibold">🎉 Promoção Especial</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">Frete Grátis em Compras Acima de R$ 99</h2>
            <p className="text-xl mb-8 text-white/90">
              Aproveite nossa promoção e receba seus medicamentos sem custo de frete!
            </p>
            <Link 
              to="/produtos" 
              className="bg-white text-primary-600 hover:bg-primary-50 font-semibold py-3 px-8 rounded-lg inline-flex items-center transition-colors"
            >
              Comprar Agora
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Truck className="text-primary-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Entrega Rápida</h3>
                <p className="text-sm text-gray-600">Receba em 2-3 dias úteis</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Shield className="text-primary-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Qualidade Garantida</h3>
                <p className="text-sm text-gray-600">Produtos certificados</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-primary-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Atendimento 24/7</h3>
                <p className="text-sm text-gray-600">Suporte sempre disponível</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="text-primary-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">10K+ Clientes</h3>
                <p className="text-sm text-gray-600">Confiança comprovada</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
