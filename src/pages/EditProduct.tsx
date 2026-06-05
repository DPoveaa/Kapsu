import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { productsService } from '../services/products.service'
import ImageUpload from '../components/ImageUpload'

// Static categories array removed from global scope to be loaded dynamically

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
    purchase_price: '',
    markup: '',
    image: '',
    category: 'Outros',
    active: true,
    compositions: '',
    indication: '',
    contraindication: '',
    free_shipping: false,
  })

  const [existingCategories, setExistingCategories] = useState<string[]>([
    'Vitamina', 'Mineral', 'Fitoterápico', 'Outros'
  ])
  const [newCatInput, setNewCatInput] = useState('')

  const handleAddNewCat = () => {
    const trimmed = newCatInput.trim()
    if (!trimmed) return
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    
    if (!existingCategories.includes(formatted)) {
      setExistingCategories(prev => [...prev, formatted].sort((a, b) => a.localeCompare(b)))
    }
    
    const currentCats = formData.category.split(',').map(s => s.trim()).filter(Boolean)
    if (!currentCats.includes(formatted)) {
      const updatedCats = [...currentCats, formatted]
      setFormData(prev => ({ ...prev, category: updatedCats.join(', ') }))
    }
    setNewCatInput('')
  }

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
          purchase_price: productRaw.purchase_price ? productRaw.purchase_price.toString() : '',
          markup: productRaw.markup ? productRaw.markup.toString() : '',
          image: product.image || '',
          category: product.category || 'Outros',
          active: productRaw.active ?? true,
          compositions: productRaw.compositions || '',
          indication: productRaw.indication || '',
          contraindication: productRaw.contraindication || '',
          free_shipping: productRaw.free_shipping ?? false,
        })

        // Load all unique categories from products
        const allProds = await productsService.getAllForAdmin()
        const catsSet = new Set<string>(['Vitamina', 'Mineral', 'Fitoterápico', 'Outros'])
        for (const p of allProds) {
          if (p.category) {
            p.category.split(',').forEach(c => {
              const trimmed = c.trim()
              if (trimmed) {
                catsSet.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase())
              }
            })
          }
        }
        setExistingCategories(Array.from(catsSet).sort((a, b) => a.localeCompare(b)))
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

  const handlePriceFieldChange = (name: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value }

      const cost = name === 'purchase_price' ? Number(value) : Number(prev.purchase_price)

      if (name === 'purchase_price') {
        const costNum = Number(value)
        if (costNum > 0) {
          if (prev.markup && !isNaN(Number(prev.markup))) {
            const calculatedPrice = costNum * (1 + Number(prev.markup) / 100)
            updated.price = isNaN(calculatedPrice) ? prev.price : calculatedPrice.toFixed(2)
          } else if (prev.price && !isNaN(Number(prev.price))) {
            const calculatedMarkup = ((Number(prev.price) - costNum) / costNum) * 100
            updated.markup = isNaN(calculatedMarkup) ? prev.markup : calculatedMarkup.toFixed(1)
          }
        } else {
          updated.markup = ''
        }
      } else if (name === 'markup') {
        const markupNum = Number(value)
        if (cost > 0 && value !== '') {
          const calculatedPrice = cost * (1 + markupNum / 100)
          updated.price = isNaN(calculatedPrice) ? prev.price : calculatedPrice.toFixed(2)
        }
      } else if (name === 'price') {
        const priceNum = Number(value)
        if (cost > 0 && priceNum > 0) {
          const calculatedMarkup = ((priceNum - cost) / cost) * 100
          updated.markup = isNaN(calculatedMarkup) ? prev.markup : calculatedMarkup.toFixed(1)
        }
      }

      return updated
    })
  }

  const marginInfo = useMemo(() => {
    const cost = Number(formData.purchase_price)
    const sale = Number(formData.price)
    if (!isNaN(cost) && !isNaN(sale) && cost > 0 && sale > 0) {
      const profit = sale - cost
      const margin = (profit / sale) * 100
      return {
        margin: margin.toFixed(1).replace('.', ','),
        profit: profit.toFixed(2).replace('.', ','),
        isPositive: profit >= 0
      }
    }
    return null
  }, [formData.purchase_price, formData.price])

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
      setError('O preço de venda deve ser um número positivo')
      return
    }

    // Validação de preço de compra
    if (formData.purchase_price && (isNaN(Number(formData.purchase_price)) || Number(formData.purchase_price) <= 0)) {
      setError('O preço de compra deve ser um número positivo')
      return
    }

    // Validação de preço promocional
    if (formData.promo_price && (isNaN(Number(formData.promo_price)) || Number(formData.promo_price) <= 0)) {
      setError('O preço promocional deve ser um número positivo')
      return
    }

    if (formData.promo_price && Number(formData.promo_price) >= Number(formData.price)) {
      setError('O preço promocional deve ser menor que o preço de venda')
      return
    }

    try {
      setLoading(true)
      await productsService.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: Number(formData.price),
        promo_price: formData.promo_price ? Number(formData.promo_price) : null,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        markup: formData.markup ? Number(formData.markup) : null,
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {/* Preço de Compra */}
              <div>
                <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preço de Compra (Custo) (R$)
                </label>
                <input
                  type="number"
                  id="purchase_price"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={(e) => handlePriceFieldChange('purchase_price', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="0.00 (opcional)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Custo pago pelo produto.</p>
              </div>

              {/* Markup (%) */}
              <div>
                <label htmlFor="markup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Markup (%)
                </label>
                <input
                  type="number"
                  id="markup"
                  name="markup"
                  value={formData.markup}
                  onChange={(e) => handlePriceFieldChange('markup', e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ex: 50"
                  disabled={!formData.purchase_price || Number(formData.purchase_price) <= 0}
                  title={(!formData.purchase_price || Number(formData.purchase_price) <= 0) ? "Preencha o Preço de Compra para utilizar o markup" : ""}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Margem sobre o custo.</p>
              </div>

              {/* Preço de Venda */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={(e) => handlePriceFieldChange('price', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                {marginInfo && (
                  <p className={`text-[11px] font-semibold mt-1 ${marginInfo.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    Margem: {marginInfo.margin}% (R$ {marginInfo.profit})
                  </p>
                )}
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
                  Deixe vazio se não houver promoção.
                </p>
              </div>
            </div>
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categorias do Produto
              </label>
              <div className="flex flex-wrap gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {existingCategories.map(cat => {
                  const isChecked = formData.category.split(',').map(s => s.trim().toLowerCase()).includes(cat.toLowerCase())
                  return (
                    <label key={cat} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          const currentCats = formData.category.split(',').map(s => s.trim()).filter(Boolean)
                          let newCats: string[]
                          if (e.target.checked) {
                            if (currentCats.length === 1 && currentCats[0].toLowerCase() === 'outros' && cat.toLowerCase() !== 'outros') {
                              newCats = [cat]
                            } else {
                              newCats = [...currentCats, cat]
                            }
                          } else {
                            newCats = currentCats.filter(c => c.toLowerCase() !== cat.toLowerCase())
                          }
                          if (newCats.length === 0) newCats = ['Outros']
                          setFormData(prev => ({ ...prev, category: newCats.join(', ') }))
                        }}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      {cat}
                    </label>
                  )
                })}
              </div>
              
              {/* Add Custom Category Input */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Nova categoria..."
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddNewCat}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  + Adicionar Categoria
                </button>
              </div>
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

