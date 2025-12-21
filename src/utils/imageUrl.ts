import { env } from '../config/env'

/**
 * Normaliza a URL base removendo /api se existir
 * Isso garante que funcione tanto localmente quanto no servidor
 */
function getBaseUrl(): string {
  let baseUrl = env.apiUrl
  
  // Remove /api do final se existir
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4) // Remove '/api'
  } else if (baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.slice(0, -5) // Remove '/api/'
  }
  
  // Remove barra final se existir
  baseUrl = baseUrl.replace(/\/$/, '')
  
  return baseUrl
}

/**
 * Converte um caminho relativo de imagem para URL completa
 * Funciona tanto localmente quanto no servidor
 * 
 * @param imagePath - Caminho relativo (ex: /uploads/banners/image.jpg) ou URL completa
 * @returns URL completa da imagem
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath || imagePath.trim() === '') {
    return '' // Retorna vazio se não houver caminho
  }

  const trimmedPath = imagePath.trim()

  // Se já é uma URL completa (http:// ou https://), retorna como está
  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath
  }

  const baseUrl = getBaseUrl()

  // Se é um caminho relativo (começa com /), converte para URL completa
  if (trimmedPath.startsWith('/')) {
    return `${baseUrl}${trimmedPath}`
  }

  // Se não começa com /, assume que é apenas o nome do arquivo
  // e adiciona /uploads/banners/ (padrão para banners)
  return `${baseUrl}/uploads/banners/${trimmedPath}`
}

/**
 * Garante que um caminho de imagem seja sempre relativo (começando com /)
 * Útil para salvar no banco de dados
 * 
 * @param imagePath - Caminho ou URL da imagem
 * @returns Caminho relativo normalizado
 */
export function normalizeImagePath(imagePath: string | null | undefined): string {
  if (!imagePath || imagePath.trim() === '') {
    return ''
  }

  const trimmed = imagePath.trim()

  // Se já é um caminho relativo, retorna como está
  if (trimmed.startsWith('/')) {
    return trimmed
  }

  // Se é uma URL completa, extrai o caminho
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      return url.pathname // Retorna /uploads/banners/filename.jpg
    } catch {
      // Se falhar ao parsear, tenta extrair manualmente
      const match = trimmed.match(/\/uploads\/banners\/[^\/\s]+/)
      if (match) {
        return match[0]
      }
    }
  }

  // Se não começa com /, assume que é apenas o nome do arquivo
  return `/uploads/banners/${trimmed}`
}

