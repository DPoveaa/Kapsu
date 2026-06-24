import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bot, Search, Filter, RefreshCw, MessageSquare, AlertTriangle,
  CheckCircle, Clock, ChevronDown,
  ShoppingCart, Tag, Truck, Package, Send, X,
  Activity, Zap, Shield, Code2, TrendingUp, ChevronUp,
  Check, AlertCircle, Loader2,
  Phone, Mail, Hash, Calendar, BarChart2,
  Headphones, Pause, Play,
  CircleDot, Layers
} from 'lucide-react';

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
  return colors[intent] || 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
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

const maskEmail = (email: string) => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone: string) => {
  if (!phone) return '';
  return phone.replace(/(\d{2})\d+(\d{2})/, '$1*****$2');
};



// ==================== PAINEL TÉCNICO (Debug) ====================
const TechnicalPanel = ({ metadata, diagnostics }: { metadata: MessageMetadata | null; diagnostics: any | null }) => {
  const [expanded, setExpanded] = useState(false);

  if (!metadata && !diagnostics) return null;

  // Se for Kaia v2, a maior parte das informações está em diagnostics
  const agent = diagnostics?.agent || metadata?.ai_provider;
  const intent = diagnostics?.intent || metadata?.intent;
  const confidence = diagnostics?.confidence ?? metadata?.confidence;
  const riskLevel = diagnostics?.riskLevel || metadata?.riskLevel;
  const conversionStage = diagnostics?.conversionStage;
  const salesOpportunity = diagnostics?.salesOpportunity;
  const toolsUsed = diagnostics?.toolsUsed || metadata?.routes_used || [];
  const model = diagnostics?.model || metadata?.ai_model;
  const processingTimeMs = diagnostics?.processingTimeMs || metadata?.processing_time_ms;
  const retrieval = diagnostics?.retrieval;
  const sales = diagnostics?.sales;
  const warnings = diagnostics?.warnings || [];

  const hasAnyData = agent || intent || riskLevel || toolsUsed.length > 0 || model || processingTimeMs;

  if (!hasAnyData) return null;

  return (
    <div className="mt-2 rounded-xl border border-violet-200 dark:border-violet-800/50 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors text-xs font-semibold text-violet-600 dark:text-violet-400"
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
              <Bot size={11} className="text-violet-500" /> Roteamento de Agente
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent && (
                <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
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
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  sales.recommendedProducts?.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  Recomendou: {sales.recommendedProducts?.length ?? 0} prod
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
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  riskLevel === 'high' || riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
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
        </div>
      )}
    </div>
  );
};

