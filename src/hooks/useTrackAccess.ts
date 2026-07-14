import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { env } from '../config/env'

// Normaliza a URL da API removendo barras no final
let API_URL = env.apiUrl.replace(/\/+$/, '')

// Garante que a URL sempre termine com /api
if (!API_URL.endsWith('/api')) {
  // Se não termina com /api, adiciona
  API_URL = `${API_URL}/api`
}

// Helper para construir URLs sem barras duplicadas
function buildApiUrl(path: string): string {
  // Remove barra inicial do path se existir
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  // Garante que o path comece com /
  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${finalPath}`
}

/**
 * Hook para rastrear acessos ao site
 * Registra automaticamente quando a página é carregada
 */
export function useTrackAccess() {
  const location = useLocation()

  useEffect(() => {
    // Aguarda um pouco para garantir que a página carregou
    const timer = setTimeout(() => {
      trackAccess(location.pathname)
    }, 500)

    return () => clearTimeout(timer)
  }, [location.pathname])
}

async function trackAccess(path: string) {
  try {
    const token = localStorage.getItem('kapsu_token')
    const url = buildApiUrl('/admin/track-access')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ path }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [FRONTEND] Erro ao rastrear acesso:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
    }
  } catch (error) {
    console.error('❌ [FRONTEND] Erro ao rastrear acesso:', error)
  }
}

