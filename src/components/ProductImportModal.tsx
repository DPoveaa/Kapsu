import React, { useState } from 'react'
import {
  Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle,
  RefreshCw, Plus, Trash2, Sparkles
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

interface ValidationErrorItem {
  rowNumber: number
  productCode: string
  field: string
  invalidValue: any
  reason: string
}

interface ValidationReport {
  totalRows: number
  validCount: number
  invalidCount: number
  errors: ValidationErrorItem[]
  duplicateCodes: string[]
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
  const low = headerName.trim().toLowerCase().replace(/_/g, ' ')

  const tryAssign = (fieldKey: string): string => {
    if (!assignedFields.has(fieldKey)) {
      return fieldKey
    }
    return ''
  }

  // 1. Exact match with system field keys
  for (const field of ALL_IMPORT_FIELDS) {
    const fKeyClean = field.key.toLowerCase().replace(/_/g, ' ')
    if (low === fKeyClean) {
      const res = tryAssign(field.key)
      if (res) return res
    }
  }

  // 2. Heuristic keyword matches
  if (low.includes('codigo') || low.includes('código') || low === 'sku' || low === 'id' || low.includes('code')) {
    const res = tryAssign('codigo_produto')
    if (res) return res
  }

  if (low.includes('nome') || low.includes('name') || low === 'produto' || low === 'titulo' || low === 'item') {
    const res = tryAssign('nome_produto')
    if (res) return res
  }

  if (low.includes('marketplace') || low.includes('canal') || low.includes('shopee') || low.includes('mercado livre')) {
    const res = tryAssign('marketplaces')
    if (res) return res
  }

  // Preço Promocional (before general price)
  if (low.includes('promo') || low.includes('promocional')) {
    const res = tryAssign('promo_price')
    if (res) return res
  }

  // Preço de Custo / Compra
  if (low.includes('custo') || low.includes('compra') || low.includes('cost') || low.includes('purchase')) {
    const res = tryAssign('purchase_price')
    if (res) return res
  }

  // Preço de Venda
  if (low.includes('preço') || low.includes('preco') || low.includes('venda') || low === 'price' || low.includes('sale price')) {
    const res = tryAssign('price')
    if (res) return res
  }

  // Markup
  if (low.includes('markup') || low.includes('margem')) {
    const res = tryAssign('markup')
    if (res) return res
  }

  // Categoria
  if (low.includes('categoria') || low.includes('category')) {
    const res = tryAssign('category')
    if (res) return res
  }

  // Status
  if (low === 'status' || low.includes('ativo') || low.includes('situacao') || low.includes('situação')) {
    const res = tryAssign('status')
    if (res) return res
  }

  // Frete Grátis
  if (low.includes('frete') || low.includes('shipping')) {
    const res = tryAssign('free_shipping')
    if (res) return res
  }

  // Quantidade / Estoque
  if (low.includes('estoque') || low.includes('quantidade') || low.includes('qtd') || low === 'quantity' || low === 'stock') {
    const res = tryAssign('quantity')
    if (res) return res
  }

  // Fiscal Notes — must appear before fiscal_description and fiscal_validated
  if (
    low === 'fiscal notes' || low === 'fiscal_notes' ||
    low === 'notas' || low === 'notas fiscais' ||
    low.includes('fiscal note') ||
    (low.includes('obs') && !low.includes('csosn')) ||
    low.includes('observa')
  ) {
    const res = tryAssign('fiscal_notes')
    if (res) return res
  }

  // Fiscal Description
  if (low.includes('fiscal description') || low.includes('descrição fiscal') || low.includes('descricao fiscal')) {
    const res = tryAssign('fiscal_description')
    if (res) return res
  }

  // Product Description
  if (low.includes('descri') || low.includes('description') || low.includes('apresentacao do produto')) {
    const res = tryAssign('description')
    if (res) return res
  }

  // Composição
  if (low.includes('composic') || low.includes('composição') || low.includes('formula') || low.includes('fórmula') || low.includes('composition')) {
    const res = tryAssign('compositions')
    if (res) return res
  }

  // Indicação
  if (low.includes('indicac') || low.includes('indicação') || low.includes('indication')) {
    const res = tryAssign('indication')
    if (res) return res
  }

  // Contraindicação
  if (low.includes('contraindicac') || low.includes('contraindicação') || low.includes('contraindication')) {
    const res = tryAssign('contraindication')
    if (res) return res
  }

  // Benefícios
  if (low.includes('benefic') || low.includes('benefício') || low.includes('benefit')) {
    const res = tryAssign('benefits')
    if (res) return res
  }

  // Público-Alvo
  if (low.includes('publico') || low.includes('público') || low.includes('target')) {
    const res = tryAssign('target_audience')
    if (res) return res
  }

  // Forma Farmacêutica
  if (low.includes('forma') || low.includes('intended_form')) {
    const res = tryAssign('intended_form')
    if (res) return res
  }

  // Apresentação / Embalagem
  if (low.includes('apresenta') || low.includes('embalagem') || low.includes('intended_presentation')) {
    const res = tryAssign('intended_presentation')
    if (res) return res
  }

  // Unidades por dose
  if (low.includes('dose') || low.includes('intended_units_per_dose')) {
    const res = tryAssign('intended_units_per_dose')
    if (res) return res
  }

  // Tags
  if (low === 'tags' || low.includes('etiqueta')) {
    const res = tryAssign('tags')
    if (res) return res
  }

  // Meta Title
  if (low.includes('meta title') || low.includes('meta titulo') || low.includes('meta título')) {
    const res = tryAssign('meta_title')
    if (res) return res
  }

  // Meta Description
  if (low.includes('meta description') || low.includes('meta descricao') || low.includes('meta descrição')) {
    const res = tryAssign('meta_description')
    if (res) return res
  }

  // fiscal_validated
  if (
    low === 'fiscal validated' || low === 'fiscal_validated' ||
    low === 'validado' || low === 'validação fiscal' ||
    low === 'fiscal validado' || low === 'validated'
  ) {
    const res = tryAssign('fiscal_validated')
    if (res) return res
  }

  if (low.includes('nfe') || low === 'emissao nfe' || low === 'habilitar nfe' || low.includes('emissão')) {
    const res = tryAssign('nfe_enabled')
    if (res) return res
  }

  if (low.includes('ncm')) {
    const res = tryAssign('ncm')
    if (res) return res
  }

  if (low.includes('cest')) {
    const res = tryAssign('cest')
    if (res) return res
  }

  if (low.includes('origem') || low.includes('origin')) {
    const res = tryAssign('origin')
    if (res) return res
  }

  if (low.includes('csosn st') || low.includes('csosn_st')) {
    const res = tryAssign('csosn_st')
    if (res) return res
  }

  if (low.includes('csosn')) {
    const res = tryAssign('csosn')
    if (res) return res
  }

  if (low.includes('cfop intra st') || low.includes('cfop_intra_st')) {
    const res = tryAssign('cfop_intra_st')
    if (res) return res
  }

  if (low.includes('cfop inter st') || low.includes('cfop_inter_st')) {
    const res = tryAssign('cfop_inter_st')
    if (res) return res
  }

  if (low.includes('cfop intra') || low.includes('cfop_intra') || low.includes('cfop estadual')) {
    const res = tryAssign('cfop_intra')
    if (res) return res
  }

  if (low.includes('cfop inter') || low.includes('cfop_inter') || low.includes('cfop interestadual')) {
    const res = tryAssign('cfop_inter')
    if (res) return res
  }

  if (low.includes('pis')) {
    const res = tryAssign('pis_cst')
    if (res) return res
  }

  if (low.includes('cofins')) {
    const res = tryAssign('cofins_cst')
    if (res) return res
  }

  if (low.includes('tax unit') || low.includes('unid tributavel')) {
    const res = tryAssign('tax_unit')
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

  if (low.includes('tax gtin') || low.includes('gtin tributavel')) {
    const res = tryAssign('tax_gtin')
    if (res) return res
  }

  if (low.includes('gtin') || low.includes('ean') || low.includes('barras')) {
    const res = tryAssign('gtin')
    if (res) return res
  }

  if (low.includes('cbenef') || low.includes('beneficio')) {
    const res = tryAssign('cbenef')
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

  // Loading & Report State
  const [isValidating, setIsValidating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [report, setReport] = useState<ValidationReport | null>(null)

  const resetState = () => {
    setFile(null)
    setImportHeaders([])
    setRawRows([])
    setMappings([])
    setReport(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setReport(null)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // Extract headers
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

      // Create unique initial mappings: each system field is assigned AT MOST ONCE
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
          enabled: true
        })
      })

      setMappings(initialMappings)
      toast.success(`${parsedRows.length} linha(s) e ${extractedHeaders.length} coluna(s) carregada(s).`)
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
      enabled: true
    }
    setMappings(prev => [...prev, newRow])
  }

  const handleRemoveMappingRow = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id))
    setReport(null)
  }

  const handleUpdateMapping = (id: string, updates: Partial<ColumnMappingItem>) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
    setReport(null)
  }

  const getMappedRows = () => {
    return rawRows.map(row => {
      const obj: Record<string, any> = {}
      for (const mapItem of mappings) {
        if (!mapItem.enabled || !mapItem.systemField || !mapItem.excelHeader) continue
        if (row[mapItem.excelHeader] !== undefined) {
          obj[mapItem.systemField] = row[mapItem.excelHeader]
        }
      }
      return obj
    })
  }

  const handleValidate = async () => {
    const hasCodigo = mappings.some(m => m.enabled && m.systemField === 'codigo_produto' && m.excelHeader)
    if (!hasCodigo) {
      toast.error('É necessário vincular uma coluna da planilha ao campo "Código do Produto / SKU (codigo_produto)".')
      return
    }

    const mappedRows = getMappedRows()
    if (mappedRows.length === 0) {
      toast.error('Nenhum campo mapeado para validação.')
      return
    }

    try {
      setIsValidating(true)
      const resReport = await productsService.validateImport(mappedRows)
      setReport(resReport)

      if (resReport.errors.length === 0) {
        toast.success(`Validação concluída! Todas as ${resReport.totalRows} linhas são válidas.`)
      } else {
        toast.warning(`Atenção: ${resReport.errors.length} erro(s) de validação encontrado(s).`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao validar planilha de produtos.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleApplyImport = async () => {
    const mappedRows = getMappedRows()
    if (mappedRows.length === 0) {
      toast.error('Nenhuma linha para importar.')
      return
    }

    if (!report) {
      toast.error('Gere o relatório de validação antes de aplicar a importação.')
      return
    }

    try {
      setIsApplying(true)
      const result = await productsService.applyImport(mappedRows, {
        allowClearEmpty: false,
        partialImport: true,
        fileName: file?.name || 'import.xlsx',
      })

      toast.success(`Importação realizada com sucesso! ${result.updatedCount} produto(s) atualizados.`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao aplicar importação.')
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

  // Set of system fields currently assigned in active mappings
  const currentlyAssignedSystemFields = new Set(
    mappings.filter(m => m.enabled && m.systemField).map(m => m.systemField)
  )

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Planilha de Produtos"
    >
      <div className="space-y-5 text-sm text-gray-700 dark:text-gray-200">

        {/* 1. Header & Template Download (Shown ONLY when NO file is uploaded) */}
        {!file && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800">
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-xs">Modelo Oficial XLSX</h4>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Baixe o modelo com todos os cabeçalhos fiscais para Notaas NF-e 55.
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
          <div className="flex items-center justify-between bg-green-50/70 dark:bg-green-950/30 p-3 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet size={20} className="text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-green-900 dark:text-green-200 text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-green-700 dark:text-green-400">{rawRows.length} linha(s) • {importHeaders.length} coluna(s) no arquivo</p>
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

        {/* 3. Dynamic Column Mappings Section */}
        {file && (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
              Mapeamento das Colunas da Planilha ({mappings.length})
            </label>

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

              {/* Add New Mapping Button at the Bottom of the List */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddMappingRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-all"
                >
                  <Plus size={13} />
                  Adicionar Novo Mapeamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Validation Report Table */}
        {report && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xs">
                Relatório de Validação Pré-Importação
                {report.errors.length === 0 ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-md border border-green-300 dark:border-green-800">
                    <CheckCircle size={13} /> Planilha 100% Válida
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                    <AlertTriangle size={13} /> {report.errors.length} Erro(s)
                  </span>
                )}
              </h4>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Total: <b>{report.totalRows}</b> | Válidos: <b>{report.validCount}</b> | Erros: <b>{report.invalidCount}</b>
              </div>
            </div>

            {report.duplicateCodes.length > 0 && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200">
                <b>Atenção:</b> Códigos de produto duplicados detectados no mesmo arquivo: {report.duplicateCodes.join(', ')}
              </div>
            )}

            {report.errors.length > 0 && (
              <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Linha</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Código Produto</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Campo</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Valor Inválido</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Motivo do Erro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {report.errors.map((errItem, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">{errItem.rowNumber}</td>
                          <td className="px-3 py-2 font-mono text-primary-600 dark:text-primary-400">{errItem.productCode}</td>
                          <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{errItem.field}</td>
                          <td className="px-3 py-2 font-mono text-red-600 dark:text-red-400">{String(errItem.invalidValue ?? '')}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{errItem.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isValidating || isApplying}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          {file && (
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || isApplying}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              <RefreshCw size={15} className={isValidating ? 'animate-spin' : ''} />
              {isValidating ? 'Validando Planilha...' : 'Validar Planilha'}
            </button>
          )}

          {file && (
            <button
              type="button"
              onClick={handleApplyImport}
              disabled={!report || isApplying || isValidating}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              <Upload size={16} />
              {isApplying ? 'Importando Produtos...' : 'Aplicar Importação'}
            </button>
          )}
        </div>
      </div>
    </AdminModal>
  )
}
