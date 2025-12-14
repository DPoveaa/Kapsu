import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Tag, Percent, DollarSign, Truck, X, Edit2, Calendar, Users, Copy, CheckCircle } from 'lucide-react'
import { promoCodesService, PromoCode } from '../services/promo-codes.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'

export default function ManagePromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // Estado para formulário de nova/edição de código
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_value: '',
    min_product_quantity: '',
    applicable_product_ids: [] as string[],
    free_shipping: false,
    // Expiração por tempo
    expiration_type: 'none' as 'none' | 'date_only' | 'date_time',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    // Limites de uso
    usage_limit_type: 'none' as 'none' | 'global' | 'per_user' | 'both',
    usage_limit: '',
    user_usage_limit: '',
    priority: 0,
    active: true,
    can_combine_with_others: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [codesData, productsData] = await Promise.all([
        promoCodesService.getPromoCodes(),
        productsService.getAll(),
      ])
      setCodes(codesData)
      setProducts(productsData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  const handleSaveCode = async () => {
    try {
      if (!formData.code || !formData.name) {
        setError('Código e nome são obrigatórios')
        return
      }

      if (!formData.discount_value || Number(formData.discount_value) <= 0) {
        setError('Valor do desconto é obrigatório e deve ser maior que zero')
        return
      }

      if (formData.discount_type === 'percentage' && Number(formData.discount_value) > 100) {
        setError('Desconto percentual não pode ser maior que 100%')
        return
      }

      setSaving(true)
      setError(null)

      // Monta datas conforme o tipo de expiração
      let startDate: string | undefined = undefined
      let endDate: string | undefined = undefined

      if (formData.expiration_type === 'date_time') {
        // Data e hora específicas
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
      } else if (formData.expiration_type === 'date_only') {
        // Apenas data (início do dia até fim do dia)
        if (formData.start_date) {
          startDate = `${formData.start_date}T00:00:00`
        }
        if (formData.end_date) {
          endDate = `${formData.end_date}T23:59:59`
        }
      }
      // Se expiration_type === 'none', startDate e endDate ficam undefined

      const codeData: any = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name,
        description: formData.description || undefined,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        active: formData.active,
        priority: Number(formData.priority) || 0,
        free_shipping: formData.free_shipping,
        can_combine_with_others: formData.can_combine_with_others,
        start_date: startDate,
        end_date: endDate,
        // Aplica limites conforme o tipo selecionado
        usage_limit: formData.usage_limit_type === 'global' || formData.usage_limit_type === 'both'
          ? (formData.usage_limit ? Number(formData.usage_limit) : undefined)
          : undefined,
        user_usage_limit: formData.usage_limit_type === 'per_user' || formData.usage_limit_type === 'both'
          ? (formData.user_usage_limit ? Number(formData.user_usage_limit) : undefined)
          : undefined,
      }

      if (formData.min_order_value) {
        codeData.min_order_value = Number(formData.min_order_value)
      }
      if (formData.min_product_quantity) {
        codeData.min_product_quantity = Number(formData.min_product_quantity)
      }
      if (formData.applicable_product_ids.length > 0) {
        codeData.applicable_product_ids = formData.applicable_product_ids
      }

      if (editingCode) {
        await promoCodesService.updatePromoCode(editingCode.id, codeData)
        setSuccess('Código promocional atualizado com sucesso!')
      } else {
        await promoCodesService.createPromoCode(codeData)
        setSuccess('Código promocional criado com sucesso!')
      }

      setTimeout(() => setSuccess(null), 3000)
      
      // Limpa formulário e recarrega dados
      resetForm()
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar código promocional')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este código promocional?')) return

    try {
      setError(null)
      await promoCodesService.deletePromoCode(id)
      setSuccess('Código promocional removido com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao remover código promocional')
    }
  }

  const handleEditCode = (code: PromoCode) => {
    setEditingCode(code)
    
    // Separa data e hora
    let startDate = ''
    let startTime = ''
    let endDate = ''
    let endTime = ''

    if (code.start_date) {
      const start = new Date(code.start_date)
      startDate = start.toISOString().split('T')[0]
      startTime = start.toTimeString().split(' ')[0].substring(0, 5)
    }

    if (code.end_date) {
      const end = new Date(code.end_date)
      endDate = end.toISOString().split('T')[0]
      endTime = end.toTimeString().split(' ')[0].substring(0, 5)
    }

    // Determina o tipo de expiração baseado nas datas
    let expirationType: 'none' | 'date_only' | 'date_time' = 'none'
    if (code.start_date || code.end_date) {
      const hasTime = (code.start_date && code.start_date.includes('T') && code.start_date.split('T')[1] !== '00:00:00') ||
                      (code.end_date && code.end_date.includes('T') && code.end_date.split('T')[1] !== '23:59:59')
      expirationType = hasTime ? 'date_time' : 'date_only'
    }

    // Determina o tipo de limite
    let usageLimitType: 'none' | 'global' | 'per_user' | 'both' = 'none'
    if (code.usage_limit && code.user_usage_limit) {
      usageLimitType = 'both'
    } else if (code.usage_limit) {
      usageLimitType = 'global'
    } else if (code.user_usage_limit) {
      usageLimitType = 'per_user'
    }

    setFormData({
      code: code.code,
      name: code.name,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: String(code.discount_value),
      min_order_value: code.min_order_value ? String(code.min_order_value) : '',
      min_product_quantity: code.min_product_quantity ? String(code.min_product_quantity) : '',
      applicable_product_ids: code.applicable_product_ids || [],
      free_shipping: code.free_shipping,
      expiration_type: expirationType,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      usage_limit_type: usageLimitType,
      usage_limit: code.usage_limit ? String(code.usage_limit) : '',
      user_usage_limit: code.user_usage_limit ? String(code.user_usage_limit) : '',
      priority: code.priority,
      active: code.active,
      can_combine_with_others: code.can_combine_with_others !== false, // Default true se não definido
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingCode(null)
    setShowForm(false)
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '',
      min_product_quantity: '',
      applicable_product_ids: [],
      free_shipping: false,
      expiration_type: 'none',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      usage_limit_type: 'none',
      usage_limit: '',
      user_usage_limit: '',
      priority: 0,
      active: true,
      can_combine_with_others: true,
    })
  }

  const toggleProductSelection = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_product_ids: prev.applicable_product_ids.includes(productId)
        ? prev.applicable_product_ids.filter(id => id !== productId)
        : [...prev.applicable_product_ids, productId],
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const isCodeActive = (code: PromoCode) => {
    if (!code.active) return false
    const now = new Date()
    if (code.start_date && new Date(code.start_date) > now) return false
    if (code.end_date && new Date(code.end_date) < now) return false
    if (code.usage_limit && code.usage_count >= code.usage_limit) return false
    return true
  }

  const getCodeStatus = (code: PromoCode) => {
    if (!code.active) return { label: 'Inativo', color: 'bg-red-100 text-red-800' }
    const now = new Date()
    if (code.start_date && new Date(code.start_date) > now) {
      return { label: 'Agendado', color: 'bg-blue-100 text-blue-800' }
    }
    if (code.end_date && new Date(code.end_date) < now) {
      return { label: 'Expirado', color: 'bg-gray-100 text-gray-800' }
    }
    if (code.usage_limit && code.usage_count >= code.usage_limit) {
      return { label: 'Esgotado', color: 'bg-orange-100 text-orange-800' }
    }
    return { label: 'Ativo', color: 'bg-green-100 text-green-800' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando códigos promocionais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Códigos Promocionais</h1>
          <p className="mt-2 text-gray-600">Crie e gerencie códigos de desconto e cupons</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Códigos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Tag className="w-5 h-5 text-gray-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Códigos</h2>
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
                    Novo Código
                  </button>
                )}
              </div>

              {/* Formulário de Nova/Edição */}
              {showForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingCode ? 'Editar Código' : 'Novo Código'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="BLACKFRIDAY2024"
                          maxLength={50}
                        />
                        {!editingCode && (
                          <button
                            onClick={generateRandomCode}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                          >
                            Gerar
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Apenas letras, números, hífen ou underscore
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da Promoção *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Black Friday 2024"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descrição da promoção..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Desconto *
                        </label>
                        <select
                          value={formData.discount_type}
                          onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="percentage">Percentual (%)</option>
                          <option value="fixed">Fixo (R$)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Valor do Desconto *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={formData.discount_type === 'percentage' ? 100 : undefined}
                          step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                        />
                      </div>
                    </div>

                    {/* Produtos que recebem o desconto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Produtos que Recebem o Desconto (deixe vazio para todos)
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                        {products.length === 0 ? (
                          <p className="text-sm text-gray-500">Nenhum produto disponível</p>
                        ) : (
                          <div className="space-y-2">
                            {products.map((product) => (
                              <label
                                key={product.id}
                                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.applicable_product_ids.includes(product.id)}
                                  onChange={() => toggleProductSelection(product.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{product.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {formData.applicable_product_ids.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          {formData.applicable_product_ids.length} produto(s) selecionado(s)
                        </p>
                      )}
                    </div>

                    {/* Condições */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Condições</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor Mínimo do Pedido (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="200.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantidade Mínima de Produtos
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.min_product_quantity}
                            onChange={(e) => setFormData({ ...formData, min_product_quantity: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Frete Grátis */}
                    <div className="border-t pt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="free_shipping"
                          checked={formData.free_shipping}
                          onChange={(e) => setFormData({ ...formData, free_shipping: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="free_shipping" className="ml-2 text-sm text-gray-700 flex items-center">
                          <Truck className="w-4 h-4 mr-1" />
                          Oferecer frete grátis
                        </label>
                      </div>
                    </div>

                    {/* Permite combinação com outros cupons */}
                    <div className="border-t pt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="can_combine_with_others"
                          checked={formData.can_combine_with_others}
                          onChange={(e) => setFormData({ ...formData, can_combine_with_others: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="can_combine_with_others" className="ml-2 text-sm text-gray-700 flex items-center">
                          <Tag className="w-4 h-4 mr-1" />
                          Permitir uso junto com outros cupons
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 ml-6">
                        Se desmarcado, este cupom só poderá ser usado sozinho, não poderá ser combinado com outros cupons.
                      </p>
                    </div>

                    {/* Expiração por Tempo */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Expiração por Tempo (Opcional)</h4>
                      <p className="text-xs text-gray-500 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <strong>Escolha o tipo de expiração:</strong> Você pode definir quando o código expira (por data/hora ou apenas data) 
                        ou deixar sem expiração. Isso pode ser combinado com os limites de uso abaixo.
                      </p>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Expiração
                        </label>
                        <select
                          value={formData.expiration_type}
                          onChange={(e) => setFormData({ ...formData, expiration_type: e.target.value as any })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="none">Sem expiração (sempre válido)</option>
                          <option value="date_only">Apenas data (início e fim do dia)</option>
                          <option value="date_time">Data e hora específicas</option>
                        </select>
                      </div>

                      {formData.expiration_type !== 'none' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              Data de Início
                            </label>
                            <input
                              type="date"
                              value={formData.start_date}
                              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                            />
                            {formData.expiration_type === 'date_time' && (
                              <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Hora de início"
                              />
                            )}
                            {formData.expiration_type === 'date_only' && (
                              <p className="text-xs text-gray-500 mt-1">Válido a partir das 00:00:00</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              Data de Término
                            </label>
                            <input
                              type="date"
                              value={formData.end_date}
                              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                            />
                            {formData.expiration_type === 'date_time' && (
                              <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Hora de término"
                              />
                            )}
                            {formData.expiration_type === 'date_only' && (
                              <p className="text-xs text-gray-500 mt-1">Válido até as 23:59:59</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Limites de Uso */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Limites de Uso (Opcional)</h4>
                      <p className="text-xs text-gray-500 mb-3 bg-green-50 border border-green-200 rounded-lg p-2">
                        <strong>Você pode combinar:</strong> Limite global (total de usos entre todos os clientes), 
                        limite por cliente (quantas vezes cada cliente pode usar), ou ambos. 
                        Isso funciona independente da expiração por tempo acima.
                      </p>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Limite
                        </label>
                        <select
                          value={formData.usage_limit_type}
                          onChange={(e) => setFormData({ ...formData, usage_limit_type: e.target.value as any })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="none">Sem limite (uso ilimitado)</option>
                          <option value="global">Limite global (X usos no total entre todos os clientes)</option>
                          <option value="per_user">Limite por cliente (X vezes para cada cliente)</option>
                          <option value="both">Ambos (limite global + limite por cliente)</option>
                        </select>
                      </div>

                      {(formData.usage_limit_type === 'global' || formData.usage_limit_type === 'both') && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Users className="w-4 h-4 inline mr-1" />
                            Limite Global (Total de Usos)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.usage_limit}
                            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 100"
                            required={formData.usage_limit_type === 'global' || formData.usage_limit_type === 'both'}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Quantas vezes este código pode ser usado no total entre todos os clientes.
                            <br />
                            <strong>Exemplo:</strong> Se definir 100, após 100 usos (por qualquer cliente), o código não poderá mais ser usado.
                          </p>
                        </div>
                      )}

                      {(formData.usage_limit_type === 'per_user' || formData.usage_limit_type === 'both') && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Users className="w-4 h-4 inline mr-1" />
                            Limite por Cliente
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.user_usage_limit}
                            onChange={(e) => setFormData({ ...formData, user_usage_limit: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 2"
                            required={formData.usage_limit_type === 'per_user' || formData.usage_limit_type === 'both'}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Quantas vezes cada cliente pode usar este código.
                            <br />
                            <strong>Exemplo:</strong> Se definir 2, cada cliente poderá usar no máximo 2 vezes.
                            {formData.expiration_type !== 'none' && ' O limite se aplica dentro do período de validade configurado acima.'}
                            {formData.expiration_type === 'none' && ' O limite se aplica enquanto o código estiver ativo.'}
                          </p>
                        </div>
                      )}

                      {formData.usage_limit_type === 'both' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <p className="text-xs text-yellow-800">
                            <strong>⚠️ Ambos os limites ativos:</strong> O código será bloqueado quando qualquer um dos limites for atingido.
                            Por exemplo: se o limite global for 100 e o limite por cliente for 2, o código será bloqueado quando:
                            <br />• 100 usos totais forem atingidos, OU
                            <br />• Um cliente tentar usar pela 3ª vez
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prioridade
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center pt-4 border-t">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                        Código ativo
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveCode}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Códigos */}
              <div className="space-y-3">
                {codes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum código cadastrado. Clique em "Novo Código" para adicionar.
                  </div>
                ) : (
                  codes.map((code) => {
                    const status = getCodeStatus(code)
                    return (
                      <div
                        key={code.id}
                        className={`p-4 border-2 rounded-lg ${
                          isCodeActive(code)
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2 flex-wrap gap-2">
                              <div className="flex items-center space-x-2">
                                <Tag className="w-4 h-4 text-gray-600" />
                                <span className="font-mono font-bold text-lg text-gray-900">{code.code}</span>
                                <button
                                  onClick={() => copyToClipboard(code.code)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Copiar código"
                                >
                                  {copiedCode === code.code ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">{code.name}</p>
                            {code.description && (
                              <p className="text-xs text-gray-500 mb-2">{code.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                              {code.discount_type === 'percentage' ? (
                                <span className="flex items-center">
                                  <Percent className="w-3 h-3 mr-1" />
                                  {code.discount_value}% de desconto
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  R$ {Number(code.discount_value).toFixed(2).replace('.', ',')} de desconto
                                </span>
                              )}
                              {code.free_shipping && (
                                <span className="flex items-center">
                                  <Truck className="w-3 h-3 mr-1" />
                                  Frete grátis
                                </span>
                              )}
                              {code.can_combine_with_others === false && (
                                <span className="flex items-center text-orange-600">
                                  <Tag className="w-3 h-3 mr-1" />
                                  Não combinável
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {(code.start_date || code.end_date) && (
                                <span>
                                  {code.start_date && new Date(code.start_date).toLocaleString('pt-BR')}
                                  {code.start_date && code.end_date && ' → '}
                                  {code.end_date && new Date(code.end_date).toLocaleString('pt-BR')}
                                </span>
                              )}
                              {code.usage_limit && (
                                <span>
                                  Usos: {code.usage_count} / {code.usage_limit}
                                </span>
                              )}
                              {code.user_usage_limit && (
                                <span>
                                  {code.user_usage_limit} vez(es) por cliente
                                  {code.start_date || code.end_date ? ' (no período)' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditCode(code)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar código"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Remover código"
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sobre os Códigos</h2>
              
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Como Funciona</h3>
                  <p>Os clientes podem inserir o código no checkout para obter descontos ou frete grátis.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Limite por Cliente</h3>
                  <p>Defina quantas vezes cada cliente pode usar o código dentro do período de validade. Por exemplo: 2 vezes por cliente entre 01/12 e 31/12.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Período de Validade</h3>
                  <p>Defina data e hora de início e término. O código só será válido dentro desse período. O limite por cliente se aplica apenas durante esse período.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Limite Total (Opcional)</h3>
                  <p>Você também pode definir um limite total de usos entre todos os clientes. Isso funciona junto com o limite por cliente.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Mensagens Automáticas</h3>
                  <p>O sistema informa automaticamente se o código expirou, foi esgotado, ou se o cliente já usou o máximo de vezes permitido.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

