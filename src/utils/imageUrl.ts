import { env } from '../config/env'

/**
 * Normaliza a URL base removendo /api se existir
 * Isso garante que funcione tanto localmente quanto no servidor
 * SEMPRE usa a URL do backend configurada em VITE_API_URL
 * 
 * Exemplo: https://kapsu.com.br/api -> https://kapsu.com.br
 */
function getBaseUrl(): string {
  let baseUrl = env.apiUrl
  
  // Se não há apiUrl configurada, tenta usar window.location apenas em desenvolvimento
  if (!baseUrl || baseUrl === 'http://localhost:3000/api') {
    if (typeof window !== 'undefined' && env.isDev) {
      // Apenas em desenvolvimento, usa a origem atual se não configurado
      return window.location.origin
    }
    // Em produção, se não está configurado, retorna vazio (vai dar erro, mas é melhor que usar URL errada)
    console.error('⚠️ VITE_API_URL não está configurada! Configure no .env')
    return ''
  }
  
  // Remove /api do final se existir
  // Exemplo: https://kapsu.com.br/api -> https://kapsu.com.br
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4) // Remove '/api'
  } else if (baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.slice(0, -5) // Remove '/api/'
  }
  
  // Remove barra final se existir
  baseUrl = baseUrl.replace(/\/$/, '')
  
  // Log em produção para debug - mostra a transformação
  if (env.isProd && typeof window !== 'undefined') {
    console.log('🔗 Configuração de URL:', {
      'VITE_API_URL (original)': env.apiUrl,
      'Base URL (sem /api)': baseUrl,
      'Origem atual (frontend)': window.location.origin,
      'URLs de imagem serão': `${baseUrl}/uploads/banners/...`
    })
  }
  
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
  
  // Se baseUrl está vazio, algo está errado
  if (!baseUrl) {
    console.error('❌ Erro: baseUrl está vazio! VITE_API_URL não está configurada corretamente.')
    console.error('Configuração atual:', {
      envApiUrl: env.apiUrl,
      isProd: env.isProd,
      isDev: env.isDev
    })
    // Em produção, tenta usar a origem atual como último recurso
    if (typeof window !== 'undefined') {
      const fallbackUrl = `${window.location.origin}${trimmedPath}`
      console.warn('⚠️ Usando fallback:', fallbackUrl)
      return fallbackUrl
    }
    return ''
  }

  // Se é um caminho relativo (começa com /), converte para URL completa
  // Tenta primeiro via rota direta, depois via API (para funcionar com proxy reverso)
  if (trimmedPath.startsWith('/')) {
    // Primeiro tenta a rota direta: https://kapsu.com.br/uploads/banners/image.jpg
    const directUrl = `${baseUrl}${trimmedPath}`
    
    // Também prepara uma URL via API: https://kapsu.com.br/api/uploads/banners/image.jpg
    // Isso funciona mesmo se o proxy reverso não passar /uploads para o Express
    const apiUrl = `${env.apiUrl.replace('/api', '')}/api${trimmedPath}`
    
    // Log sempre em produção para debug
    if (env.isProd) {
      console.log('🔗 URL da imagem gerada:', {
        original: trimmedPath,
        baseUrl: baseUrl,
        directUrl: directUrl,
        apiUrl: apiUrl,
        'Tentando primeiro': directUrl
      })
    }
    
    // Retorna a URL direta primeiro (mais eficiente se funcionar)
    // Se não funcionar, o navegador vai tentar a API como fallback
    return directUrl
  }

  // Se não começa com /, assume que é apenas o nome do arquivo
  // e adiciona /uploads/banners/ (padrão para banners)
  // Exemplo: image.jpg -> https://kapsu.com.br/uploads/banners/image.jpg
  const fullUrl = `${baseUrl}/uploads/banners/${trimmedPath}`
  if (env.isProd) {
    console.log('🔗 URL da imagem gerada (sem /):', {
      original: trimmedPath,
      baseUrl: baseUrl,
      fullUrl: fullUrl,
      envApiUrl: env.apiUrl
    })
  }
  return fullUrl
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

