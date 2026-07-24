import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveConversationMode } from '../utils/conversationMode';
import { aiApiKeysService, AiApiKey, DuplicateApiKeyError } from '../services/ai-api-keys.service';
import AdminModal from '../components/AdminModal';
import { siteSettingsService } from '../services/site-settings.service';
import {
  Bot, Search, Filter, RefreshCw, MessageSquare, AlertTriangle,
  CheckCircle, Clock, ChevronDown, ChevronLeft, ChevronRight, Download, Upload, Archive,
  ShoppingCart, Tag, Truck, Package, Send, X,
  Activity, Zap, Shield, Code2, TrendingUp, ChevronUp,
  Check, AlertCircle, Loader2,
  Phone, Mail, Hash, Calendar,
  Headphones, Pause, Play, Trash2,
  CircleDot, Layers, EyeOff, KeyRound, RotateCcw, Plus, Copy, MoreVertical,
  UserX, UserCheck, Brain, Sparkles, HelpCircle
} from 'lucide-react';
import { generateProductUrl } from '../utils/productUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== TIPOS ====================
interface Conversation {
  id: string;
  session_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  channel: string;
  created_at: string;
  last_message_at: string;
  message_count: number;
  last_message: { content: string; sender_type: string; created_at: string } | null;
  has_human_support: boolean;
  has_error: boolean;
  has_action: boolean;
  has_recommendation: boolean;
  has_promo: boolean;
  has_order_query: boolean;
  ai_enabled: boolean;
  events?: Array<{ event_type: string; created_at: string | Date }>;
  is_archived?: boolean;
  is_ignored?: boolean;
  is_deleted?: boolean;
  archived_at?: string | null;
  deleted_at?: string | null;
  hidden_from_customer_at?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'admin';
  content: string;
  metadata: MessageMetadata | null;
  diagnostics?: any | null;
  timestamp: number;
}

interface MessageMetadata {
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
  riskLevel?: string;
  action?: { actionType: string; actionData?: any };
  actionResult?: { type: string; status: string; details?: any[]; message?: string };
  recommendedProducts?: any[];
  cartProducts?: any[];
  couponCards?: any[];
  cart_source?: string;
  cart_product_count?: number;
  cart_total?: number;
  sent_mini_cards?: boolean;
  actionButtons?: any[];
  routes_used?: string[];
  services_used?: string[];
  context_sources?: string[];
  security_checks?: {
    isAuthenticated: boolean;
    rateLimit: string;
    lengthCheck: string;
    promptInjection: string;
    sanitization: string;
  };
  processing_time_ms?: number;
  ai_provider?: string;
  ai_model?: string;
  ai_key_index?: number;
  ai_key_masked?: string;
  ai_key_rotation?: {
    rotated?: boolean;
    reason?: string;
    cooldownMs?: number;
    cooldownUntil?: string;
    attemptedKeyIndexes?: number[];
    selectedKeyIndex?: number;
    availableKeys?: number;
    cooldownKeys?: number;
    fallbackUsed?: boolean;
    errorType?: string;
  };
  fallback_used?: boolean;
  error_summary?: string;
  response_type?: string;
  responseLayout?: string;
  parts?: any[];
  parts_count?: number;
  parts_order?: string[];
  split_converted?: boolean;
}

interface Metrics {
  totalConversations: number;
  todayConversations: number;
  humanConversations: number;
  errorConversations: number;
  topIntents: { intent: string; count: number }[];
  topProducts: { product: string; count: number }[];
  topCoupons: { coupon: string; count: number }[];
  topActions: { action: string; count: number }[];
  avgResponseTime: number;
  fallbackRate: number;
  escalationRate: number;
  securityBlocksCount: number;
  topConsumers?: any[];
  topAgents?: { agent: string; count: number }[];
  awaitingHuman?: number;
}

// ==================== HELPERS ====================
const getStatusInfo = (status: string) => {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    active: { label: 'Ativo', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CircleDot },
    resolved: { label: 'Resolvido', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: CheckCircle },
    human_needed: { label: 'Atendimento Pendente', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertCircle },
    human_assigned: { label: 'Com Atendente', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Headphones },
    escalated: { label: 'Escalado', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: TrendingUp },
    closed: { label: 'Encerrado', color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: X },
  };
  return map[status] || { label: status, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', icon: CircleDot };
};

const getIntentBadge = (intent: string) => {
  const colors: Record<string, string> = {
    adicionar_ao_carrinho: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    remover_produto: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    cupom_desconto: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    promocao: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    pergunta_produto: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    atendimento_humano: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    finalizar_compra: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    pedir_recomendacao: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    outro: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    duvida_generica: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };
  return colors[intent] || 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300';
};

const timeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatLastInteraction = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();

  const isSameDay = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Ontem';

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const maskEmail = (email: string) => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone: string) => {
  if (!phone) return '';
  return phone.replace(/(\d{2})\d+(\d{2})/, '$1*****$2');
};

const safeArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const safeObject = <T extends Record<string, any>>(value: unknown): T => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as T : {} as T
);
const safeString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeBoolean = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback;

const normalizeActions = (actions: unknown): any[] => safeArray<any>(actions).map((action, index) => {
  const payload = safeObject<Record<string, any>>(action?.payload);
  return {
    id: safeString(action?.id, `action-${index}`),
    label: safeString(action?.label || action?.text, 'Ação'),
    type: safeString(action?.type || action?.actionType || action?.variant, 'navigate'),
    href: safeString(action?.href || action?.url || action?.action || payload.path, ''),
    payload,
    ...safeObject<Record<string, any>>(action),
  };
});

const normalizeProducts = (products: unknown): any[] => safeArray<any>(products).map(product => {
  const raw = safeObject<Record<string, any>>(product);
  const id = safeString(raw.id || raw.productId || raw.product_id);
  const slug = safeString(raw.slug);
  return {
    ...raw,
    id,
    name: safeString(raw.name || raw.title, 'Produto'),
    price: safeNumber(raw.price || raw.originalPrice || raw.original_price || raw.promoPrice || raw.promo_price, 0),
    promoPrice: raw.promoPrice ?? raw.promo_price ?? null,
    originalPrice: raw.originalPrice ?? raw.original_price ?? raw.price,
    url: safeString(raw.url || raw.href || (id ? generateProductUrl({ id, slug: raw.slug || slug || null }) : '')),
  };
});

const normalizeParts = (parts: unknown): any[] => safeArray<any>(parts).map(part => {
  const normalized = safeObject<Record<string, any>>(part);
  const type = safeString(normalized.type, 'text');

  if (type === 'actions') {
    return { ...normalized, type, actions: normalizeActions(normalized.actions) };
  }

  if (type === 'product_cards' || type === 'promotion_cards') {
    return { ...normalized, type, products: normalizeProducts(normalized.products || normalized.promotions || normalized.items).slice(0, 3) };
  }

  if (type === 'cart_items') {
    return { ...normalized, type, items: safeArray(normalized.items || normalized.products) };
  }

  return {
    ...normalized,
    type,
    text: safeString(normalized.text || normalized.content),
    role: safeString(normalized.role, 'assistant'),
  };
});

const normalizeDiagnostics = (diagnostics: unknown): any | null => {
  if (!diagnostics) return null;
  const diag = safeObject<Record<string, any>>(diagnostics);
  const retrieval = safeObject<Record<string, any>>(diag.retrieval);
  const sales = safeObject<Record<string, any>>(diag.sales);

  return {
    ...diag,
    engine: safeString(diag.engine, 'kaia_v2'),
    responseContract: safeString(diag.responseContract, 'parts_v2'),
    legacyFallbackUsed: safeBoolean(diag.legacyFallbackUsed, false),
    toolsUsed: safeArray<string>(diag.toolsUsed || diag.tools_used || diag.routesUsed || diag.routes_used),
    warnings: safeArray<string>(diag.warnings),
    retrieval: Object.keys(retrieval).length > 0 ? {
      ...retrieval,
      semanticResults: safeNumber(retrieval.semanticResults ?? retrieval.semantic_results, 0),
      graphResults: safeNumber(retrieval.graphResults ?? retrieval.graph_results, 0),
      finalProducts: safeNumber(retrieval.finalProducts ?? retrieval.final_products, 0),
    } : null,
    sales: Object.keys(sales).length > 0 ? {
      ...sales,
      recommendedProducts: normalizeProducts(sales.recommendedProducts || sales.recommended_products),
      couponSuggested: safeBoolean(sales.couponSuggested ?? sales.coupon_suggested, false),
      freeShippingSuggestion: safeBoolean(sales.freeShippingSuggestion ?? sales.free_shipping_suggestion, false),
    } : null,
  };
};

const normalizeMessageMetadata = (metadata: unknown): MessageMetadata | null => {
  if (!metadata) return null;
  const meta = safeObject<Record<string, any>>(metadata);
  return {
    ...meta,
    entities: safeObject(meta.entities),
    recommendedProducts: normalizeProducts(meta.recommendedProducts || meta.recommended_products),
    cartProducts: safeArray(meta.cartProducts || meta.cart_products),
    couponCards: safeArray(meta.couponCards || meta.coupon_cards),
    actionButtons: normalizeActions(meta.actionButtons || meta.action_buttons || meta.actions),
    routes_used: safeArray<string>(meta.routes_used || meta.routesUsed),
    services_used: safeArray<string>(meta.services_used || meta.servicesUsed),
    context_sources: safeArray<string>(meta.context_sources || meta.contextSources),
    parts: normalizeParts(meta.parts),
    parts_count: safeNumber(meta.parts_count ?? meta.partsCount ?? safeArray(meta.parts).length, 0),
    parts_order: safeArray<string>(meta.parts_order || meta.partsOrder),
  };
};

const normalizeMessage = (message: unknown): Message => {
  const msg = safeObject<Record<string, any>>(message);
  const metadata = normalizeMessageMetadata(msg.metadata);
  const rootParts = normalizeParts(msg.parts);
  const diagnostics = normalizeDiagnostics(msg.diagnostics || msg.debug || msg.adminDiagnostics);

  return {
    id: safeString(msg.id, `msg-${safeNumber(msg.timestamp, Date.now())}`),
    role: ['user', 'assistant', 'system', 'admin'].includes(msg.role) ? msg.role : 'assistant',
    content: safeString(msg.content || msg.message || msg.text),
    metadata: rootParts.length > 0
      ? {
        ...(metadata || {}),
        responseLayout: safeString(msg.layout || metadata?.responseLayout, 'text'),
        parts: rootParts,
        parts_count: rootParts.length,
        parts_order: rootParts.map(part => part.type),
      }
      : metadata,
    diagnostics,
    timestamp: safeNumber(msg.timestamp || msg.created_at || msg.createdAt, Date.now()),
  };
};

const normalizeConversation = (conversation: unknown): Conversation => {
  const conv = safeObject<Record<string, any>>(conversation);
  const lastMessage = conv.last_message || conv.lastMessage;
  const events = safeArray<any>(conv.events || conv.conversationEvents || conv.lifecycle_events || conv.lifecycleEvents)
    .map(event => ({
      event_type: safeString(event.event_type || event.type || event.name),
      created_at: event.created_at || event.createdAt || new Date().toISOString(),
    }))
    .filter(event => event.event_type);
  const resolvedMode = resolveConversationMode(events, {
    status: safeString(conv.status),
    ai_enabled: conv.ai_enabled ?? conv.aiEnabled,
  });
  const archivedAt = conv.archived_at ?? conv.archivedAt ?? null;
  const deletedAt = conv.deleted_at ?? conv.deletedAt ?? null;
  const hiddenFromCustomerAt = conv.hidden_from_customer_at ?? conv.hiddenFromCustomerAt ?? null;

  return {
    id: safeString(conv.id || conv.conversation_id || conv.session_id, `conv-${Date.now()}`),
    session_id: safeString(conv.session_id || conv.sessionId || conv.id),
    customer_id: conv.customer_id ?? conv.customerId ?? null,
    customer_name: conv.customer_name ?? conv.customerName ?? null,
    customer_email: conv.customer_email ?? conv.customerEmail ?? null,
    customer_phone: conv.customer_phone ?? conv.customerPhone ?? null,
    name: conv.name ?? null,
    email: conv.email ?? null,
    phone: conv.phone ?? null,
    status: deletedAt ? 'deleted' : archivedAt ? 'archived' : resolvedMode,
    channel: safeString(conv.channel, 'site'),
    created_at: safeString(conv.created_at || conv.createdAt, new Date().toISOString()),
    last_message_at: safeString(conv.last_message_at || conv.lastMessageAt || conv.updated_at, new Date().toISOString()),
    message_count: safeNumber(conv.message_count ?? conv.messageCount ?? safeArray(conv.messages || conv.items).length, 0),
    last_message: lastMessage ? {
      content: safeString(lastMessage.content || lastMessage.message || lastMessage.text),
      sender_type: safeString(lastMessage.sender_type || lastMessage.senderType || lastMessage.role, 'user'),
      created_at: safeString(lastMessage.created_at || lastMessage.createdAt, new Date().toISOString()),
    } : null,
    has_human_support: safeBoolean(conv.has_human_support ?? conv.hasHumanSupport, false),
    has_error: safeBoolean(conv.has_error ?? conv.hasError, false),
    has_action: safeBoolean(conv.has_action ?? conv.hasAction, false),
    has_recommendation: safeBoolean(conv.has_recommendation ?? conv.hasRecommendation, false),
    has_promo: safeBoolean(conv.has_promo ?? conv.hasPromo, false),
    has_order_query: safeBoolean(conv.has_order_query ?? conv.hasOrderQuery, false),
    ai_enabled: safeBoolean(conv.ai_enabled ?? conv.aiEnabled, true),
    events,
    is_archived: Boolean(archivedAt || conv.is_archived || conv.isArchived),
    is_ignored: safeBoolean(conv.is_ignored ?? conv.isIgnored, false),
    is_deleted: Boolean(deletedAt || conv.is_deleted || conv.isDeleted),
    archived_at: archivedAt,
    deleted_at: deletedAt,
    hidden_from_customer_at: hiddenFromCustomerAt,
  };
};

const normalizeMetrics = (metrics: unknown): Metrics => {
  const m = safeObject<Record<string, any>>(metrics);
  return {
    totalConversations: safeNumber(m.totalConversations ?? m.total ?? m.conversationsTotal, 0),
    todayConversations: safeNumber(m.todayConversations ?? m.today ?? m.conversationsToday, 0),
    humanConversations: safeNumber(m.humanConversations ?? m.human ?? m.humanSupport, 0),
    errorConversations: safeNumber(m.errorConversations ?? m.errors ?? m.errorCount, 0),
    topIntents: safeArray(m.topIntents),
    topProducts: safeArray(m.topProducts),
    topCoupons: safeArray(m.topCoupons),
    topActions: safeArray(m.topActions),
    avgResponseTime: safeNumber(m.avgResponseTime ?? m.averageResponseTimeMs, 0),
    fallbackRate: safeNumber(m.fallbackRate, 0),
    escalationRate: safeNumber(m.escalationRate, 0),
    securityBlocksCount: safeNumber(m.securityBlocksCount ?? m.blocked, 0),
    topConsumers: safeArray(m.topConsumers),
    topAgents: safeArray(m.topAgents),
    awaitingHuman: safeNumber(m.awaitingHuman ?? m.awaiting_human, 0),
  };
};



