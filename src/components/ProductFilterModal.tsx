import { RotateCcw, Check } from 'lucide-react'
import AdminModal from './AdminModal'

export interface ProductFiltersState {
  minMargin: string
  maxMargin: string
  minCost: string
  maxCost: string
  category: string
  marketplaces: {
    site: boolean
    mercado_livre: boolean
    shopee: boolean
  }
  nfeEnabled: 'all' | 'sim' | 'nao'
  hasLabel: 'all' | 'sim' | 'nao'
  imagesFilter: 'all' | 'none' | 'single' | 'multiple'
}

export const INITIAL_FILTERS_STATE: ProductFiltersState = {
  minMargin: '',
  maxMargin: '',
  minCost: '',
  maxCost: '',
  category: '',
  marketplaces: {
    site: true,
    mercado_livre: true,
    shopee: true,
  },
  nfeEnabled: 'all',
  hasLabel: 'all',
  imagesFilter: 'all',
}

export function countActiveFilters(filters: ProductFiltersState): number {
  let count = 0
  if (filters.minMargin.trim()) count++
  if (filters.maxMargin.trim()) count++
  if (filters.minCost.trim()) count++
  if (filters.maxCost.trim()) count++
  if (filters.category.trim()) count++
  if (!filters.marketplaces.site || !filters.marketplaces.mercado_livre || !filters.marketplaces.shopee) count++
  if (filters.nfeEnabled !== 'all') count++
  if (filters.hasLabel !== 'all') count++
  if (filters.imagesFilter !== 'all') count++
  return count
}

interface ProductFilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: ProductFiltersState
  onChange: (filters: ProductFiltersState) => void
  onReset: () => void
  categoriesToDisplay: string[]
}

export default function ProductFilterModal({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  categoriesToDisplay,
}: ProductFilterModalProps) {
  const activeCount = countActiveFilters(filters)

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Filtros Avançados de Produtos"
      widthClass="max-w-3xl"
      footer={(
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={14} /> Limpar Todos os Filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Check size={14} /> Aplicar Filtros ({activeCount})
          </button>
        </div>
      )}
    >
      <div className="space-y-6 text-sm text-gray-700 dark:text-gray-200">
        
        {/* Section 1: Preço & Margem */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
          {/* Margem */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Margem de Lucro (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Mín %"
                value={filters.minMargin}
                onChange={e => onChange({ ...filters, minMargin: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              />
              <span className="text-gray-400 text-xs">até</span>
              <input
                type="number"
                placeholder="Máx %"
                value={filters.maxMargin}
                onChange={e => onChange({ ...filters, maxMargin: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Custo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Custo de Compra (R$)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Mín R$"
                value={filters.minCost}
                onChange={e => onChange({ ...filters, minCost: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              />
              <span className="text-gray-400 text-xs">até</span>
              <input
                type="number"
                placeholder="Máx R$"
                value={filters.maxCost}
                onChange={e => onChange({ ...filters, maxCost: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Categoria & Marketplaces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Categoria */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Categoria
            </label>
            <select
              value={filters.category}
              onChange={e => onChange({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="">Todas as Categorias</option>
              {categoriesToDisplay.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Marketplaces */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Marketplaces / Canais
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.marketplaces.site}
                  onChange={e => onChange({ ...filters, marketplaces: { ...filters.marketplaces, site: e.target.checked } })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                🌐 Site
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.marketplaces.mercado_livre}
                  onChange={e => onChange({ ...filters, marketplaces: { ...filters.marketplaces, mercado_livre: e.target.checked } })}
                  className="h-4 w-4 text-yellow-600 rounded"
                />
                💛 Mercado Livre
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.marketplaces.shopee}
                  onChange={e => onChange({ ...filters, marketplaces: { ...filters.marketplaces, shopee: e.target.checked } })}
                  className="h-4 w-4 text-orange-600 rounded"
                />
                🟠 Shopee
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: NF-e, Rótulo & Imagens */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Habilitado NF-e */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Habilitado para NF-e
            </label>
            <select
              value={filters.nfeEnabled}
              onChange={e => onChange({ ...filters, nfeEnabled: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="sim">Sim (Habilitado)</option>
              <option value="nao">Não (Desabilitado)</option>
            </select>
          </div>

          {/* Rótulo */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Com Rótulo Vinculado
            </label>
            <select
              value={filters.hasLabel}
              onChange={e => onChange({ ...filters, hasLabel: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="sim">Sim (Possui Rótulo)</option>
              <option value="nao">Não (Sem Rótulo)</option>
            </select>
          </div>

          {/* Qtd Imagens */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Imagens Vinculadas
            </label>
            <select
              value={filters.imagesFilter}
              onChange={e => onChange({ ...filters, imagesFilter: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Todas as quantidades</option>
              <option value="none">Sem imagem (0)</option>
              <option value="single">Apenas 1 imagem</option>
              <option value="multiple">Múltiplas imagens (2+)</option>
            </select>
          </div>
        </div>

      </div>
    </AdminModal>
  )
}
