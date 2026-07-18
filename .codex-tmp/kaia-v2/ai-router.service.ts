import { z } from 'zod';
import { getAPIKeyManager } from '../api-key-manager.service';
import { classifyGeminiError, generateGeminiContentWithMetadata, type GeminiContentResult, type GeminiErrorCategory } from '../gemini-client.service';
import { resolveGeminiModel } from '../../config/gemini-models';
import { getConversationEntityResolver } from './entity-resolver.service';
import { SensitiveGoalIntentResolver } from './sensitive-goal-intent-resolver.service';
import { isCartClearIntent } from './cart-clear-intent.util';
import { detectFreeShippingIntent, isFreeShippingIntent, isProductPromotionIntent } from './free-shipping-intent.util';
import db from '../../lib/db';
import { getProductResolver } from './product-resolver.service';

export interface RouteResult {
  intent: string;
  confidence: number;
  selectedAgent: string;
  reason: string;
  requiredTools: string[];
  riskLevel: 'low' | 'medium' | 'high';
  needsAuth: boolean;
  salesOpportunity: boolean;
  conversionStage: 'awareness' | 'consideration' | 'cart_building' | 'checkout' | 'post_purchase' | 'support';
  resolvedEntity?: any;
  customerGoal?: string | null;
  goalSummary?: string | null;
  needsClarification?: boolean;
  healthSensitivity?: 'low' | 'medium' | 'high';
}

export interface IntentConfig {
  intent: string;
  selectedAgent: string;
  requiredTools: string[];
  needsAuth: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  conversionStage: 'awareness' | 'consideration' | 'cart_building' | 'checkout' | 'post_purchase' | 'support';
  salesOpportunity: boolean;
}

