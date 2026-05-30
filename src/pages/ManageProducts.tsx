import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Edit, Trash2, Loader2, Search, Upload,
  Archive, ArchiveRestore, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronRight, X, BarChart2, ShoppingCart, Tag,
  Sparkles, Check, AlertCircle
} from 'lucide-react'
import { productsService } from '../services/products.service'
import { Product, ProductPriceHistory } from '../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import * as XLSX from 'xlsx'
import { confirm, toast } from '../utils/toast'

type Tab = 'active' | 'inactive' | 'archived'

// ─── Column fields for import mapping ──────────────────────────────────────
const IMPORT_FIELDS = [
  { key: 'name',             label: 'Nome',                     required: true  },
  { key: 'price',            label: 'Preço de Venda',            required: true  },
  { key: 'purchase_price',   label: 'Preço de Compra',           required: false },
  { key: 'promo_price',      label: 'Preço Promocional',         required: false },
  { key: 'description',      label: 'Descrição',                 required: false },
  { key: 'category',         label: 'Categoria',                 required: false },
  { key: 'indication',       label: 'Indicação',                 required: false },
  { key: 'contraindication', label: 'Contraindicação',           required: false },
  { key: 'compositions',     label: 'Formulação / Composição',   required: false },
] as const

type FieldKey = typeof IMPORT_FIELDS[number]['key']

function autoDetect(headers: string[]): Record<FieldKey, string> {
  const m: Record<FieldKey, string> = {
    name: '', price: '', purchase_price: '', promo_price: '', description: '', category: '',
    indication: '', contraindication: '', compositions: '',
  }
  for (const h of headers) {
    const low = h.toLowerCase()
    if (!m.name           && (low.includes('nome') || low.includes('name') || low.includes('produto') || low.includes('product') || low === 'item' || low === 'titulo' || low === 'title')) m.name = h
    else if (!m.price     && (low.includes('venda') || low.includes('price') || low === 'preço' || low === 'preco')) m.price = h
    else if (!m.purchase_price && (low.includes('compra') || low.includes('custo') || low.includes('cost'))) m.purchase_price = h
    else if (!m.promo_price    && (low.includes('promo') || low.includes('promoc')))                  m.promo_price = h
    else if (!m.description    && (low.includes('desc') || low.includes('about') || low.includes('detalhe'))) m.description = h
    else if (!m.category       && (low.includes('cat') || low.includes('grupo')))                     m.category = h
    else if (!m.indication     && (low.includes('indica') || low.includes('indicação') || low.includes('indicacao'))) m.indication = h
    else if (!m.contraindication && (low.includes('contra') || low.includes('contraindicação') || low.includes('contraindicacao'))) m.contraindication = h
    else if (!m.compositions   && (low.includes('comp') || low.includes('form') || low.includes('composição') || low.includes('composicao') || low.includes('formula') || low.includes('fórmula'))) m.compositions = h
  }
  return m
}

// ─── Price history type labels ──────────────────────────────────────────────
const HISTORY_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sale:     { label: 'Venda',    color: 'text-blue-600 dark:text-blue-400',   icon: <Tag size={13} /> },
  purchase: { label: 'Compra',   color: 'text-purple-600 dark:text-purple-400', icon: <ShoppingCart size={13} /> },
  promo:    { label: 'Promo',    color: 'text-orange-600 dark:text-orange-400', icon: <Sparkles size={13} /> },
}

