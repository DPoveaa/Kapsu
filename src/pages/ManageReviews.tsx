import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Star, X, Save, ArrowUp, ArrowDown, User } from 'lucide-react'
import { reviewsService, Review, CreateReviewData } from '../services/reviews.service'
import ImageUpload from '../components/ImageUpload'

export default function ManageReviews() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [formData, setFormData] = useState<CreateReviewData>({
    name: '',
    rating: 5,
    comment: '',
    product: '',
    date: '',
    avatar: '',
    order: 0,
    active: true,
    show_image: true,
    show_name: true,
    show_date: true,
    show_product: true,
  })
  const [uploading] = useState(false)

  // Carrega reviews
  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await reviewsService.getAll(true) // Inclui inativas
      // Ordena por order
      const sorted = data.sort((a, b) => a.order - b.order)
      setReviews(sorted)
    } catch (err: any) {
      console.error('Erro ao carregar reviews:', err)
      setError(err.message || 'Erro ao carregar reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }))
  }

  const handleCreate = async () => {
    if (!formData.comment || formData.rating === undefined) {
      alert('Por favor, preencha o comentário e selecione a avaliação (estrelas)')
      return
    }

    try {
      // Define a ordem como o próximo número disponível
      const maxOrder = reviews.length > 0 ? Math.max(...reviews.map(r => r.order)) : -1
      await reviewsService.create({
        ...formData,
        order: maxOrder + 1,
      })
      await loadReviews()
      resetForm()
      setShowCreateForm(false)
    } catch (err: any) {
      console.error('Erro ao criar review:', err)
      alert(err.message || 'Erro ao criar review')
    }
  }

  const handleUpdate = async () => {
    if (!editingReview) return

    if (!formData.comment || formData.rating === undefined) {
      alert('Por favor, preencha o comentário e selecione a avaliação (estrelas)')
      return
    }

    try {
      await reviewsService.update(editingReview.id, formData)
      await loadReviews()
      resetForm()
      setEditingReview(null)
    } catch (err: any) {
      console.error('Erro ao atualizar review:', err)
      alert(err.message || 'Erro ao atualizar review')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) {
      return
    }

    try {
      setDeletingId(id)
      await reviewsService.delete(id)
      await loadReviews()
    } catch (err: any) {
      console.error('Erro ao excluir review:', err)
      alert(err.message || 'Erro ao excluir review')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (review: Review) => {
    setEditingReview(review)
    setFormData({
      name: review.name || '',
      rating: review.rating,
      comment: review.comment,
      product: review.product || '',
      date: review.date || '',
      avatar: review.avatar || '',
      order: review.order,
      active: review.active,
      show_image: review.show_image !== undefined ? review.show_image : true,
      show_name: review.show_name !== undefined ? review.show_name : true,
      show_date: review.show_date !== undefined ? review.show_date : true,
      show_product: review.show_product !== undefined ? review.show_product : true,
    })
    setShowCreateForm(false)
  }

  const handleMove = async (review: Review, direction: 'up' | 'down') => {
    const currentIndex = reviews.findIndex(r => r.id === review.id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= reviews.length) return

    const newReviews = [...reviews]
    const [removed] = newReviews.splice(currentIndex, 1)
    newReviews.splice(newIndex, 0, removed)

    // Atualiza a ordem
    const reviewIds = newReviews.map((r) => r.id)

    try {
      await reviewsService.reorder(reviewIds)
      await loadReviews()
    } catch (err: any) {
      console.error('Erro ao reordenar reviews:', err)
      alert(err.message || 'Erro ao reordenar reviews')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      rating: 5,
      comment: '',
      product: '',
      date: '',
      avatar: '',
      order: 0,
      active: true,
      show_image: true,
      show_name: true,
      show_date: true,
      show_product: true,
    })
  }

  const handleCancel = () => {
    resetForm()
    setShowCreateForm(false)
    setEditingReview(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-300">Carregando avaliações...</p>
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
              setEditingReview(null)
            }}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Adicionar Avaliação
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gerenciar Avaliações</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerencie as avaliações exibidas na página inicial</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Formulário de criação/edição */}
        {(showCreateForm || editingReview) && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingReview ? 'Editar Avaliação' : 'Nova Avaliação'}
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
                  Imagem do Avatar (opcional)
                </label>
                <ImageUpload
                  value={formData.avatar || ''}
                  onChange={handleImageChange}
                  onError={(err) => {
                    if (err) alert(err)
                  }}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Cliente (opcional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="Ex: Maria Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Avaliação (estrelas) *
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rating }))}
                      className={`p-2 rounded transition-colors ${
                        formData.rating >= rating
                          ? 'text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    >
                      <Star
                        size={24}
                        className={formData.rating >= rating ? 'fill-current' : ''}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    {formData.rating} estrelas
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Comentário *
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="Ex: Excelente qualidade! Os medicamentos manipulados são perfeitos..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Produto (opcional)
                </label>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="Ex: Vitamina D3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Há quanto tempo foi enviada (opcional)
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="Ex: Há 2 semanas, Há 1 mês, Há 3 dias"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  O que exibir na página inicial:
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_image"
                      checked={formData.show_image !== undefined ? formData.show_image : true}
                      onChange={(e) => setFormData(prev => ({ ...prev, show_image: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="show_image" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Mostrar imagem do avatar
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_name"
                      checked={formData.show_name !== undefined ? formData.show_name : true}
                      onChange={(e) => setFormData(prev => ({ ...prev, show_name: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="show_name" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Mostrar nome do cliente
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_date"
                      checked={formData.show_date !== undefined ? formData.show_date : true}
                      onChange={(e) => setFormData(prev => ({ ...prev, show_date: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="show_date" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Mostrar data (há quanto tempo)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_product"
                      checked={formData.show_product !== undefined ? formData.show_product : true}
                      onChange={(e) => setFormData(prev => ({ ...prev, show_product: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="show_product" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Mostrar produto
                    </label>
                  </div>
                </div>
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
                  Avaliação ativa
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingReview ? handleUpdate : handleCreate}
                  disabled={!formData.comment || formData.rating === undefined || uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {editingReview ? 'Salvar' : 'Criar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de reviews */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {reviews.length === 0 ? (
            <div className="p-8 text-center">
              <User className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma avaliação cadastrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors ${
                    !review.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Controles de ordem */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMove(review, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(review, 'down')}
                        disabled={index === reviews.length - 1}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {review.avatar ? (
                        <img
                          src={review.avatar}
                          alt={review.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&size=64&background=67C090&color=fff&bold=true`
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                          {review.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {review.name}
                        </h3>
                        {!review.active && (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            Inativa
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                          Ordem: {review.order + 1}
                        </span>
                      </div>
                      <div className="flex items-center mb-2">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="text-yellow-400 fill-current" size={16} />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1 line-clamp-2">
                        "{review.comment}"
                      </p>
                      {(review.product || review.date) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {review.product && `${review.product}`}
                          {review.product && review.date && ' • '}
                          {review.date && review.date}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(review)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingId === review.id ? (
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