// ==================== MENSAGEM DO CHAT ====================
const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  const isAdmin = message.role === 'admin';
  const isSystem = message.role === 'system';

  const bubbleClass = isUser
    ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
    : isAdmin
    ? 'bg-blue-600 text-white rounded-tr-sm'
    : isSystem
    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 rounded-sm text-xs'
    : 'bg-violet-600 text-white rounded-tr-sm';

  const align = isUser ? 'justify-start' : 'justify-end';

  return (
    <div className={`flex ${align} mb-3 group`}>
      <div className={`max-w-[80%] ${isUser ? 'items-start' : 'items-end'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className={`text-[11px] font-semibold ${
            isUser ? 'text-gray-500 dark:text-gray-400' :
            isAdmin ? 'text-blue-500 dark:text-blue-400' :
            isSystem ? 'text-amber-600 dark:text-amber-400' :
            'text-violet-500 dark:text-violet-400'
          }`}>
            {isUser ? '👤 Cliente' : isAdmin ? '👨‍💼 Admin' : isSystem ? '⚙️ Sistema' : '🤖 Kaia'}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-600">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleClass}`}>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {/* Produtos Recomendados */}
          {message.metadata?.recommendedProducts && message.metadata.recommendedProducts.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-xs opacity-70 font-semibold">📦 Produtos recomendados:</p>
              {message.metadata.recommendedProducts.slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs opacity-90">
                  <Package size={10} />
                  <span>{p.name}</span>
                  {p.price && <span className="font-mono opacity-70">R$ {p.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Cupons de Desconto */}
          {message.metadata?.couponCards && message.metadata.couponCards.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-xs opacity-70 font-semibold">🎫 Cupons ativos:</p>
              {message.metadata.couponCards.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs opacity-90 bg-white/10 p-1.5 rounded border border-white/20">
                  <Tag size={10} />
                  <span className="font-bold font-mono">{c.code}</span>
                  <span className="opacity-80">({c.name} - {c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${c.discountValue}`} OFF)</span>
                </div>
              ))}
            </div>
          )}

          {/* Botões de Ação */}
          {(() => {
            let btns = message.metadata?.actionButtons || [];
            const hasCoupons = message.metadata?.couponCards && message.metadata.couponCards.length > 0;
            const hasProducts = message.metadata?.recommendedProducts && message.metadata.recommendedProducts.length > 0;
            const responseType = message.metadata?.response_type || message.metadata?.responseLayout;

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
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    btn.type === 'primary'
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

// ==================== CARD DE CONVERSA ====================
const ConversationCard = ({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const statusInfo = getStatusInfo(conv.status);
  const displayName = conv.customer_name || conv.name || `Visitante ${conv.session_id?.slice(0, 8)}`;
  const displayContact = conv.customer_email
    ? maskEmail(conv.customer_email)
    : conv.customer_phone
    ? maskPhone(conv.customer_phone)
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        isSelected ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-l-violet-500' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${
          conv.customer_id ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
        }`}>
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{displayName}</span>
            <span className="text-[9px] font-mono px-1 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">#{conv.id.slice(0, 4)}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {displayContact && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1">{displayContact}</p>
          )}

          {conv.last_message && (
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {conv.last_message.sender_type === 'ai' ? '🤖 ' : conv.last_message.sender_type === 'admin' ? '👨‍💼 ' : ''}
              {conv.last_message.content.slice(0, 60)}
            </p>
          )}

          {/* Flags técnicas */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(conv.last_message_at)}</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{conv.message_count} msgs</span>
            {conv.has_error && <AlertTriangle size={10} className="text-red-500" aria-label="Teve erro" />}
            {conv.has_human_support && <Headphones size={10} className="text-blue-500" aria-label="Atendimento humano" />}
            {conv.has_action && <ShoppingCart size={10} className="text-emerald-500" aria-label="Ação executada" />}
            {conv.has_recommendation && <Package size={10} className="text-violet-400" aria-label="Produto recomendado" />}
            {conv.has_promo && <Tag size={10} className="text-pink-500" aria-label="Cupom/Promoção" />}
          </div>
        </div>
      </div>
    </button>
  );
};

// ==================== TOAST SIMPLES ====================
const Toast = ({ toasts }: { toasts: { id: number; msg: string; type: 'success' | 'error' }[] }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 ${
        t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {t.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
        {t.msg}
      </div>
    ))}
  </div>
);

// ==================== COMPONENTE PRINCIPAL ====================
export default function KaiaChats() {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
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
    is_archived: 'false',
    is_ignored: 'false',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const toastIdRef = useRef(0);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Garantia de segurança adicional no runtime — redireciona se não for admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const token = localStorage.getItem('sanare_token') || sessionStorage.getItem('sanare_token');
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

  // ===== Fetch Conversations =====
  const fetchConversations = useCallback(async (p = 1, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: '30',
        ...Object.fromEntries(Object.entries(filtersRef.current).filter(([_, v]) => v)),
      });
      const res = await fetch(`${API_URL}/admin/kaia/v2/conversations?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        setConversations(data.data.conversations);
        setTotalPages(data.data.pagination.pages);
        setTotalConvs(data.data.pagination.total);
        // Conta conversas aguardando humano
        const pending = data.data.conversations.filter((c: Conversation) => c.status === 'human_needed').length;
        setPendingCount(pending);

        // Se houver uma conversa selecionada, atualiza os dados dela a partir da lista
        const currentSelected = selectedConvRef.current;
        if (currentSelected) {
          const updated = data.data.conversations.find((c: Conversation) => c.id === currentSelected.id);
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
      const res = await fetch(`${API_URL}/admin/chat/metrics`, { headers });
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
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
        setMessages(data.data.messages);
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => { fetchConversations(1); fetchMetrics(); }, []);
  useEffect(() => { fetchConversations(page); }, [filters, page, fetchConversations]);

  // Auto-refresh a cada 3 segundos
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchConversations(pageRef.current, true);
        fetchMetrics();
        if (selectedConvRef.current) fetchMessages(selectedConvRef.current.id, true);
      }, 3000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, fetchConversations, fetchMetrics, fetchMessages]);

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
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoadRef.current = false;
    } else {
      // Polling: só rola se o usuário já estiver perto do final (≤ 100px)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom <= 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // ===== Ações de Conversa =====
  const handleAction = async (action: string) => {
    if (!selectedConv) return;
    setActionLoading(action);
    try {
      let body: any = {};
      if (action === 'resolve') body = { status: 'resolved' };
      else if (action === 'pause-ai') body = { aiEnabled: false };
      else if (action === 'resume-ai') body = { aiEnabled: true };
      else if (action === 'archive') body = { isArchived: true };
      else if (action === 'unarchive') body = { isArchived: false };
      else if (action === 'ignore') body = { isIgnored: true };
      else if (action === 'unignore') body = { isIgnored: false };

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
      };
      showToast(actionLabels[action] || 'Ação executada com sucesso');
      await fetchConversations(page, true);
      await fetchMessages(selectedConv.id);
      // Atualiza a conversa selecionada com os novos dados
      const convRes = await fetch(`${API_URL}/admin/kaia/v2/conversations/${selectedConv.id}`, { headers });
      const convData = await convRes.json();
      if (convData.success) setSelectedConv(convData.data.conversation);
    } catch (err: any) {
      showToast(err.message || 'Erro ao executar ação', 'error');
      console.error('Erro ao executar ação:', err);
    } finally {
      setActionLoading('');
    }
  };

  // ===== Exportar conversa =====
  const handleExport = () => {
    if (!selectedConv || messages.length === 0) return;
    const name = selectedConv.customer_name || selectedConv.name || selectedConv.session_id;
    const lines = [
      `=== Conversa: ${name} ===`,
      `Status: ${selectedConv.status}`,
      `Data: ${new Date(selectedConv.created_at).toLocaleString('pt-BR')}`,
      `Sessão: ${selectedConv.session_id}`,
      '',
      ...messages.map(m => {
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
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central da IA — Kaia</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Diagnóstico técnico e auditoria de atendimentos</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Badge pending */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-semibold animate-pulse">
                <AlertCircle size={14} />
                {pendingCount} aguardando atendimento
              </div>
            )}
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                autoRefresh
                  ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Activity size={14} />
              {autoRefresh ? 'Auto ativo' : 'Auto off'}
            </button>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
              <BarChart2 size={14} />
              {showMetrics ? 'Ocultar métricas' : 'Ver métricas'}
            </button>
            <button
              onClick={() => { fetchConversations(page); fetchMetrics(); }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* ===== Métricas Dashboard ===== */}
      {showMetrics && metrics && (
        <div className="flex-shrink-0 mb-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Total', value: metrics.totalConversations, icon: MessageSquare, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
            { label: 'Hoje', value: metrics.todayConversations, icon: Calendar, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Humano', value: metrics.humanConversations, icon: Headphones, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Erros', value: metrics.errorConversations, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Fallback', value: `${metrics.fallbackRate}%`, icon: Activity, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Escalonamento', value: `${metrics.escalationRate}%`, icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Resp. Média', value: `${metrics.avgResponseTime}ms`, icon: Clock, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
            { label: 'Bloqueios', value: metrics.securityBlocksCount, icon: Shield, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className={`${m.bg} rounded-xl p-3 flex flex-col gap-1 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors`}>
                <div className={`flex items-center gap-1.5 ${m.color}`}>
                  <Icon size={13} />
                  <span className="text-[11px] font-semibold">{m.label}</span>
                </div>
                <span className="text-xl font-bold text-gray-800 dark:text-white">{m.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Layout Principal: Lista | Chat ===== */}
      <div className="flex flex-1 min-h-0 gap-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* ===== Painel Esquerdo: Lista de Conversas ===== */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          {/* Busca e Filtros */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <form onSubmit={handleSearch} className="flex gap-1.5 mb-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Buscar cliente, e-mail, sessão..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg border transition-colors ${showFilters ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/30 text-violet-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Filter size={14} />
              </button>
            </form>

            {showFilters && (
              <div className="space-y-1.5">
                <select
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Todos os status</option>
                  <option value="active">Ativo</option>
                  <option value="resolved">Resolvido</option>
                  <option value="human_needed">Atendimento Pendente</option>
                  <option value="human_assigned">Com Atendente</option>
                  <option value="closed">Encerrado</option>
                </select>
                <div className="flex gap-1.5">
                  <select
                    value={filters.is_archived}
                    onChange={e => setFilters(f => ({ ...f, is_archived: e.target.value }))}
                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="false">Não arquivados</option>
                    <option value="true">Arquivados</option>
                    <option value="all">Todos (Arq)</option>
                  </select>
                  <select
                    value={filters.is_ignored}
                    onChange={e => setFilters(f => ({ ...f, is_ignored: e.target.value }))}
                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="false">Não ignorados</option>
                    <option value="true">Ignorados</option>
                    <option value="all">Todos (Ign)</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={filters.has_error}
                    onChange={e => setFilters(f => ({ ...f, has_error: e.target.value }))}
                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Todos os erros</option>
                    <option value="true">Com Erro</option>
                  </select>
                  <select
                    value={filters.has_human_support}
                    onChange={e => setFilters(f => ({ ...f, has_human_support: e.target.value }))}
                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Todos suporte</option>
                    <option value="true">Com Humano</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <button
                  onClick={() => { setFilters({ search: '', status: '', has_error: '', has_human_support: '', customer_only: '', visitor_only: '', startDate: '', endDate: '', is_archived: 'false', is_ignored: 'false' }); setPage(1); }}
                  className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-0.5"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">{totalConvs} conversas</span>
              {loading && <Loader2 size={12} className="animate-spin text-violet-500" />}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-600">
                <MessageSquare size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            )}
            {conversations.map(conv => (
              <ConversationCard
                key={conv.id}
                conv={conv}
                isSelected={selectedConv?.id === conv.id}
                onClick={() => setSelectedConv(conv)}
              />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-800">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors text-gray-600 dark:text-gray-300"
              >
                ← Anterior
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">{page}/{totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors text-gray-600 dark:text-gray-300"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>

        {/* ===== Painel Direito: Conversa ===== */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-950">
            {/* Header da Conversa */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold ${
                    selectedConv.customer_id ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-850 dark:text-gray-300 font-medium">
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
                      onClick={() => handleAction('archive')}
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
                      onClick={() => handleAction('pause-ai')}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'pause-ai' ? <Loader2 size={11} className="animate-spin" /> : <Pause size={11} />}
                      Pausar IA
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('resume-ai')}
                      disabled={!!actionLoading}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'resume-ai' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                      Retomar IA
                    </button>
                  )}
                  {/* Exportar conversa */}
                  <button
                    onClick={handleExport}
                    disabled={messages.length === 0}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Exportar conversa como texto"
                  >
                    <Truck size={11} />
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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-medium flex items-center gap-1">
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
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
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
                  <div ref={messagesEndRef} />
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
                  className="flex-1 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 px-1">
                Ao responder, a IA é pausada automaticamente e a conversa é atribuída a você.
              </p>
            </div>
          </div>
        ) : (
          /* Estado Vazio */
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-600">
            <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={36} className="text-violet-400 dark:text-violet-500" />
            </div>
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-center max-w-xs">
              Escolha uma conversa na lista à esquerda para visualizar as mensagens e o diagnóstico técnico da IA.
            </p>

            {/* Top Intenções inline */}
            {metrics && metrics.topIntents.length > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 w-80">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-3 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-violet-500" />
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
                            className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
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
    </div>
  );
}
