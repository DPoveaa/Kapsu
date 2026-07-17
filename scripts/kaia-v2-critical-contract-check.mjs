const API_URL = (process.env.KAIA_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')
const ADMIN_TOKEN = process.env.KAIA_ADMIN_TOKEN || ''

const fail = (message, details) => {
  const error = new Error(message)
  error.details = details
  throw error
}

const postJson = async (path, body, headers = {}) => {
  const response = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok || data?.success === false) {
    fail(path + ' failed', { status: response.status, data })
  }
  return data
}

const getJson = async (path, headers = {}) => {
  const response = await fetch(API_URL + path, { headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok || data?.success === false) {
    fail(path + ' failed', { status: response.status, data })
  }
  return data
}

const assert = (condition, message, details) => {
  if (!condition) fail(message, details)
}

const partsOf = (payload) => payload?.data?.parts || payload?.parts || []
const textOf = (payload) => partsOf(payload)
  .filter((part) => part?.type === 'text')
  .map((part) => part.text || '')
  .join('\n')
const hasPart = (payload, type) => partsOf(payload).some((part) => part?.type === type)
const hasClaimedCartClear = (payload) => /esvaziei|limpei|removi tudo|carrinho vazio|foi esvaziado/.test(normalizeText(textOf(payload) || payload?.data?.message || ''))
const diagnosticsOf = (payload) => payload?.data?.diagnostics || payload?.data?.metadata?.diagnostics || payload?.diagnostics || {}
const cartAfterOf = (payload) => {
  const diagnostics = diagnosticsOf(payload)
  const summary = partsOf(payload).find((part) => part?.type === 'cart_summary')
  return payload?.data?.cartAfter || payload?.cartAfter || diagnostics.cartAfter || summary?.cartAfter || summary?.cart || summary?.data || summary || null
}
const toolsUsedOf = (payload) => {
  const diagnostics = diagnosticsOf(payload)
  return Array.isArray(diagnostics.toolsUsed) ? diagnostics.toolsUsed : Array.isArray(diagnostics.tools_used) ? diagnostics.tools_used : []
}
const pendingActionOf = (diagnostics, key) => diagnostics?.[key] ?? diagnostics?.[key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase())] ?? null
const allClientText = (payload) => JSON.stringify(payload?.data || payload || {})
const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const validateNoEmptyCartContradictions = (payload) => {
  const text = normalizeText(allClientText(payload))
  assert(!/ver carrinho completo \(\+\d+ itens?\)/i.test(text), 'cart_clear must not show old cart overflow CTA', payload)
  assert(!/meta de frete gratis\D*100%/i.test(text), 'cart_clear must not show 100% free shipping progress', payload)
  assert(!/faltam apenas r\$\s*0,00/i.test(text), 'cart_clear must not say R$ 0,00 remaining', payload)
  assert(!hasPart(payload, 'free_shipping_progress'), 'cart_clear empty response must not include free_shipping_progress', payload)
  assert(!partsOf(payload).some((part) => part?.type === 'cart_items' && Array.isArray(part.items) && part.items.length > 0), 'cart_clear must not include cart_items with old products', payload)
  assert(!/ver carrinho/i.test(text), 'cart_clear must not offer primary Ver carrinho CTA', payload)
}

const validateReturnToAi = async () => {
  const sessionId = 'critical_return_ai_' + Date.now() + '_' + Math.random().toString(36).slice(2)

  const handoff = await postJson('/kaia/v2/human-support', {
    sessionId,
    preferredContact: 'site',
    message: 'Quero falar com atendente',
  })
  assert(hasPart(handoff, 'support_handoff'), 'human-support must create support_handoff part before return_to_ai', handoff)

  const returned = await postJson('/kaia/v2/actions', {
    sessionId,
    action: {
      id: 'return-to-ai',
      label: 'Voltar para Kaia',
      type: 'return_to_ai',
      style: 'secondary',
      payload: {},
      actionRequestId: 'critical_return_ai_' + Date.now(),
    },
  })

  assert(returned.data?.clientSafe === true, 'return_to_ai response must be clientSafe', returned)
  assert(returned.data?.assistantMessage?.id, 'return_to_ai must return assistantMessage.id', returned)
  assert(returned.data?.layout === 'text', 'return_to_ai should return text layout', returned)
  assert(/ia retomado|kaia|como posso ajudar/i.test(normalizeText(textOf(returned) || returned.data?.message)), 'return_to_ai response should confirm AI resumed', returned)

  const after = await postJson('/kaia/v2/message', {
    sessionId,
    message: 'oi kaia',
    cartInfo: { itemCount: 0, total: 0, items: [] },
  })

  const afterText = normalizeText(textOf(after) || after.data?.message)
  assert(after.data?.clientSafe === true, 'message after return_to_ai must be clientSafe', after)
  assert(!/aguardando atendente|suporte humano ja foi acionado|atendente deve assumir/i.test(afterText), 'message after return_to_ai must not remain stuck awaiting human', after)

  return {
    sessionId,
    handoffParts: partsOf(handoff).map((part) => part.type),
    returnLayout: returned.data?.layout,
    assistantMessageId: returned.data?.assistantMessage?.id,
    nextLayout: after.data?.layout,
  }
}

