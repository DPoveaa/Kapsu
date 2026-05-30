import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, MoveUp, MoveDown, X } from 'lucide-react'
import { headerCategoriesService, HeaderCategory } from '../services/header-categories.service'
import { siteSettingsService } from '../services/site-settings.service'
import * as LucideIcons from 'lucide-react'
import { confirm } from '../utils/toast'

// Array de nomes de ícones comuns para o seletor
const COMMON_ICONS = [
  'Tag', 'Star', 'Percent', 'Gift', 'ShoppingBag', 'Package', 'Truck', 'Zap',
  'Heart', 'Smile', 'Coffee', 'Info', 'HelpCircle', 'Home', 'Activity', 'Award',
  'Bookmark', 'Camera', 'Compass', 'CreditCard', 'Feather', 'Flag', 'Globe', 'Key'
];

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
      await siteSettingsService.updateSettings({ header_bar_bg_color: barBgColor } as any)
      window.dispatchEvent(new Event('header-settings-updated'))
    } catch (error) {
      console.error('Error saving bg color:', error)
      alert('Erro ao salvar cor da faixa.')
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
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Configurações Globais */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configurações da Faixa</h2>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex items-center">
              <input
                id="use_header_color"
                type="checkbox"
                checked={barBgColor === 'transparent'}
                onChange={(e) => setBarBgColor(e.target.checked ? 'transparent' : '#1F2937')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="use_header_color" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 font-medium">
                Herdar cor do cabeçalho (Fundo transparente)
              </label>
            </div>

            {barBgColor !== 'transparent' && (
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                  Cor de Fundo:
                </label>
                <input
                  type="color"
                  value={barBgColor}
                  onChange={(e) => setBarBgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={barBgColor}
                  onChange={(e) => setBarBgColor(e.target.value)}
                  className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-28 text-sm"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSaveBgColor}
            disabled={savingBgColor}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors h-10 flex items-center justify-center whitespace-nowrap"
          >
            {savingBgColor ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

        {/* Preview da faixa */}
        <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-white dark:bg-gray-900 p-2 text-xs text-gray-500 text-center border-b border-gray-200 dark:border-gray-700">
            Preview do Cabeçalho (Header Principal acima)
          </div>
          <div
            className="w-full flex items-center justify-center gap-6 py-2 px-4 overflow-x-auto"
            style={{ backgroundColor: barBgColor }}
          >
            {categories.filter(c => c.active).length === 0 ? (
              <span className="text-sm opacity-70 py-1" style={{ color: '#fff' }}>Nenhuma categoria ativa</span>
            ) : (
              categories.filter(c => c.active).map(cat => {
                const CatIcon = (LucideIcons as any)[cat.icon || 'Tag'] || LucideIcons.Tag
                return (
                  <div key={cat.id} className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-black/10 rounded-full transition-colors whitespace-nowrap">
                    {cat.show_icon && <CatIcon size={16} style={{ color: cat.icon_color }} />}
                    <span className="text-sm font-medium" style={{ color: cat.text_color }}>{cat.name}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Lista de Categorias */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Ordem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visualização</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category, index) => {
              const CatIcon = (LucideIcons as any)[category.icon || 'Tag'] || LucideIcons.Tag;

              return (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400"
                      >
                        <MoveUp size={16} />
                      </button>
                      <button
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400"
                      >
                        <MoveDown size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" style={{ backgroundColor: barBgColor }}>
                      {category.show_icon && <CatIcon size={18} style={{ color: category.icon_color }} />}
                      <span className="font-medium" style={{ color: category.text_color }}>{category.name}</span>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(category)}
                      className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400 mr-4"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
              <form onSubmit={handleSave}>
                <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl leading-6 font-bold text-gray-900 dark:text-white">
                      {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Texto (Nome)</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 text-base py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Ex: Ofertas"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atalho de Destino</label>
                        <select
                          onChange={(e) => {
                            if (e.target.value === 'promo') {
                              setFormData({ ...formData, name: formData.name || 'Promoções', url: '/produtos?promocao=true' });
                            } else if (e.target.value === 'best') {
                              setFormData({ ...formData, name: formData.name || 'Mais Vendidos', url: '/produtos?ordenar=mais-vendidos' });
                            }
                          }}
                          className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 text-base py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                        >
                          <option value="custom">URL Personalizada</option>
                          <option value="promo">Página de Promoções</option>
                          <option value="best">Página de Mais Vendidos</option>
                        </select>
                        
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link (URL)</label>
                        <input
                          type="text"
                          required
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 text-base py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Ex: /produtos?categoria=ofertas"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="show_icon"
                        type="checkbox"
                        checked={formData.show_icon}
                        onChange={(e) => setFormData({ ...formData, show_icon: e.target.checked })}
                        className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="show_icon" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 font-medium">
                        Exibir ícone
                      </label>
                    </div>

                    {formData.show_icon && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecione um Ícone</label>
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-48 overflow-y-auto p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                          {COMMON_ICONS.map(iconName => {
                            const IconCmp = (LucideIcons as any)[iconName]
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ColorPickerField 
                        label="Cor do Texto" 
                        color={formData.text_color} 
                        onChange={(c) => setFormData({ ...formData, text_color: c })} 
                      />

                      {formData.show_icon && (
                        <ColorPickerField 
                          label="Cor do Ícone" 
                          color={formData.icon_color} 
                          onChange={(c) => setFormData({ ...formData, icon_color: c })} 
                        />
                      )}
                    </div>

                    <div className="flex items-center mt-6">
                      <input
                        id="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 font-medium">
                        Ativo (visível no site)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse rounded-b-xl gap-3">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-2.5 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:text-sm transition-colors"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
