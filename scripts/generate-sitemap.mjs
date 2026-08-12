import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SITE_URL = 'https://kapsu.com.br'

// Static indexable public routes
const staticRoutes = [
  '/',
  '/produtos',
  '/politica-de-privacidade',
  '/termos-de-servico',
  '/informacoes-farmaceuticas',
]

// Real product fallback data extracted from active database snapshot
const fallbackProducts = [
  { id: 'mrmi1oug-7f02edc36fdfe0fe', slug: 'serum-vitamina-c' },
  { id: 'mrmi1owq-61c250f9da73d875', slug: 'serum-biomimetico-ghk-cu' },
  { id: 'mqaflx1v-818037fa0f750a3e', slug: 'rotina-ativa' },
  { id: 'mqaflx7u-cc083b2d350cd7d4', slug: 'adeus-medidas' },
  { id: 'mqaflwso-da6c1bb48e7f4e20', slug: 'tonico-fortalecedor' },
  { id: 'mqaflxbf-2df781a0444928c2', slug: 'drenamax' },
  { id: 'mqaflxc1-e811ffdec1921a16', slug: 'rapunzel' },
  { id: 'mqaflxdb-ece38134f3cf61b6', slug: 'pele-de-ouro' },
  { id: 'mqaflwtv-9fd08ab15b71b128', slug: 'redutor-de-medidas' },
  { id: 'mqaflwwu-79b9b4155ed91294', slug: 'anti-inchaco' },
  { id: 'mpp0b9f2-f8549edee8487a5c', slug: 'mulher-40' },
  { id: 'mqaflxdy-e2441fe05ddf9d4a', slug: 'glisodin' },
]

function generateSlug(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchProducts() {
  const apiUrl = process.env.VITE_API_URL || 'https://kapsu-api.com.br/api'
  try {
    const res = await fetch(`${apiUrl}/products`)
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        return data.data
          .filter(p => p.active !== false && !p.archived)
          .map(p => ({
            id: p.id,
            slug: p.slug || generateSlug(p.name),
            updated_at: p.updated_at,
          }))
      }
    }
  } catch (err) {
    // API not reachable during build/script execution, fallback to local dataset
  }

  // Try reading from evidence file if available in sibling repo folder
  try {
    const evidencePath = path.resolve(__dirname, '../../Kapsu-api/artifacts/evidence_utf8.json')
    if (fs.existsSync(evidencePath)) {
      const raw = fs.readFileSync(evidencePath, 'utf-8')
      const match = raw.match(/=== 1\. ALL ACTIVE CATALOG PRODUCTS ===\s*(\[\s*\{[\s\S]*?\n\])/)
      if (match && match[1]) {
        const parsed = JSON.parse(match[1])
        return parsed
          .filter(p => p.active !== false && !p.archived)
          .map(p => ({
            id: p.id,
            slug: p.slug || generateSlug(p.name),
            updated_at: p.updated_at,
          }))
      }
    }
  } catch (err) {
    // ignore
  }

  return fallbackProducts
}

async function main() {
  console.log('Gerando sitemap.xml para Kapsu...')
  const products = await fetchProducts()

  const urls = []

  // Static routes
  for (const route of staticRoutes) {
    urls.push(`  <url>
    <loc>${SITE_URL}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`)
  }

  // Product routes
  for (const p of products) {
    const productSlug = p.slug ? `${p.id}-${p.slug}` : p.id
    const loc = `${SITE_URL}/produtos/${productSlug}`
    const lastmodTag = p.updated_at ? `\n    <lastmod>${new Date(p.updated_at).toISOString().split('T')[0]}</lastmod>` : ''
    urls.push(`  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`)
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`

  const targetPath = path.resolve(__dirname, '../public/sitemap.xml')
  fs.writeFileSync(targetPath, xmlContent, 'utf-8')
  console.log(`Sitemap gerado com sucesso em: ${targetPath} (${urls.length} URLs)`)
}

main()
