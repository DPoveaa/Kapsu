import { Product } from '../types'

export interface ProductSearchResult {
  product: Product
  score: number
}

const MIN_QUERY_LENGTH_FOR_FUZZY = 3
const MIN_RELEVANCE_SCORE = 0.58
const MIN_CATEGORY_INTENT_SCORE = 0.76
const SEARCH_STOP_WORDS = new Set([
  'a',
  'as',
  'com',
  'da',
  'de',
  'do',
  'dos',
  'e',
  'mais',
  'menos',
  'o',
  'os',
  'para',
  'por',
  'quero',
  'uma',
  'um',
])

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  pele: [
    'pele', 'rosto', 'facial', 'skin care', 'skincare', 'cuidado com a pele', 'cuidados com a pele',
    'manchas', 'melasma', 'acne', 'oleosidade', 'poros', 'derme',
  ],
  hidratacao: [
    'hidratacao', 'hidratar', 'hidratante', 'ressecamento', 'pele seca', 'pele ressecada',
    'ressecado', 'umectacao', 'umectar',
  ],
  beleza: [
    'beleza', 'estetica', 'autocuidado', 'cuidado pessoal', 'rotina de beleza', 'glow up',
  ],
  belezapele: [
    'beleza pele', 'pele bonita', 'pele saudavel', 'pele viçosa', 'pele vicosa',
  ],
  'limpeza facial': [
    'limpeza facial', 'limpar pele', 'limpeza de pele', 'sabonete facial', 'gel de limpeza',
    'demaquilante', 'cravos', 'poros dilatados',
  ],
  antioxidante: [
    'antioxidante', 'anti oxidante', 'radicais livres', 'oxidacao', 'estresse oxidativo',
    'protecao celular', 'envelhecimento precoce', 'imunidade', 'sistema imune',
  ],
  'vitamina c': [
    'vitamina c', 'acido ascorbico', 'ascorbico', 'clareador', 'uniformizar pele',
    'viço', 'vico', 'colageno', 'imunidade', 'defesa do organismo',
  ],
  'anti idade': [
    'anti idade', 'anti-idade', 'antidade', 'envelhecimento', 'rugas', 'linhas finas',
    'rejuvenescimento', 'flacidez', 'pele madura',
  ],
  cabelos: [
    'cabelos', 'cabelo', 'fio', 'fios', 'capilar', 'couro cabeludo', 'madeixas',
  ],
  'crescimento capilar': [
    'crescimento capilar', 'crescer cabelo', 'cabelo crescer', 'crescimento do cabelo',
    'crescimento dos fios', 'projeto rapunzel', 'rapunzel',
  ],
  labios: [
    'labios', 'labio', 'lábios', 'boca', 'labial', 'hidratante labial', 'ressecamento labial',
  ],
  corpo: [
    'corpo', 'corporal', 'silhueta', 'medidas', 'barriga', 'celulite',
  ],
  'protecao solar': [
    'protecao solar', 'proteção solar', 'protetor solar', 'fps', 'sol', 'raios uv',
    'uva', 'uvb', 'fotoprotecao',
  ],
  'queda capilar': [
    'queda capilar', 'queda de cabelo', 'cabelo caindo', 'cabelos caindo', 'alopecia',
    'falhas no cabelo', 'calvicie', 'calvície',
  ],
  emagrecimento: [
    'emagrecimento', 'emagrecer', 'emagrece', 'emagrecedor', 'perder peso', 'perda de peso',
    'peso', 'perda gordura', 'perda de gordura', 'queimar gordura', 'gordura corporal',
    'secar', 'secar barriga', 'definicao', 'definição', 'reduzir medidas', 'perder barriga',
    'dieta', 'controle de peso', 'corpo definido', 'definir corpo',
  ],
  drenagem: [
    'drenagem', 'drenar', 'drenante', 'desinchar', 'inchaço', 'inchaco', 'inchada',
    'inchado', 'retencao', 'retenção', 'diuretico', 'diurético',
  ],
  suplementos: [
    'suplementos', 'suplemento', 'suplementacao', 'suplementação', 'nutraceutico',
    'nutracêutico', 'capsulas', 'cápsulas', 'imunidade', 'rotina saudavel',
    'rotina saudável', 'saude diaria', 'saúde diária',
  ],
  vitaminas: [
    'vitaminas', 'vitamina', 'multivitaminico', 'multivitamínico', 'minerais',
    'deficiencia vitaminica', 'deficiência vitamínica', 'imunidade', 'sistema imune',
    'defesa do organismo', 'rotina saudavel', 'rotina saudável',
  ],
  energia: [
    'energia', 'disposicao', 'disposição', 'cansaco', 'cansaço', 'fadiga', 'pique',
    'animacao', 'animação', 'vitalidade', 'mais energia', 'foco', 'concentracao',
    'concentração', 'clareza mental',
  ],
  performance: [
    'performance', 'desempenho', 'rendimento', 'forca', 'força', 'resistencia', 'resistência',
    'pre treino', 'pré treino', 'treino', 'foco no treino', 'energia no treino',
    'foco', 'concentracao', 'concentração', 'corpo definido',
  ],
  'massa muscular': [
    'massa muscular', 'ganhar massa', 'hipertrofia', 'musculos', 'músculos', 'musculacao',
    'musculação', 'ganho de massa', 'massa magra', 'creatina',
  ],
  esporte: [
    'esporte', 'esportes', 'academia', 'atleta', 'corrida', 'crossfit', 'atividade fisica',
    'atividade física', 'exercicio', 'exercício',
  ],
  'retencao de liquido': [
    'retencao de liquido', 'retenção de líquido', 'retencao liquido', 'retenção liquido',
    'liquido retido', 'líquido retido', 'inchaço por liquido', 'inchaco por liquido',
  ],
  recuperacao: [
    'recuperacao', 'recuperação', 'recuperar', 'pos treino', 'pós treino', 'dor muscular',
    'fadiga muscular', 'descanso muscular',
  ],
  fortalecimento: [
    'fortalecimento', 'fortalecer', 'forte', 'unhas fortes', 'cabelo forte',
    'fios fortes', 'resistencia dos fios', 'resistência dos fios',
  ],
  libido: [
    'libido', 'desejo sexual', 'desejo', 'prazer', 'saude sexual', 'saúde sexual',
    'vitalidade sexual',
  ],
  'bem estar': [
    'bem estar', 'bem-estar', 'bemestar', 'qualidade de vida', 'humor', 'equilibrio',
    'equilíbrio', 'saude mental', 'saúde mental', 'rotina saudavel', 'rotina saudável',
    'vida saudavel', 'vida saudável', 'saude diaria', 'saúde diária', 'autocuidado',
  ],
  termogenico: [
    'termogenico', 'termogênico', 'termogenese', 'termogênese', 'queima calorica',
    'queima calórica', 'queimador de gordura', 'acelerar queima',
  ],
  metabolismo: [
    'metabolismo', 'metabolico', 'metabólico', 'acelerar metabolismo',
    'metabolismo lento', 'queima de calorias',
  ],
  relaxamento: [
    'relaxamento', 'relaxar', 'calma', 'calmante', 'ansiedade', 'estresse', 'stress',
    'sono', 'dormir', 'dormir melhor', 'sono melhor', 'insônia', 'insonia',
    'controlar ansiedade', 'menos ansiedade',
  ],
  circulacao: [
    'circulacao', 'circulação', 'circulatorio', 'circulatório', 'varizes', 'pernas cansadas',
    'ma circulacao', 'má circulação',
  ],
  'saude feminina': [
    'saude feminina', 'saúde feminina', 'mulher', 'feminino', 'tpm', 'ciclo menstrual',
    'menstruacao', 'menstruação', 'hormonios', 'hormônios',
  ],
  menopausa: [
    'menopausa', 'climaterio', 'climatério', 'calor menopausa', 'fogachos', 'ondas de calor',
  ],
}

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

