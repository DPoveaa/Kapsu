import { useEffect, useMemo, useState } from 'react'
import { FileText, Loader2, Lock, RotateCcw } from 'lucide-react'
import AdminModal from './AdminModal'
import {
  ProductPdfFieldKey,
  ProductPdfReportOptions,
  ProductPdfReportScope,
} from '../types/productPdfReport'

const MAX_FIELDS = 8
const STORAGE_KEY = 'kapsu:product-pdf-options'
const RECOMMENDED_FIELDS: ProductPdfFieldKey[] = ['name', 'price', 'compositions']

const FIELD_GROUPS: Array<{
  title: string
  description: string
  fields: Array<{ key: ProductPdfFieldKey; label: string; hint?: string; internal?: boolean }>
}> = [
  {
    title: 'Identificação',
    description: 'Informações básicas para reconhecer e organizar os produtos.',
    fields: [
      { key: 'name', label: 'Nome do produto', hint: 'Obrigatório em todos os relatórios' },
      { key: 'category', label: 'Categoria' },
      { key: 'sku', label: 'SKU' },
      { key: 'description', label: 'Descrição' },
    ],
  },
  {
    title: 'Preços',
    description: 'Valores comerciais e internos do catálogo.',
    fields: [
      { key: 'price', label: 'Preço de venda' },
      { key: 'promo_price', label: 'Preço promocional' },
      { key: 'purchase_price', label: 'Preço da distribuidora', internal: true },
      { key: 'markup', label: 'Markup (%)', internal: true },
    ],
  },
  {
    title: 'Informações do produto',
    description: 'Conteúdo descritivo, técnico e de orientação.',
    fields: [
      { key: 'compositions', label: 'Formulação / composição' },
      { key: 'benefits', label: 'Benefícios' },
      { key: 'indication', label: 'Indicação de uso' },
      { key: 'contraindication', label: 'Contraindicação' },
    ],
  },
  {
    title: 'Apresentação e operação',
    description: 'Detalhes de dose, estoque, situação e entrega.',
    fields: [
      { key: 'intended_form', label: 'Forma pretendida' },
      { key: 'intended_presentation', label: 'Apresentação pretendida' },
      { key: 'intended_units_per_dose', label: 'Unidades por dose' },
      { key: 'quantity', label: 'Estoque' },
      { key: 'status', label: 'Status' },
      { key: 'free_shipping', label: 'Frete grátis' },
    ],
  },
]

const SCOPE_OPTIONS: Array<{
  value: ProductPdfReportScope
  label: string
  description: string
}> = [
  {
    value: 'active',
    label: 'Somente ativos',
    description: 'Catálogo atual disponível para venda.',
  },
  {
    value: 'non_archived',
    label: 'Ativos e inativos',
    description: 'Inclui produtos desativados, sem os arquivados.',
  },
  {
    value: 'all',
    label: 'Todos os produtos',
    description: 'Inclui também os produtos arquivados.',
  },
]

function loadStoredOptions(): ProductPdfReportOptions {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ProductPdfReportOptions>
    const hasStoredFields = Array.isArray(parsed.fields)
    const allowedFields = new Set(FIELD_GROUPS.flatMap(group => group.fields.map(field => field.key)))
    const fields = Array.isArray(parsed.fields)
      ? parsed.fields.filter((field): field is ProductPdfFieldKey => allowedFields.has(field as ProductPdfFieldKey))
      : []
    const normalizedFields = ['name', ...fields.filter(field => field !== 'name')].slice(0, MAX_FIELDS) as ProductPdfFieldKey[]
    const scope = SCOPE_OPTIONS.some(option => option.value === parsed.scope)
      ? parsed.scope as ProductPdfReportScope
      : 'active'

    return {
      fields: hasStoredFields ? normalizedFields : RECOMMENDED_FIELDS,
      scope,
    }
  } catch {
    return { fields: RECOMMENDED_FIELDS, scope: 'active' }
  }
}

interface ProductPdfExportModalProps {
  isOpen: boolean
  isExporting: boolean
  onClose: () => void
  onExport: (options: ProductPdfReportOptions) => Promise<void>
  selectedIds?: string[]
}

