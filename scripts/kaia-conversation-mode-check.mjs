// Mirrors src/utils/conversationMode.ts for static verification
const MODE_EVENTS = new Set([
  'support_requested', 'human_handoff_created', 'escalated',
  'return_to_ai', 'ai_resumed', 'admin_assigned', 'ai_paused'
])

function resolveConversationMode(events, conversation) {
  const sorted = [...events]
    .filter((e) => MODE_EVENTS.has(e.event_type))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  let mode = 'ai_active'
  for (const ev of sorted) {
    if (['support_requested', 'human_handoff_created', 'escalated'].includes(ev.event_type)) mode = 'awaiting_human'
    else if (ev.event_type === 'admin_assigned') mode = 'human_active'
    else if (['return_to_ai', 'ai_resumed'].includes(ev.event_type)) mode = 'ai_active'
    else if (ev.event_type === 'ai_paused') mode = 'ai_paused'
  }

  if (sorted.length === 0 && conversation) {
    if (conversation.ai_enabled === false) return 'ai_paused'
    if (conversation.status === 'human_assigned') return 'human_active'
    if (conversation.status === 'human_needed' || conversation.status === 'awaiting_human') return 'awaiting_human'
  }
  return mode
}

let passed = 0
let failed = 0
const assert = (condition, message) => condition ? (passed++, console.log('PASS: ' + message)) : (failed++, console.error('FAIL: ' + message))

const cases = [
  {
    name: 'return_to_ai wins over prior escalation',
    events: [
      { event_type: 'escalated', created_at: '2026-01-01T10:00:00Z' },
      { event_type: 'return_to_ai', created_at: '2026-01-02T10:00:00Z' },
    ],
    expected: 'ai_active',
  },
  {
    name: 'new handoff after return_to_ai reopens awaiting_human',
    events: [
      { event_type: 'support_requested', created_at: '2026-01-01T10:00:00Z' },
      { event_type: 'return_to_ai', created_at: '2026-01-02T10:00:00Z' },
      { event_type: 'human_handoff_created', created_at: '2026-01-03T10:00:00Z' },
    ],
    expected: 'awaiting_human',
  },
  {
    name: 'admin assignment after handoff sets human_active',
    events: [
      { event_type: 'support_requested', created_at: '2026-01-01T10:00:00Z' },
      { event_type: 'admin_assigned', created_at: '2026-01-01T10:05:00Z' },
    ],
    expected: 'human_active',
  },
  {
    name: 'ai_resumed after ai_paused sets ai_active',
    events: [
      { event_type: 'ai_paused', created_at: '2026-01-01T10:00:00Z' },
      { event_type: 'ai_resumed', created_at: '2026-01-01T10:05:00Z' },
    ],
    expected: 'ai_active',
  },
  {
    name: 'fallback legacy human_needed maps to awaiting_human',
    events: [],
    conversation: { status: 'human_needed', ai_enabled: true },
    expected: 'awaiting_human',
  },
  {
    name: 'fallback ai_enabled false maps to ai_paused',
    events: [],
    conversation: { status: 'active', ai_enabled: false },
    expected: 'ai_paused',
  },
]

for (const item of cases) {
  const actual = resolveConversationMode(item.events, item.conversation)
  assert(actual === item.expected, item.name + ' -> ' + actual)
}

console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed > 0 ? 1 : 0)
