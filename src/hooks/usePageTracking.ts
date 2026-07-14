import { useEffect, useRef } from 'react'
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

// Gera um ID de sessão único que persiste durante a sessão do navegador
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('kapsu_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('kapsu_session_id', sessionId)
  }
  return sessionId
}

/**
 * Hook para rastrear comportamento do usuário na página
 * - Tempo de permanência
 * - Scroll
 - Cliques
 * - Saída da página
 */
export function usePageTracking() {
  const location = useLocation()
  const startTimeRef = useRef<number>(Date.now())
  const maxScrollRef = useRef<number>(0)
  const sessionIdRef = useRef<string>(getSessionId())
  const pagePathRef = useRef<string>(location.pathname)

  // Rastreia quando a página é carregada
  useEffect(() => {
    const sessionId = sessionIdRef.current
    const pagePath = location.pathname
    pagePathRef.current = pagePath
    startTimeRef.current = Date.now()
    maxScrollRef.current = 0

    // Registra visualização da página
    trackPageView(sessionId, pagePath)

    // Rastreia scroll
    const handleScroll = () => {
      const scrollPercentage = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
      )
      if (scrollPercentage > maxScrollRef.current) {
        maxScrollRef.current = scrollPercentage
        // Registra scroll significativo (a cada 25%)
        if (scrollPercentage % 25 === 0 || scrollPercentage === 100) {
          trackEvent(sessionId, 'scroll', pagePath, null, null, scrollPercentage)
        }
      }
    }

    // Rastreia cliques em elementos importantes
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const elementId = target.id || target.className || null
      const elementText = target.textContent?.substring(0, 100) || null
      
      // Só rastreia cliques em elementos relevantes (botões, links, etc)
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button'
      ) {
        trackEvent(sessionId, 'click', pagePath, elementId, elementText)
      }
    }

    // Rastreia quando o usuário está prestes a sair
    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackPageExit(sessionId, pagePath, timeOnPage, maxScrollRef.current)
    }

    // Rastreia quando a página perde o foco (usuário mudou de aba)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000)
        // Salva tempo parcial (usuário ainda não saiu completamente)
        trackPageExit(sessionId, pagePath, timeOnPage, maxScrollRef.current, true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('click', handleClick)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Quando o componente desmonta (usuário navegou para outra página)
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackPageExit(sessionId, pagePath, timeOnPage, maxScrollRef.current)
      
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClick)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [location.pathname])
}

async function trackPageView(sessionId: string, pagePath: string) {
  try {
    const token = localStorage.getItem('kapsu_token')
    const url = buildApiUrl('/admin/track-access')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ 
        path: pagePath,
        session_id: sessionId,
        event_type: 'page_view'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [FRONTEND] Erro ao rastrear visualização:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
    }
  } catch (error) {
    console.error('❌ [FRONTEND] Erro ao rastrear visualização:', error)
  }
}

async function trackEvent(
  sessionId: string,
  eventType: string,
  pagePath: string,
  elementId: string | null,
  elementText: string | null,
  scrollPercentage?: number
) {
  try {
    const token = localStorage.getItem('kapsu_token')
    
    await fetch(buildApiUrl('/admin/track-event'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        page_path: pagePath,
        element_id: elementId,
        element_text: elementText,
        scroll_percentage: scrollPercentage,
      }),
    })
  } catch (error) {
    console.debug('Erro ao rastrear evento:', error)
  }
}

async function trackPageExit(
  sessionId: string,
  pagePath: string,
  timeOnPage: number,
  maxScroll: number,
  isPartial = false
) {
  try {
    const token = localStorage.getItem('kapsu_token')
    const url = buildApiUrl('/admin/track-exit')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        session_id: sessionId,
        page_path: pagePath,
        time_on_page: timeOnPage,
        max_scroll: maxScroll,
        is_partial: isPartial,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [FRONTEND] Erro ao rastrear saída:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
    }
  } catch (error) {
    console.error('❌ [FRONTEND] Erro ao rastrear saída:', error)
  }
}

