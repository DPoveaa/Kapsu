import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, Tag, Percent, DollarSign, Truck, Edit2, Copy,
  CheckCircle, Calendar, Users, TrendingUp
} from 'lucide-react'
import { promoCodesService, PromoCode } from '../services/promo-codes.service'
import { productsService } from '../services/products.service'
import { shippingService } from '../services/shipping.service'
import { Product } from '../types'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

export default function ManagePromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Análise de margem & frete
  const [estimatedFreightSubsidy, setEstimatedFreightSubsidy] = useState<string>('15.00')
  const [allowDeficitOverride, setAllowDeficitOverride] = useState<boolean>(false)

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
      const [codesData, productsData, regionsData] = await Promise.all([
        promoCodesService.getPromoCodes(),
        productsService.getAll(),
        shippingService.getShippingRegions().catch(() => []),
      ])
      setCodes(codesData)
      setProducts(productsData)

      // Calcula valor do subsídio de frete com base nas regras cadastradas em Frete
      if (regionsData && regionsData.length > 0) {
        const activeFees = regionsData
          .filter(r => r.active !== false && Number(r.shipping_fee) > 0)
          .map(r => Number(r.shipping_fee))
        if (activeFees.length > 0) {
          const avgFee = activeFees.reduce((a, b) => a + b, 0) / activeFees.length
          setEstimatedFreightSubsidy(String(Math.round(avgFee * 100) / 100))
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // ─── Análise de Margem e Lucratividade em Tempo Real ─────────────────────────
  const marginAnalysis = useMemo(() => {
    const discountVal = parseFloat(formData.discount_value) || 0
    const isPercent = formData.discount_type === 'percentage'
    const isFreeShipping = formData.free_shipping
    const freightSubsidy = parseFloat(estimatedFreightSubsidy) || 0

    // Analisa sempre todos os produtos ativos do catálogo para exibição na lista completa
    const activeProducts = products.filter(p => p.active && !p.archived)

    if (activeProducts.length === 0) {
      return {
        analyzedProducts: [],
        deficitProducts: [],
        warningProducts: [],
        maxSafeDiscountPct: 100,
        maxSafeDiscountFixed: 0,
        hasDeficit: false,
        overallStatus: 'safe',
      }
    }

    const analyzed = activeProducts.map((p) => {
      const isApplicable = formData.applicable_product_ids.length === 0 || formData.applicable_product_ids.includes(p.id)
      const salePrice = p.promo_price && Number(p.promo_price) > 0 ? Number(p.promo_price) : Number(p.price)
      const purchaseCost = p.purchase_price != null ? Number(p.purchase_price) : 0
      const freightCost = isFreeShipping && isApplicable ? freightSubsidy : 0
      const totalUnitCost = purchaseCost + freightCost

      const discountAmount = isApplicable
        ? (isPercent ? salePrice * (discountVal / 100) : Math.min(salePrice, discountVal))
        : 0

      const finalPrice = Math.max(0, salePrice - discountAmount)
      const netProfit = finalPrice - totalUnitCost
      const netMarginPct = finalPrice > 0 ? (netProfit / finalPrice) * 100 : 0

      // Preço mínimo para manter ao menos 7% de margem líquida de lucro
      const minPriceFor7PctMargin = totalUnitCost > 0 ? totalUnitCost / 0.93 : 0
      const maxSafeDiscountValue = Math.max(0, salePrice - minPriceFor7PctMargin)
      const maxSafeDiscountPct = salePrice > 0 ? (maxSafeDiscountValue / salePrice) * 100 : 0

      // Não lucrativo: Prejuízo ou margem menor que 7% (somente se o cupom for aplicado ao produto)
      const isDeficit = isApplicable && (netProfit < 0 || netMarginPct < 7)
      // Baixo lucro: Margem entre 7% e 20% (somente se o cupom for aplicado ao produto)
      const isWarning = isApplicable && !isDeficit && netMarginPct < 20

      return {
        product: p,
        isApplicable,
        salePrice,
        purchaseCost,
        freightCost,
        totalUnitCost,
        discountAmount,
        finalPrice,
        netProfit,
        netMarginPct,
        maxSafeDiscountValue,
        maxSafeDiscountPct,
        isDeficit,
        isWarning,
      }
    })

    const deficitProducts = analyzed.filter(item => item.isDeficit)
    const warningProducts = analyzed.filter(item => item.isWarning)
    const applicableProducts = analyzed.filter(item => item.isApplicable)

    const minMaxSafePct = applicableProducts.length > 0 ? Math.min(...applicableProducts.map(item => item.maxSafeDiscountPct)) : 100
    const minMaxSafeFixed = applicableProducts.length > 0 ? Math.min(...applicableProducts.map(item => item.maxSafeDiscountValue)) : 0

    const hasDeficit = deficitProducts.length > 0

    return {
      analyzedProducts: analyzed,
      deficitProducts,
      warningProducts,
      maxSafeDiscountPct: Math.max(0, Math.floor(minMaxSafePct * 10) / 10),
      maxSafeDiscountFixed: Math.max(0, Math.floor(minMaxSafeFixed * 100) / 100),
      hasDeficit,
      overallStatus: hasDeficit ? 'deficit' : warningProducts.length > 0 ? 'warning' : 'safe',
    }
  }, [formData.discount_value, formData.discount_type, formData.free_shipping, formData.applicable_product_ids, products, estimatedFreightSubsidy])

  const autoAdjustToSafeDiscount = () => {
    if (formData.discount_type === 'percentage') {
      setFormData(prev => ({
        ...prev,
        discount_value: String(marginAnalysis.maxSafeDiscountPct),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        discount_value: String(marginAnalysis.maxSafeDiscountFixed),
      }))
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
      setError(null)
      setSuccess(null)

      if (!formData.code || !formData.name) {
        setError('Código e nome são obrigatórios')
        return
      }

      if (!formData.free_shipping) {
        if (!formData.discount_value || Number(formData.discount_value) <= 0) {
          setError('Valor do desconto é obrigatório e deve ser maior que zero')
          return
        }
      } else {
        if (formData.discount_value !== undefined && formData.discount_value !== null && formData.discount_value !== '') {
          const discountValue = Number(formData.discount_value)
          if (discountValue < 0) {
            setError('Valor do desconto não pode ser negativo')
            return
          }
        }
      }

      if (formData.discount_type === 'percentage' && formData.discount_value && Number(formData.discount_value) > 100) {
        setError('Desconto percentual não pode ser maior que 100%')
        return
      }

      // Validação de Prejuízo (No Vermelho)
      if (marginAnalysis.hasDeficit && !allowDeficitOverride) {
        setError(`Atenção: Este cupom coloca ${marginAnalysis.deficitProducts.length} produto(s) no vermelho (prejuízo). Reduza o desconto para no máximo ${marginAnalysis.maxSafeDiscountPct}% ou marque a opção de autorização de prejuízo para continuar.`)
        return
      }

      setSaving(true)

      // Monta as datas baseadas nas escolhas do usuário
      let start_date: string | null = null
      let end_date: string | null = null

      if (formData.expiration_type !== 'none') {
        if (formData.start_date) {
          if (formData.expiration_type === 'date_time' && formData.start_time) {
            start_date = `${formData.start_date}T${formData.start_time}:00`
          } else {
            start_date = `${formData.start_date}T00:00:00`
          }
        }

        if (formData.end_date) {
          if (formData.expiration_type === 'date_time' && formData.end_time) {
            end_date = `${formData.end_date}T${formData.end_time}:59`
          } else {
            end_date = `${formData.end_date}T23:59:59`
          }
        }
      }

      // Monta os limites baseados nas escolhas do usuário
      let usage_limit: number | null = null
      let user_usage_limit: number | null = null

      if (formData.usage_limit_type === 'global' || formData.usage_limit_type === 'both') {
        if (formData.usage_limit && Number(formData.usage_limit) > 0) {
          usage_limit = Number(formData.usage_limit)
        }
      }

      if (formData.usage_limit_type === 'per_user' || formData.usage_limit_type === 'both') {
        if (formData.user_usage_limit && Number(formData.user_usage_limit) > 0) {
          user_usage_limit = Number(formData.user_usage_limit)
        }
      }

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value || 0),
        min_order_value: formData.min_order_value ? Number(formData.min_order_value) : undefined,
        min_product_quantity: formData.min_product_quantity ? Number(formData.min_product_quantity) : undefined,
        applicable_product_ids: formData.applicable_product_ids.length > 0 ? formData.applicable_product_ids : undefined,
        free_shipping: formData.free_shipping,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        usage_limit: usage_limit || undefined,
        user_usage_limit: user_usage_limit || undefined,
        priority: Number(formData.priority) || 0,
        active: formData.active,
        can_combine_with_others: formData.can_combine_with_others,
      }

      if (editingCode) {
        await promoCodesService.updatePromoCode(editingCode.id, payload)
        setSuccess('Código atualizado com sucesso!')
      } else {
        await promoCodesService.createPromoCode(payload)
        setSuccess('Código criado com sucesso!')
      }

      resetForm()
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar código')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCode = (id: string) => {
    confirm.show('Deseja realmente excluir este código promocional?', async () => {
      try {
        setLoading(true)
        await promoCodesService.deletePromoCode(id)
        setSuccess('Código excluído com sucesso!')
        loadData()
      } catch (err: any) {
        setError(err.message || 'Erro ao excluir código')
      } finally {
        setLoading(false)
      }
    })
  }

  const handleEditCode = (code: PromoCode) => {
    setEditingCode(code)

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

    let expirationType: 'none' | 'date_only' | 'date_time' = 'none'
    if (code.start_date || code.end_date) {
      const hasTime = (code.start_date && code.start_date.includes('T') && code.start_date.split('T')[1] !== '00:00:00') ||
        (code.end_date && code.end_date.includes('T') && code.end_date.split('T')[1] !== '23:59:59')
      expirationType = hasTime ? 'date_time' : 'date_only'
    }

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
      can_combine_with_others: code.can_combine_with_others !== false,
    })
    setAllowDeficitOverride(false)
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingCode(null)
    setShowForm(false)
    setAllowDeficitOverride(false)
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

  const inputClass = "w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando códigos promocionais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Códigos Promocionais</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Crie e gerencie códigos de desconto e cupons</p>
        </div>

        {error && (
          <div className="mb-3 sm:mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded text-xs sm:text-sm break-words">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 sm:mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded text-xs sm:text-sm break-words">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {/* Lista de Códigos */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-5 lg:mb-6">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300 mr-1.5 sm:mr-2" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Códigos</h2>
                </div>
                <button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  Novo Código
                </button>
              </div>

              {/* Modal de Criação/Edição */}
              <AdminModal
                isOpen={showForm}
                onClose={resetForm}
                title={editingCode ? 'Editar Código Promocional' : 'Novo Código Promocional'}
                widthClass="max-w-3xl"
                footer={
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveCode}
                      disabled={saving || (marginAnalysis.hasDeficit && !allowDeficitOverride)}
                      className={`px-4 py-2 text-sm text-white rounded-lg transition-colors font-medium ${marginAnalysis.hasDeficit && !allowDeficitOverride
                          ? 'bg-gray-400 cursor-not-allowed opacity-60'
                          : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                      {saving ? 'Salvando...' : editingCode ? 'Salvar alterações' : 'Criar código'}
                    </button>
                  </div>
                }
              >
                {/* Formulário dentro do Modal */}
                <div className="space-y-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        Código *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          className={`flex-1 ${inputClass}`}
                          placeholder="BLACKFRIDAY2024"
                          maxLength={50}
                        />
                        {!editingCode && (
                          <button
                            onClick={generateRandomCode}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shrink-0"
                          >
                            Gerar
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        Apenas letras, números, hífen ou underscore
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        Nome da Promoção *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputClass}
                        placeholder="Black Friday 2024"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className={`${inputClass} resize-none`}
                        placeholder="Descrição da promoção..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Tipo de Desconto *
                        </label>
                        <select
                          value={formData.discount_type}
                          onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                          className={inputClass}
                        >
                          <option value="percentage">Percentual (%)</option>
                          <option value="fixed">Fixo (R$)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Valor do Desconto *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={formData.discount_type === 'percentage' ? 100 : undefined}
                          step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                          className={inputClass}
                          placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                        />
                      </div>
                    </div>

                    {/* Frete Grátis */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="free_shipping"
                          checked={formData.free_shipping}
                          onChange={(e) => setFormData({ ...formData, free_shipping: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                        />
                        <label htmlFor="free_shipping" className="ml-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                          <span>Oferecer frete grátis neste cupom</span>
                        </label>
                      </div>
                    </div>

                    {/* ─── PRODUTOS QUE RECEBEM O DESCONTO & ANÁLISE DE MARGEM EM TEMPO REAL ─────────── */}
                    <div className="border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-4 space-y-3.5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Produtos Aplicáveis & Margem em Tempo Real</span>
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Marque os produtos elegíveis ou deixe nenhum selecionado para aplicar a todos os produtos ativos.
                          </p>
                        </div>

                        {/* Badges de informação financeira */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {/* Subsídio de frete (somente leitura das regras ativas) */}
                          <span
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-medium"
                            title="Média das taxas de frete cadastradas nas regras de frete do sistema"
                          >
                            Subsídio Médio Frete: <strong className="text-gray-900 dark:text-white">R$ {Number(estimatedFreightSubsidy || 0).toFixed(2).replace('.', ',')}</strong>
                          </span>

                          {/* Saúde do Cupom */}
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold border ${
                              marginAnalysis.hasDeficit
                                ? 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
                                : marginAnalysis.overallStatus === 'warning'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                  : 'bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200'
                            }`}
                          >
                            {marginAnalysis.hasDeficit
                              ? `🔴 Não Lucrativo (<7%)`
                              : marginAnalysis.overallStatus === 'warning'
                                ? `🟡 Baixo Lucro (7%-20%)`
                                : `🟢 Lucrativo (≥20%)`}
                          </span>

                          {/* Botão de ajuste rápido se houver margem crítica */}
                          {marginAnalysis.hasDeficit && (
                            <button
                              type="button"
                              onClick={autoAdjustToSafeDiscount}
                              className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-xs cursor-pointer"
                              title="Ajustar desconto para garantir margem de 7%"
                            >
                              Ajustar para {marginAnalysis.maxSafeDiscountPct}%
                            </button>
                          )}
                        </div>
                      </div>

                      {marginAnalysis.hasDeficit && (
                        <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                          <span className="font-medium">
                            Atenção: {marginAnalysis.deficitProducts.length} produto(s) ficarão com margem líquida abaixo de 7%.
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold shrink-0">
                            <input
                              type="checkbox"
                              checked={allowDeficitOverride}
                              onChange={(e) => setAllowDeficitOverride(e.target.checked)}
                              className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500"
                            />
                            <span>Permitir salvar assim mesmo</span>
                          </label>
                        </div>
                      )}

                      {/* Lista mesclada de Produtos com Seleção + Margem no próprio item */}
                      <div className="max-h-64 overflow-y-auto border border-indigo-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 p-2 space-y-1.5">
                        {products.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 p-2">Nenhum produto cadastrado no sistema</p>
                        ) : (
                          marginAnalysis.analyzedProducts.map((item) => {
                            const isSelected = formData.applicable_product_ids.includes(item.product.id)

                            return (
                              <div
                                key={item.product.id}
                                onClick={() => toggleProductSelection(item.product.id)}
                                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                  isSelected
                                    ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-700 shadow-xs'
                                    : item.isDeficit
                                      ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10 hover:border-red-300'
                                      : item.isWarning
                                        ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-300'
                                        : 'border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-800/60 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
                                      {item.product.name}
                                    </span>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                      <span>Venda: R$ {item.salePrice.toFixed(2).replace('.', ',')}</span>
                                      <span>•</span>
                                      <span>Custo: R$ {item.purchaseCost.toFixed(2).replace('.', ',')}</span>
                                      {item.discountAmount > 0 && (
                                        <>
                                          <span>•</span>
                                          <span className="text-pink-600 dark:text-pink-400 font-semibold">Desc: -R$ {item.discountAmount.toFixed(2).replace('.', ',')}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 border-gray-100 dark:border-gray-800 pt-1.5 sm:pt-0">
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Final: <strong className="text-gray-900 dark:text-white">R$ {item.finalPrice.toFixed(2).replace('.', ',')}</strong>
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                      item.isDeficit
                                        ? 'bg-red-600 text-white'
                                        : item.isWarning
                                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                                          : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                                    }`}
                                  >
                                    {item.isDeficit
                                      ? `🔴 Prejuízo: -R$ ${Math.abs(item.netProfit).toFixed(2).replace('.', ',')} (${item.netMarginPct.toFixed(1).replace('.', ',')}%)`
                                      : item.isWarning
                                        ? `🟡 Margem Estreita: R$ ${item.netProfit.toFixed(2).replace('.', ',')} (${item.netMarginPct.toFixed(1).replace('.', ',')}%)`
                                        : `🟢 Lucro: R$ ${item.netProfit.toFixed(2).replace('.', ',')} (${item.netMarginPct.toFixed(1).replace('.', ',')}%)`}
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1 pt-1">
                        <span>
                          {formData.applicable_product_ids.length === 0
                            ? 'Aplicado a todos os produtos ativos'
                            : `${formData.applicable_product_ids.length} produto(s) selecionado(s)`}
                        </span>
                      </div>
                    </div>

                    {/* Condições */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Condições</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                            Valor Mínimo do Pedido (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                            className={inputClass}
                            placeholder="200.00"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                            Quantidade Mínima de Produtos
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.min_product_quantity}
                            onChange={(e) => setFormData({ ...formData, min_product_quantity: e.target.value })}
                            className={inputClass}
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Permite combinação com outros cupons */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="can_combine_with_others"
                          checked={formData.can_combine_with_others}
                          onChange={(e) => setFormData({ ...formData, can_combine_with_others: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0 mt-0.5"
                        />
                        <label htmlFor="can_combine_with_others" className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-start">
                          <Tag className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                          <span className="break-words font-medium">Permitir uso junto com outros cupons</span>
                        </label>
                      </div>
                      <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-6 break-words">
                        Se desmarcado, este cupom só poderá ser usado sozinho.
                      </p>
                    </div>

                    {/* Expiração por Tempo */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Expiração por Tempo (Opcional)</h4>

                      <div className="mb-3 sm:mb-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Tipo de Expiração
                        </label>
                        <select
                          value={formData.expiration_type}
                          onChange={(e) => setFormData({ ...formData, expiration_type: e.target.value as any })}
                          className={inputClass}
                        >
                          <option value="none">Sem expiração (sempre válido)</option>
                          <option value="date_only">Apenas data (início e fim do dia)</option>
                          <option value="date_time">Data e hora específicas</option>
                        </select>
                      </div>

                      {formData.expiration_type !== 'none' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                              Data de Início
                            </label>
                            <input
                              type="date"
                              value={formData.start_date}
                              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                              className={`${inputClass} mb-2`}
                            />
                            {formData.expiration_type === 'date_time' && (
                              <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className={inputClass}
                                placeholder="Hora de início"
                              />
                            )}
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                              Data de Término
                            </label>
                            <input
                              type="date"
                              value={formData.end_date}
                              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                              className={`${inputClass} mb-2`}
                            />
                            {formData.expiration_type === 'date_time' && (
                              <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className={inputClass}
                                placeholder="Hora de término"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Limites de Uso */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Limites de Uso (Opcional)</h4>

                      <div className="mb-3 sm:mb-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Tipo de Limite
                        </label>
                        <select
                          value={formData.usage_limit_type}
                          onChange={(e) => setFormData({ ...formData, usage_limit_type: e.target.value as any })}
                          className={inputClass}
                        >
                          <option value="none">Sem limite (uso ilimitado)</option>
                          <option value="global">Limite global (X usos no total entre todos os clientes)</option>
                          <option value="per_user">Limite por cliente (X vezes para cada cliente)</option>
                          <option value="both">Ambos (limite global + limite por cliente)</option>
                        </select>
                      </div>

                      {(formData.usage_limit_type === 'global' || formData.usage_limit_type === 'both') && (
                        <div className="mb-3 sm:mb-4">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                            Limite Global (Total de Usos)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.usage_limit}
                            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                            className={inputClass}
                            placeholder="Ex: 100"
                            required={formData.usage_limit_type === 'global' || formData.usage_limit_type === 'both'}
                          />
                        </div>
                      )}

                      {(formData.usage_limit_type === 'per_user' || formData.usage_limit_type === 'both') && (
                        <div className="mb-3 sm:mb-4">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                            Limite por Cliente
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.user_usage_limit}
                            onChange={(e) => setFormData({ ...formData, user_usage_limit: e.target.value })}
                            className={inputClass}
                            placeholder="Ex: 2"
                            required={formData.usage_limit_type === 'per_user' || formData.usage_limit_type === 'both'}
                          />
                        </div>
                      )}

                      <div className="mt-3 sm:mt-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Prioridade
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                      />
                      <label htmlFor="active" className="ml-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Código ativo
                      </label>
                    </div>
                  </div>

                </div>
              </AdminModal>

              {/* Lista de Códigos */}
              <div className="space-y-2 sm:space-y-3">
                {codes.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Nenhum código cadastrado. Clique em "Novo Código" para adicionar.
                  </div>
                ) : (
                  codes.map((code) => {
                    const status = getCodeStatus(code)
                    return (
                      <div
                        key={code.id}
                        className={`p-3 sm:p-4 border-2 rounded-lg ${isCodeActive(code)
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1.5 sm:mb-2 flex-wrap gap-1.5 sm:gap-2">
                              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                                <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                                <span className="font-mono font-bold text-base sm:text-lg text-gray-900 dark:text-white break-all">{code.code}</span>
                                <button
                                  onClick={() => copyToClipboard(code.code)}
                                  className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white p-1"
                                  title="Copiar código"
                                >
                                  {copiedCode === code.code ? (
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                  )}
                                </button>
                                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold whitespace-nowrap ${status.color} ${status.color.includes('bg-blue-100') ? 'dark:bg-blue-900/30 dark:text-blue-300' :
                                    status.color.includes('bg-green-100') ? 'dark:bg-green-900/30 dark:text-green-300' :
                                      status.color.includes('bg-red-100') ? 'dark:bg-red-900/30 dark:text-red-300' :
                                        status.color.includes('bg-gray-100') ? 'dark:bg-gray-900/30 dark:text-gray-300' :
                                          status.color.includes('bg-orange-100') ? 'dark:bg-orange-900/30 dark:text-orange-300' : ''
                                  }`}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1 break-words">{code.name}</p>
                            {code.description && (
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 break-words">{code.description}</p>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-4 text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1.5 sm:mb-2">
                              {code.discount_type === 'percentage' ? (
                                <span className="flex items-center">
                                  <Percent className="w-3 h-3 mr-1 flex-shrink-0" />
                                  {code.discount_value}% de desconto
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <DollarSign className="w-3 h-3 mr-1 flex-shrink-0" />
                                  R$ {Number(code.discount_value).toFixed(2).replace('.', ',')} de desconto
                                </span>
                              )}
                              {code.free_shipping && (
                                <span className="flex items-center">
                                  <Truck className="w-3 h-3 mr-1 flex-shrink-0" />
                                  Frete grátis
                                </span>
                              )}
                              {code.can_combine_with_others === false && (
                                <span className="flex items-center text-orange-600 dark:text-orange-400">
                                  <Tag className="w-3 h-3 mr-1 flex-shrink-0" />
                                  Não combinável
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-4 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              {(code.start_date || code.end_date) && (
                                <span className="break-words">
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
                                <span className="break-words">
                                  {code.user_usage_limit} vez(es) por cliente
                                  {code.start_date || code.end_date ? ' (no período)' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditCode(code)}
                              className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              title="Editar código"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Sobre os Códigos</h2>

              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Como Funciona</h3>
                  <p className="break-words">Os clientes podem inserir o código no checkout para obter descontos ou frete grátis.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Análise de Lucratividade</h3>
                  <p className="break-words">Ao criar ou editar um cupom, o simulador em tempo real analisa se a margem de lucro de cada produto permanecerá positiva após a aplicação do desconto e subsídio de frete.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Proteção Contra Prejuízo</h3>
                  <p className="break-words">O sistema indica o teto máximo de desconto recomendável sem zerar o lucro e exibe um alerta vermelho proeminente caso o desconto configurado coloque algum produto no vermelho.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
