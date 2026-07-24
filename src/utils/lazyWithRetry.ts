import { lazy, type ComponentType } from 'react'

type LazyModule = {
  default: ComponentType
}

export function lazyWithRetry(importer: () => Promise<LazyModule>, cacheKey: string) {
  const retryKey = `kapsu:lazy-retry:${cacheKey}`

  return lazy(async () => {
    try {
      const module = await importer()
      try {
        window.sessionStorage.removeItem(retryKey)
      } catch {
        // A successful import must not depend on storage availability.
      }
      return module
    } catch (error) {
      try {
        if (window.sessionStorage.getItem(retryKey) !== '1') {
          window.sessionStorage.setItem(retryKey, '1')
          window.location.reload()
          return await new Promise<never>(() => undefined)
        }

        window.sessionStorage.removeItem(retryKey)
      } catch {
        // Storage may be unavailable in privacy-restricted browsers.
      }

      throw error
    }
  })
}
