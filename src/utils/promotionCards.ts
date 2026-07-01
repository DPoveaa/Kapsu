export type PromotionCardProduct = {
  id: string
  name: string
  price: number
  promoPrice?: number | null
  promo_price?: number | null
  category?: string | null
  image?: string | null
}

export type NormalizedPromotionCard = PromotionCardProduct & {
  originalPrice: number
  promoPrice: number | null
  discountPercent: number
  categoryLabel: string | null
}

export function normalizePromotionProduct(product: PromotionCardProduct): NormalizedPromotionCard {
  const originalPrice = Number(product.price) || 0
  const rawPromo = product.promoPrice ?? product.promo_price
  const parsedPromo = rawPromo === null || rawPromo === undefined ? null : Number(rawPromo)
  const hasPromo = parsedPromo !== null && Number.isFinite(parsedPromo) && parsedPromo > 0 && parsedPromo < originalPrice
  const promoPrice = hasPromo ? parsedPromo : null
  const discountPercent =
    hasPromo && originalPrice > 0 ? Math.round(((originalPrice - (promoPrice as number)) / originalPrice) * 100) : 0
  const categoryLabel = product.category?.split(',')[0]?.trim() || null

  return {
    ...product,
    originalPrice,
    promoPrice,
    discountPercent,
    categoryLabel
  }
}

export function sortPromotionProductsByDiscount(items: PromotionCardProduct[]): NormalizedPromotionCard[] {
  return items.map(normalizePromotionProduct).sort((a, b) => {
    if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

export function selectTopPromotionProducts(items: PromotionCardProduct[], limit = 3) {
  const sorted = sortPromotionProductsByDiscount(items)
  return {
    visible: sorted.slice(0, limit),
    totalCount: sorted.length,
    hasMore: sorted.length > limit
  }
}
