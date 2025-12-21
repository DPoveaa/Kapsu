import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Image as ImageIcon, X, Save, ArrowUp, ArrowDown } from 'lucide-react'
import { bannersService, Banner, CreateBannerData } from '../services/banners.service'
import BannerImageUpload from '../components/BannerImageUpload'
import { normalizeImagePath } from '../utils/imageUrl'

export default function ManageBanners() {
  const navigate = useNavigate()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [uploading] = useState(false)
  const [formData, setFormData] = useState<CreateBannerData>({
    image_url: '',
    title: '',
    subtitle: '',
    link: '',
    order: 0,
    active: true,
  })

  // Carrega banners
  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bannersService.getAll(true) // Inclui inativos
      // Ordena por order
      const sorted = data.sort((a, b) => a.order - b.order)
      setBanners(sorted)
    } catch (err: any) {
      console.error('Erro ao carregar banners:', err)
      setError(err.message || 'Erro ao carregar banners')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (url: string) => {
    // Usa função utilitária para garantir que sempre salvamos o caminho relativo normalizado
    const imagePath = normalizeImagePath(url)
    setFormData(prev => ({ ...prev, image_url: imagePath }))
  }

  const handleCreate = async () => {
    if (!formData.image_url) {
      alert('Por favor, selecione uma imagem')
      return
    }

    try {
      // Define a ordem como o próximo número disponível
      const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.order)) : -1
      // Garante que salvamos apenas o caminho relativo normalizado
      const imagePath = normalizeImagePath(formData.image_url)
      await bannersService.create({
        ...formData,
        image_url: imagePath,
        order: maxOrder + 1,
      })
      await loadBanners()
      resetForm()
      setShowCreateForm(false)
    } catch (err: any) {
      console.error('Erro ao criar banner:', err)
      alert(err.message || 'Erro ao criar banner')
    }
  }

  const handleUpdate = async () => {
    if (!editingBanner) return

    if (!formData.image_url) {
      alert('Por favor, selecione uma imagem')
      return
    }

    try {
      // Garante que salvamos apenas o caminho relativo normalizado
      const imagePath = normalizeImagePath(formData.image_url)
      await bannersService.update(editingBanner.id, {
        ...formData,
        image_url: imagePath,
      })
      await loadBanners()
      resetForm()
      setEditingBanner(null)
    } catch (err: any) {
      console.error('Erro ao atualizar banner:', err)
      alert(err.message || 'Erro ao atualizar banner')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) {
      return
    }

    try {
      setDeletingId(id)
      await bannersService.delete(id)
      await loadBanners()
    } catch (err: any) {
      console.error('Erro ao excluir banner:', err)
      alert(err.message || 'Erro ao excluir banner')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    // Normaliza o caminho relativo (pode vir como URL completa do getImageUrl)
    const imagePath = normalizeImagePath(banner.image_url)
    setFormData({
      image_url: imagePath,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      order: banner.order,
      active: banner.active,
    })
    setShowCreateForm(false)
  }

  const handleMove = async (banner: Banner, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === banner.id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= banners.length) return

    const newBanners = [...banners]
    const [removed] = newBanners.splice(currentIndex, 1)
    newBanners.splice(newIndex, 0, removed)

    // Atualiza a ordem
    const bannerIds = newBanners.map((b, index) => {
      const updatedBanner = { ...b, order: index }
      return updatedBanner.id
    })

    try {
      await bannersService.reorder(bannerIds)
      await loadBanners()
    } catch (err: any) {
      console.error('Erro ao reordenar banners:', err)
      alert(err.message || 'Erro ao reordenar banners')
    }
  }

  const resetForm = () => {
    setFormData({
      image_url: '',
      title: '',
      subtitle: '',
      link: '',
      order: 0,
      active: true,
    })
  }

  const handleCancel = () => {
    resetForm()
    setShowCreateForm(false)
    setEditingBanner(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-300">Carregando banners...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowCreateForm(true)
              setEditingBanner(null)
            }}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Adicionar Banner
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gerenciar Banners</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerencie os banners exibidos na página inicial</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Formulário de criação/edição */}
        {(showCreateForm || editingBanner) && (
          <div className="mb-6 bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingBanner ? 'Editar Banner' : 'Novo Banner'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Imagem *
                </label>
                <BannerImageUpload
                  value={formData.image_url}
                  onChange={handleImageChange}
                  onError={(err) => {
                    if (err) alert(err)
                  }}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Título (opcional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="Título do banner"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Subtítulo (opcional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="Subtítulo do banner"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Link (opcional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="https://exemplo.com"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Banner ativo
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingBanner ? handleUpdate : handleCreate}
                  disabled={uploading || !formData.image_url}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {editingBanner ? 'Salvar' : 'Criar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de banners */}
        <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-[#0F828C]">
          {banners.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Nenhum banner cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-[#0F828C]">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors ${
                    !banner.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Controles de ordem */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMove(banner, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(banner, 'down')}
                        disabled={index === banners.length - 1}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    {/* Preview da imagem */}
                    <div className="flex-shrink-0">
                      <img
                        src={banner.image_url}
                        alt={banner.title || 'Banner'}
                        className="w-32 h-20 object-cover rounded-lg border border-gray-200 dark:border-[#0F828C]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          const imageUrl = target.src
                          console.error('❌ Erro ao carregar imagem do banner:', {
                            bannerId: banner.id,
                            imageUrl: imageUrl,
                            originalPath: banner.image_url
                          })
                          
                          // Previne loop infinito
                          target.onerror = null
                          target.style.display = 'none'
                          
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-32 h-20 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#0F828C]">
                                <div class="text-center p-2">
                                  <svg class="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <p class="text-xs text-gray-500 dark:text-gray-400">Erro ao carregar</p>
                                </div>
                              </div>
                            `
                          }
                        }}
                        onLoad={() => {
                          console.log('✅ Imagem do banner carregada com sucesso:', {
                            bannerId: banner.id,
                            imageUrl: banner.image_url
                          })
                        }}
                      />
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {banner.title || 'Sem título'}
                        </h3>
                        {!banner.active && (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            Inativo
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                          Ordem: {banner.order + 1}
                        </span>
                      </div>
                      {banner.subtitle && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{banner.subtitle}</p>
                      )}
                      {banner.link && (
                        <a
                          href={banner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {banner.link}
                        </a>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        disabled={deletingId === banner.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingId === banner.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Trash2 size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

