import { env } from '../config/env'

const SESSION_ACCESS_CODES = new Set([
  'AUTH_REQUIRED',
  'AUTH_INVALID',
  'AUTH_FORBIDDEN',
  'ACCOUNT_INACTIVE',
  'SUPPLIER_INACTIVE',
])

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/social/login',
  '/auth/social/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

let installed = false
let redirecting = false

function isApiRequest(url: URL): boolean {
  const apiUrl = new URL(env.apiUrl, window.location.origin)
  const apiPath = apiUrl.pathname.replace(/\/$/, '')

  return url.origin === apiUrl.origin
    && (url.pathname === apiPath || url.pathname.startsWith(`${apiPath}/`))
}

function isPublicAuthRequest(url: URL): boolean {
  return PUBLIC_AUTH_PATHS.some(path => url.pathname.endsWith(path))
}

function removeSessionAndRedirect(): void {
  if (redirecting) return
  redirecting = true

  localStorage.removeItem('kapsu_user')
  localStorage.removeItem('kapsu_token')
  localStorage.removeItem('token')

  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  } else {
    redirecting = false
  }
}

export function installAuthResponseInterceptor(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args)

    try {
      const requestUrl = new URL(
        typeof args[0] === 'string'
          ? args[0]
          : args[0] instanceof URL
            ? args[0].toString()
            : args[0].url,
        window.location.origin,
      )

      if (!isApiRequest(requestUrl) || isPublicAuthRequest(requestUrl)) {
        return response
      }

      if (response.status === 401 || response.status === 403) {
        const payload = await response.clone().json().catch(() => null)
        if (payload?.code && SESSION_ACCESS_CODES.has(payload.code)) {
          removeSessionAndRedirect()
        }
      }
    } catch {
      // A resposta original sempre deve continuar disponivel para o chamador.
    }

    return response
  }
}
