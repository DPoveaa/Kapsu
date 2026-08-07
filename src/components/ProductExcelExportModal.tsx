import { useState, useEffect } from 'react'
import {
  Download, Filter, Store, Sparkles, Settings,
  X, Star, Save, Plus, RotateCcw, Trash2, Edit3, Layers
} from 'lucide-react'
import * as XLSX from 'xlsx'
import AdminModal from './AdminModal'
import { productsService } from '../services/products.service'
import { toast } from '../utils/toast'

export interface ProductExcelExportModalProps {
  isOpen: boolean
  onClose: () => void
  activeTab?: 'active' | 'inactive' | 'archived'
  selectedIds?: string[]
}

interface ExportColumnDef {
  key: string
  label: string
  displayName: string
  category: string
  defaultSelected: boolean
  getValue: (p: any) => any
  width?: number
}

export interface ExportPreset {
  id: string
  name: string
  isSystem?: boolean
  columns: string[]
}

const ALL_COLUMNS: ExportColumnDef[] = [
  // --- Category: Identificação & Canais ---
  { key: 'codigo_produto', label: 'Código do Produto / SKU (codigo_produto)', displayName: 'Código do Produto (SKU / ID)', category: '📌 Identificação & Canais', defaultSelected: true, getValue: p => p.sku || p.id, width: 25 },
  { key: 'nome_produto', label: 'Nome do Produto (nome_produto)', displayName: 'Nome do Produto', category: '📌 Identificação & Canais', defaultSelected: true, getValue: p => p.name, width: 36 },
  {
    key: 'marketplaces',
    label: 'Canais / Marketplaces (marketplaces)',
    displayName: 'Canais / Marketplaces',
    category: '📌 Identificação & Canais',
    defaultSelected: true,
    getValue: p => {
      const tags = (p.marketplace_tags ?? 'site,mercado_livre,shopee').split(',').map((t: string) => t.trim())
      const names: string[] = []
      if (tags.includes('site')) names.push('Site')
      if (tags.includes('mercado_livre')) names.push('Mercado Livre')
      if (tags.includes('shopee')) names.push('Shopee')
      return names.join(', ')
    },
    width: 28
  },
  { key: 'category', label: 'Categoria na Loja (category)', displayName: 'Categoria na Loja', category: '📌 Identificação & Canais', defaultSelected: true, getValue: p => p.category || '', width: 24 },
  { key: 'status', label: 'Status do Produto (status)', displayName: 'Status (Ativo/Inativo/Arquivado)', category: '📌 Identificação & Canais', defaultSelected: true, getValue: p => p.archived ? 'Arquivado' : p.active ? 'Ativo' : 'Inativo', width: 18 },
  { key: 'sku', label: 'Código SKU (sku)', displayName: 'Código SKU', category: '📌 Identificação & Canais', defaultSelected: true, getValue: p => p.sku || '', width: 20 },
  { key: 'id', label: 'ID Interno UUID (id)', displayName: 'ID Interno (UUID)', category: '📌 Identificação & Canais', defaultSelected: true, getValue: p => p.id, width: 38 },

  // --- Category: Dados Fiscais (NF-e 55) ---
  { key: 'fiscal_description', label: 'Descrição Fiscal NF-e (fiscal_description)', displayName: 'Descrição Fiscal (max 120 char)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.fiscal_description || '', width: 36 },
  { key: 'ncm', label: 'Código NCM 8 dígitos (ncm)', displayName: 'Código NCM (8 dígitos)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.ncm || '', width: 14 },
  { key: 'cest', label: 'Código CEST 7 dígitos (cest)', displayName: 'Código CEST (7 dígitos)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cest || '', width: 14 },
  { key: 'origin', label: 'Origem da Mercadoria (origin)', displayName: 'Origem da Mercadoria (0 a 8)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.origin ?? 0, width: 14 },
  { key: 'csosn', label: 'CSOSN Simples Nacional (csosn)', displayName: 'CSOSN Simples Nacional', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.csosn || '', width: 14 },
  { key: 'csosn_st', label: 'CSOSN ST (csosn_st)', displayName: 'CSOSN Substituição Tributária', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.csosn_st || '', width: 16 },
  { key: 'cfop_intra', label: 'CFOP Estadual Venda (cfop_intra)', displayName: 'CFOP Estadual (Venda Interna)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cfop_intra || '', width: 16 },
  { key: 'cfop_inter', label: 'CFOP Interestadual Venda (cfop_inter)', displayName: 'CFOP Interestadual (Interestadual)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cfop_inter || '', width: 16 },
  { key: 'cfop_intra_st', label: 'CFOP ST Estadual (cfop_intra_st)', displayName: 'CFOP ST Estadual', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cfop_intra_st || '', width: 16 },
  { key: 'cfop_inter_st', label: 'CFOP ST Interestadual (cfop_inter_st)', displayName: 'CFOP ST Interestadual', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cfop_inter_st || '', width: 16 },
  { key: 'pis_cst', label: 'PIS CST 2 dígitos (pis_cst)', displayName: 'PIS CST (2 dígitos)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.pis_cst || '', width: 12 },
  { key: 'cofins_cst', label: 'COFINS CST 2 dígitos (cofins_cst)', displayName: 'COFINS CST (2 dígitos)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cofins_cst || '', width: 12 },
  { key: 'unit', label: 'Unidade Comercial (unit)', displayName: 'Unidade Comercial (Ex: UN)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.unit || 'UN', width: 12 },
  { key: 'tax_unit', label: 'Unidade Tributável (tax_unit)', displayName: 'Unidade Tributável (Ex: UN)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.tax_unit || '', width: 12 },
  { key: 'tax_conversion_factor', label: 'Fator Conversão Tributária (tax_conversion_factor)', displayName: 'Fator Conversão Tributária', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.tax_conversion_factor ?? 1, width: 22 },
  { key: 'gtin', label: 'GTIN / EAN Código de Barras (gtin)', displayName: 'GTIN / EAN Código de Barras', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.gtin || '', width: 18 },
  { key: 'tax_gtin', label: 'GTIN Tributável (tax_gtin)', displayName: 'GTIN Tributável', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.tax_gtin || '', width: 18 },
  { key: 'cbenef', label: 'Código Benefício Fiscal (cbenef)', displayName: 'Código Benefício Fiscal (cBenef)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.cbenef || '', width: 16 },
  { key: 'fiscal_validated', label: 'Validação Fiscal Realizada (fiscal_validated)', displayName: 'Validação Fiscal Realizada (SIM/NAO)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.fiscal_validated || 'NAO', width: 20 },
  { key: 'fiscal_validated_at', label: 'Data Validação Fiscal (fiscal_validated_at)', displayName: 'Data/Hora da Validação Fiscal', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => formatExportDate(p.fiscal_validated_at), width: 22 },
  { key: 'fiscal_validated_by', label: 'Admin Validação (fiscal_validated_by)', displayName: 'Admin Responsável pela Validação', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.fiscal_validated_by || '', width: 24 },
  { key: 'fiscal_notes', label: 'Observações Fiscais Internas (fiscal_notes)', displayName: 'Observações Fiscais Internas', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.fiscal_notes || '', width: 36 },
  { key: 'nfe_enabled', label: 'Habilitado Emissão NF-e (nfe_enabled)', displayName: 'Habilitado Emissão NF-e (SIM/NAO)', category: '🏛️ Dados Fiscais (NF-e 55)', defaultSelected: true, getValue: p => p.nfe_enabled || 'NAO', width: 18 },

  // --- Category: Preços & Comercial ---
  { key: 'purchase_price', label: 'Preço de Custo R$ (purchase_price)', displayName: 'Preço de Custo (R$)', category: '💰 Preços & Comercial', defaultSelected: true, getValue: p => p.purchase_price != null ? Number(p.purchase_price) : '', width: 18 },
  { key: 'price', label: 'Preço de Venda R$ (price)', displayName: 'Preço de Venda (R$)', category: '💰 Preços & Comercial', defaultSelected: true, getValue: p => p.price != null ? Number(p.price) : '', width: 16 },
  { key: 'promo_price', label: 'Preço Promocional R$ (promo_price)', displayName: 'Preço Promocional (R$)', category: '💰 Preços & Comercial', defaultSelected: true, getValue: p => p.promo_price != null ? Number(p.promo_price) : '', width: 16 },
  { key: 'markup', label: 'Markup % (markup)', displayName: 'Margem Markup %', category: '💰 Preços & Comercial', defaultSelected: true, getValue: p => p.markup != null ? Number(p.markup) : '', width: 14 },
  { key: 'free_shipping', label: 'Frete Grátis (free_shipping)', displayName: 'Frete Grátis (Sim/Não)', category: '💰 Preços & Comercial', defaultSelected: true, getValue: p => p.free_shipping ? 'Sim' : 'Não', width: 14 },

  // --- Category: Ficha Técnica & Apresentação ---
  { key: 'description', label: 'Descrição do Produto (description)', displayName: 'Descrição Completa', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.description || '', width: 48 },
  { key: 'image', label: 'Link da Imagem Principal (image)', displayName: 'Link da Imagem Principal', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.image ? productsService.getImageUrl(p.image) : '', width: 60 },
  { key: 'compositions', label: 'Formulação / Composição (compositions)', displayName: 'Formulação / Composição', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.compositions || '', width: 48 },
  { key: 'indication', label: 'Indicação de Uso (indication)', displayName: 'Indicação de Uso', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.indication || '', width: 42 },
  { key: 'contraindication', label: 'Contraindicações (contraindication)', displayName: 'Contraindicações', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.contraindication || '', width: 42 },
  { key: 'benefits', label: 'Benefícios e Atributos (benefits)', displayName: 'Benefícios e Atributos', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.benefits || '', width: 48 },
  { key: 'intended_form', label: 'Forma Farmacêutica (intended_form)', displayName: 'Forma Farmacêutica (Cápsula, Gota...)', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.intended_form || '', width: 28 },
  { key: 'intended_presentation', label: 'Apresentação (intended_presentation)', displayName: 'Apresentação (Frasco 60 caps...)', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.intended_presentation || '', width: 28 },
  { key: 'intended_units_per_dose', label: 'Unidades por Dose (intended_units_per_dose)', displayName: 'Unidades por Dose', category: '🔬 Ficha Técnica & Apresentação', defaultSelected: true, getValue: p => p.intended_units_per_dose || '', width: 28 },

  // --- Category: Metadados & Sistema ---
  { key: 'created_at', label: 'Data de Cadastro (created_at)', displayName: 'Data de Cadastro', category: '📅 Metadados & Sistema', defaultSelected: true, getValue: p => formatExportDate(p.created_at), width: 22 },
  { key: 'updated_at', label: 'Data de Atualização (updated_at)', displayName: 'Data de Atualização', category: '📅 Metadados & Sistema', defaultSelected: true, getValue: p => formatExportDate(p.updated_at), width: 22 },
]

const DEFAULT_PRESETS: ExportPreset[] = [
  {
    id: 'fiscal',
    name: 'Dados Fiscais (NF-e 55)',
    isSystem: true,
    columns: [
      'codigo_produto', 'nome_produto', 'marketplaces', 'fiscal_description',
      'ncm', 'cest', 'origin', 'csosn', 'csosn_st', 'cfop_intra', 'cfop_inter',
      'cfop_intra_st', 'cfop_inter_st', 'pis_cst', 'cofins_cst', 'unit',
      'tax_unit', 'tax_conversion_factor', 'gtin', 'tax_gtin', 'cbenef',
      'fiscal_validated', 'fiscal_validated_at', 'fiscal_validated_by',
      'fiscal_notes', 'nfe_enabled'
    ]
  },
  {
    id: 'pricing',
    name: 'Preços & Margens',
    isSystem: true,
    columns: [
      'codigo_produto', 'nome_produto', 'purchase_price', 'price', 'promo_price',
      'markup', 'category', 'status'
    ]
  },
  {
    id: 'marketplaces',
    name: 'Marketplaces & Canais',
    isSystem: true,
    columns: [
      'codigo_produto', 'nome_produto', 'marketplaces', 'sku', 'price',
      'promo_price', 'status', 'free_shipping'
    ]
  },
  {
    id: 'technical',
    name: 'Ficha Técnica & Produto',
    isSystem: true,
    columns: [
      'codigo_produto', 'nome_produto', 'category', 'description', 'compositions',
      'indication', 'contraindication', 'benefits', 'intended_form',
      'intended_presentation', 'intended_units_per_dose'
    ]
  },
  {
    id: 'all',
    name: 'Todos os Campos',
    isSystem: true,
    columns: ALL_COLUMNS.map(c => c.key)
  }
]

function formatExportDate(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('pt-BR')
}

export default function ProductExcelExportModal({ isOpen, onClose, activeTab = 'active', selectedIds = [] }: ProductExcelExportModalProps) {
  const [exportSelectionMode, setExportSelectionMode] = useState<'selected' | 'all'>('all')
  const [includeActive, setIncludeActive] = useState(true)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)

  const [includeSite, setIncludeSite] = useState(true)
  const [includeML, setIncludeML] = useState(true)
  const [includeShopee, setIncludeShopee] = useState(true)

  // Presets State
  const [presets, setPresets] = useState<ExportPreset[]>(DEFAULT_PRESETS)
  const [defaultPresetId, setDefaultPresetId] = useState<string>('fiscal')
  const [activePresetId, setActivePresetId] = useState<string>('fiscal')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    DEFAULT_PRESETS[0].columns
  )
  const [isExporting, setIsExporting] = useState(false)

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  // Unique Categories
  const categories = Array.from(new Set(ALL_COLUMNS.map(c => c.category)))

  // Load saved presets and default setting on modal open
  useEffect(() => {
    if (isOpen) {
      setExportSelectionMode(selectedIds && selectedIds.length > 0 ? 'selected' : 'all')
      setIncludeActive(activeTab === 'active')
      setIncludeInactive(activeTab === 'inactive')
      setIncludeArchived(activeTab === 'archived')

      // Load presets from localStorage
      let savedPresets: ExportPreset[] = DEFAULT_PRESETS
      try {
        const stored = localStorage.getItem('kapsu_export_presets')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            savedPresets = parsed
          }
        }
      } catch (err) {
        console.error('Erro ao ler modelos salvos:', err)
      }
      setPresets(savedPresets)

      // Load default preset ID
      let savedDefaultId = 'fiscal'
      try {
        const storedDefault = localStorage.getItem('kapsu_default_export_preset')
        if (storedDefault && savedPresets.some(p => p.id === storedDefault)) {
          savedDefaultId = storedDefault
        }
      } catch (err) {
        console.error('Erro ao ler modelo padrão:', err)
      }
      setDefaultPresetId(savedDefaultId)
      setActivePresetId(savedDefaultId)

      const initialPreset = savedPresets.find(p => p.id === savedDefaultId) || savedPresets[0] || DEFAULT_PRESETS[0]
      setSelectedColumns([...initialPreset.columns])

      setIsEditMode(false)
      setIsCreatingNew(false)
      setNewPresetName('')
    }
  }, [isOpen, activeTab, selectedIds])

  const handleSelectPreset = (presetId: string) => {
    const target = presets.find(p => p.id === presetId)
    if (!target) return
    setActivePresetId(presetId)
    setSelectedColumns([...target.columns])
  }

  const handleSaveActivePreset = () => {
    if (selectedColumns.length === 0) {
      toast.error('Selecione pelo menos uma coluna para o modelo.')
      return
    }

    const updated = presets.map(p => {
      if (p.id === activePresetId) {
        return { ...p, columns: [...selectedColumns] }
      }
      return p
    })

    setPresets(updated)
    try {
      localStorage.setItem('kapsu_export_presets', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }

    const currentName = presets.find(p => p.id === activePresetId)?.name
    toast.success(`Modelo "${currentName}" atualizado com as colunas selecionadas!`)
  }

  const handleSetAsDefault = (presetId: string) => {
    setDefaultPresetId(presetId)
    try {
      localStorage.setItem('kapsu_default_export_preset', presetId)
    } catch (e) {
      console.error(e)
    }
    const targetName = presets.find(p => p.id === presetId)?.name
    toast.success(`Modelo "${targetName}" definido como o padrão de exportação!`)
  }

  const handleConfirmCreateNew = () => {
    if (!newPresetName.trim()) {
      toast.error('Digite um nome para o novo modelo.')
      return
    }
    if (selectedColumns.length === 0) {
      toast.error('Selecione pelo menos uma coluna para o modelo.')
      return
    }

    const newPreset: ExportPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      isSystem: false,
      columns: [...selectedColumns],
    }

    const updated = [...presets, newPreset]
    setPresets(updated)
    try {
      localStorage.setItem('kapsu_export_presets', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }

    setActivePresetId(newPreset.id)
    setNewPresetName('')
    setIsCreatingNew(false)
    toast.success(`Novo modelo "${newPreset.name}" criado com sucesso!`)
  }

  const handleDeletePreset = () => {
    const target = presets.find(p => p.id === activePresetId)
    if (!target || target.isSystem) {
      toast.error('Modelos originais do sistema não podem ser excluídos.')
      return
    }

    const updated = presets.filter(p => p.id !== activePresetId)
    setPresets(updated)
    try {
      localStorage.setItem('kapsu_export_presets', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }

    const fallbackPreset = updated[0] || DEFAULT_PRESETS[0]
    setActivePresetId(fallbackPreset.id)
    setSelectedColumns([...fallbackPreset.columns])

    if (defaultPresetId === activePresetId) {
      setDefaultPresetId(fallbackPreset.id)
      try {
        localStorage.setItem('kapsu_default_export_preset', fallbackPreset.id)
      } catch (e) {
        console.error(e)
      }
    }

    toast.success(`Modelo "${target.name}" excluído.`)
  }

  const handleResetToSystemDefaults = () => {
    setPresets(DEFAULT_PRESETS)
    setDefaultPresetId('fiscal')
    setActivePresetId('fiscal')
    const fiscalPreset = DEFAULT_PRESETS.find(p => p.id === 'fiscal')!
    setSelectedColumns([...fiscalPreset.columns])

    try {
      localStorage.removeItem('kapsu_export_presets')
      localStorage.setItem('kapsu_default_export_preset', 'fiscal')
    } catch (e) {
      console.error(e)
    }

    toast.success('Modelos de exportação restaurados para os padrões originais!')
  }

  const toggleColumn = (colKey: string) => {
    if (selectedColumns.includes(colKey)) {
      if (selectedColumns.length === 1) {
        toast.error('Pelo menos uma coluna deve estar selecionada.')
        return
      }
      setSelectedColumns(selectedColumns.filter(k => k !== colKey))
    } else {
      setSelectedColumns([...selectedColumns, colKey])
    }
  }

  const selectAllColumns = () => {
    setSelectedColumns(ALL_COLUMNS.map(c => c.key))
  }

  const deselectAllColumns = () => {
    setSelectedColumns(['codigo_produto', 'nome_produto']) // Mantém identificadores mínimos
  }

  const handleExport = async () => {
    const isSelectingSpecific = exportSelectionMode === 'selected' && selectedIds.length > 0

    if (!isSelectingSpecific && !includeActive && !includeInactive && !includeArchived) {
      toast.error('Selecione pelo menos um status para exportar.')
      return
    }

    if (!isSelectingSpecific && !includeSite && !includeML && !includeShopee) {
      toast.error('Selecione pelo menos um marketplace para exportar.')
      return
    }

    if (selectedColumns.length === 0) {
      toast.error('Selecione pelo menos uma coluna para exportar.')
      return
    }

    try {
      setIsExporting(true)
      const allProductsRaw = await productsService.getAllForAdminRaw()
      const selectedSet = new Set(selectedIds)

      // Filtragem por status e marketplaces (ou por seleção direta)
      const filtered = allProductsRaw.filter(p => {
        if (isSelectingSpecific) {
          return selectedSet.has(p.id)
        }

        // Status filter
        if (p.archived && !includeArchived) return false
        if (!p.archived && p.active && !includeActive) return false
        if (!p.archived && !p.active && !includeInactive) return false

        // Marketplace filter
        const tags = (p.marketplace_tags ?? 'site,mercado_livre,shopee').split(',').map((t: string) => t.trim().toLowerCase())
        const matchesMarketplace =
          (includeSite && tags.includes('site')) ||
          (includeML && tags.includes('mercado_livre')) ||
          (includeShopee && tags.includes('shopee'))

        if (!matchesMarketplace) return false

        return true
      })

      if (filtered.length === 0) {
        toast.error('Nenhum produto atende aos filtros selecionados para exportação.')
        setIsExporting(false)
        return
      }

      const activeColumnDefs = ALL_COLUMNS.filter(c => selectedColumns.includes(c.key))

      const rows = filtered.map(product => {
        const rowObj: Record<string, any> = {}
        activeColumnDefs.forEach(col => {
          rowObj[col.label] = col.getValue(product)
        })
        return rowObj
      })

      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = activeColumnDefs.map(col => ({ wch: col.width || 20 }))

      // Adiciona links clicáveis para imagens se a coluna de imagem estiver ativa
      if (selectedColumns.includes('image')) {
        const imgColIndex = activeColumnDefs.findIndex(c => c.key === 'image')
        if (imgColIndex !== -1) {
          const colLetter = XLSX.utils.encode_col(imgColIndex)
          filtered.forEach((product, index) => {
            if (!product.image) return
            const cellAddress = `${colLetter}${index + 2}`
            const cell = worksheet[cellAddress]
            if (cell?.v) {
              cell.l = { Target: String(cell.v), Tooltip: 'Abrir imagem pública' }
            }
          })
        }
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos')
      const filename = `produtos-kapsu-${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, filename)

      toast.success(`${filtered.length} produto(s) exportado(s) em ${filename}.`)
      onClose()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Erro ao exportar planilha de produtos.')
    } finally {
      setIsExporting(false)
    }
  }

  const activePreset = presets.find(p => p.id === activePresetId)

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Planilha de Produtos (Excel)"
    >
      <div className="space-y-6 text-sm text-gray-700 dark:text-gray-200">

        {/* 0. Selection Scope Filter (if products selected in table) */}
        {selectedIds.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
              Escopo de Exportação ({selectedIds.length} produto(s) selecionado(s))
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportSelectionMode"
                  checked={exportSelectionMode === 'selected'}
                  onChange={() => setExportSelectionMode('selected')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Somente os {selectedIds.length} produto(s) selecionado(s) na tabela
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportSelectionMode"
                  checked={exportSelectionMode === 'all'}
                  onChange={() => setExportSelectionMode('all')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Todos os produtos
                </span>
              </label>
            </div>
          </div>
        )}

        {/* 1. Status Filter & 2. Marketplace Filter (shown only when no items selected or when exportSelectionMode === 'all') */}
        {(selectedIds.length === 0 || exportSelectionMode === 'all') && (
          <>
            {/* 1. Status Filter */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                <Filter size={14} className="text-green-600 dark:text-green-400" />
                Status dos Produtos
              </label>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeActive}
                    onChange={e => setIncludeActive(e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200">Ativos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={e => setIncludeInactive(e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200">Inativos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={e => setIncludeArchived(e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200">Arquivados</span>
                </label>
              </div>
            </div>

            {/* 2. Marketplace Filter */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                <Store size={14} className="text-amber-600 dark:text-amber-400" />
                Filtrar por Marketplace / Canais
              </label>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSite}
                    onChange={e => setIncludeSite(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    🌐 Site Próprio
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeML}
                    onChange={e => setIncludeML(e.target.checked)}
                    className="h-4 w-4 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    💛 Mercado Livre
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeShopee}
                    onChange={e => setIncludeShopee(e.target.checked)}
                    className="h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    🟠 Shopee
                  </span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* 3. Export Presets Bar */}
        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-gray-800/80 dark:to-slate-800/80 p-4 rounded-xl border border-blue-200/60 dark:border-gray-700 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100">
                Modelos de Exportação
              </span>
              {defaultPresetId && (
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Padrão: {presets.find(p => p.id === defaultPresetId)?.name || 'Dados Fiscais'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                >
                  <Settings size={13} />
                  Editar / Gerenciar Modelos
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <X size={13} />
                  Concluir Edição
                </button>
              )}
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {presets.map(preset => {
              const isActive = activePresetId === preset.id
              const isDefault = defaultPresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-semibold'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{preset.name}</span>
                  {isDefault && (
                    <Star size={12} className={isActive ? 'fill-amber-300 text-amber-300' : 'fill-amber-500 text-amber-500'} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Edit Mode Management Toolbar */}
          {isEditMode && (
            <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-gray-700 space-y-3 bg-white/70 dark:bg-gray-900/50 p-3 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <Edit3 size={13} className="text-amber-500" />
                  Modelo em edição: <strong className="text-indigo-600 dark:text-indigo-400">{activePreset?.name}</strong>
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Marque/desmarque as colunas abaixo e salve as alterações.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveActivePreset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all"
                >
                  <Save size={13} />
                  Salvar Alterações neste Modelo
                </button>

                {activePresetId !== defaultPresetId && (
                  <button
                    type="button"
                    onClick={() => handleSetAsDefault(activePresetId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 rounded-lg transition-all"
                  >
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                    Definir como Padrão
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-950/40 hover:bg-green-200 border border-green-300 dark:border-green-800 rounded-lg transition-all"
                >
                  <Plus size={13} />
                  Criar Novo Modelo
                </button>

                <button
                  type="button"
                  onClick={handleResetToSystemDefaults}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-all"
                  title="Restaurar os modelos originais do sistema"
                >
                  <RotateCcw size={13} />
                  Voltar aos Padrões do Sistema
                </button>

                {activePreset && !activePreset.isSystem && (
                  <button
                    type="button"
                    onClick={handleDeletePreset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 border border-red-200 dark:border-red-900 rounded-lg transition-all"
                  >
                    <Trash2 size={13} />
                    Excluir Modelo
                  </button>
                )}
              </div>

              {isCreatingNew && (
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    placeholder="Nome do novo modelo (ex: Impostos Resumidos)"
                    className="w-full sm:flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmCreateNew}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      Salvar Novo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Categorized Column Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Layers size={14} className="text-green-600 dark:text-green-400" />
              Colunas por Categoria ({selectedColumns.length}/{ALL_COLUMNS.length} selecionadas)
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={selectAllColumns}
                className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
              >
                Selecionar Todos
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                type="button"
                onClick={deselectAllColumns}
                className="text-gray-500 hover:underline font-semibold"
              >
                Desmarcar Todos
              </button>
            </div>
          </div>

          {/* Grouped Categories List */}
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 p-1">
            {categories.map(categoryName => {
              const categoryCols = ALL_COLUMNS.filter(c => c.category === categoryName)
              const selectedInCategory = categoryCols.filter(c => selectedColumns.includes(c.key))
              const isAllCategorySelected = selectedInCategory.length === categoryCols.length

              const toggleCategory = (select: boolean) => {
                if (select) {
                  const toAdd = categoryCols.map(c => c.key).filter(k => !selectedColumns.includes(k))
                  setSelectedColumns([...selectedColumns, ...toAdd])
                } else {
                  const categoryKeys = categoryCols.map(c => c.key)
                  const remaining = selectedColumns.filter(k => !categoryKeys.includes(k))
                  if (remaining.length === 0) {
                    toast.error('Pelo menos uma coluna no geral deve estar selecionada.')
                    return
                  }
                  setSelectedColumns(remaining)
                }
              }

              return (
                <div key={categoryName} className="bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-200/80 dark:border-gray-800 p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {categoryName}
                      </span>
                      <span className="text-[10px] bg-gray-200/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold px-2 py-0.5 rounded-full">
                        {selectedInCategory.length}/{categoryCols.length} selecionadas
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleCategory(true)}
                        disabled={isAllCategorySelected}
                        className="text-green-600 dark:text-green-400 hover:underline font-semibold disabled:opacity-40 disabled:no-underline"
                      >
                        Marcar Categoria
                      </button>
                      <span className="text-gray-300 dark:text-gray-700">|</span>
                      <button
                        type="button"
                        onClick={() => toggleCategory(false)}
                        disabled={selectedInCategory.length === 0}
                        className="text-gray-500 hover:underline font-semibold disabled:opacity-40 disabled:no-underline"
                      >
                        Desmarcar Categoria
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categoryCols.map(col => {
                      const isChecked = selectedColumns.includes(col.key)
                      return (
                        <label
                          key={col.key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-green-50/80 border-green-300 text-green-950 dark:bg-green-950/40 dark:border-green-800 dark:text-green-200 font-medium shadow-xs'
                              : 'bg-white border-gray-200 text-gray-400 dark:bg-gray-900/60 dark:border-gray-800 dark:text-gray-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleColumn(col.key)}
                            className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-semibold text-gray-800 dark:text-gray-200">{col.displayName}</div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">coluna: {col.label}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            <Download size={16} />
            {isExporting ? 'Exportando Planilha...' : 'Exportar Planilha Excel'}
          </button>
        </div>
      </div>
    </AdminModal>
  )
}