function getMeaningfulTokens(value: string): string[] {
  return getTokens(value).filter(token => !SEARCH_STOP_WORDS.has(token))
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

function scoreSearchTermAgainstAlias(query: string, queryTokens: string[], alias: string): number {
  const normalizedAlias = normalizeSearchText(alias)
  if (!normalizedAlias) return 0
  if (query === normalizedAlias) return 1

  let bestScore = 0
  if (query.includes(normalizedAlias) || normalizedAlias.includes(query)) {
    bestScore = Math.min(query.length, normalizedAlias.length) / Math.max(query.length, normalizedAlias.length)
  }

  const aliasTokens = normalizedAlias.split(' ').filter(Boolean)
  if (aliasTokens.length === 0) return bestScore

  const tokenScores = aliasTokens.map(aliasToken => {
    let best = 0
    for (const queryToken of queryTokens) {
      if (queryToken === aliasToken) {
        best = 1
        break
      }
      if (queryToken.includes(aliasToken) || aliasToken.includes(queryToken)) {
        best = Math.max(best, Math.min(queryToken.length, aliasToken.length) / Math.max(queryToken.length, aliasToken.length))
        continue
      }
      if (queryToken.length >= MIN_QUERY_LENGTH_FOR_FUZZY && aliasToken.length >= MIN_QUERY_LENGTH_FOR_FUZZY) {
        best = Math.max(best, similarity(queryToken, aliasToken))
      }
    }
    return best
  })

  return Math.max(bestScore, tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length)
}

function getCategoryIntentScores(query: string, queryTokens: string[]): Map<string, number> {
  const scores = new Map<string, number>()

  for (const [category, aliases] of Object.entries(CATEGORY_SYNONYMS)) {
    const terms = [category, ...aliases]
    const bestScore = Math.max(...terms.map(alias => scoreSearchTermAgainstAlias(query, queryTokens, alias)))

    if (bestScore >= MIN_CATEGORY_INTENT_SCORE) {
      scores.set(category, bestScore)
    }
  }

  return scores
}

function scoreCategoryIntent(product: Product, categoryIntentScores: Map<string, number>): number {
  if (categoryIntentScores.size === 0) return 0

  const productCategory = normalizeSearchText(product.category)
  if (!productCategory) return 0

  let best = 0
  for (const [category, intentScore] of categoryIntentScores.entries()) {
    const normalizedCategory = normalizeSearchText(category)
    if (
      productCategory === normalizedCategory ||
      productCategory.includes(normalizedCategory) ||
      normalizedCategory.includes(productCategory)
    ) {
      best = Math.max(best, intentScore * 0.9)
      continue
    }

    const aliases = CATEGORY_SYNONYMS[category] || []
    for (const alias of aliases) {
      const normalizedAlias = normalizeSearchText(alias)
      if (normalizedAlias && (productCategory.includes(normalizedAlias) || normalizedAlias.includes(productCategory))) {
        best = Math.max(best, intentScore * 0.82)
      }
    }
  }

  return best
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

  const queryTokens = getMeaningfulTokens(query)
  if (queryTokens.length === 0) return 1
  const categoryIntentScores = getCategoryIntentScores(query, queryTokens)

  const nameScore = scoreField(query, queryTokens, product.name, 1)
  const categoryScore = scoreField(query, queryTokens, product.category, 0.74)
  const categoryIntentScore = scoreCategoryIntent(product, categoryIntentScores)
  const descriptionScore = scoreField(query, queryTokens, product.description, 0.58)
  const compositionScore = scoreField(query, queryTokens, product.compositions || '', 0.62)
  const benefitsScore = scoreField(query, queryTokens, product.benefits || '', 0.52)

  return Math.max(nameScore, categoryScore, categoryIntentScore, descriptionScore, compositionScore, benefitsScore)
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
