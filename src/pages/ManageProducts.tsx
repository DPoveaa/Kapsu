import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Search, Package, FlaskConical } from 'lucide-react'
import { productsService } from '../services/products.service'
import { Product } from '../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'

export default function ManageProducts() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'products' | 'compostos'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  // Carrega produtos
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productsService.getAllForAdmin()
      setProducts(data)
    } catch (err: any) {
      console.error('Erro ao carregar produtos:', err)
      setError(err.message || 'Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return
    }

    try {
      setDeletingId(id)
      await productsService.delete(id)
      await loadProducts() // Recarrega a lista
    } catch (err: any) {
      console.error('Erro ao excluir produto:', err)
      alert(err.message || 'Erro ao excluir produto')
    } finally {
      setDeletingId(null)
    }
  }


  // Filtra produtos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111827]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Voltar
          </button>
          <button
            onClick={() => navigate('/admin/products/create')}
            className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
          >
            <Plus size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Adicionar Produto
          </button>
        </div>

        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Gerenciar Produtos e Compostos</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Gerencie produtos e compostos do sistema</p>
        </div>

        {/* Abas */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-[#0F828C]">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('products')
                setSearchTerm('')
              }}
              className={`${
                activeTab === 'products'
                  ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
              } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center`}
            >
              <Package size={16} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Produtos
            </button>
            <button
              onClick={() => {
                setActiveTab('compostos')
                setSearchTerm('')
                navigate('/admin/compostos')
              }}
              className={`${
                activeTab === 'compostos'
                  ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
              } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center`}
            >
              <FlaskConical size={16} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Compostos
            </button>
          </nav>
        </div>

        {/* Busca */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-[#111827] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400 w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabela de Produtos - Desktop / Cards - Mobile */}
        {!loading && !error && (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden lg:block bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-[#0F828C]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-[#0F828C]">
                  <thead className="bg-gray-50 dark:bg-[#065084]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Preço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estoque
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#065084] divide-y divide-gray-200 dark:divide-[#0F828C]">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          Nenhum produto encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-[#065084]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-10 w-10 rounded-lg object-cover mr-3"
                                onError={handleProductImageError}
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">
                                  {product.description || 'Sem descrição'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              product.inStock
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {product.inStock ? 'Em estoque' : 'Sem estoque'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                disabled={deletingId === product.id}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                                title="Excluir"
                              >
                                {deletingId === product.id ? (
                                  <Loader2 className="animate-spin" size={18} />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Cards */}
            <div className="lg:hidden space-y-3">
              {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-3 sm:p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover flex-shrink-0"
                        onError={handleImageError}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 break-words">{product.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mb-2 line-clamp-2">
                          {product.description || 'Sem descrição'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${
                            product.inStock
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {product.inStock ? 'Em estoque' : 'Sem estoque'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                              className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              disabled={deletingId === product.id}
                              className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              {deletingId === product.id ? (
                                <Loader2 className="animate-spin w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                              ) : (
                                <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

