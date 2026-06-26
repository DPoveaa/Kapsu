export type ConversationMode = 'ai_active' | 'awaiting_human' | 'human_active' | 'ai_paused';

const MODE_EVENTS = new Set([
  'support_requested',
  'human_handoff_created',
  'escalated',
  'return_to_ai',
  'ai_resumed',
  'admin_assigned',
  'ai_paused'
]);

export interface ConversationModeEvent {
  event_type: string;
  created_at: string | Date;
}

export interface ConversationModeInput {
  status?: string | null;
  ai_enabled?: boolean | null;
}

/**
 * Resolve conversation mode from chronological lifecycle events.
 * Later events override earlier ones so return_to_ai cannot be undone by old escalations.
 */
export function resolveConversationMode(
  events: ConversationModeEvent[],
  conversation?: ConversationModeInput | null
): ConversationMode {
  const sorted = [...events]
    .filter((e) => MODE_EVENTS.has(e.event_type))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let mode: ConversationMode = 'ai_active';

  for (const ev of sorted) {
    switch (ev.event_type) {
      case 'support_requested':
      case 'human_handoff_created':
      case 'escalated':
        mode = 'awaiting_human';
        break;
      case 'admin_assigned':
        mode = 'human_active';
        break;
      case 'return_to_ai':
      case 'ai_resumed':
        mode = 'ai_active';
        break;
      case 'ai_paused':
        mode = 'ai_paused';
        break;
      default:
        break;
    }
  }

  if (sorted.length === 0 && conversation) {
    if (conversation.ai_enabled === false) return 'ai_paused';
    if (conversation.status === 'human_assigned') return 'human_active';
    if (conversation.status === 'human_needed' || conversation.status === 'awaiting_human') {
      return 'awaiting_human';
    }
  }

  return mode;
}

export function mapModeToEscalationStatus(mode: ConversationMode): 'none' | 'human_needed' | 'human_assigned' {
  if (mode === 'awaiting_human') return 'human_needed';
  if (mode === 'human_active') return 'human_assigned';
  return 'none';
}
