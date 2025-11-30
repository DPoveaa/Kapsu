import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'

// Mock data - em produção viria de uma API
const allProducts: Product[] = [
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
  },
  {
    id: '4',
    name: 'Vitamina C 1000mg',
    description: 'Vitamina C de alta concentração para fortalecimento do sistema imunológico',
    price: 32.90,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    category: 'vitamina',
    inStock: true,
    isCustomizable: true
  },
  {
    id: '5',
    name: 'Zinco Quelato',
    description: 'Zinco essencial para sistema imunológico e cicatrização',
    price: 28.50,
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
    category: 'mineral',
    inStock: true,
    isCustomizable: true
  },
  {
    id: '6',
    name: 'Óleo de Prímula',
    description: 'Fitoterápico rico em ácidos graxos essenciais para saúde hormonal',
    price: 48.00,
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400',
    category: 'fitoterapico',
    inStock: true,
    isCustomizable: false
  }
]

const categories = [
  { value: 'all', label: 'Todos' },
  { value: 'vitamina', label: 'Vitaminas' },
  { value: 'mineral', label: 'Minerais' },
  { value: 'fitoterapico', label: 'Fitoterápicos' },
  { value: 'outros', label: 'Outros' }
]

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Nossos Produtos</h1>
        <p className="text-gray-600">
          Explore nossa seleção completa de medicamentos manipulados e produtos pré-prontos
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden btn-secondary flex items-center justify-center"
          >
            <Filter size={20} className="mr-2" />
            Filtros
          </button>
        </div>

        {/* Category Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Nenhum produto encontrado.</p>
          <p className="text-gray-500 mt-2">Tente ajustar seus filtros de busca.</p>
        </div>
      )}
    </div>
  )
}




