import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Truck, Gift, Search, AlertTriangle, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { shippingService, ShippingRegion, ShippingSettings as ShippingSettingsType, ShippingCalculation, ShippingMethod } from '../services/shipping.service'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

export default function ShippingSettings() {
  const [regions, setRegions] = useState<ShippingRegion[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [settings, setSettings] = useState<ShippingSettingsType>({ 
    custom_shipping_enabled: true,
    sedex_shipping_enabled: true,
    sedex_origin_cep: '',
    custom_free_shipping_enabled: true,
    custom_free_shipping_threshold: 200,
    sedex_free_shipping_enabled: false,
    sedex_free_shipping_threshold: 0,
    free_shipping_threshold: 200,
    general_delivery_time: 5,
    general_delivery_time_type: 'business'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para formulário de nova/edição de região
  const [editingRegion, setEditingRegion] = useState<ShippingRegion | null>(null)
  const [formData, setFormData] = useState({
    municipality: '',
    cepFrom: '',
    cepTo: '',
    shippingFee: '',
    deliveryTime: '',
    deliveryTimeType: 'business',
    active: true,
  })

  // Estado para a ferramenta de teste de cotação do Admin
  const [testCep, setTestCep] = useState('')
  const [testCartTotal, setTestCartTotal] = useState('150.00')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<ShippingCalculation | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [regionsData, settingsData, methodsData] = await Promise.all([
        shippingService.getShippingRegions(),
        shippingService.getShippingSettings(),
        shippingService.getShippingMethods(),
      ])
      setRegions(regionsData)
      setShippingMethods(methodsData)
      
      setSettings({
        custom_shipping_enabled: methodsData.find(method => method.code === 'local_delivery')?.checkout_enabled ?? false,
        sedex_shipping_enabled: methodsData.find(method => method.code === 'sedex')?.checkout_enabled ?? true,
        sedex_origin_cep: settingsData.sedex_origin_cep || '',
        custom_free_shipping_enabled: settingsData.custom_free_shipping_enabled !== undefined ? Boolean(settingsData.custom_free_shipping_enabled) : true,
        custom_free_shipping_threshold: settingsData.custom_free_shipping_threshold !== undefined ? Number(settingsData.custom_free_shipping_threshold) : (settingsData.free_shipping_threshold || 200),
        sedex_free_shipping_enabled: settingsData.sedex_free_shipping_enabled !== undefined ? Boolean(settingsData.sedex_free_shipping_enabled) : false,
        sedex_free_shipping_threshold: settingsData.sedex_free_shipping_threshold !== undefined ? Number(settingsData.sedex_free_shipping_threshold) : 0,
        free_shipping_threshold: settingsData.free_shipping_threshold !== undefined ? Number(settingsData.free_shipping_threshold) : 200,
        general_delivery_time: settingsData.general_delivery_time !== undefined ? Number(settingsData.general_delivery_time) : 5,
        general_delivery_time_type: settingsData.general_delivery_time_type || 'business',
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setError(null)

      // SEDEX e PAC usam o mesmo CEP de origem dos Correios.
      const correiosCheckoutEnabled = shippingMethods.some(method => ['sedex', 'pac'].includes(method.code) && method.checkout_enabled)
      if (correiosCheckoutEnabled) {
        const cleanOrigin = (settings.sedex_origin_cep || '').replace(/\D/g, '')
        if (cleanOrigin.length !== 8) {
          setError('O CEP de origem dos Correios é obrigatório e deve conter 8 dígitos quando PAC ou SEDEX estiver ativado.')
          setSaving(false)
          return
        }
      }

      await Promise.all(shippingMethods.map(method => shippingService.updateShippingMethod(method.id, method)))
      await shippingService.updateShippingSettings({
        ...settings,
        sedex_shipping_enabled: correiosCheckoutEnabled,
        custom_shipping_enabled: shippingMethods.find(method => method.code === 'local_delivery')?.checkout_enabled ?? false,
      })
      setSuccess('Configurações salvas com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRegion = async () => {
    try {
      if (!formData.municipality || !formData.cepFrom || !formData.cepTo || !formData.shippingFee) {
        setError('Preencha todos os campos obrigatórios')
        return
      }

      setSaving(true)
      setError(null)
      
      await shippingService.createOrUpdateShippingRegion({
        id: editingRegion?.id,
        municipality: formData.municipality,
        cepFrom: formData.cepFrom,
        cepTo: formData.cepTo,
        shippingFee: Number(formData.shippingFee),
        deliveryTime: formData.deliveryTime !== '' ? Number(formData.deliveryTime) : null,
        deliveryTimeType: formData.deliveryTimeType,
        active: formData.active,
      })

      setSuccess(editingRegion ? 'Região atualizada com sucesso!' : 'Região criada com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      
      setEditingRegion(null)
      setFormData({
        municipality: '',
        cepFrom: '',
        cepTo: '',
        shippingFee: '',
        deliveryTime: '',
        deliveryTimeType: 'business',
        active: true,
      })
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar região')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRegion = (id: string) => {
    confirm.show('Tem certeza que deseja remover esta região?', async () => {
      try {
        setError(null)
        await shippingService.deleteShippingRegion(id)
        setSuccess('Região removida com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadData()
      } catch (err: any) {
        setError(err.message || 'Erro ao remover região')
      }
    })
  }

  const handleEditRegion = (region: ShippingRegion) => {
    setEditingRegion(region)
    setFormData({
      municipality: region.municipality,
      cepFrom: region.cep_from,
      cepTo: region.cep_to,
      shippingFee: String(region.shipping_fee),
      deliveryTime: region.delivery_time !== undefined && region.delivery_time !== null ? String(region.delivery_time) : '',
      deliveryTimeType: region.delivery_time_type || 'business',
      active: region.active,
    })
  }

  const handleCancelEdit = () => {
    setEditingRegion(null)
    setFormData({
      municipality: '',
      cepFrom: '',
      cepTo: '',
      shippingFee: '',
      deliveryTime: '',
      deliveryTimeType: 'business',
      active: true,
    })
  }

  const handleRunTestQuote = async () => {
    if (!testCep) {
      setTestError('Informe um CEP para testar a cotação')
      return
    }
    const cleanCep = testCep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setTestError('CEP de teste deve ter 8 dígitos')
      return
    }

    try {
      setTestLoading(true)
      setTestError(null)
      setTestResult(null)
      const res = await shippingService.testShippingQuote(testCep, Number(testCartTotal) || 0)
      setTestResult(res)
    } catch (err: any) {
      setTestError(err.message || 'Erro ao simular cotação')
    } finally {
      setTestLoading(false)
    }
  }

  const formatCep = (cep: string) => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length <= 5) return clean
    return `${clean.substring(0, 5)}-${clean.substring(5, 8)}`
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando configurações de frete...</p>
        </div>
      </div>
    )
  }

  const noMethodsActive = !shippingMethods.some(method => method.checkout_enabled)
  const correiosCheckoutEnabled = shippingMethods.some(method => ['sedex', 'pac'].includes(method.code) && method.checkout_enabled)
  const localCheckoutEnabled = shippingMethods.find(method => method.code === 'local_delivery')?.checkout_enabled ?? false
  const correiosMissingOrigin = correiosCheckoutEnabled && (!settings.sedex_origin_cep || settings.sedex_origin_cep.replace(/\D/g, '').length !== 8)

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Configurações de Frete</h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Gerencie métodos de entrega, PAC, SEDEX, frete grátis e regiões ativas</p>
            </div>
            <Link
              to="/admin/shipping/free-rules"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Regras de Frete Grátis
            </Link>
          </div>
        </div>

        {/* Avisos & Alertas */}
        {noMethodsActive && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <strong>Atenção:</strong> Todos os métodos de envio estão desativados. Os clientes não conseguirão calcular frete nem concluir compras até que ao menos um método seja ativado.
            </div>
          </div>
        )}

        {correiosMissingOrigin && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <strong>CEP de Origem ausente:</strong> PAC ou SEDEX está ativado, mas é necessário um CEP de origem válido para realizar cotações com os Correios.
            </div>
          </div>
        )}

        {!localCheckoutEnabled && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <strong>Frete por Tabela Desativado:</strong> As regiões locais configuradas abaixo estão temporariamente desativadas e não serão oferecidas aos clientes.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-xs sm:text-sm break-words">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-xs sm:text-sm break-words">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 mb-8">
          {/* Métodos de Envio e Configurações Globais */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bloco 1: Métodos de Envio (Toggles) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Métodos de Envio Oferecidos</h2>
              </div>
              
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_76px_76px] gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:grid-cols-[minmax(0,1fr)_96px_96px]">
                <span>Método</span><span className="text-center">Checkout</span><span className="text-center">Interno</span>
              </div>
              <div className="space-y-3">
                {shippingMethods.map((method, index) => (
                  <div key={method.id} className={`rounded-xl border p-3 sm:p-4 ${method.checkout_enabled ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="grid grid-cols-[minmax(0,1fr)_76px_76px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_96px_96px]">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900 dark:text-white">{method.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{['CORREIOS', 'SEDEX'].includes(method.calculation_type) ? 'Cotação automática' : method.calculation_type === 'LOCAL_TABLE' ? 'Tabela por faixa de CEP' : 'Valor configurado'}</div>
                      </div>
                      {(['checkout_enabled', 'internal_enabled'] as const).map(field => (
                        <label key={field} className="relative mx-auto inline-flex cursor-pointer items-center">
                          <input type="checkbox" checked={method[field]} onChange={event => setShippingMethods(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.checked } : item))} className="sr-only peer" />
                          <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                        </label>
                      ))}
                    </div>
                    {method.calculation_type === 'FIXED' && (
                      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-3 dark:border-gray-700">
                        <label className="text-xs text-gray-600 dark:text-gray-300">Valor no checkout (R$)<input type="number" min="0" step="0.01" value={method.fixed_fee ?? ''} onChange={event => setShippingMethods(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, fixed_fee: event.target.value === '' ? null : Number(event.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" /></label>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Prazo<input type="number" min="0" value={method.delivery_time ?? ''} onChange={event => setShippingMethods(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, delivery_time: event.target.value === '' ? null : Number(event.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" /></label>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Tipo<select value={method.delivery_time_type} onChange={event => setShippingMethods(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, delivery_time_type: event.target.value as 'business' | 'calendar' } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="business">Dias úteis</option><option value="calendar">Dias corridos</option></select></label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* CEP de origem compartilhado por PAC e SEDEX */}
              {correiosCheckoutEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    CEP de Origem dos Correios (Despacho) *
                  </label>
                  <div className="max-w-xs">
                    <input
                      type="text"
                      maxLength={9}
                      value={formatCep(settings.sedex_origin_cep || '')}
                      onChange={(e) => setSettings({ ...settings, sedex_origin_cep: e.target.value.replace(/\D/g, '') })}
                      placeholder="00000-000"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white font-mono"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Utilizado como origem para calcular separadamente custos e prazos de PAC e SEDEX.
                  </p>
                </div>
              )}
            </div>

            {/* Bloco 2: Regras de Frete Grátis por Método */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Frete Grátis por Método</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Frete Grátis Entrega Local */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Entrega Local (Tabela)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.custom_free_shipping_enabled}
                        onChange={(e) => setSettings({ ...settings, custom_free_shipping_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  {settings.custom_free_shipping_enabled && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Valor Mínimo do Carrinho (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.custom_free_shipping_threshold !== undefined ? settings.custom_free_shipping_threshold : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value)
                          setSettings({ ...settings, custom_free_shipping_threshold: isNaN(val) ? 0 : val, free_shipping_threshold: isNaN(val) ? 0 : val })
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                        placeholder="200.00"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        {settings.custom_free_shipping_threshold && settings.custom_free_shipping_threshold > 0
                          ? `Grátis acima de R$ ${Number(settings.custom_free_shipping_threshold).toFixed(2).replace('.', ',')}`
                          : 'Frete grátis para qualquer valor local'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Frete Grátis Correios */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Correios (PAC e SEDEX)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.sedex_free_shipping_enabled}
                        onChange={(e) => setSettings({ ...settings, sedex_free_shipping_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  {settings.sedex_free_shipping_enabled && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Valor Mínimo do Carrinho (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.sedex_free_shipping_threshold !== undefined ? settings.sedex_free_shipping_threshold : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value)
                          setSettings({ ...settings, sedex_free_shipping_threshold: isNaN(val) ? 0 : val })
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                        placeholder="350.00"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        {settings.sedex_free_shipping_threshold && settings.sedex_free_shipping_threshold > 0
                          ? `Grátis via PAC ou SEDEX acima de R$ ${Number(settings.sedex_free_shipping_threshold).toFixed(2).replace('.', ',')}`
                          : 'Frete grátis nos Correios sem valor mínimo'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prazo Geral Padrão */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Prazo de Entrega Geral Padrão (para regiões locais sem prazo fixado)
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <input
                    type="number"
                    min="1"
                    value={settings.general_delivery_time !== undefined ? settings.general_delivery_time : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 5 : Number(e.target.value)
                      setSettings({ ...settings, general_delivery_time: isNaN(val) ? 5 : val })
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                    placeholder="5"
                  />
                  <select
                    value={settings.general_delivery_time_type || 'business'}
                    onChange={(e) => setSettings({ ...settings, general_delivery_time_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                  >
                    <option value="business">Dias Úteis</option>
                    <option value="calendar">Dias Corridos</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações de Frete'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Coluna 3: Simulação de Cotação em Tempo Real (Admin Test Tool) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
              <div className="flex items-center mb-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Testar Cotação</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Simule como a cotação é exibida para os clientes nas configurações atuais.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CEP de Destino</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={formatCep(testCep)}
                    onChange={(e) => setTestCep(e.target.value)}
                    placeholder="01001-000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do Carrinho (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={testCartTotal}
                    onChange={(e) => setTestCartTotal(e.target.value)}
                    placeholder="150.00"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleRunTestQuote}
                  disabled={testLoading}
                  className="w-full py-2 px-3 text-xs sm:text-sm bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {testLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Simular Cotação
                    </>
                  )}
                </button>
              </div>

              {testError && (
                <div className="mt-3 p-2.5 text-xs bg-red-50 text-red-700 rounded border border-red-200">
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                  <div className="font-semibold text-gray-800 dark:text-gray-200 border-b pb-1">Resultado da Simulação:</div>
                  <div className="text-gray-600 dark:text-gray-300">{testResult.message}</div>
                  
                  {testResult.options && testResult.options.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {testResult.options.map((opt, i) => (
                        <div key={i} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                            <span>{opt.name}</span>
                            <span className={opt.isFreeShipping ? 'text-green-600 dark:text-green-400 font-bold' : ''}>
                              {opt.isFreeShipping ? 'Grátis' : `R$ ${opt.shippingFee.toFixed(2).replace('.', ',')}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {opt.deliveryTime ? `${opt.deliveryTime} ${opt.deliveryTimeType === 'calendar' ? 'dias corridos' : 'dias úteis'}` : 'Prazo indisponível'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400 font-medium">Nenhum método de entrega disponível para este CEP.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Regiões Locais Cadastradas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Regiões de Entrega por Tabela</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Cadastre municípios e faixas de CEP atendidos com taxa local</p>
            </div>
            <button
              onClick={() => {
                setEditingRegion(null)
                setFormData({
                  municipality: '',
                  cepFrom: '',
                  cepTo: '',
                  shippingFee: '',
                  deliveryTime: '',
                  deliveryTimeType: 'business',
                  active: true,
                })
              }}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Região
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3">Município</th>
                  <th className="py-3 px-3">Faixa de CEP</th>
                  <th className="py-3 px-3">Valor da Taxa</th>
                  <th className="py-3 px-3">Prazo Individual</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {regions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhuma região de entrega por tabela cadastrada.
                    </td>
                  </tr>
                ) : (
                  regions.map((region) => (
                    <tr key={region.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{region.municipality}</td>
                      <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-300">{formatCep(region.cep_from)} até {formatCep(region.cep_to)}</td>
                      <td className="py-3 px-3 text-gray-900 dark:text-white font-semibold">R$ {Number(region.shipping_fee).toFixed(2).replace('.', ',')}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300">
                        {region.delivery_time ? `${region.delivery_time} ${region.delivery_time_type === 'calendar' ? 'dias corridos' : 'dias úteis'}` : 'Padrão Geral'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${region.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {region.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleEditRegion(region)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteRegion(region.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Adicionar/Editar Região */}
        {(editingRegion || formData.municipality !== '' || formData.cepFrom !== '') && (
          <AdminModal
            isOpen={true}
            onClose={handleCancelEdit}
            title={editingRegion ? 'Editar Região' : 'Nova Região de Entrega'}
          >
            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Município *</label>
                <input
                  type="text"
                  value={formData.municipality}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">CEP Inicial *</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={formatCep(formData.cepFrom)}
                    onChange={(e) => setFormData({ ...formData, cepFrom: e.target.value.replace(/\D/g, '') })}
                    placeholder="01000-000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">CEP Final *</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={formatCep(formData.cepTo)}
                    onChange={(e) => setFormData({ ...formData, cepTo: e.target.value.replace(/\D/g, '') })}
                    placeholder="05999-999"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do Frete (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.shippingFee}
                    onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                    placeholder="15.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Prazo Específico (opcional)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                    placeholder="Usar prazo geral"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="region-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="region-active" className="text-gray-700 dark:text-gray-300">Região ativa para cotação</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRegion}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Região'}
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </div>
  )
}
