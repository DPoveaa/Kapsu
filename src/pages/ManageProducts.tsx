import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Plus, Edit, Trash2, Loader2, Search, Upload,
  Archive, ArchiveRestore, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronRight, X, BarChart2, ShoppingCart, Tag,
  Sparkles, Check, AlertCircle, Save, Download, FileText, FileSpreadsheet,
  Filter, SlidersHorizontal, Image as ImageIcon, Clock
} from 'lucide-react'
import { getProductPricing } from '../utils/productPricing'
import { productsService } from '../services/products.service'
import { uploadService } from '../services/upload.service'
import { adminService, Supplier } from '../services/admin.service'
import { siteSettingsService } from '../services/site-settings.service'
import { Product, ProductPriceHistory, ProductTargetAudience } from '../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import * as XLSX from 'xlsx'
import { confirm, toast } from '../utils/toast'
import {
  calcPriceFromMarkup,
  findMarkupForTargetPrice,
  formatMarkupDisplay,
  formatMarkupInput,
  formatPriceInput,
  parseDecimalInput,
  roundCurrency,
} from '../utils/pricing'
import AdminModal from '../components/AdminModal'
import MultiImageUpload from '../components/MultiImageUpload'
import { normalizeImagePath } from '../utils/imageUrl'
import { generateProductUrl } from '../utils/productUrl'
import ProductPdfExportModal from '../components/ProductPdfExportModal'
import { ProductPdfReportOptions } from '../types/productPdfReport'
import ProductExcelExportModal from '../components/ProductExcelExportModal'
import ProductImportModal from '../components/ProductImportModal'
import ProductBulkEditModal from '../components/ProductBulkEditModal'
import ProductFilterModal, {
  ProductFiltersState,
  INITIAL_FILTERS_STATE,
  countActiveFilters,
} from '../components/ProductFilterModal'

type Tab = 'active' | 'inactive' | 'archived'
type ProductsSortKey = 'name' | 'sku' | 'category' | 'marketplaces' | 'purchase_price' | 'margin' | 'price' | 'status'
type SortDirection = 'asc' | 'desc'

// ─── Column fields for import mapping ──────────────────────────────────────
const IMPORT_FIELDS = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'sku', label: 'SKU / Código', required: false },
  { key: 'price', label: 'Preço de Venda', required: false },
  { key: 'purchase_price', label: 'Preço de Compra', required: false },
  { key: 'promo_price', label: 'Preço Promocional', required: false },
  { key: 'status', label: 'Status (Ativo / Inativo / Arquivado)', required: false },
  { key: 'marketplace_tags', label: 'Marketplaces / Canais', required: false },
  { key: 'description', label: 'Descrição', required: false },
  { key: 'category', label: 'Categoria', required: false },
  { key: 'indication', label: 'Indicação', required: false },
  { key: 'contraindication', label: 'Contraindicação', required: false },
  { key: 'compositions', label: 'Formulação / Composição', required: false },
  { key: 'benefits', label: 'Benefícios', required: false },
  { key: 'intended_form', label: 'Forma Pretendida', required: false },
  { key: 'intended_presentation', label: 'Apresentação Pretendida', required: false },
  { key: 'intended_units_per_dose', label: 'Unidades por Dose Pretendida', required: false },
] as const

type FieldKey = typeof IMPORT_FIELDS[number]['key']

