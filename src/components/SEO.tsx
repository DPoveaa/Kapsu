import { useEffect } from 'react'

export interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogType?: 'website' | 'product' | 'article'
  ogImage?: string
  noindex?: boolean
  jsonLd?: object | object[]
}

const DEFAULT_TITLE = 'Kapsu | Suplementos, Skincare e Cuidados Pessoais'
const DEFAULT_DESCRIPTION = 'Conheça a Kapsu: suplementos alimentares, vitaminas, skincare, cosméticos e cuidados pessoais. Compre online em kapsu.com.br.'
const DEFAULT_DOMAIN = 'https://kapsu.com.br'
const DEFAULT_IMAGE = `${DEFAULT_DOMAIN}/logo.png`

/**
 * Utility helper to set or remove a meta tag attribute.
 */
function setMetaTag(selector: string, attr: string, value: string | null | undefined) {
  if (!value) {
    const existing = document.querySelector(selector)
    if (existing) existing.remove()
    return
  }

  let element = document.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    if (selector.startsWith('meta[name=')) {
      const nameMatch = selector.match(/name="([^"]+)"/)
      if (nameMatch) element.setAttribute('name', nameMatch[1])
    } else if (selector.startsWith('meta[property=')) {
      const propMatch = selector.match(/property="([^"]+)"/)
      if (propMatch) element.setAttribute('property', propMatch[1])
    }
    document.head.appendChild(element)
  }
  element.setAttribute(attr, value)
}

/**
 * Helper to update canonical link tag
 */
function setCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

/**
 * Helper to set/update dynamic JSON-LD structured data
 */
function setJsonLd(jsonLdData?: object | object[]) {
  const scriptId = 'kapsu-schema-jsonld'
  let script = document.getElementById(scriptId) as HTMLScriptElement | null

  if (!jsonLdData) {
    if (script) script.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.id = scriptId
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify(jsonLdData)
}

/**
 * Cleans dynamic URLs by stripping tracking parameters (utm_*, gclid, fbclid, etc.)
 * and normalizing trailing slashes, www, http/https to https://kapsu.com.br
 */
function buildCleanCanonical(rawPathOrUrl?: string): string {
  const base = DEFAULT_DOMAIN
  let pathWithQuery = ''

  if (!rawPathOrUrl) {
    const currentPath = window.location.pathname
    const searchParams = new URLSearchParams(window.location.search)
    
    // Preserve only non-tracking search parameters (e.g., 'category')
    const cleanParams = new URLSearchParams()
    searchParams.forEach((val, key) => {
      if (!key.startsWith('utm_') && key !== 'gclid' && key !== 'fbclid' && key !== 'msclkid' && key !== 'ref') {
        cleanParams.append(key, val)
      }
    })
    const query = cleanParams.toString()
    pathWithQuery = `${currentPath}${query ? `?${query}` : ''}`
  } else if (rawPathOrUrl.startsWith('http://') || rawPathOrUrl.startsWith('https://')) {
    try {
      const parsed = new URL(rawPathOrUrl)
      pathWithQuery = `${parsed.pathname}${parsed.search}`
    } catch {
      pathWithQuery = rawPathOrUrl
    }
  } else {
    pathWithQuery = rawPathOrUrl.startsWith('/') ? rawPathOrUrl : `/${rawPathOrUrl}`
  }

  // Separate path and query string
  const [pathPart, queryPart] = pathWithQuery.split('?')
  let normalizedPath = pathPart

  // Standardize trailing slashes: homepage is '/', every other route has NO trailing slash
  if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1)
  }

  return `${base}${normalizedPath}${queryPart ? `?${queryPart}` : ''}`
}

export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogType = 'website',
  ogImage,
  noindex = false,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    // 1. Page Title
    document.title = title

    // 2. Meta Description
    setMetaTag('meta[name="description"]', 'content', description)

    // 3. Robots
    const robotsContent = noindex ? 'noindex, follow' : 'index, follow'
    setMetaTag('meta[name="robots"]', 'content', robotsContent)

    // 4. Canonical URL
    const canonicalUrl = buildCleanCanonical(canonical)
    setCanonicalLink(canonicalUrl)

    // 5. Open Graph Metadata
    setMetaTag('meta[property="og:title"]', 'content', title)
    setMetaTag('meta[property="og:description"]', 'content', description)
    setMetaTag('meta[property="og:type"]', 'content', ogType)
    setMetaTag('meta[property="og:url"]', 'content', canonicalUrl)
    setMetaTag('meta[property="og:site_name"]', 'content', 'Kapsu')

    const resolvedOgImage = ogImage
      ? (ogImage.startsWith('http://') || ogImage.startsWith('https://') ? ogImage : `${DEFAULT_DOMAIN}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`)
      : DEFAULT_IMAGE
    setMetaTag('meta[property="og:image"]', 'content', resolvedOgImage)

    // 6. Twitter Card Metadata
    setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image')
    setMetaTag('meta[name="twitter:title"]', 'content', title)
    setMetaTag('meta[name="twitter:description"]', 'content', description)
    setMetaTag('meta[name="twitter:image"]', 'content', resolvedOgImage)

    // 7. Schema.org JSON-LD
    setJsonLd(jsonLd)

  }, [title, description, canonical, ogType, ogImage, noindex, jsonLd])

  return null
}
