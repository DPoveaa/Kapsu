import db from '../../lib/db';
import { getAiRouter, isAmbiguousHealthSensitive, INTENT_MAP } from './ai-router.service';
import { getConversationEntityResolver } from './entity-resolver.service';
import { ResponseCopyGenerator } from './response-copy-generator.service';
import { ResponseBuilder } from './response-builder.service';
import { ContractValidator } from './contract-validator.service';
import {
  isCartClearConfirmationAnswer,
  isCartClearConfirmationPrompt,
  isCartClearIntent
} from './cart-clear-intent.util';
import { detectFreeShippingIntent, isFreeShippingIntent } from './free-shipping-intent.util';
import { generateId } from '../../utils/id';
import { resolveGeminiModel } from '../../config/gemini-models';
import { getAPIKeyManager } from '../api-key-manager.service';
import { generateGeminiContentWithMetadata } from '../gemini-client.service';
import { getSalesStrategyService } from './sales-strategy.service';
import { resolveConversationMode } from './conversation-mode.service';
import { getConversationHistoryService } from './conversation-history.service';
import { getConversationContextService } from './conversation-context.service';
import type {
  KaiaConversationContext,
  KaiaPendingAction,
  KaiaLastRejectedCartAdd,
  KaiaCustomerMemory
} from '../../types/kaia-context.types';

// Import all agents
import { SpecializedAgent } from './agents/base.agent';
import { ProductRecommendationAgent } from './agents/product-recommendation.agent';
import { ProductDetailsAgent } from './agents/product-details.agent';
import { ProductComparisonAgent } from './agents/product-comparison.agent';
import { CartAgent } from './agents/cart.agent';
import { FreeShippingAgent } from './agents/free-shipping.agent';
import { ShippingAgent } from './agents/shipping.agent';
import { CouponsAgent } from './agents/coupons.agent';
import { PromotionsAgent } from './agents/promotions.agent';
import { DiscountsAgent } from './agents/discounts.agent';
import { OrdersAgent } from './agents/orders.agent';
import { HumanSupportAgent } from './agents/human-support.agent';
import { AccountSupportAgent } from './agents/account-support.agent';
import { FallbackAgent } from './agents/fallback.agent';
import { HealthClarificationAgent } from './agents/health-clarification.agent';
import { ObjectionHandlingAgent } from './agents/objection-handling.agent';
import { SalesAgent } from './agents/sales.agent';
import { CheckoutAgent } from './agents/checkout.agent';
import { createKaiaExecutionContext, KaiaExecutionMode, KaiaExecutionContext, isSideEffectBlockedMode } from './execution-context';
import { assertKaiaRegressionDatabaseSafety } from './regression-safety';
import { isBooleanSettingEnabled } from '../../utils/boolean-setting';
import { deterministicCompleteFallback, validateResponseCompleteness } from './response-completeness.service';
import { getKaiaMessageExecutionService } from './message-execution.service';
import { getKaiaRequestLifecycle, getKaiaRequestRemainingMs, runWithKaiaRequestLifecycle } from './request-lifecycle-context';

export interface KaiaGraphState {
  conversationId: string;
  userId?: string | null;
  sessionId: string;
  rawMessage: string;
  normalizedMessage: string;
  intent: string;
  subIntent?: string | null;
  confidence: number;
  riskLevel: string;
  selectedAgent: string;
  customerGoal?: string | null;
  goalSummary?: string | null;
  needsClarification?: boolean;
  healthSensitivity?: 'low' | 'medium' | 'high';
  conversationDecision?: 'converse' | 'clarify' | 'recommend_products' | 'health_sensitive' | 'no_grounded_product' | 'technical_failure';
  /** Entities resolved during the current turn (product, quantity, cep, ordinal, category) */
  resolvedEntities: Array<{
    type: string;
    id?: string;
    name?: string;
    value?: number | string;
    source?: string;
    confidence?: number;
    candidates?: unknown[];
    position?: number;
  }>;
  /** Active pending action (awaiting customer response), or null */
  pendingAction: KaiaPendingAction | null;
  lastRecommendedProducts: string[];
  mainProductId: string | null;
  /** Live cart data from the current session, if loaded by a tool */
  cart: Record<string, unknown> | null;
  clientCartInfo?: {
    itemCount?: number;
    total?: number;
    items?: Array<{ name?: string; quantity?: number; price?: number }>;
  } | null;
  cep: string | null;
  /** Tool execution results keyed by tool name */
  toolResults: Record<string, any>;
  /** Response parts (text, product_cards, actions, etc.) built by agents */
  parts: Array<{
    type: string;
    role?: string;
    text?: string;
    products?: unknown[];
    coupons?: unknown[];
    actions?: unknown[];
    [key: string]: unknown;
  }>;
  /** Diagnostics and telemetry collected throughout graph execution */
  diagnostics: Record<string, any>;
  /** Conversation message history (last N turns) */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessageId?: string;
  clientRequestId?: string;
  executionContext: KaiaExecutionContext;
  /**
   * The most recent rejected cart-add for this session (within TTL).
   * Used by entityResolverNode to infer product when customer says e.g. "quero os 100 então".
   */
  lastRejectedCartAdd?: KaiaLastRejectedCartAdd | null;
  /**
   * Full short-term + approved long-term memory context for this session.
   * Loaded once by conversationStateNode before any routing node runs.
   * SAFETY: approvedCustomerMemory is soft context only — it must never auto-execute mutations.
   */
  conversationContext?: KaiaConversationContext;
}

export class KaiaOrchestrator {
  private apiKeyManager = getAPIKeyManager();
  private activeExecutions = new Map<string, Promise<KaiaGraphState>>();
  
  private agents: Record<string, SpecializedAgent> = {
    ProductRecommendationAgent: new ProductRecommendationAgent(),
    ProductDetailsAgent: new ProductDetailsAgent(),
    ProductComparisonAgent: new ProductComparisonAgent(),
    CartAgent: new CartAgent(),
    FreeShippingAgent: new FreeShippingAgent(),
    ShippingAgent: new ShippingAgent(),
    CouponsAgent: new CouponsAgent(),
    PromotionsAgent: new PromotionsAgent(),
    DiscountsAgent: new DiscountsAgent(),
    OrdersAgent: new OrdersAgent(),
    HumanSupportAgent: new HumanSupportAgent(),
    AccountSupportAgent: new AccountSupportAgent(),
    FallbackAgent: new FallbackAgent(),
    HealthClarificationAgent: new HealthClarificationAgent(),
    ObjectionHandlingAgent: new ObjectionHandlingAgent(),
    SalesAgent: new SalesAgent(),
    CheckoutAgent: new CheckoutAgent()
  };

  async execute(payload: {
    message: string;
    sessionId: string;
    userId?: string | null;
    clientRequestId?: string;
    userMessageId?: string;
    cartInfo?: {
      itemCount?: number;
      total?: number;
      items?: Array<{ name?: string; quantity?: number; price?: number }>;
    } | null;
    executionMode?: KaiaExecutionMode;
  }): Promise<KaiaGraphState> {
    const executionMode = payload.executionMode || 'live';
    if (executionMode !== 'live') {
      return this.executeInternal(payload, generateId());
    }
    if (!payload.userMessageId) {
      throw new Error('userMessageId is required for live Kaia customer-message executions');
    }

    const active = this.activeExecutions.get(payload.userMessageId);
    if (active) {
      const resultState = await active;
      return {
        ...resultState,
        diagnostics: {
          ...resultState.diagnostics,
          alreadyProcessed: true,
          duplicateExecutionSuppressed: true,
          executionLockOwner: false,
        },
      };
    }

    const promise = this.executeWithDatabaseLifecycle(payload as typeof payload & { userMessageId: string });
    this.activeExecutions.set(payload.userMessageId, promise);
    try {
      return await promise;
    } finally {
      if (this.activeExecutions.get(payload.userMessageId) === promise) {
        this.activeExecutions.delete(payload.userMessageId);
      }
    }
  }

  private async executeWithDatabaseLifecycle(
    payload: {
      message: string;
      sessionId: string;
      userId?: string | null;
      clientRequestId?: string;
      userMessageId: string;
      cartInfo?: {
        itemCount?: number;
        total?: number;
        items?: Array<{ name?: string; quantity?: number; price?: number }>;
      } | null;
      executionMode?: KaiaExecutionMode;
    },
  ): Promise<KaiaGraphState> {
    await this.ensureLiveUserMessage(payload);
    const executionService = getKaiaMessageExecutionService();
    const graphExecutionId = generateId();
    const deadlineMs = Math.max(1_000, Number(process.env.KAIA_REQUEST_DEADLINE_MS || 30 * 60 * 1000));
    const leaseMs = Math.max(5_000, Number(process.env.KAIA_EXECUTION_LEASE_MS || 30_000));
    const deadlineAt = Date.now() + deadlineMs;
    const ownership = await executionService.acquireOrWait({
      userMessageId: payload.userMessageId,
      graphExecutionId,
      deadlineAt,
      leaseMs,
    });

    if (!ownership.owner) {
      const assistant = await executionService.getCompletedAssistantMessage(payload.userMessageId);
      if (!assistant) throw new Error('completed_execution_missing_assistant_message');
      return this.stateFromCompletedMessage(payload, assistant, ownership.waitedMs);
    }

    let heartbeat: NodeJS.Timeout | null = null;
    const renewLease = async () => executionService.renewLease(payload.userMessageId, graphExecutionId, leaseMs);
    try {
      return await runWithKaiaRequestLifecycle(deadlineAt, async () => {
        heartbeat = setInterval(() => {
          renewLease()
            .then((renewed) => {
              const lifecycle = getKaiaRequestLifecycle();
              if (renewed && lifecycle) lifecycle.executionLeaseRenewals += 1;
            })
            .catch((error) => console.error('[KaiaOrchestrator] Lease renewal failed:', error));
        }, Math.max(1_000, Math.floor(leaseMs / 3)));
        heartbeat.unref?.();
        const state = await this.executeInternal({
          ...payload,
          executionLifecycleDiagnostics: {
            executionLockAcquired: true,
            executionLockOwner: true,
            executionStatus: 'processing',
            duplicateExecutionSuppressed: ownership.duplicateSuppressed,
            waitedForExistingExecutionMs: ownership.waitedMs,
          },
        } as any, graphExecutionId);
        const lifecycle = getKaiaRequestLifecycle();
        state.diagnostics = {
          ...state.diagnostics,
          executionLockAcquired: true,
          executionLockOwner: true,
          executionStatus: state.diagnostics.aiSuppressed ? 'failed' : 'completed',
          duplicateExecutionSuppressed: ownership.duplicateSuppressed,
          waitedForExistingExecutionMs: ownership.waitedMs,
          executionLeaseRenewals: lifecycle?.executionLeaseRenewals || 0,
          providerCooldownWaitMs: lifecycle?.providerCooldownWaitMs || 0,
          providerRetryCount: lifecycle?.providerRetryCount || 0,
        };
        return state;
      }, { renewLease });
    } catch (error: any) {
      await executionService.markFailed(
        payload.userMessageId,
        graphExecutionId,
        error?.globalDeadlineExpired ? 'global_deadline_expired' : (error?.category || error?.reason || error?.code || 'execution_error'),
      );
      throw error;
    } finally {
      if (heartbeat) clearInterval(heartbeat);
    }
  }

