import { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { bannersService } from '../services/banners.service'
import { getImageUrl, normalizeImagePath } from '../utils/imageUrl'

interface BannerImageUploadProps {
  value?: string // URL ou caminho da imagem atual
  onChange: (url: string) => void // Callback quando a imagem é alterada (recebe caminho relativo)
  onError?: (error: string | null) => void // Callback para erros
  onUploadingChange?: (uploading: boolean) => void
  aspectRatio?: 'desktop' | 'mobile'
  className?: string
  disabled?: boolean
}

export default function BannerImageUpload({
  value,
  onChange,
  onError,
  onUploadingChange,
  aspectRatio = 'desktop',
  className = '',
  disabled = false
}: BannerImageUploadProps) {
  // Converte caminho relativo para URL completa para exibição
  // Usa função utilitária compartilhada para garantir consistência
  const getPreviewUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null
    return getImageUrl(imagePath) || null
  }

  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(getPreviewUrl(value || null))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  // Atualiza preview quando value muda
  useEffect(() => {
    const previewUrl = getPreviewUrl(value || null)
    setPreview(previewUrl)
  }, [value])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação de tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      onError?.('Apenas arquivos de imagem são permitidos (JPEG, PNG, GIF, WEBP)')
      return
    }

    // Validação de tamanho (10MB para banners)
    if (file.size > 10 * 1024 * 1024) {
      onError?.('A imagem deve ter no máximo 10MB')
      return
    }

    // Cria preview local
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    setPreview(objectUrlRef.current)

    // Faz upload usando o serviço de banners
    try {
      setUploading(true)
      onUploadingChange?.(true)
      const imagePath = await bannersService.uploadImage(file)
      const normalizedPath = normalizeImagePath(imagePath)
      onChange(normalizedPath)
      onError?.(null)
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      onError?.(error.message || 'Erro ao fazer upload da imagem')
      setPreview(value ? getPreviewUrl(value) : null)
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  const isDesktop = aspectRatio === 'desktop'
  const containerAspectClass = isDesktop ? 'aspect-[12/5] w-full max-w-md' : 'aspect-[4/3] w-44 sm:w-52'

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Área de preview no formato exato */}
      {preview ? (
        <div className={`relative ${containerAspectClass} border-2 border-primary-500/40 dark:border-primary-500/30 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-inner group`}>
          <img
            src={preview}
            alt="Preview do banner"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.onerror = null
              target.style.display = 'none'
            }}
          />
          <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded pointer-events-none">
            {isDesktop ? 'Proporção 12:5 (1920x800)' : 'Proporção 4:3 (800x600)'}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-colors cursor-pointer"
              title="Remover imagem"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : null}

      {/* Controles de upload */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all text-sm font-medium
            ${disabled || uploading
              ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'border-primary-300 dark:border-gray-600 bg-primary-50 dark:bg-gray-800/80 text-primary-700 dark:text-gray-200 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-100 dark:hover:bg-gray-700 cursor-pointer'
            }
          `}
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin text-primary-600" size={18} />
              <span>Enviando imagem...</span>
            </>
          ) : preview ? (
            <>
              <ImageIcon size={18} />
              <span>Substituir imagem</span>
            </>
          ) : (
            <>
              <Upload size={18} />
              <span>Selecionar imagem ({isDesktop ? '1920x800' : '800x600'})</span>
            </>
          )}
        </button>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          Formatos: JPEG, PNG, WEBP (máx. 10MB)
        </span>
      </div>
    </div>
  )
}
