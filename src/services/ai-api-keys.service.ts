import { env } from '../config/env';

const API_URL = env.apiUrl;

export interface AiApiKey {
  id: string;
  provider: string;
  model: string | null;
  name: string;
  key_preview: string;
  enabled: boolean;
  priority: number;
  status: string;
  health_status: string;
  cooldown_until: string | null;
  last_used_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_type: string | null;
  last_error_message: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
  total_requests: number;
  total_successes: number;
  total_failures: number;
  rate_limit_count: number;
  daily_quota_count: number;
  invalid_key_count: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
  disabled_reason: string | null;
  is_suspected_dead: boolean;
  is_dead: boolean;
  is_possible_duplicate: boolean;
  duplicate_canonical_id: string | null;
  duplicate_canonical_name: string | null;
  source: 'database';
}

export interface DuplicateKeyErrorPayload {
  code: 'DUPLICATE_KEY';
  message: string;
  canReactivate: boolean;
  existingKey: {
    id: string;
    name?: string;
    key_preview: string;
    enabled: boolean;
    provider: string;
    model: string | null;
  };
}

export class DuplicateApiKeyError extends Error {
  code: 'DUPLICATE_KEY';
  canReactivate: boolean;
  existingKey: DuplicateKeyErrorPayload['existingKey'];

  constructor(payload: DuplicateKeyErrorPayload) {
    super(payload.message);
    this.name = 'DuplicateApiKeyError';
    this.code = payload.code;
    this.canReactivate = payload.canReactivate;
    this.existingKey = payload.existingKey;
  }
}

export interface AiKeyPoolStatus {
  totalKeys: number;
  currentKeyIndex: number;
  failedKeys: number;
  availableKeys: number;
  keySource: 'database' | 'env' | 'mixed' | 'none';
  healthyKeys: number;
  cooldownKeys: number;
  suspectedDeadKeys: number;
  deadKeys: number;
  disabledKeys: number;
  lastSuccessfulKeyIndex: number | null;
  keys: Array<{
    index: number;
    id: string | null;
    name?: string;
    preview: string;
    source: string;
    provider: string;
    model: string | null;
    enabled: boolean;
    healthStatus: string;
    cooldownUntil: string | null;
    lastUsedAt: string | null;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    consecutiveFailures: number;
  }>;
  models?: {
    chat: {
      configuredModel: string;
      available: boolean | null;
      latencyMs: number | null;
      lastSuccessfulTest: string | null;
      lastErrorCategory: string | null;
      provider: 'gemini';
    };
    extraction: {
      configuredModel: string;
      available: boolean | null;
      latencyMs: number | null;
      lastSuccessfulTest: string | null;
      lastErrorCategory: string | null;
      provider: 'gemini';
    };
  };
  lastQuotaOrRateLimitError?: {
    category: string;
    at?: string;
  } | null;
  sdk?: {
    package: string;
    version: string;
  };
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('kapsu_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

class AiApiKeysService {
  private baseUrl = `${API_URL}/admin/ai`;

  async listKeys(): Promise<AiApiKey[]> {
    const res = await fetch(`${this.baseUrl}/keys`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao listar chaves');
    return data.data;
  }

  async getStatus(): Promise<AiKeyPoolStatus> {
    const res = await fetch(`${this.baseUrl}/status`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao obter status');
    return data.data;
  }

  async probeModels(): Promise<{
    chat: {
      configuredModel: string;
      available: boolean;
      latencyMs: number;
      provider: 'gemini';
      errorCategory?: string;
    };
    extraction: {
      configuredModel: string;
      available: boolean;
      latencyMs: number;
      provider: 'gemini';
      errorCategory?: string;
    };
    sdkVersion: string;
  }> {
    const res = await fetch(`${this.baseUrl}/models/health`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao testar modelos');
    return data.data;
  }

  async createKey(payload: {
    provider?: string;
    model?: string;
    name?: string;
    apiKey: string;
    priority?: number;
    testOnCreate?: boolean;
  }) {
    const res = await fetch(`${this.baseUrl}/keys`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 409 && data.code === 'DUPLICATE_KEY') {
        throw new DuplicateApiKeyError({
          code: 'DUPLICATE_KEY',
          message: data.message,
          canReactivate: !!data.canReactivate,
          existingKey: data.existingKey,
        });
      }
      throw new Error(data.message || 'Erro ao criar chave');
    }
    return data.data;
  }

  async updateKey(id: string, payload: { name?: string; model?: string | null; priority?: number }) {
    const res = await fetch(`${this.baseUrl}/keys/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao atualizar chave');
    return data.data;
  }

  async testKey(id: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/test`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao testar chave');
    return data.data;
  }

  async enableKey(id: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/enable`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao ativar chave');
    return data.data;
  }

  async disableKey(id: string, reason?: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/disable`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao desativar chave');
    return data.data;
  }

  async clearCooldown(id: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/clear-cooldown`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao limpar cooldown');
    return data.data;
  }

  async markReviewed(id: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/mark-reviewed`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao marcar como revisada');
    return data.data;
  }

  async markDead(id: string, reason?: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/mark-dead`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao marcar como morta');
    return data.data;
  }

  async deleteKey(id: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao remover chave');
    return data.data;
  }

  async getAuditHistory(id: string) {
    const res = await fetch(`${this.baseUrl}/keys/${id}/audit`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erro ao obter histórico');
    return data.data;
  }
}

export const aiApiKeysService = new AiApiKeysService();
