/**
 * Utilitário centralizado para geração e parsing de URLs de produtos.
 *
 * Formato da URL: /produtos/{id}-{slug}
 * Exemplo: /produtos/mqaflx7u-cc083b2d350cd7d4-serum-antioxidante-vitamina-c
 *
 * O ID do produto tem sempre 2 segmentos separados por hífen (ex: mqaflx7u-cc083b2d350cd7d4).
 * O slug vem logo após, também separado por hífen.
 */

/**
 * Gera a URL pública completa de um produto.
 *
 * Se o produto tem slug → /produtos/{id}-{slug}
 * Se não tem slug → /produtos/{id}  (fallback, será redirecionado)
 */
export function generateProductUrl(product: { id: string; slug?: string | null }): string {
  if (product.slug && product.slug.trim() !== '') {
    return `/produtos/${product.id}-${product.slug.trim()}`
  }
  return `/produtos/${product.id}`
}

/**
 * Extrai o ID do produto a partir do parâmetro de rota `:idSlug`.
 *
 * O ID tem sempre 2 segmentos separados por hífen.
 * Exemplos:
 *   "mqaflx7u-cc083b2d350cd7d4-serum-antioxidante"  → "mqaflx7u-cc083b2d350cd7d4"
 *   "mqaflx7u-cc083b2d350cd7d4"                      → "mqaflx7u-cc083b2d350cd7d4"
 */
export function parseProductId(idSlugParam: string): string {
  if (!idSlugParam) return ''
  const parts = idSlugParam.split('-')
  // O ID é sempre os dois primeiros segmentos
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`
  }
  return parts[0]
}

/**
 * Extrai o slug a partir do parâmetro de rota `:idSlug`.
 *
 * Exemplos:
 *   "mqaflx7u-cc083b2d350cd7d4-serum-antioxidante"  → "serum-antioxidante"
 *   "mqaflx7u-cc083b2d350cd7d4"                      → ""
 */
export function parseProductSlug(idSlugParam: string): string {
  if (!idSlugParam) return ''
  const parts = idSlugParam.split('-')
  if (parts.length > 2) {
    return parts.slice(2).join('-')
  }
  return ''
}
