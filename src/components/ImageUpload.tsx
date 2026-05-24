import { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadService } from '../services/upload.service'
import { env } from '../config/env'

interface ImageUploadProps {
  value?: string // URL da imagem atual
  onChange: (url: string) => void // Callback quando a imagem é alterada
  onError?: (error: string | null) => void // Callback para erros
  className?: string
  disabled?: boolean
}

export default function ImageUpload({ 
  value, 
  onChange, 
  onError, 
  className = '',
  disabled = false 
}: ImageUploadProps) {
  // Converte caminho relativo para URL completa para exibição
  const getPreviewUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null
    
    // Se já é uma URL completa, retorna como está
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }
    
    // Se é um caminho relativo, converte para URL completa
    if (imagePath.startsWith('/')) {
      return `${env.apiUrl.replace('/api', '')}${imagePath}`
    }
    
    return imagePath
  }

  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(getPreviewUrl(value || null))
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Atualiza preview quando value muda (para produtos existentes)
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

    // Validação de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('A imagem deve ter no máximo 5MB')
      return
    }

    // Cria preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Faz upload
    try {
      setUploading(true)
      const response = await uploadService.uploadProductImage(file)
      // Salva apenas o caminho relativo (path) em vez da URL completa
      onChange(response.data.path)
      // Atualiza preview com a URL completa para exibição
      setPreview(response.data.url)
      onError?.(null) // Limpa erro anterior
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      onError?.(error.message || 'Erro ao fazer upload da imagem')
      setPreview(value || null) // Restaura preview anterior
    } finally {
      setUploading(false)
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
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

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        {/* Preview da imagem */}
        {preview && (
          <div className="relative w-32 h-32 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Remover imagem"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Área de upload */}
        <div className="flex-1">
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
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors
              ${disabled || uploading
                ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'border-primary-300 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 text-primary-700 dark:text-white hover:border-primary-500 dark:hover:border-[#0F828C] hover:bg-primary-100 dark:hover:bg-[#065084] cursor-pointer'
              }
            `}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Enviando...</span>
              </>
            ) : preview ? (
              <>
                <ImageIcon size={20} />
                <span>Alterar Imagem</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Selecionar Imagem</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Formatos aceitos: JPEG, PNG, GIF, WEBP (máx. 5MB)
          </p>
        </div>
      </div>

    </div>
  )
}

