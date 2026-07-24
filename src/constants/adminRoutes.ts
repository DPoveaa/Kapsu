export const ADMIN_AI_CENTER_PATH = '/admin/central-ia'

export const ADMIN_AI_CENTER_LEGACY_ROUTES = [
  { path: '/admin/ai-keys', target: `${ADMIN_AI_CENTER_PATH}?tab=keys` },
  { path: '/admin/kaia', target: ADMIN_AI_CENTER_PATH },
  { path: '/admin/ia', target: ADMIN_AI_CENTER_PATH },
  { path: '/admin/central-da-ia', target: ADMIN_AI_CENTER_PATH },
] as const