export default function ProductPdfExportModal({
  isOpen,
  isExporting,
  onClose,
  onExport,
  selectedIds = [],
}: ProductPdfExportModalProps) {
  const [options, setOptions] = useState<ProductPdfReportOptions>(loadStoredOptions)
  const [onlySelected, setOnlySelected] = useState(false)
  const selectedFields = useMemo(() => new Set(options.fields), [options.fields])
  const limitReached = options.fields.length >= MAX_FIELDS

  useEffect(() => {
    if (isOpen && selectedIds && selectedIds.length > 0) {
      setOnlySelected(true)
    } else if (isOpen) {
      setOnlySelected(false)
    }
  }, [isOpen, selectedIds])

  useEffect(() => {
    if (!isOpen) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
    } catch {
      // The export remains usable when browser storage is unavailable.
    }
  }, [isOpen, options])

  const toggleField = (field: ProductPdfFieldKey) => {
    if (field === 'name') return
    setOptions(current => {
      const isSelected = current.fields.includes(field)
      if (!isSelected && current.fields.length >= MAX_FIELDS) return current
      return {
        ...current,
        fields: isSelected
          ? current.fields.filter(currentField => currentField !== field)
          : [...current.fields, field],
      }
    })
  }

  const resetRecommended = () => {
    setOptions(current => ({ ...current, fields: RECOMMENDED_FIELDS }))
  }

  const clearOptional = () => {
    setOptions(current => ({ ...current, fields: ['name'] }))
  }

  const closeSafely = () => {
    if (!isExporting) onClose()
  }

  const handleExportClick = () => {
    onExport({
      ...options,
      productIds: (onlySelected && selectedIds.length > 0) ? selectedIds : undefined,
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={closeSafely}
      title="Configurar exportação em PDF"
      widthClass="max-w-4xl"
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {options.fields.length} de {MAX_FIELDS} campos selecionados
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={closeSafely}
              disabled={isExporting}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExportClick}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {isExporting ? 'Gerando PDF...' : 'Gerar PDF'}
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-6">
        {selectedIds.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 dark:border-blue-800 dark:bg-blue-950/30">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-900 dark:text-gray-100">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={e => setOnlySelected(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Exportar somente os {selectedIds.length} produto(s) selecionado(s) na tabela</span>
            </label>
          </div>
        )}

        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quais produtos devem aparecer?</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {SCOPE_OPTIONS.map(scopeOption => (
              <label
                key={scopeOption.value}
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  options.scope === scopeOption.value
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-950/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="product-pdf-scope"
                    value={scopeOption.value}
                    checked={options.scope === scopeOption.value}
                    onChange={() => setOptions(current => ({ ...current, scope: scopeOption.value }))}
                    className="mt-0.5 h-4 w-4 accent-primary-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{scopeOption.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">{scopeOption.description}</span>
                  </span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Campos do relatório</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Campos internos são visíveis somente neste PDF administrativo.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetRecommended}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <RotateCcw size={13} />
                Recomendado
              </button>
              <button
                type="button"
                onClick={clearOptional}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Limpar opcionais
              </button>
            </div>
          </div>

          {limitReached && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Limite de {MAX_FIELDS} campos atingido. Desmarque um campo para selecionar outro.
            </p>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FIELD_GROUPS.map(group => (
              <div key={group.title} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{group.title}</h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
                <div className="mt-3 space-y-2">
                  {group.fields.map(field => {
                    const isRequired = field.key === 'name'
                    const isSelected = selectedFields.has(field.key)
                    const isDisabled = isRequired || (!isSelected && limitReached)
                    return (
                      <label
                        key={field.key}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                          isSelected
                            ? 'border-primary-200 bg-primary-50/60 dark:border-primary-900/60 dark:bg-primary-950/20'
                            : 'border-transparent bg-gray-50 dark:bg-gray-800/60'
                        } ${isDisabled && !isRequired ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleField(field.key)}
                          className="mt-0.5 h-4 w-4 rounded accent-primary-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                            {field.label}
                            {isRequired && <Lock size={12} className="text-gray-400" aria-label="Obrigatório" />}
                            {field.internal && (
                              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                Interno
                              </span>
                            )}
                          </span>
                          {field.hint && (
                            <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">{field.hint}</span>
                          )}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminModal>
  )
}
