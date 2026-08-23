import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Image as ImageIcon, Save, ArrowUp, ArrowDown } from 'lucide-react'
import { bannersService, Banner, CreateBannerData } from '../services/banners.service'
import BannerImageUpload from '../components/BannerImageUpload'
import { normalizeImagePath } from '../utils/imageUrl'
import { getImageUrl } from '../utils/imageUrl'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

// Componente para preview de imagem com fallback automático via API
function BannerImagePreview({ banner, type = 'desktop' }: { banner: Banner, type?: 'desktop' | 'mobile' }) {
  const isDesktop = type === 'desktop'
  const imagePath = isDesktop ? banner.image_url : banner.mobile_image_url
  const [imageUrl, setImageUrl] = useState(getImageUrl(imagePath || ''))
  const [triedApiUrl, setTriedApiUrl] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setImageUrl(getImageUrl(imagePath || ''))
    setTriedApiUrl(false)
    setHasError(false)
  }, [imagePath])

  if (!imagePath) return null

  const sizeClass = isDesktop ? 'w-36 sm:w-44 aspect-[12/5]' : 'w-16 sm:w-20 aspect-[4/3]'

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    
    if (!triedApiUrl) {
      const apiUrl = getImageUrl(imagePath)
      if (apiUrl === imageUrl) {
        setTriedApiUrl(true)
        setHasError(true)
        return
      }
      console.log('Tentando URL normalizada:', apiUrl)
      setImageUrl(apiUrl)
      setTriedApiUrl(true)
      setHasError(false)
    } else {
      console.error('❌ Erro ao carregar imagem do banner:', {
        bannerId: banner.id,
        attemptedUrl: target.src,
        originalPath: imagePath
      })
      setHasError(true)
      target.onerror = null
      target.style.display = 'none'
    }
  }

  if (hasError) {
    return (
      <div className={`${sizeClass} bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700`}>
        <div className="text-center p-1">
          <svg className="w-5 h-5 mx-auto text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0">
      <img
        src={imageUrl}
        alt={banner.title || 'Banner'}
        className={`${sizeClass} object-cover rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800`}
        onError={handleError}
        onLoad={() => {
          if (triedApiUrl) {
            console.log('✅ Imagem carregada via API:', imageUrl)
          }
        }}
      />
    </div>
  )
}

