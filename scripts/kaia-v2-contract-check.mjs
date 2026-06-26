const API_URL = process.env.KAIA_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api'

const prompts = [
  'Quero algo para ajudar a perder peso',
  'preciso de algo para melhorar a imunidade',
  'tenho queda de cabelo',
]

const forbiddenText = [
  'Buscar Suplementos',
  'Ver Promo',
  'Quero ver os produtos',
  'Quais as promo',
  'imunidade alta',
  'super desinflama',
  'fortalecer sua imunidade',
  'sentir diferença',
  'combater',
  'resultado garantido',
  'tratamento',
  'cura',
]

const isMarkdownList = (text) => /^\s*[-*]\s+/m.test(text) || /^\s*\d+\.\s+/m.test(text)

const textContainsForbiddenLanguage = (text) => {
  const normalized = String(text || '').toLowerCase()
  return forbiddenText.find((term) => normalized.includes(term.toLowerCase()))
}

const allTextFromParts = (parts) => parts
  .filter((part) => part?.type === 'text')
  .map((part) => part.text || '')
  .join('\n')

const validateResponse = (prompt, payload) => {
  const errors = []
  const data = payload?.data
  const parts = data?.parts

  if (data?.layout !== 'product_recommendation') {
    errors.push(`layout esperado product_recommendation, recebido ${data?.layout}`)
  }
  if (!Array.isArray(parts)) {
    errors.push('data.parts deve ser array')
    return errors
  }

  const expectedOrder = ['text', 'product_cards', 'text', 'actions']
  if (parts.length !== 4) errors.push(`parts.length esperado 4, recebido ${parts.length}`)
  expectedOrder.forEach((type, index) => {
    if (parts[index]?.type !== type) errors.push(`parts[${index}].type esperado ${type}, recebido ${parts[index]?.type}`)
  })

  const intro = parts[0]?.text || ''
  const products = Array.isArray(parts[1]?.products) ? parts[1].products : []
  const closing = parts[2]?.text || ''
  const actions = Array.isArray(parts[3]?.actions) ? parts[3].actions : []
  const primaryProduct = products[0]
  const primaryAction = actions[0]

  if (intro.length > 220) errors.push(`parts[0].text deve ter no maximo 220 caracteres, recebeu ${intro.length}`)
  if (isMarkdownList(intro)) errors.push('parts[0].text nao pode conter lista markdown')
  if (products.length < 1 || products.length > 3) errors.push(`parts[1].products deve ter 1 a 3 produtos, recebeu ${products.length}`)
  if (!primaryProduct?.id) errors.push('products[0].id ausente')
  if (!primaryProduct?.name) errors.push('products[0].name ausente')
  if (primaryProduct?.purchase_price || primaryProduct?.purchasePrice) errors.push('products[0] nao deve expor preco de compra')
  if (primaryProduct?.active === false || primaryProduct?.archived === true) errors.push('products[0] nao pode ser inativo/arquivado')
  if (primaryProduct?.name && !closing.includes(primaryProduct.name)) {
    errors.push('parts[2].text deve citar parts[1].products[0].name')
  }
  if (textContainsForbiddenLanguage(allTextFromParts(parts))) {
    errors.push(`texto contem linguagem proibida: ${textContainsForbiddenLanguage(allTextFromParts(parts))}`)
  }

  if (primaryAction?.type !== 'cart_add') errors.push(`actions[0].type esperado cart_add, recebido ${primaryAction?.type}`)
  if (primaryAction?.style !== 'primary') errors.push(`actions[0].style esperado primary, recebido ${primaryAction?.style}`)
  if (primaryAction?.payload?.productId !== primaryProduct?.id) {
    errors.push('actions[0].payload.productId deve ser igual a products[0].id')
  }

  for (const action of actions) {
    const actionTarget = String(action?.action || action?.href || action?.url || '')
    const label = String(action?.label || '')
    if (actionTarget.startsWith('action://send')) errors.push('actions nao podem conter action://send')
    if (label.includes('Buscar Suplementos')) errors.push('actions nao podem conter Buscar Suplementos')
    if (label.includes('Ver Promo')) errors.push('actions nao podem conter Ver Promocoes sem contexto')
  }

  return errors.map((error) => `${prompt}: ${error}`)
}

const callKaia = async (prompt) => {
  const response = await fetch(`${API_URL}/kaia/v2/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt,
      sessionId: `contract_check_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      isAuthenticated: false,
      cartInfo: { itemCount: 0, total: 0, items: [] },
      conversationHistory: [],
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${prompt}: HTTP ${response.status} ${text}`)
  }
  return JSON.parse(text)
}

const failures = []
const samples = []

for (const prompt of prompts) {
  try {
    const payload = await callKaia(prompt)
    samples.push({ prompt, payload: payload?.data })
    failures.push(...validateResponse(prompt, payload))
  } catch (error) {
    failures.push(error.message)
  }
}

if (failures.length > 0) {
  console.error('Kaia v2 product_recommendation contract failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('\nResponse samples:')
  console.error(JSON.stringify(samples, null, 2))
  process.exit(1)
}

console.log('Kaia v2 product_recommendation contract passed.')
console.log(JSON.stringify(samples, null, 2))
