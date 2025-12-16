import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Search, Package, FlaskConical } from 'lucide-react'
import { productsService } from '../services/products.service'
import { Product } from '../types'

export default function ManageProducts() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'products' | 'compostos'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement
    target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
          <button
            onClick={() => navigate('/admin/products/create')}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Adicionar Produto
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gerenciar Produtos e Compostos</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerencie produtos e compostos do sistema</p>
        </div>

        {/* Abas */}
        <div className="mb-6 border-b border-gray-200 dark:border-[#0F828C]">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('products')
                setSearchTerm('')
              }}
              className={`${
                activeTab === 'products'
                  ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Package size={20} className="mr-2" />
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
                  ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FlaskConical size={20} className="mr-2" />
              Compostos
            </button>
          </nav>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={48} />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabela de Produtos */}
        {!loading && !error && (
          <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-[#0F828C]">
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
                              onError={handleImageError}
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
        )}
      </div>
    </div>
  )
}

