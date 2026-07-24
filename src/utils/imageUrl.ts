import { env } from '../config/env'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

function stripApiSuffix(url: string): string {
  return url.replace(/\/api\/?$/i, '').replace(/\/$/, '')
}

function getRuntimeOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin.replace(/\/$/, '')
}

function getBaseUrl(): string {
  const configuredBase = env.apiUrl ? stripApiSuffix(env.apiUrl) : ''

  if (configuredBase) {
    return configuredBase
  }

  if (env.isDev) {
    return getRuntimeOrigin()
  }

  return getRuntimeOrigin()
}

function getApiUploadsBase(): string {
  return `${getBaseUrl()}/api/uploads`
}

function extractUploadsPath(value: string): string | null {
  const match = value.match(/\/(?:api\/)*uploads\/[^?\s#]+/i)
  if (!match) return null

  return match[0].replace(/^\/(?:api\/)+uploads\//i, '/uploads/')
}

export function getUploadsImageUrl(
  imagePath: string | null | undefined,
  fallbackFolder = 'banners'
): string {
  if (!imagePath || imagePath.trim() === '') {
    return ''
  }

  const trimmedPath = imagePath.trim()

  if (trimmedPath.startsWith('data:')) {
    return trimmedPath
  }

  const uploadsPath = extractUploadsPath(trimmedPath)
  if (uploadsPath) {
    const relativePath = uploadsPath.replace(/^\/uploads\//i, '')
    return `${getApiUploadsBase()}/${relativePath}`
  }

  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath
  }

  const hasImageExtension = IMAGE_EXTENSIONS.some(ext => trimmedPath.toLowerCase().includes(ext))
  if (!trimmedPath.startsWith('/') && !hasImageExtension && trimmedPath.length > 50) {
    return ''
  }

  const cleanPath = trimmedPath.replace(/^\/+/, '')
  const relativePath = cleanPath.startsWith('uploads/')
    ? cleanPath.replace(/^uploads\//i, '')
    : `${fallbackFolder}/${cleanPath}`

  return `${getApiUploadsBase()}/${relativePath}`
}

export function getImageUrl(imagePath: string | null | undefined): string {
  return getUploadsImageUrl(imagePath, 'banners')
}

export function getResponsiveImageSrcSet(
  imagePath: string | null | undefined,
  widths: number[],
  kind: 'products' | 'banners' = 'products'
): string | undefined {
  if (!imagePath) return undefined
  if (/-\d+w\.webp(?:$|[?#])/i.test(imagePath)) {
    return widths.map(width => {
      const variant = imagePath.replace(/-\d+w\.webp(?=$|[?#])/i, `-${width}w.webp`)
      return `${getUploadsImageUrl(variant, kind)} ${width}w`
    }).join(', ')
  }
  const uploadsPath = extractUploadsPath(imagePath)
  if (!uploadsPath || !env.imageVariantsEnabled) return undefined
  const filename = uploadsPath.split('/').pop()
  if (!filename) return undefined
  return widths.map(width =>
    `${env.apiUrl.replace(/\/$/, '')}/upload/variant/${kind}/${width}/${encodeURIComponent(filename)} ${width}w`
  ).join(', ')
}

export function normalizeImagePath(imagePath: string | null | undefined): string {
  if (!imagePath || imagePath.trim() === '') {
    return ''
  }

  const trimmed = imagePath.trim()
  const uploadsPath = extractUploadsPath(trimmed)

  if (uploadsPath) {
    return uploadsPath
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).pathname
    } catch {
      return trimmed
    }
  }

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  return `/uploads/banners/${trimmed}`
}
