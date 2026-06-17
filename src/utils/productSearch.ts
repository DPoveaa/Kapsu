import { Product } from '../types'

export interface ProductSearchResult {
  product: Product
  score: number
}

const MIN_QUERY_LENGTH_FOR_FUZZY = 3
const MIN_RELEVANCE_SCORE = 0.58

export function normalizeSearchText(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean)
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length)
  }

  const maxLength = Math.max(a.length, b.length)
  return maxLength === 0 ? 0 : 1 - levenshteinDistance(a, b) / maxLength
}

function scoreField(query: string, queryTokens: string[], field: string, weight: number): number {
  const normalizedField = normalizeSearchText(field)
  if (!normalizedField) return 0
  if (normalizedField === query) return weight
  if (normalizedField.includes(query)) return weight * 0.96

  const fieldTokens = normalizedField.split(' ').filter(Boolean)
  if (fieldTokens.length === 0) return 0

  const tokenScores = queryTokens.map(queryToken => {
    let best = 0
    for (const fieldToken of fieldTokens) {
      if (fieldToken === queryToken) {
        best = 1
        break
      }
      if (fieldToken.includes(queryToken) || queryToken.includes(fieldToken)) {
        best = Math.max(best, Math.min(fieldToken.length, queryToken.length) / Math.max(fieldToken.length, queryToken.length))
        continue
      }
      if (queryToken.length >= MIN_QUERY_LENGTH_FOR_FUZZY && fieldToken.length >= MIN_QUERY_LENGTH_FOR_FUZZY) {
        best = Math.max(best, similarity(queryToken, fieldToken))
      }
    }
    return best
  })

  const averageTokenScore = tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length
  return averageTokenScore * weight
}

export function scoreProductForSearch(product: Product, searchTerm: string): number {
  const query = normalizeSearchText(searchTerm)
  if (!query) return 1

  const queryTokens = getTokens(query)
  if (queryTokens.length === 0) return 1

  const nameScore = scoreField(query, queryTokens, product.name, 1)
  const categoryScore = scoreField(query, queryTokens, product.category, 0.74)
  const descriptionScore = scoreField(query, queryTokens, product.description, 0.58)
  const compositionScore = scoreField(query, queryTokens, product.compositions || '', 0.62)
  const benefitsScore = scoreField(query, queryTokens, product.benefits || '', 0.52)

  return Math.max(nameScore, categoryScore, descriptionScore, compositionScore, benefitsScore)
}

export function searchProducts(products: Product[], searchTerm: string, limit?: number): ProductSearchResult[] {
  const query = normalizeSearchText(searchTerm)
  if (!query) {
    return products.map(product => ({ product, score: 1 })).slice(0, limit)
  }

  const matches = products
    .map(product => ({ product, score: scoreProductForSearch(product, query) }))
    .filter(result => result.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.product.name.localeCompare(b.product.name)
    })

  return typeof limit === 'number' ? matches.slice(0, limit) : matches
}