function autoDetect(headers: string[]): Record<FieldKey, string> {
  const m: Record<FieldKey, string> = {
    name: '', sku: '', price: '', purchase_price: '', promo_price: '', status: '', marketplace_tags: '', description: '', category: '',
    indication: '', contraindication: '', compositions: '', benefits: '',
    intended_form: '', intended_presentation: '', intended_units_per_dose: '',
  }
  for (const h of headers) {
    const low = h.toLowerCase().trim()
    if (!m.name && (low.includes('nome') || low.includes('name') || low.includes('produto') || low.includes('product') || low === 'item' || low === 'titulo' || low === 'title')) m.name = h
    else if (!m.sku && (low === 'sku' || low.includes('código') || low.includes('codigo') || low.includes('cod'))) m.sku = h
    else if (!m.promo_price && (low.includes('promo') || low.includes('promoc'))) m.promo_price = h
    else if (!m.purchase_price && (low.includes('distribui') || low.includes('compra') || low.includes('custo') || low.includes('cost'))) m.purchase_price = h
    else if (!m.price && (low.includes('venda') || low === 'preço' || low === 'preco' || low === 'price')) m.price = h
    else if (!m.status && (low === 'ativo' || low === 'ativa' || low === 'inativo' || low === 'inativa' || low === 'status' || low.includes('situacao') || low.includes('situação') || low.includes('estado'))) m.status = h
    else if (!m.marketplace_tags && (low.includes('marketplace') || low.includes('canal') || low.includes('shopee') || low.includes('mercado livre'))) m.marketplace_tags = h
    else if (!m.description && (low.includes('desc') || low.includes('about') || low.includes('detalhe'))) m.description = h
    else if (!m.category && (low.includes('cat') || low.includes('grupo'))) m.category = h
    else if (!m.indication && (low.includes('indica') || low.includes('indicação') || low.includes('indicacao'))) m.indication = h
    else if (!m.contraindication && (low.includes('contra') || low.includes('contraindicação') || low.includes('contraindicacao'))) m.contraindication = h
    else if (!m.compositions && (low.includes('composição') || low.includes('composicao') || low.includes('formula') || low.includes('fórmula') || low.includes('formulação') || low.includes('formulacao'))) m.compositions = h
    else if (!m.benefits && (low.includes('benef') || low.includes('vantagem') || low === 'beneficios')) m.benefits = h
    else if (!m.intended_form && (low.includes('forma pretendida') || low.includes('forma_pretendida') || low === 'forma')) m.intended_form = h
    else if (!m.intended_presentation && (low.includes('apresentação pretendida') || low.includes('apresentacao pretendida') || low.includes('apresentacao_pretendida') || low.includes('apresentação') || low.includes('apresentacao'))) m.intended_presentation = h
    else if (!m.intended_units_per_dose && (low.includes('unidade') || low.includes('dose') || low.includes('unid') || low.includes('dose pretendida'))) m.intended_units_per_dose = h
  }
  return m
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function cleanStringForSimilarity(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function getStringSimilarity(str1: string, str2: string): number {
  const s1 = cleanStringForSimilarity(str1)
  const s2 = cleanStringForSimilarity(str2)
  if (!s1 || !s2) return 0
  if (s1 === s2) return 1

  const distance = getLevenshteinDistance(s1, s2)
  const maxLen = Math.max(s1.length, s2.length)
  return 1 - distance / maxLen
}

// ─── Price history type labels ──────────────────────────────────────────────
const HISTORY_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sale: { label: 'Venda', color: 'text-blue-600 dark:text-blue-400', icon: <Tag size={13} /> },
  purchase: { label: 'Compra', color: 'text-purple-600 dark:text-purple-400', icon: <ShoppingCart size={13} /> },
  promo: { label: 'Promo', color: 'text-orange-600 dark:text-orange-400', icon: <Sparkles size={13} /> },
}

function fmt(v: number | null) {
  if (v == null) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function cleanPrice(v: any): number | null {
  if (v === undefined || v === null || String(v).trim() === '') return null
  const cleanStr = String(v).replace(/r\$/i, '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleanStr)
  return isNaN(n) ? null : n
}


function HistoryRow({ h }: { h: ProductPriceHistory }) {
  const meta = HISTORY_TYPE_LABELS[h.type] ?? HISTORY_TYPE_LABELS.sale
  const diff = h.old_price != null ? h.new_price - h.old_price : null
  const went = diff == null ? null : diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const diffPct = (h.old_price && diff) ? (diff / Number(h.old_price)) * 100 : null

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      {/* type badge */}
      <span className={`flex items-center gap-1 text-xs font-medium ${meta.color} min-w-[60px]`}>
        {meta.icon}{meta.label}
      </span>

      {/* old → new */}
      <div className="flex items-center gap-2 flex-1">
        {h.old_price != null && (
          <>
            <span className="text-gray-400 dark:text-gray-500 line-through text-xs">{fmt(h.old_price)}</span>
            <span className="text-gray-400">→</span>
          </>
        )}
        <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(h.new_price)}</span>
      </div>

      {/* variation */}
      {went === 'up' && <span className="flex items-center gap-0.5 text-red-500   text-xs font-medium"><TrendingUp size={13} />+{fmt(diff!)} {diffPct != null && `(+${diffPct.toFixed(1).replace('.', ',')}%)`}</span>}
      {went === 'down' && <span className="flex items-center gap-0.5 text-green-500 text-xs font-medium"><TrendingDown size={13} />{fmt(diff!)} {diffPct != null && `(${diffPct.toFixed(1).replace('.', ',')}%)`}</span>}
      {went === 'same' && <span className="flex items-center gap-0.5 text-gray-400   text-xs"><Minus size={13} /></span>}

      {/* note */}
      {h.note && <span className="text-xs text-gray-400 italic hidden sm:block max-w-[120px] truncate">{h.note}</span>}

      {/* date */}
      <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
        {new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        {' '}
        {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

interface SimilarMatch {
  importedName: string
  importedRow: any
  existingProduct: Product
  resolution: 'update' | 'create' | 'skip'
}

interface DuplicationGroup {
  primaryProduct: Product
  similarProducts: Product[]
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ManageProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false)
  const [isExcelExportModalOpen, setIsExcelExportModalOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<ProductFiltersState>(INITIAL_FILTERS_STATE)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [productsSort, setProductsSort] = useState<{ key: ProductsSortKey; direction: SortDirection }>({
    key: 'name',
    direction: 'asc',
  })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    adminService.listSuppliers(1, 100, '', 'true')
      .then(response => setSuppliers(response.suppliers || []))
      .catch(error => console.error('Erro ao carregar fornecedores:', error))
  }, [])

  // ── Import modal state ────────────────────────────────────────────────────
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importRows, setImportRows] = useState<any[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<FieldKey, string>>({
    name: '', sku: '', price: '', purchase_price: '', promo_price: '', status: '', marketplace_tags: '', description: '', category: '',
    indication: '', contraindication: '', compositions: '', benefits: '',
    intended_form: '', intended_presentation: '', intended_units_per_dose: '',
  })
  const [autoDetected, setAutoDetected] = useState<Record<FieldKey, boolean>>({
    name: false, sku: false, price: false, purchase_price: false, promo_price: false, status: false, marketplace_tags: false, description: false, category: false,
    indication: false, contraindication: false, compositions: false, benefits: false,
    intended_form: false, intended_presentation: false, intended_units_per_dose: false,
  })
  // Campos desabilitados manualmente para esta importação (só campos opcionais)
  const [importSkipFields, setImportSkipFields] = useState<Set<FieldKey>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Similarity / Duplicates state ─────────────────────────────────────────
  const [similarityMatches, setSimilarityMatches] = useState<SimilarMatch[]>([])
  const [isSimilarityModalOpen, setIsSimilarityModalOpen] = useState(false)
  const [tempResolutions, setTempResolutions] = useState<Record<string, { action: 'update' | 'create' | 'skip'; existingId?: string }>>({})

  const [dbDuplicates, setDbDuplicates] = useState<DuplicationGroup[]>([])
  const [isDbDuplicatesOpen, setIsDbDuplicatesOpen] = useState(false)
  const [productsOrdersCount, setProductsOrdersCount] = useState<Record<string, number>>({})
  const [loadingOrdersCount, setLoadingOrdersCount] = useState(false)

  // ── Reactivate modal state ────────────────────────────────────────────────
  const [reactivateCandidates, setReactivateCandidates] = useState<{
    product: Product;
    selected: boolean;
    newPrice: number | null;
    newPurchasePrice: number | null;
  }[]>([])
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false)

  // ── Product modal form state ──────────────────────────────────────────────
  const { id: urlProductId } = useParams()
  const location = useLocation()

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productFormLoading, setProductFormLoading] = useState(false)
  const [loadingProductDetails, setLoadingProductDetails] = useState(false)
  const [productFormError, setProductFormError] = useState<string | null>(null)
  const [productImageError, setProductImageError] = useState<string | null>(null)
  const [labelFile, setLabelFile] = useState<File | null>(null)
  const [labelSaving, setLabelSaving] = useState(false)
  const originalProductImageRef = useRef('')

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const initialProductFormState = {
    name: '',
    description: '',
    price: '',
    promo_price: '',
    promo_ends_at: '',
    purchase_price: '',
    markup: '',
    image: '',
    images: [] as string[],
    category: 'Outros',
    active: true,
    compositions: '',
    indication: '',
    contraindication: '',
    benefits: '',
    target_audience: 'unknown',
    free_shipping: false,
    sku: '',
    quantity: '',
    intended_form: '',
    intended_presentation: '',
    intended_units_per_dose: '',
    marketplace_tags: 'site,mercado_livre,shopee',
    fiscal_description: '',
    ncm: '',
    cest: '',
    origin: 0,
    csosn: '102',
    csosn_st: '',
    cfop_intra: '5102',
    cfop_inter: '6108',
    cfop_intra_st: '',
    cfop_inter_st: '',
    pis_cst: '49',
    cofins_cst: '49',
    unit: 'UN',
    tax_unit: '',
    tax_conversion_factor: 1,
    gtin: '',
    tax_gtin: '',
    cbenef: '',
    fiscal_validated: 'NAO',
    fiscal_notes: '',
    nfe_enabled: 'NAO',
  }
  const [productFormData, setProductFormData] = useState(initialProductFormState)
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'images' | 'pricing' | 'details' | 'technical' | 'fiscal'>('basic')
  const priceEditSourceRef = useRef<'price' | 'markup' | 'purchase_price'>('price')
  const [newCatInput, setNewCatInput] = useState('')
  const [localAddedCategories, setLocalAddedCategories] = useState<string[]>([])

  const existingCategories = useMemo(() => {
    const catsSet = new Set<string>(['Vitamina', 'Mineral', 'Fitoterápico', 'Outros'])
    for (const p of products) {
      if (p.category) {
        p.category.split(',').forEach(c => {
          const trimmed = c.trim()
          if (trimmed) {
            catsSet.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase())
          }
        })
      }
    }
    return Array.from(catsSet).sort((a, b) => a.localeCompare(b))
  }, [products])

  const categoriesToDisplay = useMemo(() => {
    const set = new Set([...existingCategories, ...localAddedCategories])
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [existingCategories, localAddedCategories])

  const handleAddNewCat = () => {
    const trimmed = newCatInput.trim()
    if (!trimmed) return
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()

    if (!localAddedCategories.includes(formatted) && !existingCategories.includes(formatted)) {
      setLocalAddedCategories(prev => [...prev, formatted])
    }

    const currentCats = productFormData.category.split(',').map(s => s.trim()).filter(Boolean)
    if (!currentCats.includes(formatted)) {
      const updatedCats = [...currentCats, formatted]
      setProductFormData(prev => ({ ...prev, category: updatedCats.join(', ') }))
    }
    setNewCatInput('')
  }

  const handleProductFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setProductFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleProductPriceFieldChange = (name: string, value: string) => {
    setProductFormData(prev => {
      const updated = { ...prev, [name]: value }
      const cost = roundCurrency(Number(name === 'purchase_price' ? value : prev.purchase_price))

      if (name === 'purchase_price') {
        const previousDriver = priceEditSourceRef.current
        priceEditSourceRef.current = 'purchase_price'
        const costNum = parseDecimalInput(value)

        if (costNum != null && costNum > 0) {
          const markupNum = parseDecimalInput(prev.markup)
          const priceNum = parseDecimalInput(prev.price)

          if (previousDriver === 'markup' && markupNum != null) {
            updated.price = formatPriceInput(calcPriceFromMarkup(costNum, markupNum))
          } else if (priceNum != null && priceNum > 0) {
            updated.markup = formatMarkupInput(findMarkupForTargetPrice(costNum, priceNum))
          } else if (markupNum != null) {
            updated.price = formatPriceInput(calcPriceFromMarkup(costNum, markupNum))
          }
        } else {
          updated.markup = ''
        }
      } else if (name === 'markup') {
        priceEditSourceRef.current = 'markup'
        const markupNum = parseDecimalInput(value)

        if (cost > 0 && markupNum != null && value.trim() !== '') {
          updated.price = formatPriceInput(calcPriceFromMarkup(cost, markupNum))
        }
      } else if (name === 'price') {
        priceEditSourceRef.current = 'price'
        const priceNum = parseDecimalInput(value)

        if (cost > 0 && priceNum != null && priceNum > 0) {
          updated.markup = formatMarkupInput(findMarkupForTargetPrice(cost, priceNum))
        }
      }

      return updated
    })
  }

  const productMarginInfo = useMemo(() => {
    const cost = parseDecimalInput(productFormData.purchase_price)
    const sale = parseDecimalInput(productFormData.price)
    if (cost != null && sale != null && cost > 0 && sale > 0) {
      const profit = roundCurrency(sale - cost)
      const margin = (profit / sale) * 100
      return {
        margin: margin.toFixed(1).replace('.', ','),
        profit: profit.toFixed(2).replace('.', ','),
        isPositive: profit >= 0
      }
    }
    return null
  }, [productFormData.purchase_price, productFormData.price])

  const loadProductForEditing = useCallback(async (productId: string) => {
    try {
      setLoadingProductDetails(true)
      setProductFormError(null)
      const productRaw = await (productsService as any).getByIdForAdminRaw(productId)
      const product = await productsService.getByIdForAdmin(productId)
      priceEditSourceRef.current = 'price'
      setEditingProduct(product)
      originalProductImageRef.current = productRaw.image || ''
      setLabelFile(null)

      const cost = productRaw.purchase_price != null ? roundCurrency(Number(productRaw.purchase_price)) : null
      const salePrice = roundCurrency(product.price)
      const storedMarkup = productRaw.markup != null ? Number(productRaw.markup) : null
      const compatibleMarkup = cost && cost > 0
        ? findMarkupForTargetPrice(cost, salePrice)
        : storedMarkup

      const productImages = product.images && product.images.length > 0
        ? product.images.map(img => normalizeImagePath(img))
        : (productRaw.image ? [normalizeImagePath(productRaw.image)] : [])

      setProductFormData({
        name: product.name,
        description: product.description || '',
        price: formatPriceInput(salePrice),
        promo_price: productRaw.promo_price ? formatPriceInput(Number(productRaw.promo_price)) : '',
        promo_ends_at: productRaw.promo_ends_at ? new Date(productRaw.promo_ends_at).toISOString().slice(0, 16) : '',
        purchase_price: cost ? formatPriceInput(cost) : '',
        markup: compatibleMarkup != null ? formatMarkupInput(compatibleMarkup) : '',
        image: productImages[0] || (productRaw.image || ''),
        images: productImages,
        category: product.category || 'Outros',
        active: productRaw.active ?? true,
        compositions: productRaw.compositions || '',
        indication: productRaw.indication || '',
        contraindication: productRaw.contraindication || '',
        benefits: productRaw.benefits || '',
        target_audience: productRaw.target_audience || (product as any).targetAudience || 'unknown',
        free_shipping: productRaw.free_shipping ?? false,
        sku: productRaw.sku || '',
        quantity: productRaw.quantity || '',
        intended_form: productRaw.intended_form || '',
        intended_presentation: productRaw.intended_presentation || '',
        intended_units_per_dose: productRaw.intended_units_per_dose || '',
        marketplace_tags: productRaw.marketplace_tags || 'site,mercado_livre,shopee',
        fiscal_description: productRaw.fiscal_description || '',
        ncm: productRaw.ncm || '',
        cest: productRaw.cest || '',
        origin: productRaw.origin ?? 0,
        csosn: productRaw.csosn || '102',
        csosn_st: productRaw.csosn_st || '',
        cfop_intra: productRaw.cfop_intra || '5102',
        cfop_inter: productRaw.cfop_inter || '6108',
        cfop_intra_st: productRaw.cfop_intra_st || '',
        cfop_inter_st: productRaw.cfop_inter_st || '',
        pis_cst: productRaw.pis_cst || '49',
        cofins_cst: productRaw.cofins_cst || '49',
        unit: productRaw.unit || 'UN',
        tax_unit: productRaw.tax_unit || '',
        tax_conversion_factor: productRaw.tax_conversion_factor ?? 1,
        gtin: productRaw.gtin || '',
        tax_gtin: productRaw.tax_gtin || '',
        cbenef: productRaw.cbenef || '',
        fiscal_validated: productRaw.fiscal_validated || 'NAO',
        fiscal_notes: productRaw.fiscal_notes || '',
        nfe_enabled: productRaw.nfe_enabled || 'NAO',
      })
      setLocalAddedCategories([])
      setIsProductModalOpen(true)
    } catch (err: any) {
      console.error('Erro ao carregar produto para edição:', err)
      toast.error('Erro ao carregar produto para edição')
      navigate('/admin/products')
    } finally {
      setLoadingProductDetails(false)
    }
  }, [navigate])

  const openCreateProductModal = () => {
    priceEditSourceRef.current = 'price'
    setEditingProduct(null)
    originalProductImageRef.current = ''
    setLabelFile(null)
    setProductFormData(initialProductFormState)
    setLocalAddedCategories([])
    setProductFormError(null)
    setProductImageError(null)
    setIsProductModalOpen(true)
  }

  const getUploadFilename = (value: string) => {
    try {
      const pathname = value.startsWith('http') ? new URL(value).pathname : value
      return decodeURIComponent(pathname.split(/[?#]/)[0].split('/').pop() || '')
    } catch {
      return ''
    }
  }

  const deletePendingProductImage = async (value: string) => {
    if (!value || !value.includes('/uploads/products/')) return
    const filename = getUploadFilename(value)
    if (!filename) return
    try { await uploadService.deleteProductImage(filename) } catch { /* arquivo em uso ou já removido */ }
  }

  const closeProductModal = () => {
    const pendingImage = productFormData.image
    if (pendingImage && pendingImage !== originalProductImageRef.current) {
      void deletePendingProductImage(pendingImage)
    }
    setLabelFile(null)
    setIsProductModalOpen(false)
    setEditingProduct(null)
    navigate('/admin/products')
  }

  useEffect(() => {
    if (location.pathname === '/admin/products/create') {
      if (!isProductModalOpen || editingProduct !== null) {
        openCreateProductModal()
      }
    } else if (urlProductId) {
      if (!isProductModalOpen || editingProduct?.id !== urlProductId) {
        loadProductForEditing(urlProductId)
      }
    } else if (location.pathname === '/admin/products') {
      if (isProductModalOpen) {
        setIsProductModalOpen(false)
        setEditingProduct(null)
      }
    }
  }, [location.pathname, urlProductId, isProductModalOpen, editingProduct])

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProductFormError(null)

    // Validação
    if (!productFormData.name.trim()) {
      setProductFormError('O nome do produto é obrigatório')
      return
    }

    if (!productFormData.price || isNaN(Number(productFormData.price)) || Number(productFormData.price) <= 0) {
      setProductFormError('O preço de venda deve ser um número positivo')
      return
    }

    if (productFormData.purchase_price && (isNaN(Number(productFormData.purchase_price)) || Number(productFormData.purchase_price) <= 0)) {
      setProductFormError('O preço de compra deve ser um número positivo')
      return
    }

    if (productFormData.promo_price && (isNaN(Number(productFormData.promo_price)) || Number(productFormData.promo_price) <= 0)) {
      setProductFormError('O preço promocional deve ser um número positivo')
      return
    }

    try {
      setProductFormLoading(true)

      const cost = productFormData.purchase_price
        ? roundCurrency(Number(productFormData.purchase_price))
        : null
      const saleInput = roundCurrency(Number(productFormData.price))

      let finalPrice = saleInput
      let finalMarkup: number | null = null

      if (cost && cost > 0) {
        if (priceEditSourceRef.current === 'markup' && productFormData.markup) {
          const markupNum = parseDecimalInput(productFormData.markup)
          if (markupNum != null) {
            finalMarkup = markupNum
            finalPrice = calcPriceFromMarkup(cost, markupNum)
          }
        } else {
          finalPrice = saleInput
          finalMarkup = findMarkupForTargetPrice(cost, saleInput)
        }
      } else if (productFormData.markup) {
        const markupNum = parseDecimalInput(productFormData.markup)
        finalMarkup = markupNum
      }

      const payload = {
        name: productFormData.name.trim(),
        description: productFormData.description.trim() || undefined,
        price: finalPrice,
        promo_price: productFormData.promo_price ? roundCurrency(Number(productFormData.promo_price)) : null,
        promo_ends_at: productFormData.promo_ends_at ? new Date(productFormData.promo_ends_at).toISOString() : null,
        purchase_price: cost,
        markup: finalMarkup,
        image: (productFormData.images && productFormData.images[0]) ? normalizeImagePath(productFormData.images[0]) : (productFormData.image.trim() ? normalizeImagePath(productFormData.image) : null),
        images: productFormData.images.map(img => normalizeImagePath(img)),
        category: productFormData.category || undefined,
        active: productFormData.active,
        compositions: productFormData.compositions.trim() || undefined,
        indication: productFormData.indication.trim() || undefined,
        contraindication: productFormData.contraindication.trim() || undefined,
        benefits: productFormData.benefits.trim() || undefined,
        target_audience: productFormData.target_audience as ProductTargetAudience,
        free_shipping: productFormData.free_shipping,
        sku: productFormData.sku.trim() || undefined,
        quantity: productFormData.quantity.trim() || undefined,
        intended_form: productFormData.intended_form.trim() || undefined,
        intended_presentation: productFormData.intended_presentation.trim() || undefined,
        intended_units_per_dose: productFormData.intended_units_per_dose.trim() || undefined,
        marketplace_tags: productFormData.marketplace_tags || 'site,mercado_livre,shopee',
        fiscal_description: productFormData.fiscal_description?.trim() || undefined,
        ncm: productFormData.ncm?.trim() || undefined,
        cest: productFormData.cest?.trim() || undefined,
        origin: productFormData.origin != null && String(productFormData.origin) !== '' ? Number(productFormData.origin) : 0,
        csosn: productFormData.csosn?.trim() || undefined,
        csosn_st: productFormData.csosn_st?.trim() || undefined,
        cfop_intra: productFormData.cfop_intra?.trim() || undefined,
        cfop_inter: productFormData.cfop_inter?.trim() || undefined,
        cfop_intra_st: productFormData.cfop_intra_st?.trim() || undefined,
        cfop_inter_st: productFormData.cfop_inter_st?.trim() || undefined,
        pis_cst: productFormData.pis_cst?.trim() || undefined,
        cofins_cst: productFormData.cofins_cst?.trim() || undefined,
        unit: productFormData.unit?.trim() || undefined,
        tax_unit: productFormData.tax_unit?.trim() || undefined,
        tax_conversion_factor: productFormData.tax_conversion_factor ? Number(productFormData.tax_conversion_factor) : 1,
        gtin: productFormData.gtin?.trim() || undefined,
        tax_gtin: productFormData.tax_gtin?.trim() || undefined,
        cbenef: productFormData.cbenef?.trim() || undefined,
        fiscal_validated: productFormData.fiscal_validated || 'NAO',
        fiscal_notes: productFormData.fiscal_notes?.trim() || undefined,
        nfe_enabled: productFormData.nfe_enabled || 'NAO',
      }

      if (editingProduct) {
        await productsService.update(editingProduct.id, payload)
        toast.success('Produto atualizado com sucesso!')
      } else {
        await productsService.create(payload)
        toast.success('Produto criado com sucesso!')
      }

      setIsProductModalOpen(false)
      setEditingProduct(null)
      navigate('/admin/products')
      await loadProducts()
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err)
      setProductFormError(err.message || 'Erro ao salvar produto')
    } finally {
      setProductFormLoading(false)
    }
  }

  const uploadProductLabel = async (file: File | null) => {
    if (!editingProduct || !file || editingProduct.label_url || labelSaving) return
    setLabelFile(file)
    try {
      setLabelSaving(true)
      const result = await productsService.updateLabel(editingProduct.id, file)
      const labelUpdate = { label_url: result.label_url, label_original_name: result.label_original_name }
      setProducts(current => current.map(product => product.id === editingProduct.id ? { ...product, ...labelUpdate } : product))
      setEditingProduct(current => current ? { ...current, ...labelUpdate } : null)
      setLabelFile(null)
      toast.success('Rótulo vinculado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao vincular rótulo')
    } finally {
      setLabelFile(null)
      setLabelSaving(false)
    }
  }

  const removeProductLabel = async () => {
    if (!editingProduct || !window.confirm('Remover o rótulo deste produto?')) return
    try {
      setLabelSaving(true)
      await productsService.updateLabel(editingProduct.id, undefined, true)
      const labelUpdate = { label_url: null, label_original_name: null }
      setProducts(current => current.map(product => product.id === editingProduct.id ? { ...product, ...labelUpdate } : product))
      setEditingProduct(current => current ? { ...current, ...labelUpdate } : null)
      setLabelFile(null)
      toast.success('Rótulo removido com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover rótulo')
    } finally {
      setLabelSaving(false)
    }
  }

  // ── Price history modal state ─────────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isMinimumMarginModalOpen, setIsMinimumMarginModalOpen] = useState(false)
  const [isPriceRoundingModalOpen, setIsPriceRoundingModalOpen] = useState(false)
  const [historyData, setHistoryData] = useState<{
    product: { id: string; name: string; active: boolean; archived: boolean };
    history: ProductPriceHistory[];
  }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [historyTab, setHistoryTab] = useState<Tab>('active')
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  type HistorySort = 'name' | 'price_asc' | 'price_desc' | 'profit_asc' | 'profit_desc'
  const [historySort, setHistorySort] = useState<HistorySort>('name')

  // ── Click-outside dropdown ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false)
    }
    if (isDropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isDropdownOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) setIsExportDropdownOpen(false)
    }
    if (isExportDropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isExportDropdownOpen])

  // ── Markup state & handlers ──────────────────────────────────────────────
  const [minimumMargin, setMinimumMargin] = useState<number | null>(null)
  const [minimumMarginInput, setMinimumMarginInput] = useState<string>('')
  const [minimumMarginRoundingMode, setMinimumMarginRoundingMode] = useState<'cents_up' | 'commercial_90_up' | 'commercial_99_up'>('commercial_90_up')
  const [isApplyingMinimumMargin, setIsApplyingMinimumMargin] = useState(false)
  const [priceRoundingThresholdInput, setPriceRoundingThresholdInput] = useState('40')
  const [priceRoundingPreview, setPriceRoundingPreview] = useState<Awaited<ReturnType<typeof productsService.roundPricesByMargin>>['data'] | null>(null)
  const [isLoadingPriceRounding, setIsLoadingPriceRounding] = useState(false)
  const [editingMarkupId, setEditingMarkupId] = useState<string | null>(null)
  const [tempMarkupValue, setTempMarkupValue] = useState<string>('')

  const loadMinimumMarginSettings = useCallback(async () => {
    try {
      const [margin, roundingMode, roundingThreshold] = await Promise.all([
        siteSettingsService.getSetting('minimum_margin'),
        siteSettingsService.getSetting('minimum_margin_rounding_mode'),
        siteSettingsService.getSetting('price_rounding_margin_threshold'),
      ])
      if (margin !== null && margin !== undefined) {
        setMinimumMargin(Number(margin))
        setMinimumMarginInput(String(margin))
      }
      if (roundingMode === 'cents_up' || roundingMode === 'commercial_90_up' || roundingMode === 'commercial_99_up') {
        setMinimumMarginRoundingMode(roundingMode)
      }
      if (roundingThreshold !== null && roundingThreshold !== undefined) {
        setPriceRoundingThresholdInput(String(roundingThreshold))
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de margem mínima:', e)
    }
  }, [])

  useEffect(() => {
    loadMinimumMarginSettings()
  }, [loadMinimumMarginSettings])

  const startEditingMarkup = (p: Product) => {
    if (p.purchase_price == null || Number(p.purchase_price) <= 0) {
      toast.warning('Defina um preço de custo (compra) para este produto antes de ajustar o markup.')
      return
    }
    setEditingMarkupId(p.id)
    setTempMarkupValue(p.markup != null ? String(p.markup) : '')
  }

  const saveMarkup = async (productId: string) => {
    const markupVal = tempMarkupValue === '' ? null : parseDecimalInput(tempMarkupValue)
    if (markupVal !== null && (isNaN(markupVal) || markupVal < 0)) {
      toast.error('O markup deve ser um número positivo ou zero.')
      return
    }

    const product = products.find(p => p.id === productId)
    const cost = product?.purchase_price != null ? roundCurrency(Number(product.purchase_price)) : null
    const calculatedPrice = cost && markupVal != null
      ? calcPriceFromMarkup(cost, markupVal)
      : undefined

    try {
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p
        return {
          ...p,
          markup: markupVal,
          ...(calculatedPrice != null ? { price: calculatedPrice } : {}),
        }
      }))

      await productsService.update(productId, {
        markup: markupVal,
        ...(calculatedPrice != null ? { price: calculatedPrice } : {}),
      })
      toast.success('Markup do produto atualizado com sucesso!')
      setEditingMarkupId(null)
      await loadProducts() // Reload to get newly calculated selling price
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar markup.')
      await loadProducts()
    }
  }

  const handleKeyPressMarkup = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      saveMarkup(productId)
    } else if (e.key === 'Escape') {
      setEditingMarkupId(null)
    }
  }

  const handleApplyMinimumMargin = () => {
    const value = minimumMarginInput.trim()
    if (value === '' || isNaN(Number(value)) || Number(value) < 0 || Number(value) >= 100) {
      toast.error('Insira uma margem valida entre 0 e 99,99%.')
      return
    }

    const targetMargin = Number(value)

    confirm.show(
      `Deseja aplicar margem minima de ${targetMargin}%?\nSomente produtos nao arquivados com custo cadastrado e margem atual abaixo dessa porcentagem terao o preco aumentado.`,
      async () => {
        try {
          setIsApplyingMinimumMargin(true)
          const result = await productsService.applyMinimumMargin(targetMargin, minimumMarginRoundingMode)
          setMinimumMargin(targetMargin)
          toast.success(result.message || 'Margem minima aplicada com sucesso!')
          setIsMinimumMarginModalOpen(false)
          await loadProducts()
        } catch (e: any) {
          toast.error(e.message || 'Erro ao aplicar margem minima.')
        } finally {
          setIsApplyingMinimumMargin(false)
        }
      },
      undefined,
      'Aplicar',
      'Cancelar'
    )
  }
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      setProducts(await productsService.getAllForAdmin())
    } catch (e: any) { setError(e.message || 'Erro ao carregar produtos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { setSelectedIds([]); setSearchTerm('') }, [activeTab])

  const handleDownloadPDF = async (options: ProductPdfReportOptions) => {
    try {
      setIsExportingPdf(true)
      const blob = await productsService.getPdfReportBlob(options)
      const today = new Date().toISOString().slice(0, 10)
      const filename = `catalogo-produtos-kapsu-${today}.pdf`

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(objectUrl)

      toast.success('Relatório em PDF baixado com sucesso.')
      setIsPdfExportModalOpen(false)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      if (!data.length) return
      const headers = data[0].map(String)
      setImportHeaders(headers)
      setImportRows(data.slice(1))
      const detected = autoDetect(headers)
      setColumnMapping(detected)
      const flags: Record<FieldKey, boolean> = {} as any
      for (const k of Object.keys(detected) as FieldKey[]) flags[k] = detected[k] !== ''
      setAutoDetected(flags)
      setImportSkipFields(new Set()) // limpar campos pulados ao trocar arquivo
    }
    reader.readAsBinaryString(file)
  }

  const getImportCellValue = (row: any[], field: FieldKey) => {
    // Campo desabilitado pelo usuário para esta importação
    if (importSkipFields.has(field)) return undefined
    const col = columnMapping[field]
    if (!col) return undefined
    const idx = importHeaders.indexOf(col)
    if (idx === -1) return undefined
    return row[idx]
  }

  const getImportName = (row: any[]) => String(getImportCellValue(row, 'name') ?? '').trim()

  const isValidImportName = (name: string) => !!name && name.length >= 2 && !/^\d+$/.test(name)

  const hasImportCellContent = (value: any) => value !== undefined && value !== null && String(value).trim() !== ''

  const parseImportCategory = (value: any) => {
    if (!hasImportCellContent(value)) return undefined
    const parts = String(value).split(',')
    const mapped = parts.map(part => {
      const s = part.trim()
      if (!s) return ''
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    }).filter(Boolean)
    const unique = Array.from(new Set(mapped))
    return unique.length > 0 ? unique.join(', ') : undefined
  }

  const buildImportPayload = (row: any[]) => {
    const name = getImportName(row)
    const payload: any = { name }
    const hasField = (field: FieldKey) => !!columnMapping[field]
    let hasUpdatableData = false

    const setTextField = (field: FieldKey, payloadKey = field) => {
      if (!hasField(field)) return
      const value = getImportCellValue(row, field)
      if (!hasImportCellContent(value)) return
      payload[payloadKey] = String(value).trim()
      hasUpdatableData = true
    }

    if (hasField('price')) {
      const price = cleanPrice(getImportCellValue(row, 'price'))
      if (price !== null && price > 0) {
        payload.price = price
        hasUpdatableData = true
      }
    }

    if (hasField('category')) {
      const category = parseImportCategory(getImportCellValue(row, 'category'))
      if (category) {
        payload.category = category
        hasUpdatableData = true
      }
    }

    setTextField('description')
    setTextField('indication')
    setTextField('contraindication')
    setTextField('compositions')
    setTextField('benefits')
    setTextField('intended_form')
    setTextField('intended_presentation')
    setTextField('intended_units_per_dose')

    if (hasField('status')) {
      const val = String(getImportCellValue(row, 'status') ?? '').trim().toLowerCase()
      if (val) {
        if (val.includes('inativ') || val.includes('desativ') || val === 'não' || val === 'nao' || val === '0' || val === 'false' || val === 'off') {
          payload.active = false
          payload.archived = false
          hasUpdatableData = true
        } else if (val.includes('arquiv') || val.includes('archived')) {
          payload.active = false
          payload.archived = true
          hasUpdatableData = true
        } else if (val.includes('ativ') || val === 'sim' || val === '1' || val === 'true' || val === 'on') {
          payload.active = true
          payload.archived = false
          hasUpdatableData = true
        }
      }
    }

    if (hasField('purchase_price')) {
      const purchasePrice = cleanPrice(getImportCellValue(row, 'purchase_price'))
      if (purchasePrice !== null) {
        payload.purchase_price = purchasePrice
        hasUpdatableData = true
      }
    }

    if (hasField('promo_price')) {
      const promoPrice = cleanPrice(getImportCellValue(row, 'promo_price'))
      if (promoPrice !== null) {
        payload.promo_price = promoPrice
        hasUpdatableData = true
      }
    }

    return {
      name,
      nameLower: name.toLowerCase(),
      payload,
      hasPrice: payload.price !== undefined,
      hasUpdatableData,
    }
  }

  const getImportCandidateRows = () => importRows.filter(row => {
    const info = buildImportPayload(row)
    return isValidImportName(info.name) && info.hasUpdatableData
  })

  const executeImport = async (
    idsToReactivate: Set<string>,
    resolutionsMap: Record<string, { action: 'update' | 'create' | 'skip'; existingId?: string }> = {}
  ) => {
    setIsImporting(true)
    setImportProgress(0)
    let count = 0

    try {
      const validRows = getImportCandidateRows()
      const progressTotal = Math.max(validRows.length, 1)

      const seenNames = new Set<string>()
      let skippedWithoutPrice = 0

      for (const row of validRows) {
        const { nameLower, payload, hasPrice } = buildImportPayload(row)
        if (seenNames.has(nameLower)) continue
        seenNames.add(nameLower)

        // Apply custom similarity resolution if present
        const customRes = resolutionsMap[nameLower]
        if (customRes) {
          if (customRes.action === 'skip') {
            continue
          } else if (customRes.action === 'update' && customRes.existingId) {
            await productsService.update(customRes.existingId, payload)
            count++
            setImportProgress(Math.round((count / progressTotal) * 100))
            continue
          } else if (customRes.action === 'create') {
            if (!hasPrice) {
              skippedWithoutPrice++
              continue
            }
            await productsService.create({
              ...payload,
              active: payload.active !== undefined ? payload.active : true,
              archived: payload.archived !== undefined ? payload.archived : false,
            })
            count++
            setImportProgress(Math.round((count / progressTotal) * 100))
            continue
          }
        }

        // Check if product with same name already exists in active/inactive/archived list
        const existing = products.find(p => p.name.trim().toLowerCase() === nameLower)
        if (existing) {
          if (existing.archived || !existing.active) {
            if (idsToReactivate.has(existing.id) || payload.active !== undefined || payload.archived !== undefined) {
              // Reactivate / update status and data
              await productsService.update(existing.id, {
                ...payload,
                active: payload.active !== undefined ? payload.active : true,
                archived: payload.archived !== undefined ? payload.archived : false,
              })
              count++
            } else {
              // Skip
              continue
            }
          } else {
            // Already active/exists: update normally
            await productsService.update(existing.id, payload)
            count++
          }
        } else {
          if (!hasPrice) {
            skippedWithoutPrice++
            continue
          }
          // If it doesn't exist, create it
          await productsService.create({
            ...payload,
            active: payload.active !== undefined ? payload.active : true,
            archived: payload.archived !== undefined ? payload.archived : false,
          })
          count++
        }

        setImportProgress(Math.round((count / progressTotal) * 100))
      }
      await loadProducts()
      setIsImportOpen(false)
      setIsReactivateModalOpen(false)
      resetImport()
      const skippedMessage = skippedWithoutPrice > 0 ? ` ${skippedWithoutPrice} linha(s) sem preço foram ignoradas por não corresponderem a produto existente.` : ''
      toast.success(`${count} produto(s) importado(s) com sucesso!${skippedMessage}`)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao importar')
    } finally {
      setIsImporting(false)
    }
  }

  const checkReactivateCandidates = async (
    rowsToCheck: any[],
    resolutions: Record<string, { action: 'update' | 'create' | 'skip'; existingId?: string }> = {}
  ) => {
    const ni = importHeaders.indexOf(columnMapping.name)


    const seenReactivate = new Set<string>()
    const candidates = rowsToCheck.map(row => {
      const name = String(row[ni] ?? '').trim()
      const nameLower = name.toLowerCase()
      if (seenReactivate.has(nameLower)) return null
      seenReactivate.add(nameLower)

      // If it is custom-resolved to update an active product, it is not a reactivation candidate
      if (resolutions[nameLower]?.action === 'update') return null

      const p = products.find(prod => prod.name.trim().toLowerCase() === nameLower && (prod.archived || !prod.active))
      if (!p) return null

      const newPrice = cleanPrice(getImportCellValue(row, 'price'))
      const newPurchasePrice = cleanPrice(getImportCellValue(row, 'purchase_price'))

      return {
        product: p,
        selected: true,
        newPrice,
        newPurchasePrice
      }
    }).filter((item): item is { product: Product; selected: boolean; newPrice: number | null; newPurchasePrice: number | null } => !!item)

    if (candidates.length > 0) {
      setReactivateCandidates(candidates)
      setTempResolutions(resolutions)
      setIsReactivateModalOpen(true)
    } else {
      await executeImport(new Set(), resolutions)
    }
  }

  const handleImportConfirm = async () => {
    if (!columnMapping.name) return


    const validRows = getImportCandidateRows()

    if (validRows.length === 0) {
      toast.warning('Nenhum produto válido encontrado para importação.')
      return
    }

    // 1. Detect similar product names in the database
    const activeProducts = products.filter(p => p.active && !p.archived)
    const detectedSimilar: SimilarMatch[] = []
    const seenSimilar = new Set<string>()

    for (const row of validRows) {
      const name = getImportName(row)
      const nameLower = name.toLowerCase()
      if (seenSimilar.has(nameLower)) continue
      seenSimilar.add(nameLower)

      // If there is an exact case-insensitive match, it is not similarity-warned (it updates automatically)
      const exactMatch = products.find(p => p.name.trim().toLowerCase() === nameLower)
      if (exactMatch) continue

      let bestMatch: Product | null = null
      let highestSimilarity = 0

      for (const p of activeProducts) {
        const sim = getStringSimilarity(name, p.name)
        if (sim >= 0.82) { // 82% threshold
          if (sim > highestSimilarity) {
            highestSimilarity = sim
            bestMatch = p
          }
        }
      }

      if (bestMatch) {
        detectedSimilar.push({
          importedName: name,
          importedRow: row,
          existingProduct: bestMatch,
          resolution: 'update' // Default to update instead of duplicate
        })
      }
    }

    if (detectedSimilar.length > 0) {
      setSimilarityMatches(detectedSimilar)
      setIsSimilarityModalOpen(true)
    } else {
      await checkReactivateCandidates(validRows)
    }
  }

  const handleMatchResolutionChange = (index: number, action: 'update' | 'create' | 'skip') => {
    setSimilarityMatches(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], resolution: action }
      return updated
    })
  }

  const handleSimilarityConfirm = async () => {
    const resolutions: Record<string, { action: 'update' | 'create' | 'skip'; existingId?: string }> = {}

    for (const match of similarityMatches) {
      resolutions[match.importedName.toLowerCase()] = {
        action: match.resolution,
        existingId: match.resolution === 'update' ? match.existingProduct.id : undefined
      }
    }

    setIsSimilarityModalOpen(false)

    const validRows = getImportCandidateRows()

    await checkReactivateCandidates(validRows, resolutions)
  }

  const handleScanDuplicates = () => {
    const nonArchived = products.filter(p => !p.archived)
    let foundAny = false
    const visited = new Set<string>()

    for (let i = 0; i < nonArchived.length; i++) {
      const p1 = nonArchived[i]
      if (visited.has(p1.id)) continue

      for (let j = i + 1; j < nonArchived.length; j++) {
        const p2 = nonArchived[j]
        if (visited.has(p2.id)) continue

        const sim = getStringSimilarity(p1.name, p2.name)
        if (sim >= 0.82) {
          foundAny = true
          break
        }
      }
      if (foundAny) break
    }

    if (foundAny) {
      setIsDbDuplicatesOpen(true)
    } else {
      toast.success('Nenhum produto semelhante ou duplicado encontrado no banco de dados!')
    }
  }

  useEffect(() => {
    if (isDbDuplicatesOpen) {
      const nonArchived = products.filter(p => !p.archived)
      const groups: DuplicationGroup[] = []
      const visited = new Set<string>()

      for (let i = 0; i < nonArchived.length; i++) {
        const p1 = nonArchived[i]
        if (visited.has(p1.id)) continue

        const similar: Product[] = []
        for (let j = i + 1; j < nonArchived.length; j++) {
          const p2 = nonArchived[j]
          if (visited.has(p2.id)) continue

          const sim = getStringSimilarity(p1.name, p2.name)
          if (sim >= 0.82) {
            similar.push(p2)
            visited.add(p2.id)
          }
        }

        if (similar.length > 0) {
          visited.add(p1.id)
          groups.push({
            primaryProduct: p1,
            similarProducts: similar
          })
        }
      }
      setDbDuplicates(groups)
    }
  }, [products, isDbDuplicatesOpen])

  useEffect(() => {
    const fetchOrdersCounts = async () => {
      if (!isDbDuplicatesOpen || dbDuplicates.length === 0) return

      // Collect all unique product IDs from all groups
      const allIds = new Set<string>()
      dbDuplicates.forEach((group) => {
        allIds.add(group.primaryProduct.id)
        group.similarProducts.forEach((p) => allIds.add(p.id))
      })

      try {
        setLoadingOrdersCount(true)
        const counts = await productsService.checkProductsOrders(Array.from(allIds))
        setProductsOrdersCount(prev => ({ ...prev, ...counts }))
      } catch (err) {
        console.error('Erro ao buscar quantidade de pedidos dos produtos:', err)
      } finally {
        setLoadingOrdersCount(false)
      }
    }

    fetchOrdersCounts()
  }, [dbDuplicates, isDbDuplicatesOpen])


  const resetImport = () => {
    setImportHeaders([]); setImportRows([]); setImportProgress(0)
    setColumnMapping({
      name: '', sku: '', price: '', purchase_price: '', promo_price: '', status: '', marketplace_tags: '', description: '', category: '',
      indication: '', contraindication: '', compositions: '', benefits: '',
      intended_form: '', intended_presentation: '', intended_units_per_dose: '',
    })
    setAutoDetected({
      name: false, sku: false, price: false, purchase_price: false, promo_price: false, status: false, marketplace_tags: false, description: false, category: false,
      indication: false, contraindication: false, compositions: false, benefits: false,
      intended_form: false, intended_presentation: false, intended_units_per_dose: false,
    })
    setImportSkipFields(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── History modal ─────────────────────────────────────────────────────────
  const openHistory = async () => {
    setIsHistoryOpen(true); setHistoryLoading(true); setHistorySearchTerm(''); setHistorySort('name')
    try { setHistoryData(await productsService.getAllPriceHistory()) }
    catch (e: any) { console.error(e) }
    finally { setHistoryLoading(false) }
  }

  const historyFiltered = useMemo(() => {
    const filtered = historyData.filter(({ product }) =>
      historyTab === 'active' ? product.active && !product.archived :
        historyTab === 'inactive' ? !product.active && !product.archived :
          product.archived
    ).filter(({ product }) =>
      product.name.toLowerCase().includes(historySearchTerm.toLowerCase())
    ).filter(({ history }) => history.length > 0)

    const getStats = (historyList: ProductPriceHistory[]) => {
      const latestSale = historyList.find(h => h.type === 'sale')
      const latestPurchase = historyList.find(h => h.type === 'purchase')
      const sale = latestSale ? Number(latestSale.new_price) : 0
      const cost = latestPurchase ? Number(latestPurchase.new_price) : 0
      const profitPct = cost > 0 ? ((sale - cost) / cost) * 100 : -999999
      return { sale, cost, profitPct }
    }

    return [...filtered].sort((a, b) => {
      if (historySort === 'name') {
        return a.product.name.localeCompare(b.product.name)
      }
      const statsA = getStats(a.history)
      const statsB = getStats(b.history)

      if (historySort === 'price_asc') {
        return statsA.sale - statsB.sale
      }
      if (historySort === 'price_desc') {
        return statsB.sale - statsA.sale
      }
      if (historySort === 'profit_asc') {
        return statsA.profitPct - statsB.profitPct
      }
      if (historySort === 'profit_desc') {
        return statsB.profitPct - statsA.profitPct
      }
      return 0
    })
  }, [historyData, historyTab, historySearchTerm, historySort])

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    confirm.show('Tem certeza que deseja excluir este produto?', async () => {
      try {
        setDeletingId(id)
        const result = await productsService.delete(id)
        await loadProducts()
        if ((result as any)?.softDeleted) {
          toast.warning('Este produto possui pedidos vinculados e foi arquivado.')
        } else {
          toast.success('Produto excluído com sucesso!')
        }
      } catch (e: any) {
        toast.error(e.message || 'Erro ao excluir produto')
      } finally {
        setDeletingId(null)
      }
    })
  }

  const getPriceRoundingThreshold = () => {
    const threshold = Number(priceRoundingThresholdInput.trim().replace(',', '.'))
    if (!Number.isFinite(threshold) || threshold < 0 || threshold >= 100) {
      toast.error('Informe um limite entre 0 e 99,99%.')
      return null
    }
    return threshold
  }

  const loadPriceRoundingPreview = async () => {
    const threshold = getPriceRoundingThreshold()
    if (threshold === null) return
    try {
      setIsLoadingPriceRounding(true)
      const result = await productsService.roundPricesByMargin(threshold, selectedIds.length ? selectedIds : undefined, true)
      setPriceRoundingPreview(result.data)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao calcular prévia do arredondamento.')
    } finally {
      setIsLoadingPriceRounding(false)
    }
  }

  const openPriceRoundingModal = () => {
    setPriceRoundingPreview(null)
    setIsPriceRoundingModalOpen(true)
  }

  const handleApplyPriceRounding = () => {
    const threshold = getPriceRoundingThreshold()
    if (threshold === null || !priceRoundingPreview) return
    confirm.show(
      `Aplicar arredondamento em ${priceRoundingPreview.updatedCount} produto(s)?`,
      async () => {
        try {
          setIsLoadingPriceRounding(true)
          const result = await productsService.roundPricesByMargin(threshold, selectedIds.length ? selectedIds : undefined, false)
          toast.success(result.message)
          setIsPriceRoundingModalOpen(false)
          setSelectedIds([])
          await loadProducts()
        } catch (e: any) {
          toast.error(e.message || 'Erro ao arredondar preços.')
        } finally {
          setIsLoadingPriceRounding(false)
        }
      },
      undefined,
      'Arredondar',
      'Cancelar'
    )
  }



  const handleBulkActivate = async () => {
    if (!selectedIds.length) return
    confirm.show(`Ativar ${selectedIds.length} produto(s) selecionado(s)?`, async () => {
      try {
        const result = await productsService.bulkUpdateStatus(selectedIds, { active: true, archived: false })
        toast.success(result.message)
        setSelectedIds([])
        await loadProducts()
      } catch (e: any) {
        toast.error(e.message || 'Erro ao ativar produtos em massa')
      }
    })
  }

  const handleBulkDeactivate = async () => {
    if (!selectedIds.length) return
    confirm.show(`Desativar ${selectedIds.length} produto(s) selecionado(s)?`, async () => {
      try {
        const result = await productsService.bulkUpdateStatus(selectedIds, { active: false, archived: false })
        toast.success(result.message)
        setSelectedIds([])
        await loadProducts()
      } catch (e: any) {
        toast.error(e.message || 'Erro ao desativar produtos em massa')
      }
    })
  }

  const handleBulkArchive = async () => {
    if (!selectedIds.length) return
    confirm.show(
      `Arquivar ${selectedIds.length} produto(s) selecionado(s)?\nEles serão movidos para a aba Arquivados.`,
      async () => {
        try {
          const result = await productsService.bulkUpdateStatus(selectedIds, { active: false, archived: true })
          toast.success(result.message)
          setSelectedIds([])
          await loadProducts()
        } catch (e: any) {
          toast.error(e.message || 'Erro ao arquivar produtos em massa')
        }
      }
    )
  }

  const handleBulkUnarchive = (activateImmediately = false) => {
    if (!selectedIds.length) return
    const msg = activateImmediately
      ? `Desarquivar e ativar ${selectedIds.length} produto(s) selecionado(s)?`
      : `Desarquivar ${selectedIds.length} produto(s) selecionado(s)? (Voltará(ão) como Inativo(s))`
    confirm.show(msg, async () => {
      try {
        const result = await productsService.bulkUpdateStatus(selectedIds, {
          archived: false,
          active: activateImmediately,
        })
        toast.success(result.message)
        setSelectedIds([])
        await loadProducts()
      } catch (e: any) {
        toast.error(e.message || 'Erro ao desarquivar produtos em massa')
      }
    })
  }



  const handleToggleActive = async (product: Product) => {
    if (product.archived) return
    try {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !p.active } : p))
      await productsService.update(product.id, { active: !product.active })
      toast.success(`Produto ${!product.active ? 'ativado' : 'desativado'} com sucesso.`)
    } catch (e: any) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: product.active } : p))
      toast.error(e.message || 'Erro ao alterar status do produto')
    }
  }

  const handleUnarchive = (product: Product) => {
    confirm.show(`Desarquivar "${product.name}"? Voltará como inativo.`, async () => {
      try {
        await productsService.update(product.id, { archived: false, active: false })
        await loadProducts()
        toast.success(`"${product.name}" desarquivado com sucesso.`)
      } catch (e: any) {
        toast.error(e.message || 'Erro ao desarquivar produto')
      }
    })
  }



  const renderMarketplaceBadges = (tagsStr?: string | null) => {
    const raw = tagsStr ?? 'site,mercado_livre,shopee'
    const tags = raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    if (tags.length === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          Nenhum
        </span>
      )
    }
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {tags.includes('site') && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" title="Disponível no Site">
            🌐 Site
          </span>
        )}
        {tags.includes('mercado_livre') && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800" title="Disponível no Mercado Livre">
            💛 Mercado Livre
          </span>
        )}
        {tags.includes('shopee') && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800" title="Disponível na Shopee">
            🟠 Shopee
          </span>
        )}
      </div>
    )
  }

  const handleMarketplaceTagToggle = (tag: string, checked: boolean) => {
    const currentTags = (productFormData.marketplace_tags || 'site,mercado_livre,shopee')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    let newTags: string[]
    if (checked) {
      newTags = Array.from(new Set([...currentTags, tag]))
    } else {
      newTags = currentTags.filter(t => t !== tag)
    }

    setProductFormData(prev => ({
      ...prev,
      marketplace_tags: newTags.join(',')
    }))
  }

  const getProductMarginValue = (p: Product): number | null => {
    const cost = p.purchase_price != null ? Number(p.purchase_price) : null
    const sale = Number(p.price)
    if (cost != null && cost > 0 && sale > 0) {
      return ((sale - cost) / sale) * 100
    }
    if (p.markup != null && Number.isFinite(Number(p.markup))) {
      return Number(p.markup)
    }
    return null
  }
  const getProductStatusLabel = (p: Product) => {
    if (p.archived) return 'Arquivado'
    return p.active ? 'Ativo' : 'Inativo'
  }
  const getProductSortValue = (p: Product, key: ProductsSortKey): string | number | null => {
    switch (key) {
      case 'name':
        return p.name || ''
      case 'sku':
        return p.sku || ''
      case 'category':
        return p.category || ''
      case 'marketplaces':
        return p.marketplace_tags ?? 'site,mercado_livre,shopee'
      case 'purchase_price':
        return p.purchase_price != null ? Number(p.purchase_price) : null
      case 'margin':
        return getProductMarginValue(p)
      case 'price':
        return Number(p.price)
      case 'status':
        return getProductStatusLabel(p)
      default:
        return ''
    }
  }

  // ── Derived lists ─────────────────────────────────────────────────────────
  const activeProducts = products.filter(p => p.active && !p.archived)
  const inactiveProducts = products.filter(p => !p.active && !p.archived)
  const archivedProducts = products.filter(p => p.archived)
  const tabProducts: Record<Tab, Product[]> = { active: activeProducts, inactive: inactiveProducts, archived: archivedProducts }

  const filteredProducts = tabProducts[activeTab].filter(p => {
    // 1. Termo de busca
    const matchesSearch = !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // 2. Margem (%)
    const marginVal = getProductMarginValue(p)
    if (advancedFilters.minMargin.trim() !== '' && !isNaN(Number(advancedFilters.minMargin))) {
      if (marginVal == null || marginVal < Number(advancedFilters.minMargin)) return false
    }
    if (advancedFilters.maxMargin.trim() !== '' && !isNaN(Number(advancedFilters.maxMargin))) {
      if (marginVal == null || marginVal > Number(advancedFilters.maxMargin)) return false
    }

    // 3. Custo (R$)
    const costVal = p.purchase_price != null ? Number(p.purchase_price) : null
    if (advancedFilters.minCost.trim() !== '' && !isNaN(Number(advancedFilters.minCost))) {
      if (costVal == null || costVal < Number(advancedFilters.minCost)) return false
    }
    if (advancedFilters.maxCost.trim() !== '' && !isNaN(Number(advancedFilters.maxCost))) {
      if (costVal == null || costVal > Number(advancedFilters.maxCost)) return false
    }

    // 4. Categoria
    if (advancedFilters.category) {
      if (!(p.category || 'Outros').toLowerCase().includes(advancedFilters.category.toLowerCase())) return false
    }

    // 5. Marketplaces
    const prodTags = (p.marketplace_tags ?? 'site,mercado_livre,shopee').split(',').map(t => t.trim().toLowerCase())
    const matchesMarketplace =
      (advancedFilters.marketplaces.site && prodTags.includes('site')) ||
      (advancedFilters.marketplaces.mercado_livre && prodTags.includes('mercado_livre')) ||
      (advancedFilters.marketplaces.shopee && prodTags.includes('shopee'))
    if (!matchesMarketplace) return false

    // 6. Habilitado para NF-e
    if (advancedFilters.nfeEnabled === 'sim' && p.nfe_enabled !== 'SIM') return false
    if (advancedFilters.nfeEnabled === 'nao' && p.nfe_enabled === 'SIM') return false

    // 7. Rótulo Cadastrado
    if (advancedFilters.hasLabel === 'sim' && !p.label_url) return false
    if (advancedFilters.hasLabel === 'nao' && p.label_url) return false

    // 8. Imagens Vinculadas
    const imgCount = (p.images && p.images.length > 0)
      ? p.images.length
      : (p.image && p.image !== PRODUCT_IMAGE_FALLBACK ? 1 : 0)

    if (advancedFilters.imagesFilter === 'none' && imgCount > 0) return false
    if (advancedFilters.imagesFilter === 'single' && imgCount !== 1) return false
    if (advancedFilters.imagesFilter === 'multiple' && imgCount < 2) return false

    return true
  })
  const sortedProducts = useMemo(() => {
    const directionFactor = productsSort.direction === 'asc' ? 1 : -1

    return [...filteredProducts].sort((a, b) => {
      const av = getProductSortValue(a, productsSort.key)
      const bv = getProductSortValue(b, productsSort.key)

      if (av == null && bv == null) return a.name.localeCompare(b.name, 'pt-BR')
      if (av == null) return 1
      if (bv == null) return -1

      const result = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base', numeric: true })

      if (result !== 0) return result * directionFactor
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    })
  }, [filteredProducts, productsSort])
  const handleProductsSort = (key: ProductsSortKey) => {
    setProductsSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const TABS = [
    { key: 'active' as Tab, label: 'Ativos', count: activeProducts.length, active: 'border-green-500 text-green-600 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
    { key: 'inactive' as Tab, label: 'Inativos', count: inactiveProducts.length, active: 'border-yellow-500 text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
    { key: 'archived' as Tab, label: 'Arquivados', count: archivedProducts.length, active: 'border-gray-500 text-gray-600 dark:text-gray-400', badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  ]

  // ── Sub-renders ───────────────────────────────────────────────────────────
  const renderSortableHeader = (key: ProductsSortKey, label: string) => {
    const isActive = productsSort.key === key
    return (
      <button
        type="button"
        onClick={() => handleProductsSort(key)}
        className={`group inline-flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${isActive ? 'text-primary-700 dark:text-primary-300' : 'hover:text-gray-700 dark:hover:text-white'}`}
        title={`Ordenar por ${label}`}
        aria-sort={isActive ? (productsSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          className={`transition-all ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'} ${isActive && productsSort.direction === 'asc' ? 'rotate-180' : ''}`}
        />
      </button>
    )
  }

  const renderStatusBadge = (p: Product) => p.archived
    ? <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"><Archive size={11} />Arquivado</span>
    : <button onClick={() => handleToggleActive(p)} className={`px-2 py-1 text-xs font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${p.active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200'}`} title={`Clique para ${p.active ? 'desativar' : 'ativar'}`}>{p.active ? 'Ativo' : 'Inativo'}</button>

  const renderActions = (p: Product) => p.archived
    ? <div className="flex justify-end"><button onClick={() => handleUnarchive(p)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded p-1" title="Desarquivar"><ArchiveRestore size={18} /></button></div>
    : <div className="flex justify-end space-x-2">
      <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded p-1" title="Editar"><Edit size={18} /></button>
      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-red-600 dark:text-red-400 hover:text-red-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded p-1" title="Excluir">{deletingId === p.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}</button>
    </div>

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">

        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={18} className="mr-1.5" />Voltar
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* History button */}
            <button onClick={openHistory} className="flex items-center justify-center p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm" title="Histórico de Preços">
              <BarChart2 size={18} />
            </button>
            {/* Minimum margin button */}
            <button onClick={() => setIsMinimumMarginModalOpen(true)} className="flex items-center justify-center p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm" title="Margem minima">
              <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
            </button>
            <button onClick={openPriceRoundingModal} className="flex items-center justify-center p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm" title="Arredondar preços por margem">
              <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
            </button>
            {/* Scan Duplicates button */}
            <button
              onClick={handleScanDuplicates}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium transition-colors shadow-sm"
              title="Verificar Semelhantes"
            >
              <AlertCircle size={18} />
            </button>
            {/* Export dropdown */}
            <div ref={exportDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen(v => !v)}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Exportar produtos"
              >
                {isExportingPdf ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                <span className="hidden lg:inline text-sm font-medium">Exportar</span>
                <ChevronDown size={14} className="hidden lg:block" />
              </button>
              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => { setIsExcelExportModalOpen(true); setIsExportDropdownOpen(false) }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Upload size={15} className="mr-2.5 text-gray-500" />
                      Exportar Excel
                    </button>
                    <button
                      onClick={() => { setIsPdfExportModalOpen(true); setIsExportDropdownOpen(false) }}
                      disabled={isExportingPdf}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <FileText size={15} className="mr-2.5 text-gray-500" />
                      {isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
                    </button>

                  </div>
                </div>
              )}
            </div>
            {/* Add dropdown */}
            <div ref={dropdownRef} className="relative flex-1 sm:flex-none">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto">
                <Plus size={18} className="mr-1.5" />Adicionar
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="py-1">
                    <button onClick={() => { navigate('/admin/products/create'); setIsDropdownOpen(false) }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Plus size={16} className="mr-2" />Novo Produto
                    </button>
                    <button onClick={() => { setIsImportModalOpen(true); setIsDropdownOpen(false) }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Download size={16} className="mr-2" />Importar Excel/CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">Gerenciar Produtos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Gerencie os produtos da loja</p>
        </div>



        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSelectedIds([]) }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.key ? t.active + ' border-current' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                {t.label}
                {t.count > 0 && <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? t.badge : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{t.count}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Archived notice */}
        {activeTab === 'archived' && (
          <div className="mb-4 flex items-start gap-3 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
            <Archive size={15} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <span>Produtos arquivados possuem pedidos vinculados. Você pode <strong>desarquivá-los</strong> para movê-los para <em>Inativos</em> ou <em>Ativos</em>.</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU, categoria ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${countActiveFilters(advancedFilters) > 0
                  ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-300 ring-2 ring-primary-500/20'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50'
                }`}
            >
              <Filter size={15} />
              <span>Filtros</span>
              {countActiveFilters(advancedFilters) > 0 && (
                <span className="bg-primary-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {countActiveFilters(advancedFilters)}
                </span>
              )}
            </button>

            {countActiveFilters(advancedFilters) > 0 && (
              <button
                type="button"
                onClick={() => setAdvancedFilters(INITIAL_FILTERS_STATE)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline px-2 font-medium cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-600 w-12 h-12" /></div>}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={loadProducts} className="mt-2 text-sm text-red-600 underline">Tentar novamente</button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Bulk actions */}
            {selectedIds.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50/80 dark:bg-gray-800/90 border border-blue-200 dark:border-gray-700 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                    {selectedIds.length} produto(s) selecionado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer ml-1"
                  >
                    Limpar seleção
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsBulkEditModalOpen(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <SlidersHorizontal size={14} /> Editar em Massa
                  </button>
                </div>
              </div>
            )}

            {/* Table wrapper with horizontal scroll and responsive design */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">
                        <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={e => setSelectedIds(e.target.checked ? filteredProducts.map(p => p.id) : [])} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('name', 'Produto')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('category', 'Categoria')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('marketplaces', 'Marketplaces')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('purchase_price', 'Custo')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('margin', 'Markup / Margem')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('price', 'Preço')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap">{renderSortableHeader('status', 'Status')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum produto encontrado.</td></tr>
                    ) : sortedProducts.map(p => (
                      <tr key={p.id} className={`group hover:bg-gray-50 dark:hover:bg-[#065084]/40 transition-colors ${p.archived ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, p.id] : selectedIds.filter(x => x !== p.id))} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.image && p.image.trim() !== '' && p.image !== PRODUCT_IMAGE_FALLBACK ? (
                              <a
                                href={p.image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-zoom-in hover:opacity-85 transition-opacity flex-shrink-0"
                                title="Clique para abrir a imagem"
                              >
                                <img src={p.image} alt={p.name} className={`h-10 w-10 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0 ${p.archived ? 'grayscale' : ''}`} onError={e => handleImageError(e, PRODUCT_IMAGE_FALLBACK)} />
                              </a>
                            ) : (
                              <img src={PRODUCT_IMAGE_FALLBACK} alt={p.name} className={`h-10 w-10 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0 ${p.archived ? 'grayscale' : ''}`} />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                <a
                                  href={generateProductUrl(p)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer"
                                  title="Visualizar página pública do produto"
                                >
                                  {p.name}
                                </a>
                                {p.archived && <Archive size={12} className="text-gray-400" />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.category || 'outros').split(',').map(cat => {
                              const c = cat.trim();
                              return (
                                <span key={c} className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {renderMarketplaceBadges(p.marketplace_tags)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {p.purchase_price != null ? <span className="text-purple-705 dark:text-purple-400 font-medium">{fmt(p.purchase_price)}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {p.purchase_price != null && Number(p.purchase_price) > 0 ? (
                            editingMarkupId === p.id ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={tempMarkupValue}
                                  onChange={(e) => setTempMarkupValue(e.target.value)}
                                  onKeyDown={(e) => handleKeyPressMarkup(e, p.id)}
                                  className="w-16 px-1.5 py-1 text-xs border border-green-500 rounded focus:outline-none dark:bg-gray-900 dark:text-white"
                                  autoFocus
                                />
                                <button onClick={() => saveMarkup(p.id)} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded" title="Salvar">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setEditingMarkupId(null)} className="p-1 text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" title="Cancelar">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="group flex flex-col justify-start items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-colors min-w-[90px]"
                                onClick={() => startEditingMarkup(p)}
                                title="Clique para editar o markup"
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                                    {p.markup != null
                                      ? `${formatMarkupDisplay(Number(p.markup))}%`
                                      : (() => {
                                        const cost = Number(p.purchase_price)
                                        const sale = Number(p.price)
                                        if (cost > 0 && sale > 0) {
                                          return `${formatMarkupDisplay(findMarkupForTargetPrice(cost, sale))}%`
                                        }
                                        return '—'
                                      })()}
                                  </span>
                                  <Edit size={11} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                {(() => {
                                  const cost = Number(p.purchase_price);
                                  const sale = Number(p.price);
                                  if (cost > 0 && sale > 0) {
                                    const margin = ((sale - cost) / sale) * 100;
                                    return (
                                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                        Margem: {margin.toFixed(1).replace('.', ',')}%
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic" title="Defina o preço de custo para usar markup">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(p.price)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{renderStatusBadge(p)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-[#153e5c] z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.2)] transition-colors">{renderActions(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ IMPORT MODAL ═══════════════════════════════════════ */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 my-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30">
                  <Upload size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Importar Produtos</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Excel (.xlsx, .xls) ou CSV</p>
                </div>
              </div>
              <button onClick={() => { setIsImportOpen(false); resetImport() }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col min-h-0">
              {/* Step 1: File drop area */}
              {importHeaders.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center gap-4 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all group my-auto"
                >
                  <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                    <Upload size={28} className="text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Suporta .xlsx, .xls, .csv</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                </div>
              ) : isImporting ? (
                /* Importing progress */
                <div className="text-center py-8 my-auto">
                  <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Importando produtos...</p>
                  <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{importProgress}%</p>
                </div>
              ) : (
                /* Step 2: Column mapping */
                <div className="flex flex-col h-full min-h-0 space-y-3">
                  <div className="flex items-center justify-between flex-shrink-0 pb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vincular Colunas do Excel</p>
                      <p className="text-xs text-gray-400">{importRows.length} linha(s) detectada(s) • Mapeie as colunas correspondentes</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={resetImport} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline flex-shrink-0">
                        Trocar arquivo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[52vh] pr-1.5 py-0.5 scrollbar-thin">
                    {IMPORT_FIELDS.map(field => {
                      const detected = autoDetected[field.key]
                      const hasValue = !!columnMapping[field.key]
                      const isSkipped = importSkipFields.has(field.key)
                      return (
                        <div
                          key={field.key}
                          className={`p-2.5 rounded-xl border transition-colors flex flex-col justify-between gap-1.5 ${isSkipped
                              ? 'border-orange-200 dark:border-orange-800/60 bg-orange-50/30 dark:bg-orange-900/10 opacity-60'
                              : field.required && !hasValue
                                ? 'border-red-200 dark:border-red-800/80 bg-red-50/40 dark:bg-red-900/10'
                                : hasValue
                                  ? 'border-green-200 dark:border-green-800/80 bg-green-50/20 dark:bg-green-900/10'
                                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-800/30'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                type="button"
                                disabled={field.required}
                                aria-pressed={isSkipped}
                                onClick={() => {
                                  setImportSkipFields(prev => {
                                    const next = new Set(prev)
                                    if (next.has(field.key)) next.delete(field.key)
                                    else next.add(field.key)
                                    return next
                                  })
                                }}
                                title={field.required ? 'Campo obrigatório' : isSkipped ? `Clique para importar ${field.label}` : `Clique para não importar ${field.label}`}
                                className={`text-xs font-semibold truncate text-left transition-colors ${field.required
                                    ? 'text-gray-800 dark:text-gray-200 cursor-default'
                                    : isSkipped
                                      ? 'line-through text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400'
                                      : 'text-gray-800 dark:text-gray-200 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400'
                                  }`}
                              >
                                {field.label}
                              </button>
                              {field.required && <span className="text-[10px] font-bold text-red-500 flex-shrink-0">*obrigatório</span>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isSkipped ? (
                                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">ignorado</span>
                              ) : (
                                <>
                                  {detected && hasValue && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-100/70 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full">
                                      <Sparkles size={10} />auto
                                    </span>
                                  )}
                                  {hasValue ? (
                                    <Check size={14} className="text-green-500" />
                                  ) : (
                                    <AlertCircle size={14} className={field.required ? 'text-red-400' : 'text-gray-300 dark:text-gray-600'} />
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="relative w-full">
                            <select
                              disabled={isSkipped}
                              value={columnMapping[field.key]}
                              onChange={e => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className={`w-full text-xs rounded-lg border px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${isSkipped
                                  ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                  : hasValue
                                    ? 'border-green-400 dark:border-green-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium'
                                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                }`}
                            >
                              <option value="">— Não vincular —</option>
                              {importHeaders.map(h => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-3 mt-auto border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <button
                      onClick={() => { setIsImportOpen(false); resetImport() }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={!columnMapping.name}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Importar {importRows.length} linha(s)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ HISTORY MODAL ══════════════════════════════════════ */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                  <BarChart2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Histórico de Preços</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe variações de compra, venda e promo</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Legend */}
            <div className="px-5 pt-3 pb-0 flex items-center gap-4 flex-shrink-0">
              {Object.entries(HISTORY_TYPE_LABELS).map(([k, v]) => (
                <span key={k} className={`flex items-center gap-1 text-xs font-medium ${v.color}`}>{v.icon}{v.label}</span>
              ))}
              <span className="ml-auto flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-0.5 text-red-500"><TrendingUp size={12} />subiu</span>
                <span className="flex items-center gap-0.5 text-green-500"><TrendingDown size={12} />baixou</span>
              </span>
            </div>

            {/* Sub-tabs */}
            <div className="px-5 pt-2 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
              <nav className="flex gap-0">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => { setHistoryTab(t.key); setExpandedProduct(null); setHistorySearchTerm('') }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${historyTab === t.key ? t.active + ' border-current' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                    <span className={`text-[10px] font-semibold px-1 py-0.5 rounded-full ${historyTab === t.key ? t.badge : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      {historyData.filter(({ product: p }) =>
                        t.key === 'active' ? p.active && !p.archived :
                          t.key === 'inactive' ? !p.active && !p.archived : p.archived
                      ).filter(d => d.history.length > 0).length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Search and Sort in History Modal */}
            <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar produto pelo nome..."
                  value={historySearchTerm}
                  onChange={e => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="relative min-w-[160px]">
                <select
                  value={historySort}
                  onChange={e => setHistorySort(e.target.value as HistorySort)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="name">Ordenar por Nome</option>
                  <option value="price_asc">Menor Preço de Venda</option>
                  <option value="price_desc">Maior Preço de Venda</option>
                  <option value="profit_desc">Maior Lucro %</option>
                  <option value="profit_asc">Menor Lucro %</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <p className="text-sm text-gray-500">Carregando histórico...</p>
                </div>
              ) : historyFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                  <BarChart2 size={32} />
                  <p className="text-sm">Nenhum histórico de preços para esta categoria.</p>
                  <p className="text-xs text-gray-300">O rastreamento começa a partir da criação ou atualização do produto.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyFiltered.map(({ product, history }) => {
                    const isExpanded = expandedProduct === product.id
                    const latestSale = history.find(h => h.type === 'sale')
                    const latestPurchase = history.find(h => h.type === 'purchase')
                    return (
                      <div key={product.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                        {/* Product row (clickable) */}
                        <button
                          onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight size={14} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              {latestPurchase && <span className="text-xs text-purple-600 dark:text-purple-400">Compra: {fmt(latestPurchase.new_price)}</span>}
                              {latestSale && <span className="text-xs text-blue-600 dark:text-blue-400">Venda: {fmt(latestSale.new_price)}</span>}
                              {latestPurchase && latestSale && (() => {
                                const cost = Number(latestPurchase.new_price)
                                const sale = Number(latestSale.new_price)
                                if (cost > 0) {
                                  const diff = sale - cost
                                  const pct = (diff / cost) * 100
                                  const isProfit = diff >= 0
                                  return (
                                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${isProfit ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                                      {isProfit ? 'Lucro' : 'Prejuízo'}: {isProfit ? '+' : ''}{pct.toFixed(1).replace('.', ',')}%
                                    </span>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{history.length} reg.</span>
                        </button>

                        {/* Expanded history */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2 space-y-0.5">
                            {history.map(h => <HistoryRow key={h.id} h={h} />)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ REACTIVATE CONFIRMATION MODAL ════════════════════ */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-900/30">
                  <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Reativar Produtos Existentes</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Produtos inativos ou arquivados foram detectados</p>
                </div>
              </div>
              <button onClick={() => { setIsReactivateModalOpen(false); setReactivateCandidates([]) }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Os seguintes produtos já existem no banco de dados e estão <strong>Inativos</strong> ou <strong>Arquivados</strong>.
                Selecione individualmente quais você deseja <strong>reativar e atualizar</strong> com os dados da planilha. Os não selecionados serão mantidos em seu estado atual (inativos/arquivados) e suas linhas serão ignoradas na importação.
              </p>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {reactivateCandidates.map((cand, idx) => {
                  const p = cand.product
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={cand.selected}
                        onChange={e => {
                          const updated = [...reactivateCandidates]
                          updated[idx].selected = e.target.checked
                          setReactivateCandidates(updated)
                        }}
                        className="h-4.5 w-4.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                      <img
                        src={p.image || PRODUCT_IMAGE_FALLBACK}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0"
                        onError={e => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${p.archived ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}>
                            {p.archived ? 'Arquivado' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-500 mt-0.5">
                          <span>Preço: <span className="line-through text-gray-400">{fmt(p.price)}</span> → <strong className="text-green-600 dark:text-green-400">{fmt(cand.newPrice)}</strong></span>
                          {cand.newPurchasePrice !== null && (
                            <span>Custo: <span className="line-through text-gray-400">{fmt(p.purchase_price ?? null)}</span> → <strong className="text-purple-650 dark:text-purple-400">{fmt(cand.newPurchasePrice)}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800">
              <button
                onClick={() => {
                  setIsReactivateModalOpen(false)
                  setReactivateCandidates([])
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const idsToReactivate = new Set(
                    reactivateCandidates.filter(c => c.selected).map(c => c.product.id)
                  )
                  setIsReactivateModalOpen(false)
                  await executeImport(idsToReactivate, tempResolutions)
                }}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {isPriceRoundingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30"><Sparkles size={20} className="text-indigo-600" /></div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Arredondar preços</h2>
                  <p className="text-xs text-gray-500">{selectedIds.length ? `${selectedIds.length} produto(s) selecionado(s)` : 'Todos os produtos não arquivados'}</p>
                </div>
              </div>
              <button onClick={() => setIsPriceRoundingModalOpen(false)} disabled={isLoadingPriceRounding} className="p-2 text-gray-400"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Limite da margem de lucro</label>
                <div className="relative max-w-40">
                  <input type="number" min="0" max="99.99" step="0.01" value={priceRoundingThresholdInput} onChange={e => { setPriceRoundingThresholdInput(e.target.value); setPriceRoundingPreview(null) }} className="w-full px-3 py-2.5 pr-8 rounded-lg border dark:bg-gray-800 dark:text-white" />
                  <span className="absolute right-3 top-2.5 text-gray-400">%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <strong className="text-blue-700 dark:text-blue-300">Margem já protegida</strong>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">Usa o final comercial mais próximo para baixo, sem cruzar a margem mínima.</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <strong className="text-amber-700 dark:text-amber-300">Margem abaixo do limite</strong>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">Calcula primeiro o preço mínimo seguro e escolhe o próximo final comercial acima.</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Finais aceitos: <strong>,00</strong>, <strong>,50</strong>, <strong>,90</strong> e <strong>,99</strong>. A escolha é pela menor alteração possível, nunca aleatória.</p>

              <button onClick={loadPriceRoundingPreview} disabled={isLoadingPriceRounding} className="w-full py-2.5 rounded-xl border border-indigo-300 text-indigo-700 dark:text-indigo-300 font-semibold text-sm disabled:opacity-50">
                {isLoadingPriceRounding ? 'Calculando...' : 'Calcular prévia'}
              </button>

              {priceRoundingPreview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"><strong className="block text-lg">{priceRoundingPreview.updatedCount}</strong>alterações</div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20"><strong className="block text-lg">{priceRoundingPreview.roundedDown}</strong>para baixo</div>
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20"><strong className="block text-lg">{priceRoundingPreview.roundedUp}</strong>para cima</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    {(['00', '50', '90', '99'] as const).map(ending => (
                      <div key={ending} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                        <strong className="block text-sm">{priceRoundingPreview.endingCounts?.[ending] ?? 0}</strong>final ,{ending}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Ignorados: {priceRoundingPreview.skippedWithoutCost} sem custo/preço válido, {priceRoundingPreview.skippedPromoConflict} por conflito com promoção e {priceRoundingPreview.unchanged} já estavam em um final seguro.</p>
                  <div className="max-h-44 overflow-y-auto divide-y dark:divide-gray-800 border rounded-lg">
                    {priceRoundingPreview.updatedProducts.slice(0, 20).map(product => (
                      <div key={product.id} className="flex justify-between gap-3 p-2.5 text-xs">
                        <span className="truncate">{product.name} <span className="text-gray-400">({product.margin.toFixed(2)}%)</span></span>
                        <span className="font-semibold whitespace-nowrap">{fmt(product.oldPrice)} → {fmt(product.newPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t dark:border-gray-800 flex gap-3">
              <button onClick={() => setIsPriceRoundingModalOpen(false)} disabled={isLoadingPriceRounding} className="flex-1 py-2 rounded-xl border text-sm">Cancelar</button>
              <button onClick={handleApplyPriceRounding} disabled={isLoadingPriceRounding || !priceRoundingPreview || priceRoundingPreview.updatedCount === 0} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40">Aplicar arredondamento</button>
            </div>
          </div>
        </div>
      )}

      {/* Minimum margin modal */}
      {isMinimumMarginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30 shrink-0">
                  <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Margem minima</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Aumenta apenas produtos abaixo da meta</p>
                </div>
              </div>
              <button onClick={() => setIsMinimumMarginModalOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" disabled={isApplyingMinimumMargin}>
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                Informe a margem minima de lucro sobre o preco de venda. Produtos nao arquivados com custo cadastrado e margem atual menor que a meta terao o preco aumentado ate atingir a margem, com arredondamento sempre para cima.
              </p>

              {minimumMargin !== null && (
                <div className="p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Check size={14} className="shrink-0" />
                  <span>Margem minima atual: <strong>{minimumMargin}%</strong></span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Margem minima (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={minimumMarginInput}
                      onChange={(e) => setMinimumMarginInput(e.target.value)}
                      placeholder="Ex: 35"
                      min="0"
                      max="99.99"
                      step="0.01"
                      disabled={isApplyingMinimumMargin}
                      className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Arredondamento</label>
                  <select
                    value={minimumMarginRoundingMode}
                    onChange={(e) => setMinimumMarginRoundingMode(e.target.value as 'cents_up' | 'commercial_90_up' | 'commercial_99_up')}
                    disabled={isApplyingMinimumMargin}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="commercial_90_up">Comercial para cima (R$ x,90)</option>
                    <option value="commercial_99_up">Comercial para cima (R$ x,99)</option>
                    <option value="cents_up">Centavos para cima</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                Produtos acima da margem informada nao serao reduzidos. Produtos sem preco de compra tambem serao ignorados.
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row gap-3 bg-gray-50/50 dark:bg-gray-800">
              <button
                onClick={() => setIsMinimumMarginModalOpen(false)}
                disabled={isApplyingMinimumMargin}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyMinimumMargin}
                disabled={isApplyingMinimumMargin || minimumMarginInput.trim() === ''}
                className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                {isApplyingMinimumMargin ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>Aplicar margem</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════════ SIMILARITY WARNING MODAL ══════════════════════════ */}
      {isSimilarityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30">
                  <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Produtos Semelhantes Detectados</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verifique os produtos parecidos antes de importar</p>
                </div>
              </div>
              <button onClick={() => { setIsSimilarityModalOpen(false); resetImport() }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Os seguintes itens da planilha têm nomes parecidos com produtos ativos no banco de dados. Escolha a ação apropriada para cada um:
              </p>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {similarityMatches.map((match, idx) => {
                  const p = match.existingProduct
                  const similarityPct = Math.round(getStringSimilarity(match.importedName, p.name) * 100)
                  const priceIndex = importHeaders.indexOf(columnMapping.price)
                  const sheetPrice = match.importedRow && priceIndex !== -1 ? cleanPrice(match.importedRow[priceIndex]) : null
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                      {/* Comparison Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        {/* Imported item info */}
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Na Planilha</span>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate" title={match.importedName}>{match.importedName}</p>
                          <span className="text-xs text-gray-500 mt-1 block">Preço na planilha: {sheetPrice !== null ? fmt(sheetPrice) : '—'}</span>
                        </div>

                        {/* Database matching product */}
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                          <img
                            src={p.image || PRODUCT_IMAGE_FALLBACK}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0"
                            onError={e => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                              <span>No Banco</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full text-[9px]">{similarityPct}% semelhante</span>
                            </span>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate mt-0.5" title={p.name}>{p.name}</p>
                            <span className="text-xs text-gray-500">Preço atual: {fmt(p.price)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Resolution Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-gray-500 dark:text-gray-400">O que deseja fazer?</span>
                        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleMatchResolutionChange(idx, 'update')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${match.resolution === 'update' ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-205 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-55 dark:hover:bg-gray-700'}`}
                          >
                            Atualizar Existente
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMatchResolutionChange(idx, 'create')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${match.resolution === 'create' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-205 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-55 dark:hover:bg-gray-700'}`}
                          >
                            Criar Novo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMatchResolutionChange(idx, 'skip')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${match.resolution === 'skip' ? 'bg-gray-500 border-gray-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-205 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-55 dark:hover:bg-gray-700'}`}
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => {
                  setIsSimilarityModalOpen(false)
                  resetImport()
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar Importação
              </button>
              <button
                type="button"
                onClick={handleSimilarityConfirm}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Confirmar e Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ DATABASE DUPLICATES CLEANUP MODAL ════════════════ */}
      {isDbDuplicatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30">
                  <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Conflitos de Produtos Semelhantes</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verifique e resolva itens duplicados no seu catálogo</p>
                </div>
              </div>
              <button onClick={() => setIsDbDuplicatesOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {dbDuplicates.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mx-auto">
                    <Check size={48} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nenhum Conflito Encontrado</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Seu catálogo de produtos está livre de nomes semelhantes/duplicados!</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDbDuplicatesOpen(false)}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    Fechar Modal
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Os seguintes grupos de produtos possuem nomes muito parecidos. Você pode editá-los para diferenciar, desativá-los ou excluí-los permanentemente:
                  </p>

                  <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
                    {dbDuplicates.map((group, groupIdx) => {
                      const allProductsInGroup = [group.primaryProduct, ...group.similarProducts]
                      return (
                        <div key={groupIdx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm bg-gray-50/30 dark:bg-gray-800/20">
                          {/* Group Header */}
                          <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              Grupo {groupIdx + 1}: Semelhanças de &ldquo;{group.primaryProduct.name}&rdquo;
                            </h3>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              {allProductsInGroup.length} produtos
                            </span>
                          </div>

                          {/* Group Products List */}
                          <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {allProductsInGroup.map(p => {
                              return (
                                <div key={p.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                  {/* Left: Product Info */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <img
                                      src={p.image || PRODUCT_IMAGE_FALLBACK}
                                      alt={p.name}
                                      className="h-12 w-12 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0"
                                      onError={e => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate" title={p.name}>
                                        {p.name}
                                      </p>
                                      <div className="flex flex-wrap gap-2 items-center mt-1">
                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                          {p.category || 'Outros'}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                          Custo: {p.purchase_price != null ? fmt(p.purchase_price) : '—'} | Venda: {fmt(p.price)}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${loadingOrdersCount
                                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 animate-pulse'
                                          : (productsOrdersCount[p.id] || 0) > 0
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                          }`}>
                                          {loadingOrdersCount ? (
                                            'Carregando vendas...'
                                          ) : (
                                            `${productsOrdersCount[p.id] || 0} ${productsOrdersCount[p.id] === 1 ? 'venda' : 'vendas'}`
                                          )}
                                        </span>
                                      </div>
                                      {/* Timestamps */}
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                        {p.created_at && (
                                          <span>
                                            Criado em: <strong className="text-gray-600 dark:text-gray-300">{new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>
                                          </span>
                                        )}
                                        {p.updated_at && (
                                          <span>
                                            Atualizado: <strong className="text-gray-600 dark:text-gray-300">{new Date(p.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Status and Actions */}
                                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                                    {/* Status Toggler */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActive(p)}
                                      className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${p.active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200'}`}
                                      title={`Clique para ${p.active ? 'desativar' : 'ativar'}`}
                                    >
                                      {p.active ? 'Ativo' : 'Inativo'}
                                    </button>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                        title="Editar Produto"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(p.id)}
                                        disabled={deletingId === p.id}
                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                                        title="Excluir Produto"
                                      >
                                        {deletingId === p.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-gray-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsDbDuplicatesOpen(false)}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PRODUCT CREATE/EDIT MODAL ═════════════════════════ */}

      <ProductPdfExportModal
        isOpen={isPdfExportModalOpen}
        isExporting={isExportingPdf}
        onClose={() => setIsPdfExportModalOpen(false)}
        onExport={handleDownloadPDF}
        selectedIds={selectedIds}
      />

      <ProductExcelExportModal
        isOpen={isExcelExportModalOpen}
        onClose={() => setIsExcelExportModalOpen(false)}
        activeTab={activeTab}
        selectedIds={selectedIds}
      />

      <ProductFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        onReset={() => setAdvancedFilters(INITIAL_FILTERS_STATE)}
        categoriesToDisplay={categoriesToDisplay}
      />

      <ProductBulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedCount={selectedIds.length}
        suppliers={suppliers}
        activeTab={activeTab}
        onApplySupplier={async (supplierId) => {
          const target = supplierId === '__none__' ? null : supplierId
          const res = await productsService.assignSupplierBulk(selectedIds, target)
          toast.success(res.message || 'Fornecedor atualizado!')
          setSelectedIds([])
          await loadProducts()
        }}
        onApplyCategory={async (cat) => {
          const res = await productsService.bulkUpdateStatus(selectedIds, { category: cat })
          toast.success(res.message || 'Categoria atualizada!')
          setSelectedIds([])
          await loadProducts()
        }}
        onApplyMarketplaces={async (tags) => {
          let count = 0
          for (const id of selectedIds) {
            await productsService.update(id, { marketplace_tags: tags })
            count++
          }
          toast.success(`Marketplaces atualizados em ${count} produto(s).`)
          setSelectedIds([])
          await loadProducts()
        }}
        onApplyStatus={async (action) => {
          if (action === 'activate') await handleBulkActivate()
          else if (action === 'deactivate') await handleBulkDeactivate()
          else if (action === 'archive') await handleBulkArchive()
          else if (action === 'unarchive_active') await handleBulkUnarchive(true)
          else if (action === 'unarchive_inactive') await handleBulkUnarchive(false)
        }}
      />

      <AdminModal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        title={editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
        widthClass="max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            {/* Tab navigation indicators inside footer */}
            <div className="hidden sm:flex gap-1 text-[11px] text-gray-400 font-medium">
              Passo {activeModalTab === 'basic' ? '1' : activeModalTab === 'pricing' ? '2' : activeModalTab === 'details' ? '3' : '4'} de 4
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={closeProductModal}
                className="px-4 py-2 border border-gray-205 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs font-semibold"
                disabled={productFormLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={productFormLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs font-semibold shadow-sm shadow-green-600/10"
              >
                {productFormLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-1.5" size={14} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1.5" />
                    {editingProduct ? 'Salvar Produto' : 'Cadastrar Produto'}
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        {loadingProductDetails ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin text-green-500 w-10 h-10 mb-2" />
            <p className="text-xs text-gray-400">Carregando dados do produto...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Header */}
            <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {editingProduct ? 'Informações Técnicas & Preços' : 'Novo Cadastro de Produto'}
                </h3>
                <p className="text-[9px] text-gray-400 dark:text-gray-500">
                  {editingProduct ? 'Modifique as especificações técnicas, composição, estoque e preços para atualizar no sistema e planilhas.' : 'Preencha as especificações técnicas e regras de preço para registrar no catálogo de produtos.'}
                </p>
              </div>
            </div>
            {/* Step Tab Buttons */}
            <div className="flex flex-wrap border-b border-gray-100 dark:border-gray-800 pb-3 gap-2">
              {[
                { id: 'basic', label: '1. Informações Gerais', icon: <Sparkles size={14} /> },
                { id: 'images', label: `2. Galeria de Fotos (${productFormData.images.length})`, icon: <ImageIcon size={14} /> },
                { id: 'pricing', label: '3. Preços & Regras', icon: <Tag size={14} /> },
                { id: 'details', label: '4. Apresentação Visual', icon: <FileText size={14} /> },
                { id: 'technical', label: '5. Ficha Técnica (PDF)', icon: <AlertCircle size={14} /> },
                { id: 'fiscal', label: '6. Dados Fiscais (NF-e 55)', icon: <FileSpreadsheet size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeModalTab === tab.id
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200/30 dark:border-green-800/30 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {productFormError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">{productFormError}</p>
              </div>
            )}

            {productImageError && (
              <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/40 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">{productImageError}</p>
              </div>
            )}

            <form id="product-form" onSubmit={handleProductFormSubmit} className="space-y-6">

              {/* TAB 1: BASIC INFORMATION */}
              {activeModalTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Left Column: Input text fields */}
                  <div className="md:col-span-2 space-y-5">
                    <div>
                      <label htmlFor="product-name" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                        Nome do Produto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="product-name"
                        name="name"
                        value={productFormData.name}
                        onChange={handleProductFormChange}
                        required
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                        placeholder="Ex: Coenzima Q10 100mg"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="product-sku" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          SKU (Identificador Único)
                        </label>
                        <input
                          type="text"
                          id="product-sku"
                          name="sku"
                          value={productFormData.sku}
                          onChange={handleProductFormChange}
                          className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                          placeholder="Ex: CQ10-100MG"
                        />
                      </div>

                      <div>
                        <label htmlFor="product-quantity" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          Estoque / Quantidade (Planilha)
                        </label>
                        <input
                          type="text"
                          id="product-quantity"
                          name="quantity"
                          value={productFormData.quantity}
                          onChange={handleProductFormChange}
                          className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                          placeholder="Ex: 60 cápsulas, 100 ml"
                        />
                      </div>
                    </div>

                    {/* Category select block */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Categorias vinculadas
                      </label>
                      <div className="p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/80 dark:border-gray-800 grid grid-cols-2 gap-2">
                        {categoriesToDisplay.map(cat => {
                          const isChecked = productFormData.category.split(',').map(s => s.trim().toLowerCase()).includes(cat.toLowerCase())
                          return (
                            <label key={cat} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${isChecked
                                ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-medium'
                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                              }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const currentCats = productFormData.category.split(',').map(s => s.trim()).filter(Boolean)
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
                                  setProductFormData(prev => ({ ...prev, category: newCats.join(', ') }))
                                }}
                                className="h-3.5 w-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              {cat}
                            </label>
                          )
                        })}
                      </div>

                      {/* Custom Category */}
                      <div className="mt-2.5 flex gap-2">
                        <input
                          type="text"
                          placeholder="Criar nova categoria..."
                          value={newCatInput}
                          onChange={e => setNewCatInput(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewCat}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition-all border border-gray-200/50 dark:border-gray-700/50"
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>

                    {/* Marketplaces / Canais */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Canais de Venda / Marketplaces
                      </label>
                      <div className="p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/80 dark:border-gray-800 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(productFormData.marketplace_tags || 'site,mercado_livre,shopee').split(',').map(t => t.trim()).includes('site')}
                            onChange={e => handleMarketplaceTagToggle('site', e.target.checked)}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          🌐 Site Próprio
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(productFormData.marketplace_tags || 'site,mercado_livre,shopee').split(',').map(t => t.trim()).includes('shopee')}
                            onChange={e => handleMarketplaceTagToggle('shopee', e.target.checked)}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                          />
                          🟠 Shopee
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(productFormData.marketplace_tags || 'site,mercado_livre,shopee').split(',').map(t => t.trim()).includes('mercado_livre')}
                            onChange={e => handleMarketplaceTagToggle('mercado_livre', e.target.checked)}
                            className="h-4 w-4 rounded text-yellow-600 focus:ring-yellow-500"
                          />
                          💛 Mercado Livre
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Cover preview card & Status options */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                        <span>Capa do Produto</span>
                        <span className="text-[11px] font-bold text-green-600 dark:text-green-400">
                          {productFormData.images.length} {productFormData.images.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </label>
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 rounded-2xl flex flex-col items-center text-center space-y-3">
                        {productFormData.images.length > 0 || productFormData.image ? (
                          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm relative group">
                            <img
                              src={productsService.getImageUrl(productFormData.images[0] || productFormData.image)}
                              alt="Capa do produto"
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                            <span className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              CAPA
                            </span>
                          </div>
                        ) : (
                          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 bg-white dark:bg-gray-800/40">
                            <ImageIcon size={24} className="mb-1" />
                            <span className="text-[10px] font-semibold">Sem Capa</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveModalTab('images')}
                          className="w-full px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <ImageIcon size={14} />
                          <span>Gerenciar Fotos ({productFormData.images.length})</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 rounded-2xl space-y-3.5">
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status & Visibilidade</h4>

                      {/* Active Toggle Switch */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800/40 border border-gray-150/50 dark:border-gray-700 cursor-pointer select-none">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Produto Ativo no Catálogo</span>
                        <input
                          type="checkbox"
                          name="active"
                          checked={productFormData.active}
                          onChange={handleProductFormChange}
                          className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: IMAGES & GALLERY */}
              {activeModalTab === 'images' && (
                <div className="space-y-4">
                  <MultiImageUpload
                    values={productFormData.images}
                    onChange={(urls) => setProductFormData(prev => ({
                      ...prev,
                      images: urls,
                      image: urls[0] || ''
                    }))}
                    onError={(err) => setProductImageError(err || null)}
                    disabled={productFormLoading}
                  />
                </div>
              )}

              {/* TAB 2: PRICING & REGULATION */}
              {activeModalTab === 'pricing' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

                    {/* Purchase Price */}
                    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800 rounded-xl">
                      <label htmlFor="product-purchase_price" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Custo de Compra (R$)
                      </label>
                      <input
                        type="number"
                        id="product-purchase_price"
                        name="purchase_price"
                        value={productFormData.purchase_price}
                        onChange={(e) => handleProductPriceFieldChange('purchase_price', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="0,00"
                      />
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">Preço de custo unitário</p>
                    </div>

                    {/* Markup */}
                    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800 rounded-xl">
                      <label htmlFor="product-markup" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        Markup (%)
                      </label>
                      <input
                        type="number"
                        id="product-markup"
                        name="markup"
                        value={productFormData.markup}
                        onChange={(e) => handleProductPriceFieldChange('markup', e.target.value)}
                        min="0"
                        step="0.0001"
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        placeholder="Ex: 50"
                        disabled={!productFormData.purchase_price || Number(productFormData.purchase_price) <= 0}
                        title={(!productFormData.purchase_price || Number(productFormData.purchase_price) <= 0) ? "Preencha o Preço de Custo para usar markup" : ""}
                      />
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">Margem percentual multiplicada</p>
                    </div>

                    {/* Selling Price */}
                    <div className="p-3 bg-green-50/20 dark:bg-green-950/10 border border-green-100/50 dark:border-green-900/20 rounded-xl">
                      <label htmlFor="product-price" className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                        Preço de Venda (R$) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="product-price"
                        name="price"
                        value={productFormData.price}
                        onChange={(e) => handleProductPriceFieldChange('price', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-green-200 dark:border-green-800 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="0,00"
                      />
                      <p className="text-[9px] text-green-600 dark:text-green-500 mt-1">Valor final exibido ao público</p>
                    </div>

                    {/* Promotional Price */}
                    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="product-promo_price" className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                          Preço Promo (R$)
                        </label>
                        {productFormData.promo_price && (
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                            {Number(productFormData.promo_price) > Number(productFormData.price || 0)
                              ? 'Preço Âncora (De:)'
                              : 'Preço com Desconto'}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        id="product-promo_price"
                        name="promo_price"
                        value={productFormData.promo_price}
                        onChange={handleProductFormChange}
                        min="0"
                        step="0.01"
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Ex: 90,00 ou 29,90"
                      />
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">
                        {Number(productFormData.promo_price) > Number(productFormData.price || 0)
                          ? 'Será o preço antigo ("De:"). O cliente pagará o preço atual.'
                          : 'Vazio para desabilitar promoção.'}
                      </p>
                    </div>
                  </div>

                  {/* Promo Expiration & Duration Controls */}
                  {productFormData.promo_price && Number(productFormData.promo_price) > 0 && (
                    <div className="p-3.5 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                          <Clock size={15} />
                          <span className="text-xs font-bold">Temporizador da Promoção</span>
                        </div>
                        {productFormData.promo_ends_at && (
                          <button
                            type="button"
                            onClick={() => setProductFormData(prev => ({ ...prev, promo_ends_at: '' }))}
                            className="text-[10px] text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 underline"
                          >
                            Limpar prazo
                          </button>
                        )}
                      </div>

                      {/* Quick Duration Preset Buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '1 dia', days: 1 },
                          { label: '3 dias', days: 3 },
                          { label: '5 dias', days: 5 },
                          { label: '7 dias', days: 7 },
                          { label: '15 dias', days: 15 },
                          { label: '30 dias', days: 30 },
                        ].map((preset) => {
                          const targetDate = new Date()
                          targetDate.setDate(targetDate.getDate() + preset.days)
                          const pad = (n: number) => String(n).padStart(2, '0')
                          const isoLocal = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T23:59`
                          const isSelected = productFormData.promo_ends_at?.startsWith(isoLocal.slice(0, 10))

                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setProductFormData(prev => ({ ...prev, promo_ends_at: isoLocal }))}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Custom Datetime Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <label htmlFor="product-promo_ends_at" className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Data/Hora de término:
                        </label>
                        <input
                          type="datetime-local"
                          id="product-promo_ends_at"
                          name="promo_ends_at"
                          value={productFormData.promo_ends_at}
                          onChange={(e) => setProductFormData(prev => ({ ...prev, promo_ends_at: e.target.value }))}
                          className="px-2 py-1 text-xs border border-purple-200 dark:border-purple-800 dark:bg-gray-800 dark:text-white rounded-md focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      {/* Dynamic Preview of Promotion */}
                      {(() => {
                        const pricing = getProductPricing({
                          price: productFormData.price,
                          promo_price: productFormData.promo_price,
                          promo_ends_at: productFormData.promo_ends_at,
                        })
                        if (!pricing.isPromoActive) return null

                        return (
                          <div className="bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-lg border border-purple-150 dark:border-purple-900/30 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-800 dark:text-gray-200">
                                Visualização para o cliente:
                              </span>
                              <span className="font-extrabold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 rounded text-[10px] border border-green-200 dark:border-green-800">
                                {pricing.discountPercent}% OFF
                              </span>
                            </div>
                            <p className="mt-1 text-gray-600 dark:text-gray-300 text-[11px]">
                              De <span className="line-through text-gray-400">R$ {pricing.originalPrice?.toFixed(2).replace('.', ',')}</span> por <strong className="text-green-600 dark:text-green-400">R$ {pricing.effectivePrice.toFixed(2).replace('.', ',')}</strong>
                            </p>
                            {productFormData.promo_ends_at && (
                              <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                                <Clock size={11} />
                                Oferta válida até {new Date(productFormData.promo_ends_at).toLocaleString('pt-BR')} (voltará a R$ {Number(productFormData.price).toFixed(2).replace('.', ',')} após expirar)
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Profit Margin Widget Card */}
                  {productMarginInfo && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${productMarginInfo.isPositive
                        ? 'bg-green-50/30 dark:bg-green-950/10 border-green-150 dark:border-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-red-50/30 dark:bg-red-950/10 border-red-150 dark:border-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${productMarginInfo.isPositive ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'}`}>
                          {productMarginInfo.isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">Margem de Lucro Detectada</p>
                          <p className="text-[10px] opacity-80 mt-0.5">
                            Cálculo bruto baseado no custo de compra informado e no valor final de venda.
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold block">{productMarginInfo.margin}%</span>
                        <span className="text-[10px] font-semibold opacity-70">Lucro de R$ {productMarginInfo.profit} / un</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    {/* Target Audience */}
                    <div>
                      <label htmlFor="product-target_audience" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Público-alvo recomendado
                      </label>
                      <select
                        id="product-target_audience"
                        name="target_audience"
                        value={productFormData.target_audience}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                      >
                        <option value="unknown">Não informado / Geral</option>
                        <option value="unisex">Unissex</option>
                        <option value="female">Feminino</option>
                        <option value="male">Masculino</option>
                      </select>
                    </div>

                    {/* Free Shipping Option Box */}
                    <div className="flex items-end">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800/20 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 cursor-pointer select-none transition-all w-full">
                        <input
                          type="checkbox"
                          id="product-free_shipping"
                          name="free_shipping"
                          checked={productFormData.free_shipping}
                          onChange={handleProductFormChange}
                          className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Oferecer Frete Grátis</span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500">Este produto não terá cobrança de frete no envio</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DESCRIPTION & BENEFITS */}
              {activeModalTab === 'details' && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="product-description" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Descrição do Produto
                    </label>
                    <textarea
                      id="product-description"
                      name="description"
                      value={productFormData.description}
                      onChange={handleProductFormChange}
                      rows={5}
                      className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                      placeholder="Descreva o produto, benefícios genéricos e uso geral..."
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="product-benefits" className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Benefícios Principais (Destaques)
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Escreva um benefício por linha</span>
                    </div>
                    <textarea
                      id="product-benefits"
                      name="benefits"
                      value={productFormData.benefits}
                      onChange={handleProductFormChange}
                      rows={6}
                      className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm font-sans"
                      placeholder="Ex: &#10;Melhora a produção de energia celular&#10;Poderoso antioxidante protetor&#10;Auxilia na saúde cardiovascular"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: TECHNICAL / CATALOG INFO */}
              {activeModalTab === 'technical' && (
                <div className="space-y-5">
                  <div className="p-3.5 bg-green-50/20 dark:bg-green-950/10 border border-green-100/50 dark:border-green-900/20 rounded-xl">
                    <p className="text-[10px] text-green-700 dark:text-green-400 font-medium flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      As informações abaixo são exibidas no PDF de exportação técnica e sincronizadas com a planilha.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-primary-600 dark:text-primary-400" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Rótulo do produto</h4>
                    </div>
                    {!editingProduct ? (
                      <p className="text-xs text-amber-700 dark:text-amber-300">Cadastre o produto primeiro para depois vincular o arquivo do rótulo.</p>
                    ) : (
                      <div className="space-y-3">
                        {editingProduct.label_url && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Arquivo anexado</p>
                              <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">{editingProduct.label_original_name || 'Rótulo vinculado ao produto'}</p>
                            </div>
                            <div className="flex gap-2">
                              <a href={editingProduct.label_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">Abrir arquivo</a>
                              <button type="button" disabled={labelSaving} onClick={removeProductLabel} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400">Remover</button>
                            </div>
                          </div>
                        )}
                        {!editingProduct.label_url && (
                          <label className={`flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800 ${labelSaving ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}>
                            {labelSaving ? <Loader2 size={16} className="shrink-0 animate-spin text-primary-500" /> : <Upload size={16} className="shrink-0 text-gray-400" />}
                            <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                              {labelSaving ? `Enviando ${labelFile?.name || 'arquivo'}...` : 'Selecionar PDF ou imagem do rótulo'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={labelSaving}
                              onChange={event => {
                                const file = event.target.files?.[0] || null
                                event.target.value = ''
                                void uploadProductLabel(file)
                              }}
                            />
                          </label>
                        )}
                        <p className="text-[10px] text-gray-400">PDF, JPG, PNG ou WEBP, até 20 MB.</p>
                      </div>
                    )}
                  </div>

                  {/* 3 Intended columns row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="product-intended_form" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                        Forma Pretendida
                      </label>
                      <input
                        type="text"
                        id="product-intended_form"
                        name="intended_form"
                        value={productFormData.intended_form}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                        placeholder="Ex: Creme de uso tópico"
                      />
                      <span className="text-[9px] text-gray-400 mt-1 block font-normal">Insira 'Não se aplica' para ignorar no PDF</span>
                    </div>

                    <div>
                      <label htmlFor="product-intended_presentation" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                        Apresentação Pretendida
                      </label>
                      <input
                        type="text"
                        id="product-intended_presentation"
                        name="intended_presentation"
                        value={productFormData.intended_presentation}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                        placeholder="Ex: Bisnaga com 10 g"
                      />
                      <span className="text-[9px] text-gray-400 mt-1 block font-normal">Ex: Frasco com 30 ml, Pote 100g</span>
                    </div>

                    <div>
                      <label htmlFor="product-intended_units_per_dose" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                        Unidades por dose pretendida
                      </label>
                      <input
                        type="text"
                        id="product-intended_units_per_dose"
                        name="intended_units_per_dose"
                        value={productFormData.intended_units_per_dose}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                        placeholder="Ex: Não se aplica"
                      />
                      <span className="text-[9px] text-gray-400 mt-1 block font-normal">Ex: 1 cápsula por dose, 5g ao dia</span>
                      <span className="mt-1 block text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                        Para cápsulas, a produção recebe automaticamente a preferência verde e branca; se indisponível, toda branca.
                      </span>
                    </div>
                  </div>

                  <hr className="border-gray-150 dark:border-gray-800 my-4" />

                  {/* Formulation */}
                  <div>
                    <label htmlFor="product-compositions" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Formulação / Composição (Fórmula completa)
                    </label>
                    <textarea
                      id="product-compositions"
                      name="compositions"
                      value={productFormData.compositions}
                      onChange={handleProductFormChange}
                      rows={3}
                      className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                      placeholder="Ex: Vitamina D3 2000 UI, Zinco Quelato 15mg..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Indication */}
                    <div>
                      <label htmlFor="product-indication" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Indicação de Uso
                      </label>
                      <textarea
                        id="product-indication"
                        name="indication"
                        value={productFormData.indication}
                        onChange={handleProductFormChange}
                        rows={3}
                        className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                        placeholder="Informe as indicações recomendadas..."
                      />
                    </div>

                    {/* Contraindication */}
                    <div>
                      <label htmlFor="product-contraindication" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Contraindication
                      </label>
                      <textarea
                        id="product-contraindication"
                        name="contraindication"
                        value={productFormData.contraindication}
                        onChange={handleProductFormChange}
                        rows={3}
                        className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                        placeholder="Informe as contraindicações relevantes..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FISCAL FIELDS (NF-E MODEL 55) */}
              {activeModalTab === 'fiscal' && (
                <div className="space-y-5">
                  <div className="p-3 bg-[#065084]/10 dark:bg-[#065084]/30 border border-[#065084]/20 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">Regra de Elegibilidade NF-e:</span>
                      <span className="text-gray-600 dark:text-gray-300 ml-1.5">
                        O produto só estará apto para emissão de NF-e quando <strong>fiscal_validated = SIM</strong> e <strong>nfe_enabled = SIM</strong>.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Validação Fiscal Realizada? (fiscal_validated)
                      </label>
                      <select
                        name="fiscal_validated"
                        value={productFormData.fiscal_validated}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-medium"
                      >
                        <option value="NAO">NÃO — Pendente de validação</option>
                        <option value="SIM">SIM — Dados validados</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Habilitado para NF-e? (nfe_enabled)
                      </label>
                      <select
                        name="nfe_enabled"
                        value={productFormData.nfe_enabled}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-medium"
                      >
                        <option value="NAO">NÃO — Desabilitado</option>
                        <option value="SIM">SIM — Habilitado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Descrição Fiscal (max 120 caracteres)
                    </label>
                    <input
                      type="text"
                      name="fiscal_description"
                      value={productFormData.fiscal_description}
                      onChange={handleProductFormChange}
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Ex: Medicamento / Suplemento Nutricional..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        NCM (8 dígitos)
                      </label>
                      <input
                        type="text"
                        name="ncm"
                        value={productFormData.ncm}
                        onChange={handleProductFormChange}
                        maxLength={8}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-mono"
                        placeholder="30049099"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        CEST (7 dígitos - opcional)
                      </label>
                      <input
                        type="text"
                        name="cest"
                        value={productFormData.cest}
                        onChange={handleProductFormChange}
                        maxLength={7}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-mono"
                        placeholder="1300200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Origem da Mercadoria (0 a 8)
                      </label>
                      <select
                        name="origin"
                        value={productFormData.origin}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                      >
                        <option value={0}>0 - Nacional</option>
                        <option value={1}>1 - Estrangeira (Importação direta)</option>
                        <option value={2}>2 - Estrangeira (Adquirida no mercado interno)</option>
                        <option value={3}>3 - Nacional com mais de 40% conteúdo estrangeiro</option>
                        <option value={4}>4 - Nacional produzida conforme processos produtivos básicos</option>
                        <option value={5}>5 - Nacional com conteúdo estrangeiro menor que 40%</option>
                        <option value={6}>6 - Estrangeira (Importação direta sem similar nacional)</option>
                        <option value={7}>7 - Estrangeira (Mercado interno sem similar nacional)</option>
                        <option value={8}>8 - Nacional (Importação com conteúdo de importação superior a 70%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        CSOSN (Simples Nacional)
                      </label>
                      <input
                        type="text"
                        name="csosn"
                        value={productFormData.csosn}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-mono"
                        placeholder="102"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        CSOSN ST (Opcional)
                      </label>
                      <input
                        type="text"
                        name="csosn_st"
                        value={productFormData.csosn_st}
                        onChange={handleProductFormChange}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-mono"
                        placeholder="201"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">CFOP Estadual</label>
                      <input type="text" name="cfop_intra" value={productFormData.cfop_intra} onChange={handleProductFormChange} maxLength={4} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="5102" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">CFOP Interestadual</label>
                      <input type="text" name="cfop_inter" value={productFormData.cfop_inter} onChange={handleProductFormChange} maxLength={4} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="6108" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">CFOP ST Estadual</label>
                      <input type="text" name="cfop_intra_st" value={productFormData.cfop_intra_st} onChange={handleProductFormChange} maxLength={4} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="5405" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">CFOP ST Interestadual</label>
                      <input type="text" name="cfop_inter_st" value={productFormData.cfop_inter_st} onChange={handleProductFormChange} maxLength={4} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="6404" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PIS CST (2 dígitos)</label>
                      <input type="text" name="pis_cst" value={productFormData.pis_cst} onChange={handleProductFormChange} maxLength={2} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="49" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">COFINS CST (2 dígitos)</label>
                      <input type="text" name="cofins_cst" value={productFormData.cofins_cst} onChange={handleProductFormChange} maxLength={2} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="49" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Unidade Comercial</label>
                      <input type="text" name="unit" value={productFormData.unit} onChange={handleProductFormChange} maxLength={6} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white uppercase font-mono" placeholder="UN" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Unidade Tributável</label>
                      <input type="text" name="tax_unit" value={productFormData.tax_unit} onChange={handleProductFormChange} maxLength={6} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white uppercase font-mono" placeholder="UN" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Fator Conversão Tributária</label>
                      <input type="number" step="0.0001" name="tax_conversion_factor" value={productFormData.tax_conversion_factor} onChange={handleProductFormChange} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white" placeholder="1.0000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">GTIN / EAN (Código Barras)</label>
                      <input type="text" name="gtin" value={productFormData.gtin} onChange={handleProductFormChange} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="SEM GTIN ou EAN-13" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">GTIN Tributável</label>
                      <input type="text" name="tax_gtin" value={productFormData.tax_gtin} onChange={handleProductFormChange} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="SEM GTIN ou EAN-13" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Código Benefício Fiscal (cBenef)</label>
                      <input type="text" name="cbenef" value={productFormData.cbenef} onChange={handleProductFormChange} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white font-mono" placeholder="Ex: PR840000" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Observações Fiscais Internas</label>
                    <textarea name="fiscal_notes" value={productFormData.fiscal_notes} onChange={handleProductFormChange} rows={2} className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white" placeholder="Anotações internas sobre enquadramento fiscal deste produto..." />
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </AdminModal>

      <ProductImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadProducts}
      />
    </div>
  )
}
