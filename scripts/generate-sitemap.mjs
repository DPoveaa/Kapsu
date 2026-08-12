import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SITE_DOMAIN = 'https://kapsu.com.br'

// Static indexable public routes
const staticRoutes = [
  '/',
  '/produtos',
  '/politica-de-privacidade',
  '/termos-de-servico',
  '/informacoes-farmaceuticas',
]

/**
 * Generates exact canonical product path matching frontend generateProductUrl()
 */
function generateProductPath(product) {
  const id = product.id
  const slug = product.slug && typeof product.slug === 'string' ? product.slug.trim() : ''
  if (slug) {
    return `/produtos/${id}-${slug}`
  }
  return `/produtos/${id}`
}

/**
 * Resolves the API endpoint for fetching products during node sitemap build
 */
function resolveApiUrl() {
  // 1. Explicit sitemap build API override
  if (process.env.SITEMAP_API_URL && process.env.SITEMAP_API_URL.trim() !== '') {
    return process.env.SITEMAP_API_URL.trim().replace(/\/+$/, '')
  }

  // 2. Default strictly to live production API endpoint
  return `${SITE_DOMAIN}/api`
}

async function fetchProductionProducts(apiUrl) {
  const endpoint = `${apiUrl}/products`
  console.log(`[Sitemap] Fetching production active catalog from: ${endpoint}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Kapsu-Sitemap-Generator/1.0',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    if (!text || text.trim() === '') {
      throw new Error('Received empty response body from API')
    }

    const json = JSON.parse(text)
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.message || 'Invalid API payload format (data array expected)')
    }

    // Filter only active and non-archived products from the production catalog
    const activeProducts = json.data.filter(p => p && p.id && p.active !== false && !p.archived)
    console.log(`[Sitemap] Successfully fetched ${activeProducts.length} active production products.`)
    return activeProducts
  } catch (error) {
    clearTimeout(timeoutId)
    throw new Error(`Failed to fetch active products from production API (${endpoint}): ${error.message}`)
  }
}

async function main() {
  const apiUrl = resolveApiUrl()
  let products = []

  try {
    products = await fetchProductionProducts(apiUrl)
  } catch (error) {
    console.error(`\n❌ [Sitemap Fatal Error] ${error.message}`)
    console.error(`[Sitemap] A production sitemap cannot be generated without a verified live product catalog.`)
    console.error(`[Sitemap] Execution halted safely to prevent publishing corrupted or stale product URLs.\n`)
    process.exit(1)
  }

  const urls = []

  // 1. Static public indexable routes
  for (const route of staticRoutes) {
    urls.push(`  <url>\n    <loc>${SITE_DOMAIN}${route}</loc>\n  </url>`)
  }

  // 2. Real production product URLs
  for (const p of products) {
    const path = generateProductPath(p)
    const loc = `${SITE_DOMAIN}${path}`
    let lastmodTag = ''
    if (p.updated_at) {
      try {
        const iso = new Date(p.updated_at).toISOString().split('T')[0]
        if (iso && !isNaN(new Date(p.updated_at).getTime())) {
          lastmodTag = `\n    <lastmod>${iso}</lastmod>`
        }
      } catch {
        // ignore invalid date strings
      }
    }
    urls.push(`  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`)
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`

  const targetPath = path.resolve(__dirname, '../public/sitemap.xml')
  fs.writeFileSync(targetPath, xmlContent, 'utf-8')
  console.log(`✅ [Sitemap] Successfully updated ${targetPath} (${urls.length} URLs generated).`)
}

main()