export const INTENT_MAP: Record<string, IntentConfig> = {
  product_recommendation: {
    intent: 'product_recommendation',
    selectedAgent: 'ProductRecommendationAgent',
    requiredTools: ['semanticSearchProducts', 'graphSearchProducts'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'awareness',
    salesOpportunity: true
  },
  product_comparison: {
    intent: 'product_comparison',
    selectedAgent: 'ProductComparisonAgent',
    requiredTools: ['semanticSearchProducts', 'graphSearchProducts'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'consideration',
    salesOpportunity: true
  },
  product_details: {
    intent: 'product_details',
    selectedAgent: 'ProductDetailsAgent',
    requiredTools: ['getProductById'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'consideration',
    salesOpportunity: true
  },
  sales_question: {
    intent: 'sales_question',
    selectedAgent: 'SalesAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'consideration',
    salesOpportunity: false
  },
  objection_price: {
    intent: 'objection_price',
    selectedAgent: 'ObjectionHandlingAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'consideration',
    salesOpportunity: true
  },
  objection_trust: {
    intent: 'objection_trust',
    selectedAgent: 'ObjectionHandlingAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'consideration',
    salesOpportunity: true
  },
  objection_shipping: {
    intent: 'objection_shipping',
    selectedAgent: 'ObjectionHandlingAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'consideration',
    salesOpportunity: true
  },
  cart_query: {
    intent: 'cart_query',
    selectedAgent: 'CartAgent',
    requiredTools: ['getCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  cart_clear: {
    intent: 'cart_clear',
    selectedAgent: 'CartAgent',
    requiredTools: ['getCustomerCart', 'clearCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: false
  },
  cart_add: {
    intent: 'cart_add',
    selectedAgent: 'CartAgent',
    requiredTools: ['addProductToCart', 'getCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  cart_remove: {
    intent: 'cart_remove',
    selectedAgent: 'CartAgent',
    requiredTools: ['removeProductFromCart', 'getCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  checkout_help: {
    intent: 'checkout_help',
    selectedAgent: 'CheckoutAgent',
    requiredTools: ['getCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'checkout',
    salesOpportunity: true
  },
  order_status: {
    intent: 'order_status',
    selectedAgent: 'OrdersAgent',
    requiredTools: ['getCustomerOrders'],
    needsAuth: true,
    riskLevel: 'low',
    conversionStage: 'post_purchase',
    salesOpportunity: false
  },
  shipping_quote: {
    intent: 'shipping_quote',
    selectedAgent: 'ShippingAgent',
    requiredTools: ['simulateShipping'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  free_shipping_info: {
    intent: 'free_shipping_info',
    selectedAgent: 'FreeShippingAgent',
    requiredTools: ['getFreeShippingRules', 'getCustomerCart', 'calculateFreeShippingProgress', 'checkFreeShippingEligibility'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  promotions_query: {
    intent: 'promotions_query',
    selectedAgent: 'PromotionsAgent',
    requiredTools: ['getActivePromotions'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  coupons_query: {
    intent: 'coupons_query',
    selectedAgent: 'CouponsAgent',
    requiredTools: ['getPublicCoupons'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  discounts_query: {
    intent: 'discounts_query',
    selectedAgent: 'DiscountsAgent',
    requiredTools: ['getPublicCoupons', 'getActivePromotions'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  account_password: {
    intent: 'account_password',
    selectedAgent: 'AccountSupportAgent',
    requiredTools: ['getAccountSupportRoutes'],
    needsAuth: false,
    riskLevel: 'medium',
    conversionStage: 'support',
    salesOpportunity: false
  },
  account_email_change: {
    intent: 'account_email_change',
    selectedAgent: 'AccountSupportAgent',
    requiredTools: ['getAccountSupportRoutes'],
    needsAuth: true,
    riskLevel: 'high',
    conversionStage: 'support',
    salesOpportunity: false
  },
  account_cpf_change: {
    intent: 'account_cpf_change',
    selectedAgent: 'AccountSupportAgent',
    requiredTools: ['getAccountSupportRoutes'],
    needsAuth: true,
    riskLevel: 'high',
    conversionStage: 'support',
    salesOpportunity: false
  },
  human_support_request: {
    intent: 'human_support_request',
    selectedAgent: 'HumanSupportAgent',
    requiredTools: ['requestHumanSupport'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'support',
    salesOpportunity: false
  },
  return_to_ai: {
    intent: 'return_to_ai',
    selectedAgent: 'HumanSupportAgent',
    requiredTools: ['returnConversationToAI'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'support',
    salesOpportunity: false
  },
  prompt_injection_attempt: {
    intent: 'prompt_injection_attempt',
    selectedAgent: 'FallbackAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'high',
    conversionStage: 'support',
    salesOpportunity: false
  },
  clarification_needed: {
    intent: 'clarification_needed',
    selectedAgent: 'HealthClarificationAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'medium',
    conversionStage: 'support',
    salesOpportunity: false
  },
  free_shipping_check: {
    intent: 'free_shipping_check',
    selectedAgent: 'FreeShippingAgent',
    requiredTools: ['checkFreeShippingEligibility'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  product_disambiguation: {
    intent: 'product_disambiguation',
    selectedAgent: 'CartAgent',
    requiredTools: ['getCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  cart_add_confirm_required: {
    intent: 'cart_add_confirm_required',
    selectedAgent: 'CartAgent',
    requiredTools: ['getCustomerCart'],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'cart_building',
    salesOpportunity: true
  },
  account_profile: {
    intent: 'account_profile',
    selectedAgent: 'AccountSupportAgent',
    requiredTools: ['getAccountSupportRoutes'],
    needsAuth: true,
    riskLevel: 'medium',
    conversionStage: 'support',
    salesOpportunity: false
  },
  unknown: {
    intent: 'unknown',
    selectedAgent: 'FallbackAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'awareness',
    salesOpportunity: false
  }
};

export type ValidIntent = keyof typeof INTENT_MAP;

export function getAgentForIntent(intent: string): string {
  return INTENT_MAP[intent]?.selectedAgent || 'FallbackAgent';
}

export function isValidIntent(intent: string): intent is ValidIntent {
  return intent in INTENT_MAP;
}


const VALID_INTENTS = Object.keys(INTENT_MAP);
const VALID_AGENTS = Array.from(new Set(Object.values(INTENT_MAP).map((config) => config.selectedAgent)));
const ROUTER_MAX_OUTPUT_TOKENS = 512;
const ROUTER_REPAIR_MAX_OUTPUT_TOKENS = 256;
const ROUTER_THINKING_CONFIG = { thinkingBudget: 0 } as const;
const MAX_TOKEN_FINISH_REASONS = new Set(['MAX_TOKENS', 'TOKEN_LIMIT', 'LENGTH']);

export const ROUTER_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: VALID_INTENTS },
    selectedAgent: { type: 'STRING', enum: VALID_AGENTS },
    confidence: { type: 'NUMBER' },
    reasonCode: { type: 'STRING' },
    reason: { type: 'STRING' },
    salesOpportunity: { type: 'BOOLEAN' },
    customerGoal: { type: 'STRING', nullable: true },
    goalSummary: { type: 'STRING', nullable: true },
    needsClarification: { type: 'BOOLEAN' },
    healthSensitivity: { type: 'STRING', enum: ['low', 'medium', 'high'] }
  },
  required: ['intent', 'selectedAgent', 'confidence', 'salesOpportunity', 'customerGoal', 'goalSummary', 'needsClarification', 'healthSensitivity']
};

const RouterResponseZod = z.object({
  intent: z.string(),
  selectedAgent: z.string(),
  confidence: z.number().finite().min(0).max(1),
  reasonCode: z.string().optional(),
  reason: z.string().optional(),
  salesOpportunity: z.boolean().optional(),
  customerGoal: z.string().trim().min(1).max(180).nullable().optional(),
  goalSummary: z.string().trim().min(1).max(220).nullable().optional(),
  needsClarification: z.boolean().optional(),
  healthSensitivity: z.enum(['low', 'medium', 'high']).optional()
}).passthrough();

export type RouterParseResult =
  | { ok: true; value: { intent: string; selectedAgent: string; confidence: number; reasonCode: string; salesOpportunity: boolean; customerGoal: string | null; goalSummary: string | null; needsClarification: boolean; healthSensitivity: 'low' | 'medium' | 'high' } }
  | { ok: false; errorCategory: 'empty_response' | 'invalid_json' | 'invalid_shape' | 'invalid_intent' | 'invalid_agent' | 'intent_agent_mismatch' | 'truncated_output'; sanitizedPreview: string; finishReason?: string | null };

export function parseRouterResponse(response: unknown, finishReason?: string | null): RouterParseResult {
  const { parseStrictJsonObject } = require('./structured-output.service');
  const parsed = parseStrictJsonObject(response, finishReason);
  if (!parsed.ok) return parsed;

  const shaped = RouterResponseZod.safeParse(parsed.value);
  if (!shaped.success) {
    return { ok: false, errorCategory: 'invalid_shape', sanitizedPreview: String(response || '').slice(0, 220), finishReason };
  }

  const value = shaped.data;
  if (!isValidIntent(value.intent)) {
    return { ok: false, errorCategory: 'invalid_intent', sanitizedPreview: String(response || '').slice(0, 220), finishReason };
  }
  const intentConfig = INTENT_MAP[value.intent];
  if (!VALID_AGENTS.includes(value.selectedAgent)) {
    return { ok: false, errorCategory: 'invalid_agent', sanitizedPreview: String(response || '').slice(0, 220), finishReason };
  }
  if (value.selectedAgent !== intentConfig.selectedAgent) {
    return { ok: false, errorCategory: 'intent_agent_mismatch', sanitizedPreview: String(response || '').slice(0, 220), finishReason };
  }

  return {
    ok: true,
    value: {
      intent: value.intent,
      selectedAgent: value.selectedAgent,
      confidence: value.confidence,
      reasonCode: value.reasonCode || value.reason || 'llm_route',
      salesOpportunity: value.salesOpportunity ?? INTENT_MAP[value.intent].salesOpportunity,
      customerGoal: value.customerGoal ?? null,
      goalSummary: value.goalSummary ?? null,
      needsClarification: value.needsClarification ?? false,
      healthSensitivity: value.healthSensitivity ?? 'low'
    }
  };
}
export function isAmbiguousHealthSensitive(message: string): boolean {
  const norm = String(message || '').toLowerCase().trim();
  const hasSymptom = /\b(dor|passando mal|sintoma estranho|n[aã]o estou bem|estou doente|dor de cabe[cç]a|tenho dor|dor no corpo|dor forte)\b/i.test(norm);
  if (!hasSymptom) return false;
  const hasQualifier = /\b(colica|cólica|muscular|articula|costas|garganta|estomago|estômago|dente|ouvido|perna|joelho|ombro|tórax|peito|incha|desinchar|emagrecer|perder peso|libido|cabelo|imunidade|vitamina|suplemento)\b/i.test(norm);
  return !hasQualifier;
}

export class AiRouter {
  private apiKeyManager = getAPIKeyManager();

  /**
   * Tenta fazer o roteamento local estático para economizar requisições e garantir velocidade.
   * Regra: apenas comandos altamente explícitos são mapeados aqui.
   */
  private async matchLocalRoute(normMsg: string, isAuthenticated: boolean, conversationId?: string): Promise<RouteResult | null> {
    // 1. Obvious prompt-injection attempts
    const isPromptInjection = /ignore.*instructions|ignore.*rules|ignorar.*regras|ignorar.*instru|system.*prompt|prompt.*sistema|revel.*prompt|mostr.*prompt|reveal.*prompt|show.*prompt/i.test(normMsg);
    if (isPromptInjection) {
      const config = INTENT_MAP.prompt_injection_attempt;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por tentativa de injeção de prompt'
      };
    }

    // 2. Return to AI
    if (/\b(voltar para (a )?kaia|retornar para (a )?ia|voltar para ia|retornar para kaia)\b/i.test(normMsg)) {
      const config = INTENT_MAP.return_to_ai;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por retorno à IA'
      };
    }


    // 2a. Commercial preference statements: safe conversational route, no products/actions.
    if (/\b(prefiro|preferencia|prefer[�e]ncia|gosto de|gostaria de pagar|pagar por pix|via pix)\b/i.test(normMsg)) {
      const config = INTENT_MAP.unknown;
      return {
        ...config,
        confidence: 0.95,
        reason: 'Roteamento local por declaracao de preferencia comercial'
      };
    }
    // 2b. Coupons (deterministic; before promotions)
    if (/\b(cupom|cupons|coupon|coupons)\b/i.test(normMsg)) {
      const config = INTENT_MAP.coupons_query;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por intenção de cupons'
      };
    }

    // 2c. Product promotions (deterministic; must not require Gemini)
    // Checked before broad discounts so "produtos com desconto" stays promotions_query
    if (isProductPromotionIntent(normMsg)) {
      const config = INTENT_MAP.promotions_query;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por intenção de promoções de produto'
      };
    }

    // 2d. Broad discounts (cupons + promoções) — after product-only promotions
    if (
      /\b(desconto|descontos|tem desconto|algum desconto|tem algum desconto)\b/i.test(normMsg) &&
      !/\b(promocao|promocoes|promo|oferta|ofertas|produto|produtos)\b/i.test(normMsg)
    ) {
      const config = INTENT_MAP.discounts_query;
      return {
        ...config,
        confidence: 0.95,
        reason: 'Roteamento local por pergunta ampla de descontos'
      };
    }

    // 2e. Free shipping info (deterministic)
    if (isFreeShippingIntent(normMsg)) {
      const detection = detectFreeShippingIntent(normMsg);
      const config = INTENT_MAP.free_shipping_info;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por intenção de frete grátis',
        resolvedEntity: {
          freeShippingIntentDetected: true,
          freeShippingIntentSource: detection.source,
          matchedConcepts: detection.matchedConcepts,
          promotionIntentSuppressed: detection.promotionIntentSuppressed
        }
      };
    }

    // 3. Request human support
    if (
      /\b(atendente|humano|suporte|operator|atend)\b/i.test(normMsg) ||
      /\b(atendimento humano|suporte humano|falar com (um )?(atendente|humano|alguem)|chamar (um )?(atendente|humano|alguem)|conversar com (um )?(atendente|humano|alguem)|falar com (o )?suporte|quero (um )?atendente|quero falar com)\b/i.test(normMsg)
    ) {
      // Avoid false positives like "suplemento" alone — require support context
      if (
        /\b(atendente|humano|operator)\b/i.test(normMsg) ||
        /\b(falar|chamar|conversar|quero|preciso|solicitar|pedir).{0,40}\b(atendente|humano|suporte|alguem)\b/i.test(normMsg) ||
        /\b(atendimento|suporte)\s+humano\b/i.test(normMsg)
      ) {
        const config = INTENT_MAP.human_support_request;
        return {
          ...config,
          confidence: 1.0,
          reason: 'Roteamento local por palavra-chave de suporte humano'
        };
      }
    }

    // 4. Clear the cart
    if (isCartClearIntent(normMsg)) {
      const config = INTENT_MAP.cart_clear;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por limpeza total do carrinho'
      };
    }

    // Resolvendo entidades (produto, CEP) para remoção, adição ou frete
    let resolvedEntity: any = null;
    if (conversationId) {
      try {
        const resolver = getConversationEntityResolver();
        resolvedEntity = await resolver.resolve(normMsg, conversationId);
      } catch (err) {}
    }

    if (!resolvedEntity || resolvedEntity.type !== 'product') {
      try {
        const productResolver = getProductResolver();
        const matches = await productResolver.resolve(normMsg, conversationId);
        if (matches.length > 0) {
          resolvedEntity = {
            type: 'product',
            id: matches[0].id,
            name: matches[0].name,
            source: 'product_database_fallback'
          };
        }
      } catch (err) {}
    }

    const hasProduct = !!resolvedEntity && resolvedEntity.type === 'product';

    // 5. Remove clearly identified product
    const hasRemoveVerb = /\b(remover|retirar|excluir|deletar|tirar|tira|remove|remova|exclui|apaga|apagar|apague|retire|exclua)\b/i.test(normMsg);
    if (hasRemoveVerb && hasProduct) {
      const config = INTENT_MAP.cart_remove;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local: intenção de remover produto com entidade ou match de produto',
        resolvedEntity
      };
    }

    // 6. Add clearly identified product and quantity
    const hasAddVerb = /\b(adicionar|adiciona|adicione|add|colocar|coloca|coloque|botar|bota|bote|inserir|insere|insira|põe|poe|ponha|comprar|compra|compre|manda|enviar|envia|adicionando|colocando|botando|inserindo|ponho|ponha|leva|levar|pegar|pega|bota|unidade|unidades)\b/i.test(normMsg);
    const hasQty = /\b(\d+|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\b/i.test(normMsg);
    if (hasProduct && (hasAddVerb || hasQty)) {
      const config = INTENT_MAP.cart_add;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local: intenção de adicionar produto com entidade resolvida',
        resolvedEntity
      };
    }

    // 6b. Quantity correction without repeating product name (e.g. "Não, muda para 3 unidades")
    if (
      hasQty &&
      /\b(muda|mude|mudar|altera|altere|alterar|troca|troque|trocar|corrige|corrija|corrigir|quantidade|unidades?)\b/i.test(normMsg) &&
      (/\b(n[aã]o|nao)\b/i.test(normMsg) || /\b(para|pra)\s+\d+\b/i.test(normMsg))
    ) {
      const config = INTENT_MAP.cart_add;
      return {
        ...config,
        confidence: 0.9,
        reason: 'Roteamento local: correção explícita de quantidade do carrinho'
      };
    }

    // 7. Shipping quote with a valid CEP
    const cepRegex = /\b\d{5}-?\d{3}\b/;
    const hasValidCep = cepRegex.test(normMsg);
    if (hasValidCep && /\b(frete|prazo|cep|correio|entrega|envio|demora|quanto fica o frete)\b/i.test(normMsg)) {
      const config = INTENT_MAP.shipping_quote;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por palavra-chave de frete com CEP válido'
      };
    }

    // 7b. Clear shipping quote questions without CEP (deterministic; Gemini must not be required)
    if (
      !hasValidCep &&
      /\b(frete|envio|entrega|correios?|sedex|pac)\b/i.test(normMsg) &&
      /\b(quanto|custa|valor|pre[cç]o|calcular|calcule|simular|consultar|consulta|prazo|demora)\b/i.test(normMsg) &&
      !/\b(gratis|gr[aá]tis|frete gratis|frete grátis|promo[cç][aã]o de frete)\b/i.test(normMsg)
    ) {
      const config = INTENT_MAP.shipping_quote;
      return {
        ...config,
        confidence: 0.95,
        reason: 'Roteamento local por pergunta explícita de frete/envio sem CEP'
      };
    }

    // 8. Explicit account actions
    if (/\b(senha|alterar senha|mudar senha|esqueci a senha|trocar senha|redefinir senha)\b/i.test(normMsg)) {
      const config = INTENT_MAP.account_password;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por palavra-chave de alteração de senha'
      };
    }
    if (/\b(mudar email|alterar email|trocar email|mudar e-mail|alterar e-mail)\b/i.test(normMsg)) {
      const config = INTENT_MAP.account_email_change;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por palavra-chave de alteração de email'
      };
    }
    if (/\b(mudar cpf|alterar cpf|trocar cpf|atualizar cpf)\b/i.test(normMsg)) {
      const config = INTENT_MAP.account_cpf_change;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por palavra-chave de alteração de CPF'
      };
    }

    return null;
  }

  /**
   * Roteia a mensagem determinando a intenção e o agente correto
   */
  async route(
    message: string,
    isAuthenticated: boolean,
    lastIntent = 'unknown',
    lastStage: RouteResult['conversionStage'] = 'awareness',
    conversationId?: string,
    state?: any
  ): Promise<RouteResult> {
    const normMsg = message.toLowerCase().trim();

    const ruleRepo = require('./rule-repository.service').getRuleRepository();
    const customRoute = await ruleRepo.findMatchingIntentRule(message);
    if (customRoute) {
      const config = INTENT_MAP[customRoute.target_value];
      if (config) {
        return {
          ...config,
          confidence: 1.0,
          reason: `Roteamento por regra aprovada ${customRoute.id}`
        };
      }
    }

    // 2. Deterministic Cart Command Parser (runs before LLM)
    const { parseCartCommand } = require('./cart-parser.service');
    const parsedCart = parseCartCommand(message);
    if (parsedCart.isCartCommand) {
      const config = INTENT_MAP[parsedCart.intent!];
      if (config) {
        return {
          ...config,
          confidence: 1.0,
          reason: 'Deterministic cart command parsing'
        };
      }
    }

    // In non-live mode, use local routing only unless a scoped provider mock is installed.
    if ((state?.executionContext?.executionMode === 'regression_test' || state?.executionContext?.executionMode === 'admin_replay') && !(global as any).geminiMockHandler) {
      const localMatch = await this.matchLocalRoute(normMsg, isAuthenticated, conversationId);
      if (localMatch) return localMatch;
      const fallbackConfig = INTENT_MAP.unknown;
      return {
        ...fallbackConfig,
        confidence: 0.1,
        reason: 'Request-scoped non-live mode: LLM bypass, no local match'
      };
    }

    // Also check coupons/promotions/free-shipping early in route() before LLM
    if (/\b(cupom|cupons|coupon|coupons)\b/i.test(message)) {
      const config = INTENT_MAP.coupons_query;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por intenção de cupons'
      };
    }

    if (isProductPromotionIntent(message)) {
      const config = INTENT_MAP.promotions_query;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por intenção de promoções de produto'
      };
    }

    if (
      /\b(desconto|descontos|tem desconto|algum desconto|tem algum desconto)\b/i.test(message) &&
      !/\b(promocao|promocoes|promo|oferta|ofertas|cupom|cupons|produto|produtos)\b/i.test(
        message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      )
    ) {
      const config = INTENT_MAP.discounts_query;
      return {
        ...config,
        confidence: 0.95,
        reason: 'Roteamento local por pergunta ampla de descontos'
      };
    }

    if (isFreeShippingIntent(message)) {
      const detection = detectFreeShippingIntent(message);
      const config = INTENT_MAP.free_shipping_info;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local por intenção de frete grátis',
        resolvedEntity: {
          freeShippingIntentDetected: true,
          freeShippingIntentSource: detection.source,
          matchedConcepts: detection.matchedConcepts,
          promotionIntentSuppressed: detection.promotionIntentSuppressed
        }
      };
    }

    // Health safety mode check
    if (isAmbiguousHealthSensitive(normMsg)) {
      const config = INTENT_MAP.clarification_needed;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Sintoma amplo de saúde sem especificador comercial.'
      };
    }

    // 1. Tenta resolução de entidade contextual (prioridade máxima para detalhes de produto)
    let lastRejectedCartAdd: any = null;
    if (conversationId) {
      const rejectedRows = await db('customer_conversation_events')
        .where({ conversation_id: conversationId, event_type: 'last_rejected_cart_add' })
        .orderBy('created_at', 'desc')
        .limit(5);

      const expirationThresholdMs = 5 * 60 * 1000;
      for (const row of rejectedRows) {
        try {
          const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          const createdAtTime = new Date(row.created_at || metadata.createdAt).getTime();
          if (Date.now() - createdAtTime < expirationThresholdMs) {
            lastRejectedCartAdd = metadata;
            break;
          }
        } catch (e) {}
      }
    }

    const isCorrectionPhrase = lastRejectedCartAdd && (
      /\b(entao|então|pode ser|quero|coloca|bota|faz|os 100|cem)\b/i.test(normMsg) ||
      /\b\d+\b/i.test(normMsg)
    );

    if (isCorrectionPhrase) {
      const config = INTENT_MAP.cart_add;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local: correcao de quantidade de carrinho rejeitada anteriormente'
      };
    }

    // Resolução de entidade contextual
    let resolvedEntity: any = null;
    if (conversationId) {
      try {
        const resolver = getConversationEntityResolver();
        resolvedEntity = await resolver.resolve(message, conversationId);
        if (resolvedEntity) {
          const isProductDetailQuery = 
            resolvedEntity.source === 'ordinal_reference' ||
            /\b(o que|oq|para que|como funciona|como usar|modo de uso|me explica|explica|fala mais|fale mais|qual a diferen|bom para|serve para|serve pra|serve pro|esse|primeiro|segundo|ultimo)\b/i.test(normMsg);

          if (isProductDetailQuery) {
            const config = INTENT_MAP.product_details;
            return {
              ...config,
              confidence: resolvedEntity.confidence,
              reason: `Roteamento contextual de detalhes do produto resolvida: ${resolvedEntity.name} (Source: ${resolvedEntity.source})`,
              resolvedEntity
            };
          }
        }
      } catch (err) {
        console.error('[AiRouter] Erro na resolucao de entidade:', err);
      }
    }

    const sensitiveMatch = SensitiveGoalIntentResolver.resolve(message);
    if (sensitiveMatch) {
      return sensitiveMatch;
    }

    const hasRemoveVerb = /\b(remover|retirar|excluir|deletar|tirar|tira|remove|remova|exclui|apaga|apagar|apague|retire|exclua)\b/i.test(normMsg);
    let hasProduct = !!resolvedEntity;
    if (!hasProduct) {
      const productResolver = getProductResolver();
      const matches = await productResolver.resolve(message, conversationId);
      if (matches.length > 0) {
        hasProduct = true;
        resolvedEntity = {
          type: 'product',
          id: matches[0].id,
          name: matches[0].name,
          source: 'product_database_fallback'
        };
      }
    }

    if (hasRemoveVerb && hasProduct) {
      const config = INTENT_MAP.cart_remove;
      return {
        ...config,
        confidence: 1.0,
        reason: 'Roteamento local: intencao de remover produto com entidade ou match de produto',
        resolvedEntity
      };
    }

    // 2. Tenta roteamento por regras de palavras-chave locais
    const localMatch = await this.matchLocalRoute(normMsg, isAuthenticated, conversationId);
    if (localMatch) {
      return localMatch;
    }

    // 3. Roteamento inteligente por IA quando houver ambiguidade
    const safeContext = {
      history: state?.history ? state.history.slice(-5).map((h: any) => `${h.role === 'user' ? 'Cliente' : 'Kaia'}: ${h.content}`) : [],
      summary: state?.conversationContext?.recentMessagesSummary || 'Nenhum resumo disponivel',
      pendingAction: state?.pendingAction ? JSON.stringify(state.pendingAction) : 'Nenhuma acao pendente',
      lastMentionedProduct: state?.conversationContext?.lastMentionedProduct ? `${state.conversationContext.lastMentionedProduct.name} (ID: ${state.conversationContext.lastMentionedProduct.id})` : 'Nenhum',
      lastMentionedCategory: state?.conversationContext?.lastMentionedCategory?.query || 'Nenhuma',
      resolvedEntities: state?.resolvedEntities ? JSON.stringify(state.resolvedEntities) : 'Nenhuma',
      currentCartSummary: state?.clientCartInfo ? `Itens: ${state.clientCartInfo.itemCount || 0}, Total: R$ ${state.clientCartInfo.total || 0}` : 'Carrinho vazio ou nao carregado',
      approvedPreferences: state?.conversationContext?.approvedCustomerMemory ? state.conversationContext.approvedCustomerMemory.map((m: any) => `${m.category}: ${m.value}`).join(', ') : 'Nenhuma',
      lastIntent,
      lastStage
    };

    const model = resolveGeminiModel('chat');
    const prompt = this.buildRoutingPrompt(message, safeContext);
    const buildRoute = (parsedValue: any, reasonPrefix: string, diagnostics: any): RouteResult => {
      const intentConfig = INTENT_MAP[parsedValue.intent];
      return {
        intent: intentConfig.intent,
        confidence: parsedValue.confidence,
        selectedAgent: intentConfig.selectedAgent,
        reason: `${reasonPrefix}: ${parsedValue.reasonCode || 'structured_output'}`,
        requiredTools: intentConfig.requiredTools,
        riskLevel: intentConfig.riskLevel,
        needsAuth: intentConfig.needsAuth,
        salesOpportunity: !!parsedValue.salesOpportunity,
        conversionStage: intentConfig.conversionStage,
        customerGoal: parsedValue.customerGoal,
        goalSummary: parsedValue.goalSummary,
        needsClarification: parsedValue.needsClarification,
        healthSensitivity: parsedValue.healthSensitivity,
        resolvedEntity: {
          customerGoal: parsedValue.customerGoal,
          goalSummary: parsedValue.goalSummary,
          needsClarification: parsedValue.needsClarification,
          healthSensitivity: parsedValue.healthSensitivity,
          routerDiagnostics: {
            ...diagnostics,
            routerFinalStatus: 'success'
          }
        }
      };
    };

    let firstParse: RouterParseResult | null = null;
    let providerErrorCategory: GeminiErrorCategory | 'max_tokens' | null = null;
    let providerErrorCode: string | null = null;
    let finalDiagnostics: any = null;
    const attemptDiagnostics: any[] = [];
    const isMaxTokens = (finishReason?: string | null) => MAX_TOKEN_FINISH_REASONS.has(String(finishReason || '').toUpperCase());
    const keyContext = () => this.apiKeyManager.getLastExecutionContext();
    const recordAttempt = (
      label: string,
      result: GeminiContentResult,
      parseResult: RouterParseResult | null,
      repairAttempted = false
    ) => {
      const context = keyContext();
      const diagnostic = {
        label,
        model: result.model,
        finishReason: result.finishReason,
        promptTokenCount: result.promptTokenCount,
        candidateTokenCount: result.candidateTokenCount,
        thoughtsTokenCount: result.thoughtsTokenCount,
        totalTokenCount: result.totalTokenCount,
        maxOutputTokens: result.configuredMaxOutputTokens,
        thinkingConfig: result.thinkingConfig,
        responseTextLength: result.text.length,
        providerErrorCategory: isMaxTokens(result.finishReason) ? 'max_tokens' : null,
        providerErrorCode: result.finishReason || null,
        keyIndex: typeof context?.keyIndex === 'number' ? context.keyIndex : null,
        routerParseResult: parseResult ? (parseResult.ok ? 'ok' : parseResult.errorCategory) : null,
        routerRepairAttempted: repairAttempted,
        aiResponseComplete: !isMaxTokens(result.finishReason)
      };
      attemptDiagnostics.push(diagnostic);
      return diagnostic;
    };
    const recordProviderError = (label: string, err: any) => {
      const context = keyContext();
      const category = (err?.category as GeminiErrorCategory | undefined) || classifyGeminiError(err);
      providerErrorCategory = category;
      providerErrorCode = err?.code ? String(err.code) : err?.status ? String(err.status) : null;
      attemptDiagnostics.push({
        label,
        model,
        finishReason: null,
        promptTokenCount: null,
        candidateTokenCount: null,
        thoughtsTokenCount: null,
        totalTokenCount: null,
        maxOutputTokens: ROUTER_MAX_OUTPUT_TOKENS,
        thinkingConfig: ROUTER_THINKING_CONFIG,
        responseTextLength: 0,
        providerErrorCategory: category,
        providerErrorCode,
        keyIndex: typeof context?.keyIndex === 'number' ? context.keyIndex : null,
        routerParseResult: 'provider_error',
        routerRepairAttempted: false,
        aiResponseComplete: false
      });
    };

    try {
      const runRouterAttempt = (label: string) => this.apiKeyManager.executeWithRetry(
        async (client) => generateGeminiContentWithMetadata(client, {
          model,
          contents: prompt,
          responseMimeType: 'application/json',
          responseSchema: ROUTER_RESPONSE_SCHEMA,
          temperature: 0,
          maxOutputTokens: ROUTER_MAX_OUTPUT_TOKENS,
          thinkingConfig: ROUTER_THINKING_CONFIG,
        }),
        undefined,
        { model, maxAttempts: 1, requestTimeoutMs: 20000 }
      ).then((result) => ({ label, result }));

      const firstAttempt = await runRouterAttempt('initial');
      firstParse = parseRouterResponse(firstAttempt.result.text, firstAttempt.result.finishReason);
      let firstDiagnostics = recordAttempt(firstAttempt.label, firstAttempt.result, firstParse);

      if (firstParse.ok) return buildRoute(firstParse.value, 'Classificacao via LLM estruturada', firstDiagnostics);

      if (isMaxTokens(firstAttempt.result.finishReason)) {
        providerErrorCategory = 'max_tokens';
        providerErrorCode = firstAttempt.result.finishReason || 'MAX_TOKENS';
        const retryAttempt = await runRouterAttempt('max_tokens_retry');
        const retryParse = parseRouterResponse(retryAttempt.result.text, retryAttempt.result.finishReason);
        const retryDiagnostics = recordAttempt(retryAttempt.label, retryAttempt.result, retryParse);
        finalDiagnostics = {
          ...retryDiagnostics,
          routerAttempts: attemptDiagnostics,
          routerRetryOutcome: retryParse.ok ? 'ok' : retryParse.errorCategory
        };
        if (retryParse.ok) return buildRoute(retryParse.value, 'Classificacao via LLM estruturada apos retry MAX_TOKENS', finalDiagnostics);
      } else {
        const repairPrompt = `Return one valid JSON object for the Kaia router. Use only these intents: ${VALID_INTENTS.join(', ')}. Use only these agents: ${VALID_AGENTS.join(', ')}. Required fields: intent, selectedAgent, confidence, salesOpportunity, customerGoal, goalSummary, needsClarification, healthSensitivity. Invalid previous output preview: ${firstParse.sanitizedPreview}`;
        const repair = await this.apiKeyManager.executeWithRetry(
          async (client) => generateGeminiContentWithMetadata(client, {
            model,
            contents: repairPrompt,
            responseMimeType: 'application/json',
            responseSchema: ROUTER_RESPONSE_SCHEMA,
            temperature: 0,
            maxOutputTokens: ROUTER_REPAIR_MAX_OUTPUT_TOKENS,
            thinkingConfig: ROUTER_THINKING_CONFIG,
          }),
          undefined,
          { model, maxAttempts: 1, requestTimeoutMs: 20000 }
        );
        const repairParse = parseRouterResponse(repair.text, repair.finishReason);
        const repairDiagnostics = recordAttempt('structured_repair', repair, repairParse, true);
        finalDiagnostics = {
          ...repairDiagnostics,
          routerAttempts: attemptDiagnostics,
          routerRetryOutcome: repairParse.ok ? 'ok' : repairParse.errorCategory
        };
        if (repairParse.ok) return buildRoute(repairParse.value, 'Classificacao via reparo estruturado', finalDiagnostics);
      }
    } catch (err: any) {
      recordProviderError('provider_exception', err);
      if (process.env.KAIA_DEBUG_AI_STACKS === 'true') console.error('[AiRouter] Structured classification failed:', err);
    }

    const fallbackConfig = INTENT_MAP.unknown;
    return {
      ...fallbackConfig,
      confidence: 0.25,
      reason: `Fallback deterministico apos falha de roteador estruturado: ${firstParse && !firstParse.ok ? firstParse.errorCategory : 'provider_error'}`,
      salesOpportunity: false,
      resolvedEntity: {
        routerDiagnostics: {
          ...(finalDiagnostics || {}),
          routerParseResult: firstParse?.ok ? 'ok' : (firstParse?.errorCategory || providerErrorCategory || 'unknown_provider_error'),
          routerRepairAttempted: attemptDiagnostics.some((attempt) => attempt.routerRepairAttempted),
          routerRepairResult: 'fallback_used',
          routerFinalStatus: 'technical_failure',
          routerAttempts: attemptDiagnostics,
          providerErrorCategory: providerErrorCategory || undefined,
          providerErrorCode: providerErrorCode || undefined
        }
      }
    };
  }
  private buildRoutingPrompt(
    message: string,
    contextOrLastIntent: any,
    lastStage?: string
  ): string {
    let context: any;
    if (typeof contextOrLastIntent === 'string') {
      context = {
        history: [],
        summary: 'Nenhum resumo disponível',
        pendingAction: 'Nenhuma ação pendente',
        lastMentionedProduct: 'Nenhum',
        lastMentionedCategory: 'Nenhuma',
        resolvedEntities: 'Nenhuma',
        currentCartSummary: 'Carrinho vazio ou não carregado',
        approvedPreferences: 'Nenhuma',
        lastIntent: contextOrLastIntent,
        lastStage: lastStage || 'awareness'
      };
    } else {
      context = contextOrLastIntent;
    }

    const safeContext = {
      history: Array.isArray(context?.history) ? context.history : [],
      summary: context?.summary || 'Nenhum resumo disponível',
      pendingAction: context?.pendingAction || 'Nenhuma ação pendente',
      lastMentionedProduct: context?.lastMentionedProduct || 'Nenhum',
      lastMentionedCategory: context?.lastMentionedCategory || 'Nenhuma',
      resolvedEntities: context?.resolvedEntities || 'Nenhuma',
      currentCartSummary: context?.currentCartSummary || 'Carrinho vazio ou não carregado',
      approvedPreferences: context?.approvedPreferences || 'Nenhuma',
      lastIntent: context?.lastIntent || 'unknown',
      lastStage: context?.lastStage || 'awareness'
    };

    return `Voce e o roteador estruturado da Kaia para e-commerce de suplementos e cosmeticos.
Classifique semanticamente a mensagem. Nao execute acoes, nao adicione itens ao carrinho e nao invente produto.
Retorne somente JSON valido no schema solicitado.

Mensagem do cliente: "${message}"
Contexto minimo:
- Historico recente: ${safeContext.history.join(' | ') || '(sem historico)'}
- Acao pendente: ${safeContext.pendingAction}
- Ultimo produto: ${safeContext.lastMentionedProduct}
- Carrinho: ${safeContext.currentCartSummary}
- Ultima intencao/estagio: ${safeContext.lastIntent}/${safeContext.lastStage}

Responsabilidades dos agentes:
- ProductRecommendationAgent/product_recommendation: cliente pede explicitamente ajuda comercial, produto, suplemento, vitamina, opcao do catalogo, recomendacao, ou diz que quer algo para um objetivo claro de bem-estar. Nao muta carrinho. Se a mensagem for apenas desabafo, cansaco, sobrecarga mental, foco, ansiedade, trabalho puxado, sono ou dificuldade de desligar sem pedido comercial claro, prefira clarification_needed ou unknown com needsClarification=true.
- HealthClarificationAgent/clarification_needed: relato de saude sensivel, sintoma intenso, risco medico, sobrecarga mental/emocional, ansiedade, estresse, sono ambigua, ou objetivo ambiguo demais para recomendar produto com seguranca. Exemplo: "Estou com dor intensa no peito".
- ProductDetailsAgent/product_details: pergunta sobre um produto identificado, ingredientes, composicao, modo de uso ou "O que e Power Guido?".
- CartAgent/cart_add/cart_remove/cart_clear/cart_query: comandos explicitos de carrinho com acao clara. Exemplo: "Adiciona Power Guido ao carrinho".
- HumanSupportAgent/human_support_request: pedido de pessoa/atendente. Exemplo: "Quero falar com uma pessoa".
- ShippingAgent/FreeShippingAgent/CouponsAgent/PromotionsAgent/DiscountsAgent/CheckoutAgent/OrdersAgent/AccountSupportAgent: use apenas para pedidos explicitos desses dominios.
- FallbackAgent/unknown: somente quando a mensagem esta fora de escopo ou incompreensivel, nao para falha tecnica.

Campos semanticos:
- customerGoal: descricao curta do objetivo do cliente, ou null se nao houver objetivo.
- goalSummary: resumo seguro do que foi entendido, ou null.
- needsClarification: true quando falta informacao essencial, quando o cliente apenas desabafa, ou quando ha sensibilidade media/alta.
- healthSensitivity: low para bem-estar geral claro, medium para ansiedade, estresse, sobrecarga mental, sono ambiguo ou tema de saude ambiguo, high para sintoma intenso/urgente.

Regras negativas:
- "Adiciona Power Guido ao carrinho" -> cart_add/CartAgent.
- "O que e Power Guido?" -> product_details/ProductDetailsAgent.
- "Estou com dor intensa no peito" -> clarification_needed/HealthClarificationAgent, nao recomendacao.
- "Quero falar com uma pessoa" -> human_support_request/HumanSupportAgent.

JSON esperado:
{
  "intent": "uma intencao valida",
  "selectedAgent": "agente correspondente",
  "confidence": 0.0,
  "reasonCode": "codigo_curto",
  "salesOpportunity": true,
  "customerGoal": "objetivo semantico ou null",
  "goalSummary": "resumo seguro ou null",
  "needsClarification": false,
  "healthSensitivity": "low"
}
`;
  }
}

let routerInstance: AiRouter | null = null;

export function getAiRouter(): AiRouter {
  if (!routerInstance) {
    routerInstance = new AiRouter();
  }
  return routerInstance;
}



