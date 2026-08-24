import { getProductPricing } from './productPricing'

export type PromotionCardProduct = {
  id: string
  name: string
  price: number
  promoPrice?: number | null
  promo_price?: number | null
  promo_ends_at?: string | null
  promoEndsAt?: string | null
  category?: string | null
  image?: string | null
}

export type NormalizedPromotionCard = PromotionCardProduct & {
  originalPrice: number
  promoPrice: number | null
  discountPercent: number
  categoryLabel: string | null
  isPromoActive: boolean
}

export function normalizePromotionProduct(product: PromotionCardProduct): NormalizedPromotionCard {
  const pricing = getProductPricing(product)
  const categoryLabel = product.category?.split(',')[0]?.trim() || null

  return {
    ...product,
    originalPrice: pricing.originalPrice ?? pricing.price,
    promoPrice: pricing.isPromoActive ? pricing.effectivePrice : null,
    discountPercent: pricing.discountPercent,
    categoryLabel,
    isPromoActive: pricing.isPromoActive
  }
}

export function sortPromotionProductsByDiscount(items: PromotionCardProduct[]): NormalizedPromotionCard[] {
  return items
    .map(normalizePromotionProduct)
    .filter(p => p.isPromoActive)
    .sort((a, b) => {
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
