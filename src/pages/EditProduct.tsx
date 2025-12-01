import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { productsService } from '../services/products.service'

const categories = [
  { value: 'vitamina', label: 'Vitamina' },
  { value: 'mineral', label: 'Mineral' },
  { value: 'fitoterapico', label: 'Fitoterápico' },
  { value: 'outros', label: 'Outros' },
]

export default function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image: '',
    category: 'outros',
    active: true,
    compositions: '',
    indication: '',
    contraindication: '',
  })

  // Carrega produto para edição
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError('ID do produto não fornecido')
        setLoadingProduct(false)
        return
      }

      try {
        setLoadingProduct(true)
        setError(null)
        // Usa método raw para obter stock do backend
        const productRaw = await (productsService as any).getByIdForAdminRaw(id)
        const product = await productsService.getByIdForAdmin(id)
        setFormData({
          name: product.name,
          description: product.description || '',
          price: product.price.toString(),
          stock: productRaw.stock?.toString() || '0',
          image: product.image || '',
          category: product.category || 'outros',
          active: productRaw.active ?? true,
          compositions: productRaw.compositions || '',
          indication: productRaw.indication || '',
          contraindication: productRaw.contraindication || '',
        })
      } catch (err: any) {
        console.error('Erro ao carregar produto:', err)
        setError(err.message || 'Erro ao carregar produto')
      } finally {
        setLoadingProduct(false)
      }
    }

    loadProduct()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!id) {
      setError('ID do produto não fornecido')
      return
    }

    // Validação
    if (!formData.name.trim()) {
      setError('O nome do produto é obrigatório')
      return
    }

    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError('O preço deve ser um número positivo')
      return
    }

    try {
      setLoading(true)
      await productsService.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: Number(formData.price),
        stock: formData.stock ? Number(formData.stock) : undefined,
        image: formData.image.trim() || undefined,
        category: formData.category || undefined,
        active: formData.active,
        compositions: formData.compositions.trim() || undefined,
        indication: formData.indication.trim() || undefined,
        contraindication: formData.contraindication.trim() || undefined,
      })

      // Redireciona para a lista de produtos após atualizar
      navigate('/admin/products')
    } catch (err: any) {
      console.error('Erro ao atualizar produto:', err)
      setError(err.message || 'Erro ao atualizar produto')
    } finally {
      setLoading(false)
    }
  }

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Voltar
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Editar Produto</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ex: Vitamina D3 2000UI"
              />
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Descreva o produto..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preço */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Preço (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Estoque */}
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                  Estoque
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Categoria */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Imagem */}
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  URL da Imagem
                </label>
                <input
                  type="url"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
            </div>

            {/* Composições */}
            <div>
              <label htmlFor="compositions" className="block text-sm font-medium text-gray-700 mb-2">
                Composições
              </label>
              <textarea
                id="compositions"
                name="compositions"
                value={formData.compositions}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Informe as composições do produto..."
              />
            </div>

            {/* Indicação */}
            <div>
              <label htmlFor="indication" className="block text-sm font-medium text-gray-700 mb-2">
                Indicação
              </label>
              <textarea
                id="indication"
                name="indication"
                value={formData.indication}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Informe as indicações do produto..."
              />
            </div>

            {/* Contraindicação */}
            <div>
              <label htmlFor="contraindication" className="block text-sm font-medium text-gray-700 mb-2">
                Contraindicação
              </label>
              <textarea
                id="contraindication"
                name="contraindication"
                value={formData.contraindication}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Informe as contraindicações do produto..."
              />
            </div>

            {/* Ativo */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Produto ativo</span>
              </label>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} className="mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

