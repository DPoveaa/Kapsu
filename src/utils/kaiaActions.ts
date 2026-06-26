import { normalizeForDedupe } from './textNormalization'

export type KaiaLayout = 'product_recommendation' | 'product_details' | 'shipping_quote' | string

export type KaiaAction = {
  id?: string
  label?: string
  text?: string
  type?: string
  actionType?: string
  variant?: string
  style?: string
  href?: string
  url?: string
  action?: string
  payload?: Record<string, any>
  [key: string]: any
}

type ActionContext = {
  primaryProductId?: string
  productIds?: string[]
  productAlreadyInCart?: (productId: string) => boolean
}

const actionProductId = (action: KaiaAction): string => {
  const payload = action.payload || {}
  return String(payload.productId || payload.product_id || action.productId || '')
}

const actionType = (action: KaiaAction): string => {
  return String(action.type || action.actionType || action.variant || 'navigate')
}

const canonicalAction = (action: KaiaAction, index: number): KaiaAction => {
  const payload = action.payload && typeof action.payload === 'object' ? action.payload : {}
  const type = actionType(action)
  const productId = actionProductId({ ...action, payload })
  const baseId = action.id || `${type}-${productId || normalizeForDedupe(action.label || action.text || action.href || action.url)}-${index}`

  return {
    ...action,
    id: String(baseId),
    label: String(action.label || action.text || defaultLabel(type)),
    type,
    href: String(action.href || action.url || action.action || payload.path || ''),
    payload,
  }
}

const defaultLabel = (type: string) => {
  switch (type) {
    case 'cart_add':
      return 'Adicionar ao carrinho'
    case 'shipping_quote':
      return 'Simular frete'
    case 'product_view':
      return 'Ver produto'
    case 'cart_open':
      return 'Ir para o carrinho'
    case 'human_support':
      return 'Falar com atendimento'
    case 'return_to_ai':
      return 'Voltar para Kaia'
    default:
      return 'Abrir'
  }
}

const dedupeKey = (action: KaiaAction) => {
  const productId = actionProductId(action)
  const payload = action.payload || {}
  const href = action.href || action.url || action.action || payload.path || ''
  return [
    actionType(action),
    productId,
    normalizeForDedupe(action.label || action.text),
    href,
  ].join('|')
}

export const shouldShowCardButtons = (
  layout: KaiaLayout | undefined,
  _product?: unknown,
  context?: { hasFooterActions?: boolean }
): boolean => {
  if (layout === 'product_details') return !context?.hasFooterActions
  if (layout === 'shipping_quote') return false
  return true
}

export const normalizeActionsForLayout = (
  layout: KaiaLayout | undefined,
  parts: unknown,
  context: ActionContext = {}
): KaiaAction[] => {
  const source = Array.isArray(parts) ? parts : []
  const actions = source.some((item: any) => item?.type === 'actions')
    ? source.flatMap((part: any) => part?.type === 'actions' && Array.isArray(part.actions) ? part.actions : [])
    : source

  const normalized = actions.map(canonicalAction)
  const seen = new Set<string>()
  const unique = normalized.filter((action) => {
    const key = dedupeKey(action)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let filtered = unique

  if (layout === 'product_recommendation') {
    filtered = unique.filter((action) => {
      const type = actionType(action)
      const productId = actionProductId(action)
      if (type === 'product_view') return false
      if (type === 'cart_add') {
        if (productId) {
          if (context.productIds?.includes(productId) && productId !== context.primaryProductId) return false
        }
      }
      return true
    })
  }

  if (layout === 'product_details') {
    filtered = unique.filter((action) => {
      const type = actionType(action)
      return ['cart_add', 'shipping_quote', 'product_view', 'human_support', 'coupon_copy'].includes(type)
    })
  }

  if (layout === 'shipping_quote') {
    filtered = unique.filter((action) => {
      if (actionType(action) !== 'shipping_quote') {
        return true
      } else {
        const label = String(action.label || action.text || '').toLowerCase()
        return label.includes('outro') || label.includes('novamente')
      }
    })
  }

  const priority: Record<string, number> = {
    cart_add: 0,
    shipping_quote: 1,
    cart_open: 2,
    product_view: 3,
    human_support: 4,
    coupon_copy: 5,
  }

  let hasPrimary = false;
  return filtered
    .sort((a, b) => (priority[actionType(a)] ?? 50) - (priority[actionType(b)] ?? 50))
    .slice(0, layout === 'product_details' ? 3 : 2)
    .map((action, index) => {
      const type = actionType(action);
      let style: 'primary' | 'secondary' | 'ghost' | 'danger' = 'secondary';
      if (type === 'cart_add') {
        style = 'primary';
      } else if (type === 'cart_clear') {
        style = 'danger';
      } else if (type === 'product_view') {
        style = 'ghost';
      } else if (action.style === 'primary') {
        style = 'primary';
      } else if (action.style === 'danger') {
        style = 'danger';
      } else if (action.style === 'ghost') {
        style = 'ghost';
      }

      if (style === 'primary') {
        if (hasPrimary) {
          style = 'secondary';
        } else {
          hasPrimary = true;
        }
      }

      return {
        ...action,
        style,
        id: action.id || `${type}-${actionProductId(action) || index}`,
      };
    })
}

export const getActionStateKey = (
  messageId: string | undefined,
  partIndex: number,
  action: KaiaAction,
  actionIndex = 0,
  messageIndex?: number
): string => {
  const productId = actionProductId(action)
  return [
    messageId || 'local-message',
    messageIndex !== undefined ? `msg-${messageIndex}` : 'no-msg-idx',
    `part-${partIndex}`,
    action.id || actionType(action),
    productId || 'no-product',
    `act-${actionIndex}`,
  ].join(':')
}

