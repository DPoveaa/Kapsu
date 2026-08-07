import React, { useState } from 'react'
import {
  Upload, FileSpreadsheet, Download,
  Plus, Trash2, Sparkles, CheckSquare, Square, Columns, Package
} from 'lucide-react'
import * as XLSX from 'xlsx'
import AdminModal from './AdminModal'
import { productsService } from '../services/products.service'
import { toast } from '../utils/toast'

export interface ProductImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export interface ColumnMappingItem {
  id: string
  excelHeader: string
  systemField: string
  enabled: boolean
}

export interface ImportFieldDefinition {
  key: string
  label: string
  category: string
  required?: boolean
}

export interface ImportCategory {
  name: string
  fields: ImportFieldDefinition[]
}

export const IMPORT_CATEGORIES: ImportCategory[] = [
  {
    name: '📌 Identificação & Canais',
    fields: [
      { key: 'codigo_produto', label: 'Código do Produto / SKU / ID (codigo_produto)', category: '📌 Identificação & Canais', required: true },
      { key: 'nome_produto', label: 'Nome do Produto (nome_produto)', category: '📌 Identificação & Canais', required: false },
      { key: 'marketplaces', label: 'Canais / Marketplaces (marketplaces)', category: '📌 Identificação & Canais', required: false },
      { key: 'category', label: 'Categoria na Loja (category)', category: '📌 Identificação & Canais', required: false },
      { key: 'status', label: 'Status: Ativo / Inativo / Arquivado (status)', category: '📌 Identificação & Canais', required: false },
    ],
  },
  {
    name: '💰 Preços, Custos & Margens',
    fields: [
      { key: 'price', label: 'Preço de Venda R$ (price)', category: '💰 Preços, Custos & Margens', required: false },
      { key: 'promo_price', label: 'Preço Promocional R$ (promo_price)', category: '💰 Preços, Custos & Margens', required: false },
      { key: 'purchase_price', label: 'Preço de Custo / Compra R$ (purchase_price)', category: '💰 Preços, Custos & Margens', required: false },
      { key: 'markup', label: 'Markup % (markup)', category: '💰 Preços, Custos & Margens', required: false },
      { key: 'free_shipping', label: 'Frete Grátis SIM/NÃO (free_shipping)', category: '💰 Preços, Custos & Margens', required: false },
    ],
  },
  {
    name: '📦 Estoque & Embalagem',
    fields: [
      { key: 'quantity', label: 'Estoque / Quantidade (quantity)', category: '📦 Estoque & Embalagem', required: false },
      { key: 'intended_form', label: 'Forma Farmacêutica (intended_form)', category: '📦 Estoque & Embalagem', required: false },
      { key: 'intended_presentation', label: 'Apresentação / Embalagem (intended_presentation)', category: '📦 Estoque & Embalagem', required: false },
      { key: 'intended_units_per_dose', label: 'Unidades por Dose (intended_units_per_dose)', category: '📦 Estoque & Embalagem', required: false },
    ],
  },
  {
    name: '📝 Conteúdo & Apresentação',
    fields: [
      { key: 'description', label: 'Descrição do Produto (description)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'compositions', label: 'Composição / Fórmulas (compositions)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'indication', label: 'Indicação (indication)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'contraindication', label: 'Contraindicação (contraindication)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'benefits', label: 'Benefícios do Produto (benefits)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'target_audience', label: 'Público-Alvo (target_audience)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'tags', label: 'Tags do Produto (tags)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'meta_title', label: 'Meta Título SEO (meta_title)', category: '📝 Conteúdo & Apresentação', required: false },
      { key: 'meta_description', label: 'Meta Descrição SEO (meta_description)', category: '📝 Conteúdo & Apresentação', required: false },
    ],
  },
  {
    name: '📜 Dados Fiscais NF-e 55',
    fields: [
      { key: 'fiscal_description', label: 'Descrição Fiscal (fiscal_description)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'ncm', label: 'NCM - 8 dígitos (ncm)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cest', label: 'CEST - 7 dígitos (cest)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'origin', label: 'Origem da Mercadoria 0-8 (origin)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'csosn', label: 'CSOSN Simples Nacional (csosn)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'csosn_st', label: 'CSOSN ST (csosn_st)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cfop_intra', label: 'CFOP Estadual Venda (cfop_intra)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cfop_inter', label: 'CFOP Interestadual Venda (cfop_inter)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cfop_intra_st', label: 'CFOP ST Estadual (cfop_intra_st)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cfop_inter_st', label: 'CFOP ST Interestadual (cfop_inter_st)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'pis_cst', label: 'PIS CST 2 dígitos (pis_cst)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cofins_cst', label: 'COFINS CST 2 dígitos (cofins_cst)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'unit', label: 'Unidade Comercial (unit)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'tax_unit', label: 'Unidade Tributável (tax_unit)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'tax_conversion_factor', label: 'Fator Conversão Tributária (tax_conversion_factor)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'gtin', label: 'GTIN / EAN Código de Barras (gtin)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'tax_gtin', label: 'GTIN Tributável (tax_gtin)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'cbenef', label: 'Código Benefício Fiscal (cbenef)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'fiscal_validated', label: 'Validação Fiscal (fiscal_validated)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'fiscal_notes', label: 'Observações Fiscais Internas (fiscal_notes)', category: '📜 Dados Fiscais NF-e 55', required: false },
      { key: 'nfe_enabled', label: 'Habilitado Emissão NF-e (nfe_enabled)', category: '📜 Dados Fiscais NF-e 55', required: false },
    ],
  },
]

export const ALL_IMPORT_FIELDS: ImportFieldDefinition[] = IMPORT_CATEGORIES.flatMap(cat => cat.fields)

function detectSystemField(headerName: string, assignedFields: Set<string>): string {
  const cleanHeader = headerName.trim()
  const low = cleanHeader.toLowerCase().replace(/_/g, ' ')

  const tryAssign = (fieldKey: string): string => {
    if (!assignedFields.has(fieldKey)) {
      return fieldKey
    }
    return ''
  }

  const VALID_KEYS = new Set(ALL_IMPORT_FIELDS.map(f => f.key))

  // 1. Extract parenthesized field keys, e.g. "Código do Produto / SKU (codigo_produto)" -> "codigo_produto"
  const parenthesizedMatches = cleanHeader.match(/\(([^)]+)\)/g)
  if (parenthesizedMatches) {
    for (const pMatch of parenthesizedMatches) {
      const inside = pMatch.replace(/[()]/g, '').trim().toLowerCase()
      if (inside === 'sku' || inside === 'id') {
        const res = tryAssign('codigo_produto')
        if (res) return res
      }
      if (VALID_KEYS.has(inside)) {
        const res = tryAssign(inside)
        if (res) return res
      }
    }
  }

  // 2. Exact match with system field keys
  for (const field of ALL_IMPORT_FIELDS) {
    const fKeyClean = field.key.toLowerCase()
    const fKeySpaced = field.key.toLowerCase().replace(/_/g, ' ')
    if (low === fKeyClean || low === fKeySpaced) {
      const res = tryAssign(field.key)
      if (res) return res
    }
  }

  // 3. Exact match with labels from ALL_IMPORT_FIELDS
  for (const field of ALL_IMPORT_FIELDS) {
    const labelLow = field.label.toLowerCase()
    if (low === labelLow || cleanHeader.toLowerCase() === labelLow) {
      const res = tryAssign(field.key)
      if (res) return res
    }
  }

  // 4. Specific technical fiscal/system fields (checked BEFORE general word heuristics)
  if (low.includes('csosn st') || low.includes('csosn_st')) return tryAssign('csosn_st')
  if (low.includes('csosn')) return tryAssign('csosn')
  if (low.includes('cfop intra st') || low.includes('cfop_intra_st')) return tryAssign('cfop_intra_st')
  if (low.includes('cfop inter st') || low.includes('cfop_inter_st')) return tryAssign('cfop_inter_st')
  if (low.includes('cfop intra') || low.includes('cfop_intra') || low.includes('cfop estadual')) return tryAssign('cfop_intra')
  if (low.includes('cfop inter') || low.includes('cfop_inter') || low.includes('cfop interestadual')) return tryAssign('cfop_inter')
  if (low.includes('pis cst') || low.includes('pis_cst') || low === 'pis') return tryAssign('pis_cst')
  if (low.includes('cofins cst') || low.includes('cofins_cst') || low === 'cofins') return tryAssign('cofins_cst')
  if (low.includes('tax unit') || low.includes('unidade tributavel') || low.includes('unid tributavel')) return tryAssign('tax_unit')
  if (low.includes('tax gtin') || low.includes('gtin tributavel')) return tryAssign('tax_gtin')
  if (low.includes('gtin') || low.includes('ean') || low.includes('barras')) return tryAssign('gtin')
  if (low.includes('ncm')) return tryAssign('ncm')
  if (low.includes('cest')) return tryAssign('cest')
  if (low.includes('cbenef') || low.includes('beneficio fiscal') || low.includes('benefício fiscal')) return tryAssign('cbenef')
  if (low.includes('origin') || low.includes('origem')) return tryAssign('origin')
  if (low.includes('fiscal notes') || low.includes('fiscal_notes') || low.includes('observações fiscais') || low.includes('observacoes fiscais')) return tryAssign('fiscal_notes')
  if (low.includes('fiscal description') || low.includes('descrição fiscal') || low.includes('descricao fiscal')) return tryAssign('fiscal_description')
  if (low.includes('fiscal validated') || low.includes('fiscal_validated') || low.includes('validação fiscal') || low.includes('validacao fiscal')) return tryAssign('fiscal_validated')
  if (low.includes('nfe_enabled') || low.includes('emissão nfe') || low.includes('emissao nfe') || low.includes('habilitado nfe') || low.includes('nfe')) return tryAssign('nfe_enabled')

  // 5. Broad Heuristic Keyword Matches
  if (
    !low.includes('ncm') && !low.includes('cest') && !low.includes('cbenef') &&
    (low === 'sku' || low === 'id' || low.includes('codigo produto') || low.includes('código produto') || low.includes('codigo do produto') || low.includes('código do produto') || low.includes('product code') || low === 'codigo' || low === 'código')
  ) {
    const res = tryAssign('codigo_produto')
    if (res) return res
  }

  if (low.includes('nome') || low.includes('name') || low === 'produto' || low === 'titulo' || low === 'título' || low === 'item') {
    const res = tryAssign('nome_produto')
    if (res) return res
  }

  if (low.includes('marketplace') || low.includes('canal') || low.includes('shopee') || low.includes('mercado livre')) {
    const res = tryAssign('marketplaces')
    if (res) return res
  }

  if (low.includes('promo') || low.includes('promocional')) {
    const res = tryAssign('promo_price')
    if (res) return res
  }

  if (low.includes('custo') || low.includes('compra') || low.includes('cost') || low.includes('purchase')) {
    const res = tryAssign('purchase_price')
    if (res) return res
  }

  if (low.includes('preço') || low.includes('preco') || low.includes('venda') || low === 'price' || low.includes('sale price')) {
    const res = tryAssign('price')
    if (res) return res
  }

  if (low.includes('markup') || low.includes('margem')) {
    const res = tryAssign('markup')
    if (res) return res
  }

  if (low.includes('categoria') || low.includes('category')) {
    const res = tryAssign('category')
    if (res) return res
  }

  if (low === 'status' || low.includes('ativo') || low.includes('situacao') || low.includes('situação')) {
    const res = tryAssign('status')
    if (res) return res
  }

  if (low.includes('frete') || low.includes('shipping')) {
    const res = tryAssign('free_shipping')
    if (res) return res
  }

  if (low.includes('estoque') || low.includes('quantidade') || low.includes('qtd') || low === 'quantity' || low === 'stock') {
    const res = tryAssign('quantity')
    if (res) return res
  }

  if (low.includes('descri') || low.includes('description') || low.includes('apresentacao do produto')) {
    const res = tryAssign('description')
    if (res) return res
  }

  if (low.includes('composic') || low.includes('composição') || low.includes('formula') || low.includes('fórmula') || low.includes('composition')) {
    const res = tryAssign('compositions')
    if (res) return res
  }

  if (low.includes('indicac') || low.includes('indicação') || low.includes('indication')) {
    const res = tryAssign('indication')
    if (res) return res
  }

  if (low.includes('contraindicac') || low.includes('contraindicação') || low.includes('contraindication')) {
    const res = tryAssign('contraindication')
    if (res) return res
  }

  if (low.includes('benefic') || low.includes('benefício') || low.includes('benefit')) {
    const res = tryAssign('benefits')
    if (res) return res
  }

  if (low.includes('publico') || low.includes('público') || low.includes('target')) {
    const res = tryAssign('target_audience')
    if (res) return res
  }

  if (low.includes('forma') || low.includes('intended form') || low.includes('intended_form')) {
    const res = tryAssign('intended_form')
    if (res) return res
  }

  if (low.includes('apresenta') || low.includes('embalagem') || low.includes('intended presentation') || low.includes('intended_presentation')) {
    const res = tryAssign('intended_presentation')
    if (res) return res
  }

  if (low.includes('dose') || low.includes('intended units per dose') || low.includes('intended_units_per_dose')) {
    const res = tryAssign('intended_units_per_dose')
    if (res) return res
  }

  if (low === 'unit' || low === 'unidade' || low.includes('unid comercial')) {
    const res = tryAssign('unit')
    if (res) return res
  }

  if (low.includes('convers') || low.includes('fator')) {
    const res = tryAssign('tax_conversion_factor')
    if (res) return res
  }

  if (low === 'tags' || low.includes('etiqueta')) {
    const res = tryAssign('tags')
    if (res) return res
  }

  if (low.includes('meta title') || low.includes('meta titulo') || low.includes('meta título')) {
    const res = tryAssign('meta_title')
    if (res) return res
  }

  if (low.includes('meta description') || low.includes('meta descricao') || low.includes('meta descrição')) {
    const res = tryAssign('meta_description')
    if (res) return res
  }

  return ''
}

export default function ProductImportModal({ isOpen, onClose, onSuccess }: ProductImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<any[]>([])

  // Dynamic Mapping items
  const [mappings, setMappings] = useState<ColumnMappingItem[]>([])

  // Selection & Tab State
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<'preview' | 'mappings'>('preview')
  const [isApplying, setIsApplying] = useState(false)

  const resetState = () => {
    setFile(null)
    setImportHeaders([])
    setRawRows([])
    setMappings([])
    setSelectedRowIndices(new Set())
    setActiveTab('preview')
    setIsApplying(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })
      const extractedHeaders = (headerRows[0] || []).map(h => String(h || '').trim()).filter(Boolean)
      const parsedRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

      if (!parsedRows || parsedRows.length === 0) {
        toast.error('O arquivo selecionado está vazio ou sem linhas válidas.')
        resetState()
        return
      }

      setImportHeaders(extractedHeaders)
      setRawRows(parsedRows)
      setSelectedRowIndices(new Set(parsedRows.map((_, i) => i)))

      // Create unique initial mappings
      const initialMappings: ColumnMappingItem[] = []
      const assignedFields = new Set<string>()

      extractedHeaders.forEach((header, idx) => {
        const detectedField = detectSystemField(header, assignedFields)
        if (detectedField) {
          assignedFields.add(detectedField)
        }
        initialMappings.push({
          id: `header_${idx}_${Date.now()}`,
          excelHeader: header,
          systemField: detectedField,
          enabled: true,
        })
      })

      setMappings(initialMappings)
      setActiveTab('preview')
      toast.success(`${parsedRows.length} produto(s) e ${extractedHeaders.length} coluna(s) carregados.`)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao ler arquivo CSV/XLSX. Verifique se o formato é válido.')
      resetState()
    }
  }

  const handleAddMappingRow = () => {
    const newRow: ColumnMappingItem = {
      id: `custom_${Date.now()}`,
      excelHeader: importHeaders[0] || '',
      systemField: '',
      enabled: true,
    }
    setMappings(prev => [...prev, newRow])
  }

  const handleRemoveMappingRow = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id))
  }

  const handleUpdateMapping = (id: string, updates: Partial<ColumnMappingItem>) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const toggleRowSelection = (index: number) => {
    setSelectedRowIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleSelectAllRows = () => {
    if (selectedRowIndices.size === rawRows.length) {
      setSelectedRowIndices(new Set())
    } else {
      setSelectedRowIndices(new Set(rawRows.map((_, i) => i)))
    }
  }

  const getMappedRowInfo = (row: any) => {
    const obj: Record<string, any> = {}
    let filledCount = 0
    let activeMappingsCount = 0

    for (const mapItem of mappings) {
      if (!mapItem.enabled || !mapItem.systemField || !mapItem.excelHeader) continue
      activeMappingsCount++
      const val = row[mapItem.excelHeader]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        obj[mapItem.systemField] = val
        filledCount++
      }
    }
    return { obj, filledCount, activeMappingsCount }
  }

  const activeMappedColumnsCount = mappings.filter(m => m.enabled && m.systemField && m.excelHeader).length

  const handleApplyImport = async () => {
    if (!file || rawRows.length === 0) {
      toast.error('Nenhum arquivo ou produto para importar.')
      return
    }

    if (selectedRowIndices.size === 0) {
      toast.error('Selecione pelo menos um produto na lista para importar.')
      return
    }

    const hasCodigoOrNome = mappings.some(
      m => m.enabled && (m.systemField === 'codigo_produto' || m.systemField === 'nome_produto') && m.excelHeader
    )
    if (!hasCodigoOrNome) {
      toast.error('Mapeie pelo menos a coluna "Código do Produto / SKU" ou "Nome do Produto".')
      setActiveTab('mappings')
      return
    }

    const selectedRowsToImport: any[] = []
    const validationErrors: string[] = []

    const sortedIndices = Array.from(selectedRowIndices).sort((a, b) => a - b)
    for (const idx of sortedIndices) {
      const rawRow = rawRows[idx]
      const { obj } = getMappedRowInfo(rawRow)

      const code = String(obj.codigo_produto || obj.SKU || obj.id || obj.ID || '').trim()
      const productName = String(obj.nome_produto || '').trim()

      if (!code && !productName) {
        validationErrors.push(`Linha ${idx + 2}: Produto sem Código (SKU) e sem Nome.`)
      } else {
        selectedRowsToImport.push(obj)
      }
    }

    if (validationErrors.length > 0) {
      toast.error(
        validationErrors[0] +
        (validationErrors.length > 1 ? ` (Mais ${validationErrors.length - 1} erro(s) em outras linhas)` : '')
      )
      return
    }

    try {
      setIsApplying(true)
      const result = await productsService.applyImport(selectedRowsToImport, {
        allowClearEmpty: false,
        partialImport: true,
        fileName: file.name,
      })

      const created = result.createdCount || 0
      const updated = result.updatedCount || 0

      if (created > 0 && updated > 0) {
        toast.success(`Importação realizada com sucesso! ${created} produto(s) criado(s) e ${updated} produto(s) atualizado(s).`)
      } else if (created > 0) {
        toast.success(`Importação realizada com sucesso! ${created} novo(s) produto(s) criado(s).`)
      } else {
        toast.success(`Importação realizada com sucesso! ${updated} produto(s) atualizado(s).`)
      }
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao aplicar importação de produtos.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productsService.downloadImportTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'modelo-importacao-fiscal-kapsu.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Modelo de planilha XLSX baixado com sucesso.')
    } catch (err: any) {
      toast.error('Erro ao baixar modelo de planilha.')
    }
  }

  const currentlyAssignedSystemFields = new Set(
    mappings.filter(m => m.enabled && m.systemField).map(m => m.systemField)
  )

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Planilha de Produtos"
    >
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">

        {/* 1. Header & Template Download (Shown ONLY when NO file is uploaded) */}
        {!file && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800">
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-xs">Modelo Oficial XLSX</h4>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Baixe o modelo com todos os cabeçalhos fiscais para NF-e 55.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors shrink-0 shadow-xs"
            >
              <Download size={13} />
              Baixar Modelo XLSX
            </button>
          </div>
        )}

        {/* 2. File Upload Box */}
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors bg-gray-50/40 dark:bg-gray-900/30">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              id="product-import-file-input"
              className="hidden"
            />
            <label htmlFor="product-import-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
              <FileSpreadsheet size={38} className="text-primary-600 dark:text-primary-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Clique para selecionar a planilha CSV ou XLSX
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Suporta arquivos .xlsx, .xls ou .csv
              </span>
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet size={22} className="text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-indigo-900 dark:text-indigo-200 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  <b>{rawRows.length}</b> produto(s) no arquivo • <b>{activeMappedColumnsCount}</b> coluna(s) identificada(s)
                </p>
              </div>
            </div>
            <label
              htmlFor="product-import-file-input-reselect"
              className="px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 text-xs font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer shrink-0 shadow-xs"
            >
              Trocar Arquivo
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                id="product-import-file-input-reselect"
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* 3. Section Tabs (Preview Products vs Column Mappings) */}
        {file && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === 'preview'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <Package size={15} />
              Produtos a Importar ({selectedRowIndices.size}/{rawRows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mappings')}
              className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === 'mappings'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <Columns size={15} />
              Mapeamento de Colunas ({activeMappedColumnsCount})
            </button>
          </div>
        )}

        {/* 4. Tab 1: Products Preview Table */}
        {file && activeTab === 'preview' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllRows}
                  className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedRowIndices.size === rawRows.length ? (
                    <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                  {selectedRowIndices.size === rawRows.length ? 'Desmarcar Todos' : 'Selecionar Todos'} ({rawRows.length})
                </button>
              </div>

              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Selecione os produtos que deseja enviar para o banco de dados
              </span>
            </div>

            <div className="max-h-[44vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl scrollbar-thin">
              <table className="w-full text-left text-xs divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800/80 sticky top-0 font-bold text-gray-700 dark:text-gray-300 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRowIndices.size === rawRows.length && rawRows.length > 0}
                        onChange={toggleSelectAllRows}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2.5 w-14 text-gray-500">Linha</th>
                    <th className="px-3 py-2.5 font-bold">Código / SKU</th>
                    <th className="px-3 py-2.5 font-bold">Nome do Produto</th>
                    <th className="px-3 py-2.5 font-bold">Preço</th>
                    <th className="px-3 py-2.5 font-bold text-center">Colunas Identificadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {rawRows.map((row, idx) => {
                    const isSelected = selectedRowIndices.has(idx)
                    const { obj, filledCount, activeMappingsCount } = getMappedRowInfo(row)
                    const codeDisplay = obj.codigo_produto || obj.sku || obj.SKU || obj.id || obj.ID || ''
                    const nameDisplay = obj.nome_produto || obj.name || ''
                    const priceDisplay = obj.price != null ? `R$ ${obj.price}` : '-'

                    return (
                      <tr
                        key={idx}
                        onClick={() => toggleRowSelection(idx)}
                        className={`cursor-pointer transition-colors ${isSelected
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40'
                            : 'opacity-60 hover:opacity-100 bg-gray-50/30 dark:bg-gray-900/30'
                          }`}
                      >
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(idx)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-400 text-[11px]">#{idx + 2}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {codeDisplay || <span className="text-amber-500 italic text-[11px]">Auto-gerar SKU</span>}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                          {nameDisplay || <span className="text-red-500 italic text-[11px]">Sem nome</span>}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                          {priceDisplay}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Sparkles size={11} />
                            {filledCount} de {activeMappingsCount} identificadas
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Tab 2: Column Mappings Section */}
        {file && activeTab === 'mappings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                Mapeamento das Colunas da Planilha ({mappings.length})
              </label>

              <button
                type="button"
                onClick={handleAddMappingRow}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus size={13} />
                Adicionar Novo Mapeamento
              </button>
            </div>

            <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1 p-1 scrollbar-thin">
              {mappings.map(mapItem => {
                return (
                  <div
                    key={mapItem.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl border transition-all ${!mapItem.enabled
                        ? 'bg-gray-100/60 border-gray-200 opacity-60 dark:bg-gray-900/30 dark:border-gray-800'
                        : mapItem.systemField === 'codigo_produto'
                          ? 'bg-green-50/60 border-green-300 dark:bg-green-950/20 dark:border-green-800'
                          : mapItem.systemField
                            ? 'bg-white border-gray-200 dark:bg-gray-800/80 dark:border-gray-700'
                            : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                      }`}
                  >
                    {/* Enable Checkbox */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={mapItem.enabled}
                        onChange={e => handleUpdateMapping(mapItem.id, { enabled: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        title={mapItem.enabled ? 'Clique para ignorar esta coluna' : 'Clique para incluir esta coluna'}
                      />
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 w-16">
                        {mapItem.enabled ? 'Importar' : 'Ignorar'}
                      </span>
                    </div>

                    {/* Source Excel Column */}
                    <div className="flex-1 min-w-0">
                      <select
                        disabled={!mapItem.enabled}
                        value={mapItem.excelHeader}
                        onChange={e => handleUpdateMapping(mapItem.id, { excelHeader: e.target.value })}
                        className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium"
                      >
                        <option value="">— Selecionar Coluna da Planilha —</option>
                        {importHeaders.map(h => (
                          <option key={h} value={h}>
                            Coluna: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-gray-400 text-xs text-center hidden sm:inline">➔</span>

                    {/* Target System Field */}
                    <div className="flex-1 min-w-0">
                      <select
                        disabled={!mapItem.enabled}
                        value={mapItem.systemField}
                        onChange={e => handleUpdateMapping(mapItem.id, { systemField: e.target.value })}
                        className={`w-full text-xs rounded-lg border px-2.5 py-1.5 font-medium ${mapItem.systemField === 'codigo_produto'
                            ? 'border-green-500 text-green-900 bg-green-50 dark:bg-green-950 dark:text-green-200 font-bold'
                            : mapItem.systemField
                              ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                              : 'border-amber-300 text-amber-900 bg-amber-50 dark:bg-amber-950 dark:text-amber-200'
                          }`}
                      >
                        <option value="">— Vincular a Campo do Sistema —</option>
                        {IMPORT_CATEGORIES.map(cat => (
                          <optgroup key={cat.name} label={cat.name}>
                            {cat.fields.map(f => {
                              const isAssignedElsewhere = currentlyAssignedSystemFields.has(f.key) && mapItem.systemField !== f.key
                              return (
                                <option key={f.key} value={f.key}>
                                  {f.label} {f.required ? ' *' : ''} {isAssignedElsewhere ? ' (já mapeado)' : ''}
                                </option>
                              )
                            })}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* Delete Row Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMappingRow(mapItem.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                      title="Remover linha de mapeamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 6. Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          {file && (
            <button
              type="button"
              onClick={handleApplyImport}
              disabled={isApplying || selectedRowIndices.size === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Upload size={16} />
              {isApplying ? 'Importando Produtos...' : `Importar ${selectedRowIndices.size} Produto(s)`}
            </button>
          )}
        </div>
      </div>
    </AdminModal>
  )
}
