const API_URL = (process.env.KAIA_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.KAIA_ADMIN_TOKEN || '';

const fail = (message, details) => {
  const error = new Error(message);
  error.details = details;
  throw error;
};

const postJson = async (path, body, headers = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok || data?.success === false) {
    fail(`${path} failed`, { status: response.status, data });
  }
  return data;
};

const getJson = async (path, headers = {}) => {
  const response = await fetch(`${API_URL}${path}`, { headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok || data?.success === false) {
    fail(`${path} failed`, { status: response.status, data });
  }
  return data;
};

const assert = (condition, message, details) => {
  if (!condition) fail(message, details);
};

const partTypes = (parts) => parts.map((part) => part.type).join(',');

const sessionId = `kaia_flow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const productId = 'combo-verao-turbo';

const actionResponse = await postJson('/kaia/v2/actions', {
  sessionId,
  action: {
    type: 'shipping_quote',
    payload: { productId, quantity: 1 },
  },
});

assert(actionResponse.data?.layout === 'text', 'shipping_quote action without CEP should ask for CEP', actionResponse);
assert(partTypes(actionResponse.data.parts || []) === 'text', 'shipping_quote pending response should have one text part', actionResponse);
assert(/cep/i.test(actionResponse.data.parts?.[0]?.text || ''), 'shipping_quote pending response should ask for CEP', actionResponse);
assert(!('diagnostics' in actionResponse.data), 'client action response must not expose diagnostics', actionResponse.data);

const cepResponse = await postJson('/kaia/v2/message', {
  sessionId,
  message: '01310-100',
});

const cepParts = cepResponse.data?.parts || [];
assert(cepResponse.data?.layout === 'shipping_quote', 'CEP after pendingAction should return shipping_quote', cepResponse);
assert(partTypes(cepParts) === 'text,shipping_options,actions', 'shipping_quote parts order is invalid', cepResponse);
assert(Array.isArray(cepParts[1].options) && cepParts[1].options.length > 0, 'shipping_quote must include shipping_options', cepResponse);
assert(cepParts[1].options[0].shippingFee !== undefined || cepParts[1].options[0].price !== undefined, 'shipping option must include price/shippingFee', cepResponse);
assert(cepParts[2].actions?.[0]?.type === 'cart_add', 'shipping_quote primary action must add product to cart', cepResponse);
assert(cepParts[2].actions?.[0]?.payload?.productId === productId, 'cart_add productId must match action payload productId', cepResponse);
assert(!('diagnostics' in cepResponse.data), 'client message response must not expose diagnostics', cepResponse.data);

const historyResponse = await getJson(`/kaia/v2/history?sessionId=${encodeURIComponent(sessionId)}`);
const history = historyResponse.data?.history || [];
assert(history.length >= 3, 'history should include pending prompt, user CEP, and shipping quote', historyResponse);
assert(history.filter((msg) => msg.layout === 'shipping_quote').length === 1, 'history should contain one shipping_quote response', historyResponse);

let adminSummary = null;
if (ADMIN_TOKEN) {
  const adminResponse = await getJson('/admin/kaia/v2/conversations?page=1&limit=20', {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  });
  const payload = adminResponse.data || {};
  assert(Array.isArray(payload.conversations), 'admin conversations must return data.conversations[]', adminResponse);
  assert(payload.pagination && typeof payload.pagination.total === 'number', 'admin conversations must return pagination.total', adminResponse);
  adminSummary = {
    total: payload.pagination.total,
    returned: payload.conversations.length,
    sampleKeys: payload.conversations[0] ? Object.keys(payload.conversations[0]).slice(0, 12) : [],
  };
}

console.log(JSON.stringify({
  ok: true,
  sessionId,
  shipping: {
    actionLayout: actionResponse.data.layout,
    actionParts: partTypes(actionResponse.data.parts),
    quoteLayout: cepResponse.data.layout,
    quoteParts: partTypes(cepParts),
    carrier: cepParts[1].options[0].carrier,
    shippingFee: cepParts[1].options[0].shippingFee ?? cepParts[1].options[0].price,
    primaryAction: cepParts[2].actions[0],
  },
  history: {
    count: history.length,
    layouts: history.map((msg) => msg.layout),
  },
  admin: adminSummary || 'skipped: set KAIA_ADMIN_TOKEN to validate admin route',
}, null, 2));
