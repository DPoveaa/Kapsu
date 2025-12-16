import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { productsService } from '../services/products.service'
import ImageUpload from '../components/ImageUpload'

const categories = [
  { value: 'vitamina', label: 'Vitamina' },
  { value: 'mineral', label: 'Mineral' },
  { value: 'fitoterapico', label: 'Fitoterápico' },
  { value: 'outros', label: 'Outros' },
]

export default function CreateProduct() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image: '',
    category: 'outros',
    compositions: '',
    indication: '',
    contraindication: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
      await productsService.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: Number(formData.price),
        stock: formData.stock ? Number(formData.stock) : undefined,
        image: formData.image.trim() || undefined,
        category: formData.category || undefined,
        compositions: formData.compositions.trim() || undefined,
        indication: formData.indication.trim() || undefined,
        contraindication: formData.contraindication.trim() || undefined,
      })

      // Redireciona para a lista de produtos após criar
      navigate('/produtos')
    } catch (err: any) {
      console.error('Erro ao criar produto:', err)
      setError(err.message || 'Erro ao criar produto')
    } finally {
      setLoading(false)
    }
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

        <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Criar Novo Produto</h1>

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
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="0.00"
                />
              </div>

              {/* Estoque */}
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estoque
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="0"
                />
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
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
                disabled={loading}
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                placeholder="Informe as contraindicações do produto..."
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-[#0F828C]">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
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
                    Criar Produto
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

