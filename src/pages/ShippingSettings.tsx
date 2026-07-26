import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Save, Plus, Trash2, Truck, Gift, Search, AlertTriangle, MapPin, TrendingUp, Percent, ShieldCheck, LayoutDashboard, ChevronLeft, ChevronRight, Settings2, ArrowRight, CheckCircle2, Package, Scale, Calculator, Tag, ChevronDown, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { shippingService, ShippingRegion, ShippingSettings as ShippingSettingsType, ShippingCalculation, ShippingMethod } from '../services/shipping.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

type ShippingSection = 'overview' | 'methods' | 'promotions' | 'tester' | 'regions'
const REGIONS_PER_PAGE = 8
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const formatMoney = (value: number | null | undefined) => value == null ? 'Indisponível' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatSignedMoney = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatMoney(Math.abs(value))}`

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
    general_delivery_time_type: 'business',
    profit_margin_subsidy_enabled: false,
    profit_margin_min_threshold: 20,
    profit_margin_subsidy_share: 50,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estado para formulário de nova/edição de região
  const [editingRegion, setEditingRegion] = useState<ShippingRegion | null>(null)
  const [regionModalOpen, setRegionModalOpen] = useState(false)
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
  const [testCartTotal, setTestCartTotal] = useState('')
  const [testPromoCode, setTestPromoCode] = useState('')
  const [testCustomPackage, setTestCustomPackage] = useState(false)
  const [testPackageWeight, setTestPackageWeight] = useState('250')
  const [testPackageLength, setTestPackageLength] = useState('16')
  const [testPackageWidth, setTestPackageWidth] = useState('11')
  const [testPackageHeight, setTestPackageHeight] = useState('13')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<ShippingCalculation | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<ShippingSection>('overview')
  const [regionSearch, setRegionSearch] = useState('')
  const [regionStatus, setRegionStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [regionPage, setRegionPage] = useState(1)
  // Produto picker para teste de subsídio por margem
  const [testProducts, setTestProducts] = useState<Array<{ product: Product; qty: number }>>([])
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const productSearchRef = useRef<HTMLDivElement>(null)

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
        profit_margin_subsidy_enabled: settingsData.profit_margin_subsidy_enabled !== undefined ? Boolean(settingsData.profit_margin_subsidy_enabled) : false,
        profit_margin_min_threshold: settingsData.profit_margin_min_threshold !== undefined ? Number(settingsData.profit_margin_min_threshold) : 20,
        profit_margin_subsidy_share: settingsData.profit_margin_subsidy_share !== undefined ? Number(settingsData.profit_margin_subsidy_share) : 50,
      })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar dados'))
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao salvar configurações'))
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao salvar região'))
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
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Erro ao remover região'))
      }
    })
  }

  const handleEditRegion = (region: ShippingRegion) => {
    setRegionModalOpen(true)
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
    setRegionModalOpen(false)
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

  // Busca de produtos para o testador (subsídio por margem)
  const searchProductsForTester = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setProductResults([]); return }
    setProductSearchLoading(true)
    try {
      const results = await productsService.search(term)
      setProductResults(results.filter(p => p.active && !p.archived).slice(0, 10))
    } catch {
      setProductResults([])
    } finally {
      setProductSearchLoading(false)
    }
  }, [])

  const addProductToTest = (product: Product) => {
    setTestProducts(prev => {
      const existing = prev.find(p => p.product.id === product.id)
      if (existing) return prev.map(p => p.product.id === product.id ? { ...p, qty: p.qty + 1 } : p)
      return [...prev, { product, qty: 1 }]
    })
    setProductSearch('')
    setProductResults([])
    setProductSearchOpen(false)
  }

  const removeProductFromTest = (productId: string) => {
    setTestProducts(prev => prev.filter(p => p.product.id !== productId))
  }

  const updateProductQty = (productId: string, qty: number) => {
    if (qty < 1) { removeProductFromTest(productId); return }
    setTestProducts(prev => prev.map(p => p.product.id === productId ? { ...p, qty } : p))
  }

  const handleRunTestQuote = async (overrideCep?: string, overrideCart?: string) => {
    const targetCep = overrideCep !== undefined ? overrideCep : testCep
    const targetCart = overrideCart !== undefined ? overrideCart : testCartTotal
    if (!targetCep) {
      setTestError('Informe um CEP para testar a cotação')
      return
    }
    const cleanCep = targetCep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setTestError('CEP de teste deve ter 8 dígitos')
      return
    }

    try {
      setTestLoading(true)
      setTestError(null)
      setTestResult(null)

      // Se há produtos selecionados, manda os IDs reais para o backend calcular subsídio por margem
      let cartItems: object[] | undefined = undefined
      if (testProducts.length > 0) {
        cartItems = testProducts.map(({ product, qty }) => ({
          product_id: product.id,
          quantity: qty,
          unit_price: product.promo_price ?? product.price,
          ...(testCustomPackage ? {
            weightGrams: Math.max(1, Number(testPackageWeight) || 250),
            lengthCm: Math.max(1, Number(testPackageLength) || 16),
            widthCm: Math.max(1, Number(testPackageWidth) || 11),
            heightCm: Math.max(1, Number(testPackageHeight) || 13),
          } : {}),
        }))
      } else if (testCustomPackage) {
        cartItems = [{
          product_id: 'test-package-item',
          quantity: 1,
          weightGrams: Math.max(1, Number(testPackageWeight) || 250),
          lengthCm: Math.max(1, Number(testPackageLength) || 16),
          widthCm: Math.max(1, Number(testPackageWidth) || 11),
          heightCm: Math.max(1, Number(testPackageHeight) || 13),
          unit_price: Number(targetCart) || 0,
        }]
      }

      const res = await shippingService.testShippingQuote(
        targetCep,
        Number(targetCart) || 0,
        cartItems,
        testPromoCode.trim() || undefined
      )
      setTestResult(res)
    } catch (err: unknown) {
      setTestError(getErrorMessage(err, 'Erro ao simular cotação'))
    } finally {
      setTestLoading(false)
    }
  }

  const formatCep = (cep: string) => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length <= 5) return clean
    return `${clean.substring(0, 5)}-${clean.substring(5, 8)}`
  }

  const filteredRegions = useMemo(() => {
    const search = regionSearch.trim().toLocaleLowerCase('pt-BR')
    const normalizedCep = search.replace(/\D/g, '')
    return regions.filter(region => {
      const matchesSearch = !search
        || region.municipality.toLocaleLowerCase('pt-BR').includes(search)
        || (normalizedCep.length > 0 && (region.cep_from.includes(normalizedCep) || region.cep_to.includes(normalizedCep)))
      const matchesStatus = regionStatus === 'all'
        || (regionStatus === 'active' ? region.active : !region.active)
      return matchesSearch && matchesStatus
    })
  }, [regionSearch, regionStatus, regions])

  const regionPageCount = Math.max(1, Math.ceil(filteredRegions.length / REGIONS_PER_PAGE))
  const safeRegionPage = Math.min(regionPage, regionPageCount)
  const paginatedRegions = filteredRegions.slice(
    (safeRegionPage - 1) * REGIONS_PER_PAGE,
    safeRegionPage * REGIONS_PER_PAGE,
  )

  const openSection = (section: ShippingSection) => {
    setActiveSection(section)
    window.requestAnimationFrame(() => document.getElementById('shipping-content')?.focus({ preventScroll: true }))
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Entregas e frete</h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Configure o checkout e valide a experiência de entrega da loja.</p>
            </div>
            {activeSection === 'promotions' && <Link
              to="/admin/shipping/free-rules"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Regras avançadas
            </Link>}
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


        <nav aria-label="Áreas das configurações de frete" className="mb-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex min-w-max gap-1" role="tablist">
            {([
              ['overview', 'Visão geral', LayoutDashboard],
              ['methods', 'Métodos', Truck],
              ['promotions', 'Frete grátis', Gift],
              ['tester', 'Testador', Search],
              ['regions', 'Tabelas avançadas', MapPin],
            ] as const).map(([section, label, Icon]) => (
              <button key={section} type="button" role="tab" aria-selected={activeSection === section} aria-controls="shipping-content" onClick={() => openSection(section)}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeSection === section ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </nav>

        <main id="shipping-content" role="tabpanel" tabIndex={-1} className="outline-none">
          {activeSection === 'overview' && (
            <div className="space-y-5">
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Métodos no checkout', value: `${shippingMethods.filter(method => method.checkout_enabled).length}/${shippingMethods.length}`, icon: Truck, tone: 'blue' },
                  { label: 'Regiões ativas', value: String(regions.filter(region => region.active).length), icon: MapPin, tone: 'green' },
                  { label: 'Ofertas de frete grátis', value: String(Number(Boolean(settings.custom_free_shipping_enabled)) + Number(Boolean(settings.sedex_free_shipping_enabled))), icon: Gift, tone: 'purple' },
                  { label: 'Prazo local padrão', value: `${settings.general_delivery_time || 5} dias`, icon: CheckCircle2, tone: 'gray' },
                ].map(item => {
                  const Icon = item.icon
                  const tone = item.tone === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' : item.tone === 'green' ? 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-300' : item.tone === 'purple' ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                  return <article key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <span className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <p className="text-xl font-bold text-gray-950 sm:text-2xl dark:text-white">{item.value}</p>
                    <p className="mt-1 text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-300">{item.label}</p>
                  </article>
                })}
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><Settings2 className="h-5 w-5" aria-hidden="true" /></span>
                  <div><h2 className="text-lg font-bold text-gray-950 dark:text-white">Configuração essencial</h2><p className="text-sm text-gray-500 dark:text-gray-400">Acesse primeiro o que afeta diretamente a compra.</p></div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    ['methods', 'Métodos e checkout', 'Ative canais, valores e o CEP de origem.', Truck],
                    ['promotions', 'Promoções de entrega', 'Configure frete grátis por modalidade.', Gift],
                    ['tester', 'Validar experiência', 'Simule o retorno exibido ao cliente.', Search],
                  ].map(([section, title, description, Icon]) => (
                    <button key={String(section)} type="button" onClick={() => openSection(section as ShippingSection)} className="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:hover:border-blue-700">
                      <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" /><ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" /></div>
                      <h3 className="mt-4 font-semibold text-gray-950 dark:text-white">{String(title)}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{String(description)}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeSection !== 'overview' && activeSection !== 'regions' && (
            <div className={`grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 mb-8 ${activeSection === 'tester' ? '' : 'lg:grid-cols-3'}`}>
              {/* Métodos de Envio e Configurações Globais */}
              {(activeSection === 'methods' || activeSection === 'promotions') && <div className="lg:col-span-3 space-y-6">

                {/* Bloco 1: Métodos de Envio (Toggles) */}
                {activeSection === 'methods' && <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Métodos de Envio Oferecidos</h2>
                  </div>

                  <div className="mb-3 grid grid-cols-[minmax(0,1fr)_76px_76px] gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:grid-cols-[minmax(0,1fr)_96px_96px]">
                    <span>Método</span><span className="text-center">Checkout</span><span className="text-center">Interno</span>
                  </div>
                  <div className="space-y-3">
                    {shippingMethods.filter(m => m.code !== 'correios').map((method) => (
                      <div key={method.id} className={`rounded-xl border p-3 sm:p-4 ${method.checkout_enabled ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="grid grid-cols-[minmax(0,1fr)_76px_76px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_96px_96px]">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900 dark:text-white">{method.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{['CORREIOS', 'SEDEX'].includes(method.calculation_type) ? 'Cotação automática' : method.calculation_type === 'LOCAL_TABLE' ? 'Tabela por faixa de CEP' : 'Valor configurado'}</div>
                          </div>
                          {(['checkout_enabled', 'internal_enabled'] as const).map(field => (
                            <label key={field} className="relative mx-auto inline-flex cursor-pointer items-center">
                              <input type="checkbox" checked={method[field]} onChange={event => setShippingMethods(current => current.map(item => item.id === method.id ? { ...item, [field]: event.target.checked } : item))} className="sr-only peer" />
                              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                            </label>
                          ))}
                        </div>
                        {method.calculation_type === 'FIXED' && (
                          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-3 dark:border-gray-700">
                            <label className="text-xs text-gray-600 dark:text-gray-300">Valor no checkout (R$)<input type="number" min="0" step="0.01" value={method.fixed_fee ?? ''} onChange={event => setShippingMethods(current => current.map(item => item.id === method.id ? { ...item, fixed_fee: event.target.value === '' ? null : Number(event.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" /></label>
                            <label className="text-xs text-gray-600 dark:text-gray-300">Prazo<input type="number" min="0" value={method.delivery_time ?? ''} onChange={event => setShippingMethods(current => current.map(item => item.id === method.id ? { ...item, delivery_time: event.target.value === '' ? null : Number(event.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" /></label>
                            <label className="text-xs text-gray-600 dark:text-gray-300">Tipo<select value={method.delivery_time_type} onChange={event => setShippingMethods(current => current.map(item => item.id === method.id ? { ...item, delivery_time_type: event.target.value as 'business' | 'calendar' } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="business">Dias úteis</option><option value="calendar">Dias corridos</option></select></label>
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
                </div>}

                {/* Bloco 2: Regras de Frete Grátis por Método */}
                {activeSection === 'promotions' && <div className="space-y-5">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
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
                          onChange={(e) => setSettings({ ...settings, general_delivery_time_type: e.target.value as 'business' | 'calendar' })}
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

                  {/* Bloco 3: Subsídio Dinâmico de Frete via Margem de Lucro */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg mr-3">
                          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Subsídio de Frete por Margem de Lucro</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Abata o valor do frete utilizando parte do lucro excedente dos produtos</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.profit_margin_subsidy_enabled || false}
                          onChange={(e) => setSettings({ ...settings, profit_margin_subsidy_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {settings.profit_margin_subsidy_enabled ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Margem Mínima Protegida */}
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              Margem Mínima Protegida (%)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={settings.profit_margin_min_threshold !== undefined ? settings.profit_margin_min_threshold : 20}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value)
                                  setSettings({ ...settings, profit_margin_min_threshold: Math.max(0, Math.min(100, val)) })
                                }}
                                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white font-semibold"
                                placeholder="20"
                              />
                              <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">%</span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                              Porcentagem de lucro por produto mantida intacta (não afetada pelo frete).
                            </p>
                          </div>

                          {/* Percentual do Excedente para Frete */}
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              Percentual do Excedente para Frete (%)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={settings.profit_margin_subsidy_share !== undefined ? settings.profit_margin_subsidy_share : 50}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value)
                                  setSettings({ ...settings, profit_margin_subsidy_share: Math.max(0, Math.min(100, val)) })
                                }}
                                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-white font-semibold"
                                placeholder="50"
                              />
                              <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">%</span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                              Fração da margem acima do mínimo a ser convertida em desconto no frete.
                            </p>
                          </div>
                        </div>

                        {/* Demonstração / Exemplo de Cálculo em Tempo Real */}
                        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 mb-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Simulação do Cálculo com as Configurações Atuais:
                          </div>
                          <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 leading-relaxed">
                            {(() => {
                              const min = settings.profit_margin_min_threshold ?? 20
                              const share = settings.profit_margin_subsidy_share ?? 50
                              const exampleMargin = 30
                              const examplePrice = 100
                              const excess = Math.max(0, exampleMargin - min)
                              const discountPercent = excess * (share / 100)
                              const discountAmount = (discountPercent / 100) * examplePrice
                              return (
                                <>
                                  <p>Para um produto de <strong>R$ 100,00</strong> com <strong>30% de margem de lucro</strong> (Preço de Custo R$ 70,00):</p>
                                  <ul className="list-disc list-inside pl-2 space-y-0.5 text-[11px]">
                                    <li>Margem mínima preservada para a loja: <strong>{min}%</strong></li>
                                    <li>Margem excedente disponível: <strong>{excess}%</strong> (30% - {min}%)</li>
                                    <li>Desconto aplicado no frete: <strong>{share}% de {excess}% = {discountPercent}% do preço</strong> (R$ {discountAmount.toFixed(2).replace('.', ',')} por unidade)</li>
                                  </ul>
                                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 italic">
                                    * Ao adicionar múltiplos produtos ao carrinho, os descontos se acumulam para reduzir progressivamente o preço do frete exibido ao cliente.
                                  </p>
                                </>
                              )
                            })()}
                          </div>
                        </div>

                        <div>
                          <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all shadow-sm disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            <span>{saving ? 'Salvando...' : 'Salvar Regra de Subsídio por Margem'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>O subsídio dinâmico de frete por margem de lucro está <strong>desativado</strong> no momento.</span>
                      </div>
                    )}
                  </div>
                </div>}
              </div>}
            </div>)}

          {/* Testador de cotação com detalhamento do cálculo real */}
          {activeSection === 'tester' && <div className="mx-auto w-full max-w-4xl space-y-5">
            {/* Formulário */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-gray-950 dark:text-white">Testador de Cotação</h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Simula o mesmo motor de cálculo usado no checkout e mostra a decomposição de cada taxa e desconto.</p>
                </div>
              </div>

              {/* Atalhos Rápidos de CEPs */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">Atalhos:</span>
                {[
                  { name: 'SP', cep: '01001-000' },
                  { name: 'RJ', cep: '22041-001' },
                  { name: 'BH', cep: '30130-010' },
                  { name: 'CWB', cep: '80420-000' },
                  { name: 'BSB', cep: '70300-000' },
                ].map((preset) => (
                  <button
                    key={preset.cep}
                    type="button"
                    onClick={() => {
                      setTestCep(preset.cep)
                      void handleRunTestQuote(preset.cep, testCartTotal)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                  >
                    <MapPin className="h-3 w-3 text-blue-500" aria-hidden="true" />
                    {preset.name}
                  </button>
                ))}
              </div>

              <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void handleRunTestQuote() }}>
                {/* CEP + Preço */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">CEP de destino *</span>
                    <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={9} value={formatCep(testCep)} onChange={(event) => setTestCep(event.target.value)} placeholder="01001-000" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Valor do carrinho (R$)
                      {testProducts.length > 0 && <span className="ml-2 font-normal text-gray-400">(calculado pelos produtos)</span>}
                    </span>
                    <input type="number" min="0" step="0.01" value={testCartTotal} onChange={(event) => setTestCartTotal(event.target.value)} placeholder={testProducts.length > 0 ? 'Auto (soma dos produtos)' : '150,00'} disabled={testProducts.length > 0} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500" />
                  </label>
                </div>

                {/* Produtos para subsídio por margem */}
                <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Produtos do pedido
                      <span className="ml-1.5 font-normal text-gray-400">(opcional · necessário para calcular subsídio por margem)</span>
                    </span>
                    {testProducts.length > 0 && (
                      <button type="button" onClick={() => setTestProducts([])} className="text-[11px] text-red-500 hover:text-red-700">Limpar todos</button>
                    )}
                  </div>

                  {/* Lista dos produtos selecionados */}
                  {testProducts.length > 0 && (
                    <ul className="mb-3 space-y-1.5">
                      {testProducts.map(({ product, qty }) => (
                        <li key={product.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-900 dark:text-white">{product.name}</span>
                          <span className="text-xs text-gray-500">{formatMoney(product.promo_price ?? product.price)}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateProductQty(product.id, qty - 1)} className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">−</button>
                            <span className="w-6 text-center text-xs font-semibold text-gray-900 dark:text-white">{qty}</span>
                            <button type="button" onClick={() => updateProductQty(product.id, qty + 1)} className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">+</button>
                          </div>
                          <button type="button" onClick={() => removeProductFromTest(product.id)} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Busca de produto */}
                  <div className="relative" ref={productSearchRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value)
                          setProductSearchOpen(true)
                          void searchProductsForTester(e.target.value)
                        }}
                        onFocus={() => setProductSearchOpen(true)}
                        placeholder="Buscar produto para adicionar..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-800"
                      />
                      {productSearchLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border border-blue-400 border-t-transparent" />}
                    </div>
                    {productSearchOpen && productResults.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        {productResults.map((product) => (
                          <li key={product.id}>
                            <button
                              type="button"
                              onClick={() => addProductToTest(product)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                              <span className="shrink-0 text-gray-500">{formatMoney(product.promo_price ?? product.price)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Cupom + Pacote personalizado */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Cupom (opcional)</span>
                    <div className="relative">
                      <input type="text" value={testPromoCode} onChange={(event) => setTestPromoCode(event.target.value.toUpperCase())} placeholder="FRETEGRATIS" className="w-full rounded-xl border border-gray-300 bg-white pl-3 pr-8 py-2.5 font-mono text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                      <Tag className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    </div>
                  </label>
                  <div>
                    <button
                      type="button"
                      onClick={() => setTestCustomPackage(!testCustomPackage)}
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Package className="h-3.5 w-3.5" />
                      {testCustomPackage ? 'Ocultar pacote personalizado' : 'Personalizar pacote'}
                      <ChevronDown className={`h-3 w-3 transition-transform ${testCustomPackage ? 'rotate-180' : ''}`} />
                    </button>
                    {testCustomPackage && (
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                        {[
                          { label: 'Peso (g)', val: testPackageWeight, set: setTestPackageWeight, ph: '250' },
                          { label: 'Comp. (cm)', val: testPackageLength, set: setTestPackageLength, ph: '16' },
                          { label: 'Larg. (cm)', val: testPackageWidth, set: setTestPackageWidth, ph: '11' },
                          { label: 'Alt. (cm)', val: testPackageHeight, set: setTestPackageHeight, ph: '13' },
                        ].map(({ label, val, set, ph }) => (
                          <label key={label} className="block">
                            <span className="mb-1 block text-[10px] font-medium text-gray-500">{label}</span>
                            <input type="number" min="1" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={testLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500">
                    {testLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Search className="h-4 w-4" />}
                    {testLoading ? 'Consultando...' : 'Calcular'}
                  </button>
                </div>
              </form>
            </section>

            {testError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-red-600" /><div><p className="font-bold">Erro ao executar diagnóstico</p><p className="mt-0.5 text-xs">{testError}</p></div></div>}

            {testResult && (() => {
              const diagnostics = testResult.diagnostics
              const options = testResult.options || []
              const packageData = diagnostics?.package
              const cheapestOption = options.length > 0 ? [...options].sort((a, b) => a.shippingFee - b.shippingFee)[0] : null
              const fastestOption = options.length > 0 ? [...options].filter(o => o.deliveryTime != null).sort((a, b) => (a.deliveryTime ?? 99) - (b.deliveryTime ?? 99))[0] : null

              return <div className="space-y-4" aria-live="polite">
                {/* Resumo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:bg-emerald-950/30 dark:border-emerald-900/40">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Menor Valor</p>
                    <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{cheapestOption ? (cheapestOption.isFreeShipping ? 'Grátis' : formatMoney(cheapestOption.shippingFee)) : '—'}</p>
                    {cheapestOption && <p className="text-[11px] text-emerald-700/60 dark:text-emerald-400">{cheapestOption.name}</p>}
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:bg-blue-950/30 dark:border-blue-900/40">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Menor Prazo</p>
                    <p className="mt-1 text-xl font-black text-blue-700 dark:text-blue-300">{fastestOption?.deliveryTime != null ? `${fastestOption.deliveryTime} dias` : '—'}</p>
                    {fastestOption && <p className="text-[11px] text-blue-700/60 dark:text-blue-400">{fastestOption.name}</p>}
                  </div>
                </div>

                {/* Análise de Margem e Lucro — apenas com produtos selecionados */}
                {testProducts.length > 0 && (() => {
                  // ── Dados por produto ──────────────────────────────────────────
                  const marginRules = diagnostics?.rules
                  const minThreshold = marginRules?.profitMarginMinThreshold ?? 0
                  const subsidyShare = marginRules?.profitMarginSubsidyShare ?? 0
                  const subsidyEnabled = marginRules?.profitMarginSubsidyEnabled ?? false

                  const productRows = testProducts.map(({ product, qty }) => {
                    const salePrice = (product.promo_price ?? product.price) * qty
                    const hasCost = product.purchase_price != null && product.purchase_price > 0
                    const costPrice = hasCost ? (product.purchase_price! * qty) : null
                    const grossProfit = costPrice != null ? salePrice - costPrice : null
                    const marginPct = (costPrice != null && salePrice > 0)
                      ? ((salePrice - costPrice) / salePrice) * 100
                      : null

                    // Subsídio máximo disponível deste produto para o frete
                    const excessPct = (marginPct != null && subsidyEnabled)
                      ? Math.max(0, marginPct - minThreshold)
                      : 0
                    const subsidyBudget = (subsidyEnabled && marginPct != null)
                      ? (excessPct * (subsidyShare / 100) / 100) * salePrice
                      : 0

                    return { product, qty, salePrice, costPrice, grossProfit, marginPct, subsidyBudget, hasCost }
                  })

                  const totalRevenue = productRows.reduce((s, r) => s + r.salePrice, 0)
                  const totalCost = productRows.every(r => r.hasCost) ? productRows.reduce((s, r) => s + (r.costPrice ?? 0), 0) : null
                  const totalGrossProfit = totalCost != null ? totalRevenue - totalCost : null
                  const totalMarginPct = (totalCost != null && totalRevenue > 0) ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null
                  const totalSubsidyBudget = productRows.reduce((s, r) => s + r.subsidyBudget, 0)

                  // Subsídio real aplicado (do frete mais barato)
                  const cheapestAdjusted = cheapestOption?.pricing
                  const actualSubsidyUsed = cheapestAdjusted
                    ? cheapestAdjusted.adjustments
                        .filter(a => a.type === 'profit_margin_subsidy')
                        .reduce((s, a) => s + Math.abs(a.amount), 0)
                    : 0

                  const leftoverSubsidy = Math.max(0, totalSubsidyBudget - actualSubsidyUsed)
                  const finalShippingCost = cheapestOption ? (cheapestOption.isFreeShipping ? 0 : cheapestOption.shippingFee) : null
                  const netProfit = totalGrossProfit != null && finalShippingCost != null
                    ? totalGrossProfit - (finalShippingCost - actualSubsidyUsed) + leftoverSubsidy
                    : null

                  const noCostData = productRows.every(r => !r.hasCost)

                  return (
                    <div className="rounded-2xl border border-violet-200 bg-white dark:border-violet-800/50 dark:bg-gray-800 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-2.5 border-b border-violet-100 bg-violet-50/60 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                        <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                        <h3 className="font-bold text-sm text-violet-900 dark:text-violet-200">Análise de Margem e Lucro</h3>
                        {noCostData && (
                          <span className="ml-auto text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                            Preço de custo não cadastrado
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Tabela por produto */}
                        {productRows.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                  <th className="pb-2 text-left font-semibold text-gray-500 dark:text-gray-400">Produto</th>
                                  <th className="pb-2 text-right font-semibold text-gray-500 dark:text-gray-400">Receita</th>
                                  <th className="pb-2 text-right font-semibold text-gray-500 dark:text-gray-400">Custo</th>
                                  <th className="pb-2 text-right font-semibold text-gray-500 dark:text-gray-400">Lucro Bruto</th>
                                  <th className="pb-2 text-right font-semibold text-gray-500 dark:text-gray-400">Margem</th>
                                  {subsidyEnabled && <th className="pb-2 text-right font-semibold text-gray-500 dark:text-gray-400">Budget Subsídio</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {productRows.map(({ product, qty, salePrice, costPrice, grossProfit, marginPct, subsidyBudget }) => (
                                  <tr key={product.id}>
                                    <td className="py-2 pr-3 text-gray-900 dark:text-white font-medium">
                                      <span className="truncate block max-w-[140px]">{product.name}</span>
                                      {qty > 1 && <span className="text-[10px] text-gray-400">×{qty}</span>}
                                    </td>
                                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">{formatMoney(salePrice)}</td>
                                    <td className="py-2 text-right text-gray-500 dark:text-gray-400">{costPrice != null ? formatMoney(costPrice) : <span className="text-amber-500 text-[10px]">sem custo</span>}</td>
                                    <td className={`py-2 text-right font-semibold ${grossProfit == null ? 'text-gray-300' : grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                      {grossProfit != null ? formatMoney(grossProfit) : '—'}
                                    </td>
                                    <td className={`py-2 text-right font-bold ${marginPct == null ? 'text-gray-300' : marginPct >= (minThreshold || 0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                                      {marginPct != null ? `${marginPct.toFixed(1)}%` : '—'}
                                    </td>
                                    {subsidyEnabled && (
                                      <td className="py-2 text-right font-semibold text-violet-600 dark:text-violet-400">
                                        {subsidyBudget > 0 ? formatMoney(subsidyBudget) : <span className="text-gray-300 font-normal">—</span>}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              {productRows.length > 1 && (
                                <tfoot>
                                  <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                                    <td className="pt-2 text-xs font-bold text-gray-700 dark:text-gray-200">Total</td>
                                    <td className="pt-2 text-right font-bold text-gray-900 dark:text-white">{formatMoney(totalRevenue)}</td>
                                    <td className="pt-2 text-right font-bold text-gray-500">{totalCost != null ? formatMoney(totalCost) : '—'}</td>
                                    <td className={`pt-2 text-right font-bold ${totalGrossProfit == null ? 'text-gray-300' : totalGrossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                      {totalGrossProfit != null ? formatMoney(totalGrossProfit) : '—'}
                                    </td>
                                    <td className={`pt-2 text-right font-bold ${totalMarginPct == null ? 'text-gray-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {totalMarginPct != null ? `${totalMarginPct.toFixed(1)}%` : '—'}
                                    </td>
                                    {subsidyEnabled && (
                                      <td className="pt-2 text-right font-bold text-violet-600 dark:text-violet-400">{formatMoney(totalSubsidyBudget)}</td>
                                    )}
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        )}

                        {/* Decomposição do frete vs. lucro */}
                        {totalGrossProfit != null && finalShippingCost != null && (
                          <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden text-xs">
                            <div className="grid divide-y divide-gray-50 dark:divide-gray-700/60">

                              <div className="flex justify-between gap-4 px-4 py-2.5">
                                <span className="text-gray-500">Lucro bruto do pedido</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(totalGrossProfit)}</span>
                              </div>

                              {subsidyEnabled && totalSubsidyBudget > 0 && (
                                <>
                                  <div className="flex justify-between gap-4 px-4 py-2.5 bg-violet-50/50 dark:bg-violet-950/10">
                                    <span className="text-violet-700 dark:text-violet-300">Budget de subsídio calculado</span>
                                    <span className="font-semibold text-violet-700 dark:text-violet-300">−{formatMoney(totalSubsidyBudget)}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 px-4 py-2.5">
                                    <span className="text-gray-500">Subsídio efetivamente usado no frete</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{actualSubsidyUsed > 0 ? `−${formatMoney(actualSubsidyUsed)}` : '—'}</span>
                                  </div>
                                  {leftoverSubsidy > 0.005 && (
                                    <div className="flex justify-between gap-4 px-4 py-2.5 bg-emerald-50/60 dark:bg-emerald-950/10">
                                      <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Sobra do subsídio (volta como lucro)
                                      </span>
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatMoney(leftoverSubsidy)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-4 px-4 py-2.5">
                                    <span className="text-gray-500">Margem protegida ({minThreshold}% sobre receita)</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{formatMoney((minThreshold / 100) * totalRevenue)}</span>
                                  </div>
                                </>
                              )}

                              <div className="flex justify-between gap-4 px-4 py-2.5">
                                <span className="text-gray-500">Custo do frete para a loja</span>
                                <span className="font-semibold text-red-500">
                                  {cheapestOption?.isFreeShipping ? 'Grátis' : `−${formatMoney(finalShippingCost - actualSubsidyUsed)}`}
                                </span>
                              </div>

                              <div className="flex justify-between gap-4 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                  Lucro líquido final
                                  {cheapestOption && <span className="ml-1.5 text-[10px] font-normal text-gray-400">({cheapestOption.name})</span>}
                                </span>
                                <span className={`text-base font-black ${netProfit != null && netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                  {netProfit != null ? formatMoney(netProfit) : '—'}
                                </span>
                              </div>

                              {netProfit != null && totalRevenue > 0 && (
                                <div className="flex justify-between gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
                                  <span className="text-gray-400 text-[11px]">Margem líquida final sobre receita</span>
                                  <span className={`text-[11px] font-bold ${(netProfit / totalRevenue) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                    {((netProfit / totalRevenue) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {noCostData && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                            ⚠ Cadastre o <strong>preço de custo</strong> dos produtos para visualizar a análise completa de margem e lucro líquido.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Pacote */}
                {packageData && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <Package className="h-3.5 w-3.5" /> Pacote
                      {testCustomPackage && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] normal-case font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Personalizado</span>}
                    </h3>
                    <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div><dt className="text-gray-400">Peso</dt><dd className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{packageData.weightGrams >= 1000 ? `${(packageData.weightGrams / 1000).toFixed(2)} kg` : `${packageData.weightGrams} g`}</dd></div>
                      <div><dt className="text-gray-400">C×L×A</dt><dd className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{packageData.lengthCm}×{packageData.widthCm}×{packageData.heightCm} cm</dd></div>
                      <div><dt className="text-gray-400">Valor declarado</dt><dd className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{formatMoney(packageData.declaredValue)}</dd></div>
                      <div><dt className="text-gray-400">Origem → Destino</dt><dd className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{packageData.originCep || '—'} → {packageData.destinationCep}</dd></div>
                    </dl>
                    {packageData.notes.length > 0 && (
                      <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">{packageData.notes[0]}</p>
                    )}
                  </div>
                )}

                {/* Opções elegíveis */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Opções de Envio</h3>

                  {options.length > 0 ? (
                    <div className="space-y-2">
                      {options.map((option, index) => {
                        const pricing = option.pricing
                        const wasAdjusted = Boolean(pricing && Math.abs(pricing.quotedFee - pricing.finalFee) >= 0.01)
                        return (
                          <details
                            key={`${option.method}-${index}`}
                            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 transition-all open:border-blue-300 dark:open:border-blue-700"
                            open={index === 0}
                          >
                            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                              <Truck className="h-5 w-5 shrink-0 text-blue-500" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-gray-900 dark:text-white">{option.name}</span>
                                  {option.isFreeShipping && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-950 dark:text-green-300">Grátis</span>}
                                </div>
                                <p className="mt-0.5 text-xs text-gray-400">{option.deliveryTime != null ? `${option.deliveryTime} ${option.deliveryTimeType === 'calendar' ? 'dias corridos' : 'dias úteis'}` : 'Prazo não informado'}{option.estimatedDate && ` · ${new Date(option.estimatedDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}</p>
                              </div>
                              <div className="text-right">
                                {wasAdjusted && <p className="text-xs text-gray-400 line-through">{formatMoney(pricing?.quotedFee)}</p>}
                                <p className={`text-lg font-black ${option.isFreeShipping ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                  {option.isFreeShipping ? 'Grátis' : formatMoney(option.shippingFee)}
                                </p>
                              </div>
                              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                            </summary>

                            {pricing && (
                              <div className="border-t border-gray-100 bg-gray-50/40 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                                <dl className="overflow-hidden rounded-xl border border-gray-200 bg-white text-xs dark:border-gray-700 dark:bg-gray-900">
                                  {option.externalShipping && pricing.referenceBaseFee != null && (
                                    <div className="flex justify-between gap-4 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                                      <dt className="flex items-center gap-1.5 text-gray-500"><Truck className="h-3 w-3" />Base do provedor</dt>
                                      <dd className="font-semibold text-gray-800 dark:text-gray-200">{formatMoney(pricing.referenceBaseFee)}</dd>
                                    </div>
                                  )}
                                  {option.externalShipping && !!pricing.cartValueImpact && (
                                    <div className="flex justify-between gap-4 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                                      <dt className="flex items-center gap-1.5 text-gray-500"><ShieldCheck className="h-3 w-3" />Seguro / valor declarado</dt>
                                      <dd className={`font-semibold ${pricing.cartValueImpact > 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatSignedMoney(pricing.cartValueImpact)}</dd>
                                    </div>
                                  )}
                                  {option.externalShipping && !!pricing.packageImpact && (
                                    <div className="flex justify-between gap-4 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                                      <dt className="flex items-center gap-1.5 text-gray-500"><Scale className="h-3 w-3" />Impacto peso/dimensões</dt>
                                      <dd className={`font-semibold ${pricing.packageImpact > 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatSignedMoney(pricing.packageImpact)}</dd>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-4 border-b border-gray-100 bg-gray-50/60 px-4 py-2 dark:bg-gray-800/40 dark:border-gray-800">
                                    <dt className="font-semibold text-gray-600 dark:text-gray-300">Valor cotado bruto</dt>
                                    <dd className="font-bold text-gray-900 dark:text-white">{formatMoney(pricing.quotedFee)}</dd>
                                  </div>
                                  {pricing.adjustments.map((adj, i) => (
                                    <div key={i} className="border-b border-gray-100 px-4 py-2 last:border-b-0 dark:border-gray-800">
                                      <div className="flex justify-between gap-4">
                                        <dt className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Tag className="h-3 w-3 text-green-500" />{adj.label}</dt>
                                        <dd className="font-bold text-green-600 dark:text-green-400">{formatSignedMoney(adj.amount)}</dd>
                                      </div>
                                      {adj.source && <p className="mt-0.5 pl-4 text-[10px] text-gray-400">{adj.source}</p>}
                                    </div>
                                  ))}
                                  {pricing.adjustments.length === 0 && (
                                    <div className="border-b border-gray-100 px-4 py-2 text-[11px] italic text-gray-400 dark:border-gray-800">Sem descontos ou subsídios aplicados.</div>
                                  )}
                                  <div className="flex justify-between gap-4 bg-emerald-50/80 px-4 py-3 dark:bg-emerald-950/40">
                                    <dt className="font-black text-emerald-900 dark:text-emerald-200">Valor Final</dt>
                                    <dd className="text-base font-black text-emerald-700 dark:text-emerald-300">{option.isFreeShipping ? 'Grátis' : formatMoney(pricing.finalFee)}</dd>
                                  </div>
                                </dl>
                              </div>
                            )}
                          </details>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-bold text-amber-800 dark:text-amber-200">Nenhuma opção elegível</p>
                          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">Veja abaixo os motivos de cada método não ter atendido este CEP.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

              </div>
            })()}
          </div>}

          {/* Tabela de Regiões Locais Cadastradas */}
          {activeSection === 'regions' && <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Regiões de Entrega por Tabela</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Cadastre municípios e faixas de CEP atendidos com taxa local</p>
              </div>
              <button
                onClick={() => {
                  setRegionModalOpen(true)
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


            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Buscar município ou CEP</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input type="search" value={regionSearch} onChange={event => { setRegionSearch(event.target.value); setRegionPage(1) }} placeholder="Buscar município ou CEP..." className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
              </label>
              <label><span className="sr-only">Filtrar por status</span>
                <select value={regionStatus} onChange={event => { setRegionStatus(event.target.value as typeof regionStatus); setRegionPage(1) }} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-44 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                  <option value="all">Todos os status</option><option value="active">Somente ativas</option><option value="inactive">Somente inativas</option>
                </select>
              </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
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
                  {paginatedRegions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma região de entrega por tabela cadastrada.
                      </td>
                    </tr>
                  ) : (
                    paginatedRegions.map((region) => (
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

            {filteredRegions.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-gray-500 dark:text-gray-400">Exibindo {(safeRegionPage - 1) * REGIONS_PER_PAGE + 1} a {Math.min(safeRegionPage * REGIONS_PER_PAGE, filteredRegions.length)} de {filteredRegions.length}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setRegionPage(page => Math.max(1, page - 1))} disabled={safeRegionPage === 1} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"><ChevronLeft className="h-4 w-4" />Anterior</button>
                  <span className="min-w-16 text-center text-xs font-semibold text-gray-500">{safeRegionPage} de {regionPageCount}</span>
                  <button type="button" onClick={() => setRegionPage(page => Math.min(regionPageCount, page + 1))} disabled={safeRegionPage === regionPageCount} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200">Próxima<ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>}
        </main>

        {/* Modal de Adicionar/Editar Região */}
        {regionModalOpen && (
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
