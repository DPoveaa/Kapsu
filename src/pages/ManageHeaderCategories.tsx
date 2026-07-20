import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, MoveUp, MoveDown } from 'lucide-react'
import { headerCategoriesService, HeaderCategory } from '../services/header-categories.service'
import { siteSettingsService } from '../services/site-settings.service'
import { CATEGORY_ICON_NAMES, getCategoryIcon } from '../components/categoryIconMap'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

// Array de nomes de ícones comuns para o seletor
const COMMON_ICONS = CATEGORY_ICON_NAMES

function ColorPickerField({ label, color, onChange }: { label: string, color: string, onChange: (color: string) => void }) {
  const [localColor, setLocalColor] = useState(color);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const handleChange = (newColor: string) => {
    setLocalColor(newColor);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newColor);
    }, 100);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={localColor}
          onChange={(e) => handleChange(e.target.value)}
          className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={localColor}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border-gray-300 dark:border-gray-600 text-base py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
}

export default function ManageHeaderCategories() {
  const [categories, setCategories] = useState<HeaderCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [barBgColor, setBarBgColor] = useState('#1F2937')
  const [barBgColorDark, setBarBgColorDark] = useState('#111827')
  const [savingBgColor, setSavingBgColor] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<HeaderCategory | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    icon: 'Tag',
    show_icon: true,
    url: '',
    text_color: '#FFFFFF',
    icon_color: '#FFFFFF',
    text_color_dark: '#FFFFFF',
    icon_color_dark: '#FFFFFF',
    active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await headerCategoriesService.getAll(false)
      setCategories(data)

      const settings = await siteSettingsService.getSettings()
      if ((settings as any).header_bar_bg_color) {
        setBarBgColor((settings as any).header_bar_bg_color)
      }
      if ((settings as any).header_bar_bg_color_dark) {
        setBarBgColorDark((settings as any).header_bar_bg_color_dark)
      }
    } catch (error) {
      console.error('Error fetching header categories:', error)
      alert('Erro ao carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBgColor = async () => {
    try {
      setSavingBgColor(true)
      await siteSettingsService.updateSettings({
        header_bar_bg_color: barBgColor,
        header_bar_bg_color_dark: barBgColorDark
      } as any)
      window.dispatchEvent(new Event('header-settings-updated'))
    } catch (error) {
      console.error('Error saving bg color:', error)
      alert('Erro ao salvar cores da faixa.')
    } finally {
      setSavingBgColor(false)
    }
  }

  const openAddModal = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      icon: 'Tag',
      show_icon: true,
      url: '',
      text_color: '#FFFFFF',
      icon_color: '#FFFFFF',
      text_color_dark: '#FFFFFF',
      icon_color_dark: '#FFFFFF',
      active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (category: HeaderCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon || 'Tag',
      show_icon: category.show_icon,
      url: category.url,
      text_color: category.text_color,
      icon_color: category.icon_color,
      text_color_dark: category.text_color_dark || '#FFFFFF',
      icon_color_dark: category.icon_color_dark || '#FFFFFF',
      active: category.active
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    confirm.show('Tem certeza que deseja excluir esta categoria?', async () => {
      try {
        await headerCategoriesService.delete(id)
        fetchData()
        window.dispatchEvent(new Event('header-settings-updated'))
      } catch (error) {
        console.error('Error deleting category:', error)
        alert('Erro ao excluir categoria.')
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await headerCategoriesService.update(editingCategory.id, formData)
      } else {
        await headerCategoriesService.create({
          ...formData,
          order_index: categories.length
        })
      }
      setIsModalOpen(false)
      fetchData()
      window.dispatchEvent(new Event('header-settings-updated'))
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Erro ao salvar categoria.')
    }
  }

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) return;

    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    // Update visual order immediately
    setCategories(newCategories);

    // Prepare items for backend reorder
    const reorderItems = newCategories.map((cat, i) => ({
      id: cat.id,
      order_index: i
    }));

    try {
      await headerCategoriesService.reorder(reorderItems);
      window.dispatchEvent(new Event('header-settings-updated'))
    } catch (error) {
      console.error('Error reordering:', error);
      alert('Erro ao reordenar categorias.');
      fetchData(); // revert
    }
  }


  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Categorias do Cabeçalho</h1>
        <button
          onClick={openAddModal}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm text-sm font-medium hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Configurações Globais */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configurações da Faixa</h2>
        
        <div className="flex flex-col gap-6">
          {/* Herdar Cor Switch */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Herdar cor do cabeçalho (Fundo transparente)</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Usa o fundo padrão do cabeçalho da loja</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const isTransparent = barBgColor === 'transparent'
                setBarBgColor(isTransparent ? '#1F2937' : 'transparent')
                setBarBgColorDark(isTransparent ? '#111827' : 'transparent')
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                barBgColor === 'transparent' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  barBgColor === 'transparent' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {barBgColor !== 'transparent' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Light Mode Color */}
              <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cor de Fundo (Modo Claro)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={barBgColor}
                    onChange={(e) => setBarBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={barBgColor}
                    onChange={(e) => setBarBgColor(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-950 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Dark Mode Color */}
              <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cor de Fundo (Modo Escuro)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={barBgColorDark}
                    onChange={(e) => setBarBgColorDark(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={barBgColorDark}
                    onChange={(e) => setBarBgColorDark(e.target.value)}
                    className="flex-1 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-950 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveBgColor}
              disabled={savingBgColor}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 shadow-sm font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap text-sm h-10 animate-pulse-subtle"
            >
              {savingBgColor ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>

        {/* Previews da faixa */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
          {/* Preview Modo Claro */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/60 p-2 text-xs text-gray-500 font-semibold text-center border-b border-gray-200 dark:border-gray-700">
              Preview da Faixa (Modo Claro)
            </div>
            <div
              className="w-full flex items-center justify-center gap-6 py-3 px-4 overflow-x-auto min-h-[50px]"
              style={{ backgroundColor: barBgColor === 'transparent' ? '#FFFFFF' : barBgColor }}
            >
              {categories.filter(c => c.active).length === 0 ? (
                <span className="text-sm opacity-60 text-gray-500 py-1">Nenhuma categoria ativa</span>
              ) : (
                categories.filter(c => c.active).map(cat => {
                  const CatIcon = getCategoryIcon(cat.icon)
                  return (
                    <div key={cat.id} className="flex items-center gap-1.5 px-2.5 py-0.5 cursor-pointer hover:bg-black/5 rounded-full transition-colors whitespace-nowrap">
                      {cat.show_icon && <CatIcon size={14} style={{ color: cat.icon_color }} />}
                      <span className="text-xs font-medium" style={{ color: cat.text_color }}>{cat.name}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Preview Modo Escuro */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/60 p-2 text-xs text-gray-500 font-semibold text-center border-b border-gray-200 dark:border-gray-700">
              Preview da Faixa (Modo Escuro)
            </div>
            <div
              className="w-full flex items-center justify-center gap-6 py-3 px-4 overflow-x-auto min-h-[50px]"
              style={{ backgroundColor: barBgColorDark === 'transparent' ? '#111827' : barBgColorDark }}
            >
              {categories.filter(c => c.active).length === 0 ? (
                <span className="text-sm opacity-60 text-gray-400 py-1">Nenhuma categoria ativa</span>
              ) : (
                categories.filter(c => c.active).map(cat => {
                  const CatIcon = getCategoryIcon(cat.icon)
                  return (
                    <div key={cat.id} className="flex items-center gap-1.5 px-2.5 py-0.5 cursor-pointer hover:bg-white/10 rounded-full transition-colors whitespace-nowrap">
                      {cat.show_icon && <CatIcon size={14} style={{ color: cat.icon_color_dark || '#FFFFFF' }} />}
                      <span className="text-xs font-medium" style={{ color: cat.text_color_dark || '#FFFFFF' }}>{cat.name}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Categorias - Tabela Responsiva */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto relative scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16 whitespace-nowrap">Ordem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Visualização</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-[#1f2937] z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category, index) => {
              const CatIcon = getCategoryIcon(category.icon);

              return (
                <tr key={category.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      >
                        <MoveUp size={16} />
                      </button>
                      <button
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      >
                        <MoveDown size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Light Preview */}
                      <div className="flex items-center gap-2 p-1.5 px-3 rounded-full border border-gray-200" style={{ backgroundColor: barBgColor === 'transparent' ? '#FFFFFF' : barBgColor }}>
                        {category.show_icon && <CatIcon size={14} style={{ color: category.icon_color }} />}
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: category.text_color }}>{category.name}</span>
                      </div>
                      {/* Dark Preview */}
                      <div className="flex items-center gap-2 p-1.5 px-3 rounded-full border border-gray-700" style={{ backgroundColor: barBgColorDark === 'transparent' ? '#111827' : barBgColorDark }}>
                        {category.show_icon && <CatIcon size={14} style={{ color: category.icon_color_dark || '#FFFFFF' }} />}
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: category.text_color_dark || '#FFFFFF' }}>{category.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {category.url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {category.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-[#153e5c] z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.2)] transition-colors">
                    <button
                      onClick={() => openEditModal(category)}
                      className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400 mr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded p-1 inline-flex items-center"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded p-1 inline-flex items-center"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma categoria cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Adição/Edição */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        widthClass="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="header-category-form"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 shadow-sm text-sm font-medium hover:scale-[1.02] active:scale-[0.98]"
            >
              Salvar
            </button>
          </div>
        }
      >
        <form id="header-category-form" onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Texto (Nome) *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Ex: Ofertas"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Atalho de Destino</label>
              <select
                onChange={(e) => {
                  if (e.target.value === 'promo') {
                    setFormData({ ...formData, name: formData.name || 'Promoções', url: '/produtos?promocao=true' });
                  } else if (e.target.value === 'best') {
                    setFormData({ ...formData, name: formData.name || 'Mais Vendidos', url: '/produtos?ordenar=mais-vendidos' });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-2"
              >
                <option value="custom">URL Personalizada</option>
                <option value="promo">Página de Promoções</option>
                <option value="best">Página de Mais Vendidos</option>
              </select>
              
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Link (URL) *</label>
              <input
                type="text"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Ex: /produtos?categoria=ofertas"
              />
            </div>
          </div>

          {/* Toggle Exibir Ícone */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 animate-fade-in">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exibir ícone na categoria</span>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, show_icon: !prev.show_icon }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.show_icon ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  formData.show_icon ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {formData.show_icon && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Selecione um Ícone</label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-48 overflow-y-auto p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                {COMMON_ICONS.map(iconName => {
                  const IconCmp = getCategoryIcon(iconName)
                  if (!IconCmp) return null
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`p-3 rounded-lg flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors ${formData.icon === iconName ? 'bg-primary-200 dark:bg-primary-800 ring-2 ring-primary-500' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}
                      title={iconName}
                    >
                      <IconCmp size={24} className="text-gray-700 dark:text-gray-300" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cores por Tema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Tema Claro */}
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Modo Claro</h4>
              
              <ColorPickerField 
                label="Cor do Texto (Modo Claro)" 
                color={formData.text_color} 
                onChange={(c) => setFormData(prev => ({ ...prev, text_color: c }))} 
              />

              {formData.show_icon && (
                <ColorPickerField 
                  label="Cor do Ícone (Modo Claro)" 
                  color={formData.icon_color} 
                  onChange={(c) => setFormData(prev => ({ ...prev, icon_color: c }))} 
                />
              )}
            </div>

            {/* Tema Escuro */}
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Modo Escuro</h4>
              
              <ColorPickerField 
                label="Cor do Texto (Modo Escuro)" 
                color={formData.text_color_dark} 
                onChange={(c) => setFormData(prev => ({ ...prev, text_color_dark: c }))} 
              />

              {formData.show_icon && (
                <ColorPickerField 
                  label="Cor do Ícone (Modo Escuro)" 
                  color={formData.icon_color_dark} 
                  onChange={(c) => setFormData(prev => ({ ...prev, icon_color_dark: c }))} 
                />
              )}
            </div>
          </div>

          {/* Toggle Status Ativo */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">Ativo (visível no site)</span>
              <span className="text-xs text-gray-400">Exibir esta categoria na faixa do topo da loja</span>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  formData.active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  )
}
