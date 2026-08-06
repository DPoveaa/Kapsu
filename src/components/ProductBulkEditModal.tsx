import { useState } from 'react'
import { Check, Loader2, Store, Tag, Users, ShieldAlert, Archive, Minus, ArchiveRestore } from 'lucide-react'
import AdminModal from './AdminModal'

export interface ProductBulkEditModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  suppliers: Array<{ id: string; trade_name?: string | null; name: string }>
  activeTab: 'active' | 'inactive' | 'archived'
  onApplySupplier: (supplierId: string) => Promise<void>
  onApplyCategory: (category: string) => Promise<void>
  onApplyMarketplaces: (marketplaceTags: string) => Promise<void>
  onApplyStatus: (action: 'activate' | 'deactivate' | 'archive' | 'unarchive_active' | 'unarchive_inactive') => Promise<void>
}

export default function ProductBulkEditModal({
  isOpen,
  onClose,
  selectedCount,
  suppliers,
  activeTab,
  onApplySupplier,
  onApplyCategory,
  onApplyMarketplaces,
  onApplyStatus,
}: ProductBulkEditModalProps) {
  const [activeTabSection, setActiveTabSection] = useState<'supplier' | 'category' | 'marketplaces' | 'status'>('supplier')
  
  const [supplierId, setSupplierId] = useState('')
  const [category, setCategory] = useState('')
  const [marketplaceTags, setMarketplaceTags] = useState('site,mercado_livre,shopee')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleExecuteSupplier = async () => {
    if (!supplierId) return
    try {
      setIsSubmitting(true)
      await onApplySupplier(supplierId)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExecuteCategory = async () => {
    if (!category.trim()) return
    try {
      setIsSubmitting(true)
      await onApplyCategory(category.trim())
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExecuteMarketplaces = async () => {
    if (!marketplaceTags) return
    try {
      setIsSubmitting(true)
      await onApplyMarketplaces(marketplaceTags)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExecuteStatus = async (action: 'activate' | 'deactivate' | 'archive' | 'unarchive_active' | 'unarchive_inactive') => {
    try {
      setIsSubmitting(true)
      await onApplyStatus(action)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={`Editar ${selectedCount} produto(s) em massa`}
      widthClass="max-w-2xl"
    >
      <div className="space-y-5 text-sm text-gray-700 dark:text-gray-200">
        
        {/* Secondary Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2">
          <button
            type="button"
            onClick={() => setActiveTabSection('supplier')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTabSection === 'supplier'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Users size={14} /> Fornecedor
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('category')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTabSection === 'category'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Tag size={14} /> Categoria
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('marketplaces')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTabSection === 'marketplaces'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Store size={14} /> Marketplaces
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('status')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTabSection === 'status'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <ShieldAlert size={14} /> Status / Visibilidade
          </button>
        </div>

        {/* Option 1: Fornecedor */}
        {activeTabSection === 'supplier' && (
          <div className="space-y-4 py-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Selecione o Fornecedor para os {selectedCount} produtos:
            </label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione o fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.trade_name || s.name}</option>
              ))}
              <option value="__none__">Remover fornecedor (Sem Fornecedor)</option>
            </select>

            <button
              type="button"
              onClick={handleExecuteSupplier}
              disabled={!supplierId || isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Aplicar Fornecedor em {selectedCount} produtos
            </button>
          </div>
        )}

        {/* Option 2: Categoria */}
        {activeTabSection === 'category' && (
          <div className="space-y-4 py-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Digite o nome da Categoria para os {selectedCount} produtos:
            </label>
            <input
              type="text"
              placeholder="Ex: Suplementos, Vitaminas, Cosméticos..."
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-purple-500"
            />

            <button
              type="button"
              onClick={handleExecuteCategory}
              disabled={!category.trim() || isSubmitting}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Aplicar Categoria em {selectedCount} produtos
            </button>
          </div>
        )}

        {/* Option 3: Marketplaces */}
        {activeTabSection === 'marketplaces' && (
          <div className="space-y-4 py-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Selecione os Canais de Venda permitidos para os {selectedCount} produtos:
            </label>
            <select
              value={marketplaceTags}
              onChange={e => setMarketplaceTags(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-amber-500"
            >
              <option value="site,mercado_livre,shopee">Todos (Site + Mercado Livre + Shopee)</option>
              <option value="site">Apenas Site Próprio</option>
              <option value="mercado_livre">Apenas Mercado Livre</option>
              <option value="shopee">Apenas Shopee</option>
              <option value="site,mercado_livre">Site + Mercado Livre</option>
              <option value="site,shopee">Site + Shopee</option>
              <option value="mercado_livre,shopee">Mercado Livre + Shopee</option>
            </select>

            <button
              type="button"
              onClick={handleExecuteMarketplaces}
              disabled={!marketplaceTags || isSubmitting}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Aplicar Marketplaces em {selectedCount} produtos
            </button>
          </div>
        )}

        {/* Option 4: Status */}
        {activeTabSection === 'status' && (
          <div className="space-y-3 py-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Ações de Status para os {selectedCount} produtos selecionados (aba atual: {activeTab}):
            </label>

            {activeTab === 'active' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExecuteStatus('deactivate')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Minus size={15} /> Desativar Produtos
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteStatus('archive')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Archive size={15} /> Arquivar Produtos
                </button>
              </div>
            )}

            {activeTab === 'inactive' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExecuteStatus('activate')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Check size={15} /> Ativar Produtos
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteStatus('archive')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Archive size={15} /> Arquivar Produtos
                </button>
              </div>
            )}

            {activeTab === 'archived' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExecuteStatus('unarchive_inactive')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <ArchiveRestore size={15} /> Desarquivar para Inativo
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteStatus('unarchive_active')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Check size={15} /> Desarquivar e Ativar
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminModal>
  )
}