  private async ensureLiveUserMessage(payload: {
    message: string;
    sessionId: string;
    userId?: string | null;
    clientRequestId?: string;
    userMessageId: string;
  }): Promise<void> {
    await db.transaction(async (trx) => {
      await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [`kaia-session:${payload.sessionId}`]);
      const existing = await trx('customer_conversation_messages').where('id', payload.userMessageId).first();
      if (existing) {
        if (existing.sender_type !== 'customer') throw new Error('userMessageId does not reference a customer message');
        if (existing.message !== payload.message) throw new Error('userMessageId was reused with different customer content');
        const conversation = await trx('customer_conversations').where('id', existing.conversation_id).first();
        if (!conversation || conversation.session_id !== payload.sessionId) {
          throw new Error('userMessageId does not belong to the supplied session');
        }
        if (conversation.customer_id && payload.userId && conversation.customer_id !== payload.userId) {
          throw new Error('Forbidden: Session belongs to another customer.');
        }
        return;
      }

      let conversation = await trx('customer_conversations').where('session_id', payload.sessionId).first();
      if (!conversation) {
        [conversation] = await trx('customer_conversations').insert({
          id: generateId(),
          session_id: payload.sessionId,
          channel: 'site_chat',
          status: 'ai_active',
          customer_id: payload.userId || null,
          ai_enabled: true,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        }).returning('*');
      } else if (conversation.customer_id && payload.userId && conversation.customer_id !== payload.userId) {
        throw new Error('Forbidden: Session belongs to another customer.');
      }
      await trx('customer_conversation_messages').insert({
        id: payload.userMessageId,
        conversation_id: conversation.id,
        sender_type: 'customer',
        sender_id: payload.userId || null,
        message: payload.message,
        metadata: JSON.stringify({
          processingStatus: 'pending',
          receivedAt: new Date().toISOString(),
          clientRequestId: payload.clientRequestId || null,
        }),
        created_at: trx.fn.now(),
      });
    });
  }

  private stateFromCompletedMessage(payload: any, assistant: any, waitedMs: number): KaiaGraphState {
    const metadata = assistant.metadata || {};
    const diagnostics = assistant.diagnostics || {};
    return {
      conversationId: assistant.conversation_id,
      userId: payload.userId || null,
      sessionId: payload.sessionId,
      rawMessage: payload.message,
      normalizedMessage: String(payload.message || '').toLowerCase().trim(),
      intent: diagnostics.intent || 'unknown',
      subIntent: null,
      confidence: Number(diagnostics.confidence || 0),
      riskLevel: diagnostics.riskLevel || 'low',
      selectedAgent: diagnostics.agent || 'FallbackAgent',
      resolvedEntities: diagnostics.resolvedEntities || [],
      pendingAction: diagnostics.pendingAction || null,
      lastRecommendedProducts: [],
      mainProductId: null,
      cart: null,
      clientCartInfo: payload.cartInfo || null,
      cep: null,
      toolResults: {},
      parts: Array.isArray(metadata.parts) ? metadata.parts : [{ type: 'text', role: 'assistant', text: assistant.message }],
      diagnostics: {
        ...diagnostics,
        executionLockAcquired: false,
        executionLockOwner: false,
        executionStatus: 'completed',
        duplicateExecutionSuppressed: true,
        waitedForExistingExecutionMs: waitedMs,
        finalAssistantMessageId: assistant.id,
        inReplyToUserMessageId: payload.userMessageId,
        alreadyProcessed: true,
      },
      history: [],
      userMessageId: payload.userMessageId,
      clientRequestId: payload.clientRequestId,
      executionContext: createKaiaExecutionContext('live'),
    };
  }

  private async executeInternal(payload: {
    message: string;
    sessionId: string;
    userId?: string | null;
    clientRequestId?: string;
    userMessageId?: string;
    cartInfo?: {
      itemCount?: number;
      total?: number;
      items?: Array<{ name?: string; quantity?: number; price?: number }>;
    } | null;
    executionMode?: KaiaExecutionMode;
  }, graphExecutionId: string): Promise<KaiaGraphState> {
    const startTime = Date.now();
    const executionContext = createKaiaExecutionContext(payload.executionMode || 'live');

    if (executionContext.executionMode === 'regression_test') {
      assertKaiaRegressionDatabaseSafety();
    }

    let state: KaiaGraphState = {
      conversationId: '',
      userId: payload.userId || null,
      sessionId: payload.sessionId,
      rawMessage: payload.message || '',
      normalizedMessage: '',
      intent: 'unknown',
      subIntent: null,
      confidence: 0,
      riskLevel: 'low',
      selectedAgent: 'FallbackAgent',
      resolvedEntities: [],
      pendingAction: null,
      lastRecommendedProducts: [],
      mainProductId: null,
      cart: null,
      clientCartInfo: payload.cartInfo || null,
      executionContext,
      cep: null,
      toolResults: {},
      parts: [],
      diagnostics: {
        graphExecutionId,
        engine: 'kaia_v2',
        nodesExecuted: [],
        processingTimeMs: 0,
        executionMode: executionContext.executionMode,
        ...((payload as any).executionLifecycleDiagnostics || {})
      },
      history: [],
      clientRequestId: payload.clientRequestId,
      userMessageId: payload.userMessageId
    };

    if (payload.userMessageId) {
      const existing = await db('customer_conversation_messages')
        .where('id', payload.userMessageId)
        .first();
      if (existing) {
        const meta = existing.metadata ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata) : {};
        if (meta.processingStatus === 'processed' || meta.assistantMessageId) {
          const aiResponse = await db('customer_conversation_messages')
            .where('conversation_id', existing.conversation_id)
            .where('sender_type', 'ai')
            .orderBy('created_at', 'desc')
            .first();

          if (aiResponse) {
            state.conversationId = existing.conversation_id;
            state.parts = [{ type: 'text', role: 'assistant', text: aiResponse.message }];
            state.diagnostics = {
              ...state.diagnostics,
              alreadyProcessed: true,
              processingTimeMs: Date.now() - startTime
            };
            return state;
          }
        }
      }
    }

    const nodes = [
      { name: 'InputNormalizerNode', run: this.inputNormalizerNode.bind(this) },
      { name: 'ConversationStateNode', run: this.conversationStateNode.bind(this) },
      { name: 'SafetyGuardNode', run: this.safetyGuardNode.bind(this) },
      { name: 'IntentRouterNode', run: this.intentRouterNode.bind(this) },
      { name: 'EntityResolverNode', run: this.entityResolverNode.bind(this) },
      { name: 'AgentExecutionNode', run: this.agentExecutionNode.bind(this) },
      { name: 'ResponseCopyNode', run: this.responseCopyNode.bind(this) },
      { name: 'ResponseBuilderNode', run: this.responseBuilderNode.bind(this) },
      { name: 'ContractValidatorNode', run: this.contractValidatorNode.bind(this) },
      { name: 'DiagnosticsNode', run: this.diagnosticsNode.bind(this) },
      { name: 'SaveConversationStateNode', run: this.saveConversationStateNode.bind(this) }
    ];

    try {
      for (const node of nodes) {
        state.diagnostics.nodesExecuted.push(node.name);
        const nodeStartedAt = Date.now();
        state = await node.run(state);
        state.diagnostics.stageTimingsMs = {
          ...(state.diagnostics.stageTimingsMs || {}),
          [node.name]: Date.now() - nodeStartedAt
        };
        if (state.diagnostics.blockedBySafety) {
          break; // interrompe em caso de ameaça de segurança
        }

        // Hard gate before IntentRouter
        if (node.name === 'ConversationStateNode') {
          const events = await db('customer_conversation_events')
            .where('conversation_id', state.conversationId)
            .whereIn('event_type', [
              'support_requested', 'human_handoff_created', 'escalated',
              'return_to_ai', 'ai_resumed', 'admin_assigned', 'human_agent_message', 'ai_paused'
            ])
            .orderBy('created_at', 'asc');

          const conversation = await db('customer_conversations').where('id', state.conversationId).first();
          const resolvedMode = resolveConversationMode(events, conversation);
          const autoResponsePaused = (resolvedMode === 'awaiting_human' || resolvedMode === 'human_active' || resolvedMode === 'ai_paused' || (resolvedMode as string) === 'support_handoff') || (conversation && conversation.ai_enabled === false);

          if (autoResponsePaused === true || ['awaiting_human', 'human_active', 'ai_paused', 'support_handoff'].includes(resolvedMode as any)) {
            state.diagnostics = {
              ...state.diagnostics,
              engine: 'kaia_v2',
              aiSuppressed: true,
              suppressReason: 'human_support_active',
              conversationMode: (resolvedMode === 'human_active' || conversation?.status === 'human_active' || conversation?.status === 'human_assigned') ? 'human_active' : 'awaiting_human',
              agent: null,
              intent: null
            };
            state.parts = [];

            if (state.userMessageId) {
              const custMsg = await db('customer_conversation_messages').where('id', state.userMessageId).first();
              if (custMsg) {
                const meta = custMsg.metadata ? (typeof custMsg.metadata === 'string' ? JSON.parse(custMsg.metadata) : custMsg.metadata) : {};
                meta.processingStatus = 'waiting_human';
                await db('customer_conversation_messages')
                  .where('id', state.userMessageId)
                  .update({
                    metadata: JSON.stringify(meta)
                  });
              }
            }

            break; // Interrupt execution of further nodes
          }
        }
      }

      state.diagnostics.processingTimeMs = Date.now() - startTime;
      state.diagnostics.totalLatencyMs = state.diagnostics.processingTimeMs;
      state.diagnostics.totalGeminiCalls = (state.diagnostics.routerAttempts?.length || 0) + (state.diagnostics.copyGeminiCalls || 0) + (state.diagnostics.genericCopyGeminiCalls || 0) + (state.diagnostics.clarificationRepairUsed ? 1 : 0);

      // Dispara em background a detecção de melhorias e extração de preferências (learning loop)
      if (!isSideEffectBlockedMode(state.executionContext.executionMode) && state.conversationId && state.userMessageId) {
        const textPart = state.parts.find(p => p.type === 'text');
        const responseText = textPart ? (textPart.text || '') : '';
        const { getLearningLoopService } = require('./learning-loop.service');
        state.diagnostics.postExecutionTriggered = true;
        state.diagnostics.enqueueAttempted = true;
        getLearningLoopService().runPostExecution(state, responseText)
          .then(async (jobId: string | null | undefined) => {
            if (!jobId || !state.userMessageId) return;
            state.diagnostics.learningJobId = jobId;
            state.diagnostics.learningJobStatus = 'pending';
            const custMsg = await db('customer_conversation_messages').where('id', state.userMessageId).first();
            if (!custMsg) return;
            const meta = custMsg.metadata ? (typeof custMsg.metadata === 'string' ? JSON.parse(custMsg.metadata) : custMsg.metadata) : {};
            meta.learningDiagnostics = {
              ...(meta.learningDiagnostics || {}),
              postExecutionTriggered: true,
              enqueueAttempted: true,
              learningJobId: jobId,
              learningJobStatus: 'pending'
            };
            await db('customer_conversation_messages').where('id', state.userMessageId).update({ metadata: JSON.stringify(meta) });
          })
          .catch(async (err: any) => {
            const message = err?.message || String(err);
            if (process.env.KAIA_DEBUG_AI_STACKS === 'true') console.error('[KaiaOrchestrator] Learning loop background run failed:', err);
            else console.error(`[KaiaOrchestrator] Learning loop background run failed: ${message}`);
          });
      }


      return state;
    } catch (error: any) {
      console.error('[KaiaOrchestrator] Error during execution:', error);
      if (state.userMessageId) {
        const custMsg = await db('customer_conversation_messages').where('id', state.userMessageId).first();
        if (custMsg) {
          const meta = custMsg.metadata ? (typeof custMsg.metadata === 'string' ? JSON.parse(custMsg.metadata) : custMsg.metadata) : {};
          meta.processingStatus = 'failed';
          meta.error = error.message || String(error);
          await db('customer_conversation_messages')
            .where('id', state.userMessageId)
            .update({
              metadata: JSON.stringify(meta)
            });
        }
      }
      throw error;
    }
  }

  // --- NODES IMPLEMENTATIONS ---

  private async inputNormalizerNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    const normalizedMessage = state.rawMessage.toLowerCase().trim();
    return {
      ...state,
      normalizedMessage
    };
  }

  private async conversationStateNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    // 1. Busca ou cria conversa no banco
    let conversation = await db('customer_conversations')
      .where('session_id', state.sessionId)
      .first();

    if (conversation) {
      if (conversation.customer_id && state.userId && conversation.customer_id !== state.userId) {
        throw new Error('Forbidden: Session belongs to another customer.');
      }

      if (state.userId && !conversation.customer_id) {
        await db('customer_conversations')
          .where('id', conversation.id)
          .update({ customer_id: state.userId, updated_at: db.fn.now() });
        conversation.customer_id = state.userId;
      }
    } else {
      const isIgnoredProfile = await db('ignored_profiles')
        .where(function(this: any) {
          if (state.userId) this.where('customer_id', state.userId);
          this.orWhere('session_id', state.sessionId);
        })
        .first();

      const convId = generateId();
      [conversation] = await db('customer_conversations')
        .insert({
          id: convId,
          session_id: state.sessionId,
          channel: 'site_chat',
          status: 'ai_active',
          customer_id: state.userId || null,
          ai_enabled: true,
          is_ignored: !!isIgnoredProfile,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');
    }

    // 2. Salva a mensagem do cliente no histórico com metadata de status pendente se não for recuperação
    let userMsgId = state.userMessageId;
    if (!userMsgId) {
      userMsgId = generateId();
      const isHumanMode = conversation.status === 'human_active' || conversation.status === 'human_assigned' || conversation.ai_enabled === false;
      await db('customer_conversation_messages').insert({
        id: userMsgId,
        conversation_id: conversation.id,
        sender_type: 'customer',
        sender_id: state.userId || null,
        message: state.rawMessage,
        metadata: JSON.stringify({
          processingStatus: isHumanMode ? 'waiting_human' : 'pending',
          receivedAt: new Date().toISOString(),
          clientRequestId: state.clientRequestId || null
        }),
        created_at: db.fn.now()
      });
    }

    // 3. Carrega o histórico usando o novo serviço unificado
    const historyService = getConversationHistoryService();
    const history = await historyService.loadHistory(conversation.id, {
      limit: 10,
      excludeMessageId: userMsgId,
      excludePendingOrFailed: false
    });

    // 4. Carrega os eventos de contexto e memória usando o novo serviço unificado
    const contextService = getConversationContextService();
    const conversationContext = await contextService.loadContext(conversation.id, state.userId || null, state.sessionId);

    // Salvar telemetria em diagnostics
    const dbHistoryMessages = await db('customer_conversation_messages')
      .where('conversation_id', conversation.id)
      .orderBy('created_at', 'desc');

    const setting = await db('site_settings').where({ key: 'kaia_long_term_memory_enabled' }).first();
    const isMemoryEnabled = isBooleanSettingEnabled(setting?.value);

    state.diagnostics = {
      ...state.diagnostics,
      historyMessageCount: dbHistoryMessages.length,
      mostRecentHistoryTimestamp: dbHistoryMessages.length > 0 ? dbHistoryMessages[0].created_at : null,
      summaryLoaded: !!conversationContext.recentMessagesSummary,
      shortTermContextKeysLoaded: Object.keys(conversationContext).filter(
        k => conversationContext[k as keyof KaiaConversationContext] !== null && k !== 'approvedCustomerMemory' && k !== 'conversationId'
      ),
      approvedMemoryCount: conversationContext.approvedCustomerMemory.length,
      rawMemorySettingValue: setting?.value ?? null,
      normalizedMemoryFeatureEnabled: isMemoryEnabled,
      memoryFeatureEnabled: isMemoryEnabled,
      currentConversationMode: conversationContext.mode
    };

    if (!isMemoryEnabled) {
      state.diagnostics.memoryNotUsedReason = 'feature_disabled';
    } else if (conversationContext.mode !== 'ai_active') {
      state.diagnostics.memoryNotUsedReason = 'human_support_active';
    } else if (conversationContext.approvedCustomerMemory.length === 0) {
      state.diagnostics.memoryNotUsedReason = 'no_approved_memories';
    }

    return {
      ...state,
      conversationId: conversation.id,
      history,
      pendingAction: conversationContext.activePendingAction,
      lastRejectedCartAdd: conversationContext.lastRejectedCartAdd,
      conversationContext,
      userMessageId: userMsgId
    };
  }

  private async safetyGuardNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    const lower = state.normalizedMessage;
    const patterns = [
      /ignore.*instructions/i,
      /ignore.*rules/i,
      /ignorar.*regras/i,
      /ignorar.*instru/i,
      /system.*prompt/i,
      /prompt.*sistema/i,
      /revel.*prompt/i,
      /mostr.*prompt/i,
      /reveal.*prompt/i,
      /show.*prompt/i,
      /api.*key/i,
      /chave.*api/i,
      /api_key/i,
      /como.*admin/i,
      /como.*administrador/i,
      /bypass.*rules/i,
      /preço de compra/i,
      /preco de compra/i,
      /margem de lucro/i,
      /margem do produto/i,
      /markup do produto/i,
      /liste pedidos de todos/i
    ];

    const isUnsafe = patterns.some(p => p.test(lower));
    if (isUnsafe) {
      const refusalText = 'Desculpe, não posso revelar detalhes internos ou alterar minhas diretrizes de segurança. Como posso ajudar você com nossos produtos hoje?';
      return {
        ...state,
        parts: [{ type: 'text', role: 'assistant', text: refusalText }],
        diagnostics: {
          ...state.diagnostics,
          blockedBySafety: true,
          warnings: ['Prompt injection detectado localmente.'],
          agent: 'LocalSecurity',
          intent: 'prompt_injection_attempt',
          riskLevel: 'high'
        }
      };
    }

    return state;
  }

  private extractCep(text: string): string | null {
    const match = String(text || '').match(/\b\d{5}-?\d{3}\b/);
    if (!match) return null;
    const clean = match[0].replace(/\D/g, '');
    return clean.length === 8 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : null;
  }

  private isCartClearConfirmation(state: KaiaGraphState): boolean {
    if (!isCartClearConfirmationAnswer(state.normalizedMessage)) {
      return false;
    }

    const lastAssistant = [...(state.history || [])]
      .reverse()
      .find((message) => message.role === 'assistant');
    return isCartClearConfirmationPrompt(String(lastAssistant?.content || ''));
  }
  private normalizeForPolicy(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hasExplicitCommerceRequest(norm: string): boolean {
    return /\b(produto|suplemento|vitamina|capsula|formula|catalogo|opcao|opcoes|recomenda|recomende|indica|indique|sugere|sugira|comprar|compra|quero algo|preciso de algo|tem algo|alguma coisa para|algo para|o que tomar|qual tomar)\b/i.test(norm);
  }

  private hasExplicitOperationalRequest(norm: string): boolean {
    return /\b(carrinho|adiciona|adicionar|adicione|remove|remover|retirar|checkout|pagar|pagamento|pix|boleto|cartao|frete|cep|cupom|desconto|promocao|pedido|entrega|atendente|humano|suporte)\b/i.test(norm);
  }

  private isCorrectionTurn(norm: string): boolean {
    return /\b(quis dizer|queria dizer|na verdade|corrigindo|corrigir|me expressei|quis falar|melhor dizendo|eu quis|digo que|digo q)\b/i.test(norm);
  }

  private isAmbiguousWellbeingConversation(norm: string): boolean {
    const hasWorkloadOrCognitiveContext = /\b(cabeca|mente|mental|foco|concentracao|atencao|render|rendimento|produtiv|trabalho|estudo|estudos|puxado|exaust|cansad|fadiga|energia|animo|desligar|noite|sono|dormir|relaxar|pensamento|pensamentos|ansios|ansiedade|estresse|stress|sobrecarga|cheia|cheio)\b/i.test(norm);
    const isCustomerState = /\b(estou|to|tenho|tive|sinto|sentindo|minha|meu|hoje|ando|fico|nao consigo|dificuldade)\b/i.test(norm);
    return hasWorkloadOrCognitiveContext && isCustomerState;
  }

  private decideConversationPolicy(state: KaiaGraphState): KaiaGraphState {
    if (state.diagnostics?.routerFinalStatus === 'technical_failure') {
      return {
        ...state,
        conversationDecision: 'technical_failure',
        diagnostics: { ...state.diagnostics, conversationDecision: 'technical_failure' }
      };
    }

    if (this.hasExplicitOperationalRequest(this.normalizeForPolicy(state.rawMessage))) {
      const decision = state.selectedAgent === 'ProductRecommendationAgent' ? 'recommend_products' : 'converse';
      return {
        ...state,
        conversationDecision: decision,
        diagnostics: { ...state.diagnostics, conversationDecision: decision }
      };
    }

    const norm = this.normalizeForPolicy(state.rawMessage);
    const explicitCommerce = this.hasExplicitCommerceRequest(norm);
    const correctionTurn = this.isCorrectionTurn(norm);
    const ambiguousWellbeing = this.isAmbiguousWellbeingConversation(norm);
    const sensitive = state.healthSensitivity === 'medium' || state.healthSensitivity === 'high';

    let decision: KaiaGraphState['conversationDecision'] = 'converse';
    if (state.selectedAgent === 'ProductRecommendationAgent' && !state.needsClarification && !sensitive && (explicitCommerce || !!state.customerGoal || !!state.goalSummary)) {
      decision = 'recommend_products';
    } else if (state.intent === 'clarification_needed' || state.selectedAgent === 'HealthClarificationAgent' || sensitive || state.needsClarification) {
      decision = sensitive ? 'health_sensitive' : 'clarify';
    } else if (correctionTurn || ambiguousWellbeing) {
      decision = correctionTurn || /\b(ansios|ansiedade|estresse|stress|sobrecarga|cheia|cheio|mental)\b/i.test(norm) ? 'health_sensitive' : 'clarify';
    } else if (state.selectedAgent === 'ProductRecommendationAgent') {
      decision = 'clarify';
    }

    const healthSensitivity = decision === 'health_sensitive' && state.healthSensitivity === 'low'
      ? 'medium'
      : state.healthSensitivity;
    const selectedAgent = decision === 'recommend_products'
      ? state.selectedAgent
      : (['ProductRecommendationAgent', 'HealthClarificationAgent'].includes(state.selectedAgent) ? 'FallbackAgent' : state.selectedAgent);
    const intent = decision === 'recommend_products'
      ? state.intent
      : (state.intent === 'product_recommendation' || state.intent === 'clarification_needed' ? 'unknown' : state.intent);

    return {
      ...state,
      selectedAgent,
      intent,
      healthSensitivity,
      needsClarification: decision === 'clarify' || decision === 'health_sensitive' ? true : state.needsClarification,
      conversationDecision: decision,
      diagnostics: {
        ...state.diagnostics,
        conversationDecision: decision,
        productRecommendationBlocked: decision !== 'recommend_products' && state.selectedAgent === 'ProductRecommendationAgent',
        correctionTurnDetected: correctionTurn,
        ambiguousWellbeingDetected: ambiguousWellbeing,
        explicitCommerceDetected: explicitCommerce,
        healthSensitivity,
        needsClarification: decision === 'clarify' || decision === 'health_sensitive' ? true : state.needsClarification
      }
    };
  }

  private async intentRouterNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    if (state.pendingAction?.type === 'cart_add_product_disambiguation') {
      const isCancellation = /\b(nao|não|cancela|cancelar|esquece|no|never|negative|negativo)\b/i.test(state.normalizedMessage);
      if (isCancellation) {
        await db('customer_conversation_events')
          .where('id', state.pendingAction.eventId)
          .update({
            metadata: JSON.stringify({
              ...state.pendingAction,
              status: 'cancelled',
              cancelledAt: new Date().toISOString()
            })
          });

        return {
          ...state,
          intent: 'cart_add_cancel',
          selectedAgent: 'CartAgent',
          confidence: 1.0,
          pendingAction: null,
          diagnostics: {
            ...state.diagnostics,
            pendingActionBefore: 'cart_add_product_disambiguation'
          }
        };
      }

      const candidates = state.pendingAction.candidates || [];
      const normMsg = state.normalizedMessage;
      let selectedCandidate = null;

      // 1. Check for price match
      for (const cand of candidates) {
        const priceStr = cand.price.toFixed(2);
        const priceComma = priceStr.replace('.', ',');
        const priceInt = Math.floor(cand.price).toString();

        if (normMsg.includes(priceComma) || normMsg.includes(priceStr) || (priceInt.length > 2 && normMsg.includes(priceInt))) {
          selectedCandidate = cand;
          break;
        }
      }

      // 2. Check for ordinal references
      if (!selectedCandidate) {
        if (/\b(primeiro|1o|1a|o 1|o de 135)\b/i.test(normMsg)) {
          selectedCandidate = candidates[0];
        } else if (/\b(segundo|2o|2a|o 2|o de 199)\b/i.test(normMsg)) {
          selectedCandidate = candidates[1];
        } else if (/\b(terceiro|3o|3a|o 3)\b/i.test(normMsg)) {
          selectedCandidate = candidates[2];
        }
      }

      // 3. Check for cheapest/most expensive
      if (!selectedCandidate) {
        if (/\b(mais barato|menor preco|menor preço|o mais em conta)\b/i.test(normMsg)) {
          selectedCandidate = [...candidates].sort((a, b) => a.price - b.price)[0];
        } else if (/\b(mais caro|maior preco|maior preço)\b/i.test(normMsg)) {
          selectedCandidate = [...candidates].sort((a, b) => b.price - a.price)[0];
        }
      }

      // 4. Match names
      if (!selectedCandidate) {
        // Sort candidates by name length descending so more specific names match first (e.g. "Feno Grego Premium" > "Feno Grego")
        const sortedCandidates = [...candidates].sort((a, b) => b.name.length - a.name.length);
        for (const cand of sortedCandidates) {
          const normName = cand.name.toLowerCase();
          if (normMsg.includes(normName)) {
            selectedCandidate = cand;
            break;
          }
        }
      }

      if (selectedCandidate) {
        await db('customer_conversation_events')
          .where('id', state.pendingAction.eventId)
          .update({
            metadata: JSON.stringify({
              ...state.pendingAction,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              selectedProductId: selectedCandidate.id
            })
          });

        const resolvedEntities = state.resolvedEntities || [];
        const filteredEntities = resolvedEntities.filter(e => e.type !== 'product' && e.type !== 'quantity');

        filteredEntities.push({
          type: 'product',
          id: selectedCandidate.id,
          name: selectedCandidate.name,
          source: 'product_database'
        });
        filteredEntities.push({
          type: 'quantity',
          value: state.pendingAction.quantity || 1
        });

        return {
          ...state,
          intent: 'cart_add',
          selectedAgent: 'CartAgent',
          confidence: 1.0,
          resolvedEntities: filteredEntities,
          pendingAction: null,
          diagnostics: {
            ...state.diagnostics,
            pendingActionBefore: 'cart_add_product_disambiguation'
          }
        };
      }
    }

    if (state.pendingAction?.type === 'cart_add_confirm') {
      const isConfirmation = /\b(sim|pode|confirmo|isso|ok|confirmado|claro|com certeza|positivo|confirmar)\b/i.test(state.normalizedMessage);
      const isCancellation = /\b(nao|não|cancela|cancelar|esquece|no|never|negative|negativo)\b/i.test(state.normalizedMessage);
      
      if (isConfirmation) {
        // Executa uma resolução rápida de entidade para ver se há nova intenção explícita na mensagem
        const resolver = getConversationEntityResolver();
        const resolved = await resolver.resolve(state.rawMessage, state.conversationId);
        
        // Verifica quantidade nova que não coincida com a que está sendo confirmada
        const quantityRegex = /\b(\d+)\b/;
        const qtyMatch = state.normalizedMessage.match(quantityRegex);
        const hasNewQuantity = qtyMatch && parseInt(qtyMatch[1], 10) !== state.pendingAction.quantity;
        const hasNewProductOrCategory = resolved && (resolved.type === 'product' || resolved.type === 'category');

        if (hasNewProductOrCategory || hasNewQuantity) {
          // Ignora a confirmação automática para seguir a nova rota do produto/quantidade explicitly
        } else {
          const resolvedEntities = state.resolvedEntities || [];
          const filteredEntities = resolvedEntities.filter(e => e.type !== 'product' && e.type !== 'quantity');

          filteredEntities.push({
            type: 'product',
            id: state.pendingAction.productId,
            name: state.pendingAction.productName || 'Produto',
            source: 'pending_action_confirm',
            confidence: 1.0
          });

          filteredEntities.push({
            type: 'quantity',
            value: state.pendingAction.quantity || 1
          });

          return {
            ...state,
            intent: 'cart_add',
            selectedAgent: 'CartAgent',
            confidence: 1.0,
            riskLevel: 'low',
            resolvedEntities: filteredEntities,
            diagnostics: {
              ...state.diagnostics,
              pendingActionBefore: 'cart_add_confirm'
            }
          };
        }
      } else if (isCancellation) {
        // Atualiza a pending action para cancelada no banco
        await db('customer_conversation_events')
          .where('id', state.pendingAction.eventId)
          .update({
            metadata: JSON.stringify({
              ...state.pendingAction,
              status: 'cancelled',
              cancelledAt: new Date().toISOString()
            })
          });

        return {
          ...state,
          intent: 'cart_add_cancel',
          selectedAgent: 'CartAgent',
          confidence: 1.0,
          riskLevel: 'low',
          pendingAction: null,
          diagnostics: {
            ...state.diagnostics,
            pendingActionBefore: 'cart_add_confirm'
          }
        };
      }
    }

    if (
      /\b(atendente|humano|operator)\b/i.test(state.normalizedMessage || state.rawMessage) ||
      /\b(falar|chamar|conversar|quero|preciso|solicitar|pedir).{0,40}\b(atendente|humano|suporte|alguem)\b/i.test(state.normalizedMessage || state.rawMessage) ||
      /\b(atendimento|suporte)\s+humano\b/i.test(state.normalizedMessage || state.rawMessage)
    ) {
      return {
        ...state,
        intent: 'human_support_request',
        selectedAgent: 'HumanSupportAgent',
        confidence: 1.0,
        riskLevel: 'low',
        diagnostics: {
          ...state.diagnostics,
          humanSupportDetectedLocally: true
        }
      };
    }

    if (this.isCartClearConfirmation(state)) {
      return {
        ...state,
        intent: 'cart_clear',
        selectedAgent: 'CartAgent',
        confidence: 1.0,
        riskLevel: 'low',
        diagnostics: {
          ...state.diagnostics,
          cartClearConfirmedFromHistory: true
        }
      };
    }

    if (isCartClearIntent(state.normalizedMessage || state.rawMessage)) {
      return {
        ...state,
        intent: 'cart_clear',
        selectedAgent: 'CartAgent',
        confidence: 1.0,
        riskLevel: 'low',
        diagnostics: {
          ...state.diagnostics,
          cartClearDetectedLocally: true
        }
      };
    }

    const freeShippingDetection = detectFreeShippingIntent(state.normalizedMessage || state.rawMessage);
    if (freeShippingDetection.detected) {
      return {
        ...state,
        intent: 'free_shipping_info',
        selectedAgent: 'FreeShippingAgent',
        confidence: 1.0,
        riskLevel: 'low',
        diagnostics: {
          ...state.diagnostics,
          freeShippingDetectedLocally: true,
          freeShippingIntentDetected: true,
          freeShippingIntentSource: freeShippingDetection.source,
          matchedConcepts: freeShippingDetection.matchedConcepts,
          promotionIntentSuppressed: freeShippingDetection.promotionIntentSuppressed
        }
      };
    }

    if (isAmbiguousHealthSensitive(state.normalizedMessage)) {
      return {
        ...state,
        intent: 'clarification_needed',
        selectedAgent: 'HealthClarificationAgent',
        confidence: 1.0,
        riskLevel: 'medium'
      };
    }

    // 1. Resolve pendingAction se o input for compatível
    const cep = this.extractCep(state.normalizedMessage);
    
    if (state.pendingAction && state.pendingAction.status === 'pending') {
      const pendingType = state.pendingAction.type;
      
      if (cep && (pendingType === 'shipping_quote' || pendingType === 'free_shipping_check')) {
        // Resolve a pending action de frete/cep no banco
        await db('customer_conversation_events')
          .where('id', state.pendingAction.eventId)
          .update({
            metadata: JSON.stringify({
              ...state.pendingAction,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              cep
            })
          });

        return {
          ...state,
          cep,
          intent: pendingType,
          selectedAgent: pendingType === 'shipping_quote' ? 'ShippingAgent' : 'FreeShippingAgent',
          confidence: 1.0,
          mainProductId: state.pendingAction.productId || state.mainProductId,
          pendingAction: null, // limpa a pendingAction local
          diagnostics: {
            ...state.diagnostics,
            pendingActionBefore: pendingType,
            pendingActionAfter: null
          }
        };
      }

      // Se for seleção de pedido via ordinal/code
      if (pendingType === 'order_detail_select' && (
        /\b(primeiro|segundo|terceiro|ultimo|anterior|pago|pendente|aprovado)\b/i.test(state.normalizedMessage) ||
        /\bpedido\b/i.test(state.normalizedMessage)
      )) {
        return {
          ...state,
          intent: 'order_status',
          selectedAgent: 'OrdersAgent',
          confidence: 1.0
        };
      }
    }

    // 2. Roteia por regras personalizadas aprovadas antes da IA
    const { getRuleRepository } = require('./rule-repository.service');
    const customRoute = await getRuleRepository().findMatchingIntentRule(state.rawMessage);

    let route;
    if (customRoute) {
      const config = INTENT_MAP[customRoute.target_value] || INTENT_MAP.unknown;
      route = {
        ...config,
        confidence: 1.0,
        reason: `Roteamento por regra aprovada ${customRoute.id}`,
        resolvedEntity: {}
      };
    } else {
      const router = getAiRouter();
      route = await router.route(
        state.rawMessage,
        !!state.userId,
        state.intent,
        'awareness',
        state.conversationId,
        state
      );
    }

    const routedState: KaiaGraphState = {
      ...state,
      intent: route.intent,
      confidence: route.confidence,
      selectedAgent: route.selectedAgent,
      customerGoal: route.customerGoal ?? route.resolvedEntity?.customerGoal ?? state.customerGoal ?? null,
      goalSummary: route.goalSummary ?? route.resolvedEntity?.goalSummary ?? state.goalSummary ?? null,
      needsClarification: route.needsClarification ?? route.resolvedEntity?.needsClarification ?? state.needsClarification ?? false,
      healthSensitivity: route.healthSensitivity ?? route.resolvedEntity?.healthSensitivity ?? state.healthSensitivity ?? 'low',
      riskLevel: route.riskLevel,
      diagnostics: {
        ...state.diagnostics,
        ...(route.resolvedEntity?.freeShippingIntentDetected ? route.resolvedEntity : {}),
        customerGoal: route.customerGoal ?? route.resolvedEntity?.customerGoal ?? state.customerGoal ?? null,
        goalSummary: route.goalSummary ?? route.resolvedEntity?.goalSummary ?? state.goalSummary ?? null,
        needsClarification: route.needsClarification ?? route.resolvedEntity?.needsClarification ?? state.needsClarification ?? false,
        healthSensitivity: route.healthSensitivity ?? route.resolvedEntity?.healthSensitivity ?? state.healthSensitivity ?? 'low',
        routerFinalStatus: route.resolvedEntity?.routerDiagnostics?.routerFinalStatus || 'success',
        routerIntent: route.intent,
        routerSelectedAgent: route.selectedAgent,
        ...(route.resolvedEntity?.routerDiagnostics || {})
      }
    };

    return this.decideConversationPolicy(routedState);
  }

  private async entityResolverNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    const resolver = getConversationEntityResolver();
    const resolvedEntity = await resolver.resolve(state.rawMessage, state.conversationId);
    
    const resolvedEntities = state.resolvedEntities || [];
    if (resolvedEntity) {
      resolvedEntities.push(resolvedEntity);
    }

    if (state.intent === 'cart_add') {
      const hasProduct = resolvedEntities.some(e => e.type === 'product');
      if (!hasProduct) {
        if (state.lastRejectedCartAdd?.productId) {
          // Customer is referring back to a previously rejected cart-add (e.g. "quero os 100 então")
          const prev = state.lastRejectedCartAdd;
          console.log(`[EntityResolverNode] Falling back to lastRejectedCartAdd product: ${prev.productName}`);
          resolvedEntities.push({
            type: 'product',
            id: prev.productId,
            name: prev.productName,
            source: 'lastRejectedCartAdd',
            confidence: 0.9
          });
        } else if (state.conversationContext?.lastMentionedProduct?.id) {
          // Fallback to the most recently mentioned product in the session
          const prev = state.conversationContext.lastMentionedProduct;
          console.log(`[EntityResolverNode] Falling back to lastMentionedProduct: ${prev.name}`);
          resolvedEntities.push({
            type: 'product',
            id: prev.id,
            name: prev.name,
            source: 'lastMentionedProduct',
            confidence: 0.8
          });
        }
      }
    }

    // Se resolveu ordinal e é número
    if (resolvedEntity?.source === 'ordinal_reference') {
      resolvedEntities.push({
        type: 'ordinal_reference',
        value: resolvedEntity.position // index 1, 2...
      });
    }

    // Se o texto contém CEP avulso
    const cep = this.extractCep(state.normalizedMessage);
    if (cep) {
      resolvedEntities.push({
        type: 'cep',
        value: cep
      });
    }

    // Parse quantity (numeric and PT-BR written numbers 1-10)
    let quantityFound = false;
    let quantity = 1;
    const ptBrNumbers: Record<string, number> = {
      'um': 1, 'uma': 1,
      'dois': 2, 'duas': 2,
      'tres': 3, 'três': 3,
      'quatro': 4,
      'cinco': 5,
      'seis': 6,
      'sete': 7,
      'oito': 8,
      'nove': 9,
      'dez': 10
    };

    const digitMatch = state.normalizedMessage.match(/\b(\d+)\b/);
    if (digitMatch) {
      quantity = parseInt(digitMatch[1], 10);
      quantityFound = true;
    } else {
      const words = state.normalizedMessage.split(/\s+/);
      for (const word of words) {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
        if (ptBrNumbers[cleanWord] !== undefined) {
          quantity = ptBrNumbers[cleanWord];
          quantityFound = true;
          break;
        }
      }
    }

    if (quantityFound) {
      resolvedEntities.push({
        type: 'quantity',
        value: quantity
      });
    }

    let nextIntent = state.intent;
    let nextAgent = state.selectedAgent;
    let nextConfidence = state.confidence;
    let mainProductId = state.mainProductId;

    const resolvedProduct = resolvedEntities.find(e => e.type === 'product');
    if (resolvedProduct) {
      state.diagnostics.specificProductResolved = true;
      const asksForAlternatives = /\b(outros|outra|outras|outros tipos|diferentes|alternativas|comparar|diferenca|diferença|qual a diferenca|qual a diferença)\b/i.test(state.normalizedMessage);
      
      if (!asksForAlternatives) {
        state.diagnostics.specificProductOverrideApplied = true;
        state.diagnostics.genericRecommendationBlocked = true;
        mainProductId = resolvedProduct.id || null;

        const hasBuyIntent = /\b(comprar|compra|compre|adiciona|adicionar|adicione|add|coloca|colocar|coloque|botar|bota|bote|põe|poe|ponha|levar|leva|pegar|pega|carrinho|quero)\b/i.test(state.normalizedMessage);
        const isCorrection = /\b(falo do|falando do|me refiro ao|me refiro a|na verdade|queria dizer|corrigindo|não me deu|nao me deu|n me deu|o que eu pedi|oq eu pedi|oque eu pedi)\b/i.test(state.normalizedMessage) || 
                             (/\b(falar|falei|falando)\b/i.test(state.normalizedMessage) && /\b(do|de|da)\b/i.test(state.normalizedMessage));

        if (hasBuyIntent) {
          nextIntent = 'cart_add';
          nextAgent = 'CartAgent';
          nextConfidence = 1.0;
        } else if (isCorrection) {
          nextIntent = 'product_details';
          nextAgent = 'ProductDetailsAgent';
          nextConfidence = 1.0;
          state.diagnostics.isCorrectionFlow = true;
        } else {
          nextIntent = 'product_details';
          nextAgent = 'ProductDetailsAgent';
          nextConfidence = 1.0;
        }
      }
    }

    return {
      ...state,
      intent: nextIntent,
      selectedAgent: nextAgent,
      confidence: nextConfidence,
      mainProductId,
      resolvedEntities,
      cep: cep || state.cep || null
    };
  }

  private async agentExecutionNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    if (['clarify', 'health_sensitive'].includes(String(state.conversationDecision || ''))) {
      const decision = state.conversationDecision;
      const correctionInstruction = state.diagnostics?.correctionTurnDetected
        ? 'O cliente corrigiu a interpretacao anterior. Reconheca isso explicitamente antes de responder.'
        : '';
      const safetyInstruction = decision === 'health_sensitive'
        ? 'Tema sensivel de bem-estar mental/emocional. Nao diagnostique, nao prometa tratamento e nao recomende produto agora.'
        : 'A intencao comercial ainda nao esta clara. Nao recomende produto agora.';

      return {
        ...state,
        parts: [],
        toolResults: {
          ...state.toolResults,
          toolResultContext: [
            'Decisao de conversa: responder em linguagem natural antes de qualquer busca de produto.',
            safetyInstruction,
            correctionInstruction,
            'Faca no maximo 320 caracteres. Acolha o contexto e termine com uma unica pergunta util sobre foco, cansaco, estresse, sobrecarga mental, relaxamento, pensamentos acelerados ou sono.'
          ].filter(Boolean).join('\n')
        },
        diagnostics: {
          ...state.diagnostics,
          agent: state.selectedAgent,
          productRetrievalSkipped: true,
          productRecommendationBlocked: state.diagnostics?.productRecommendationBlocked || decision !== 'recommend_products',
          toolsUsed: []
        }
      };
    }

    const agent = this.agents[state.selectedAgent] || this.agents.FallbackAgent;
    const partialState = await agent.run(state);

    const mergedDiagnostics = {
      ...state.diagnostics,
      ...partialState.diagnostics,
      agent: state.selectedAgent,
      intent: partialState.intent || state.intent,
      toolsUsed: partialState.diagnostics?.toolsUsed || state.diagnostics.toolsUsed || []
    };

    return {
      ...state,
      ...partialState,
      diagnostics: mergedDiagnostics
    };
  }

  private async responseCopyNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    // ProductRecommendationAgent already performs the only customer-facing copy call for this layout.
    if (state.selectedAgent === 'ProductRecommendationAgent' && state.diagnostics?.copyGeneration) {
      return {
        ...state,
        diagnostics: {
          ...state.diagnostics,
          responseCopyNodeSkipped: true,
          responseCopyNodeSkipReason: 'agent_copy_generation_present'
        }
      };
    }

    // Se o agente já gerou copy customizada e validada, use-a e evite chamar LLM genérico de novo
    if (state.diagnostics?.copyGeneration && state.diagnostics?.copyValidation === 'passed' && !state.diagnostics?.copyFallbackUsed) {
      const intro = state.diagnostics.copyGeneration.intro;
      const explanation = state.diagnostics.copyGeneration.explanation;
      const closing = state.diagnostics.copyGeneration.closing;
      const otherParts = state.parts.filter(p => p.type !== 'text');
      const text = [intro, explanation, closing].filter(Boolean).join('\n\n');
      const parts = [
        { type: 'text', role: 'assistant', text },
        ...otherParts
      ];
      return { ...state, parts };
    }

    const GENERIC_PLACEHOLDERS = new Set([
      'Temos estes produtos em promocao:',
      'Nao temos produtos em promocao no momento.',
      'Temos estes cupons ativos:',
      'Nao temos cupons ativos no momento.',
      'Separei os descontos por tipo:',
      'Nao encontrei descontos ativos no momento.'
    ]);

    const textPart = state.parts.find(p => p.type === 'text');
    const isGeneric = textPart && GENERIC_PLACEHOLDERS.has(textPart.text || '');

    // Se o agente já gerou copy ou as parts contêm texto final (e não for genérico), não gera de novo
    if (textPart && !isGeneric) {
      return state;
    }

    const toolResultContext = state.toolResults.toolResultContext || '';
    const systemInstruction = this.getSystemInstructionForAgent(state, toolResultContext);

    let responseText = '';
    if (isSideEffectBlockedMode(state.executionContext.executionMode)) {
      if (state.selectedAgent === 'ShippingAgent') {
        responseText = textPart ? (textPart.text || '') : 'Consultei as opções de frete para o seu CEP.';
      } else if (state.selectedAgent === 'CartAgent') {
        responseText = textPart ? (textPart.text || '') : 'Verifiquei o estado atual do seu carrinho.';
      } else {
        responseText = textPart ? (textPart.text || '') : 'Estou aqui para ajudar com suas dúvidas sobre nossos produtos, frete ou cupons.';
      }
    } else {
      try {
        const chatModel = resolveGeminiModel('chat');
        const generationResult = await this.apiKeyManager.executeWithRetry(
          async (client) => {
            const historyContents = state.history.slice(-8).map((h) => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }],
            }));
            return generateGeminiContentWithMetadata(client, {
              model: chatModel,
              contents: [
                ...historyContents,
                { role: 'user', parts: [{ text: state.rawMessage }] },
              ],
              systemInstruction: systemInstruction,
              temperature: 0.4,
              maxOutputTokens: 800,
            });
          },
          undefined,
          { model: chatModel }
        );
        responseText = generationResult.text;
        state.diagnostics.aiFinishReason = generationResult.finishReason;
        state.diagnostics.aiPromptTokens = generationResult.promptTokenCount;
        state.diagnostics.aiOutputTokens = generationResult.candidateTokenCount;
        state.diagnostics.aiOutputLength = generationResult.text.length;
        state.diagnostics.aiResponseComplete = generationResult.finishReason ? !['MAX_TOKENS', 'TOKEN_LIMIT', 'LENGTH'].includes(String(generationResult.finishReason).toUpperCase()) : true;
        state.diagnostics.providerTextLength = generationResult.text.length;
        if (
          ['clarify', 'health_sensitive'].includes(String(state.conversationDecision || '')) &&
          (!/[?？]/.test(responseText) || ['MAX_TOKENS', 'TOKEN_LIMIT', 'LENGTH'].includes(String(state.diagnostics.aiFinishReason || '').toUpperCase()))
        ) {
          const repairResult = await this.apiKeyManager.executeWithRetry(
            async (client) => generateGeminiContentWithMetadata(client, {
              model: chatModel,
              contents: `Mensagem do cliente: "${state.rawMessage}"
Resposta anterior da Kaia: "${responseText}"
Gere uma resposta final em portugues brasileiro natural com no maximo 320 caracteres. Acolha o contexto, nao recomende produtos, nao cite catalogo/carrinho/frete e termine com exatamente uma pergunta curta e util de clarificacao.`,
              systemInstruction: 'Voce repara respostas conversacionais da Kaia. Retorne somente JSON valido no schema solicitado.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: { text: { type: 'STRING' } },
                required: ['text']
              },
              temperature: 0.2,
              maxOutputTokens: 512,
              thinkingConfig: { thinkingBudget: 0 },
            }),
            undefined,
            { model: chatModel }
          );
          let repairedText = '';
          try {
            const parsedRepair = JSON.parse(repairResult.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
            repairedText = typeof parsedRepair?.text === 'string' ? parsedRepair.text.trim() : '';
          } catch (parseError) {
            repairedText = '';
          }
          responseText = repairedText;
          state.diagnostics.clarificationRepairUsed = true;
          state.diagnostics.clarificationRepairFinishReason = repairResult.finishReason;
          state.diagnostics.clarificationRepairOutputLength = responseText.length;
        }
        if (
          ['clarify', 'health_sensitive'].includes(String(state.conversationDecision || '')) &&
          (responseText.trim().length < 35 || !/[?？]/.test(responseText))
        ) {
          throw new Error('clarification_generation_incomplete');
        }
        state.diagnostics.copyGeneratedBy = 'llm';
        state.diagnostics.copyFallbackUsed = false;
        state.diagnostics.copyGenerationSucceeded = true;
      } catch (error: any) {
        state.diagnostics.copyGeneratedBy = 'technical_fallback';
        state.diagnostics.copyFallbackUsed = true;
        state.diagnostics.technicalFallbackUsed = true;
        state.diagnostics.providerErrorCategory = error?.category || error?.code || 'provider_error';
        state.diagnostics.providerErrorMessage = error?.message || String(error);
        if (state.selectedAgent === 'ShippingAgent') {
          responseText = textPart ? (textPart.text || '') : 'Consultei as opcoes de frete para o seu CEP.';
        } else if (state.selectedAgent === 'CartAgent') {
          responseText = textPart ? (textPart.text || '') : 'Verifiquei o estado atual do seu carrinho.';
        } else {
          responseText = textPart ? (textPart.text || '') : 'Estou com instabilidade temporaria para responder agora. Tente novamente em alguns instantes.';
        }
      }
    }

    state.diagnostics.agentTextLength = responseText.length;

    if (textPart && isGeneric) {
      textPart.text = responseText;
      return {
        ...state,
        diagnostics: {
          ...state.diagnostics,
          builderTextLength: responseText.length
        }
      };
    }

    const parts = [
      { type: 'text', role: 'assistant', text: responseText },
      ...state.parts
    ];

    return {
      ...state,
      parts,
      diagnostics: {
        ...state.diagnostics,
        builderTextLength: responseText.length
      }
    };
  }

  private async responseBuilderNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    // Chama o normalizador global de layouts e CTAs
    const responseBuilder = ResponseBuilder;
    const gatewayMock = {
      message: state.parts.find(p => p.type === 'text')?.text || '',
      layout: state.selectedAgent === 'ProductRecommendationAgent' && state.conversationDecision === 'recommend_products' ? 'product_recommendation' : 
              state.selectedAgent === 'ShippingAgent' ? 'shipping_quote' : 
              state.selectedAgent === 'FreeShippingAgent' ? 'free_shipping_info' :
              state.selectedAgent === 'CartAgent' && state.intent === 'cart_clear' ? 'cart_update' :
              state.selectedAgent === 'CartAgent' ? 'cart_update' :
              state.selectedAgent === 'CouponsAgent' ? 'coupons' : 
              state.selectedAgent === 'PromotionsAgent' ? 'promotions' : 
              state.selectedAgent === 'OrdersAgent' ? 'order_status' : 'text',
      parts: state.parts,
      copyGeneration: state.diagnostics?.copyGeneration,
      customerGoal: state.customerGoal,
      goalSummary: state.goalSummary
    };

    const normalized = responseBuilder.normalizeGatewayResponse(gatewayMock);

    // Mapeia layouts estruturados
    return {
      ...state,
      parts: normalized.parts,
      diagnostics: {
        ...state.diagnostics,
        layout: normalized.layout
      }
    };
  }

  private async contractValidatorNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    const layout = state.diagnostics.layout || 'text';
    const { getRuleRepository } = require('./rule-repository.service');
    const activeContractRules = await getRuleRepository().getActiveContractRules();
    const lastAssistantMessage = state.history?.filter(h => h.role === 'assistant').slice(-1)[0]?.content || null;

    state.diagnostics.activeRules = activeContractRules;
    state.diagnostics.lastAssistantMessage = lastAssistantMessage;
    state.diagnostics.userMessage = state.rawMessage;

    const clientPayload = {
      message: state.parts.find(p => p.type === 'text')?.text || '',
      layout,
      parts: state.parts,
      clientSafe: true,
      diagnostics: state.diagnostics
    };

    let validated = ContractValidator.validateClientResponse(clientPayload);
    const validatedText = validated.parts.find((p: any) => p.type === 'text')?.text || validated.message || '';
    const completeness = validateResponseCompleteness({
      text: validatedText,
      finishReason: state.diagnostics.aiFinishReason || null,
      previousLength: state.diagnostics.builderTextLength || state.diagnostics.agentTextLength || null,
      stageLength: validatedText.length,
      intentionalTransform: false
    });

    const hasValidStructuredResponse =
      validated.parts.some((p: any) => p.type === 'product_cards' && Array.isArray(p.products) && p.products.length > 0) ||
      validated.parts.some((p: any) => p.type === 'actions' && Array.isArray(p.actions) && p.actions.length > 0) ||
      (validatedText.trim().length > 0 && state.selectedAgent !== 'FallbackAgent');
    const routerTechnicalFailure = state.diagnostics.routerFinalStatus === 'technical_failure';

    if (!completeness.complete && routerTechnicalFailure && !hasValidStructuredResponse) {
      const fallbackText = deterministicCompleteFallback(state);
      validated = {
        ...validated,
        layout: 'text',
        message: fallbackText,
        parts: [{ type: 'text', role: 'assistant', text: fallbackText }]
      };
      state.diagnostics.technicalFallbackUsed = true;
    } else if (!completeness.complete && hasValidStructuredResponse) {
      state.diagnostics.responseCompletenessFallbackSuppressed = true;
    }
    const finalText = validated.parts.find((p: any) => p.type === 'text')?.text || '';
    return {
      ...state,
      parts: validated.parts,
      diagnostics: {
        ...state.diagnostics,
        validatedLayout: validated.layout,
        validatorTextLength: validatedText.length,
        responseTextLength: finalText.length,
        responseComplete: completeness.complete,
        responseCompletenessReason: completeness.reason,
        responseCompletenessFallbackUsed: !completeness.complete
      }
    };
  }

  private async diagnosticsNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    // Persiste pendingAction criada pelo agente
    if (state.pendingAction?.status === 'pending' && !state.pendingAction.eventId) {
      const eventId = generateId();
      await db('customer_conversation_events').insert({
        id: eventId,
        conversation_id: state.conversationId,
        event_type: 'pending_action',
        metadata: JSON.stringify({ ...state.pendingAction, createdAt: new Date().toISOString() }),
        created_at: db.fn.now()
      });
      state.pendingAction.eventId = eventId;

      if (state.pendingAction.type === 'free_shipping_check') {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'free_shipping_requested',
          metadata: JSON.stringify({}),
          created_at: db.fn.now()
        });
      }
    }

    if (state.intent === 'cart_clear' && state.diagnostics.cartMutationConfirmed) {
      await db('customer_conversation_events').insert({
        id: generateId(),
        conversation_id: state.conversationId,
        event_type: 'cart_cleared',
        metadata: JSON.stringify({ cartAfter: state.diagnostics.cartAfter }),
        created_at: db.fn.now()
      });
    }

    if (state.intent === 'cart_clear') {
      await db('customer_conversation_events').insert({
        id: generateId(),
        conversation_id: state.conversationId,
        event_type: 'cart_clear_requested',
        metadata: JSON.stringify({}),
        created_at: db.fn.now()
      });
    }

    if (state.cep && ['free_shipping_info', 'free_shipping_check'].includes(state.intent)) {
      await db('customer_conversation_events').insert({
        id: generateId(),
        conversation_id: state.conversationId,
        event_type: 'free_shipping_cep_received',
        metadata: JSON.stringify({ cep: state.cep }),
        created_at: db.fn.now()
      });
      await db('customer_conversation_events').insert({
        id: generateId(),
        conversation_id: state.conversationId,
        event_type: 'free_shipping_checked',
        metadata: JSON.stringify({ cep: state.cep, eligible: state.diagnostics.eligible }),
        created_at: db.fn.now()
      });
    }

    const totalGeminiCalls =
      (state.diagnostics.routerAttempts?.length || 0) +
      (state.diagnostics.copyGeminiCalls || 0) +
      (state.diagnostics.genericCopyGeminiCalls || 0) +
      (state.diagnostics.clarificationRepairUsed ? 1 : 0);
    const finalDiagnostics = {
      ...state.diagnostics,
      totalGeminiCalls,
      agent: state.selectedAgent,
      intent: state.intent,
      confidence: state.confidence,
      riskLevel: state.riskLevel,
      pendingAction: state.pendingAction,
      resolvedEntities: state.resolvedEntities,
      lastRejectedCartAdd: state.lastRejectedCartAdd || state.diagnostics.lastRejectedCartAdd,
      toolsUsed: state.diagnostics.toolsUsed || [],
      toolResultsSummary: state.toolResults.toolResultContext || '',
      executionMode: state.executionContext.executionMode,
      fakeToolsInvoked: state.executionContext.fakeToolInvocations
    };

    const recommendedProducts: any[] = [];
    const couponCards: any[] = [];
    const actionButtons: any[] = [];

    for (const part of state.parts) {
      if ((part.type === 'product_cards' || part.type === 'product_comparison') && Array.isArray(part.products)) {
        recommendedProducts.push(...part.products);
      } else if (part.type === 'coupon_cards' && Array.isArray(part.coupons)) {
        couponCards.push(...part.coupons);
      } else if (part.type === 'actions' && Array.isArray(part.actions)) {
        actionButtons.push(...part.actions);
      }
    }

    const metadata = {
      layout: state.diagnostics.layout || 'text',
      parts: state.parts,
      recommendedProducts,
      couponCards,
      actionButtons,
      userMessageId: state.userMessageId
    };

    const responseText = state.parts.find(p => p.type === 'text')?.text || '';

    // Salva a mensagem da IA no banco
    if (state.userMessageId) {
      const custMsg = await db('customer_conversation_messages').where('id', state.userMessageId).first();
      if (custMsg) {
        const meta = custMsg.metadata ? (typeof custMsg.metadata === 'string' ? JSON.parse(custMsg.metadata) : custMsg.metadata) : {};
        if (meta.processingStatus === 'processed' || meta.assistantMessageId) {
          console.log(`[DiagnosticsNode] Message ${state.userMessageId} already processed, skipping duplicate AI message insertion.`);
          state.diagnostics.alreadyProcessed = true;
          return state;
        }
      }

      // Check if we already inserted an AI response for this specific user message
      const duplicateAiMsg = await db('customer_conversation_messages')
        .where('conversation_id', state.conversationId)
        .where('sender_type', 'ai')
        .whereRaw("metadata->>'userMessageId' = ?", [state.userMessageId])
        .first();
      if (duplicateAiMsg) {
        console.log(`[DiagnosticsNode] AI message already sent for message ${state.userMessageId}, skipping duplicate insertion.`);
        state.diagnostics.alreadyProcessed = true;
        return state;
      }
    }

    if (state.executionContext.executionMode !== 'live') {
      state.diagnostics = finalDiagnostics;
      return state;
    }
    const remainingMs = getKaiaRequestRemainingMs();
    if (state.diagnostics.technicalFallbackUsed === true && remainingMs !== null && remainingMs > 0) {
      const error: any = new Error('kaia_technical_fallback_blocked_before_deadline');
      error.category = state.diagnostics.providerErrorCategory || 'provider_configuration_error';
      throw error;
    }
    if (!state.userMessageId) {
      throw new Error('userMessageId is required before final Kaia persistence');
    }
    if (state.diagnostics.aiSuppressed) {
      await getKaiaMessageExecutionService().markFailed(
        state.userMessageId,
        String(state.diagnostics.graphExecutionId),
        'ai_suppressed',
      );
      state.diagnostics = finalDiagnostics;
      return state;
    }

    const aiMsgId = generateId();
    const lifecycle = getKaiaRequestLifecycle();
    const finalResponseSource =
      state.diagnostics.clarificationRepairUsed || state.diagnostics.copyRepairAttempted
        ? 'llm_repair'
        : state.diagnostics.copyGeneratedBy === 'llm'
          ? 'llm'
          : state.diagnostics.model === 'local_rules'
            ? 'local_rules'
            : 'deterministic';
    const completed = await getKaiaMessageExecutionService().markCompleted({
      userMessageId: state.userMessageId,
      graphExecutionId: String(state.diagnostics.graphExecutionId),
      assistantMessageId: aiMsgId,
      conversationId: state.conversationId,
      message: responseText,
      metadata: {
        ...metadata,
        finalResponseSource,
        graphExecutionId: state.diagnostics.graphExecutionId,
      },
      diagnostics: {
        ...finalDiagnostics,
        executionLockAcquired: true,
        executionLockOwner: true,
        executionStatus: 'completed',
        duplicateExecutionSuppressed: state.diagnostics.duplicateExecutionSuppressed === true,
        waitedForExistingExecutionMs: Number(state.diagnostics.waitedForExistingExecutionMs || 0),
        executionLeaseRenewals: lifecycle?.executionLeaseRenewals || 0,
        providerCooldownWaitMs: lifecycle?.providerCooldownWaitMs || 0,
        providerRetryCount: lifecycle?.providerRetryCount || 0,
        finalPersistenceAttempted: true,
        finalResponseSource,
        initialGenerationFinishReason: state.diagnostics.aiFinishReason || null,
        repairAttempted: !!(state.diagnostics.clarificationRepairUsed || state.diagnostics.copyRepairAttempted),
        repairFinishReason: state.diagnostics.clarificationRepairFinishReason || null,
        finalResponseComplete: state.diagnostics.responseComplete !== false,
      },
    });

    state.parts = Array.isArray(completed.metadata?.parts) ? completed.metadata.parts : state.parts;
    state.diagnostics = {
      ...completed.diagnostics,
      finalPersistenceSucceeded: true,
      finalAssistantMessageId: completed.id,
      inReplyToUserMessageId: state.userMessageId,
      assistantMessagesForUserMessageCount: 1,
    };
    return state;
  }

  private getSystemInstructionForAgent(state: KaiaGraphState, toolContext: string): string {
    let memoryContextString = '';
    if (state.conversationContext) {
      const ctx = state.conversationContext;
      const mems = ctx.approvedCustomerMemory || [];
      if (mems.length > 0) {
        memoryContextString += `\nINFORMAÇÕES E PREFERÊNCIAS APROVADAS DO CLIENTE (USE COM MODERAÇÃO/SUTILEZA E APENAS SE FOR ÚTIL NO CONTEXTO DA RESPOSTA):\n`;
        for (const mem of mems) {
          memoryContextString += `- Preferência/Interesse: ${mem.value}\n`;
        }
      }
    }

    const base = `Você é a Kaia, assistente comercial simpática, objetiva e persuasiva da Kapsu (marketplace de suplementos, vitaminas e cosméticos).
Sua missão é ajudar o cliente, reduzir dúvidas e conduzi-lo para a conversão de forma segura.
${memoryContextString}
REGRAS DE CONVERSÃO E COMUNICAÇÃO:
- Nunca use jargões médicos nem faça diagnósticos, prescrições ou promessas de cura/tratamento.
- Mantenha respostas curtas (mágimo 2 a 3 parágrafos) e amigáveis.
- NUNCA inicie suas respostas com saudações como "Olá!", "Oi!", "Tudo bem?" ou cumprimentos semelhantes. Vá direto ao assunto/resposta de forma simpática, pois o widget do chat já possui uma saudação inicial padrão.
- Use dados reais fornecidos pelo sistema. Nunca invente produtos, preços, cupons ou prazos.
- Nunca retorne JSON, tags legadas como [SPLIT], [LINKS] ou stack traces. Apenas texto limpo.

`;

    let agentSpecific = '';

    if (['clarify', 'health_sensitive'].includes(String(state.conversationDecision || ''))) {
      const correctionRule = state.diagnostics?.correctionTurnDetected
        ? '- Reconheca claramente que agora entendeu a correcao do cliente e atualize a interpretacao anterior.\n'
        : '';
      agentSpecific = `Voce esta atuando em modo conversacional/clarificacao, antes de qualquer recomendacao de produto.
- Gere a resposta em portugues brasileiro natural, curta e humana, com no maximo 320 caracteres.
${correctionRule}- Nao mencione catalogo, busca, recuperacao, produtos encontrados, carrinho, frete, checkout ou CTA comercial.
- Nao recomende suplemento nem produto nesta rodada.
- Para temas de sobrecarga mental, ansiedade, estresse, foco, cansaco, sono ou dificuldade de desligar, acolha sem diagnosticar.
- Termine com exatamente uma pergunta util para distinguir foco, fadiga, estresse, pensamentos acelerados, relaxamento, sono ou sobrecarga emocional.
- Se a mensagem for apenas um desabafo casual, responda de forma natural e pergunte de leve se a pessoa quer falar do que mais pesou.`;
      return `${base}\n\nCONTEXTO REAL E REGRAS DO AGENTE:\n${toolContext}\n\n${agentSpecific}`;
    }

    switch (state.selectedAgent) {
      case 'ProductRecommendationAgent':
        agentSpecific = `Você está atuando como ProductRecommendationAgent. Seu objetivo é ajudar o cliente a encontrar o produto certo.
Use o contexto de produtos fornecido para recomendar de 1 a 3 opções de forma simples e natural, explicando o benefício principal.`;
        break;

      case 'ProductDetailsAgent':
        agentSpecific = `Você está atuando como ProductDetailsAgent. Seu objetivo é fornecer detalhes de forma segura e comercial do produto solicitado pelo cliente.
Use apenas os dados reais cadastrados do produto. Não invente benefícios, composição ou dê diagnóstico/promessas de cura. Se o produto tem nome que coincide com condição de saúde (ex: Lipedema), explique que ele é um produto de suporte Ò  rotina e bem-estar.`;
        break;

      case 'ProductComparisonAgent':
        agentSpecific = `Você está atuando como ProductComparisonAgent. Compare os produtos fornecidos de maneira direta (benefícios, foco principal), indicando qual a melhor escolha conforme o objetivo.`;
        break;

      case 'CartAgent':
        agentSpecific = `Você está atuando como CartAgent. Informe de forma clara o que o cliente tem no carrinho e ajude-o a prosseguir para o pagamento.
Se o cliente pedir para limpar ou esvaziar o carrinho, NUNCA diga que não consegue — o sistema executa clearCustomerCart automaticamente.`;
        break;

      case 'OrdersAgent':
        agentSpecific = `Você está atuando como OrdersAgent. Informe o status do pedido real do cliente de forma muito objetiva.`;
        break;

      case 'PromotionsAgent':
        agentSpecific = `Voce esta atuando como PromotionsAgent. Apresente somente produtos em promocao. Nao apresente cupons nem use coupon_cards neste agente.`;
        break;

      case 'ShippingAgent':
        agentSpecific = `Você está atuando como ShippingAgent. Apresente o prazo e valor de frete simulados de forma transparente.`;
        break;

      case 'FreeShippingAgent':
        agentSpecific = `Você está atuando como FreeShippingAgent. Explique as regras de frete grátis e o valor que falta para o cliente atingir a meta no carrinho.`;
        break;

      case 'CouponsAgent':
        agentSpecific = `Voce esta atuando como CouponsAgent. Apresente somente cupons reais retornados por getPublicCoupons. Se nao houver cupons, diga isso claramente e nao recomende produtos automaticamente.`;
        break;

      case 'DiscountsAgent':
        agentSpecific = `Você está atuando como DiscountsAgent. Apresente um resumo rápido de ofertas de produtos e cupons ativos.`;
        break;

      case 'AccountSupportAgent':
        agentSpecific = `Você está atuando como AccountSupportAgent. Explique como recuperar a senha através da tela de login. Enfatize que alterações de E-mail ou CPF exigem suporte humano por motivos de segurança e integridade de Notas Fiscais.`;
        break;

      case 'HumanSupportAgent':
        agentSpecific = `Você está atuando como HumanSupportAgent. Confirme de forma tranquila e prestativa que você chamou o suporte humano.`;
        break;

      case 'ObjectionHandlingAgent':
        agentSpecific = `Você está atuando como ObjectionHandlingAgent. Responda de forma extremamente comercial, persuasiva, segura e empática. Quebre a objeção (ex: eficácia, frete, preço) com argumentos reais e positivos sobre o controle de qualidade, satisfação de clientes da Kapsu e a garantia dos produtos, convertendo a dúvida em confiança e segurança para a compra.`;
        break;

      case 'SalesAgent':
        agentSpecific = `Você está atuando como SalesAgent. Responda de forma clara, direta, entusiasmada e prestativa. Explique como funciona o processo de compra, as facilidades oferecidas e incentive o cliente a comprar.`;
        break;

      case 'CheckoutAgent':
        agentSpecific = `Você está atuando como CheckoutAgent.
Se o cliente quer pagar, finalizar, ou pergunta sobre um meio de pagamento específico (PIX, Cartão ou Boleto), seja extremamente conciso, curto, natural e focado na ação.
Exemplo: "Perfeito. Para pagar com PIX, vá para o checkout e escolha PIX na forma de pagamento." ou "Ótimo. Para pagar com Cartão de Crédito, siga para o checkout e selecione Cartão como forma de pagamento."
REGRAS RÍGIDAS DE COMUNICAÇÃO:
- NUNCA inclua listas passo a passo numeradas ou tutoriais longos.
- NUNCA inclua links falsos, marcadores Markdown como [Ir para o Checkout](LINK_PARA_CHECKOUT) ou o texto "LINK_PARA_CHECKOUT". Use texto limpo sem links.
- NUNCA explique repetitivamente como funciona o QR code do PIX ou o tempo de compensação, a menos que o cliente pergunte especificamente.
- NUNCA sugira falar com suporte ou exiba sugestões de atendimento humano, a menos que o cliente tenha mencionado explicitamente um erro no checkout ou esteja com problemas de pagamento.`;
        break;

      case 'FallbackAgent':
      default:
        agentSpecific = `Você está atuando como FallbackAgent. Se o cliente enviou uma saudação ou conversa amigável/informal sobre você (ex: "quem é você?", "o que você gosta?"), responda de forma muito simpática, natural e carismática. Caso contrário, se a mensagem for realmente incompreensível, diga de forma educada e concisa que não compreendeu e oriente a usar as opções abaixo.`;
        break;
    }

    return `${base}\n\nCONTEXTO REAL E REGRAS DO AGENTE:\n${toolContext}\n\n${agentSpecific}`;
  }

  private async saveConversationStateNode(state: KaiaGraphState): Promise<KaiaGraphState> {
    if (!state.conversationId) return state;

    try {
      // 1. Salva last_user_intent
      if (state.intent) {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'last_user_intent',
          metadata: JSON.stringify({ intent: state.intent }),
          created_at: db.fn.now()
        });
      }

      // 2. Salva last_assistant_intent
      const assistantIntent = state.diagnostics.intent || state.intent;
      if (assistantIntent) {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'last_assistant_intent',
          metadata: JSON.stringify({ intent: assistantIntent }),
          created_at: db.fn.now()
        });
      }

      // 3. Salva entidades resolvidas na rodada (se houver novidade)
      const prodEntity = state.resolvedEntities?.find(e => e.type === 'product');
      if (prodEntity && prodEntity.source !== 'lastRejectedCartAdd' && prodEntity.source !== 'pending_action_confirm') {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'last_mentioned_product',
          metadata: JSON.stringify({
            id: prodEntity.id,
            name: prodEntity.name,
            source: prodEntity.source,
            confidence: prodEntity.confidence || 1.0,
            mentionedAt: new Date().toISOString()
          }),
          created_at: db.fn.now()
        });
      }

      const catEntity = state.resolvedEntities?.find(e => e.type === 'category');
      if (catEntity) {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'last_mentioned_category',
          metadata: JSON.stringify({
            query: catEntity.value,
            candidates: catEntity.candidates || [],
            mentionedAt: new Date().toISOString()
          }),
          created_at: db.fn.now()
        });
      }

      const qtyEntity = state.resolvedEntities?.find(e => e.type === 'quantity');
      if (qtyEntity) {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'last_quantity',
          metadata: JSON.stringify({
            value: qtyEntity.value,
            mentionedAt: new Date().toISOString()
          }),
          created_at: db.fn.now()
        });
      }

      // 4. Salva o evento de desambiguação se foi gerado pela rodada
      if (state.pendingAction && state.pendingAction.type === 'cart_add_product_disambiguation') {
        await db('customer_conversation_events').insert({
          id: generateId(),
          conversation_id: state.conversationId,
          event_type: 'last_disambiguation',
          metadata: JSON.stringify({
            type: state.pendingAction.type,
            query: state.normalizedMessage,
            quantity: state.pendingAction.quantity,
            candidates: (state.pendingAction as any).candidates,
            createdAt: new Date().toISOString()
          }),
          created_at: db.fn.now()
        });
      }

      // 5. After a successful cart_add, expire the lastRejectedCartAdd context so it does not
      //    contaminate future turns (e.g. customer asks about something else next time).
      const cartAddSucceeded = state.intent === 'cart_add' &&
        (state.diagnostics.cartMutationConfirmed === true || state.diagnostics.itemAdded === true);
      if (cartAddSucceeded && state.lastRejectedCartAdd) {
        await db('customer_conversation_events')
          .where('conversation_id', state.conversationId)
          .where('event_type', 'last_rejected_cart_add')
          .update({
            metadata: db.raw("metadata || ?::jsonb", [
              JSON.stringify({ status: 'cleared', clearedAt: new Date().toISOString() })
            ])
          });
        console.log(`[KaiaOrchestrator] Cleared lastRejectedCartAdd after successful cart_add for conversation ${state.conversationId}`);
      }
    } catch (e) {
      console.error('[KaiaOrchestrator] Error saving context state events:', e);
    }

    return state;
  }
}


let orchestratorInstance: KaiaOrchestrator | null = null;

export function getKaiaOrchestrator(): KaiaOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new KaiaOrchestrator();
  }
  return orchestratorInstance;
}


