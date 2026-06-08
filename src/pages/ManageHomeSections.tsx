import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Loader2, Star, X, Save, ArrowUp, ArrowDown, Package, Plus, Search } from 'lucide-react'
import { homeSectionsService, HomeSection } from '../services/home-sections.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

export default function ManageHomeSections() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<HomeSection[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<(Product & { featured_id?: string })[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null)
  const [creatingSection, setCreatingSection] = useState(false)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [selectedSectionForProducts, setSelectedSectionForProducts] = useState<string | null>(null)
  const [sectionProducts, setSectionProducts] = useState<Record<string, Product[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    active: true,
    display_type: 'category' as 'manual' | 'best_selling' | 'newest' | 'category' | 'promotions',
    categories: [] as string[], // multi-category selection
  })

  // Categorias com contagem de produtos, ordenadas por popularidade desc
  const categoriesWithCount = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const p of allProducts) {
      if (p.category) {
        p.category.split(',').forEach(c => {
          const key = c.trim().charAt(0).toUpperCase() + c.trim().slice(1).toLowerCase()
          if (key) countMap.set(key, (countMap.get(key) ?? 0) + 1)
        })
      }
    }
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1]) // mais produtos primeiro
      .map(([name, count]) => ({ name, count }))
  }, [allProducts])

  // Carrega dados
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [sectionsData, featuredData, allProductsData] = await Promise.all([
        homeSectionsService.getAll(true),
        homeSectionsService.getFeaturedProducts(true),
        productsService.getAllForAdmin(),
      ])
      
      const sorted = sectionsData.sort((a, b) => a.order - b.order)
      setSections(sorted)
      setFeaturedProducts(featuredData)
      setAllProducts(allProductsData)

      // Carrega produtos de cada seção manual
      const manualSections = sorted.filter(s => s.display_type === 'manual')
      const productsPromises = manualSections.map(async (section) => {
        try {
          const products = await homeSectionsService.getSectionProducts(section.id, true)
          return { sectionId: section.id, products }
        } catch (err) {
          return { sectionId: section.id, products: [] }
        }
      })
      const productsResults = await Promise.all(productsPromises)
      const productsMap: Record<string, Product[]> = {}
      productsResults.forEach(({ sectionId, products }) => {
        productsMap[sectionId] = products
      })
      setSectionProducts(productsMap)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSectionActive = async (section: HomeSection) => {
    setSections(prev => prev.map(s => s.id === section.id ? { ...s, active: !s.active } : s))
    try {
      await homeSectionsService.update(section.id, { active: !section.active })
    } catch (err: any) {
      // revert on error
      setSections(prev => prev.map(s => s.id === section.id ? { ...s, active: section.active } : s))
      alert(err.message || 'Erro ao alterar status da seção')
    }
  }

  const handleEdit = (section: HomeSection) => {
    setEditingSection(section)
    setCreatingSection(false)
    setFormData({
      name: section.name,
      key: section.key,
      active: section.active,
      display_type: section.display_type || 'category',
      categories: section.category ? section.category.split(',').map(c => c.trim()).filter(Boolean) : [],
    })
  }


  const handleCreate = async () => {
    if (!formData.name) {
      alert('Por favor, preencha o nome da seção')
      return
    }

    if (!formData.key) {
      alert('Por favor, preencha a chave da seção (ex: top-vendidos, promocoes)')
      return
    }

    if (!/^[a-z0-9-]+$/.test(formData.key)) {
      alert('A chave deve conter apenas letras minúsculas, números e hífens')
      return
    }

    try {
      const createData: any = {
        key: formData.key,
        name: formData.name,
        limit: 999,       // exibe todos os produtos da categoria
        show_link: true,  // sempre mostra "Ver todos"
        active: formData.active,
        display_type: formData.display_type,
        category: formData.categories.join(',') || null,
      }
      await homeSectionsService.create(createData)
      await loadData()
      setCreatingSection(false)
      resetForm()
    } catch (err: any) {
      console.error('Erro ao criar seção:', err)
      alert(err.message || 'Erro ao criar seção')
    }
  }

  const handleUpdate = async () => {
    if (!editingSection) return

    if (!formData.name) {
      alert('Por favor, preencha o nome da seção')
      return
    }

    try {
      await homeSectionsService.update(editingSection.id, {
        name: formData.name,
        active: formData.active,
        display_type: formData.display_type,
        category: formData.categories.join(',') || null,
        limit: 999,
        show_link: true,
      })
      await loadData()
      setEditingSection(null)
      resetForm()
    } catch (err: any) {
      console.error('Erro ao atualizar seção:', err)
      alert(err.message || 'Erro ao atualizar seção')
    }
  }

  const handleMove = async (section: HomeSection, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === section.id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= sections.length) return

    const newSections = [...sections]
    const [removed] = newSections.splice(currentIndex, 1)
    newSections.splice(newIndex, 0, removed)

    const sectionIds = newSections.map(s => s.id)

    try {
      await homeSectionsService.reorder(sectionIds)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao reordenar seções:', err)
      alert(err.message || 'Erro ao reordenar seções')
    }
  }

  const handleMoveProduct = async (product: Product, direction: 'up' | 'down') => {
    const currentIndex = featuredProducts.findIndex(p => p.id === product.id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= featuredProducts.length) return

    const newProducts = [...featuredProducts]
    const [removed] = newProducts.splice(currentIndex, 1)
    newProducts.splice(newIndex, 0, removed)

    const productIds = newProducts.map(p => p.id)

    try {
      await homeSectionsService.reorderFeaturedProducts(productIds)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao reordenar produtos:', err)
      alert(err.message || 'Erro ao reordenar produtos')
    }
  }

  const handleAddProduct = async (productId: string) => {
    try {
      await homeSectionsService.addFeaturedProduct(productId)
      await loadData()
      setShowAddProductModal(false)
      setSearchTerm('')
    } catch (err: any) {
      console.error('Erro ao adicionar produto:', err)
      alert(err.message || 'Erro ao adicionar produto')
    }
  }

  const handleRemoveProduct = (productId: string) => {
    confirm.show('Tem certeza que deseja remover este produto de destaque?', async () => {
      try {
        // A API aceita tanto o featured_id quanto o product_id
        await homeSectionsService.removeFeaturedProduct(productId)
        await loadData()
      } catch (err: any) {
        console.error('Erro ao remover produto:', err)
        alert(err.message || 'Erro ao remover produto')
      }
    })
  }

  const resetForm = () => {
    setCatSearch('')
    setFormData({
      name: '',
      key: '',
      active: true,
      display_type: 'category',
      categories: [],
    })
  }

  const applyPreset = (preset: 'top-vendidos' | 'top-promocoes' | 'mais-novos' | 'custom') => {
    setCreatingSection(true)
    setEditingSection(null)
    setCatSearch('')
    switch (preset) {
      case 'top-vendidos':
        setFormData({ name: 'Top Mais Vendidos', key: 'top-vendidos', active: true, display_type: 'best_selling', categories: [] })
        break
      case 'top-promocoes':
        setFormData({ name: 'Top Promoções', key: 'top-promocoes', active: true, display_type: 'promotions', categories: [] })
        break
      case 'mais-novos':
        setFormData({ name: 'Mais Novos', key: 'mais-novos', active: true, display_type: 'newest', categories: [] })
        break
      case 'custom':
        resetForm()
        setCreatingSection(true)
        break
    }
  }

  const handleAddSectionProduct = async (sectionId: string, productId: string) => {
    try {
      await homeSectionsService.addSectionProduct(sectionId, productId)
      await loadData()
      if (selectedSectionForProducts === sectionId) {
        setShowAddProductModal(false)
        setSearchTerm('')
      }
    } catch (err: any) {
      console.error('Erro ao adicionar produto:', err)
      alert(err.message || 'Erro ao adicionar produto')
    }
  }

  const handleRemoveSectionProduct = (sectionId: string, productId: string) => {
    confirm.show('Tem certeza que deseja remover este produto da seção?', async () => {
      try {
        await homeSectionsService.removeSectionProduct(sectionId, productId)
        await loadData()
      } catch (err: any) {
        console.error('Erro ao remover produto:', err)
        alert(err.message || 'Erro ao remover produto')
      }
    })
  }

  const handleMoveSectionProduct = async (sectionId: string, product: Product, direction: 'up' | 'down') => {
    const products = sectionProducts[sectionId] || []
    const currentIndex = products.findIndex(p => p.id === product.id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= products.length) return

    const newProducts = [...products]
    const [removed] = newProducts.splice(currentIndex, 1)
    newProducts.splice(newIndex, 0, removed)

    const productIds = newProducts.map(p => p.id)

    try {
      await homeSectionsService.reorderSectionProducts(sectionId, productIds)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao reordenar produtos:', err)
      alert(err.message || 'Erro ao reordenar produtos')
    }
  }

  const handleCancel = () => {
    resetForm()
    setEditingSection(null)
    setCreatingSection(false)
  }

  const handleDeleteSection = (sectionId: string, sectionName: string) => {
    confirm.show(`Tem certeza que deseja deletar a seção "${sectionName}"?\n\nEsta ação não pode ser desfeita e todos os produtos associados a esta seção serão removidos.`, async () => {
      try {
        await homeSectionsService.delete(sectionId)
        await loadData()
        // Limpa o estado de edição se a seção deletada estava sendo editada
        if (editingSection?.id === sectionId) {
          setEditingSection(null)
          resetForm()
        }
      } catch (err: any) {
        console.error('Erro ao deletar seção:', err)
        alert(err.message || 'Erro ao deletar seção')
      }
    })
  }

  // Filtra produtos disponíveis
  const getAvailableProducts = () => {
    // Se está adicionando para uma seção manual específica
    if (selectedSectionForProducts) {
      const section = sections.find(s => s.id === selectedSectionForProducts)
      if (!section) return []

      const sectionProds = sectionProducts[section.id] || []
      
      return allProducts.filter(
        product => 
          !sectionProds.some(sp => sp.id === product.id) &&
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Se está adicionando para "Produtos em Destaque" (featured)
    const featuredProductIds = featuredProducts.map(p => p.id)
    return allProducts.filter(
      product => 
        !featuredProductIds.includes(product.id) &&
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const availableProducts = getAvailableProducts()

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gerenciar Página Inicial</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerencie seções e produtos em destaque da página inicial</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Botão para criar nova seção */}
        {!editingSection && !creatingSection && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Criar Nova Seção</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Escolha um preset ou crie uma seção customizada</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset('top-vendidos')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                📊 Top Mais Vendidos
              </button>
              <button
                onClick={() => applyPreset('top-promocoes')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                🎯 Top Promoções
              </button>
              <button
                onClick={() => applyPreset('mais-novos')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                ⭐ Mais Novos
              </button>
              <button
                onClick={() => applyPreset('custom')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                ✨ Customizado
              </button>
            </div>
          </div>
        )}

        {/* Modal de criação/edição de seção */}
        <AdminModal
          isOpen={!!(editingSection || creatingSection)}
          onClose={handleCancel}
          title={creatingSection ? 'Criar Nova Seção' : `Editar Seção: ${editingSection?.key}`}
          widthClass="max-w-xl"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancelar
              </button>
              {creatingSection ? (
                <button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.key}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Criar Seção
                </button>
              ) : (
                <button
                  onClick={handleUpdate}
                  disabled={!formData.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  <Save size={16} />
                  Salvar alterações
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Chave (só na criação) */}
            {creatingSection && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Chave da Seção *</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="ex: vitaminas, promocoes"
                />
                <p className="text-xs text-gray-500 mt-0.5">Apenas letras minúsculas, números e hífens.</p>
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome da Seção *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ex: Vitaminas e Suplementos"
              />
            </div>

            {/* Tipo de exibição */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Exibição</label>
              <select
                value={formData.display_type}
                onChange={(e) => setFormData(prev => ({ ...prev, display_type: e.target.value as any, categories: [] }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="category">Por Categoria</option>
                <option value="manual">Manual (escolher produtos)</option>
                <option value="best_selling">Mais Vendidos</option>
                <option value="newest">Mais Novos</option>
                <option value="promotions">Promoções</option>
              </select>
            </div>

            {/* Seletor de categorias — multi-select visual */}
            {formData.display_type === 'category' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Categorias
                  <span className="ml-1 font-normal text-gray-400 text-xs">(deixe vazio para todas)</span>
                </label>

                {/* Chips das categorias selecionadas */}
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.categories.map(cat => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 text-xs font-semibold rounded-full"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }))}
                          className="hover:text-primary-600 dark:hover:text-white ml-0.5"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Busca */}
                <div className="relative mb-1.5">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Filtrar categorias..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Lista de categorias disponíveis ordenada por qtd de produtos */}
                <div className="max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {categoriesWithCount
                    .filter(c =>
                      !formData.categories.includes(c.name) &&
                      c.name.toLowerCase().includes(catSearch.toLowerCase())
                    )
                    .map(({ name, count }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, categories: [...prev.categories, name] }))}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                      >
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
                          {count} produto{count !== 1 ? 's' : ''}
                        </span>
                      </button>
                    ))
                  }
                  {categoriesWithCount.filter(c =>
                    !formData.categories.includes(c.name) &&
                    c.name.toLowerCase().includes(catSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-3">
                      {catSearch ? 'Nenhuma categoria encontrada' : 'Todas as categorias já foram selecionadas'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Toggle ativo/inativo — padrão da tabela de produtos */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status da seção</span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  formData.active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200'
                }`}
              >
                {formData.active ? '✓ Ativa' : '✗ Inativa'}
              </button>
            </div>
          </div>
        </AdminModal>


        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seções da Página Inicial</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Gerencie os nomes e configurações das seções</p>
          </div>
          {sections.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma seção cadastrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors ${
                    !section.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMove(section, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(section, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mr-1">
                          {section.name}
                        </h3>
                        {/* Toggle ativo/inativo inline */}
                        <button
                          onClick={() => handleToggleSectionActive(section)}
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-colors ${
                            section.active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200'
                          }`}
                          title={`Clique para ${section.active ? 'desativar' : 'ativar'}`}
                        >
                          {section.active ? 'Ativa' : 'Inativa'}
                        </button>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                          {section.key}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                          {section.display_type === 'manual' && 'Manual'}
                          {section.display_type === 'best_selling' && 'Mais Vendidos'}
                          {section.display_type === 'newest' && 'Mais Novos'}
                          {section.display_type === 'category' && 'Por Categoria'}
                          {section.display_type === 'promotions' && 'Promoções'}
                        </span>
                      </div>
                      {section.category && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {section.category.split(',').map(c => c.trim()).filter(Boolean).map(cat => (
                            <span key={cat} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {section.display_type === 'manual' && (
                        <button
                          onClick={() => {
                            setSelectedSectionForProducts(section.id)
                            setShowAddProductModal(true)
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          title="Gerenciar Produtos"
                        >
                          <Package size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(section)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id, section.name)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Deletar Seção"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Lista de produtos manuais */}
                  {section.display_type === 'manual' && sectionProducts[section.id] && sectionProducts[section.id].length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Produtos Manuais:</h4>
                      <div className="space-y-2">
                        {sectionProducts[section.id].map((product, productIndex) => (
                          <div
                            key={product.id}
                            className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                          >
                            <div className="flex flex-col space-y-1">
                              <button
                                onClick={() => handleMoveSectionProduct(section.id, product, 'up')}
                                disabled={productIndex === 0}
                                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para cima"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => handleMoveSectionProduct(section.id, product, 'down')}
                                disabled={productIndex === sectionProducts[section.id].length - 1}
                                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para baixo"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                            <img
                              src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-700"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveSectionProduct(section.id, product.id)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produtos em Destaque */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Produtos em Destaque</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Gerencie quais produtos aparecem em destaque</p>
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} className="mr-2" />
              Adicionar Produto
            </button>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Star className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Nenhum produto em destaque</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMoveProduct(product, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveProduct(product, 'down')}
                        disabled={index === featuredProducts.length - 1}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    <div className="flex-shrink-0">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveProduct((product as any).featured_id || product.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Remover de destaque"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal para adicionar produto */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedSectionForProducts 
                    ? `Adicionar Produto à Seção: ${sections.find(s => s.id === selectedSectionForProducts)?.name || ''}`
                    : 'Adicionar Produto em Destaque'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddProductModal(false)
                    setSearchTerm('')
                    setSelectedSectionForProducts(null)
                  }}
                  className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar produtos..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {availableProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm 
                        ? 'Nenhum produto encontrado' 
                        : selectedSectionForProducts
                          ? 'Todos os produtos já estão nesta seção'
                          : 'Todos os produtos já estão em destaque'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] cursor-pointer"
                        onClick={() => {
                          if (selectedSectionForProducts) {
                            handleAddSectionProduct(selectedSectionForProducts, product.id)
                          } else {
                            handleAddProduct(product.id)
                          }
                        }}
                      >
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (selectedSectionForProducts) {
                              handleAddSectionProduct(selectedSectionForProducts, product.id)
                            } else {
                              handleAddProduct(product.id)
                            }
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



