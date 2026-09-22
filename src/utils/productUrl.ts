/**
 * Utilitário centralizado para geração e parsing de URLs de produtos.
 *
 * Novo Formato da URL (curto e amigável para SEO): /produtos/{slug}
 * Exemplo: /produtos/serum-antioxidante-vitamina-c
 *
 * Suporte retrocompatível:
 * - /produtos/{id} (ex: /produtos/mq2xevci-7a91255e2be4c987)
 * - /produtos/{id}-{slug} (ex: /produtos/mq2xevci-7a91255e2be4c987-serum-antioxidante)
 */

const ID_PATTERN = /^[a-z0-9]{7,10}-[a-z0-9]{16}$/i
const COMPOSITE_PATTERN = /^([a-z0-9]{7,10}-[a-z0-9]{16})-(.+)$/i

/**
 * Gera a URL pública completa de um produto.
 *
 * Se o produto tem slug → /produtos/{slug}
 * Se não tem slug → /produtos/{id} (fallback seguro)
 */
export function generateProductUrl(product: { id: string; slug?: string | null }): string {
  if (product.slug && product.slug.trim() !== '') {
    return `/produtos/${product.slug.trim()}`
  }
  return `/produtos/${product.id}`
}

/**
 * Extrai o identificador ou ID do produto a partir do parâmetro de rota `:idSlug`.
 *
 * Exemplos:
 *   "mq2xevci-7a91255e2be4c987-pre-treino" → "mq2xevci-7a91255e2be4c987" (legado)
 *   "mq2xevci-7a91255e2be4c987"            → "mq2xevci-7a91255e2be4c987" (legado por ID)
 *   "pre-treino"                           → "pre-treino" (slug SEO limpo)
 */
export function parseProductId(idSlugParam: string): string {
  if (!idSlugParam) return ''
  const trimmed = idSlugParam.trim()

  const compositeMatch = trimmed.match(COMPOSITE_PATTERN)
  if (compositeMatch) {
    return compositeMatch[1]
  }

  return trimmed
}

/**
 * Extrai o slug a partir do parâmetro de rota `:idSlug`.
 *
 * Exemplos:
 *   "mq2xevci-7a91255e2be4c987-pre-treino" → "pre-treino"
 *   "pre-treino"                           → "pre-treino"
 *   "mq2xevci-7a91255e2be4c987"            → ""
 */
export function parseProductSlug(idSlugParam: string): string {
  if (!idSlugParam) return ''
  const trimmed = idSlugParam.trim()

  const compositeMatch = trimmed.match(COMPOSITE_PATTERN)
  if (compositeMatch) {
    return compositeMatch[2]
  }

  if (ID_PATTERN.test(trimmed)) {
    return ''
  }

  return trimmed
}