const hasFalseClearDenial = (payload) => /nao consigo esvaziar|não consigo esvaziar|assistente virtual.{0,80}esvaziar|remover manualmente|acesse seu carrinho e clique na lixeira/i.test(normalizeText(allClientText(payload)))

const sendCartClearMessage = async (sessionId, message, cartInfo) => postJson('/kaia/v2/message', {
  sessionId,
  message,
  cartInfo,
})

const assertCartClearClientContract = (payload, label) => {
  const text = normalizeText(textOf(payload) || payload?.data?.message || '')
  assert(!hasFalseClearDenial(payload), `${label} must not claim Kaia cannot clear cart`, payload)
  assert(!hasPart(payload, 'free_shipping_progress'), `${label} must not include free_shipping_progress`, payload)
  validateNoEmptyCartContradictions(payload)
  assert(payload.data?.clientSafe === true, `${label} must be clientSafe`, payload)
  assert(!payload.data?.diagnostics, `${label} must not expose diagnostics publicly`, payload)
}

const validateCartClearRouting = async () => {
  const cases = [
    { message: 'Esvazia o meu carrinho pfv', label: 'A esvazia o meu carrinho pfv' },
    { message: 'limpe meu carrinho', label: 'B limpe meu carrinho' },
    { message: 'remove todos os produtos do meu carrinho', label: 'C remove todos os produtos do meu carrinho' },
    { message: 'zera meu carrinho agora', label: 'D zera meu carrinho agora' },
  ]

  const results = {}
  for (const testCase of cases) {
    const sessionId = `critical_cart_clear_route_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const payload = await sendCartClearMessage(sessionId, testCase.message, {
      itemCount: 1,
      total: 49.9,
      items: [{ name: 'Produto roteamento', quantity: 1, price: 49.9 }],
    })
    assertCartClearClientContract(payload, testCase.label)
    const text = normalizeText(textOf(payload) || payload?.data?.message || '')
    const claimedClear = hasClaimedCartClear(payload)
    const alreadyEmpty = /ja esta vazio|já está vazio/.test(text)
    assert(
      payload.data?.layout === 'cart_update' || claimedClear || alreadyEmpty,
      `${testCase.label} must resolve as cart_clear flow (cart_update, success, or already empty)`,
      payload
    )
    results[testCase.label] = {
      sessionId,
      layout: payload.data?.layout,
      parts: partsOf(payload).map((part) => part.type),
      text: textOf(payload) || payload?.data?.message,
    }
  }
  return results
}

const validateCartClearEmpty = async () => {
  const sessionId = 'critical_cart_clear_empty_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  const payload = await sendCartClearMessage(sessionId, 'Esvazia o meu carrinho pfv', {
    itemCount: 0,
    total: 0,
    items: [],
  })

  assertCartClearClientContract(payload, 'F empty cart clear request')
  const text = normalizeText(textOf(payload) || payload?.data?.message || '')
  assert(/ja esta vazio|já está vazio|carrinho vazio|esvaziei/.test(text) || payload.data?.layout === 'cart_update', 'empty cart clear must report empty cart without false success', payload)

  const cartAfter = cartAfterOf(payload)
  if (cartAfter) {
    const itemCount = Number(cartAfter?.itemCount ?? cartAfter?.item_count ?? cartAfter?.count)
    if (Number.isFinite(itemCount)) {
      assert(itemCount === 0, 'empty cart clear cartAfter must remain 0', payload)
    }
  }

  return {
    sessionId,
    layout: payload.data?.layout,
    text: textOf(payload) || payload?.data?.message,
    parts: partsOf(payload).map((part) => part.type),
  }
}

const validateCartClear = async () => {
  const sessionId = 'critical_cart_clear_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  const payload = await sendCartClearMessage(sessionId, 'Limpe meu carrinho atual pfv', {
      itemCount: 6,
      total: 999.99,
      items: [
        { name: 'Produto A', quantity: 2, price: 100 },
        { name: 'Produto B', quantity: 4, price: 199.9975 },
      ],
  })

  assertCartClearClientContract(payload, 'E limpe meu carrinho with items')

  const actionsPart = partsOf(payload).find((part) => part?.type === 'actions')
  if (payload.data?.layout === 'cart_update' || hasClaimedCartClear(payload)) {
    assert(actionsPart, 'confirmed cart_clear should include navigation actions', payload)
    const labels = (actionsPart.actions || []).map((action) => normalizeText(action?.label || ''))
    assert(labels.some((label) => label.includes('ver produtos')), 'cart_clear actions should include Ver produtos', payload)
    assert(!labels.some((label) => label.includes('ver carrinho')), 'cart_clear actions must not include Ver carrinho', payload)
  }

  if (payload.data?.layout === 'cart_update' || hasClaimedCartClear(payload)) {
    assert(payload.data?.layout === 'cart_update', 'cart clear prompt must use cart_update layout when handled as cart mutation', payload)

    const diagnostics = diagnosticsOf(payload)
    const toolsUsed = toolsUsedOf(payload)
    const mutationType = payload.data?.mutationType || diagnostics.mutationType || diagnostics.mutation_type
    const mutationConfirmed = payload.data?.mutationConfirmed ?? diagnostics.mutationConfirmed ?? diagnostics.mutation_confirmed
    const cartAfter = cartAfterOf(payload)
    const itemCount = Number(cartAfter?.itemCount ?? cartAfter?.item_count ?? cartAfter?.count)

    const hasPublicDiagnostics = Object.keys(diagnostics).length > 0 || payload.data?.intent || payload.data?.mutationType || payload.data?.mutationConfirmed;
    if (hasPublicDiagnostics) {
      assert(diagnostics.agent === 'CartAgent' || diagnostics.agent === undefined, 'cart_clear diagnostics must not route to a non-cart agent', payload)
      assert((diagnostics.intent || payload.data?.intent) === 'cart_clear', 'cart clear prompt must be diagnosed as intent cart_clear when diagnostics are exposed', payload)
      assert(toolsUsed.includes('clearCustomerCart'), 'cart_clear must prove clearCustomerCart was executed when diagnostics are exposed', payload)
      assert(mutationType === 'clear', 'cart_clear must report mutationType clear when diagnostics are exposed', payload)
      assert(mutationConfirmed === true, 'cart_clear must report mutationConfirmed true before claiming success when diagnostics are exposed', payload)
    }
    assert(!payload.data?.diagnostics, 'client-safe cart_clear response must not expose diagnostics publicly', payload)
    assert(cartAfter, 'cart_clear must include cartAfter final snapshot in client-safe parts', payload)
    assert(itemCount === 0, 'cart_clear cartAfter must have itemCount 0', payload)

    const summary = partsOf(payload).find((part) => part?.type === 'cart_summary')
    assert(summary, 'cart_update response to cart clear prompt must include cart_summary', payload)
    const summaryItemCount = Number(summary.itemCount ?? summary.item_count ?? summary?.data?.itemCount ?? summary?.data?.item_count)
    assert(summaryItemCount === 0, 'cart clear cart_summary must have itemCount 0', payload)
    validateNoEmptyCartContradictions(payload)
  }

  return {
    sessionId,
    layout: payload.data?.layout,
    claimedClear: hasClaimedCartClear(payload),
    parts: partsOf(payload).map((part) => part.type),
    diagnostics: diagnosticsOf(payload),
    cartAfter: cartAfterOf(payload),
  }
}

const validateFreeShipping = async () => {
  const settings = await getJson('/shipping/settings')
  const threshold = Number(settings.data?.free_shipping_threshold ?? 0)

  const sessionId = 'critical_free_shipping_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  const cartTotal = 114.75
  const expectedRemaining = threshold > 0 ? Math.max(0, Math.round((threshold - cartTotal) * 100) / 100) : null
  const cartInfo = { itemCount: 2, total: cartTotal, items: [{ name: 'Produto teste', quantity: 2, price: 57.375 }] }

  const assertFreeShippingClientContract = (payload, label) => {
    assert(payload.data?.layout === 'free_shipping_info', `${label} must use free_shipping_info layout`, payload)
    assert(payload.data?.layout !== 'promotions', `${label} must not use promotions layout`, payload)
    assert(!hasPart(payload, 'promotion_cards'), `${label} must not include promotion_cards`, payload)
    const text = normalizeText(allClientText(payload))
    assert(!/nao temos uma promocao de frete gratis ativa|nao ha promocao de frete gratis ativa/.test(text) || threshold <= 0, `${label} must not deny active free shipping when threshold is configured`, payload)
    if (threshold > 0) {
      assert(hasPart(payload, 'free_shipping_progress') || /cep/.test(text), `${label} must show progress card or request CEP`, payload)
    }
  }

  const naturalCases = [
    { message: 'Como ganhar frete gratis?', label: 'A como ganhar frete grátis' },
    { message: 'como funciona a promoção de frete gratis?', label: 'B promoção de frete grátis' },
    { message: 'como funciona o frete gratis?', label: 'C como funciona o frete grátis' },
    { message: 'eu vi que tem uma promoção que se comprar um valor X de produto, o carrinho sai com frete gratis', label: 'D compra valor X frete grátis' },
    { message: 'promoção de frete', label: 'G promoção de frete' },
  ]

  const naturalResults = {}
  for (const testCase of naturalCases) {
    const caseSession = `${sessionId}_${Math.random().toString(36).slice(2)}`
    const payload = await postJson('/kaia/v2/message', {
      sessionId: caseSession,
      message: testCase.message,
      cartInfo,
    })
    assertFreeShippingClientContract(payload, testCase.label)
    naturalResults[testCase.label] = {
      layout: payload.data?.layout,
      parts: partsOf(payload).map((part) => part.type),
      text: textOf(payload) || payload.data?.message,
    }
  }

  const promoSession = `critical_product_promo_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const promoPayload = await postJson('/kaia/v2/message', {
    sessionId: promoSession,
    message: 'tem promoções?',
    cartInfo: { itemCount: 0, total: 0, items: [] },
  })
  assert(promoPayload.data?.layout === 'promotions' || hasPart(promoPayload, 'promotion_cards'), 'product promotions question must use promotions flow', promoPayload)
  assert(promoPayload.data?.layout !== 'free_shipping_info', 'tem promoções must not use free_shipping_info layout', promoPayload)

  const first = await postJson('/kaia/v2/message', {
    sessionId,
    message: 'Como ganhar frete gratis?',
    cartInfo,
  })

  assertFreeShippingClientContract(first, 'primary free shipping flow')
  assert(first.data?.layout !== 'shipping_quote', 'free shipping question must not use shipping_quote layout', first)

  const firstText = textOf(first)
  const noActiveRule = /nao temos uma promocao de frete gratis ativa|nao ha regra de frete gratis ativa|sem regra ativa/.test(normalizeText(firstText))
  if (threshold <= 0 || noActiveRule) {
    assert(!hasPart(first, 'shipping_options'), 'no active free shipping rule must not return shipping_options', first)
    assert(!/faltam apenas r\$\s*0,00/i.test(normalizeText(allClientText(first))), 'no active free shipping rule must not report R$ 0,00 remaining', first)
    return { sessionId, initialLayout: first.data?.layout, initialParts: partsOf(first).map((part) => part.type), noActiveRule: true, threshold }
  }

  if (threshold === 200) {
    assert(/85[,.]25/.test(normalizeText(allClientText(first))), 'cart R$ 114,75 with threshold R$ 200 must report R$ 85,25 remaining', first)
  } else if (expectedRemaining !== null) {
    const remainingPattern = new RegExp(String(expectedRemaining).replace('.', '[,.]'))
    assert(remainingPattern.test(normalizeText(allClientText(first))), `cart R$ ${cartTotal} must report R$ ${expectedRemaining} remaining for threshold R$ ${threshold}`, first)
  }

  const firstDiagnostics = diagnosticsOf(first)
  const firstTools = toolsUsedOf(first)
  const firstIntent = firstDiagnostics.intent || first.data?.intent
  const firstHasPublicDiagnostics = Object.keys(firstDiagnostics).length > 0 || first.data?.intent
  if (firstHasPublicDiagnostics) {
    assert(firstDiagnostics.agent === 'FreeShippingAgent', 'active free shipping question must route to FreeShippingAgent when diagnostics are exposed', first)
    assert(firstIntent === 'free_shipping_info', 'active free shipping question must use intent free_shipping_info when diagnostics are exposed', first)
    assert(firstTools.includes('getFreeShippingRules'), 'active free shipping question must call getFreeShippingRules when diagnostics are exposed', first)
    assert(firstTools.includes('getCustomerCart'), 'active free shipping question must call getCustomerCart when diagnostics are exposed', first)
  }
  assert(!first.data?.diagnostics, 'client-safe free shipping response must not expose diagnostics publicly', first)
  assert(hasPart(first, 'free_shipping_progress') || /cep/i.test(firstText), 'free shipping answer must show progress card or request CEP', first)

  const requestedCep = /cep/i.test(firstText)
  if (requestedCep && firstHasPublicDiagnostics) {
    const pendingAfter = pendingActionOf(firstDiagnostics, 'pendingActionAfter') || first.data?.pendingAction
    const pendingType = typeof pendingAfter === 'string' ? pendingAfter : pendingAfter?.type
    assert(pendingType === 'free_shipping_check', 'free shipping answer that requests CEP must create pendingAction free_shipping_check when diagnostics are exposed', first)
  }

  const cep = await postJson('/kaia/v2/message', {
    sessionId,
    message: '02021030',
    cartInfo: { itemCount: 2, total: cartTotal, items: [{ name: 'Produto teste', quantity: 2, price: 57.375 }] },
  })

  assert(cep.data?.layout === 'free_shipping_info', 'CEP after free_shipping_check must resolve as free_shipping_info', cep)
  const cepDiagnostics = diagnosticsOf(cep)
  const cepTools = toolsUsedOf(cep)
  const cepIntent = cepDiagnostics.intent || cep.data?.intent
  const cepHasPublicDiagnostics = Object.keys(cepDiagnostics).length > 0 || cep.data?.intent
  if (cepHasPublicDiagnostics) {
    assert(cepDiagnostics.agent === 'FreeShippingAgent', 'CEP after free_shipping_check must route to FreeShippingAgent when diagnostics are exposed', cep)
    assert(cepIntent === 'free_shipping_check' || cepIntent === 'free_shipping_info', 'CEP after free_shipping_check must keep free shipping intent when diagnostics are exposed', cep)
    assert(cepTools.includes('checkFreeShippingEligibility'), 'CEP after free_shipping_check must call checkFreeShippingEligibility when diagnostics are exposed', cep)
    assert(cepTools.includes('getCustomerCart'), 'CEP after free_shipping_check must call getCustomerCart when diagnostics are exposed', cep)
    assert(cepTools.includes('calculateFreeShippingProgress'), 'CEP after free_shipping_check must call calculateFreeShippingProgress when diagnostics are exposed', cep)
    const pendingBefore = pendingActionOf(cepDiagnostics, 'pendingActionBefore')
    const pendingAfter = pendingActionOf(cepDiagnostics, 'pendingActionAfter')
    assert(pendingBefore === 'free_shipping_check' || pendingBefore?.type === 'free_shipping_check', 'CEP response must report pendingActionBefore free_shipping_check when diagnostics are exposed', cep)
    assert(pendingAfter === null || pendingAfter === undefined, 'CEP response must clear pendingActionAfter when diagnostics are exposed', cep)
  }
  assert(!cep.data?.diagnostics, 'client-safe CEP free shipping response must not expose diagnostics publicly', cep)
  const progress = partsOf(cep).find((part) => part?.type === 'free_shipping_progress')
  assert(progress, 'CEP after free_shipping_check must include free_shipping_progress', cep)
  const progressData = progress.data || progress
  const cartValue = Number(progressData.cartValue ?? progressData.cart_value ?? progressData.currentValue ?? progressData.current_value ?? -1)
  const remainingValue = Number(progressData.remainingValue ?? progressData.remaining_value ?? -1)
  const minOrderValue = Number(progressData.minOrderValue ?? progressData.min_order_value ?? -1)
  assert(minOrderValue === threshold, 'free_shipping_progress minOrderValue must match shipping_settings threshold', cep)
  if (cartValue === 0) {
    assert(remainingValue === threshold, 'empty cart free shipping progress must have remainingValue equal to threshold', cep)
    assert(Number(progressData.percentComplete ?? progressData.percent ?? 0) === 0, 'empty cart must not show 100% progress', cep)
  } else if (expectedRemaining !== null) {
    assert(Math.abs(remainingValue - expectedRemaining) < 0.01, `cart R$ ${cartTotal} progress must report remaining R$ ${expectedRemaining}`, cep)
  }
  assert(!/fallbackagent|reformular|nao consegui processar/i.test(normalizeText(allClientText(cep))), 'CEP after free_shipping_check must not fall back', cep)

  return {
    sessionId,
    threshold,
    expectedRemaining,
    naturalResults,
    productPromotionsLayout: promoPayload.data?.layout,
    productPromotionsParts: partsOf(promoPayload).map((part) => part.type),
    initialLayout: first.data?.layout,
    initialParts: partsOf(first).map((part) => part.type),
    cepLayout: cep.data?.layout,
    cepParts: partsOf(cep).map((part) => part.type),
    progress: progressData,
  }
}

const validateAdminCounts = async () => {
  if (!ADMIN_TOKEN) {
    return { skipped: 'set KAIA_ADMIN_TOKEN to validate admin counts and awaiting_human filter' }
  }

  const headers = { Authorization: 'Bearer ' + ADMIN_TOKEN }
  const counts = await getJson('/admin/kaia/v2/conversations/counts', headers)
  const data = counts.data || {}
  const awaitingHuman = Number(data.awaitingHuman ?? data.awaiting_human ?? 0)
  const total = Number(data.total ?? data.totalConversations ?? data.conversationsTotal ?? 0)

  assert(Number.isFinite(awaitingHuman), 'admin counts must include numeric awaitingHuman/awaiting_human', counts)
  assert(Number.isFinite(total), 'admin counts must include numeric total', counts)
  assert(awaitingHuman >= 0, 'admin awaitingHuman count must be >= 0', counts)

  const filtered = await getJson('/admin/kaia/v2/conversations?status=awaiting_human&page=1&limit=20', headers)
  const payload = filtered.data || {}
  const conversations = Array.isArray(payload.conversations) ? payload.conversations : Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : []
  const pagination = payload.pagination || {}
  const filteredTotal = Number(pagination.total ?? conversations.length)

  assert(Number.isFinite(filteredTotal), 'awaiting_human filtered list must include numeric pagination.total or list length', filtered)
  if (awaitingHuman > 0) {
    assert(filteredTotal > 0 || conversations.length > 0, 'awaitingHuman count > 0 must be discoverable via status=awaiting_human filter', { counts, filtered })
  }

  const badStatus = conversations.find((conv) => {
    const status = conv.status || conv.mode || conv.finalStatus || conv.final_status
    return status && !['awaiting_human', 'human_needed'].includes(status)
  })
  assert(!badStatus, 'status=awaiting_human filter must not return unrelated final statuses', { badStatus, filtered })

  return { awaitingHuman, total, filteredTotal, returned: conversations.length }
}

const results = {}
const failures = []
for (const [name, fn] of Object.entries({ returnToAi: validateReturnToAi, adminCounts: validateAdminCounts, cartClearRouting: validateCartClearRouting, cartClearEmpty: validateCartClearEmpty, cartClear: validateCartClear, freeShipping: validateFreeShipping })) {
  try {
    results[name] = await fn()
  } catch (error) {
    failures.push({ name, message: error.message, details: error.details })
  }
}

if (failures.length > 0) {
  console.error('Kaia v2 critical contract failed:')
  console.error(JSON.stringify({ failures, results }, null, 2))
  process.exit(1)
}

console.log('Kaia v2 critical contract passed.')
console.log(JSON.stringify(results, null, 2))
