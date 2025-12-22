import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Search, X, Save, Package, FlaskConical } from 'lucide-react'
import { compostosService, Composto } from '../services/compostos.service'

export default function ManageCompostos() {
  const navigate = useNavigate()
  const [compostos, setCompostos] = useState<Composto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingComposto, setEditingComposto] = useState<Composto | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newComposto, setNewComposto] = useState({
    name: '',
    concentration: '',
    unit: '',
    description: '',
    min_concentration: '',
    max_concentration: '',
  })

  // Carrega compostos
  useEffect(() => {
    loadCompostos()
  }, [])

  const loadCompostos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await compostosService.getAllForAdmin()
      setCompostos(data)
    } catch (err: any) {
      console.error('Erro ao carregar compostos:', err)
      setError(err.message || 'Erro ao carregar compostos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este composto?')) {
      return
    }

    try {
      setDeletingId(id)
      await compostosService.delete(id)
      await loadCompostos()
    } catch (err: any) {
      console.error('Erro ao excluir composto:', err)
      alert(err.message || 'Erro ao excluir composto')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (composto: Composto) => {
    setEditingComposto({ ...composto })
    setShowCreateForm(false)
  }

  const handleSaveEdit = async () => {
    if (!editingComposto) return

    try {
      await compostosService.update(editingComposto.id, {
        name: editingComposto.name,
        concentration: editingComposto.concentration,
        unit: editingComposto.unit,
        description: editingComposto.description || undefined,
        min_concentration: editingComposto.min_concentration 
          ? (typeof editingComposto.min_concentration === 'string' 
              ? parseFloat(editingComposto.min_concentration) || null 
              : editingComposto.min_concentration)
          : null,
        max_concentration: editingComposto.max_concentration 
          ? (typeof editingComposto.max_concentration === 'string' 
              ? parseFloat(editingComposto.max_concentration) || null 
              : editingComposto.max_concentration)
          : null,
        active: editingComposto.active,
      })
      setEditingComposto(null)
      await loadCompostos()
    } catch (err: any) {
      console.error('Erro ao atualizar composto:', err)
      alert(err.message || 'Erro ao atualizar composto')
    }
  }

  const handleCreate = async () => {
    if (!newComposto.name || !newComposto.concentration || !newComposto.unit) {
      alert('Por favor, preencha nome, concentração e unidade')
      return
    }

    try {
      await compostosService.create({
        name: newComposto.name,
        concentration: newComposto.concentration,
        unit: newComposto.unit,
        description: newComposto.description || undefined,
        min_concentration: newComposto.min_concentration 
          ? (parseFloat(newComposto.min_concentration) || undefined)
          : undefined,
        max_concentration: newComposto.max_concentration 
          ? (parseFloat(newComposto.max_concentration) || undefined)
          : undefined,
      })
      setShowCreateForm(false)
      setNewComposto({
        name: '',
        concentration: '',
        unit: '',
        description: '',
        min_concentration: '',
        max_concentration: '',
      })
      await loadCompostos()
    } catch (err: any) {
      console.error('Erro ao criar composto:', err)
      alert(err.message || 'Erro ao criar composto')
    }
  }

  // Filtra compostos
  const filteredCompostos = compostos.filter(composto =>
    composto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (composto.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Voltar
          </button>
          <button
            onClick={() => {
              setShowCreateForm(true)
              setEditingComposto(null)
            }}
            className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
          >
            <Plus size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Adicionar Composto
          </button>
        </div>

        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Gerenciar Produtos e Compostos</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Gerencie produtos e compostos do sistema</p>
        </div>

        {/* Abas */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-[#0F828C]">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto">
            <button
              onClick={() => navigate('/admin/products')}
              className="border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C] whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center"
            >
              <Package size={16} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Produtos
            </button>
            <button
              className="border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400 whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center"
            >
              <FlaskConical size={16} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Compostos
            </button>
          </nav>
        </div>

        {/* Formulário de criação */}
        {showCreateForm && (
          <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Novo Composto</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewComposto({
                    name: '',
                    concentration: '',
                    unit: '',
                    description: '',
                    min_concentration: '',
                    max_concentration: '',
                  })
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Nome *</label>
                <input
                  type="text"
                  value={newComposto.name}
                  onChange={(e) => setNewComposto({ ...newComposto, name: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Concentração *</label>
                <input
                  type="text"
                  value={newComposto.concentration}
                  onChange={(e) => setNewComposto({ ...newComposto, concentration: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Unidade *</label>
                <input
                  type="text"
                  value={newComposto.unit}
                  onChange={(e) => setNewComposto({ ...newComposto, unit: e.target.value })}
                  placeholder="mg, mcg, UI, etc"
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Descrição</label>
                <input
                  type="text"
                  value={newComposto.description}
                  onChange={(e) => setNewComposto({ ...newComposto, description: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Concentração Mínima</label>
                <input
                  type="text"
                  value={newComposto.min_concentration}
                  onChange={(e) => setNewComposto({ ...newComposto, min_concentration: e.target.value })}
                  placeholder="Ex: 100"
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Concentração Máxima</label>
                <input
                  type="text"
                  value={newComposto.max_concentration}
                  onChange={(e) => setNewComposto({ ...newComposto, max_concentration: e.target.value })}
                  placeholder="Ex: 1000"
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 sm:space-x-2">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewComposto({
                    name: '',
                    concentration: '',
                    unit: '',
                    description: '',
                    min_concentration: '',
                    max_concentration: '',
                  })
                }}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px] mr-1.5 sm:mr-2" />
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Formulário de edição */}
        {editingComposto && (
          <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Editar Composto</h2>
              <button
                onClick={() => setEditingComposto(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Nome *</label>
                <input
                  type="text"
                  value={editingComposto.name}
                  onChange={(e) => setEditingComposto({ ...editingComposto, name: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Concentração *</label>
                <input
                  type="text"
                  value={editingComposto.concentration}
                  onChange={(e) => setEditingComposto({ ...editingComposto, concentration: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Unidade *</label>
                <input
                  type="text"
                  value={editingComposto.unit}
                  onChange={(e) => setEditingComposto({ ...editingComposto, unit: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Descrição</label>
                <input
                  type="text"
                  value={editingComposto.description || ''}
                  onChange={(e) => setEditingComposto({ ...editingComposto, description: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Concentração Mínima</label>
                <input
                  type="text"
                  value={editingComposto.min_concentration || ''}
                  onChange={(e) => setEditingComposto({ ...editingComposto, min_concentration: e.target.value || null })}
                  placeholder="Ex: 100"
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Concentração Máxima</label>
                <input
                  type="text"
                  value={editingComposto.max_concentration || ''}
                  onChange={(e) => setEditingComposto({ ...editingComposto, max_concentration: e.target.value || null })}
                  placeholder="Ex: 1000"
                  className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingComposto.active}
                    onChange={(e) => setEditingComposto({ ...editingComposto, active: e.target.checked })}
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Ativo</span>
                </label>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 sm:space-x-2">
              <button
                onClick={() => setEditingComposto(null)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px] mr-1.5 sm:mr-2" />
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar compostos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <Loader2 className="animate-spin text-primary-600 dark:text-primary-400 w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadCompostos}
              className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabela de Compostos - Desktop / Cards - Mobile */}
        {!loading && !error && (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden lg:block bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-[#0F828C]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-[#0F828C]">
                  <thead className="bg-gray-50 dark:bg-[#065084]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Concentração
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Unidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Faixa (Min-Max)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#065084] divide-y divide-gray-200 dark:divide-[#0F828C]">
                    {filteredCompostos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          Nenhum composto encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredCompostos.map((composto) => (
                        <tr key={composto.id} className="hover:bg-gray-50 dark:hover:bg-[#065084]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{composto.name}</div>
                              {composto.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">
                                  {composto.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {composto.concentration}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {composto.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {composto.min_concentration || composto.max_concentration ? (
                              <span>
                                {composto.min_concentration || '-'} - {composto.max_concentration || '-'}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              composto.active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {composto.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(composto)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(composto.id)}
                                disabled={deletingId === composto.id}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                                title="Excluir"
                              >
                                {deletingId === composto.id ? (
                                  <Loader2 className="animate-spin" size={18} />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Cards */}
            <div className="lg:hidden space-y-3">
              {filteredCompostos.length === 0 ? (
                <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum composto encontrado</p>
                </div>
              ) : (
                filteredCompostos.map((composto) => (
                  <div
                    key={composto.id}
                    className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-[#0F828C] p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 break-words">{composto.name}</h3>
                        {composto.description && (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mb-2 line-clamp-2">
                            {composto.description}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                        composto.active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {composto.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Concentração:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{composto.concentration}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Unidade:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{composto.unit}</span>
                      </div>
                      {(composto.min_concentration || composto.max_concentration) && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Faixa:</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {composto.min_concentration || '-'} - {composto.max_concentration || '-'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-[#0F828C]">
                      <button
                        onClick={() => handleEdit(composto)}
                        className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button
                        onClick={() => handleDelete(composto.id)}
                        disabled={deletingId === composto.id}
                        className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingId === composto.id ? (
                          <Loader2 className="animate-spin w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                        ) : (
                          <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

