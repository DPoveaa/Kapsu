const CURRENCY_FACTOR = 100
const MARKUP_PRECISION = 4

/** Arredonda valor monetário para 2 casas decimais (centavos). */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * CURRENCY_FACTOR) / CURRENCY_FACTOR
}

/** Converte string de input numérico; retorna null se incompleto/inválido. */
export function parseDecimalInput(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '' || trimmed === '.' || trimmed === '-' || trimmed === '+') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/** Calcula preço de venda a partir do custo e markup (%). */
export function calcPriceFromMarkup(cost: number, markupPercent: number): number {
  const costRounded = roundCurrency(cost)
  if (costRounded <= 0) return 0
  return roundCurrency(costRounded * (1 + markupPercent / 100))
}

/** Calcula markup (%) a partir do custo e preço — precisão de 4 casas. */
export function calcMarkupFromPrice(cost: number, price: number): number {
  const costRounded = roundCurrency(cost)
  if (costRounded <= 0) return 0
  const raw = ((roundCurrency(price) - costRounded) / costRounded) * 100
  return Math.round(raw * 10 ** MARKUP_PRECISION) / 10 ** MARKUP_PRECISION
}

/**
 * Encontra o markup (%) que, ao recalcular o preço com arredondamento de centavos,
 * resulta exatamente no preço de venda desejado.
 */
export function findMarkupForTargetPrice(cost: number, targetPrice: number): number {
  const costRounded = roundCurrency(cost)
  const target = roundCurrency(targetPrice)
  if (costRounded <= 0) return 0

  if (calcPriceFromMarkup(costRounded, 0) === target) return 0

  const estimate = ((target / costRounded) - 1) * 100
  const center = Math.round(estimate * 10 ** MARKUP_PRECISION) / 10 ** MARKUP_PRECISION

  // Busca fina ao redor da estimativa (cobre diferenças de arredondamento)
  for (let offset = -2000; offset <= 2000; offset++) {
    const candidate = Math.round((center + offset * 0.0001) * 10 ** MARKUP_PRECISION) / 10 ** MARKUP_PRECISION
    if (calcPriceFromMarkup(costRounded, candidate) === target) {
      return candidate
    }
  }

  // Busca binária como fallback
  let lo = -99.9999
  let hi = 100000
  let best = center

  for (let i = 0; i < 80; i++) {
    const mid = Math.round(((lo + hi) / 2) * 10 ** MARKUP_PRECISION) / 10 ** MARKUP_PRECISION
    const price = calcPriceFromMarkup(costRounded, mid)

    if (price === target) return mid
    if (price < target) lo = mid
    else {
      hi = mid
      best = mid
    }
  }

  return Math.round(best * 10 ** MARKUP_PRECISION) / 10 ** MARKUP_PRECISION
}

/** Formata preço para exibição em input (2 casas). */
export function formatPriceInput(price: number): string {
  return roundCurrency(price).toFixed(2)
}

/** Formata markup para exibição em input (até 4 casas, sem zeros à direita). */
export function formatMarkupInput(markup: number): string {
  const rounded = Math.round(markup * 10 ** MARKUP_PRECISION) / 10 ** MARKUP_PRECISION
  return String(rounded)
}

/** Formata markup para exibição na tabela (2 casas visíveis). */
export function formatMarkupDisplay(markup: number): string {
  return markup.toFixed(2).replace('.', ',')
}