function fmt(v: number | null) {
  if (v == null) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
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
      {went === 'up'   && <span className="flex items-center gap-0.5 text-red-500   text-xs font-medium"><TrendingUp  size={13} />+{fmt(diff!)} {diffPct != null && `(+${diffPct.toFixed(1).replace('.', ',')}%)`}</span>}
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

// ─── Main component ─────────────────────────────────────────────────────────
export default function ManageProducts() {
  const navigate = useNavigate()
  const [products, setProducts]         = useState<Product[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [searchTerm, setSearchTerm]     = useState('')
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [selectedIds, setSelectedIds]   = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeTab, setActiveTab]       = useState<Tab>('active')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Import modal state ────────────────────────────────────────────────────
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importRows, setImportRows]       = useState<any[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<FieldKey, string>>({
    name: '', price: '', purchase_price: '', promo_price: '', description: '', category: '',
    indication: '', contraindication: '', compositions: '',
  })
  const [autoDetected, setAutoDetected] = useState<Record<FieldKey, boolean>>({
    name: false, price: false, purchase_price: false, promo_price: false, description: false, category: false,
    indication: false, contraindication: false, compositions: false,
  })
  const [isImporting, setIsImporting]   = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Reactivate modal state ────────────────────────────────────────────────
  const [reactivateCandidates, setReactivateCandidates] = useState<{
    product: Product;
    selected: boolean;
    newPrice: number;
    newPurchasePrice: number | null;
  }[]>([])
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false)

  // ── Price history modal state ─────────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen]     = useState(false)
  const [historyData, setHistoryData]          = useState<{
    product: { id: string; name: string; active: boolean; archived: boolean };
    history: ProductPriceHistory[];
  }[]>([])
  const [historyLoading, setHistoryLoading]    = useState(false)
  const [expandedProduct, setExpandedProduct]  = useState<string | null>(null)
  const [historyTab, setHistoryTab]            = useState<Tab>('active')
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

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      setProducts(await productsService.getAllForAdmin())
    } catch (e: any) { setError(e.message || 'Erro ao carregar produtos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { setSelectedIds([]); setSearchTerm('') }, [activeTab])

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
    }
    reader.readAsBinaryString(file)
  }

  const executeImport = async (idsToReactivate: Set<string>) => {
    setIsImporting(true)
    setImportProgress(0)
    let count = 0

    try {
      const cleanPrice = (v: any): number | null => {
        if (v === undefined || v === null || String(v).trim() === '') return null
        const cleanStr = String(v).replace(/r\$/i, '').replace(/\s/g, '').replace(',', '.')
        const n = parseFloat(cleanStr)
        return isNaN(n) ? null : n
      }

      const ni = importHeaders.indexOf(columnMapping.name)
      const pi = importHeaders.indexOf(columnMapping.price)

      const validRows = importRows.filter(r => {
        const nameVal = String(r[ni] ?? '').trim()
        const hasValidName = nameVal && nameVal.length >= 2 && !/^\d+$/.test(nameVal)
        const parsedPrice = cleanPrice(r[pi])
        return hasValidName && parsedPrice !== null && parsedPrice > 0
      })

      const seenNames = new Set<string>()
      const hasField = (field: FieldKey) => !!columnMapping[field]

      for (const row of validRows) {
        const get = (field: FieldKey) => {
          const col = columnMapping[field]; if (!col) return undefined
          const idx = importHeaders.indexOf(col); if (idx === -1) return undefined
          return row[idx]
        }
        const parseCategory = (v: any) => {
          if (!v) return undefined
          const parts = String(v).split(',')
          const mapped = parts.map(part => {
            const s = part.trim()
            if (!s) return ''
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
          }).filter(Boolean)
          const unique = Array.from(new Set(mapped))
          return unique.join(', ')
        }
        const name = String(get('name') ?? '').trim()
        const price = cleanPrice(get('price'))
        if (!name || name.length < 2 || /^\d+$/.test(name) || !price) continue
        const nameLower = name.toLowerCase()
        if (seenNames.has(nameLower)) continue
        seenNames.add(nameLower)

        const payload: any = {
          name,
          price,
        }

        if (hasField('description')) {
          const val = get('description')
          payload.description = val ? String(val).trim() : null
        }
        if (hasField('category')) {
          const val = get('category')
          payload.category = parseCategory(val)
        }
        if (hasField('indication')) {
          const val = get('indication')
          payload.indication = val ? String(val).trim() : null
        }
        if (hasField('contraindication')) {
          const val = get('contraindication')
          payload.contraindication = val ? String(val).trim() : null
        }
        if (hasField('compositions')) {
          const val = get('compositions')
          payload.compositions = val ? String(val).trim() : null
        }
        if (hasField('purchase_price')) {
          payload.purchase_price = cleanPrice(get('purchase_price'))
        }
        if (hasField('promo_price')) {
          payload.promo_price = cleanPrice(get('promo_price'))
        }

        // Check if product with same name already exists in active/inactive/archived list
        const existing = products.find(p => p.name.trim().toLowerCase() === nameLower)
        if (existing) {
          if (existing.archived || !existing.active) {
            if (idsToReactivate.has(existing.id)) {
              // Reactivate and update
              await productsService.update(existing.id, {
                ...payload,
                active: true,
                archived: false,
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
          // If it doesn't exist, create it
          await productsService.create({
            ...payload,
            active: true,
          })
          count++
        }
        
        setImportProgress(Math.round((count / validRows.length) * 100))
      }
      await loadProducts()
      setIsImportOpen(false)
      setIsReactivateModalOpen(false)
      resetImport()
      toast.success(`${count} produto(s) importado(s) com sucesso!`)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao importar')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportConfirm = async () => {
    if (!columnMapping.name || !columnMapping.price) return

    const cleanPrice = (v: any): number | null => {
      if (v === undefined || v === null || String(v).trim() === '') return null
      const cleanStr = String(v).replace(/r\$/i, '').replace(/\s/g, '').replace(',', '.')
      const n = parseFloat(cleanStr)
      return isNaN(n) ? null : n
    }

    const ni = importHeaders.indexOf(columnMapping.name)
    const pi = importHeaders.indexOf(columnMapping.price)

    const validRows = importRows.filter(r => {
      const nameVal = String(r[ni] ?? '').trim()
      const hasValidName = nameVal && nameVal.length >= 2 && !/^\d+$/.test(nameVal)
      const parsedPrice = cleanPrice(r[pi])
      return hasValidName && parsedPrice !== null && parsedPrice > 0
    })

    if (validRows.length === 0) {
      toast.warning('Nenhum produto válido encontrado para importação.')
      return
    }

    const seenReactivate = new Set<string>()
    const candidates = validRows.map(row => {
      const name = String(row[ni] ?? '').trim()
      const nameLower = name.toLowerCase()
      if (seenReactivate.has(nameLower)) return null
      seenReactivate.add(nameLower)
      const p = products.find(prod => prod.name.trim().toLowerCase() === nameLower && (prod.archived || !prod.active))
      if (!p) return null

      const getVal = (field: FieldKey) => {
        const col = columnMapping[field]; if (!col) return undefined
        const idx = importHeaders.indexOf(col); if (idx === -1) return undefined
        return row[idx]
      }
      const newPrice = cleanPrice(getVal('price')) || 0
      const newPurchasePrice = cleanPrice(getVal('purchase_price')) || null

      return {
        product: p,
        selected: true,
        newPrice,
        newPurchasePrice
      }
    }).filter((item): item is { product: Product; selected: boolean; newPrice: number; newPurchasePrice: number | null } => !!item)

    if (candidates.length > 0) {
      setReactivateCandidates(candidates)
      setIsReactivateModalOpen(true)
    } else {
      await executeImport(new Set())
    }
  }

  const resetImport = () => {
    setImportHeaders([]); setImportRows([]); setImportProgress(0)
    setColumnMapping({
      name: '', price: '', purchase_price: '', promo_price: '', description: '', category: '',
      indication: '', contraindication: '', compositions: '',
    })
    setAutoDetected({
      name: false, price: false, purchase_price: false, promo_price: false, description: false, category: false,
      indication: false, contraindication: false, compositions: false,
    })
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
      historyTab === 'active'   ? product.active && !product.archived :
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

  const handleBulkDelete = () => {
    if (!selectedIds.length) return
    confirm.show(
      `Excluir ${selectedIds.length} produto(s) selecionado(s)?\nProdutos sem pedidos serão excluídos permanentemente. Produtos com pedidos serão arquivados.`,
      async () => {
        try {
          setLoading(true)
          const result = await productsService.deleteBulk(selectedIds)
          setSelectedIds([])
          await loadProducts()
          const d = result as any
          if (d?.softDeleted > 0) {
            toast.success(`${d.hardDeleted ?? 0} excluído(s) permanentemente, ${d.softDeleted} arquivado(s).`)
          } else {
            toast.success(`${d.hardDeleted ?? selectedIds.length} produto(s) excluído(s) com sucesso.`)
          }
        } catch (e: any) {
          toast.error(e.message || 'Erro ao excluir produtos')
        } finally {
          setLoading(false)
        }
      },
      undefined,
      'Excluir',
      'Cancelar'
    )
  }

  const handleBulkUnarchive = () => {
    if (!selectedIds.length) return
    confirm.show(`Desarquivar ${selectedIds.length} produto(s)?`, async () => {
      try {
        setLoading(true)
        for (const id of selectedIds) {
          await productsService.update(id, { archived: false, active: false })
        }
        setSelectedIds([])
        await loadProducts()
        toast.success('Produtos desarquivados com sucesso.')
      } catch (e: any) {
        toast.error(e.message || 'Erro ao desarquivar produtos')
      } finally {
        setLoading(false)
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

  // ── Derived lists ─────────────────────────────────────────────────────────
  const activeProducts   = products.filter(p => p.active && !p.archived)
  const inactiveProducts = products.filter(p => !p.active && !p.archived)
  const archivedProducts = products.filter(p => p.archived)
  const tabProducts: Record<Tab, Product[]> = { active: activeProducts, inactive: inactiveProducts, archived: archivedProducts }
  const filteredProducts = tabProducts[activeTab].filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const TABS = [
    { key: 'active'   as Tab, label: 'Ativos',     count: activeProducts.length,   active: 'border-green-500 text-green-600 dark:text-green-400',  badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
    { key: 'inactive' as Tab, label: 'Inativos',   count: inactiveProducts.length, active: 'border-yellow-500 text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
    { key: 'archived' as Tab, label: 'Arquivados', count: archivedProducts.length, active: 'border-gray-500 text-gray-600 dark:text-gray-400',       badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  ]

  // ── Sub-renders ───────────────────────────────────────────────────────────
  const renderStatusBadge = (p: Product) => p.archived
    ? <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"><Archive size={11}/>Arquivado</span>
    : <button onClick={() => handleToggleActive(p)} className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${p.active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200'}`} title={`Clique para ${p.active ? 'desativar' : 'ativar'}`}>{p.active ? 'Ativo' : 'Inativo'}</button>

  const renderActions = (p: Product) => p.archived
    ? <div className="flex justify-end"><button onClick={() => handleUnarchive(p)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900" title="Desarquivar"><ArchiveRestore size={18}/></button></div>
    : <div className="flex justify-end space-x-2">
        <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900" title="Editar"><Edit size={18}/></button>
        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-red-600 dark:text-red-400 hover:text-red-900 disabled:opacity-50" title="Excluir">{deletingId === p.id ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>}</button>
      </div>

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">

        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={18} className="mr-1.5"/>Voltar
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* History button */}
            <button onClick={openHistory} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              <BarChart2 size={16}/>
              <span className="hidden sm:inline">Histórico de Preços</span>
            </button>
            {/* Add dropdown */}
            <div ref={dropdownRef} className="relative flex-1 sm:flex-none">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto">
                <Plus size={18} className="mr-1.5"/>Adicionar
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="py-1">
                    <button onClick={() => { navigate('/admin/products/create'); setIsDropdownOpen(false) }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Plus size={16} className="mr-2"/>Novo Produto
                    </button>
                    <button onClick={() => { setIsImportOpen(true); setIsDropdownOpen(false) }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Upload size={16} className="mr-2"/>Importar Excel/CSV
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
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.key ? t.active + ' border-current' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                {t.label}
                {t.count > 0 && <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? t.badge : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{t.count}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Archived notice */}
        {activeTab === 'archived' && (
          <div className="mb-4 flex items-start gap-3 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
            <Archive size={15} className="mt-0.5 flex-shrink-0 text-gray-400"/>
            <span>Produtos arquivados possuem pedidos vinculados. Você pode <strong>desarquivá-los</strong> para movê-los para <em>Inativos</em>.</span>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
            <input type="text" placeholder="Buscar produtos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"/>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-600 w-12 h-12"/></div>}
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
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{selectedIds.length} produto(s) selecionado(s)</span>
                {activeTab === 'archived'
                  ? <button onClick={handleBulkUnarchive} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"><ArchiveRestore size={15}/>Desarquivar Selecionados</button>
                  : <button onClick={handleBulkDelete}    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"><Trash2 size={15}/>Excluir Selecionados</button>
                }
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={e => setSelectedIds(e.target.checked ? filteredProducts.map(p => p.id) : [])} className="h-4 w-4 text-primary-600 border-gray-300 rounded"/>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Produto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Compra</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Venda</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhum produto encontrado.</td></tr>
                    ) : filteredProducts.map(p => (
                      <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors ${p.archived ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, p.id] : selectedIds.filter(x => x !== p.id))} className="h-4 w-4 text-primary-600 border-gray-300 rounded"/>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={p.image} alt={p.name} className={`h-10 w-10 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0 ${p.archived ? 'grayscale' : ''}`} onError={e => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}/>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                {p.name}{p.archived && <Archive size={12} className="text-gray-400"/>}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{p.description || 'Sem descrição'}</div>
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
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {p.purchase_price != null ? <span className="text-purple-700 dark:text-purple-400 font-medium">{fmt(p.purchase_price)}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(p.price)}</td>
                        <td className="px-4 py-3">{renderStatusBadge(p)}</td>
                        <td className="px-4 py-3 text-right">{renderActions(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto encontrado.</p>
                </div>
              ) : filteredProducts.map(p => (
                <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${p.archived ? 'opacity-75' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, p.id] : selectedIds.filter(x => x !== p.id))} className="h-5 w-5 text-primary-600 border-gray-300 rounded mt-1 flex-shrink-0"/>
                    <img src={p.image} alt={p.name} className={`h-16 w-16 rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5 flex-shrink-0 ${p.archived ? 'grayscale' : ''}`} onError={e => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}/>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 break-words flex items-center gap-1.5">
                        {p.name}{p.archived && <Archive size={12} className="text-gray-400 flex-shrink-0"/>}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-300 mb-2 line-clamp-2">{p.description || 'Sem descrição'}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {(p.category || 'outros').split(',').map(cat => {
                          const c = cat.trim();
                          return (
                            <span key={c} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {c.charAt(0).toUpperCase() + c.slice(1)}
                            </span>
                          );
                        })}
                        {renderStatusBadge(p)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {p.purchase_price != null && <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Compra: {fmt(p.purchase_price)}</span>}
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Venda: {fmt(p.price)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.archived
                            ? <button onClick={() => handleUnarchive(p)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Desarquivar"><ArchiveRestore size={16}/></button>
                            : <>
                                <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50" title="Excluir">{deletingId === p.id ? <Loader2 className="animate-spin w-4 h-4"/> : <Trash2 size={16}/>}</button>
                              </>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ IMPORT MODAL ═══════════════════════════════════════ */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30">
                  <Upload size={20} className="text-green-600 dark:text-green-400"/>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Importar Produtos</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Excel (.xlsx, .xls) ou CSV</p>
                </div>
              </div>
              <button onClick={() => { setIsImportOpen(false); resetImport() }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18}/>
              </button>
            </div>

            <div className="p-5">
              {/* Step 1: File drop area */}
              {importHeaders.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-10 flex flex-col items-center gap-4 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all group"
                >
                  <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                    <Upload size={28} className="text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors"/>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Suporta .xlsx, .xls, .csv</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden"/>
                </div>
              ) : isImporting ? (
                /* Importing progress */
                <div className="text-center py-8">
                  <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-4"/>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Importando produtos...</p>
                  <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}/>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{importProgress}%</p>
                </div>
              ) : (
                /* Step 2: Column mapping */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vincular Colunas</p>
                      <p className="text-xs text-gray-400">{importRows.length} linha(s) detectada(s)</p>
                    </div>
                    <button onClick={resetImport} className="text-xs text-gray-400 hover:text-gray-600 underline">Trocar arquivo</button>
                  </div>

                  <div className="space-y-2">
                    {IMPORT_FIELDS.map(field => {
                      const detected = autoDetected[field.key]
                      const hasValue = !!columnMapping[field.key]
                      return (
                        <div key={field.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${field.required && !hasValue ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' : hasValue ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{field.label}</span>
                              {field.required && <span className="text-[10px] text-red-500">*obrigatório</span>}
                              {detected && hasValue && (
                                <span className="flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400 font-medium">
                                  <Sparkles size={10}/>auto
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative min-w-[180px]">
                            <select
                              value={columnMapping[field.key]}
                              onChange={e => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className={`w-full text-xs rounded-lg border px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${hasValue ? 'border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                            >
                              <option value="">— Não vincular —</option>
                              {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                          </div>
                          {hasValue
                            ? <Check size={15} className="text-green-500 flex-shrink-0"/>
                            : <AlertCircle size={15} className={`flex-shrink-0 ${field.required ? 'text-red-400' : 'text-gray-300 dark:text-gray-600'}`}/>
                          }
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setIsImportOpen(false); resetImport() }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={!columnMapping.name || !columnMapping.price}
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
                  <BarChart2 size={20} className="text-blue-600 dark:text-blue-400"/>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Histórico de Preços</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe variações de compra, venda e promo</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18}/>
              </button>
            </div>

            {/* Legend */}
            <div className="px-5 pt-3 pb-0 flex items-center gap-4 flex-shrink-0">
              {Object.entries(HISTORY_TYPE_LABELS).map(([k, v]) => (
                <span key={k} className={`flex items-center gap-1 text-xs font-medium ${v.color}`}>{v.icon}{v.label}</span>
              ))}
              <span className="ml-auto flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-0.5 text-red-500"><TrendingUp size={12}/>subiu</span>
                <span className="flex items-center gap-0.5 text-green-500"><TrendingDown size={12}/>baixou</span>
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
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={32} className="animate-spin text-blue-500"/>
                  <p className="text-sm text-gray-500">Carregando histórico...</p>
                </div>
              ) : historyFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                  <BarChart2 size={32}/>
                  <p className="text-sm">Nenhum histórico de preços para esta categoria.</p>
                  <p className="text-xs text-gray-300">O rastreamento começa a partir da criação ou atualização do produto.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyFiltered.map(({ product, history }) => {
                    const isExpanded = expandedProduct === product.id
                    const latestSale     = history.find(h => h.type === 'sale')
                    const latestPurchase = history.find(h => h.type === 'purchase')
                    return (
                      <div key={product.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                        {/* Product row (clickable) */}
                        <button
                          onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight size={14} className="text-gray-400"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              {latestPurchase && <span className="text-xs text-purple-600 dark:text-purple-400">Compra: {fmt(latestPurchase.new_price)}</span>}
                              {latestSale     && <span className="text-xs text-blue-600 dark:text-blue-400">Venda: {fmt(latestSale.new_price)}</span>}
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
                            {history.map(h => <HistoryRow key={h.id} h={h}/>)}
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
                  <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400"/>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Reativar Produtos Existentes</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Produtos inativos ou arquivados foram detectados</p>
                </div>
              </div>
              <button onClick={() => { setIsReactivateModalOpen(false); setReactivateCandidates([]) }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18}/>
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
                  await executeImport(idsToReactivate)
                }}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
