import { useState, useRef } from 'react'
import {
  Upload, Loader2, Star, ChevronUp, ChevronDown,
  GripVertical, Trash2, Plus, Image as ImageIcon
} from 'lucide-react'
import { uploadService } from '../services/upload.service'
import { getUploadsImageUrl, normalizeImagePath } from '../utils/imageUrl'

interface MultiImageUploadProps {
  values?: string[] // Array de caminhos/URLs de imagem
  onChange: (urls: string[]) => void // Callback atualizando lista de imagens
  onError?: (error: string | null) => void
  disabled?: boolean
}

export default function MultiImageUpload({
  values = [],
  onChange,
  onError,
  disabled = false,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFullUrl = (path: string) => {
    if (!path) return ''
    return getUploadsImageUrl(path, 'products') || path
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        onError?.('Formato não suportado. Use JPEG, PNG, GIF ou WEBP.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        onError?.('Cada imagem deve ter no máximo 5MB.')
        return
      }
    }

    try {
      setUploading(true)
      onError?.(null)
      const uploadedPaths: string[] = []

      for (const file of files) {
        const response = await uploadService.uploadProductImage(file)
        if (response?.data?.path) {
          uploadedPaths.push(normalizeImagePath(response.data.path))
        }
      }

      if (uploadedPaths.length > 0) {
        onChange([...values, ...uploadedPaths])
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload de imagem:', error)
      onError?.(error.message || 'Erro ao fazer upload da imagem.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (index: number) => {
    const next = values.filter((_, i) => i !== index)
    onChange(next)
  }

  const handleSetPrimary = (index: number) => {
    if (index === 0) return
    const target = values[index]
    const remaining = values.filter((_, i) => i !== index)
    onChange([target, ...remaining])
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= values.length) return
    const updated = [...values]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    onChange(updated)
  }

  // ── Drag & Drop Handlers ──────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    setDraggedIndex(null)

    const fromIndexStr = e.dataTransfer.getData('text/plain')
    const fromIndex = fromIndexStr ? parseInt(fromIndexStr, 10) : draggedIndex

    if (fromIndex === null || isNaN(fromIndex) || fromIndex === dropIndex) return

    const updated = [...values]
    const [movedItem] = updated.splice(fromIndex, 1)
    updated.splice(dropIndex, 0, movedItem)
    onChange(updated)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-4 w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Spacious Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-xl shrink-0">
            <ImageIcon size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              Gerenciador de Imagens
              <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full font-extrabold">
                {values.length} {values.length === 1 ? 'foto' : 'fotos'}
              </span>
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              A 1ª imagem da lista é a <strong>Capa Principal</strong> do produto. Reordene arrastando ou usando as setas.
            </p>
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Enviando fotos...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Adicionar Fotos</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Vertical Image List Manager with Fixed Max Height and Internal Scroll */}
      {values.length === 0 ? (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
            disabled
              ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed'
              : 'border-green-300 dark:border-gray-700 bg-green-50/20 dark:bg-gray-800/30 hover:bg-green-50/50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-300 cursor-pointer'
          }`}
        >
          <div className="p-4 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-2xl mb-3 shadow-xs">
            <Upload size={28} />
          </div>
          <p className="text-base font-bold text-gray-800 dark:text-gray-200">
            Nenhuma imagem vinculada a este produto
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            Clique ou solte os arquivos aqui para fazer upload. Suporta seleção múltipla (JPEG, PNG, WEBP até 5MB cada).
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
          {values.map((img, index) => {
            const isPrimary = index === 0
            const isDragging = draggedIndex === index
            const isDragOver = dragOverIndex === index

            return (
              <div
                key={`${img}-${index}`}
                draggable={!disabled}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDragging
                    ? 'opacity-40 border-dashed border-gray-400 bg-gray-100 dark:bg-gray-800'
                    : isDragOver
                    ? 'border-green-500 bg-green-50/40 dark:bg-green-950/30 ring-2 ring-green-500/20'
                    : isPrimary
                    ? 'border-green-400 dark:border-green-800/80 bg-green-50/30 dark:bg-green-950/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Left: Drag handle & Thumbnail & Badge */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Drag Handle */}
                  {!disabled && (
                    <div
                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 shrink-0"
                      title="Arraste para reordenar"
                    >
                      <GripVertical size={20} />
                    </div>
                  )}

                  {/* Position Badge */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isPrimary
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  {/* Large Thumbnail */}
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0 shadow-2xs">
                    <img
                      src={getFullUrl(img)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Information & Tag */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPrimary ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/60 shadow-2xs">
                          <Star size={12} className="fill-green-600 dark:fill-green-400 text-green-600 dark:text-green-400" />
                          Capa do Produto (1ª Foto)
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Foto Secundária #{index + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px] sm:max-w-[360px]" title={img}>
                      {img}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                {!disabled && (
                  <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700">
                    {/* Make Capa / Primary */}
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        className="px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Definir como Capa"
                      >
                        <Star size={13} />
                        <span>Tornar Capa</span>
                      </button>
                    )}

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      title="Mover para cima (Subir)"
                    >
                      <ChevronUp size={18} />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={index === values.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      title="Mover para baixo (Descer)"
                    >
                      <ChevronDown size={18} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-colors cursor-pointer ml-1"
                      title="Remover imagem"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
