export interface ProductPricingInput {
  price: number | string;
  promo_price?: number | string | null;
  promoPrice?: number | string | null;
  promo_ends_at?: string | null;
  promoEndsAt?: string | null;
}

export interface ProductPricing {
  price: number;
  promoPrice: number | null;
  effectivePrice: number;
  originalPrice: number | null;
  discountPercent: number;
  isPromoActive: boolean;
  isExpired: boolean;
  promoEndsAt?: string | null;
}

/**
 * Calcula a precificação de um produto no frontend.
 * 
 * Regras:
 * 1. Se `promo_price` existe e `promo_ends_at` não expirou:
 *    - Se promo_price > price: R$ promo_price é o preço antigo ("De:") e R$ price é o valor promocional ("Por:").
 *    - Se promo_price < price: R$ price é o preço antigo ("De:") e R$ promo_price é o valor promocional ("Por:").
 *    - effectivePrice = min(price, promo_price)
 *    - originalPrice = max(price, promo_price)
 *    - discountPercent = ((originalPrice - effectivePrice) / originalPrice) * 100
 * 2. Se a promoção estiver expirada ou inexistente:
 *    - effectivePrice = price
 *    - originalPrice = null
 *    - discountPercent = 0
 */
export function getProductPricing(product?: ProductPricingInput | null): ProductPricing {
  if (!product) {
    return {
      price: 0,
      promoPrice: null,
      effectivePrice: 0,
      originalPrice: null,
      discountPercent: 0,
      isPromoActive: false,
      isExpired: false,
    };
  }

  const basePrice = Math.max(0, Number(product.price) || 0);
  const rawPromo = product.promoPrice ?? product.promo_price;
  const promoValue = rawPromo !== null && rawPromo !== undefined && rawPromo !== ''
    ? Number(rawPromo)
    : null;
  const endsAt = product.promoEndsAt || product.promo_ends_at || null;

  let isExpired = false;
  if (endsAt) {
    const endDate = new Date(endsAt);
    if (!isNaN(endDate.getTime()) && endDate.getTime() < Date.now()) {
      isExpired = true;
    }
  }

  const hasPromo = !isExpired && promoValue !== null && !isNaN(promoValue) && promoValue > 0 && promoValue !== basePrice;

  if (!hasPromo) {
    return {
      price: basePrice,
      promoPrice: null,
      effectivePrice: basePrice,
      originalPrice: null,
      discountPercent: 0,
      isPromoActive: false,
      isExpired,
      promoEndsAt: endsAt,
    };
  }

  const effectivePrice = Math.min(basePrice, promoValue);
  const originalPrice = Math.max(basePrice, promoValue);
  const discountPercent = originalPrice > 0
    ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
    : 0;

  return {
    price: basePrice,
    promoPrice: promoValue,
    effectivePrice,
    originalPrice,
    discountPercent,
    isPromoActive: true,
    isExpired: false,
    promoEndsAt: endsAt,
  };
}

/**
 * Retorna o preço unitário efetivo cobrado do cliente
 */
export function getEffectiveProductPrice(product?: ProductPricingInput | null): number {
  return getProductPricing(product).effectivePrice;
}
