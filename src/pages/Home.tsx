import { Link } from 'react-router-dom'
import { ArrowRight, Pill, Sparkles, Shield } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'

// Mock data - em produção viria de uma API
const featuredProducts: Product[] = [
  {
    id: '1',
    name: 'Vitamina D3 2000UI',
    description: 'Suplemento de vitamina D3 para fortalecimento ósseo e sistema imunológico',
    price: 45.90,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    category: 'vitamina',
    inStock: true,
    isCustomizable: true
  },
  {
    id: '2',
    name: 'Magnésio Quelato',
    description: 'Magnésio de alta absorção para relaxamento muscular e saúde cardiovascular',
    price: 38.50,
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
    category: 'mineral',
    inStock: true,
    isCustomizable: true
  },
  {
    id: '3',
    name: 'Extrato de Ginkgo Biloba',
    description: 'Fitoterápico para memória, concentração e circulação',
    price: 52.00,
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400',
    category: 'fitoterapico',
    inStock: true,
    isCustomizable: false
  }
]

export default function Home() {
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
              Sanare oferece medicamentos manipulados personalizados, desenvolvidos com os melhores 
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

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="text-primary-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalização Total</h3>
              <p className="text-gray-600">
                Crie medicamentos sob medida com dosagens e combinações específicas para suas necessidades.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-medical-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Qualidade Garantida</h3>
              <p className="text-gray-600">
                Utilizamos apenas os melhores ativos farmacêuticos, com rigoroso controle de qualidade.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-primary-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Produtos Pré-prontos</h3>
              <p className="text-gray-600">
                Escolha entre nossa seleção de produtos prontos ou personalize conforme necessário.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-primary-50/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Produtos em Destaque</h2>
            <Link to="/produtos" className="text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              Ver Todos os Produtos
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-medical-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl mb-8 text-white/90">
            Explore nossa seleção completa de medicamentos manipulados e melhore sua saúde hoje mesmo.
          </p>
          <Link to="/produtos" className="bg-white text-primary-600 hover:bg-primary-50 font-semibold py-3 px-8 rounded-lg inline-block transition-colors">
            Começar Agora
          </Link>
        </div>
      </section>
    </div>
  )
}

