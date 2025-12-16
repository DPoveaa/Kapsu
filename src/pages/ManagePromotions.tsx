import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Gift, Percent, DollarSign, Truck, ShoppingBag, X, Edit2, Calendar, Users, Package } from 'lucide-react'
import { promotionsService, Promotion } from '../services/promotions.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'

export default function ManagePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para formulário de nova/edição de promoção
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount_percentage' as 'discount_percentage' | 'discount_fixed' | 'free_shipping' | 'kit',
    active: true,
    discount_value: '',
    min_order_value: '',
    min_product_quantity: '',
    required_product_ids: [] as string[],
    required_operator: 'all' as 'all' | 'any',
    applicable_product_ids: [] as string[],
    free_shipping: false,
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    usage_limit: '',
    user_usage_limit: '',
    priority: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [promotionsData, productsData] = await Promise.all([
        promotionsService.getPromotions(),
        productsService.getAll(),
      ])
      setPromotions(promotionsData)
      setProducts(productsData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePromotion = async () => {
    try {
      if (!formData.name) {
        setError('Nome da promoção é obrigatório')
        return
      }

      // Validação por tipo
      if ((formData.type === 'discount_percentage' || formData.type === 'discount_fixed') && 
          (!formData.discount_value || Number(formData.discount_value) <= 0)) {
        setError('Para tipos de desconto, informe um valor de desconto maior que zero')
        return
      }

      if (formData.type === 'discount_percentage' && Number(formData.discount_value) > 100) {
        setError('Desconto percentual não pode ser maior que 100%')
        return
      }

      setSaving(true)
      setError(null)

      // Monta datas com hora
      let startDate: string | undefined = undefined
      let endDate: string | undefined = undefined

      if (formData.start_date) {
        startDate = formData.start_time 
          ? `${formData.start_date}T${formData.start_time}:00`
          : `${formData.start_date}T00:00:00`
      }

      if (formData.end_date) {
        endDate = formData.end_time 
          ? `${formData.end_date}T${formData.end_time}:00`
          : `${formData.end_date}T23:59:59`
      }

      const promotionData: any = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        active: formData.active,
        priority: Number(formData.priority) || 0,
        free_shipping: formData.free_shipping,
        start_date: startDate,
        end_date: endDate,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : undefined,
        user_usage_limit: formData.user_usage_limit ? Number(formData.user_usage_limit) : undefined,
      }

      if (formData.discount_value) {
        promotionData.discount_value = Number(formData.discount_value)
      }
      if (formData.min_order_value) {
        promotionData.min_order_value = Number(formData.min_order_value)
      }
      if (formData.min_product_quantity) {
        promotionData.min_product_quantity = Number(formData.min_product_quantity)
      }
      if (formData.required_product_ids.length > 0) {
        promotionData.required_product_ids = formData.required_product_ids
        promotionData.required_operator = formData.required_operator
      }
      if (formData.applicable_product_ids.length > 0) {
        promotionData.applicable_product_ids = formData.applicable_product_ids
      }

      if (editingPromotion) {
        await promotionsService.updatePromotion(editingPromotion.id, promotionData)
        setSuccess('Promoção atualizada com sucesso!')
      } else {
        await promotionsService.createPromotion(promotionData)
        setSuccess('Promoção criada com sucesso!')
      }

      setTimeout(() => setSuccess(null), 3000)
      
      // Limpa formulário e recarrega dados
      resetForm()
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar promoção')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta promoção?')) return

    try {
      setError(null)
      await promotionsService.deletePromotion(id)
      setSuccess('Promoção removida com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao remover promoção')
    }
  }

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    
    // Separa data e hora
    let startDate = ''
    let startTime = ''
    let endDate = ''
    let endTime = ''

    if (promotion.start_date) {
      const start = new Date(promotion.start_date)
      startDate = start.toISOString().split('T')[0]
      startTime = start.toTimeString().split(' ')[0].substring(0, 5)
    }

    if (promotion.end_date) {
      const end = new Date(promotion.end_date)
      endDate = end.toISOString().split('T')[0]
      endTime = end.toTimeString().split(' ')[0].substring(0, 5)
    }

    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      active: promotion.active,
      discount_value: promotion.discount_value ? String(promotion.discount_value) : '',
      min_order_value: promotion.min_order_value ? String(promotion.min_order_value) : '',
      min_product_quantity: promotion.min_product_quantity ? String(promotion.min_product_quantity) : '',
      required_product_ids: promotion.required_product_ids || [],
      required_operator: promotion.required_operator || 'all',
      applicable_product_ids: promotion.applicable_product_ids || [],
      free_shipping: promotion.free_shipping,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      usage_limit: promotion.usage_limit ? String(promotion.usage_limit) : '',
      user_usage_limit: promotion.user_usage_limit ? String(promotion.user_usage_limit) : '',
      priority: promotion.priority,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingPromotion(null)
    setShowForm(false)
    setFormData({
      name: '',
      description: '',
      type: 'discount_percentage',
      active: true,
      discount_value: '',
      min_order_value: '',
      min_product_quantity: '',
      required_product_ids: [],
      required_operator: 'all',
      applicable_product_ids: [],
      free_shipping: false,
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      usage_limit: '',
      user_usage_limit: '',
      priority: 0,
    })
  }

  const toggleProductSelection = (productId: string, field: 'required_product_ids' | 'applicable_product_ids') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(productId)
        ? prev[field].filter(id => id !== productId)
        : [...prev[field], productId],
    }))
  }

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case 'discount_percentage':
        return 'Desconto Percentual'
      case 'discount_fixed':
        return 'Desconto Fixo'
      case 'free_shipping':
        return 'Frete Grátis'
      case 'kit':
        return 'Kit/Promoção'
      default:
        return type
    }
  }

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'discount_percentage':
        return <Percent className="w-4 h-4" />
      case 'discount_fixed':
        return <DollarSign className="w-4 h-4" />
      case 'free_shipping':
        return <Truck className="w-4 h-4" />
      case 'kit':
        return <ShoppingBag className="w-4 h-4" />
      default:
        return <Gift className="w-4 h-4" />
    }
  }

  const formatPromotionDescription = (promo: Promotion) => {
    const parts: string[] = []

    if (promo.type === 'discount_percentage') {
      parts.push(`${promo.discount_value}% de desconto`)
    } else if (promo.type === 'discount_fixed') {
      parts.push(`R$ ${Number(promo.discount_value).toFixed(2).replace('.', ',')} de desconto`)
    }

    if (promo.free_shipping) {
      parts.push('Frete grátis')
    }

    if (promo.min_order_value) {
      parts.push(`Pedido mínimo: R$ ${Number(promo.min_order_value).toFixed(2).replace('.', ',')}`)
    }

    if (promo.min_product_quantity) {
      parts.push(`Quantidade mínima: ${promo.min_product_quantity} produtos`)
    }

    if (promo.required_product_ids && promo.required_product_ids.length > 0) {
      const productNames = products
        .filter(p => promo.required_product_ids?.includes(p.id))
        .map(p => p.name)
        .slice(0, 2)
      const more = (promo.required_product_ids.length) > 2 ? ` e mais ${promo.required_product_ids.length - 2}` : ''
      parts.push(`Produtos: ${productNames.join(', ')}${more} (${promo.required_operator === 'all' ? 'todos' : 'qualquer'})`)
    }

    return parts.join(' | ') || promo.description || 'Sem descrição'
  }

  const isPromotionActive = (promo: Promotion) => {
    if (!promo.active) return false
    const now = new Date()
    if (promo.start_date && new Date(promo.start_date) > now) return false
    if (promo.end_date && new Date(promo.end_date) < now) return false
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) return false
    return true
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando promoções...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Promoções</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Crie e gerencie promoções com descontos, kits e frete grátis</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Promoções */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Gift className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Promoções</h2>
                </div>
                {!showForm && (
                  <button
                    onClick={() => {
                      resetForm()
                      setShowForm(true)
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Promoção
                  </button>
                )}
              </div>

              {/* Formulário de Nova/Edição */}
              {showForm && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-[#065084] rounded-lg border border-gray-200 dark:border-[#0F828C] max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nome da Promoção *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                        placeholder="Ex: Black Friday, Promoção Verão..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                        placeholder="Descrição da promoção..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tipo de Promoção *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                      >
                        <option value="discount_percentage">Desconto Percentual</option>
                        <option value="discount_fixed">Desconto Fixo (R$)</option>
                        <option value="free_shipping">Frete Grátis</option>
                        <option value="kit">Kit/Promoção (Múltiplos Benefícios)</option>
                      </select>
                    </div>

                    {/* Campos específicos por tipo */}
                    {(formData.type === 'discount_percentage' || formData.type === 'discount_fixed') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {formData.type === 'discount_percentage' ? 'Desconto (%) *' : 'Desconto (R$) *'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={formData.type === 'discount_percentage' ? 100 : undefined}
                          step={formData.type === 'discount_percentage' ? '1' : '0.01'}
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                          placeholder={formData.type === 'discount_percentage' ? '10' : '50.00'}
                        />
                      </div>
                    )}

                    {/* Produtos que recebem o desconto */}
                    {(formData.type === 'discount_percentage' || formData.type === 'discount_fixed') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Produtos que Recebem o Desconto (deixe vazio para todos)
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-[#0F828C] rounded-lg p-3 dark:bg-[#065084]">
                          {products.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto disponível</p>
                          ) : (
                            <div className="space-y-2">
                              {products.map((product) => (
                                <label
                                  key={product.id}
                                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-[#065084] rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.applicable_product_ids.includes(product.id)}
                                    onChange={() => toggleProductSelection(product.id, 'applicable_product_ids')}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{product.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        {formData.applicable_product_ids.length > 0 && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {formData.applicable_product_ids.length} produto(s) selecionado(s)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Condições da Promoção */}
                    <div className="border-t border-gray-200 dark:border-[#0F828C] pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Condições para Aplicar</h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Valor Mínimo do Pedido (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                            placeholder="200.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quantidade Mínima de Produtos
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.min_product_quantity}
                            onChange={(e) => setFormData({ ...formData, min_product_quantity: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                            placeholder="5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Produtos Obrigatórios (Kit)
                          </label>
                          <select
                            value={formData.required_operator}
                            onChange={(e) => setFormData({ ...formData, required_operator: e.target.value as 'all' | 'any' })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white mb-2"
                          >
                            <option value="all">Todos os produtos devem estar no carrinho</option>
                            <option value="any">Qualquer um dos produtos no carrinho</option>
                          </select>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-[#0F828C] rounded-lg p-3 dark:bg-[#065084]">
                            {products.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto disponível</p>
                            ) : (
                              <div className="space-y-2">
                                {products.map((product) => (
                                  <label
                                    key={product.id}
                                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-[#065084] rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formData.required_product_ids.includes(product.id)}
                                      onChange={() => toggleProductSelection(product.id, 'required_product_ids')}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{product.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                          {formData.required_product_ids.length > 0 && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {formData.required_product_ids.length} produto(s) selecionado(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Frete Grátis */}
                    <div className="border-t border-gray-200 dark:border-[#0F828C] pt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="free_shipping"
                          checked={formData.free_shipping}
                          onChange={(e) => setFormData({ ...formData, free_shipping: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="free_shipping" className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                          <Truck className="w-4 h-4 mr-1" />
                          Oferecer frete grátis nesta promoção
                        </label>
                      </div>
                    </div>

                    {/* Datas e Limites */}
                    <div className="border-t border-gray-200 dark:border-[#0F828C] pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Período e Limites</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Data de Início
                          </label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white mb-2"
                          />
                          <input
                            type="time"
                            value={formData.start_time}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Data de Término
                          </label>
                          <input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white mb-2"
                          />
                          <input
                            type="time"
                            value={formData.end_time}
                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Users className="w-4 h-4 inline mr-1" />
                            Limite de Usos Totais
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.usage_limit}
                            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                            placeholder="Ilimitado (deixe vazio)"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Quantas vezes esta promoção pode ser usada no total
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Users className="w-4 h-4 inline mr-1" />
                            Limite por Usuário
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.user_usage_limit}
                            onChange={(e) => setFormData({ ...formData, user_usage_limit: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                            placeholder="Ilimitado (deixe vazio)"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Quantas vezes cada usuário pode usar esta promoção
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Prioridade
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                          placeholder="0"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Promoções com maior prioridade são aplicadas primeiro
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center pt-4 border-t border-gray-200 dark:border-[#0F828C]">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Promoção ativa
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSavePromotion}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Promoções */}
              <div className="space-y-3">
                {promotions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Nenhuma promoção cadastrada. Clique em "Nova Promoção" para adicionar.
                  </div>
                ) : (
                  promotions.map((promo) => {
                    const isActive = isPromotionActive(promo)
                    return (
                      <div
                        key={promo.id}
                        className={`p-4 border-2 rounded-lg ${
                          isActive
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30'
                            : 'border-gray-200 dark:border-[#0F828C] bg-gray-50 dark:bg-[#065084]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2 flex-wrap gap-2">
                              <div className="flex items-center space-x-2">
                                {getPromotionTypeIcon(promo.type)}
                                <span className="font-semibold text-gray-900 dark:text-white">{promo.name}</span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                  {getPromotionTypeLabel(promo.type)}
                                </span>
                                {promo.priority > 0 && (
                                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                    Prioridade: {promo.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              {formatPromotionDescription(promo)}
                            </p>
                            {promo.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{promo.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              {(promo.start_date || promo.end_date) && (
                                <span>
                                  {promo.start_date && new Date(promo.start_date).toLocaleString('pt-BR')}
                                  {promo.start_date && promo.end_date && ' → '}
                                  {promo.end_date && new Date(promo.end_date).toLocaleString('pt-BR')}
                                </span>
                              )}
                              {promo.usage_limit && (
                                <span>
                                  Usos: {promo.usage_count} / {promo.usage_limit}
                                </span>
                              )}
                              {promo.user_usage_limit && (
                                <span>
                                  Limite por usuário: {promo.user_usage_limit}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                isActive
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                {isActive ? 'Ativa' : 'Inativa'}
                              </span>
                              {!promo.active && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">(Desativada manualmente)</span>
                              )}
                              {promo.active && promo.start_date && new Date(promo.start_date) > new Date() && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">(Agendada)</span>
                              )}
                              {promo.active && promo.end_date && new Date(promo.end_date) < new Date() && (
                                <span className="text-xs text-red-600 dark:text-red-400">(Expirada)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditPromotion(promo)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              title="Editar promoção"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePromotion(promo.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Remover promoção"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sobre as Promoções</h2>
              
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <Percent className="w-4 h-4 mr-2" />
                    Desconto Percentual
                  </h3>
                  <p>Aplica um desconto percentual sobre o valor dos produtos selecionados ou do pedido todo.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Desconto Fixo
                  </h3>
                  <p>Aplica um desconto fixo em reais sobre o valor dos produtos selecionados ou do pedido todo.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <Truck className="w-4 h-4 mr-2" />
                    Frete Grátis
                  </h3>
                  <p>Oferece frete grátis quando as condições da promoção são atendidas.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Kit/Promoção
                  </h3>
                  <p>Combina múltiplos benefícios: desconto + frete grátis quando produtos específicos estão juntos.</p>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-[#0F828C]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Condições</h3>
                  <p>Você pode definir condições como valor mínimo, quantidade mínima ou produtos obrigatórios para a promoção se aplicar.</p>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-[#0F828C]">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Prioridade</h3>
                  <p>Promoções com maior prioridade são verificadas primeiro. Se uma se aplicar, as outras podem não ser verificadas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


