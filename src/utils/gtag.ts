/**
 * Google Tag (gtag.js) utility for Google Ads AW-18234729882
 */

export const GOOGLE_ADS_ID = 'AW-18234729882'

declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
  }
}

/**
 * Tracks a pageview in Google Tag (gtag.js)
 * Essential for Single Page Applications (SPAs) on route changes.
 */
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('config', GOOGLE_ADS_ID, {
      page_path: url,
    })
  }
}

/**
 * Tracks a custom event in Google Tag
 */
export const trackEvent = (action: string, params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, params)
  }
}

/**
 * Tracks Google Ads conversion
 * @param sendTo Optional specific conversion label, e.g. 'AW-18234729882/abcdef123'
 * @param value Transaction/conversion value
 * @param currency Currency code (default: 'BRL')
 * @param transactionId Unique transaction ID / Order ID
 */
export const trackConversion = (
  sendTo?: string,
  value?: number,
  currency: string = 'BRL',
  transactionId?: string
) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    const params: Record<string, any> = {
      send_to: sendTo || GOOGLE_ADS_ID,
    }
    if (value !== undefined) params.value = value
    if (currency) params.currency = currency
    if (transactionId) params.transaction_id = transactionId

    window.gtag('event', 'conversion', params)
  }
}

/**
 * Tracks purchase event
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string = 'BRL',
  items?: Array<{ id: string; name: string; price: number; quantity?: number }>
) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value,
      currency,
      items: items?.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    })
  }
}

/**
 * Tracks Add To Cart event
 */
export const trackAddToCart = (item: { id: string; name: string; price: number; quantity?: number }) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'add_to_cart', {
      currency: 'BRL',
      value: item.price * (item.quantity || 1),
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
        },
      ],
    })
  }
}

/**
 * Tracks Begin Checkout event
 */
export const trackBeginCheckout = (value?: number, items?: Array<{ id: string; name: string; price: number; quantity?: number }>) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'begin_checkout', {
      currency: 'BRL',
      value,
      items: items?.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
    })
  }
}
