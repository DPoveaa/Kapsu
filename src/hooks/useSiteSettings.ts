import { useState, useEffect } from 'react'
import { siteSettingsService, SiteSettings } from '../services/site-settings.service'

const FALLBACK_SETTINGS: SiteSettings = {
  contact_email: 'kapsultda@gmail.com',
  contact_phone: '(11) 5304-2534',
  social_media: {},
  chatbot_enabled: true,
}

function readCachedSettings(): SiteSettings | null {
  try {
    const stored = localStorage.getItem('site_settings')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(
    () => readCachedSettings() || FALLBACK_SETTINGS
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const applySettings = (next: SiteSettings) => {
      if (!mounted) return
      setSettings(next)
      setLoading(false)
    }

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SiteSettings>).detail
      if (detail) applySettings(detail)
    }

    siteSettingsService
      .getSettings()
      .then((data) => {
        siteSettingsService.publishSettings(data)
        applySettings(data)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })

    window.addEventListener('site-settings-updated', handleSettingsUpdated)

    return () => {
      mounted = false
      window.removeEventListener('site-settings-updated', handleSettingsUpdated)
    }
  }, [])

  return { settings, loading }
}
