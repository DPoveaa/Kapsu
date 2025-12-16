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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
          <button
            onClick={() => {
              setShowCreateForm(true)
              setEditingComposto(null)
            }}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Adicionar Composto
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Produtos e Compostos</h1>
          <p className="text-gray-600">Gerencie produtos e compostos do sistema</p>
        </div>

        {/* Abas */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => navigate('/admin/products')}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center"
            >
              <Package size={20} className="mr-2" />
              Produtos
            </button>
            <button
              className="border-primary-500 text-primary-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center"
            >
              <FlaskConical size={20} className="mr-2" />
              Compostos
            </button>
          </nav>
        </div>

        {/* Formulário de criação */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Novo Composto</h2>
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
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newComposto.name}
                  onChange={(e) => setNewComposto({ ...newComposto, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentração *</label>
                <input
                  type="text"
                  value={newComposto.concentration}
                  onChange={(e) => setNewComposto({ ...newComposto, concentration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
                <input
                  type="text"
                  value={newComposto.unit}
                  onChange={(e) => setNewComposto({ ...newComposto, unit: e.target.value })}
                  placeholder="mg, mcg, UI, etc"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={newComposto.description}
                  onChange={(e) => setNewComposto({ ...newComposto, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentração Mínima</label>
                <input
                  type="text"
                  value={newComposto.min_concentration}
                  onChange={(e) => setNewComposto({ ...newComposto, min_concentration: e.target.value })}
                  placeholder="Ex: 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentração Máxima</label>
                <input
                  type="text"
                  value={newComposto.max_concentration}
                  onChange={(e) => setNewComposto({ ...newComposto, max_concentration: e.target.value })}
                  placeholder="Ex: 1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
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
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Save size={18} className="mr-2" />
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Formulário de edição */}
        {editingComposto && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Editar Composto</h2>
              <button
                onClick={() => setEditingComposto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={editingComposto.name}
                  onChange={(e) => setEditingComposto({ ...editingComposto, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentração *</label>
                <input
                  type="text"
                  value={editingComposto.concentration}
                  onChange={(e) => setEditingComposto({ ...editingComposto, concentration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
                <input
                  type="text"
                  value={editingComposto.unit}
                  onChange={(e) => setEditingComposto({ ...editingComposto, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingComposto.description || ''}
                  onChange={(e) => setEditingComposto({ ...editingComposto, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentração Mínima</label>
                <input
                  type="text"
                  value={editingComposto.min_concentration || ''}
                  onChange={(e) => setEditingComposto({ ...editingComposto, min_concentration: e.target.value || null })}
                  placeholder="Ex: 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentração Máxima</label>
                <input
                  type="text"
                  value={editingComposto.max_concentration || ''}
                  onChange={(e) => setEditingComposto({ ...editingComposto, max_concentration: e.target.value || null })}
                  placeholder="Ex: 1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingComposto.active}
                    onChange={(e) => setEditingComposto({ ...editingComposto, active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setEditingComposto(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Save size={18} className="mr-2" />
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar compostos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary-600" size={48} />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadCompostos}
              className="mt-2 text-red-600 hover:text-red-700 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabela de Compostos */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concentração
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faixa (Min-Max)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompostos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Nenhum composto encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredCompostos.map((composto) => (
                      <tr key={composto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{composto.name}</div>
                            {composto.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {composto.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {composto.concentration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {composto.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {composto.min_concentration || composto.max_concentration ? (
                            <span>
                              {composto.min_concentration || '-'} - {composto.max_concentration || '-'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            composto.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {composto.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(composto)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(composto.id)}
                              disabled={deletingId === composto.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
        )}
      </div>
    </div>
  )
}

