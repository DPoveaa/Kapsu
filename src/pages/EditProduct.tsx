import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { productsService } from '../services/products.service'
import ImageUpload from '../components/ImageUpload'

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
  const [imageError, setImageError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promo_price: '',
    image: '',
    category: 'outros',
    active: true,
    compositions: '',
    indication: '',
    contraindication: '',
    free_shipping: false,
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
          promo_price: productRaw.promo_price ? productRaw.promo_price.toString() : '',
          image: product.image || '',
          category: product.category || 'outros',
          active: productRaw.active ?? true,
          compositions: productRaw.compositions || '',
          indication: productRaw.indication || '',
          contraindication: productRaw.contraindication || '',
          free_shipping: productRaw.free_shipping ?? false,
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

    // Validação de preço promocional
    if (formData.promo_price && (isNaN(Number(formData.promo_price)) || Number(formData.promo_price) <= 0)) {
      setError('O preço promocional deve ser um número positivo')
      return
    }

    if (formData.promo_price && Number(formData.promo_price) >= Number(formData.price)) {
      setError('O preço promocional deve ser menor que o preço normal')
      return
    }

    try {
      setLoading(true)
      await productsService.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: Number(formData.price),
        promo_price: formData.promo_price ? Number(formData.promo_price) : null,
        image: formData.image.trim() || undefined,
        category: formData.category || undefined,
        active: formData.active,
        compositions: formData.compositions.trim() || undefined,
        indication: formData.indication.trim() || undefined,
        contraindication: formData.contraindication.trim() || undefined,
        free_shipping: formData.free_shipping,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Voltar
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Editar Produto</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          {imageError && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-600 dark:text-yellow-300">{imageError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome do Produto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                placeholder="Ex: Vitamina D3 2000UI"
              />
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                placeholder="Descreva o produto..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preço */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              {/* Preço Promocional */}
              <div>
                <label htmlFor="promo_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preço Promocional (R$)
                </label>
                <input
                  type="number"
                  id="promo_price"
                  name="promo_price"
                  value={formData.promo_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="0.00 (opcional)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Deixe vazio se não houver promoção. Deve ser menor que o preço normal.
                </p>
              </div>
            </div>



            {/* Categoria */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Imagem do Produto
              </label>
              <ImageUpload
                value={formData.image}
                onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                onError={(err) => setImageError(err || null)}
                disabled={loading || loadingProduct}
              />
            </div>

            {/* Composições */}
            <div>
              <label htmlFor="compositions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Composições
              </label>
              <textarea
                id="compositions"
                name="compositions"
                value={formData.compositions}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                placeholder="Informe as composições do produto..."
              />
            </div>

            {/* Indicação */}
            <div>
              <label htmlFor="indication" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Indicação
              </label>
              <textarea
                id="indication"
                name="indication"
                value={formData.indication}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                placeholder="Informe as indicações do produto..."
              />
            </div>

            {/* Contraindicação */}
            <div>
              <label htmlFor="contraindication" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraindicação
              </label>
              <textarea
                id="contraindication"
                name="contraindication"
                value={formData.contraindication}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                placeholder="Informe as contraindicações do produto..."
              />
            </div>

            {/* Frete Grátis */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="free_shipping"
                name="free_shipping"
                checked={formData.free_shipping}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-700"
              />
              <label htmlFor="free_shipping" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Oferecer frete grátis para este produto
              </label>
            </div>

            {/* Ativo */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="mr-2 dark:border-gray-700"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Produto ativo</span>
              </label>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
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