export default function ManageBanners() {
  const navigate = useNavigate()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [uploading, setUploading] = useState(false)
  const originalBannerImagesRef = useRef({ desktop: '', mobile: '' })
  const [formData, setFormData] = useState<CreateBannerData>({
    image_url: '',
    mobile_image_url: '',
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

  const cleanupPendingBannerImage = async (value: string, original: string) => {
    if (!value || value === original || !value.includes('/uploads/banners/')) return
    try { await bannersService.deleteImage(value) } catch { /* arquivo em uso ou já removido */ }
  }

  const handleBannerImageChange = (field: 'image_url' | 'mobile_image_url', url: string) => {
    const imagePath = url ? normalizeImagePath(url) : ''
    const current = String(formData[field] || '')
    const original = field === 'image_url' ? originalBannerImagesRef.current.desktop : originalBannerImagesRef.current.mobile
    if (current && current !== original && current !== imagePath) void cleanupPendingBannerImage(current, original)
    setFormData(prev => ({ ...prev, [field]: imagePath }))
  }

  const handleImageChange = (url: string) => handleBannerImageChange('image_url', url)

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
      const mobileImagePath = formData.mobile_image_url ? normalizeImagePath(formData.mobile_image_url) : ''
      await bannersService.create({
        ...formData,
        image_url: imagePath,
        mobile_image_url: mobileImagePath || null,
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
      const mobileImagePath = formData.mobile_image_url ? normalizeImagePath(formData.mobile_image_url) : ''
      await bannersService.update(editingBanner.id, {
        ...formData,
        image_url: imagePath,
        mobile_image_url: mobileImagePath || null,
      })
      await loadBanners()
      resetForm()
      setEditingBanner(null)
    } catch (err: any) {
      console.error('Erro ao atualizar banner:', err)
      alert(err.message || 'Erro ao atualizar banner')
    }
  }

  const handleDelete = (id: string) => {
    confirm.show('Tem certeza que deseja excluir este banner?', async () => {
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
    })
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    // Normaliza o caminho relativo (pode vir como URL completa do getImageUrl)
    const imagePath = normalizeImagePath(banner.image_url)
    const mobileImagePath = banner.mobile_image_url ? normalizeImagePath(banner.mobile_image_url) : ''
    originalBannerImagesRef.current = { desktop: imagePath, mobile: mobileImagePath }
    setFormData({
      image_url: imagePath,
      mobile_image_url: mobileImagePath,
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

    /// Atualiza a ordem
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
      mobile_image_url: '',
      title: '',
      subtitle: '',
      link: '',
      order: 0,
      active: true,
    })
  }

  const handleCancel = () => {
    void cleanupPendingBannerImage(formData.image_url, originalBannerImagesRef.current.desktop)
    void cleanupPendingBannerImage(String(formData.mobile_image_url || ''), originalBannerImagesRef.current.mobile)
    originalBannerImagesRef.current = { desktop: '', mobile: '' }
    resetForm()
    setShowCreateForm(false)
    setEditingBanner(null)
  }


  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-300">Carregando banners...</p>
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
          <button
            onClick={() => {
              resetForm()
              originalBannerImagesRef.current = { desktop: '', mobile: '' }
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

        {/* Modal de criação/edição de banner */}
        <AdminModal
          isOpen={showCreateForm || !!editingBanner}
          onClose={handleCancel}
          title={editingBanner ? 'Editar Banner' : 'Novo Banner'}
          widthClass="max-w-2xl"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={editingBanner ? handleUpdate : handleCreate}
                disabled={uploading || !formData.image_url}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {uploading ? (
                  <><Loader2 className="animate-spin" size={16} />Enviando...</>
                ) : (
                  <><Save size={16} />{editingBanner ? 'Salvar alterações' : 'Criar banner'}</>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Guia de formatos */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <span>📐</span> Formatos de imagem utilizados no site:
              </p>
              <p>
                • <strong>Desktop:</strong> Proporção <strong>12:5</strong> (Panorâmico). Dimensão ideal: <strong>1920x800 px</strong> (ou 2400x1000 px).
              </p>
              <p>
                • <strong>Mobile:</strong> Proporção <strong>4:3</strong>. Dimensão ideal: <strong>800x600 px</strong> (ou 1200x900 px).
              </p>
            </div>

            {/* Imagem Desktop */}
            <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Imagem Desktop *
                </label>
                <span className="text-xs px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 font-medium">
                  1920x800 px (12:5)
                </span>
              </div>
              <BannerImageUpload
                value={formData.image_url}
                onChange={handleImageChange}
                onError={(err) => { if (err) alert(err) }}
                onUploadingChange={setUploading}
                aspectRatio="desktop"
                disabled={uploading}
              />
            </div>

            {/* Imagem Mobile */}
            <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Imagem Mobile (Opcional)
                </label>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium">
                  800x600 px (4:3)
                </span>
              </div>
              <BannerImageUpload
                value={formData.mobile_image_url || ''}
                onChange={(url) => handleBannerImageChange('mobile_image_url', url)}
                onError={(err) => { if (err) alert(err) }}
                onUploadingChange={setUploading}
                aspectRatio="mobile"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Título (opcional)</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Título do banner"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subtítulo (opcional)</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Subtítulo do banner"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Link (opcional)</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://exemplo.com"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="banner-active"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="banner-active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Banner ativo
              </label>
            </div>
          </div>
        </AdminModal>


        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {banners.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Nenhum banner cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-[#065084]/20 transition-colors ${
                    !banner.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Controles de ordem */}
                    <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMove(banner, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(banner, 'down')}
                        disabled={index === banners.length - 1}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    {/* Preview da imagem */}
                    <div className="flex gap-3">
                      <div className="relative">
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-semibold z-10">Desktop</span>
                        <BannerImagePreview banner={banner} type="desktop" />
                      </div>
                      {banner.mobile_image_url && (
                        <div className="relative">
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-semibold z-10">Mobile</span>
                          <BannerImagePreview banner={banner} type="mobile" />
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                          {banner.title || 'Sem título'}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {!banner.active && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                              Inativo
                            </span>
                          )}
                          <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                            Ordem: {banner.order + 1}
                          </span>
                        </div>
                      </div>
                      {banner.subtitle && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1 break-words">{banner.subtitle}</p>
                      )}
                      {banner.link && (
                        <a
                          href={banner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all"
                        >
                          {banner.link}
                        </a>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        disabled={deletingId === banner.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded transition-colors disabled:opacity-50"
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

