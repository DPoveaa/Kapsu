import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Loader2 } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'
import { productsService } from '../services/products.service'

const categories = [
  { value: 'all', label: 'Todos' },
  { value: 'vitamina', label: 'Vitaminas' },
  { value: 'mineral', label: 'Minerais' },
  { value: 'fitoterapico', label: 'Fitoterápicos' },
  { value: 'outros', label: 'Outros' }
]

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Carrega produtos da API
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

  // Filtra produtos localmente (pode ser otimizado para usar a API)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-200 text-black dark:text-black"
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
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-200 text-black hover:bg-gray-100 dark:hover:bg-gray-300 border border-gray-300 dark:border-gray-400'
                }`}
                style={selectedCategory === category.value ? { backgroundColor: '#67C090' } : {}}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={48} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-600 text-lg font-semibold">Erro ao carregar produtos</p>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Nenhum produto encontrado.</p>
          <p className="text-gray-500 mt-2">Tente ajustar seus filtros de busca.</p>
        </div>
      )}
    </div>
  )
}







