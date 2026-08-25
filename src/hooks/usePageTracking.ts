import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { env } from '../config/env'

let API_URL = env.apiUrl.replace(/\/+$/, '')
if (!API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`
}

function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${finalPath}`
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : null
  } catch {
    return null
  }
}

function setCookie(name: string, value: string, days = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
  } catch {}
}

export function getPersistentVisitorId(): string {
  try {
    let visitorId = localStorage.getItem('kapsu_visitor_id') || getCookie('kapsu_visitor_id')
    if (!visitorId) {
      visitorId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem('kapsu_visitor_id', visitorId)
      setCookie('kapsu_visitor_id', visitorId)
    }
    return visitorId
  } catch {
    return `vid_${Date.now()}`
  }
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos de inatividade

export function getActiveSessionId(): string {
  try {
    const now = Date.now()
    const lastActivityStr = localStorage.getItem('kapsu_last_activity')
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0
    let sessionId = sessionStorage.getItem('kapsu_session_id')

    if (!sessionId || !lastActivity || now - lastActivity > SESSION_TIMEOUT_MS) {
      sessionId = `sess_${now}_${Math.random().toString(36).substring(2, 11)}`
      sessionStorage.setItem('kapsu_session_id', sessionId)
    }

    localStorage.setItem('kapsu_last_activity', now.toString())
    return sessionId
  } catch {
    return `sess_${Date.now()}`
  }
}

export function isCurrentAdminUser(): boolean {
  try {
    if (window.location.pathname.startsWith('/admin')) return true
    const role = localStorage.getItem('kapsu_role')
    if (role === 'admin') return true
    const userStr = localStorage.getItem('kapsu_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user.role === 'admin') return true
    }
  } catch {}
  return false
}

export function usePageTracking() {
  const location = useLocation()
  const startTimeRef = useRef<number>(Date.now())
  const maxScrollRef = useRef<number>(0)
  const lastTrackedPathRef = useRef<string>('')
  const lastTrackedTimeRef = useRef<number>(0)

  useEffect(() => {
    const pagePath = location.pathname
    const now = Date.now()

    // Evita rastreamento duplicado se for a mesma rota em menos de 1.5s
    if (lastTrackedPathRef.current === pagePath && now - lastTrackedTimeRef.current < 1500) {
      return
    }

    lastTrackedPathRef.current = pagePath
    lastTrackedTimeRef.current = now
    startTimeRef.current = now
    maxScrollRef.current = 0

    const visitorId = getPersistentVisitorId()
    const sessionId = getActiveSessionId()
    const isAdmin = isCurrentAdminUser()

    // Se estiver em rota de admin, não gera tráfego no tracking público
    if (pagePath.startsWith('/admin')) {
      return
    }

    trackPageView(sessionId, visitorId, pagePath, isAdmin)

    const handleScroll = () => {
      getActiveSessionId() // Renova timestamp de atividade
      const scrollPercentage = Math.round(
        ((window.scrollY + window.innerHeight) / (document.documentElement.scrollHeight || 1)) * 100
      )
      if (scrollPercentage > maxScrollRef.current) {
        maxScrollRef.current = scrollPercentage
        if (scrollPercentage === 50 || scrollPercentage === 75 || scrollPercentage >= 95) {
          trackEvent(sessionId, visitorId, 'scroll', pagePath, null, null, scrollPercentage, isAdmin)
        }
      }
    }

    const handleClick = (e: MouseEvent) => {
      getActiveSessionId() // Renova timestamp de atividade
      const target = e.target as HTMLElement
      if (!target) return

      const buttonOrLink = target.closest('button, a, [role="button"]')
      if (buttonOrLink) {
        const elementId = (buttonOrLink as HTMLElement).id || buttonOrLink.className || null
        const elementText = (buttonOrLink.textContent || '').trim().substring(0, 100) || null
        trackEvent(sessionId, visitorId, 'click', pagePath, elementId, elementText, undefined, isAdmin)
      }
    }

    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackPageExit(sessionId, visitorId, pagePath, timeOnPage, maxScrollRef.current, false, isAdmin)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000)
        trackPageExit(sessionId, visitorId, pagePath, timeOnPage, maxScrollRef.current, true, isAdmin)
      } else {
        getActiveSessionId()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('click', handleClick)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackPageExit(sessionId, visitorId, pagePath, timeOnPage, maxScrollRef.current, false, isAdmin)

      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClick)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [location.pathname])
}

async function trackPageView(sessionId: string, visitorId: string, pagePath: string, isAdmin: boolean) {
  try {
    const token = localStorage.getItem('kapsu_token')
    const url = buildApiUrl('/admin/track-access')

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': visitorId,
        'X-Session-Id': sessionId,
        ...(isAdmin && { 'X-Is-Admin': 'true' }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        path: pagePath,
        session_id: sessionId,
        visitor_id: visitorId,
        is_admin: isAdmin,
        event_type: 'page_view',
      }),
    })
  } catch {}
}

async function trackEvent(
  sessionId: string,
  visitorId: string,
  eventType: string,
  pagePath: string,
  elementId: string | null,
  elementText: string | null,
  scrollPercentage?: number,
  isAdmin = false
) {
  try {
    const token = localStorage.getItem('kapsu_token')
    await fetch(buildApiUrl('/admin/track-event'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': visitorId,
        'X-Session-Id': sessionId,
        ...(isAdmin && { 'X-Is-Admin': 'true' }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: eventType,
        page_path: pagePath,
        element_id: elementId,
        element_text: elementText,
        scroll_percentage: scrollPercentage,
        is_admin: isAdmin,
      }),
    })
  } catch {}
}

async function trackPageExit(
  sessionId: string,
  visitorId: string,
  pagePath: string,
  timeOnPage: number,
  maxScroll: number,
  isPartial = false,
  isAdmin = false
) {
  try {
    const token = localStorage.getItem('kapsu_token')
    await fetch(buildApiUrl('/admin/track-exit'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': visitorId,
        'X-Session-Id': sessionId,
        ...(isAdmin && { 'X-Is-Admin': 'true' }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        session_id: sessionId,
        visitor_id: visitorId,
        page_path: pagePath,
        time_on_page: timeOnPage,
        max_scroll: maxScroll,
        is_partial: isPartial,
        is_admin: isAdmin,
      }),
    })
  } catch {}
}