// ==================== PAINEL TÉCNICO (Debug) ====================
const TechnicalPanel = ({ metadata, diagnostics }: { metadata: MessageMetadata | null; diagnostics: any | null }) => {
  const [expanded, setExpanded] = useState(false);

  if (!metadata && !diagnostics) return null;

  const safeMetadata = normalizeMessageMetadata(metadata);
  const safeDiagnostics = normalizeDiagnostics(diagnostics);

  // Se for Kaia v2, a maior parte das informações está em diagnostics
  const agent = safeDiagnostics?.agent || safeMetadata?.ai_provider;
  const intent = safeDiagnostics?.intent || safeMetadata?.intent;
  const confidence = safeDiagnostics?.confidence ?? safeMetadata?.confidence;
  const riskLevel = safeDiagnostics?.riskLevel || safeMetadata?.riskLevel;
  const conversionStage = safeDiagnostics?.conversionStage;
  const salesOpportunity = safeDiagnostics?.salesOpportunity;
  const toolsUsed = safeArray<string>(safeDiagnostics?.toolsUsed || safeMetadata?.routes_used);
  const model = safeDiagnostics?.model || safeMetadata?.ai_model;
  const processingTimeMs = safeDiagnostics?.processingTimeMs || safeMetadata?.processing_time_ms;
  const retrieval = safeDiagnostics?.retrieval;
  const sales = safeDiagnostics?.sales;
  const warnings = safeArray<string>(safeDiagnostics?.warnings);
  const productsFromParts = normalizeProducts(safeArray<any>(safeMetadata?.parts).flatMap((part: any) =>
    part?.type === 'product_cards' || part?.type === 'promotion_cards'
      ? (part.products || part.items || part.promotions || [])
      : []
  ));
  const diagnosticsProducts = normalizeProducts(sales?.recommendedProducts);
  const recommendedProducts = diagnosticsProducts.some((product: any) => product.id && product.name !== 'Produto' && product.price > 0)
    ? diagnosticsProducts
    : productsFromParts;
  const engine = safeDiagnostics?.engine;
  const responseContract = safeDiagnostics?.responseContract;
  const legacyFallbackUsed = safeDiagnostics?.legacyFallbackUsed;

  const hasAnyData = agent || intent || riskLevel || toolsUsed.length > 0 || model || processingTimeMs;

  if (!hasAnyData) return null;

  return (
    <div className="mt-2 rounded-xl border border-primary-200 dark:border-primary-800/50 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors text-xs font-semibold text-primary-600 dark:text-primary-400"
      >
        <Code2 size={12} />
        Diagnóstico Técnico (Kaia v2)
        {expanded ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
        {salesOpportunity && (
          <span className="ml-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
            Oportunidade
          </span>
        )}
      </button>

      {expanded && (
        <div className="p-3 bg-white dark:bg-gray-900/40 space-y-3 text-xs">
          {/* Agente e Roteamento */}
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
              <Bot size={11} className="text-primary-500" /> Roteamento de Agente
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent && (
                <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
                  Agente: {agent}
                </span>
              )}
              {intent && (
                <span className={`px-2 py-0.5 rounded-full font-medium ${getIntentBadge(intent)}`}>
                  Intenção: {intent}
                </span>
              )}
              {confidence !== undefined && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono text-[10px]">
                  conf: {(confidence * 100).toFixed(0)}%
                </span>
              )}
              {conversionStage && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                  Etapa: {conversionStage}
                </span>
              )}
            </div>
          </div>

          {/* Ferramentas Seguras (Tools) */}
          {toolsUsed.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Layers size={11} className="text-blue-500" /> Ferramentas Utilizadas
              </p>
              <div className="flex flex-wrap gap-1">
                {toolsUsed.map((tool: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded font-mono text-[10px] flex items-center gap-1">
                    <Zap size={9} /> {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* RAG & Relações de Grafo */}
          {retrieval && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Search size={11} className="text-teal-500" /> Recuperação de Dados (Retrieval RAG)
              </p>
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg text-[10px] font-mono">
                <div>
                  <span className="text-gray-400 block">Busca Semântica:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{retrieval.semanticResults ?? 0} produtos</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Relações Grafo:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{retrieval.graphResults ?? 0} nodes</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Ranqueados:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{retrieval.finalProducts ?? 0} produtos</span>
                </div>
              </div>
            </div>
          )}

          {/* Estratégia Comercial */}
          {sales && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <ShoppingCart size={11} className="text-emerald-500" /> Ações Comerciais
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${recommendedProducts.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  Recomendou: {recommendedProducts.length} prod
                </span>
                {sales.couponSuggested && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium text-[10px]">
                    Sugeriu Cupom 🏷️
                  </span>
                )}
                {sales.freeShippingSuggestion && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium text-[10px]">
                    Alerta Frete Grátis 🚚
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Segurança & Desempenho */}
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
              <Shield size={11} className="text-red-500" /> Segurança & Telemetria
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {engine && (
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full font-mono">
                  Engine: {engine}
                </span>
              )}
              {responseContract && (
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-mono">
                  Contrato: {responseContract}
                </span>
              )}
              {legacyFallbackUsed !== undefined && (
                <span className={`px-2 py-0.5 rounded-full font-semibold ${legacyFallbackUsed ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                  Fallback Legada: {legacyFallbackUsed ? 'Sim' : 'Não'}
                </span>
              )}
              {model && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-mono">
                  Modelo: {model}
                </span>
              )}
              {processingTimeMs !== undefined && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-mono">
                  Tempo: {processingTimeMs}ms
                </span>
              )}
              {riskLevel && (
                <span className={`px-2 py-0.5 rounded-full font-semibold ${riskLevel === 'high' || riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
                    riskLevel === 'medium' || riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                  }`}>
                  Risco: {riskLevel}
                </span>
              )}
            </div>
          </div>

          {/* Avisos/Alertas */}
          {warnings.length > 0 && (
            <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">Avisos de Execução:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Visor JSON Completo */}
          <div className="pt-2.5 border-t border-primary-100 dark:border-primary-900/20">
            <DiagnosticJsonViewer data={safeDiagnostics ? { ...safeDiagnostics, sales: safeDiagnostics.sales ? { ...safeDiagnostics.sales, recommendedProducts } : safeDiagnostics.sales } : safeMetadata} />
          </div>
        </div>
      )}
    </div>
  );
};

const DiagnosticJsonViewer = ({ data }: { data: any }) => {
  const [showJson, setShowJson] = useState(false);
  return (
    <div>
      <button
        onClick={() => setShowJson(!showJson)}
        className="text-[10px] text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold underline cursor-pointer"
      >
        {showJson ? 'Ocultar JSON de Diagnóstico' : 'Ver JSON de Diagnóstico Completo'}
      </button>
      {showJson && (
        <pre className="mt-2 p-2.5 bg-gray-900 text-emerald-400 rounded-lg overflow-x-auto text-[10px] font-mono whitespace-pre-wrap max-h-60 leading-relaxed border border-gray-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

// ==================== MENSAGEM DO CHAT ====================
const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  const isAdmin = message.role === 'admin';
  const isSystem = message.role === 'system';
  const metadata = normalizeMessageMetadata(message.metadata);
  const recommendedProducts = normalizeProducts(metadata?.recommendedProducts);
  const couponCards = safeArray<any>(metadata?.couponCards);
  const actionButtons = normalizeActions(metadata?.actionButtons); const rawParts = normalizeParts(metadata?.parts);
  const copyGeneration = message.diagnostics?.copyGeneration || (metadata as any)?.copyGeneration;
  const copyDiagnostics = copyGeneration?.diagnostics || copyGeneration;
  const textPartIndexes = rawParts.reduce((acc: number[], part: any, idx: number) => {
    if (part.type === 'text') acc.push(idx);
    return acc;
  }, []);
  const parts = copyGeneration?.intro && copyGeneration?.closing && copyDiagnostics?.copyGeneratedBy === 'llm' && copyDiagnostics?.copyValidation === 'passed'
    ? rawParts.map((part: any, idx: number) => {
      if (part.type !== 'text') return part;
      if (idx === textPartIndexes[0]) return { ...part, text: copyGeneration.intro };
      if (idx === textPartIndexes[1]) return { ...part, text: copyGeneration.closing };
      return part;
    })
    : rawParts;
  const hasStructuredParts = !isUser && parts.length > 0;
  const formatCurrency = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(value, 0));
  const bubbleClass = isUser
    ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
    : isAdmin
      ? 'bg-blue-600 text-white rounded-tr-sm'
      : isSystem
        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 rounded-sm text-xs'
        : 'bg-primary-600 text-white rounded-tr-sm';

  const align = isUser ? 'justify-start' : 'justify-end';

  return (
    <div className={`flex ${align} mb-3 group`}>
      <div className={`max-w-[80%] ${isUser ? 'items-start' : 'items-end'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className={`text-[11px] font-semibold ${isUser ? 'text-gray-500 dark:text-gray-400' :
              isAdmin ? 'text-blue-500 dark:text-blue-400' :
                isSystem ? 'text-amber-600 dark:text-amber-400' :
                  'text-primary-500 dark:text-primary-400'
            }`}>
            {isUser ? 'Cliente' : isAdmin ? 'Admin' : isSystem ? 'Sistema' : 'Kaia'}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-600">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleClass}`}>
          {!hasStructuredParts && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

          {hasStructuredParts && (
            <div className="flex flex-col gap-2">
              {parts.map((part: any, partIndex: number) => {
                if (part.type === 'text') {
                  return <p key={partIndex} className="whitespace-pre-wrap break-words">{part.text}</p>;
                }
                if (part.type === 'product_cards') {
                  const products = normalizeProducts(part.products || part.items);
                  return (
                    <div key={partIndex} className="flex flex-col gap-1.5">
                      {products.map((product: any) => (
                        <div key={product.id || product.name} className="rounded-lg border border-white/20 bg-white/10 p-2 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold"><Package size={11} />{product.name}</div>
                          <div className="mt-0.5 opacity-80">{formatCurrency(product.price)}{product.category ? ` · ${product.category}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  );
                }
                if (part.type === 'shipping_options') {
                  const options = safeArray<any>(part.options);
                  return (
                    <div key={partIndex} className="flex flex-col gap-1.5">
                      {options.map((option: any, optionIndex: number) => (
                        <div key={optionIndex} className="rounded-lg border border-white/20 bg-white/10 p-2 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold"><Truck size={11} />{safeString(option.name || option.carrier, 'Entrega')}</div>
                          <div className="mt-0.5 opacity-80">{formatCurrency(option.shippingFee ?? option.price)} · {safeString(option.deadline || (option.deliveryTime ? `${option.deliveryTime} dias` : ''), 'Prazo a consultar')}</div>
                          {option.carrier && option.name && <div className="mt-0.5 opacity-70">{option.carrier}</div>}
                        </div>
                      ))}
                    </div>
                  );
                }
                if (part.type === 'actions') {
                  const actions = normalizeActions(part.actions);
                  return (
                    <div key={partIndex} className="flex flex-wrap gap-1.5">
                      {actions.map((action: any, actionIndex: number) => (
                        <span key={action.id || actionIndex} className="text-xs px-2.5 py-1 rounded-full border border-white/30 bg-white/10 font-medium">
                          {action.label} <span className="opacity-70 font-mono">{action.type}</span>
                        </span>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={partIndex} className="rounded-lg border border-white/20 bg-white/10 p-2 text-xs font-mono break-all">
                    {part.type}
                  </div>
                );
              })}
            </div>
          )}
          {/* Produtos Recomendados */}
          {!hasStructuredParts && recommendedProducts.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-xs opacity-70 font-semibold">📦 Produtos recomendados:</p>
              {recommendedProducts.slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs opacity-90">
                  <Package size={10} />
                  <span>{p.name}</span>
                  {p.price && <span className="font-mono opacity-70">R$ {p.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Cupons de Desconto */}
          {!hasStructuredParts && couponCards.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-xs opacity-70 font-semibold">Cupons ativos:</p>
              {couponCards.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs opacity-90 bg-white/10 p-1.5 rounded border border-white/20">
                  <Tag size={10} />
                  <span className="font-bold font-mono">{c.code}</span>
                  <span className="opacity-80">({c.name} - {c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${c.discountValue}`} OFF)</span>
                </div>
              ))}
            </div>
          )}

          {/* Botões de Ação */}
          {!hasStructuredParts && (() => {
            let btns = actionButtons;
            const hasCoupons = couponCards.length > 0;
            const hasProducts = recommendedProducts.length > 0;
            const responseType = metadata?.response_type || metadata?.responseLayout;

            if (hasCoupons || responseType === 'coupon_cards') {
              btns = btns.filter((btn: any) => {
                const url = btn.url || '';
                if (url.startsWith('action://copy-coupon') || url === '/carrinho' || url === '/checkout') {
                  return false;
                }
                if (url === '/produtos' && !btn.globalAction) {
                  return false;
                }
                return true;
              });
            }
            if (hasProducts || responseType === 'product_cards') {
              btns = btns.filter((btn: any) => {
                const url = btn.url || '';
                if (url === '/produtos' && hasProducts) {
                  return false;
                }
                return true;
              });
            }

            if (btns.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {btns.map((btn: any, i: number) => (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${btn.type === 'primary'
                      ? 'border-white/50 bg-white/20 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                    {btn.label}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Painel Técnico */}
        {(message.metadata || message.diagnostics) && (
          <div className="w-full">
            <TechnicalPanel metadata={message.metadata} diagnostics={message.diagnostics} />
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== TOAST SIMPLES ====================
const Toast = ({ toasts }: { toasts: { id: number; msg: string; type: 'success' | 'error' }[] }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 ${t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
        {t.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
        {t.msg}
      </div>
    ))}
  </div>
);

const CONFIGURED_AGENTS = [
  {
    id: 'ProductRecommendationAgent',
    name: 'Recomendação de Produtos',
    description: 'Gera sugestões de suplementos, vitaminas e cosméticos com base na queixa/objetivo do cliente.',
    intents: ['product_recommendation', 'product_search'],
    tools: ['searchProducts', 'getProductById'],
    systemPrompt: 'Você é o especialista comercial da Kapsu para recomendação de suplementos, vitaminas e cosméticos. Analise a necessidade do cliente e sugira as melhores opções do catálogo, explicando como elas ajudam nos seus objetivos de saúde e estética de forma ética e segura.'
  },
  {
    id: 'ProductDetailsAgent',
    name: 'Ficha Técnica de Produtos',
    description: 'Explica a composição, modo de uso, contraindicações e benefícios de um produto específico.',
    intents: ['product_details'],
    tools: ['getProductById'],
    systemPrompt: 'Você é o enciclopedista técnico de produtos da Kapsu. Explique de forma clara a ficha técnica, ingredientes ativos, contraindicações e modo de uso de cada suplemento ou cosmético. Mantenha um tom profissional e científico, porém acessível ao consumidor final.'
  },
  {
    id: 'ProductComparisonAgent',
    name: 'Comparação de Produtos',
    description: 'Compara múltiplos produtos do catálogo (benefícios, composição, foco principal).',
    intents: ['product_comparison'],
    tools: ['searchProducts', 'getProductById'],
    systemPrompt: 'Você analisa comparativos de produtos. Seu foco é confrontar composições, benefícios práticos e preços para ajudar o cliente a entender a diferença entre opções parecidas e decidir qual melhor atende sua rotina.'
  },
  {
    id: 'CartAgent',
    name: 'Gerenciador do Carrinho',
    description: 'Gerencia inclusão, exclusão, alteração de quantidade e limpeza de itens no carrinho.',
    intents: ['cart_query', 'cart_clear', 'cart_add', 'cart_remove'],
    tools: ['getCustomerCart', 'addToCustomerCart', 'removeFromCustomerCart', 'clearCustomerCart'],
    systemPrompt: 'Você gerencia o carrinho de compras do cliente no chat. Informe o que está atualmente adicionado, calcule o subtotal e auxilie na adição ou remoção rápida de itens conforme solicitado pelo usuário.'
  },
  {
    id: 'FreeShippingAgent',
    name: 'Regras de Frete Grátis',
    description: 'Informa sobre metas de frete grátis e sugere produtos de valor complementar.',
    intents: ['free_shipping_info'],
    tools: ['getCustomerCart', 'simulateShipping'],
    systemPrompt: 'Você orienta o cliente sobre a meta de frete grátis. Informe quanto falta para atingir o frete grátis e sugira produtos de valor menor ou complementar para completar a compra e usufruir do benefício.'
  },
  {
    id: 'ShippingAgent',
    name: 'Cálculo de Frete',
    description: 'Simula prazos e custos de frete (Correios/Sedex) para o CEP do cliente.',
    intents: ['shipping_quote'],
    tools: ['simulateShipping'],
    systemPrompt: 'Você é o consultor de logística. Simule valores e prazos de frete a partir do CEP informado e das dimensões dos produtos. Sempre explique as opções de entrega de forma clara e amigável.'
  },
  {
    id: 'CouponsAgent',
    name: 'Consulta de Cupons',
    description: 'Busca e apresenta cupons promocionais ativos e aplicabilidade de descontos.',
    intents: ['coupons_query'],
    tools: ['getPublicCoupons'],
    systemPrompt: 'Você apresenta os cupons de desconto ativos. Divulgue apenas cupons válidos vindos da base de dados e explique as regras de uso. Nunca invente cupons fictícios.'
  },
  {
    id: 'PromotionsAgent',
    name: 'Promoções e Ofertas',
    description: 'Apresenta produtos em oferta no catálogo e os percentuais de desconto.',
    intents: ['promotions_query'],
    tools: ['getActivePromotions'],
    systemPrompt: 'Você apresenta as ofertas e produtos em promoção no catálogo. Destaque os maiores descontos percentuais e incentive a compra dos itens com preço reduzido.'
  },
  {
    id: 'DiscountsAgent',
    name: 'Resumo de Descontos',
    description: 'Agrupa cupons e ofertas vigentes em um único resumo dinâmico.',
    intents: ['discounts_query'],
    tools: ['getPublicCoupons', 'getActivePromotions'],
    systemPrompt: 'Você atua como um consolidador de ofertas. Resuma em uma única resposta os cupons disponíveis e os produtos com maiores descontos, facilitando a visualização rápida de oportunidades de economia.'
  },
  {
    id: 'OrdersAgent',
    name: 'Status de Pedidos',
    description: 'Verifica o status de entrega, detalhes e justificativas de cancelamento de pedidos.',
    intents: ['order_status'],
    tools: ['getOrdersByCustomer', 'getOrderByIdForCustomer'],
    systemPrompt: 'Você localiza e explica o status dos pedidos do cliente. Detalhe se o pedido está pendente de pagamento, confirmado, faturado, enviado ou cancelado, apresentando explicações claras sobre o passo atual da logística.'
  },
  {
    id: 'AccountSupportAgent',
    name: 'Suporte de Conta',
    description: 'Auxilia na recuperação de senha e orienta sobre alteração segura de dados cadastrais.',
    intents: ['account_password', 'account_email_change', 'account_cpf_change', 'account_profile'],
    tools: ['getAccountSupportRoutes'],
    systemPrompt: 'Você ajuda o cliente com dúvidas sobre a conta pessoal. Indique os caminhos de alteração de senha e explique com foco em segurança por que alterações críticas (como e-mail ou CPF) requerem validação adicional por atendente humano.'
  },
  {
    id: 'HumanSupportAgent',
    name: 'Transição Humana',
    description: 'Registra a solicitação e realiza a transição segura da conversa para atendentes humanos.',
    intents: ['human_support_request'],
    tools: ['getSupportSettings', 'requestHumanSupport'],
    systemPrompt: 'Você realiza a transição para suporte humano. Explique tranquilamente que um atendente irá assumir o chat em breve e garanta que o histórico do chat foi repassado para agilizar o atendimento.'
  },
  {
    id: 'HealthClarificationAgent',
    name: 'Esclarecimento de Sintomas',
    description: 'Trata termos ambíguos de saúde de forma segura antes de sugerir produtos.',
    intents: ['clarification_needed'],
    tools: [],
    systemPrompt: 'Você faz esclarecimentos éticos de saúde. Quando o usuário mencionar dores ou sintomas graves, explique de forma empática que a Kaia não prescreve tratamentos médicos. Ajude-o a refinar sua queixa para encontrar bem-estar geral ou direcione para suporte.'
  },
  {
    id: 'ObjectionHandlingAgent',
    name: 'Tratamento de Objeções',
    description: 'Responde de forma comercial e persuasiva sobre segurança, eficácia, preços e fretes.',
    intents: ['objection_price', 'objection_trust', 'objection_shipping', 'objection_result'],
    tools: [],
    systemPrompt: 'Você lida com objeções comerciais de forma altamente persuasiva, empática e qualificada. Apresente os pilares de segurança dos produtos da Kapsu, as avaliações de satisfação, a facilidade de devolução ou simulação de frete grátis, convertendo dúvidas em vendas.'
  },
  {
    id: 'SalesAgent',
    name: 'Orientação de Vendas',
    description: 'Auxilia o cliente com dúvidas sobre o processo de compra ou meios de pagamento.',
    intents: ['sales_question'],
    tools: [],
    systemPrompt: 'Você é o assistente de fechamento comercial. Tire dúvidas gerais sobre o checkout, formas de pagamento aceitas (PIX, cartões de crédito em até 12x, boleto) e como funciona o recebimento das notas fiscais e códigos de rastreamento.'
  },
  {
    id: 'CheckoutAgent',
    name: 'Ajuda no Checkout',
    description: 'Fornece orientações passo a passo para finalização do pagamento na tela de fechamento.',
    intents: ['checkout_help'],
    tools: [],
    systemPrompt: 'Você orienta o usuário no fluxo final do checkout. Explique detalhadamente cada etapa da tela de finalização de compras para evitar o abandono de carrinho e sanar dificuldades de digitação de dados bancários.'
  },
  {
    id: 'FallbackAgent',
    name: 'Respostas Gerais & Chit-chat',
    description: 'Lida com mensagens fora de contexto, saudações gerais e conversas informais.',
    intents: ['unknown'],
    tools: [],
    systemPrompt: 'Você lida com conversas gerais (chit-chat, saudações gerais, perguntas informais sobre inteligência artificial). Responda com simpatia e carisma, e sugira alternativas comerciais para guiar o cliente de volta à jornada de compras.'
  }
];

// ==================== COMPONENTE PRINCIPAL ====================

const parseApiKeysInput = (value: string) => value
  .split(/[\s,;]+/)
  .map((key) => key.trim())
  .filter(Boolean);
export default function KaiaChats() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'chats';
  const [activeTab, setActiveTab] = useState<'chats' | 'performance' | 'agents' | 'keys' | 'learning'>(
    ['chats', 'performance', 'agents', 'keys', 'learning'].includes(initialTab) ? (initialTab as any) : 'chats'
  );

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // --- Estados de Gestão de Chaves de API ---
  const [keys, setKeys] = useState<AiApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyFormData, setKeyFormData] = useState({
    name: '',
    provider: 'gemini',
    model: '',
    apiKey: '',
    priority: 0,
    testOnCreate: true
  });
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    message: string;
    existingKey: { id: string; name?: string; enabled: boolean };
    canReactivate: boolean;
  } | null>(null);
  const [auditKey, setAuditKey] = useState<AiApiKey | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [keyFilters, setKeyFilters] = useState({
    search: '',
    provider: 'all',
    healthStatus: 'all',
    enabled: 'all',
    sortBy: 'priority'
  });

  // --- Estados de Gaveta de Detalhes dos Agentes ---
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<any | null>(null);

  // --- Estados de Aprendizado e Memória da Kaia ---
  const [learningImprovements, setLearningImprovements] = useState<any[]>([]);
  const [learningMemories, setLearningMemories] = useState<any[]>([]);
  const [learningTests, setLearningTests] = useState<any[]>([]);
  const [learningTabSubSection, setLearningTabSubSection] = useState<'improvements' | 'memories' | 'tests'>('improvements');
  const [memoryFilterStatus, setMemoryFilterStatus] = useState<string>('pending_admin_approval');
  const [improvementFilterStatus, setImprovementFilterStatus] = useState<string>('pending');
  const [loadingLearning, setLoadingLearning] = useState(false);
  const [testRunResults, setTestRunResults] = useState<any | null>(null);
  const [runningTestsState, setRunningTestsState] = useState(false);
  const [selectedChatContext, setSelectedChatContext] = useState<any | null>(null);
  const [loadingChatContext, setLoadingChatContext] = useState(false);
  const [learningQueueDiagnostics, setLearningQueueDiagnostics] = useState<any | null>(null);
  const [isLongTermMemoryEnabled, setIsLongTermMemoryEnabled] = useState<boolean>(true);
  const [showLearningGuideModal, setShowLearningGuideModal] = useState<boolean>(false);

  // Helper: Formata tipo de desvio/status técnico em português elegante
  const formatIssueType = (type: string) => {
    if (!type) return 'Melhoria Identificada';
    const normalized = String(type).toLowerCase().trim();
    const mapping: Record<string, string> = {
      product_not_resolved: 'Produto Não Identificado',
      fallback_used_despite_actionable_intent: 'Fallback Acionado sem Necessidade',
      duplicate_response: 'Resposta Duplicada',
      selected_agent_correctness: 'Seleção de Agente Incorreta',
      required_tool_correctness: 'Execução de Ferramenta Pendente',
      mutation_confirmation: 'Confirmação de Ação Incompleta',
      response_grounding: 'Fidelidade de Conteúdo & Regras',
      product_relevance: 'Relevância de Produtos',
      conversation_context_usage: 'Uso de Contexto da Conversa',
      intent_misalignment: 'Desvio de Intenção do Cliente',
      wrong_intent: 'Intenção Incorreta',
      unclear_response: 'Resposta Ambígua ou Incompleta',
      unsupported_claim: 'Alegação não Suportada',
      add_product_alias: 'Apelido de Produto (Alias)',
      technical_fallback: 'Fallback Técnico de IA',
      tone_mismatch: 'Ajuste de Tom / Marca',
      checkout_response_too_long: 'Resposta Longa no Checkout',
      low_confidence: 'Baixa Confiança da IA',
      cart_add_failure: 'Falha ao Adicionar ao Carrinho',
      unknown_product: 'Produto Desconhecido',
    };
    if (mapping[normalized]) {
      return mapping[normalized];
    }
    return normalized
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper: Tooltip explicativo para cada tipo de problema detectado
  const getIssueTypeTooltip = (type: string): string => {
    if (!type) return '';
    const normalized = String(type).toLowerCase().trim();
    const tooltips: Record<string, string> = {
      product_not_resolved:
        'A Kaia não conseguiu identificar o produto mencionado pelo cliente no catálogo.',
      fallback_used_despite_actionable_intent:
        'A Kaia usou uma resposta genérica mesmo quando havia uma intenção clara que ela podia atender.',
      duplicate_response:
        'A Kaia enviou a mesma mensagem ou conteúdo repetido dentro de uma conversa.',
      selected_agent_correctness:
        'O agente escolhido para responder não era o mais adequado para a intenção do cliente.',
      required_tool_correctness:
        'Uma ferramenta necessária (ex: busca de produto, consulta de pedido) não foi executada.',
      mutation_confirmation:
        'Uma ação que altera dados (ex: adicionar ao carrinho) foi feita sem confirmar com o cliente.',
      response_grounding:
        'A resposta continha informações incorretas ou que contradizem as regras e contexto da loja.',
      product_relevance:
        'Os produtos sugeridos não eram relevantes para o que o cliente estava buscando.',
      conversation_context_usage:
        'A Kaia ignorou informações já mencionadas pelo cliente na conversa (ex: preferências, produtos citados).',
      intent_misalignment:
        'A intenção interpretada pela Kaia diverge do que o cliente realmente queria.',
      wrong_intent:
        'A Kaia classificou a intenção do cliente de forma incorreta.',
      unclear_response:
        'A resposta enviada era vaga, incompleta ou difícil de entender.',
      unsupported_claim:
        'A Kaia afirmou algo sem base no catálogo, regras ou contexto disponível.',
      add_product_alias:
        'Um apelido ou nome alternativo para um produto deve ser cadastrado para melhorar o reconhecimento.',
      technical_fallback:
        'Ocorreu um erro técnico interno e a Kaia usou uma resposta padrão de segurança.',
      tone_mismatch:
        'O tom ou linguagem usado não estava alinhado com a identidade e voz da marca.',
      checkout_response_too_long:
        'A resposta foi longa demais para o contexto de finalização de compra.',
      low_confidence:
        'A Kaia estava com baixa confiança na resposta e pode ter gerado uma resposta inadequada.',
      cart_add_failure:
        'Houve uma falha ao tentar adicionar um item ao carrinho do cliente.',
      unknown_product:
        'O produto mencionado não existe ou não foi encontrado no catálogo da loja.',
    };
    return tooltips[normalized] ?? 'Tipo de problema detectado pelo sistema de aprendizado da Kaia.';
  };

  // Helper: Formata apelido detectado amigável
  const formatDetectedAlias = (alias: string) => {
    if (!alias) return '—';
    const systemAliasMapping: Record<string, string> = {
      verificacao_nome_marca_e_gramatica: 'Verificação da Marca & Gramática',
      direcionamento_comercial_suplementos: 'Direcionamento Comercial de Suplementos',
      rejeicao_compra_cnpj_revenda: 'Compra para Revenda / CNPJ',
      condicao_pagamento_preferencial: 'Condição de Pagamento Preferencial',
    };
    if (systemAliasMapping[alias]) {
      return systemAliasMapping[alias];
    }
    if (alias.includes('_')) {
      return alias.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return alias;
  };
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void> | void;
    loading?: boolean;
  } | null>(null);

  // Carregar configuração inicial de memória de longo prazo
  useEffect(() => {
    siteSettingsService.getSettings().then(settings => {
      if (settings) {
        setIsLongTermMemoryEnabled(settings.kaia_long_term_memory_enabled !== false);
      }
    }).catch(console.error);
  }, []);

  const handleToggleLongTermMemory = () => {
    const nextState = !isLongTermMemoryEnabled;
    setConfirmModalConfig({
      isOpen: true,
      title: nextState ? 'Ativar Memória Long-Term' : 'Desativar Memória Long-Term',
      message: nextState
        ? 'Deseja ativar o recurso de Memória de Longo Prazo da Kaia? Quando ativado, a Kaia extrairá preferências comerciais dos clientes e utilizará as memórias aprovadas para personalizar futuros atendimentos.'
        : 'Deseja desativar a Memória de Longo Prazo da Kaia? Quando desativada, a Kaia não extrairá nem utilizará memórias de preferências em novos atendimentos.',
      confirmLabel: nextState ? 'Ativar Memória' : 'Desativar Memória',
      cancelLabel: 'Cancelar',
      variant: nextState ? 'primary' : 'warning',
      onConfirm: async () => {
        try {
          await siteSettingsService.updateSettings({
            kaia_long_term_memory_enabled: nextState
          });
          setIsLongTermMemoryEnabled(nextState);
          await fetchLearningData(false);
        } catch (e) {
          console.error('Erro ao atualizar configuração de memória:', e);
        }
      }
    });
  };

  // --- Bulk Selection & Import/Export State ---
  const [selectedImprovementIds, setSelectedImprovementIds] = useState<string[]>([]);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [isExportingRules, setIsExportingRules] = useState(false);
  const [isImportingRules, setIsImportingRules] = useState(false);

  const handleExportPackage = async () => {
    setIsExportingRules(true);
    try {
      const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao exportar regras');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaia-regras-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Pacote de regras exportado com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao exportar pacote de regras', 'error');
    } finally {
      setIsExportingRules(false);
    }
  };

  const handleImportPackage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImportingRules(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(json)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Regras importadas com sucesso!', 'success');
        fetchLearningData(false);
      } else {
        showToast(data.message || 'Erro ao importar arquivo de regras', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Arquivo JSON inválido ou corrompido', 'error');
    } finally {
      setIsImportingRules(false);
      event.target.value = '';
    }
  };

  const handleBulkDeleteImprovements = () => {
    if (selectedImprovementIds.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Melhorias Selecionadas',
      message: `Tem certeza de que deseja excluir definitivamente ${selectedImprovementIds.length} melhorias da fila? Esta ação não pode ser desfeita.`,
      confirmLabel: `Excluir ${selectedImprovementIds.length} itens`,
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
        try {
          const res = await fetch(`${API_URL}/admin/kaia/v2/learning/improvements/bulk-delete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: selectedImprovementIds })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`${data.deletedCount} melhorias excluídas!`, 'success');
            setSelectedImprovementIds([]);
            fetchLearningData(false);
          } else {
            showToast(data.message || 'Erro na exclusão em massa', 'error');
          }
        } catch (e: any) {
          showToast('Erro ao excluir melhorias selecionadas', 'error');
        }
      }
    });
  };

  const handleBulkArchiveImprovements = async () => {
    if (selectedImprovementIds.length === 0) return;
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/improvements/bulk-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedImprovementIds, status: 'archived' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`${data.updatedCount} melhorias arquivadas!`, 'success');
        setSelectedImprovementIds([]);
        fetchLearningData(false);
      } else {
        showToast(data.message || 'Erro ao arquivar itens', 'error');
      }
    } catch (e: any) {
      showToast('Erro ao arquivar itens selecionados', 'error');
    }
  };

  const handleBulkDeleteMemories = () => {
    if (selectedMemoryIds.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Memórias Selecionadas',
      message: `Tem certeza de que deseja excluir definitivamente ${selectedMemoryIds.length} memórias de clientes? Esta ação removerá os registros do banco.`,
      confirmLabel: `Excluir ${selectedMemoryIds.length} memórias`,
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
        try {
          const res = await fetch(`${API_URL}/admin/kaia/v2/learning/memories/bulk-delete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: selectedMemoryIds })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`${data.deletedCount} memórias excluídas!`, 'success');
            setSelectedMemoryIds([]);
            fetchLearningData(false);
          } else {
            showToast(data.message || 'Erro na exclusão em massa de memórias', 'error');
          }
        } catch (e: any) {
          showToast('Erro ao excluir memórias selecionadas', 'error');
        }
      }
    });
  };

  // --- Alias Review State (per-candidate) ---
  const [aliasReviewState, setAliasReviewState] = useState<Record<string, {
    editedAlias: string;
    selectedProductId: string;
    selectedProductName: string;
    rejectReason: string;
    showRejectReason: boolean;
    productSearchQuery: string;
    productSearchResults: any[];
    productSearchLoading: boolean;
    approving: boolean;
    rejecting: boolean;
  }>>({});

  const initAliasState = (item: any) => {
    setAliasReviewState(prev => {
      if (prev[item.id]) return prev;
      return {
        ...prev,
        [item.id]: {
          editedAlias: item.detected_alias || item.proposed_alias || '',
          selectedProductId: item.suggested_product_id || '',
          selectedProductName: item.suggested_product_name || '',
          rejectReason: '',
          showRejectReason: false,
          productSearchQuery: '',
          productSearchResults: [],
          productSearchLoading: false,
          approving: false,
          rejecting: false
        }
      };
    });
  };

  const updateAliasState = (id: string, patch: Partial<Record<string, any>>) => {
    setAliasReviewState(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          editedAlias: '',
          selectedProductId: '',
          selectedProductName: '',
          rejectReason: '',
          showRejectReason: false,
          productSearchQuery: '',
          productSearchResults: [],
          productSearchLoading: false,
          approving: false,
          rejecting: false
        }),
        ...patch
      } as any
    }));
  };

  const searchAliasProducts = async (id: string, query: string) => {
    updateAliasState(id, { productSearchQuery: query, productSearchLoading: true });
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const res = await fetch(`${API_URL}/admin/kaia/v2/products/search?q=${encodeURIComponent(query)}`, { headers });
      const json = await res.json();
      updateAliasState(id, {
        productSearchResults: Array.isArray(json.data) ? json.data : [],
        productSearchLoading: false
      });
    } catch (error) {
      updateAliasState(id, { productSearchResults: [], productSearchLoading: false });
    }
  };

  const handleRejectWithReason = async (id: string) => {
    const state = aliasReviewState[id];
    updateAliasState(id, { rejecting: true });
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/improvements/${id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: state?.rejectReason || null })
      });
      if (!res.ok) throw new Error('Falha ao rejeitar apelido');
      await fetchLearningData(false);
    } finally {
      updateAliasState(id, { rejecting: false });
    }
  };

  const handleApproveAlias = async (id: string) => {
    const state = aliasReviewState[id];
    if (!state?.editedAlias?.trim() || !state?.selectedProductId) return;
    updateAliasState(id, { approving: true });
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/improvements/${id}/approve-alias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ alias: state.editedAlias, targetProductId: state.selectedProductId })
      });
      if (!res.ok) throw new Error('Falha ao aprovar apelido');
      await fetchLearningData(false);
    } finally {
      updateAliasState(id, { approving: false });
    }
  };

  const fetchLearningData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingLearning(true);
    try {
      const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };

      const [impRes, memRes, testRes, diagRes] = await Promise.all([
        fetch(`${API_URL}/admin/kaia/v2/learning/improvements?status=${improvementFilterStatus}`, { headers }),
        fetch(`${API_URL}/admin/kaia/v2/learning/memories?status=${memoryFilterStatus}`, { headers }),
        fetch(`${API_URL}/admin/kaia/v2/learning/tests`, { headers }),
        fetch(`${API_URL}/admin/kaia/v2/learning/queue/diagnostics`, { headers })
      ]);

      if (impRes.ok) {
        const json = await impRes.json();
        setLearningImprovements(json.data || []);
      }
      if (memRes.ok) {
        const json = await memRes.json();
        setLearningMemories(json.data || []);
      }
      if (testRes.ok) {
        const json = await testRes.json();
        setLearningTests(json.data || []);
      }
      if (diagRes.ok) {
        const json = await diagRes.json();
        setLearningQueueDiagnostics(json.data || null);
        if (json.data?.memoryFeatureEnabled !== undefined) {
          setIsLongTermMemoryEnabled(json.data.memoryFeatureEnabled);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar dados do aprendizado:', e);
    } finally {
      if (isInitial) setLoadingLearning(false);
    }
  }, [memoryFilterStatus, improvementFilterStatus]);

  const handleReviewImprovement = async (id: string, status: 'applied' | 'rejected' | 'archived') => {
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/improvements/${id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Melhoria ${status === 'applied' ? 'aprovada' : status === 'rejected' ? 'rejeitada' : 'arquivada'} com sucesso!`, 'success');
        fetchLearningData(false);
      } else {
        showToast(data.message || data.error || 'Erro ao processar melhoria', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Erro ao processar melhoria', 'error');
    }
  };

  const handleReviewMemory = async (id: string, status: 'approved' | 'rejected' | 'archived') => {
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/memories/${id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Memória ${status === 'approved' ? 'aprovada' : status === 'rejected' ? 'rejeitada' : 'arquivada'} com sucesso!`, 'success');
        fetchLearningData(false);
      } else {
        showToast(data.message || data.error || 'Erro ao processar memória', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Erro ao processar memória', 'error');
    }
  };

  const handleDeleteMemory = (id: string, memoryValue?: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Memória do Cliente',
      message: `Tem certeza de que deseja excluir definitivamente a preferência "${memoryValue || 'selecionada'}"? Esta ação removerá a memória do banco de dados e a Kaia não a utilizará mais em atendimentos.`,
      confirmLabel: 'Confirmar Exclusão',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
        const res = await fetch(`${API_URL}/admin/kaia/v2/learning/memories/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          await fetchLearningData(false);
        }
      }
    });
  };

  const handleRunRegressionTests = async () => {
    setRunningTestsState(true);
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/tests/run`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const json = await res.json();
        setTestRunResults(json.results);
        fetchLearningData(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTestsState(false);
    }
  };

  const fetchConversationContext = useCallback(async (convId: string) => {
    setLoadingChatContext(true);
    const token = localStorage.getItem('kapsu_token') || localStorage.getItem('token') || '';
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/admin/kaia/v2/learning/context/${convId}`, { headers });
      if (res.ok) {
        const json = await res.json();
        console.log('[KaiaChats] Context loaded for conv', convId, ':', json.data);
        setSelectedChatContext(json.data || null);
      } else {
        console.error('[KaiaChats] Failed to load context. Status:', res.status, 'for conv:', convId);
        setSelectedChatContext(null);
      }
    } catch (e) {
      console.error('[KaiaChats] Exception loading context:', e);
      setSelectedChatContext(null);
    } finally {
      setLoadingChatContext(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'learning') {
      fetchLearningData(true);
      const interval = setInterval(() => {
        fetchLearningData(false);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchLearningData]);

  useEffect(() => {
    if (selectedConv?.id) {
      fetchConversationContext(selectedConv.id);
    } else {
      setSelectedChatContext(null);
    }
  }, [selectedConv?.id, fetchConversationContext]);

  // --- Agrupamento de Conversas por Usuário ---
  const [selectedUserGroupKey, setSelectedUserGroupKey] = useState<string | null>(null);
  const [userMenuOpenKey, setUserMenuOpenKey] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [ignoredProfiles, setIgnoredProfiles] = useState<any[]>([]);

  const fetchIgnoredProfiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/kaia/v2/ignored-profiles`, { headers });
      const data = await res.json();
      if (data.success) setIgnoredProfiles(data.data || []);
    } catch { }
  }, []);

  useEffect(() => { fetchIgnoredProfiles(); }, []);

  useEffect(() => {
    const handleDocumentClick = () => {
      setUserMenuOpenKey(null);
      setOpenMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleIgnoreProfile = async (user: GroupedUser) => {
    if (!window.confirm(`Ignorar o perfil "${user.name}"?\n\nTodas as conversas existentes serão marcadas como ignoradas e novas conversas também serão ignoradas automaticamente.`)) return;
    setUserActionLoading(`ignore_${user.groupKey}`);
    setUserMenuOpenKey(null);
    try {
      const body: any = {};
      if (user.customerId) body.customerId = user.customerId;
      else body.sessionId = user.sessionId;
      if (user.email) body.email = user.email;
      if (user.phone) body.phone = user.phone;
      const res = await fetch(`${API_URL}/admin/kaia/v2/ignored-profiles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao ignorar perfil');
      showToast(`Perfil "${user.name}" adicionado aos ignorados`);
      await fetchConversations(page, true);
      await fetchIgnoredProfiles();
    } catch (err: any) {
      showToast(err.message || 'Erro ao ignorar perfil', 'error');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleUnignoreProfile = async (user: GroupedUser) => {
    setUserActionLoading(`unignore_${user.groupKey}`);
    setUserMenuOpenKey(null);
    try {
      const body: any = {};
      if (user.customerId) body.customerId = user.customerId;
      else body.sessionId = user.sessionId;
      const res = await fetch(`${API_URL}/admin/kaia/v2/ignored-profiles/remove`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover dos ignorados');
      showToast(`Perfil "${user.name}" removido dos ignorados`);
      await fetchConversations(page, true);
      await fetchIgnoredProfiles();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover perfil', 'error');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleBulkDeleteUser = async (user: GroupedUser) => {
    if (!window.confirm(`Excluir todo o histórico de "${user.name}"?\n\n${user.conversations.length} conversa(s) serão marcadas como excluídas e sumirão da lista. Esta ação é respeitada pelo sistema de retenção de dados.`)) return;
    setUserActionLoading(`delete_${user.groupKey}`);
    setUserMenuOpenKey(null);
    try {
      const body: any = {};
      if (user.customerId) body.customerId = user.customerId;
      else body.sessionId = user.sessionId;
      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations/bulk-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir conversas');
      showToast(data.message || `Histórico de "${user.name}" excluído`);
      setSelectedConv(null);
      setSelectedUserGroupKey(null);
      await fetchConversations(page, true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir histórico', 'error');
    } finally {
      setUserActionLoading(null);
    }
  };

  interface GroupedUser {
    groupKey: string;
    name: string;
    email: string | null;
    phone: string | null;
    customerId: string | null;
    sessionId: string;
    conversations: Conversation[];
    lastInteractionAt: string;
  }

  const groupedUsers = useMemo<GroupedUser[]>(() => {
    const groups: Record<string, GroupedUser> = {};
    conversations.forEach((conv) => {
      const key = conv.customer_id ? `cust_${conv.customer_id}` : `sess_${conv.session_id}`;
      if (!groups[key]) {
        const name = conv.customer_name || conv.name || `Visitante ${conv.session_id.slice(0, 8)}`;
        const email = conv.customer_email || conv.email;
        const phone = conv.customer_phone || conv.phone;
        groups[key] = {
          groupKey: key,
          name,
          email,
          phone,
          customerId: conv.customer_id,
          sessionId: conv.session_id,
          conversations: [],
          lastInteractionAt: conv.last_message_at,
        };
      }
      groups[key].conversations.push(conv);
      if (new Date(conv.last_message_at) > new Date(groups[key].lastInteractionAt)) {
        groups[key].lastInteractionAt = conv.last_message_at;
      }
    });

    Object.values(groups).forEach(g => {
      g.conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    });

    return Object.values(groups).sort((a, b) => new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime());
  }, [conversations]);

  // --- Seletores Memoizados para Chaves ---
  const filteredKeys = useMemo(() => {
    let result = [...keys];
    if (keyFilters.search.trim()) {
      const q = keyFilters.search.trim().toLowerCase();
      result = result.filter(
        k => k.name.toLowerCase().includes(q) ||
          k.key_preview.toLowerCase().includes(q) ||
          k.provider.toLowerCase().includes(q)
      );
    }
    if (keyFilters.provider !== 'all') {
      result = result.filter(k => k.provider === keyFilters.provider);
    }
    if (keyFilters.healthStatus !== 'all') {
      result = result.filter(k => k.health_status === keyFilters.healthStatus);
    }
    if (keyFilters.enabled === 'active') result = result.filter(k => k.enabled);
    if (keyFilters.enabled === 'inactive') result = result.filter(k => !k.enabled);

    result.sort((a, b) => {
      switch (keyFilters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'last_success': {
          const ta = a.last_success_at ? new Date(a.last_success_at).getTime() : 0;
          const tb = b.last_success_at ? new Date(b.last_success_at).getTime() : 0;
          return tb - ta;
        }
        case 'last_error': {
          const ta = a.last_error_at ? new Date(a.last_error_at).getTime() : 0;
          const tb = b.last_error_at ? new Date(b.last_error_at).getTime() : 0;
          return tb - ta;
        }
        case 'updated': {
          const ta = new Date(a.updated_at).getTime();
          const tb = new Date(b.updated_at).getTime();
          return tb - ta;
        }
        case 'priority':
        default:
          return b.priority - a.priority || a.name.localeCompare(b.name);
      }
    });
    return result;
  }, [keys, keyFilters]);

  const keyStats = useMemo(() => {
    const active = keys.filter(k => k.enabled).length;
    const inactive = keys.length - active;
    const lastUpdated = keys.reduce<string | null>((latest, k) => {
      if (!latest || new Date(k.updated_at) > new Date(latest)) return k.updated_at;
      return latest;
    }, null);
    return { active, inactive, lastUpdated };
  }, [keys]);

  // --- Loader de Chaves ---
  const [keyStatus, setKeyStatus] = useState<any>(null);
  const [loadingKeyStatus, setLoadingKeyStatus] = useState(false);

  const loadKeysData = useCallback(async (silent = false) => {
    try {
      if (silent) setLoadingKeyStatus(true);
      else setLoadingKeys(true);
      const [keysData, statusData] = await Promise.all([
        aiApiKeysService.listKeys(),
        aiApiKeysService.getStatus(),
      ]);
      setKeys(keysData);
      setKeyStatus(statusData);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar chaves', 'error');
    } finally {
      setLoadingKeys(false);
      setLoadingKeyStatus(false);
    }
  }, []);

  const runKeyAction = async (
    key: AiApiKey,
    actionKey: string,
    action: () => Promise<unknown>,
    successMsg: string
  ) => {
    try {
      setActionLoadingKey(`${key.id}:${actionKey}`);
      setOpenMenuId(null);
      await action();
      showToast(successMsg, 'success');
      await loadKeysData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro na operação', 'error');
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleTestKey = async (key: AiApiKey) => {
    try {
      setActionLoadingKey(`${key.id}:test`);
      setOpenMenuId(null);
      const result = await aiApiKeysService.testKey(key.id);
      if (result.success) {
        showToast(`Chave "${key.name}" testada com sucesso ${result.responseTimeMs ? `(${result.responseTimeMs}ms)` : ''}`);
      } else {
        showToast(`Teste de "${key.name}" falhou: ${result.message}`, 'error');
      }
      await loadKeysData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao testar chave', 'error');
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleDisableKey = (key: AiApiKey) => {
    const isHealthy = key.enabled && key.health_status === 'healthy';
    const execute = () =>
      runKeyAction(key, 'disable', () => aiApiKeysService.disableKey(key.id), `Chave "${key.name}" desativada`);

    if (isHealthy) {
      if (window.confirm(`Desativar a chave "${key.name}"?\n\nEla deixará de ser usada na rotação até ser reativada.`)) {
        execute();
      }
    } else {
      execute();
    }
  };

  const handleEnableKey = (key: AiApiKey) => {
    runKeyAction(key, 'enable', () => aiApiKeysService.enableKey(key.id), `Chave "${key.name}" ativada`);
  };

  const handleForceCooldownReset = (key: AiApiKey) => {
    runKeyAction(key, 'reset_cooldown', () => aiApiKeysService.clearCooldown(key.id), `Cooldown de "${key.name}" reiniciado`);
  };

  const handleMarkDeadKey = (key: AiApiKey) => {
    if (window.confirm(`Marcar "${key.name}" como morta?\n\nA chave será desativada e não será usada na rotação automática.`)) {
      runKeyAction(
        key,
        'dead',
        () => aiApiKeysService.markDead(key.id),
        `Chave "${key.name}" marcada como morta`
      );
    }
  };

  const handleRemoveKey = (key: AiApiKey) => {
    if (window.confirm(`Tem certeza que deseja remover a chave "${key.name}"?\n\nEssa ação não exibirá a chave novamente.`)) {
      runKeyAction(key, 'remove', () => aiApiKeysService.deleteKey(key.id), `Chave "${key.name}" removida com sucesso`);
    }
  };

  const handleCreateKey = async () => {
    const parsedKeys = parseApiKeysInput(keyFormData.apiKey);
    if (parsedKeys.length === 0) {
      showToast('Informe pelo menos uma chave de API', 'error');
      return;
    }

    try {
      setActionLoadingKey('create');
      const result = await aiApiKeysService.createKey({
        name: keyFormData.name.trim(),
        provider: keyFormData.provider,
        model: keyFormData.model || undefined,
        apiKey: keyFormData.apiKey,
        priority: keyFormData.priority,
        testOnCreate: keyFormData.testOnCreate,
      });

      if (result.bulk) {
        const created = result.createdCount || 0;
        const duplicates = result.duplicateCount || 0;
        const failed = result.failedCount || 0;
        if (created > 0) {
          showToast(`${created} chave(s) cadastrada(s). ${duplicates} duplicada(s) ignorada(s)${failed ? `, ${failed} falharam` : ''}.`);
        } else if (duplicates > 0 && failed === 0) {
          showToast('Todas as chaves informadas já estavam cadastradas.', 'error');
        } else {
          showToast(result.message || 'Nenhuma chave nova foi cadastrada', 'error');
        }
      } else if (result.testResult && !result.testResult.success) {
        showToast(`Chave criada, mas o teste falhou: ${result.testResult.message}`, 'error');
      } else {
        showToast(`Chave "${result.key?.name || keyFormData.name || 'Chave Gemini'}" criada com sucesso`);
      }

      setShowKeyForm(false);
      setKeyFormData({ name: '', provider: 'gemini', model: '', apiKey: '', priority: 0, testOnCreate: true });
      await loadKeysData(false);
    } catch (err: any) {
      if (err instanceof DuplicateApiKeyError) {
        setDuplicatePrompt({
          message: err.message,
          existingKey: err.existingKey,
          canReactivate: err.canReactivate,
        });
        setShowKeyForm(false);
      } else {
        showToast(err.message || 'Erro ao criar chave', 'error');
      }
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleReactivateKey = async (id: string) => {
    try {
      setActionLoadingKey('reactivate');
      await aiApiKeysService.enableKey(id);
      showToast('Chave reativada com sucesso');
      setDuplicatePrompt(null);
      await loadKeysData(false);
    } catch (err: any) {
      showToast(err.message || 'Erro ao reativar chave', 'error');
    } finally {
      setActionLoadingKey(null);
    }
  };
  const openAuditLogs = async (key: AiApiKey) => {
    setOpenMenuId(null);
    setAuditKey(key);
    setAuditLoading(true);
    try {
      const history = await aiApiKeysService.getAuditHistory(key.id);
      setAuditLogs(history.logs || []);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar histórico', 'error');
      setAuditKey(null);
    } finally {
      setAuditLoading(false);
    }
  };
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalConvs, setTotalConvs] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    has_error: '',
    has_human_support: '',
    customer_only: '',
    visitor_only: '',
    startDate: '',
    endDate: '',
    is_archived: '',
    is_ignored: '',
    is_deleted: '',
    channel: '',
    intent: '',
    has_fallback: '',
    escalated: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);
  const [autoRefresh] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{ action: string; title: string; message: string } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const toastIdRef = useRef(0);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Garantia de segurança adicional no runtime - redireciona se não for admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const token = localStorage.getItem('kapsu_token') || sessionStorage.getItem('kapsu_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ===== Toast helper =====
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Refs para evitar reinicializar o interval de auto-refresh a cada render/mudança de estado
  const selectedConvRef = useRef<Conversation | null>(null);
  selectedConvRef.current = selectedConv;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const pageRef = useRef(page);
  pageRef.current = page;

  // ===== Fetch global counts =====
  const fetchConversationCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations/counts`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setPendingCount(Number(data.data.awaitingHuman ?? data.data.awaiting_human ?? 0));
      }
    } catch (err) {
      console.error('Erro ao buscar contagens:', err);
    }
  }, []);

  // ===== Fetch Conversations =====
  const fetchConversations = useCallback(async (p = 1, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: '20',
        ...Object.fromEntries(Object.entries(filtersRef.current).filter(([_, v]) => v)),
      });
      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        const payload = Array.isArray(data.data)
          ? { conversations: data.data }
          : safeObject<Record<string, any>>(data.data);
        const conversationsList = safeArray(payload.conversations || payload.items || payload.data).map(normalizeConversation);
        const pagination = safeObject<Record<string, any>>(payload.pagination);
        setConversations(conversationsList);
        setTotalPages(Math.max(1, safeNumber(pagination.totalPages ?? pagination.pages, 1)));
        setTotalConvs(safeNumber(pagination.total, conversationsList.length));
        const metricsTotal = metrics?.totalConversations ?? 0;
        if (import.meta.env.DEV && metricsTotal > 0 && conversationsList.length === 0) {
          console.warn('[Kaia admin] metrics indicate conversations exist, but the list returned empty', {
            endpoint: '/admin/kaia/v2/conversations',
            params: Object.fromEntries(params.entries()),
            metricsTotal,
            payloadShape: Array.isArray(data.data) ? 'data[]' : Object.keys(payload)
          });
        }
        // Contagem global vem do endpoint /counts
        await fetchConversationCounts();

        // Se houver uma conversa selecionada, atualiza os dados dela a partir da lista
        const currentSelected = selectedConvRef.current;
        if (currentSelected) {
          const updated = conversationsList.find((c: Conversation) => c.id === currentSelected.id);
          if (updated) {
            setSelectedConv(prev => {
              // Só atualiza se houver mudança real para evitar re-renders desnecessários
              if (!prev || JSON.stringify(prev) !== JSON.stringify(updated)) {
                return updated;
              }
              return prev;
            });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ===== Fetch Metrics =====
  const fetchMetrics = useCallback(async () => {
    try {
      let res = await fetch(`${API_URL}/admin/kaia/v2/metrics`, { headers });
      if (!res.ok) res = await fetch(`${API_URL}/admin/chat/metrics`, { headers });
      const data = await res.json();
      if (data.success) setMetrics(normalizeMetrics(data.data?.metrics || data.data || data.metrics));
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
    }
  }, []);
  // ===== Fetch Messages =====
  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations/${convId}`, { headers });
      const data = await res.json();
      if (data.success) {
        const payload = safeObject<Record<string, any>>(data.data);
        setMessages(safeArray(payload.messages || payload.items || payload.conversation?.messages).map(normalizeMessage));
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => { fetchConversations(1); fetchMetrics(); fetchConversationCounts(); }, []);
  useEffect(() => { fetchConversations(page); }, [filters, page, fetchConversations]);

  useEffect(() => {
    if (activeTab === 'keys') {
      loadKeysData();
    } else if (activeTab === 'performance') {
      fetchMetrics();
    }
  }, [activeTab, loadKeysData, fetchMetrics]);

  // Auto-refresh a cada 3 segundos
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchConversations(pageRef.current, true);
        fetchMetrics();
        fetchConversationCounts();
        if (selectedConvRef.current) fetchMessages(selectedConvRef.current.id, true);
      }, 3000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, fetchConversations, fetchMetrics, fetchMessages, fetchConversationCounts]);

  useEffect(() => {
    if (selectedConv) {
      isInitialLoadRef.current = true;
      fetchMessages(selectedConv.id, false);
    }
  }, [selectedConv?.id, fetchMessages]);

  // Smart auto-scroll: sempre rola para o final no carregamento inicial,
  // mas durante o polling respeita a posição atual do usuário.
  useEffect(() => {
    if (messages.length === 0) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current) {
      // Carregamento inicial ou troca de conversa: vai direto para o fim
      container.scrollTop = container.scrollHeight;
      isInitialLoadRef.current = false;
    } else {
      // Polling: só rola se o usuário já estiver perto do final (~100px)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom <= 100) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  // ===== Ações de Conversa =====
  const requestAction = (action: string) => {
    const modals: Record<string, { title: string; message: string }> = {
      archive: { title: 'Arquivar conversa', message: 'Deseja arquivar esta conversa? Ela sairá da lista principal.' },
      delete: { title: 'Excluir conversa', message: 'Deseja excluir esta conversa? A ação é reversível apenas por suporte.' },
      'pause-ai': { title: 'Pausar IA', message: 'A IA deixará de responder nesta conversa até ser retomada.' },
      'resume-ai': { title: 'Retomar IA', message: 'A Kaia voltará a responder automaticamente nesta conversa.' },
    };
    if (modals[action]) {
      setConfirmModal({ action, ...modals[action] });
      return;
    }
    handleAction(action);
  };

  const handleAction = async (action: string) => {
    if (!selectedConv) return;
    setActionLoading(action);
    setConfirmModal(null);
    try {
      let body: any = {};
      if (action === 'resolve') body = { status: 'resolved' };
      else if (action === 'pause-ai') body = { aiEnabled: false };
      else if (action === 'resume-ai') body = { aiEnabled: true };
      else if (action === 'archive') body = { isArchived: true };
      else if (action === 'unarchive') body = { isArchived: false };
      else if (action === 'ignore') body = { isIgnored: true };
      else if (action === 'unignore') body = { isIgnored: false };
      else if (action === 'delete') body = { deleted: true };

      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations/${selectedConv.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao executar ação');
      const actionLabels: Record<string, string> = {
        resolve: 'Conversa encerrada com sucesso',
        'pause-ai': 'IA pausada para esta conversa',
        'resume-ai': 'IA retomada com sucesso',
        archive: 'Conversa arquivada',
        unarchive: 'Conversa desarquivada',
        ignore: 'Conversa ignorada',
        unignore: 'Conversa restaurada',
        delete: 'Conversa excluída',
      };
      showToast(actionLabels[action] || 'Ação executada com sucesso');
      await fetchConversations(page, true);
      await fetchConversationCounts();
      await fetchMessages(selectedConv.id);
      // Atualiza a conversa selecionada com os novos dados
      const convRes = await fetch(`${API_URL}/admin/kaia/v2/conversations/${selectedConv.id}`, { headers });
      const convData = await convRes.json();
      if (convData.success) setSelectedConv(normalizeConversation(convData.data?.conversation || convData.data));
    } catch (err: any) {
      showToast(err.message || 'Erro ao executar ação', 'error');
      console.error('Erro ao executar ação:', err);
    } finally {
      setActionLoading('');
    }
  };

  // ===== Exportar conversa =====
  const handleExport = () => {
    const safeMessages = safeArray<Message>(messages);
    if (!selectedConv || safeMessages.length === 0) return;
    const name = selectedConv.customer_name || selectedConv.name || selectedConv.session_id;
    const lines = [
      `=== Conversa: ${name} ===`,
      `Status: ${selectedConv.status}`,
      `Data: ${new Date(selectedConv.created_at).toLocaleString('pt-BR')}`,
      `Sessão: ${selectedConv.session_id}`,
      '',
      ...safeMessages.map(m => {
        const role = m.role === 'user' ? 'CLIENTE' : m.role === 'assistant' ? 'KAIA' : m.role.toUpperCase();
        const time = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const intent = m.metadata?.intent ? ` [${m.metadata.intent}]` : '';
        return `[${time}] ${role}${intent}:\n${m.content}`;
      }),
    ];
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-kaia-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Conversa exportada com sucesso');
  };

  const handleReply = async () => {
    if (!selectedConv || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations/${selectedConv.id}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: replyText }),
      });
      if (!res.ok) throw new Error('Erro ao enviar resposta');
      setReplyText('');
      await fetchMessages(selectedConv.id);
      fetchConversations(page, true);
      showToast('Resposta enviada! IA pausada automaticamente.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchConversations(1);
  };

  // ==================== RENDER ====================
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-300">
      {/* Toasts */}
      <Toast toasts={toasts} />
      {/* ===== Header ===== */}
      <div className="flex-shrink-0 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central da IA - Kaia</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Diagnóstico técnico, monitoramento de agentes e chaves de API</p>
            </div>
          </div>

          {/* Tab selector em linha única */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 text-xs font-bold gap-1 overflow-x-auto whitespace-nowrap scrollbar-none self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all shrink-0 ${activeTab === 'chats'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <MessageSquare size={14} />
              <span>Atendimentos e Chats</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-extrabold animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all shrink-0 ${activeTab === 'performance'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <Activity size={14} />
              <span>Performance e Métricas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all shrink-0 ${activeTab === 'agents'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <Bot size={14} />
              <span>Agentes de IA</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all shrink-0 ${activeTab === 'keys'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <KeyRound size={14} />
              <span>Chaves de API</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('learning')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all shrink-0 ${activeTab === 'learning'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <Brain size={14} />
              <span>Aprendizado & Memória</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'chats' ? (
        <>

          {/* ===== Layout Principal: Lista | Chat ===== */}
          <div className="flex flex-1 min-h-0 gap-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* ===== Painel Esquerdo: Lista de Conversas ===== */}
            <div className="w-80 min-h-0 flex-shrink-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
              {/* Busca e Filtros */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { id: '', label: 'Todas' },
                    { id: 'ai_active', label: 'IA ativa' },
                    { id: 'awaiting_human', label: 'Aguardando' },
                    { id: 'archived', label: 'Arquivadas' },
                    { id: 'deleted', label: 'Excluídas' },
                  ].map((chip) => (
                    <button
                      key={chip.id || 'all'}
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({
                          ...f,
                          status: chip.id,
                          is_archived: chip.id === 'archived' ? 'true' : '',
                          is_deleted: chip.id === 'deleted' ? 'true' : '',
                          is_ignored: '',
                        }));
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${filters.status === chip.id
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSearch} className="flex gap-1.5 mb-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                      placeholder="Buscar cliente, e-mail, sessão..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-1.5 rounded-lg border transition-colors ${showFilters ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <Filter size={14} />
                  </button>
                </form>

                {showFilters && (
                  <div className="space-y-1.5">
                    <select
                      value={filters.status}
                      onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                      className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Todos os status</option>
                      <option value="ai_active">IA ativa</option>
                      <option value="awaiting_human">Aguardando humano</option>
                      <option value="human_active">Humano ativo</option>
                      <option value="ai_paused">IA pausada</option>
                      <option value="archived">Arquivadas</option>
                      <option value="ignored">Ignoradas</option>
                      <option value="deleted">Excluídas</option>
                      <option value="resolved">Resolvido</option>
                      <option value="closed">Encerrado</option>
                    </select>
                    <div className="flex gap-1.5">
                      <select
                        value={filters.is_archived}
                        onChange={e => setFilters(f => ({ ...f, is_archived: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos (Arq)</option>
                        <option value="false">Não arquivados</option>
                        <option value="true">Arquivados</option>
                      </select>
                      <select
                        value={filters.is_ignored}
                        onChange={e => setFilters(f => ({ ...f, is_ignored: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos (Ign)</option>
                        <option value="false">Não ignorados</option>
                        <option value="true">Ignorados</option>
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        value={filters.channel}
                        onChange={e => setFilters(f => ({ ...f, channel: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos canais</option>
                        <option value="site">Site</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">E-mail</option>
                      </select>
                      <select
                        value={filters.is_deleted}
                        onChange={e => setFilters(f => ({ ...f, is_deleted: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos exclusao</option>
                        <option value="false">Nao excluidos</option>
                        <option value="true">Excluidos</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={filters.intent}
                      onChange={e => setFilters(f => ({ ...f, intent: e.target.value }))}
                      placeholder="Filtrar por intencao"
                      className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <div className="flex gap-1.5">
                      <select
                        value={filters.has_error}
                        onChange={e => setFilters(f => ({ ...f, has_error: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos os erros</option>
                        <option value="true">Com Erro</option>
                      </select>
                      <select
                        value={filters.has_human_support}
                        onChange={e => setFilters(f => ({ ...f, has_human_support: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos suporte</option>
                        <option value="true">Com Humano</option>
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        value={filters.has_fallback}
                        onChange={e => setFilters(f => ({ ...f, has_fallback: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos fallback</option>
                        <option value="true">Com fallback</option>
                        <option value="false">Sem fallback</option>
                      </select>
                      <select
                        value={filters.escalated}
                        onChange={e => setFilters(f => ({ ...f, escalated: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Todos escalonamento</option>
                        <option value="true">Escalonados</option>
                        <option value="false">Nao escalonados</option>
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                        className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <button
                      onClick={() => { setFilters({ search: '', status: '', has_error: '', has_human_support: '', customer_only: '', visitor_only: '', startDate: '', endDate: '', is_archived: '', is_ignored: '', is_deleted: '', channel: '', intent: '', has_fallback: '', escalated: '' }); setPage(1); }}
                      className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-0.5"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{totalConvs} contatos</span>
                  {loading && <Loader2 size={12} className="animate-spin text-primary-500" />}
                </div>
              </div>

              {/* Lista agrupada por usuário */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-gray-100 dark:divide-gray-800">
                {groupedUsers.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-600">
                    <MessageSquare size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma conversa encontrada</p>
                  </div>
                )}
                {groupedUsers.map((user: GroupedUser) => {
                  const isSelected = selectedUserGroupKey === user.groupKey;
                  const mostRecentConv = user.conversations[0];
                  const isIgnored = user.conversations.some(c => c.is_ignored);
                  const isUserMenuOpen = userMenuOpenKey === user.groupKey;
                  const isProfileIgnored = ignoredProfiles.some(p =>
                    (user.customerId && p.customer_id === user.customerId) ||
                    (p.session_id === user.sessionId) ||
                    (user.email && p.email === user.email)
                  );
                  const isActionLoading = userActionLoading?.endsWith(user.groupKey);
                  return (
                    <div key={user.groupKey} className="flex flex-col">
                      {/* Card do Usuário — botão direito abre o menu de contexto */}
                      <div
                        className={`relative flex gap-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-default ${isSelected ? 'bg-primary-50/50 dark:bg-primary-950/10' : ''
                          }`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUserMenuOpenKey(isUserMenuOpen ? null : user.groupKey);
                        }}
                      >
                        <button
                          onClick={() => {
                            setSelectedUserGroupKey(isSelected ? null : user.groupKey);
                            if (mostRecentConv) setSelectedConv(mostRecentConv);
                            setUserMenuOpenKey(null);
                          }}
                          className="flex-1 text-left p-3 flex gap-3 min-w-0"
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isProfileIgnored
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                              }`}>
                              {isActionLoading
                                ? <Loader2 size={14} className="animate-spin" />
                                : user.name.charAt(0).toUpperCase()
                              }
                            </div>
                            {(isIgnored || isProfileIgnored) && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center border border-white dark:border-gray-900">
                                <EyeOff size={10} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                {user.name}
                              </span>
                              <span className="text-[9px] text-gray-400 font-mono whitespace-nowrap">
                                {formatLastInteraction(user.lastInteractionAt)}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {user.email || user.phone || 'Sem contato'}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                              <span>{user.conversations.length} {user.conversations.length === 1 ? 'chat' : 'chats'}</span>
                              {mostRecentConv && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${getStatusInfo(mostRecentConv.status).bg
                                  } ${getStatusInfo(mostRecentConv.status).color}`}>
                                  {getStatusInfo(mostRecentConv.status).label}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Dropdown de Contexto (clique direito) */}
                        {isUserMenuOpen && (
                          <div
                            className="absolute right-2 top-2 z-50 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Ações do Perfil</p>
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mt-0.5">{user.name}</p>
                            </div>

                            {isProfileIgnored ? (
                              <button
                                onClick={() => handleUnignoreProfile(user)}
                                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                              >
                                <UserCheck size={13} />
                                Remover dos Ignorados
                              </button>
                            ) : (
                              <button
                                onClick={() => handleIgnoreProfile(user)}
                                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              >
                                <UserX size={13} />
                                Ignorar Perfil Inteiro
                              </button>
                            )}

                            <div className="border-t border-gray-100 dark:border-gray-800">
                              <button
                                onClick={() => handleBulkDeleteUser(user)}
                                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 size={13} />
                                Excluir todo o histórico
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lista Expandida de Chats do Usuário */}
                      {isSelected && user.conversations.length > 0 && (
                        <div className="bg-gray-50/50 dark:bg-gray-950/20 pl-4 py-1.5 border-l-2 border-primary-500 space-y-1">
                          <div className="px-2 pb-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                            Histórico de Sessões:
                          </div>
                          {user.conversations.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConv(conv)}
                              className={`w-full text-left p-2 rounded-l-lg flex flex-col gap-1 transition-all border border-r-0 border-transparent hover:bg-white dark:hover:bg-gray-900 hover:shadow-xs ${selectedConv?.id === conv.id
                                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs'
                                  : ''
                                }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="text-[10px] font-mono text-gray-500 font-bold">
                                  ID: {conv.id.slice(0, 8)}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  {timeAgo(conv.last_message_at)}
                                </span>
                              </div>
                              {conv.last_message && (
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full italic">
                                  "{conv.last_message.content}"
                                </p>
                              )}
                              <div className="flex items-center justify-between text-[9px] mt-0.5 w-full">
                                <span className="text-gray-400 font-mono">Canal: {conv.channel}</span>
                                <span className={`px-1 py-0.1 rounded font-semibold ${getStatusInfo(conv.status).bg} ${getStatusInfo(conv.status).color}`}>
                                  {getStatusInfo(conv.status).label}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex-shrink-0 flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors text-gray-600 dark:text-gray-300 flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{page}/{totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors text-gray-600 dark:text-gray-300 flex items-center gap-1"
                  >
                    Próxima <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* ===== Painel Direito: Conversa ===== */}
            {selectedConv ? (
              <div className="flex-1 min-h-0 flex min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
                <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden border-r border-gray-200 dark:border-gray-800">
                  {/* Header da Conversa */}
                  <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold ${selectedConv.customer_id ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}>
                          {(selectedConv.customer_name || selectedConv.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                              {selectedConv.customer_name || selectedConv.name || `Visitante ${selectedConv.session_id?.slice(0, 12)}`}
                            </h2>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusInfo(selectedConv.status).bg} ${getStatusInfo(selectedConv.status).color}`}>
                              {getStatusInfo(selectedConv.status).label}
                            </span>
                            {(selectedConv as any).is_archived && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-medium">
                                Arquivado
                              </span>
                            )}
                            {(selectedConv as any).is_ignored && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium">
                                Ignorado
                              </span>
                            )}
                            {!selectedConv.ai_enabled && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                                IA Pausada
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap mt-0.5">
                            {selectedConv.customer_email && (
                              <span className="flex items-center gap-0.5"><Mail size={10} /> {maskEmail(selectedConv.customer_email)}</span>
                            )}
                            {selectedConv.customer_phone && (
                              <span className="flex items-center gap-0.5"><Phone size={10} /> {maskPhone(selectedConv.customer_phone)}</span>
                            )}
                            <span className="flex items-center gap-0.5"><Hash size={10} /> {selectedConv.session_id?.slice(0, 12)}</span>
                            <span className="flex items-center gap-0.5"><Calendar size={10} /> {new Date(selectedConv.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {selectedConv.status !== 'resolved' && selectedConv.status !== 'closed' && (
                          <button
                            onClick={() => handleAction('resolve')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                          >
                            {actionLoading === 'resolve' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                            Encerrar
                          </button>
                        )}
                        {(selectedConv as any).is_archived ? (
                          <button
                            onClick={() => handleAction('unarchive')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                          >
                            Desarquivar
                          </button>
                        ) : (
                          <button
                            onClick={() => requestAction('archive')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                          >
                            Arquivar
                          </button>
                        )}
                        {(selectedConv as any).is_ignored ? (
                          <button
                            onClick={() => handleAction('unignore')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                          >
                            Designorar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('ignore')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                          >
                            Ignorar
                          </button>
                        )}
                        {selectedConv.ai_enabled ? (
                          <button
                            onClick={() => requestAction('pause-ai')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                          >
                            {actionLoading === 'pause-ai' ? <Loader2 size={11} className="animate-spin" /> : <Pause size={11} />}
                            Pausar IA
                          </button>
                        ) : (
                          <button
                            onClick={() => requestAction('resume-ai')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
                          >
                            {actionLoading === 'resume-ai' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                            Retomar IA
                          </button>
                        )}
                        <button
                          onClick={() => requestAction('delete')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                        >
                          {actionLoading === 'delete' ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          Excluir
                        </button>
                        {/* Exportar conversa */}
                        <button
                          onClick={handleExport}
                          disabled={messages.length === 0}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Exportar conversa como texto"
                        >
                          <Download size={11} />
                          Exportar
                        </button>
                      </div>
                    </div>

                    {/* Badges de flags técnicas */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {selectedConv.has_error && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium flex items-center gap-1">
                          <AlertTriangle size={9} /> Com erro
                        </span>
                      )}
                      {selectedConv.has_human_support && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium flex items-center gap-1">
                          <Headphones size={9} /> Atendimento humano
                        </span>
                      )}
                      {selectedConv.has_action && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium flex items-center gap-1">
                          <ShoppingCart size={9} /> Ação executada
                        </span>
                      )}
                      {selectedConv.has_recommendation && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-medium flex items-center gap-1">
                          <Package size={9} /> Recomendação
                        </span>
                      )}
                      {selectedConv.has_promo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 font-medium flex items-center gap-1">
                          <Tag size={9} /> Cupom/Promo
                        </span>
                      )}
                      {selectedConv.has_order_query && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium flex items-center gap-1">
                          <Truck size={9} /> Consultou pedido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 size={24} className="animate-spin text-primary-500" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-600">
                        <MessageSquare size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma mensagem</p>
                      </div>
                    ) : (
                      <>
                        {messages.map(msg => (
                          <ChatMessage key={msg.id} message={msg} />
                        ))}
                      </>
                    )}
                  </div>

                  {/* Campo de Resposta */}
                  <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                        placeholder="Responder como administrador... (Enter para enviar)"
                        rows={2}
                        className="flex-1 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim() || sendingReply}
                        className="px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 px-1">
                      Ao responder, a IA é pausada automaticamente e a conversa é atribuída a você.
                    </p>
                  </div>
                </div>

                {/* NEW Right sidebar for Memory Diagnostics */}
                <div className="w-80 min-h-0 flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col p-4 overflow-y-auto overscroll-contain space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-1">Diagnóstico de Memória</h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-450">Estado de contexto ativo da Kaia v2</p>
                    </div>
                    {selectedConv?.id && (
                      <button
                        onClick={() => fetchConversationContext(selectedConv.id)}
                        disabled={loadingChatContext}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                        title="Recarregar contexto"
                      >
                        <RefreshCw size={13} className={loadingChatContext ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>

                  {loadingChatContext ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-primary-500" size={16} />
                    </div>
                  ) : selectedChatContext ? (
                    <>
                      {/* Modo de Conversa */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Modo Atual</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:bg-primary-300 text-[10px] font-bold font-mono uppercase">
                          {selectedChatContext.mode}
                        </span>
                      </div>

                      {/* Ação Pendente */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-gray-700 dark:text-gray-300">Ação Pendente</span>
                          {selectedChatContext.activePendingAction ? (
                            <span className="text-amber-600 dark:text-amber-400 text-[10px]">Pendente</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-[10px]">Nenhuma</span>
                          )}
                        </div>
                        {selectedChatContext.activePendingAction && (
                          <div className="text-[10px] space-y-1 text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-950 p-2 rounded border border-gray-100 dark:border-gray-850">
                            <p><strong>Tipo:</strong> {selectedChatContext.activePendingAction.type}</p>
                            <p><strong>Produto:</strong> {selectedChatContext.activePendingAction.productName}</p>
                            <p><strong>Quant:</strong> {selectedChatContext.activePendingAction.quantity}</p>
                            <p><strong>Expira em:</strong> {selectedChatContext.activePendingAction.elapsedSeconds}s / {selectedChatContext.activePendingAction.ttlSeconds}s</p>
                          </div>
                        )}
                      </div>

                      {/* Último Produto & Quantidade */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Contexto Recente</span>

                        {selectedChatContext.lastMentionedProduct && (
                          <div className="flex justify-between items-center text-[11px] bg-white dark:bg-gray-950 p-1.5 rounded border border-gray-100 dark:border-gray-850">
                            <span className="text-gray-500 dark:text-gray-400">Último Produto:</span>
                            <span className="font-bold text-gray-850 dark:text-gray-250 truncate max-w-[120px]">{selectedChatContext.lastMentionedProduct.name}</span>
                          </div>
                        )}

                        {selectedChatContext.lastQuantity && (
                          <div className="flex justify-between items-center text-[11px] bg-white dark:bg-gray-950 p-1.5 rounded border border-gray-100 dark:border-gray-850">
                            <span className="text-gray-500 dark:text-gray-400">Última Quantidade:</span>
                            <span className="font-bold text-gray-850 dark:text-gray-250">{selectedChatContext.lastQuantity.value}</span>
                          </div>
                        )}

                        {selectedChatContext.lastRejectedCartAdd && (
                          <div className="flex justify-between items-center text-[11px] bg-red-50/50 dark:bg-red-950/10 p-1.5 rounded border border-red-100 dark:border-red-900/20">
                            <span className="text-red-650 dark:text-red-400">Recusado (Excesso):</span>
                            <span className="font-bold text-red-650 dark:text-red-450 truncate max-w-[120px]">{selectedChatContext.lastRejectedCartAdd.productName} ({selectedChatContext.lastRejectedCartAdd.quantity})</span>
                          </div>
                        )}
                      </div>

                      {/* Resumo da Conversa */}
                      {selectedChatContext.recentMessagesSummary && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5 text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Resumo da IA</span>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-950 p-2 rounded border border-gray-100 dark:border-gray-850 leading-relaxed">
                            {selectedChatContext.recentMessagesSummary}
                          </p>
                        </div>
                      )}

                      {/* Memórias do Cliente */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Memórias do Cliente</span>
                        {selectedChatContext.approvedCustomerMemory && selectedChatContext.approvedCustomerMemory.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedChatContext.approvedCustomerMemory.map((mem: any) => (
                              <div key={mem.id} className={`flex flex-col p-2 rounded border ${mem.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'}`}>
                                <div className="flex justify-between items-center text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold uppercase tracking-wider text-primary-500 dark:text-primary-400">
                                      {mem.category === 'preference' ? 'Preferência' : 'Interesse'}
                                    </span>
                                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${mem.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                      {mem.status === 'approved' ? 'Aprovada' : 'Pendente'}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 dark:text-gray-500">{(mem.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200 mt-0.5">{mem.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic bg-white dark:bg-gray-950 p-2 rounded border border-gray-100 dark:border-gray-850">
                            Nenhuma memória extraída para este perfil.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 py-4 text-center">Nenhum contexto de diagnóstico carregado.</p>
                  )}
                </div>
              </div>
            ) : (
              /* Estado Vazio */
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-600">
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
                  <Bot size={36} className="text-primary-400 dark:text-primary-500" />
                </div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Selecione uma conversa</h3>
                <p className="text-sm text-center max-w-xs">
                  Escolha uma conversa na lista à esquerda para visualizar as mensagens e o diagnóstico técnico da IA.
                </p>

                {/* Top Intenções inline */}
                {metrics && metrics.topIntents.length > 0 && (
                  <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 w-80">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-3 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-primary-500" />
                      Intenções Mais Comuns
                    </h4>
                    <div className="space-y-1.5">
                      {metrics.topIntents.slice(0, 5).map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400 w-4 text-right">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getIntentBadge(item.intent)}`}>
                                {item.intent}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">{item.count}x</span>
                            </div>
                            <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                                style={{ width: `${(item.count / (metrics.topIntents[0]?.count || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'performance' ? (
        /* ===== ABA 2: PERFORMANCE E MÉTRICAS ===== */
        <div className="flex-1 overflow-y-auto space-y-6 pb-8 pr-2 animate-in fade-in duration-200">
          {/* Métricas do Dashboard */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {[
                {
                  label: 'Conversas',
                  value: metrics.totalConversations,
                  icon: MessageSquare,
                  color: 'text-primary-600 dark:text-primary-400',
                  bg: 'bg-primary-50 dark:bg-primary-900/20',
                  tooltip: 'Total geral de conversas históricas atendidas pela IA (chats ignorados não incluídos).'
                },
                {
                  label: 'Hoje',
                  value: metrics.todayConversations,
                  icon: Calendar,
                  color: 'text-emerald-600 dark:text-emerald-400',
                  bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                  tooltip: 'Novas conversas iniciadas nas últimas 24 horas.'
                },
                {
                  label: 'Aguardando Suporte',
                  value: metrics.awaitingHuman ?? 0,
                  icon: Headphones,
                  color: 'text-amber-600 dark:text-amber-400',
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                  tooltip: 'Conversas que necessitam de suporte humano (Clique para filtrar chats).',
                  onClick: () => {
                    setActiveTab('chats');
                    setFilters(f => ({ ...f, status: 'awaiting_human', is_archived: '', is_ignored: '', is_deleted: '' }));
                    setPage(1);
                  }
                },
                {
                  label: 'Erros',
                  value: metrics.errorConversations,
                  icon: AlertTriangle,
                  color: 'text-red-600 dark:text-red-400',
                  bg: 'bg-red-50 dark:bg-red-900/20',
                  tooltip: 'Chats que apresentaram erros de modelo ou fallbacks.'
                },
                {
                  label: 'Fallback',
                  value: `${metrics.fallbackRate}%`,
                  icon: Activity,
                  color: 'text-amber-600 dark:text-amber-400',
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                  tooltip: 'Percentual de mensagens em que a IA recorreu ao fallback.'
                },
                {
                  label: 'Resp. Média',
                  value: `${metrics.avgResponseTime}ms`,
                  icon: Clock,
                  color: 'text-cyan-600 dark:text-cyan-400',
                  bg: 'bg-cyan-50 dark:bg-cyan-900/20',
                  tooltip: 'Tempo médio de resposta da inteligência artificial em milissegundos.'
                },
                {
                  label: 'Bloqueios',
                  value: metrics.securityBlocksCount,
                  icon: Shield,
                  color: 'text-rose-600 dark:text-rose-400',
                  bg: 'bg-rose-50 dark:bg-rose-900/20',
                  tooltip: 'Mensagens interceptadas por suspeita de prompt injection ou abuso.'
                },
              ].map((m, i) => {
                const Icon = m.icon;
                const Wrapper = m.onClick ? 'button' : 'div';
                return (
                  <Wrapper
                    key={i}
                    {...(m.onClick ? { onClick: m.onClick } : {})}
                    title={m.tooltip}
                    className={`${m.bg} rounded-xl p-3 flex flex-col gap-1 border border-transparent shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-colors w-full text-left relative group cursor-help`}
                  >
                    <div className={`flex items-center gap-1.5 ${m.color}`}>
                      <Icon size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">{m.label}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white mt-0.5">{m.value}</span>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-gray-950 text-white text-[9px] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-30 font-normal leading-relaxed text-center border border-gray-800">
                      {m.tooltip}
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Maiores Consumidores de Tokens */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">Consumo de Tokens por Cliente</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Clientes que mais demandaram processamento da inteligência artificial (estimado)</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    Top 10 Consumidores
                  </span>
                </div>
                {metrics && metrics.topConsumers && metrics.topConsumers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Cliente / Sessão</th>
                          <th className="py-2.5 px-3 text-center">Mensagens</th>
                          <th className="py-2.5 px-3 text-right">Tokens Estimados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {metrics.topConsumers.map((item: any, idx: number) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                            <td className="py-3 px-3 font-mono text-gray-400">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800 dark:text-gray-200">
                                  {item.name || `Visitante ${item.sessionId?.slice(0, 12)}`}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {item.email ? maskEmail(item.email) : item.phone ? maskPhone(item.phone) : 'Sem contato cadastrado'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                              {item.messageCount}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400 font-bold border border-primary-100 dark:border-primary-900/40">
                                {item.estimatedTokens.toLocaleString('pt-BR')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-6">Nenhum dado de consumo registrado.</p>
                )}
              </div>
            </div>

            {/* Rankings Auxiliares */}
            <div className="space-y-6">
              {/* Agente mais acionado */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">Agentes Mais Acionados</h3>
                {metrics && metrics.topAgents && metrics.topAgents.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.topAgents.slice(0, 5).map((item: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">{CONFIGURED_AGENTS.find(a => a.id === item.agent)?.name || item.agent}</span>
                          <span className="text-gray-500 font-mono">{item.count}x</span>
                        </div>
                        <div className="w-full bg-gray-105 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full"
                            style={{ width: `${(item.count / (metrics.topAgents?.[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">Nenhum agente acionado hoje.</p>
                )}
              </div>

              {/* Raking de Intenções do Usuário */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">Intenções Mais Comuns</h3>
                {metrics && metrics.topIntents.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.topIntents.slice(0, 5).map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-700 dark:text-gray-300 capitalize">{item.intent.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500 font-mono">{item.count}x</span>
                        </div>
                        <div className="w-full bg-gray-105 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full"
                            style={{ width: `${(item.count / (metrics.topIntents[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">Nenhuma intenção registrada hoje.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'agents' ? (
        /* ===== ABA 3: VISÃO GERAL DOS AGENTES ===== */
        <div className="flex-1 overflow-y-auto space-y-6 pb-8 pr-2 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-base">Agentes de IA Configurados</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todos os agentes configurados e rodando em tempo real no Chat Flutuante. Clique para ver detalhes e System Instructions.</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-mono">
                {CONFIGURED_AGENTS.length} Agentes
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONFIGURED_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentDetail(selectedAgentDetail?.id === agent.id ? null : agent)}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col gap-2 hover:border-primary-350 dark:hover:border-primary-850 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-gray-950 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{agent.name}</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Ativo
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{agent.description}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 w-full">
                    <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500">{agent.id}</span>
                    <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold group-hover:underline">Visualizar regras &rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'learning' ? (
        /* ===== ABA 5: APRENDIZADO E MEMÓRIA DA KAIA ===== */
        <div className="flex-1 overflow-y-auto space-y-5 pb-8 pr-1 animate-in fade-in duration-200">

          {/* Cabeçalho Unificado, Controles e Navegação */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <Brain size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Aprendizado & Memória</h3>
                    {/* Botão de Ajuda '?' que abre o Modal Explicativo */}
                    <button
                      type="button"
                      onClick={() => setShowLearningGuideModal(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition-all border border-purple-200/60 dark:border-purple-800/60 shadow-sm"
                      title="Clique para entender como funcionam os Apelidos, Melhorias e Memórias"
                    >
                      <HelpCircle size={14} />
                      <span>Como Funciona?</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Supervisão inteligente de apelidos de produtos, regras de atendimento e preferências de clientes</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                {/* Toggle Memória Long-Term */}
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-750">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Memória Long-Term</span>
                  <button
                    type="button"
                    onClick={handleToggleLongTermMemory}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLongTermMemoryEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    title="Clique para ativar ou desativar o salvamento de memórias de clientes"
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${isLongTermMemoryEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                  </button>
                  <span className={`text-[11px] font-extrabold ${isLongTermMemoryEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    {isLongTermMemoryEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Botão Atualizar */}
                <button
                  type="button"
                  onClick={() => fetchLearningData(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-colors shadow-sm"
                  title="Atualizar dados de aprendizado"
                >
                  <RefreshCw size={13} className={loadingLearning ? 'animate-spin text-primary-500' : ''} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            {/* KPI Interativos para Filtrar Melhorias e Memórias */}
            {learningQueueDiagnostics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setLearningTabSubSection('improvements'); setImprovementFilterStatus('pending'); }}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${learningTabSubSection === 'improvements' && improvementFilterStatus === 'pending'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 shadow-sm font-bold'
                      : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-amber-300'
                    }`}
                >
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
                    Melhorias Pendentes
                    <Tag size={12} />
                  </span>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{learningQueueDiagnostics.pendingImprovementCount ?? 0}</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setLearningTabSubSection('memories'); setMemoryFilterStatus('pending_admin_approval'); }}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${learningTabSubSection === 'memories' && memoryFilterStatus === 'pending_admin_approval'
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 shadow-sm font-bold'
                      : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                >
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-700 dark:text-blue-400 flex items-center justify-between">
                    Memórias Pendentes
                    <Brain size={12} />
                  </span>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{learningQueueDiagnostics.pendingMemoryCount ?? 0}</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setLearningTabSubSection('improvements'); setImprovementFilterStatus('applied'); }}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${learningTabSubSection === 'improvements' && improvementFilterStatus === 'applied'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 shadow-sm font-bold'
                      : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                >
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    Melhorias Aplicadas
                    <CheckCircle size={12} />
                  </span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{(learningQueueDiagnostics.improvementCounts?.applied || 0) + (learningQueueDiagnostics.improvementCounts?.approved || 0)}</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setLearningTabSubSection('memories'); setMemoryFilterStatus('approved'); }}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${learningTabSubSection === 'memories' && memoryFilterStatus === 'approved'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 shadow-sm font-bold'
                      : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                >
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    Memórias Aprovadas
                    <Sparkles size={12} />
                  </span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{learningQueueDiagnostics.memoryCounts?.approved ?? 0}</p>
                </button>
              </div>
            )}

            {/* Seletor de Sub-seções (Navegação em Linha Única sem Quebra) */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-700 text-xs font-bold gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
                <button
                  type="button"
                  onClick={() => setLearningTabSubSection('improvements')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shrink-0 ${learningTabSubSection === 'improvements'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200 dark:border-gray-600 font-bold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                    }`}
                >
                  <Tag size={14} />
                  <span>Fila de Melhorias</span>
                  <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono">
                    {learningImprovements.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLearningTabSubSection('memories')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shrink-0 ${learningTabSubSection === 'memories'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200 dark:border-gray-600 font-bold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                    }`}
                >
                  <Brain size={14} />
                  <span>Memórias dos Clientes</span>
                  <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                    {learningMemories.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLearningTabSubSection('tests')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shrink-0 ${learningTabSubSection === 'tests'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200 dark:border-gray-600 font-bold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                    }`}
                >
                  <Code2 size={14} />
                  <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-mono">
                    {learningTests.length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4 min-h-[450px]">

            {loadingLearning ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary-500" />
              </div>
            ) : learningTabSubSection === 'improvements' ? (
              /* Fila de Melhorias */
              <div className="space-y-4">
                {/* Header da Fila de Melhorias: Filtros + Ações em Massa */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 w-fit gap-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => { setImprovementFilterStatus('pending'); setSelectedImprovementIds([]); }}
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${improvementFilterStatus === 'pending'
                          ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      Pendentes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImprovementFilterStatus('applied'); setSelectedImprovementIds([]); }}
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${improvementFilterStatus === 'applied'
                          ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      Aprovadas
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImprovementFilterStatus('rejected'); setSelectedImprovementIds([]); }}
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${improvementFilterStatus === 'rejected'
                          ? 'bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      Rejeitadas
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImprovementFilterStatus('archived'); setSelectedImprovementIds([]); }}
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${improvementFilterStatus === 'archived'
                          ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      Arquivadas
                    </button>
                  </div>

                  {/* Seleção em Massa + Export/Import */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {learningImprovements.length > 0 && (
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedImprovementIds.length > 0 && selectedImprovementIds.length === learningImprovements.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedImprovementIds(learningImprovements.map(item => item.id));
                            } else {
                              setSelectedImprovementIds([]);
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500"
                        />
                        <span>Selecionar Todos</span>
                      </label>
                    )}

                    {selectedImprovementIds.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleBulkDeleteImprovements}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-sm transition-all"
                        >
                          <Trash2 size={13} />
                          Excluir ({selectedImprovementIds.length})
                        </button>
                        {improvementFilterStatus !== 'archived' && (
                          <button
                            type="button"
                            onClick={handleBulkArchiveImprovements}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm transition-all"
                          >
                            <Archive size={13} />
                            Arquivar ({selectedImprovementIds.length})
                          </button>
                        )}
                      </>
                    )}

                    {/* Divisor */}
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

                    <button
                      type="button"
                      onClick={handleExportPackage}
                      disabled={isExportingRules}
                      title="Exportar todas as regras aprovadas, apelidos e memórias em formato JSON"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      <Download size={13} className="text-primary-500" />
                      {isExportingRules ? 'Exportando...' : 'Exportar'}
                    </button>

                    <label
                      title="Importar pacote JSON de regras gerado pela exportação"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold shadow-sm cursor-pointer transition-all"
                    >
                      <Upload size={13} className="text-emerald-500" />
                      {isImportingRules ? 'Importando...' : 'Importar'}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportPackage}
                        disabled={isImportingRules}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {learningImprovements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-2">
                    <Brain className="text-gray-400" size={32} />
                    <h4 className="font-semibold text-xs text-gray-750 dark:text-gray-300">Fila de Melhorias Vazia</h4>
                    <p className="text-[11px] text-gray-500 max-w-sm">
                      {learningQueueDiagnostics?.counts?.failed > 0
                        ? 'Os jobs de aprendizado estão falhando. Visualize a última falha registrada no painel de diagnósticos acima.'
                        : 'Nenhum candidato a melhoria pendente foi encontrado. O último job de aprendizado terminou com sucesso e não detectou falhas estruturais ou de intenção na conversa.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {learningImprovements.map((item) => {
                      const isAlias = item.proposed_fix_type === 'add_product_alias';
                      // Initialize per-item alias state on first render
                      if (isAlias && improvementFilterStatus === 'pending' && !aliasReviewState[item.id]) {
                        setTimeout(() => initAliasState(item), 0);
                      }
                      const ars = aliasReviewState[item.id];
                      const altProducts: any[] = (() => {
                        try {
                          return Array.isArray(item.alternative_products)
                            ? item.alternative_products
                            : (typeof item.alternative_products === 'string' ? JSON.parse(item.alternative_products) : []);
                        } catch { return []; }
                      })();

                      return (
                        <div key={item.id} className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 shadow-sm flex flex-col gap-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedImprovementIds.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedImprovementIds(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedImprovementIds(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500 cursor-pointer"
                              />
                              <span
                                title={getIssueTypeTooltip(item.detected_issue_type)}
                                className="px-3 py-1 text-[10px] font-extrabold rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/50 uppercase tracking-wider cursor-help"
                              >
                                {formatIssueType(item.detected_issue_type)}
                              </span>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sessão: {item.source_conversation_id?.slice(0, 8)} | {new Date(item.created_at).toLocaleString('pt-BR')}</span>
                            </div>

                            {/* Botão para copiar relatório completo da melhoria */}
                            <button
                              type="button"
                              onClick={() => {
                                const report = `=== RELATÓRIO DE MELHORIA DA KAIA ===
ID: ${item.id}
Tipo: ${formatIssueType(item.detected_issue_type)}
Status: ${item.status || 'Pendente'}
Sessão: ${item.source_conversation_id || 'N/A'}
Data/Hora: ${new Date(item.created_at).toLocaleString('pt-BR')}

Mensagem do Cliente:
"${item.customer_message}"

Resposta da Kaia:
"${item.assistant_response}"

${item.detected_alias ? `Apelido Detectado: ${formatDetectedAlias(item.detected_alias)}` : ''}
${item.suggested_product_name ? `Produto Sugerido: ${item.suggested_product_name}` : ''}
${item.proposed_rule ? `Ação Corretiva: ${item.proposed_rule}` : ''}
`;
                                navigator.clipboard.writeText(report);
                                showToast('Dados da melhoria copiados para a área de transferência!', 'success');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all shadow-xs"
                              title="Copiar todos os dados desta melhoria"
                            >
                              <Copy size={13} />
                              <span>Copiar Dados</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1.5">
                              <span className="font-extrabold text-gray-900 dark:text-white text-xs">Mensagem do Cliente:</span>
                              <p className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 italic text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                "{item.customer_message}"
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <span className="font-extrabold text-gray-900 dark:text-white text-xs">Resposta da Kaia:</span>
                              <p className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 italic text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                "{item.assistant_response}"
                              </p>
                            </div>
                          </div>

                          {/* ═══ ALIAS REVIEW PANEL ═══ */}
                          {isAlias && improvementFilterStatus === 'pending' && ars ? (
                            <div className="rounded-2xl border border-amber-300/70 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-4">
                              <div className="flex items-center gap-2">
                                <Brain size={16} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300">Revisão de Apelido de Produto</span>
                              </div>

                              {/* Alias detectado + confiança */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <label className="font-semibold text-gray-700 dark:text-gray-300">Apelido Detectado</label>
                                  <div className="flex items-center gap-2">
                                    <code className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold border border-gray-300 dark:border-gray-700 text-sm">
                                      {formatDetectedAlias(item.detected_alias || item.proposed_alias)}
                                    </code>
                                    {item.suggestion_confidence !== null && item.suggestion_confidence !== undefined && (
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.suggestion_confidence >= 0.7 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                          : item.suggestion_confidence >= 0.4 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                        }`}>
                                        {Math.round(Number(item.suggestion_confidence) * 100)}%
                                      </span>
                                    )}
                                    {item.suggestion_source && (
                                      <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">{item.suggestion_source}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="font-semibold text-gray-700 dark:text-gray-300">Produto Sugerido</label>
                                  <p className="text-gray-900 dark:text-gray-100 font-bold">
                                    {item.suggested_product_name || <span className="text-gray-400 italic font-normal">Nenhum / Ambíguo</span>}
                                  </p>
                                </div>
                              </div>

                              {/* Alternativas */}
                              {altProducts.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Produtos Alternativos</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {altProducts.map((alt: any, i: number) => {
                                      const pid = alt.productId || alt.id || '';
                                      const pname = alt.productName || alt.name || alt.title || 'Produto sem nome';
                                      const conf = alt.confidence ?? alt.score ?? null;
                                      const isSelected = ars.selectedProductId === pid;
                                      return (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => updateAliasState(item.id, { selectedProductId: pid, selectedProductName: pname })}
                                          className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${isSelected
                                              ? 'border-emerald-500 bg-emerald-600 text-white font-extrabold shadow-sm'
                                              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                          <span>{pname}</span>
                                          {conf !== null && (
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isSelected
                                                ? 'bg-emerald-700 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                              }`}>
                                              {Math.round(Number(conf) * (conf <= 1 ? 100 : 1))}%
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Pesquisa completa do catálogo */}
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Buscar produto no catálogo</label>
                                <div className="relative">
                                  <input
                                    id={`alias-product-search-${item.id}`}
                                    type="text"
                                    value={ars.productSearchQuery}
                                    onChange={(e) => {
                                      searchAliasProducts(item.id, e.target.value);
                                    }}
                                    placeholder="Nome do produto..."
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                  />
                                  {ars.productSearchLoading && (
                                    <Loader2 size={14} className="absolute right-3 top-2.5 text-gray-400 animate-spin" />
                                  )}
                                </div>
                                {ars.productSearchResults.length > 0 && (
                                  <div className="border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden max-h-36 overflow-y-auto bg-white dark:bg-gray-900 shadow-md">
                                    {ars.productSearchResults.map((p: any) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => updateAliasState(item.id, {
                                          selectedProductId: p.id,
                                          selectedProductName: p.name,
                                          productSearchQuery: '',
                                          productSearchResults: []
                                        })}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-800 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                                      >
                                        {p.name} <span className="text-gray-400 ml-1">({p.category || '—'})</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Produto selecionado */}
                              {ars.selectedProductId && (
                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                                  <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  <span className="text-gray-800 dark:text-gray-200">Produto selecionado: <strong>{ars.selectedProductName}</strong></span>
                                  <button type="button" onClick={() => updateAliasState(item.id, { selectedProductId: '', selectedProductName: '' })} className="ml-auto text-gray-400 hover:text-red-500">
                                    <X size={14} />
                                  </button>
                                </div>
                              )}

                              {/* Alias editável */}
                              <div className="space-y-1">
                                <label htmlFor={`alias-edit-${item.id}`} className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Apelido a registrar (editável)</label>
                                <input
                                  id={`alias-edit-${item.id}`}
                                  type="text"
                                  value={ars.editedAlias}
                                  onChange={(e) => updateAliasState(item.id, { editedAlias: e.target.value })}
                                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                  placeholder="apelido exato"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Será normalizado (minúsculas, sem acentos, sem caracteres especiais).</p>
                              </div>

                              {/* Motivo de rejeição */}
                              {ars.showRejectReason && (
                                <div className="space-y-1">
                                  <label htmlFor={`reject-reason-${item.id}`} className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Motivo da Rejeição (opcional)</label>
                                  <input
                                    id={`reject-reason-${item.id}`}
                                    type="text"
                                    value={ars.rejectReason}
                                    onChange={(e) => updateAliasState(item.id, { rejectReason: e.target.value })}
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-400 focus:outline-none"
                                    placeholder="Ex: apelido muito ambíguo, produto não identificável..."
                                  />
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/40">
                                {ars.showRejectReason ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => updateAliasState(item.id, { showRejectReason: false, rejectReason: '' })}
                                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      id={`confirm-reject-${item.id}`}
                                      type="button"
                                      disabled={ars.rejecting}
                                      onClick={() => handleRejectWithReason(item.id)}
                                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
                                    >
                                      {ars.rejecting ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                                      Confirmar Rejeição
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      id={`reject-alias-${item.id}`}
                                      type="button"
                                      onClick={() => updateAliasState(item.id, { showRejectReason: true })}
                                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                                    >
                                      Rejeitar
                                    </button>
                                    <button
                                      id={`approve-alias-${item.id}`}
                                      type="button"
                                      disabled={ars.approving || !ars.selectedProductId || !ars.editedAlias.trim()}
                                      onClick={() => handleApproveAlias(item.id)}
                                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                      {ars.approving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                      Aprovar e Criar Regra
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Non-alias improvement or read-only view
                            <>
                              {(item.proposed_alias || item.detected_alias) && (
                                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs space-y-1">
                                  <strong className="text-purple-900 dark:text-purple-300">Apelido Detectado:</strong>{' '}
                                  <code className="px-2 py-0.5 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold border border-purple-200 dark:border-purple-800">{formatDetectedAlias(item.detected_alias || item.proposed_alias)}</code>
                                  {item.approved_alias && item.approved_alias !== (item.detected_alias || item.proposed_alias) && (
                                    <> → aprovado como <code className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">{formatDetectedAlias(item.approved_alias)}</code></>
                                  )}
                                  {item.suggested_product_name && (
                                    <span className="ml-2 text-gray-600 dark:text-gray-400">→ {item.suggested_product_name}</span>
                                  )}
                                  {item.rejection_reason && (
                                    <div className="mt-1 text-gray-500 italic">Motivo: {item.rejection_reason}</div>
                                  )}
                                </div>
                              )}

                              {item.proposed_rule && (
                                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs">
                                  <strong className="text-purple-900 dark:text-purple-300">Ação Corretiva:</strong>{' '}
                                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{item.proposed_rule}</span>
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                {improvementFilterStatus === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleReviewImprovement(item.id, 'rejected')}
                                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                                    >
                                      Rejeitar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReviewImprovement(item.id, 'applied')}
                                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                                    >
                                      Aprovar e Criar Regra
                                    </button>
                                  </>
                                )}
                                {(improvementFilterStatus === 'applied' || improvementFilterStatus === 'rejected') && (
                                  <button
                                    type="button"
                                    onClick={() => handleReviewImprovement(item.id, 'archived')}
                                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition-colors border border-amber-200 dark:border-amber-800"
                                  >
                                    Arquivar
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : learningTabSubSection === 'memories' ? (
              /* Memórias dos Clientes */
              <div className="space-y-4">
                {/* Seletor de Status das Memórias */}
                <div className="flex bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-xl p-1 w-fit gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMemoryFilterStatus('pending_admin_approval')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${memoryFilterStatus === 'pending_admin_approval'
                        ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Pendentes
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemoryFilterStatus('approved')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${memoryFilterStatus === 'approved'
                        ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Aprovadas
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemoryFilterStatus('rejected')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${memoryFilterStatus === 'rejected'
                        ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Rejeitadas
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemoryFilterStatus('archived')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${memoryFilterStatus === 'archived'
                        ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm font-bold border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    Arquivadas
                  </button>
                </div>

                {/* Bulk select bar para memórias */}
                {learningMemories.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedMemoryIds.length > 0 && selectedMemoryIds.length === learningMemories.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMemoryIds(learningMemories.map(m => m.id));
                          else setSelectedMemoryIds([]);
                        }}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500"
                      />
                      <span>Selecionar Todos</span>
                    </label>
                    {selectedMemoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteMemories}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-sm transition-all"
                      >
                        <Trash2 size={13} />
                        Excluir ({selectedMemoryIds.length})
                      </button>
                    )}
                  </div>
                )}

                {learningMemories.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">Nenhuma memória encontrada com este status.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 font-semibold w-8"></th>
                          <th className="py-2.5 px-3 font-semibold">Cliente / Sessão</th>
                          <th className="py-2.5 px-3 font-semibold">Categoria</th>
                          <th className="py-2.5 px-3 font-semibold">Preferência Extraída</th>
                          <th className="py-2.5 px-3 font-semibold">Confiança</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {learningMemories.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                            <td className="py-3 px-3">
                              <input
                                type="checkbox"
                                checked={selectedMemoryIds.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedMemoryIds(prev => [...prev, item.id]);
                                  else setSelectedMemoryIds(prev => prev.filter(id => id !== item.id));
                                }}
                                className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {item.user_id ? `ID: ${item.user_id.slice(0, 8)}` : `Sessão: ${item.session_id?.slice(0, 8)}`}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[9px]">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold">"{item.value}"</td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{(item.confidence * 100).toFixed(0)}%</td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                {(memoryFilterStatus === 'pending_admin_approval' || memoryFilterStatus === 'rejected' || memoryFilterStatus === 'archived') && (
                                  <button
                                    onClick={() => handleReviewMemory(item.id, 'approved')}
                                    className="px-2.5 py-1 text-[10px] rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors font-bold"
                                    title="Aprovar Memória"
                                  >
                                    Aprovar
                                  </button>
                                )}
                                {memoryFilterStatus === 'pending_admin_approval' && (
                                  <button
                                    onClick={() => handleReviewMemory(item.id, 'rejected')}
                                    className="px-2.5 py-1 text-[10px] rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 transition-colors font-bold"
                                    title="Rejeitar Memória"
                                  >
                                    Rejeitar
                                  </button>
                                )}
                                {memoryFilterStatus === 'approved' && (
                                  <button
                                    onClick={() => handleReviewMemory(item.id, 'archived')}
                                    className="px-2.5 py-1 text-[10px] rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 transition-colors font-bold"
                                    title="Arquivar Memória"
                                  >
                                    Arquivar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMemory(item.id, item.value)}
                                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                                  title="Excluir Definitivamente (LGPD)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Suíte de Testes de Regressão */
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-150 dark:border-gray-800">
                  <div>
                    <h4 className="font-bold text-xs text-gray-800 dark:text-white">Execução de Regressão</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Verifique a estabilidade da IA simulando intenções passadas</p>
                  </div>
                  <button
                    onClick={handleRunRegressionTests}
                    disabled={runningTestsState}
                    className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    {runningTestsState ? (
                      <>
                        <Loader2 className="animate-spin" size={13} /> Executando...
                      </>
                    ) : (
                      <>
                        <Play size={13} /> Rodar Testes
                      </>
                    )}
                  </button>
                </div>

                {testRunResults && (
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl grid grid-cols-3 gap-4 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">Total Rodados</span>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{testRunResults.totalCount}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Passaram</span>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{testRunResults.passedCount}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-semibold">Falharam</span>
                      <p className="text-lg font-bold text-red-650 dark:text-red-400 mt-1">{testRunResults.failedCount}</p>
                    </div>
                  </div>
                )}

                {learningTests.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">Nenhum caso de teste gravado ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 font-semibold">Nome</th>
                          <th className="py-2.5 px-3 font-semibold">Input do Usuário</th>
                          <th className="py-2.5 px-3 font-semibold">Esperado (Intent/Agente)</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Detalhes/Erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {learningTests.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                            <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-200">{item.name}</td>
                            <td className="py-3 px-3 italic text-gray-600 dark:text-gray-400">"{item.input_message}"</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-gray-700 dark:text-gray-300">{item.expected_intent}</span>
                              <span className="text-gray-400 dark:text-gray-500 text-[10px] block font-mono">{item.expected_agent}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${item.status === 'passed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                                  : item.status === 'failed'
                                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-red-500 dark:text-red-400 font-mono text-[10px] max-w-[200px] truncate" title={item.last_error || ''}>
                              {item.last_error || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ===== ABA 4: GESTÃO DE CHAVES DE API ===== */
        <div className="flex-1 overflow-y-auto space-y-6 pb-8 pr-2 animate-in fade-in duration-200">
          {/* Métricas de Chaves */}
          {keyStatus && (
            <div className="space-y-4">

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Total de Chaves</span>
                  <span className="text-xl font-bold text-gray-800 dark:text-white">{keyStatus.totalKeys}</span>
                </div>
                <div className="p-3.5 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-green-700 dark:text-green-400 uppercase font-semibold">Ativas</span>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">
                    {keyStats.active}
                  </span>
                </div>
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Desativadas</span>
                  <span className="text-xl font-bold text-gray-800 dark:text-white">
                    {keyStats.inactive}
                  </span>
                </div>
                <div className="p-3.5 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-green-700 dark:text-green-400 uppercase font-semibold">Saudáveis</span>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">{keyStatus.healthyKeys}</span>
                </div>
                <div className="p-3.5 bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-yellow-700 dark:text-yellow-400 uppercase font-semibold">Cooldown</span>
                  <span className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{keyStatus.cooldownKeys}</span>
                </div>
                <div className="p-3.5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-orange-700 dark:text-orange-400 uppercase font-semibold">Suspeitas</span>
                  <span className="text-xl font-bold text-orange-700 dark:text-orange-400">{keyStatus.suspectedDeadKeys}</span>
                </div>
                <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-red-700 dark:text-red-400 uppercase font-semibold">Mortas</span>
                  <span className="text-xl font-bold text-red-700 dark:text-red-400">{keyStatus.deadKeys}</span>
                </div>
                <div className="p-3.5 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-primary-700 dark:text-primary-400 uppercase font-semibold">Origem</span>
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-400 truncate mt-1">
                    {keyStatus.keySource === 'db' ? 'Banco Encriptado' : keyStatus.keySource}
                  </span>
                </div>
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Atualizado</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-white mt-1">
                    {keyStats.lastUpdated ? new Date(keyStats.lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filtros e Ação */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Busca */}
                <div className="relative w-full max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={keyFilters.search}
                    onChange={e => setKeyFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Buscar chaves..."
                    className="w-full text-xs rounded-lg pl-9 pr-3 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Provedor */}
                <select
                  value={keyFilters.provider}
                  onChange={e => setKeyFilters(f => ({ ...f, provider: e.target.value }))}
                  className="text-xs rounded-lg px-2.5 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="all">Todos Provedores</option>
                  <option value="gemini">Gemini</option>
                </select>

                {/* Saúde */}
                <select
                  value={keyFilters.healthStatus}
                  onChange={e => setKeyFilters(f => ({ ...f, healthStatus: e.target.value }))}
                  className="text-xs rounded-lg px-2.5 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="all">Todos Status Saúde</option>
                  <option value="healthy">Saudável</option>
                  <option value="cooling_down">Em Cooldown</option>
                  <option value="suspected_dead">Suspeita de Morte</option>
                  <option value="dead">Morta</option>
                </select>

                {/* Ativa/Desativada */}
                <select
                  value={keyFilters.enabled}
                  onChange={e => setKeyFilters(f => ({ ...f, enabled: e.target.value }))}
                  className="text-xs rounded-lg px-2.5 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="all">Todas Ativações</option>
                  <option value="active">Apenas Ativas</option>
                  <option value="inactive">Apenas Desativadas</option>
                </select>

                {/* Ordenação */}
                <select
                  value={keyFilters.sortBy}
                  onChange={e => setKeyFilters(f => ({ ...f, sortBy: e.target.value }))}
                  className="text-xs rounded-lg px-2.5 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="priority">Prioridade (Maior)</option>
                  <option value="name">Nome (A-Z)</option>
                  <option value="last_success">Último Sucesso</option>
                  <option value="last_error">Último Erro</option>
                  <option value="updated">Última Atualização</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => loadKeysData(true)}
                  disabled={loadingKeys || loadingKeyStatus}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all font-semibold"
                >
                  <RefreshCw size={12} className={loadingKeys || loadingKeyStatus ? 'animate-spin' : ''} />
                  Atualizar
                </button>
                <button
                  onClick={() => setShowKeyForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-700 transition-all font-semibold shadow-sm"
                >
                  <Plus size={13} /> Nova Chave
                </button>
              </div>
            </div>
          </div>

          {/* Listagem de Chaves */}
          {loadingKeys && !keys.length ? (
            <div className="flex items-center justify-center h-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKeys.map((key: AiApiKey) => {
                const isHealthy = key.enabled && key.health_status === 'healthy';
                const isCooldown = key.enabled && key.health_status === 'cooling_down';
                const isSuspected = key.enabled && key.health_status === 'suspected_dead';
                const isDead = key.health_status === 'dead';

                return (
                  <div key={key.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md flex flex-col gap-3.5 relative ${!key.enabled
                      ? 'border-gray-205 dark:border-gray-750 opacity-60'
                      : isHealthy
                        ? 'border-green-200 hover:border-green-300 dark:border-green-900/50'
                        : isCooldown
                          ? 'border-yellow-250 hover:border-yellow-350 dark:border-yellow-900/50'
                          : isSuspected
                            ? 'border-orange-250 hover:border-orange-355 dark:border-orange-900/50'
                            : 'border-red-200 hover:border-red-300 dark:border-red-900/50'
                    }`}>
                    {/* Top Row: Name and health status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{key.name}</h4>
                        <span className="text-[9px] px-1.5 py-0.2 bg-gray-105 dark:bg-gray-900 text-gray-400 font-mono rounded">
                          {key.provider}
                        </span>
                      </div>

                      {/* Action Dropdown Toggle Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === key.id ? null : key.id); }}
                          className="p-1 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <MoreVertical size={14} className="text-gray-500" />
                        </button>

                        {openMenuId === key.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-150 dark:border-gray-800 py-1.5 z-10 animate-in fade-in slide-in-from-top-2 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleTestKey(key)}
                              disabled={!!actionLoadingKey}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                            >
                              <Zap size={11} /> Testar Chave
                            </button>
                            {key.enabled ? (
                              <button
                                onClick={() => handleDisableKey(key)}
                                disabled={!!actionLoadingKey}
                                className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                              >
                                <Pause size={11} /> Desativar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnableKey(key)}
                                disabled={!!actionLoadingKey}
                                className="w-full text-left px-3 py-1.5 text-xs text-green-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                              >
                                <Play size={11} /> Ativar
                              </button>
                            )}
                            {isCooldown && (
                              <button
                                onClick={() => handleForceCooldownReset(key)}
                                disabled={!!actionLoadingKey}
                                className="w-full text-left px-3 py-1.5 text-xs text-yellow-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                              >
                                <RotateCcw size={11} /> Reset Cooldown
                              </button>
                            )}
                            {key.enabled && !isDead && (
                              <button
                                onClick={() => handleMarkDeadKey(key)}
                                disabled={!!actionLoadingKey}
                                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                              >
                                <AlertTriangle size={11} /> Marcar como Morta
                              </button>
                            )}
                            <button
                              onClick={() => openAuditLogs(key)}
                              disabled={!!actionLoadingKey}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-750 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                            >
                              <Layers size={11} /> Logs Auditoria
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                            <button
                              onClick={() => handleRemoveKey(key)}
                              disabled={!!actionLoadingKey}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5 font-semibold"
                            >
                              <Trash2 size={11} /> Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Masked Preview of key with copy button */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 flex items-center justify-between text-xs font-mono text-gray-550 border border-gray-150 dark:border-gray-800">
                      <span className="truncate mr-2">{key.key_preview}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(key.key_preview);
                          showToast('Preview copiado!');
                        }}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Copiar preview"
                      >
                        <Copy size={11} />
                      </button>
                    </div>

                    {/* Health metrics counters grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-1 border-t border-b border-gray-100 dark:border-gray-800 py-2">
                      <div className="flex flex-col">
                        <span className="text-gray-400 uppercase font-semibold">Requisições</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300 font-mono mt-0.5">{key.total_requests}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400 uppercase font-semibold">Sucessos</span>
                        <span className="font-bold text-green-600 dark:text-green-400 font-mono mt-0.5">{key.total_successes}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400 uppercase font-semibold">Falhas Seguidas</span>
                        <span className="font-bold text-red-500 font-mono mt-0.5">{key.consecutive_failures}</span>
                      </div>
                    </div>

                    {/* Health Status & Meta */}
                    <div className="flex items-center justify-between mt-auto pt-1 text-[10px] text-gray-400">
                      <span>Prioridade: <strong className="text-gray-700 dark:text-gray-300">{key.priority}</strong></span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${!key.enabled
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          : isHealthy
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                            : isCooldown
                              ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                        {!key.enabled ? 'Desativada' : key.health_status}
                      </span>
                    </div>

                    {/* Action loading overlay spinner */}
                    {actionLoadingKey && actionLoadingKey.startsWith(`${key.id}:`) && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 rounded-xl flex items-center justify-center z-10">
                        <Loader2 className="animate-spin text-primary-600" size={20} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== GAVETA DE DETALHES DE AGENTE (TABS AGENTES) ===== */}
      {selectedAgentDetail && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-950 dark:text-white text-base">{selectedAgentDetail.name}</h3>
                <span className="text-[10px] font-mono text-gray-400">{selectedAgentDetail.id}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedAgentDetail(null)}
              className="p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-505 hover:text-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Papel no Sistema</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium leading-relaxed">{selectedAgentDetail.description}</p>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Intenções Mapeadas</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {selectedAgentDetail.intents.map((intent: string) => (
                  <span key={intent} className="text-[10px] px-2.5 py-1 bg-primary-50 dark:bg-primary-950/20 text-primary-650 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 rounded-full font-medium font-mono">
                    {intent}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ferramentas (Tools) Permitidas</span>
              {selectedAgentDetail.tools && selectedAgentDetail.tools.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedAgentDetail.tools.map((tool: string) => (
                    <span key={tool} className="text-[10px] px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-full font-medium font-mono">
                      {tool}()
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1 italic">Nenhuma ferramenta de banco/serviço autorizada para este agente.</p>
              )}
            </div>

            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Instrução Base de Personalidade (System Prompt)</span>
              <div className="mt-1.5 p-3.5 rounded-xl border border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 font-mono text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {selectedAgentDetail.systemPrompt}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FORMULARIO MODAL CADASTRO CHAVE API ===== */}
      <AdminModal isOpen={showKeyForm} onClose={() => setShowKeyForm(false)} title="Nova Chave de IA">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300 mb-1">Identificador da Chave (opcional)</label>
            <input
              type="text"
              value={keyFormData.name}
              onChange={e => setKeyFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="Opcional. Em lote, o sistema gera kaia-1, kaia-2..."
              className="w-full text-xs rounded-lg px-3 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-250 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300 mb-1">Provedor</label>
            <select
              value={keyFormData.provider}
              onChange={e => setKeyFormData(f => ({ ...f, provider: e.target.value }))}
              className="w-full text-xs rounded-lg px-3 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-250 focus:outline-none"
            >
              <option value="gemini">Gemini AI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300 mb-1">Modelo Específico (opcional)</label>
            <input
              type="text"
              value={keyFormData.model}
              onChange={e => setKeyFormData(f => ({ ...f, model: e.target.value }))}
              placeholder="Vazio para usar padrão do env (ex: gemini-3.5-flash)"
              className="w-full text-xs rounded-lg px-3 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-250 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300 mb-1">Chave(s) de API Secreta(s)</label>
            <textarea
              value={keyFormData.apiKey}
              onChange={e => setKeyFormData(f => ({ ...f, apiKey: e.target.value }))}
              placeholder="Cole uma ou várias chaves. Separe por vírgula, espaço ou quebra de linha."
              rows={4}
              className="w-full text-xs rounded-lg px-3 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-250 focus:outline-none resize-y"
            />
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {parseApiKeysInput(keyFormData.apiKey).length || 0} chave(s) detectada(s). Sem identificador, os nomes serão gerados como Chave Gemini 1, Chave Gemini 2...
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300 mb-1">Prioridade na Rotação (0 = Padrão)</label>
            <input
              type="number"
              value={keyFormData.priority}
              onChange={e => setKeyFormData(f => ({ ...f, priority: Number(e.target.value) }))}
              className="w-full text-xs rounded-lg px-3 py-2 border border-gray-205 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-250 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="testOnCreate"
              checked={keyFormData.testOnCreate}
              onChange={e => setKeyFormData(f => ({ ...f, testOnCreate: e.target.checked }))}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="testOnCreate" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Testar integridade da chave no ato de criação
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
            <button
              onClick={() => setShowKeyForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateKey}
              disabled={actionLoadingKey === 'create'}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoadingKey === 'create' ? <Loader2 size={12} className="animate-spin" /> : null}
              Cadastrar
            </button>
          </div>
        </div>
      </AdminModal>

      {/* ===== MODAL DE DUPLICIDADE DE CHAVE ===== */}
      <AdminModal isOpen={!!duplicatePrompt} onClose={() => setDuplicatePrompt(null)} title="Chave já cadastrada">
        <div className="space-y-4">
          <p className="text-xs text-gray-650 dark:text-gray-350 leading-relaxed">
            {duplicatePrompt?.message}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDuplicatePrompt(null)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              Fechar
            </button>
            {duplicatePrompt?.canReactivate && duplicatePrompt.existingKey && (
              <button
                onClick={() => handleReactivateKey(duplicatePrompt.existingKey.id)}
                disabled={actionLoadingKey === 'reactivate'}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoadingKey === 'reactivate' ? <Loader2 size={12} className="animate-spin" /> : null}
                Reativar Chave Existente
              </button>
            )}
          </div>
        </div>
      </AdminModal>

      {/* ===== MODAL DE LOGS DE AUDITORIA ===== */}
      <AdminModal
        isOpen={!!auditKey}
        onClose={() => setAuditKey(null)}
        title={auditKey ? `Auditoria: ${auditKey.name}` : 'Histórico da Chave'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {auditLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary-500" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Nenhum evento registrado para esta chave.</p>
          ) : (
            <div className="relative border-l border-gray-150 dark:border-gray-800 pl-4 space-y-4 font-mono text-[10px]">
              {auditLogs.map((log: any, i: number) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary-500 border border-white dark:border-gray-900" />
                  <div className="flex flex-col gap-1 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{log.action_type}</span>
                      <span className="text-[9px] text-gray-400">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    {log.error_message && (
                      <p className="text-red-500 bg-red-50/40 dark:bg-red-950/10 p-1.5 rounded mt-1 border border-red-100 dark:border-red-900/30 whitespace-pre-wrap">{log.error_message}</p>
                    )}
                    {log.metadata && (
                      <div className="mt-1 bg-gray-100 dark:bg-gray-950 p-2 rounded text-[9px] text-gray-500 whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminModal>

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{confirmModal.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAction(confirmModal.action)}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmModalConfig && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${confirmModalConfig.variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
                  confirmModalConfig.variant === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                    'bg-primary-100 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                }`}>
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{confirmModalConfig.title}</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{confirmModalConfig.message}</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setConfirmModalConfig(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {confirmModalConfig.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                disabled={confirmModalConfig.loading}
                onClick={async () => {
                  setConfirmModalConfig(prev => prev ? { ...prev, loading: true } : null);
                  try {
                    await confirmModalConfig.onConfirm();
                  } finally {
                    setConfirmModalConfig(null);
                  }
                }}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors ${confirmModalConfig.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModalConfig.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
              >
                {confirmModalConfig.loading && <Loader2 size={13} className="animate-spin" />}
                {confirmModalConfig.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Explicativo: Como funciona o Aprendizado e a Memória da Kaia */}
      {showLearningGuideModal && (
        <AdminModal
          isOpen={showLearningGuideModal}
          onClose={() => setShowLearningGuideModal(false)}
          title="Como Funciona o Aprendizado & Memória da Kaia?"
          widthClass="max-w-2xl"
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowLearningGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
              >
                Entendi
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 text-sm">
                <Tag size={16} />
                <span>Apelido de Produto (Alias)</span>
              </div>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Quando um cliente busca um produto por um nome informal, código ou abreviação (ex: <em>"pg"</em>, <em>"whey de morango"</em>, <em>"potinho verde"</em>), a Kaia detecta essa intenção. Ao aprovar o apelido e associá-lo ao produto correto do catálogo, a Kaia aprende essa variação e passará a recomendar o produto automaticamente em todas as conversas futuras.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300 text-sm">
                <Brain size={16} />
                <span>Fila de Melhorias (Issues)</span>
              </div>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Registra desvios de intenção, dúvidas não compreendidas ou falhas de tom detectados automaticamente. O administrador pode revisar a mensagem do cliente e aprovar regras corretivas de IA com 1 clique para aperfeiçoar o comportamento do robô continuamente.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40 space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300 text-sm">
                <Sparkles size={16} />
                <span>Memória do Cliente (Long-Term)</span>
              </div>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Extrai preferências comerciais dos clientes (ex: <em>"Prefere pagar por Pix"</em> ou <em>"Só compra suplementos em cápsulas"</em>). Ao aprovar uma memória, a Kaia reutilizará essa informação em atendimentos futuros com aquele cliente específico para tornar a conversa mais rápida e personalizada.
              </p>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}



