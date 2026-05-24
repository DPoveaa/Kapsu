import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Search, Upload } from 'lucide-react'
import { productsService } from '../services/products.service'
import { Product } from '../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import * as XLSX from 'xlsx'

export default function ManageProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // State para Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importRows, setImportRows] = useState<any[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    name: '',
    price: '',
    description: '',
    category: '',
    promo_price: ''
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
      
      if (data.length > 0) {
        const headers = (data[0] as any[]).map(h => String(h))
        setImportHeaders(headers)
        
        const rows = data.slice(1)
        setImportRows(rows)
        
        // Auto detecção
        const newMapping = { ...columnMapping }
        headers.forEach((header) => {
          const headerStr = header.toLowerCase()
          if (headerStr.includes('nome') || headerStr.includes('name')) {
            newMapping.name = header
          } else if (headerStr.includes('preço') || headerStr.includes('preco') || headerStr.includes('price')) {
            newMapping.price = header
          } else if (headerStr.includes('desc') || headerStr.includes('about')) {
            newMapping.description = header
          } else if (headerStr.includes('cat')) {
            newMapping.category = header
          } else if (headerStr.includes('promoc') || headerStr.includes('promo')) {
            newMapping.promo_price = header
          }
        })
        setColumnMapping(newMapping)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImportConfirm = async () => {
    // Validação
    if (!columnMapping.name || !columnMapping.price) {
      alert('As colunas de Nome e Preço são obrigatórias para importação.')
      return
    }

    try {
      setLoading(true)
      setIsImportModalOpen(false)

      let importedCount = 0
      for (const row of importRows) {
        const productData: any = {}
        
        // Mapeia os dados
        Object.keys(columnMapping).forEach((field) => {
          const header = columnMapping[field]
          if (header) {
            const colIndex = importHeaders.indexOf(header)
            if (colIndex !== -1) {
              let value = row[colIndex]
              
              // Tratamento especial para preços
              if (field === 'price' || field === 'promo_price') {
                if (value) {
                  // Remove R$ e converte para número
                  value = String(value).replace('R$', '').replace(/\s/g, '').replace(',', '.')
                  value = parseFloat(value)
                } else {
                  value = null
                }
              }
              
              if (value !== undefined) {
                productData[field] = value
              }
            }
          }
        })

        // Se tiver nome e preço válido, cria o produto
        if (productData.name && !isNaN(productData.price)) {
          await productsService.create(productData)
          importedCount++
        }
      }

      alert(`${importedCount} produtos importados com sucesso!`)
      await loadProducts()
    } catch (err: any) {
      console.error('Erro ao importar produtos:', err)
      alert(err.message || 'Erro ao importar produtos')
    } finally {
      setLoading(false)
      setImportHeaders([])
      setImportRows([])
    }
  }

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  // Carrega produtos
  useEffect(() => {
    loadProducts()
  }, [])

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} produtos?`)) {
      return;
    }
    
    if (!confirm('Esta ação é irreversível e os produtos serão apagados permanentemente. Confirma novamente?')) {
      return;
    }

    try {
      setLoading(true);
      await productsService.deleteBulk(selectedIds);
      setSelectedIds([]);
      await loadProducts();
    } catch (err: any) {
      console.error('Erro ao excluir produtos em massa:', err);
      alert(err.message || 'Erro ao excluir produtos em massa');
    } finally {
      setLoading(false);
    }
  }

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

  const handleToggleActive = async (product: Product) => {
    try {
      // Atualização otimista
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !p.active } : p))
      await productsService.update(product.id, { active: !product.active })
    } catch (err: any) {
      console.error('Erro ao alternar status do produto:', err)
      // Reverte a alteração em caso de erro
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: product.active } : p))
      alert(err.message || 'Erro ao alternar status do produto')
    }
  }


  // Filtra produtos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Voltar
          </button>
          <div ref={dropdownRef} className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              <Plus size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Adicionar
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/admin/products/create')
                      setIsDropdownOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <Plus size={16} className="mr-2" />
                    Novo Produto
                  </button>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(true)
                      setIsDropdownOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <Upload size={16} className="mr-2" />
                    Importar Excel/CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Gerenciar Produtos</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Gerencie os produtos da loja</p>
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
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            {selectedIds.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  {selectedIds.length} produtos selecionados
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Excluir Selecionados
                </button>
              </div>
            )}

            {/* Desktop: Tabela */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(filteredProducts.map(p => p.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </th>
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
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          Nenhum produto encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-[#065084]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, product.id]);
                                } else {
                                  setSelectedIds(selectedIds.filter(id => id !== product.id));
                                }
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </td>
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
                            <button
                              onClick={() => handleToggleActive(product)}
                              className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                                product.active
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              }`}
                              title={`Clique para ${product.active ? 'desativar' : 'ativar'}`}
                            >
                              {product.active ? 'Ativo' : 'Inativo'}
                            </button>
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
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, product.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== product.id));
                          }
                        }}
                        className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1 flex-shrink-0"
                      />
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
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full transition-colors ${
                              product.active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                            }`}
                            title={`Clique para ${product.active ? 'desativar' : 'ativar'}`}
                          >
                            {product.active ? 'Ativo' : 'Inativo'}
                          </button>
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

        {/* Modal de Importação */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Importar Produtos</h2>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false)
                    setImportHeaders([])
                    setImportRows([])
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-2xl"
                >
                  &times;
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {importHeaders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12">
                    <Upload size={48} className="text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">Selecione um arquivo Excel (.xlsx, .xls) ou CSV</p>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors mt-2"
                    >
                      Selecionar Arquivo
                    </label>
                  </div>
                ) : (
                  <div>
                    {/* Mapping UI */}
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Vincular Colunas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {Object.keys(columnMapping).map((field) => (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {field === 'name' ? 'Nome *' :
                             field === 'price' ? 'Preço *' :
                             field === 'description' ? 'Descrição' :
                             field === 'category' ? 'Categoria' : 'Preço Promocional'}
                          </label>
                          <select
                            value={columnMapping[field]}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Não vincular</option>
                            {importHeaders.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Preview Table */}
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pré-visualização (Primeiras 5 linhas)</h3>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {importHeaders.map((header) => (
                              <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {importRows.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {importHeaders.map((_, colIndex) => (
                                <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {String(row[colIndex] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {importHeaders.length > 0 && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={() => {
                      setImportHeaders([])
                      setImportRows([])
                    }}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                  >
                    Trocar Arquivo
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setIsImportModalOpen(false)
                        setImportHeaders([])
                        setImportRows([])
                      }}
                      className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Confirmar Importação ({importRows.length} linhas)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

