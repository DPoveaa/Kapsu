import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Gift, DollarSign, Package, ShoppingBag, X, Edit2 } from 'lucide-react'
import { freeShippingRulesService, FreeShippingRule } from '../services/free-shipping-rules.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'

export default function FreeShippingRules() {
  const [rules, setRules] = useState<FreeShippingRule[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para formulário de nova/edição de regra
  const [editingRule, setEditingRule] = useState<FreeShippingRule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'value' as 'value' | 'quantity' | 'product_kit',
    active: true,
    priority: 0,
    min_order_value: '',
    min_product_quantity: '',
    product_ids: [] as string[],
    kit_operator: 'all' as 'all' | 'any',
    description: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [rulesData, productsData] = await Promise.all([
        freeShippingRulesService.getFreeShippingRules(),
        productsService.getAll(),
      ])
      setRules(rulesData)
      setProducts(productsData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRule = async () => {
    try {
      if (!formData.name) {
        setError('Nome da regra é obrigatório')
        return
      }

      // Validação por tipo
      if (formData.type === 'value' && (!formData.min_order_value || Number(formData.min_order_value) <= 0)) {
        setError('Para tipo "Valor", informe um valor mínimo maior que zero')
        return
      }

      if (formData.type === 'quantity' && (!formData.min_product_quantity || Number(formData.min_product_quantity) <= 0)) {
        setError('Para tipo "Quantidade", informe uma quantidade mínima maior que zero')
        return
      }

      if (formData.type === 'product_kit' && formData.product_ids.length === 0) {
        setError('Para tipo "Kit/Promoção", selecione pelo menos um produto')
        return
      }

      setSaving(true)
      setError(null)

      const ruleData: any = {
        name: formData.name,
        type: formData.type,
        active: formData.active,
        priority: Number(formData.priority) || 0,
        description: formData.description || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      }

      if (formData.type === 'value') {
        ruleData.min_order_value = Number(formData.min_order_value)
      } else if (formData.type === 'quantity') {
        ruleData.min_product_quantity = Number(formData.min_product_quantity)
      } else if (formData.type === 'product_kit') {
        ruleData.product_ids = formData.product_ids
        ruleData.kit_operator = formData.kit_operator
      }

      if (editingRule) {
        await freeShippingRulesService.updateFreeShippingRule(editingRule.id, ruleData)
        setSuccess('Regra atualizada com sucesso!')
      } else {
        await freeShippingRulesService.createFreeShippingRule(ruleData)
        setSuccess('Regra criada com sucesso!')
      }

      setTimeout(() => setSuccess(null), 3000)
      
      // Limpa formulário e recarrega dados
      resetForm()
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar regra')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta regra?')) return

    try {
      setError(null)
      await freeShippingRulesService.deleteFreeShippingRule(id)
      setSuccess('Regra removida com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao remover regra')
    }
  }

  const handleEditRule = (rule: FreeShippingRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      type: rule.type,
      active: rule.active,
      priority: rule.priority,
      min_order_value: rule.min_order_value ? String(rule.min_order_value) : '',
      min_product_quantity: rule.min_product_quantity ? String(rule.min_product_quantity) : '',
      product_ids: rule.product_ids || [],
      kit_operator: rule.kit_operator || 'all',
      description: rule.description || '',
      start_date: rule.start_date ? rule.start_date.split('T')[0] : '',
      end_date: rule.end_date ? rule.end_date.split('T')[0] : '',
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingRule(null)
    setShowForm(false)
    setFormData({
      name: '',
      type: 'value',
      active: true,
      priority: 0,
      min_order_value: '',
      min_product_quantity: '',
      product_ids: [],
      kit_operator: 'all',
      description: '',
      start_date: '',
      end_date: '',
    })
  }

  const toggleProductSelection = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }))
  }

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'value':
        return 'Valor Mínimo'
      case 'quantity':
        return 'Quantidade Mínima'
      case 'product_kit':
        return 'Kit/Promoção'
      default:
        return type
    }
  }

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'value':
        return <DollarSign className="w-4 h-4" />
      case 'quantity':
        return <Package className="w-4 h-4" />
      case 'product_kit':
        return <ShoppingBag className="w-4 h-4" />
      default:
        return <Gift className="w-4 h-4" />
    }
  }

  const formatRuleDescription = (rule: FreeShippingRule) => {
    if (rule.type === 'value') {
      return `Frete grátis para pedidos acima de R$ ${Number(rule.min_order_value).toFixed(2).replace('.', ',')}`
    } else if (rule.type === 'quantity') {
      return `Frete grátis ao comprar ${rule.min_product_quantity} ou mais produtos`
    } else if (rule.type === 'product_kit') {
      const productNames = products
        .filter(p => rule.product_ids?.includes(p.id))
        .map(p => p.name)
        .slice(0, 3)
      const more = (rule.product_ids?.length || 0) > 3 ? ` e mais ${(rule.product_ids?.length || 0) - 3}` : ''
      return `Frete grátis ao comprar ${rule.kit_operator === 'all' ? 'todos' : 'qualquer'} os produtos: ${productNames.join(', ')}${more}`
    }
    return rule.description || 'Sem descrição'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando regras de frete grátis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Regras de Frete Grátis</h1>
          <p className="mt-2 text-gray-600">Configure condições para oferecer frete grátis aos clientes</p>
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
          {/* Lista de Regras */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Gift className="w-5 h-5 text-gray-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Regras Ativas</h2>
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
                    Nova Regra
                  </button>
                )}
              </div>

              {/* Formulário de Nova/Edição */}
              {showForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingRule ? 'Editar Regra' : 'Nova Regra'}
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
                        Nome da Regra *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Promoção Verão, Kit Completo..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Regra *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="value">Valor Mínimo do Pedido</option>
                        <option value="quantity">Quantidade Mínima de Produtos</option>
                        <option value="product_kit">Kit/Promoção (Produtos Específicos)</option>
                      </select>
                    </div>

                    {/* Campos específicos por tipo */}
                    {formData.type === 'value' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Valor Mínimo do Pedido (R$) *
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
                    )}

                    {formData.type === 'quantity' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantidade Mínima de Produtos *
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
                    )}

                    {formData.type === 'product_kit' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Operador
                          </label>
                          <select
                            value={formData.kit_operator}
                            onChange={(e) => setFormData({ ...formData, kit_operator: e.target.value as 'all' | 'any' })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="all">Todos os produtos devem estar no carrinho</option>
                            <option value="any">Qualquer um dos produtos no carrinho</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Produtos do Kit *
                          </label>
                          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
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
                                      checked={formData.product_ids.includes(product.id)}
                                      onChange={() => toggleProductSelection(product.id)}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{product.name}</span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                      R$ {product.price.toFixed(2).replace('.', ',')}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                          {formData.product_ids.length > 0 && (
                            <p className="mt-2 text-xs text-gray-500">
                              {formData.product_ids.length} produto(s) selecionado(s)
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    <div>
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
                      <p className="mt-1 text-xs text-gray-500">
                        Regras com maior prioridade são verificadas primeiro
                      </p>
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
                        placeholder="Descrição opcional da regra..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Início (opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Término (opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                        Regra ativa
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRule}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Regras */}
              <div className="space-y-3">
                {rules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma regra cadastrada. Clique em "Nova Regra" para adicionar.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 border-2 rounded-lg ${
                        rule.active
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="flex items-center space-x-2">
                              {getRuleTypeIcon(rule.type)}
                              <span className="font-semibold text-gray-900">{rule.name}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {getRuleTypeLabel(rule.type)}
                              </span>
                              {rule.priority > 0 && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  Prioridade: {rule.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {formatRuleDescription(rule)}
                          </p>
                          {rule.description && (
                            <p className="text-xs text-gray-500">{rule.description}</p>
                          )}
                          {(rule.start_date || rule.end_date) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {rule.start_date && `De: ${new Date(rule.start_date).toLocaleDateString('pt-BR')}`}
                              {rule.start_date && rule.end_date && ' | '}
                              {rule.end_date && `Até: ${new Date(rule.end_date).toLocaleDateString('pt-BR')}`}
                            </p>
                          )}
                          <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                            rule.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {rule.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar regra"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remover regra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sobre as Regras</h2>
              
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Valor Mínimo
                  </h3>
                  <p>Oferece frete grátis quando o valor total do pedido atinge um valor mínimo.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Quantidade Mínima
                  </h3>
                  <p>Oferece frete grátis quando o cliente adiciona uma quantidade mínima de produtos ao carrinho.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Kit/Promoção
                  </h3>
                  <p>Oferece frete grátis quando produtos específicos estão juntos no carrinho. Pode ser "todos" ou "qualquer um".</p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-2">Prioridade</h3>
                  <p>Regras com maior prioridade são verificadas primeiro. Se uma regra se aplicar, as outras não são verificadas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


