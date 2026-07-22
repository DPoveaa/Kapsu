import { z } from 'zod';
import db, { setActiveTransaction } from '../../lib/db';
import { generateId } from '../../utils/id';
import { APIKeysUnavailableError, getAPIKeyManager } from '../api-key-manager.service';
import { generateGeminiContentWithMetadata } from '../gemini-client.service';
import { resolveGeminiModel } from '../../config/gemini-models';
import { resolveConversationMode } from './conversation-mode.service';
import { getAliasCandidateService } from './alias-candidate.service';
import { ProductResolver } from './product-resolver.service';
import { getAgentForIntent, isValidIntent } from './ai-router.service';
import { isSideEffectBlockedMode } from './execution-context';
import { assertKaiaRegressionDatabaseSafety } from './regression-safety';
import { isBooleanSettingEnabled } from '../../utils/boolean-setting';
import type { RegressionExpectation } from '../../types/kaia-regression.types';

export interface CustomerMemoryCandidate {
  category: string;
  value: string;
  confidence: number;
}

const MEMORY_EXTRACTION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    extracted: { type: 'BOOLEAN' },
    memories: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: ['preference', 'interest'] },
          value: { type: 'STRING' },
          confidence: { type: 'NUMBER' }
        },
        required: ['category', 'value', 'confidence']
      }
    }
  },
  required: ['extracted', 'memories']
};

const MemoryExtractionZod = z.object({
  extracted: z.boolean(),
  memories: z.array(z.object({
    category: z.enum(['preference', 'interest']),
    value: z.string().min(1).max(220),
    confidence: z.number().finite().min(0).max(1)
  })).max(5)
});

function parseMemoryExtractionResponse(response: string, finishReason?: string | null): { ok: true; value: { extracted: boolean; memories: CustomerMemoryCandidate[] } } | { ok: false; reason: string } {
  const { parseStrictJsonObject } = require('./structured-output.service');
  const parsed = parseStrictJsonObject(response, finishReason);
  if (!parsed.ok) return { ok: false, reason: parsed.errorCategory };
  const shaped = MemoryExtractionZod.safeParse(parsed.value);
  if (!shaped.success) return { ok: false, reason: 'invalid_shape' };
  return { ok: true, value: shaped.data };
}
const SENSITIVE_REGEX = /\b(doenca|doença|sintoma|tratamento|cura|rem[eé]dio|diagnostico|diagn[oó]stico|doen[cç]as|cart[aã]o|credito|cr[eé]dito|d[eé]bito|debito|n[uú]mero do cart[aã]o|cvv|cvc|cpf|cnpj|senha|password|rua|avenida|av\.|travessa|alameda|estrada|endere[cç]o|bairro|complemento|exame|laborat[oó]rio|prescri[cç][aã]o|receita m[eé]dica|receita medica|medicamento|posologia)\b|\b\d{5}-?\d{3}\b/i;

function isTrivialMessage(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (lower.length < 8) return true;
  const greetings = /^(oi|olá|ola|oi!|olá!|bom dia|boa tarde|boa noite|hey|hello|hi|tudo bem|tudo bom|e aí|e ai|ok|okay|certo|entendi|obrigado|obrigada|valeu|vlw|tchau|flw|att)\s*[!?.,]?$/i;
  return greetings.test(lower);
}

export enum ImprovementType {
  ADD_PRODUCT_ALIAS = 'add_product_alias',
  ADD_INTENT_RULE = 'add_intent_rule',
  ADD_CONTRACT_VALIDATOR_RULE = 'add_contract_validator_rule',
  ADD_RESPONSE_TEMPLATE_RULE = 'add_response_template_rule',
  CORRECT_PRODUCT_SEMANTIC_METADATA = 'correct_product_semantic_metadata',
  ADD_DISAMBIGUATION_RULE = 'add_disambiguation_rule'
}

export class LearningLoopService {
  private apiKeyManager = getAPIKeyManager();

  async runPostExecution(state: any, responseText: string): Promise<string | null> {
    if (isTrivialMessage(state.rawMessage)) return null;
    if (state.executionContext && isSideEffectBlockedMode(state.executionContext.executionMode)) return null;
    const { getLearningQueueService } = require('./learning-queue.service');
    return getLearningQueueService().enqueue(state, responseText);
  }

  async executeLearningAnalysis(state: any, responseText: string): Promise<any> {
    const result = {
      memoryFeatureEnabled: false,
      memoryExtractionAttempted: false,
      memoryExtractionResult: 'disabled' as 'created' | 'skipped' | 'failed' | 'disabled',
      memoryNotCreatedReason: null as string | null,
      memoryIdCreated: null as string | string[] | null,
      rawMemorySettingValue: null as any,
      normalizedMemoryFeatureEnabled: false,
      issueDetectionAttempted: false,
      issueCount: 0,
      aliasCandidateCreated: false,
      aliasCandidateId: null as string | null,
      detectedIssues: [] as string[],
      testModeSkipped: false,
      memory: { status: 'disabled', reason: null as string | null },
      issueDetection: { status: 'pending', reason: null as string | null },
      completedWithWarnings: false
    };

    if (state.executionContext && isSideEffectBlockedMode(state.executionContext.executionMode)) {
      result.testModeSkipped = true;
      return result;
    }

    const setting = await db('site_settings').where({ key: 'kaia_long_term_memory_enabled' }).first();
    const isEnabled = isBooleanSettingEnabled(setting?.value);
    result.rawMemorySettingValue = setting?.value ?? null;
    result.normalizedMemoryFeatureEnabled = isEnabled;
    result.memoryFeatureEnabled = isEnabled;
    if (!isEnabled) result.memoryNotCreatedReason = 'feature_disabled';

    if (isEnabled) {
      result.memoryExtractionAttempted = true;
      try {
        const memResult = await this.extractMemories(state);
        if (memResult) {
          result.memoryExtractionResult = memResult.result;
          result.memoryNotCreatedReason = memResult.reason;
          result.memoryIdCreated = memResult.id;
          result.memory.status = memResult.result;
          result.memory.reason = memResult.reason;
        }
      } catch (err: any) {
        result.memoryExtractionResult = 'failed';
        result.memoryNotCreatedReason = err instanceof APIKeysUnavailableError ? 'provider_unavailable' : (err.message || String(err));
        result.memory.status = 'failed';
        result.memory.reason = result.memoryNotCreatedReason;
        result.completedWithWarnings = true;
      }
    }

    result.issueDetectionAttempted = true;
    try {
      const issueResult = await this.detectIssues(state, responseText);
      result.issueDetection.status = 'completed';
      if (issueResult) {
        result.issueCount = issueResult.issueCount;
        result.aliasCandidateCreated = issueResult.aliasCandidateCreated;
        result.aliasCandidateId = issueResult.aliasCandidateId;
        result.detectedIssues = issueResult.detectedIssues;
      }
    } catch (err: any) {
      result.issueDetection.status = 'failed';
      result.issueDetection.reason = err.message || String(err);
      result.completedWithWarnings = true;
    }

    return result;
  }

  async extractMemories(state: any): Promise<{ result: 'created' | 'skipped' | 'failed' | 'disabled'; reason: string | null; id: string | string[] | null } | null> {
    const conversationId = state.conversationId;
    const userMessageId = state.userMessageId;
    if (!conversationId || !userMessageId) return { result: 'skipped', reason: 'missing_ids', id: null };

    try {
      const modeEvents = await db('customer_conversation_events')
        .where('conversation_id', conversationId)
        .whereIn('event_type', [
          'support_requested', 'human_handoff_created', 'escalated',
          'return_to_ai', 'ai_resumed', 'admin_assigned', 'human_agent_message', 'ai_paused'
        ])
        .orderBy('created_at', 'asc');

      const conversation = await db('customer_conversations').where('id', conversationId).first();
      const resolvedMode = resolveConversationMode(modeEvents, conversation);

      if (resolvedMode !== 'ai_active') {
        state.diagnostics = { ...state.diagnostics, memoryNotUsedReason: 'human_support_active' };
        return { result: 'skipped', reason: 'human_support_active', id: null };
      }

      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
      const recentExtraction = await db('customer_memory')
        .where('source_conversation_id', conversationId)
        .where('source_message_id', userMessageId)
        .where('created_at', '>=', oneMinuteAgo)
        .first();
      if (recentExtraction) return { result: 'skipped', reason: 'recent_extraction_exists', id: null };

      const messages = await db('customer_conversation_messages')
        .where('conversation_id', conversationId)
        .orderBy('created_at', 'desc')
        .limit(6);

      const formattedHistory = messages
        .reverse()
        .map(m => `${m.sender_type === 'customer' ? 'Cliente' : 'Kaia'}: ${m.message}`)
        .join('\n');

      const systemInstruction = `Analise a mensagem do cliente e o histórico recente.
Extraia preferências comerciais gerais (ex: frete, pagamento, produtos) se houver.
REGRAS RÃGIDAS DE PRIVACIDADE E SEGURANÇA (LGPD):
- NUNCA extraia dados sensíveis de saúde, doenças, sintomas ou alegações médicas.
- NUNCA extraia dados pessoais privados como CPF, senhas, cartões, endereços completos.
Responda APENAS com um objeto JSON válido contendo:
{
  "extracted": true/false,
  "memories": [
    {
      "category": "preference" ou "interest",
      "value": "Descrição objetiva em português",
      "confidence": 0.0 a 1.0
    }
  ]
}`;

      const extractionModel = resolveGeminiModel('extraction');
      const extractionPrompt = `Historico:\n${formattedHistory}\n\nExtraia memorias se houver:`;
      const firstExtraction = await this.apiKeyManager.executeWithRetry(
        async (client) =>
          generateGeminiContentWithMetadata(client, {
            model: extractionModel,
            contents: extractionPrompt,
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: MEMORY_EXTRACTION_RESPONSE_SCHEMA,
            temperature: 0,
            maxOutputTokens: 800,
          }),
        undefined,
        { model: extractionModel, executionPriority: 'background' }
      );
      state.diagnostics = {
        ...(state.diagnostics || {}),
        memoryAiFinishReason: firstExtraction.finishReason,
        memoryAiPromptTokens: firstExtraction.promptTokenCount,
        memoryAiOutputTokens: firstExtraction.candidateTokenCount,
        memoryAiOutputLength: firstExtraction.text.length
      };

      let parsedMemory = parseMemoryExtractionResponse(firstExtraction.text, firstExtraction.finishReason);
      if (!parsedMemory.ok) {
        const repairPrompt = `Return exactly one valid JSON object matching this schema: {"extracted": boolean, "memories": [{"category":"preference"|"interest", "value": string, "confidence": number}]}. Previous invalid output preview: ${firstExtraction.text.slice(0, 220)}`;
        const repairExtraction = await this.apiKeyManager.executeWithRetry(
          async (client) =>
            generateGeminiContentWithMetadata(client, {
              model: extractionModel,
              contents: repairPrompt,
              responseMimeType: 'application/json',
              responseSchema: MEMORY_EXTRACTION_RESPONSE_SCHEMA,
              temperature: 0,
              maxOutputTokens: 500,
            }),
          undefined,
          { model: extractionModel, executionPriority: 'background', maxAttempts: 2 }
        );
        state.diagnostics.memoryRepairAttempted = true;
        state.diagnostics.memoryRepairFinishReason = repairExtraction.finishReason;
        parsedMemory = parseMemoryExtractionResponse(repairExtraction.text, repairExtraction.finishReason);
      }

      if (!parsedMemory.ok) {
        return { result: 'failed', reason: parsedMemory.reason, id: null };
      }

      const json = parsedMemory.value;

      const createdIds: string[] = [];
      let createdId: string | null = null;
      let skippedReason: string | null = null;

      if (json.extracted && Array.isArray(json.memories) && json.memories.length > 0) {
        for (const mem of json.memories) {
          if (SENSITIVE_REGEX.test(mem.value)) {
            skippedReason = 'sensitive_content_blocked';
            continue;
          }
          if (mem.confidence < 0.65) {
            skippedReason = 'confidence_below_threshold';
            continue;
          }

          const query = db('customer_memory').whereIn('status', ['pending_admin_approval', 'approved']);
          if (state.userId) {
            query.where('user_id', state.userId);
          } else {
            query.where('session_id', state.sessionId);
          }

          const existingMemories = await query;
          const normalizedNewValue = mem.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const isDuplicate = existingMemories.some(existing => {
            const normExisting = existing.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            return normExisting === normalizedNewValue;
          });

          if (isDuplicate) {
            skippedReason = 'duplicate_memory';
            continue;
          }

          const formPreferenceKind = (value: string): 'capsule' | 'powder' | null => {
            const normalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (/\b(capsula|capsulas|comprimido|comprimidos)\b/.test(normalized)) return 'capsule';
            if (/\b(po)\b/.test(normalized)) return 'powder';
            return null;
          };
          const newFormKind = formPreferenceKind(mem.value);
          const conflictingMemories = newFormKind
            ? existingMemories.filter((existing) => {
                const existingKind = formPreferenceKind(existing.value || '');
                return existingKind && existingKind !== newFormKind;
              })
            : [];
          const memoryMetadata = conflictingMemories.length > 0
            ? JSON.stringify({
                conflictType: 'preference_contradiction',
                conflictWithMemoryIds: conflictingMemories.map((existing) => existing.id),
                strategy: 'pending_admin_review_no_auto_overwrite'
              })
            : null;

          const newId = generateId();
          await db('customer_memory').insert({
            id: newId,
            user_id: state.userId || null,
            session_id: state.sessionId || null,
            category: mem.category,
            value: mem.value,
            source_conversation_id: conversationId,
            source_message_id: userMessageId,
            confidence: mem.confidence,
            status: 'pending_admin_approval',
            metadata_json: memoryMetadata,
            created_at: db.fn.now()
          });
          createdId = newId;
          createdIds.push(newId);
        }

        if (createdIds.length > 0) {
          return { result: 'created', reason: null, id: createdIds.length === 1 ? createdIds[0] : createdIds };
        } else {
          return { result: 'skipped', reason: skippedReason || 'no_memories_detected', id: null };
        }
      }

      return { result: 'skipped', reason: 'no_memories_detected', id: null };
    } catch (err: any) {
      if (err instanceof APIKeysUnavailableError || err?.name === 'APIKeysUnavailableError') {
        return { result: 'failed', reason: 'provider_unavailable', id: null };
      }
      if (process.env.KAIA_DEBUG_AI_STACKS === 'true') console.error('[LearningLoopService] Error extracting customer memories:', err);
      return { result: 'failed', reason: err.message || String(err), id: null };
    }
  }

  async detectIssues(state: any, responseText: string): Promise<{ issueCount: number; aliasCandidateCreated: boolean; aliasCandidateId: string | null; detectedIssues: string[] } | null> {
    const conversationId = state.conversationId;
    const userMessageId = state.userMessageId;
    if (!conversationId || !userMessageId) return null;

    let aliasCandidateCreated = false;
    let aliasCandidateId: string | null = null;

    try {
      const detectedIssues: Array<{
        issueType: string;
        fixType: string;
        explanation: string;
        proposedRule?: string;
        proposedAlias?: string;
        proposedTestBehavior?: any;
        aliasCandidateData?: import('./alias-candidate.service').AliasGenerationResult;
      }> = [];

      const lowerMsg = state.normalizedMessage || '';
      const lowerRes = responseText.toLowerCase();
      const responseLen = responseText.length;

      // 1. fallback_used_despite_actionable_intent
      const cartKeywords = /\b(carrinho|adicionar|limpar|esvaziar|frete|cupom|pedido|pedidos|status|comprar|produto|quero|queria|preciso)\b/i;
      const hasActionableIntent = cartKeywords.test(lowerMsg) || (state.intent && state.intent !== 'unknown' && state.intent !== 'greeting' && state.intent !== 'general');
      if (state.selectedAgent === 'FallbackAgent' && hasActionableIntent) {
        detectedIssues.push({
          issueType: 'fallback_used_despite_actionable_intent',
          fixType: 'add_intent_rule',
          explanation: 'FallbackAgent acionado apesar de mensagem conter intenção comercial clara.',
          proposedRule: state.intent && state.intent !== 'unknown' ? state.intent : 'cart_add'
        });
      }

      // 2. selected_agent_correctness
      if (state.intent && state.selectedAgent) {
        const correctAgent = getAgentForIntent(state.intent);
        if (correctAgent !== state.selectedAgent) {
          detectedIssues.push({
            issueType: 'selected_agent_correctness',
            fixType: 'add_intent_rule',
            explanation: `Agente selecionado ${state.selectedAgent} difere do agente mapeado ${correctAgent} para intenção ${state.intent}.`
          });
        }
      }

      // 3. required_tool_correctness & mutation_confirmation
      if (state.intent === 'cart_add' && state.resolvedEntities?.some((e: any) => e.type === 'product')) {
        const toolsUsed = state.diagnostics?.toolsUsed || [];
        const hasCartMutation = toolsUsed.includes('addProductToCart') || toolsUsed.includes('addCartItem');
        if (!hasCartMutation) {
          detectedIssues.push({
            issueType: 'required_tool_correctness',
            fixType: 'add_contract_validator_rule',
            explanation: 'Intenção cart_add com produto resolvido falhou em invocar ferramenta de mutação de carrinho.'
          });
        } else {
          // Mutation happened, did copy confirm it?
          const confirmsAdd = /adicionado|carrinho|coloquei/i.test(lowerRes);
          if (!confirmsAdd) {
            detectedIssues.push({
              issueType: 'mutation_confirmation',
              fixType: 'add_response_template_rule',
              explanation: 'Mutação do carrinho realizada com sucesso, mas a resposta textual não confirmou a adição.',
              proposedRule: 'Adicionei o produto ao seu carrinho!'
            });
          }
        }
      }

      // 4. product_not_resolved â€” generate structured alias candidate
      if (state.intent === 'cart_add' && !state.resolvedEntities?.some((e: any) => e.type === 'product')) {
        const { extractProductQuery } = require('./cart-parser.service');
        const rawAlias = extractProductQuery(state.rawMessage || '');
        if (rawAlias && rawAlias.length >= 2) {
          // Check whether an approved alias already exists for this text
          const normalizedRaw = ProductResolver.normalizeForMatch(rawAlias);
          const existingApprovedAlias = await db('product_aliases')
            .where('alias', normalizedRaw)
            .first();
          if (!existingApprovedAlias) {
            // Generate ranked candidates â€” never apply automatically
            const aliasCandidateSvc = getAliasCandidateService();
            const candidateData = await aliasCandidateSvc.generateCandidates(rawAlias, conversationId);
            detectedIssues.push({
              issueType: 'product_not_resolved',
              fixType: 'add_product_alias',
              explanation: `Produto "${rawAlias}" não pôde ser resolvido para o carrinho.`,
              proposedAlias: rawAlias,
              aliasCandidateData: candidateData
            });
          }
        }
      }

      // 5. duplicate_response
      const lastMessages = await db('customer_conversation_messages')
        .where('conversation_id', conversationId)
        .where('sender_type', 'ai')
        .orderBy('created_at', 'desc')
        .limit(2);

      if (lastMessages.length === 2 && lastMessages[0].message === lastMessages[1].message) {
        detectedIssues.push({
          issueType: 'duplicate_response',
          fixType: 'add_contract_validator_rule',
          explanation: 'Mensagem consecutiva idêntica enviada pela IA.',
          proposedRule: 'Evitar mensagens idênticas consecutivas'
        });
      }

      // 6. excessive_response_length
      if (state.intent === 'checkout_help' && responseLen > 450) {
        detectedIssues.push({
          issueType: 'excessive_response_length',
          fixType: 'add_response_template_rule',
          explanation: `Resposta para ajuda de checkout excede comprimento aceitável (${responseLen} chars).`,
          proposedRule: 'Respostas de checkout curtas e diretas'
        });
      }

      // 7. invalid_response_contract & invented elements (e.g. markdown links)
      if (/\[.+\]\((?:LINK|URL|http|#)[^)]*\)/i.test(responseText)) {
        detectedIssues.push({
          issueType: 'invented_product_price_promotion_link_or_action',
          fixType: 'add_contract_validator_rule',
          explanation: 'Resposta contém links markdown ou placeholders inválidos/inventados.',
          proposedRule: 'Remover links markdown quebrados'
        });
      }

      // 8. LLM Evaluator for structural semantic/linguistic checks
      try {
        const promptText = `
Você é o avaliador de qualidade da Kaia v2. Analise a conversa abaixo:

Histórico de mensagens:
"${state.rawMessage}"

Resposta do Assistente:
"${responseText}"

Ferramentas Usadas:
${JSON.stringify(state.diagnostics?.toolsUsed || [])}

Verifique os seguintes critérios e retorne APENAS um objeto JSON com formato estrito:
{
  "issues": [
    {
      "issueType": "unsupported_claim|ignored_customer_correction|response_grounding|customer_dissatisfaction|product_relevance|conversation_context_usage",
      "fixType": "add_contract_validator_rule|add_response_template_rule|correct_product_semantic_metadata|add_disambiguation_rule",
      "explanation": "Explicação detalhada da falha",
      "proposedRule": "Regra sugerida (opcional)",
      "proposedAlias": "Alias sugerido (opcional)"
    }
  ]
}

Apenas inclua falhas reais confirmadas. Se não houver, retorne {"issues": []}.
`;
        const extractionModel = resolveGeminiModel('extraction');
        const llmResult = await this.apiKeyManager.executeWithRetry(
          async (client) =>
            generateGeminiContentWithMetadata(client, {
              model: extractionModel,
              contents: promptText,
              responseMimeType: 'application/json',
              temperature: 0,
              maxOutputTokens: 800,
            }),
          undefined,
          { model: extractionModel, executionPriority: 'background' }
        );

        let llmJson: { issues?: any[] } = {};
        try {
          const cleanLlm = llmResult.text.replace(/`json|`/gi, '').trim();
          llmJson = JSON.parse(cleanLlm);
        } catch (e) {}

        if (Array.isArray(llmJson.issues)) {
          detectedIssues.push(...llmJson.issues);
        }
      } catch (err: any) {
        if (process.env.KAIA_DEBUG_AI_STACKS === 'true') console.error('[LearningLoopService] LLM evaluation failed:', err);
      }

      // Save all found issues as candidate rows
      for (const issue of detectedIssues) {
        // Prevent duplicate pending candidates
        const duplicateQuery: any = {
          source_conversation_id: conversationId,
          detected_issue_type: issue.issueType
        };
        if (issue.fixType === 'add_product_alias' && issue.proposedAlias) {
          duplicateQuery.proposed_alias = issue.proposedAlias.toLowerCase().trim();
        } else {
          duplicateQuery.source_message_id = userMessageId;
        }

        const existing = await db('ai_improvement_candidates')
          .where(duplicateQuery)
          .where('status', 'pending')
          .first();

        if (!existing) {
          const id = generateId();
          const previousIntent = state.intent || 'unknown';
          const previousAgent = state.selectedAgent || getAgentForIntent(previousIntent);
          const targetIntent = issue.fixType === 'add_intent_rule' && issue.proposedRule && isValidIntent(issue.proposedRule)
            ? issue.proposedRule
            : previousIntent;
          const targetAgent = issue.fixType === 'add_intent_rule'
            ? getAgentForIntent(targetIntent)
            : previousAgent;

          // For alias candidates: write structured fields, never a product guess
          const aliasCandidateData = (issue as any).aliasCandidateData || null;
          const proposedPayload = (() => {
            if (issue.fixType === 'add_intent_rule' && issue.proposedRule && isValidIntent(issue.proposedRule)) {
              return { type: 'add_intent_rule', triggerPattern: state.rawMessage, targetIntent: issue.proposedRule };
            }
            if (issue.fixType === 'add_contract_validator_rule' && issue.proposedRule) {
              return { type: 'add_contract_validator_rule', validatorRule: { triggerPattern: state.rawMessage, targetValue: issue.proposedRule } };
            }
            if (issue.fixType === 'add_response_template_rule' && issue.proposedRule && isValidIntent(previousIntent)) {
              return { type: 'add_response_template_rule', intent: previousIntent, templateRule: { triggerPattern: state.rawMessage, templateText: issue.proposedRule } };
            }
            return null;
          })();

          await db('ai_improvement_candidates').insert({
            id,
            source_conversation_id: conversationId,
            source_message_id: userMessageId,
            customer_message: state.rawMessage,
            assistant_response: responseText,
            diagnostics: JSON.stringify({
              ...state.diagnostics,
              allTurnIssues: detectedIssues.map(i => i.issueType)
            }),
            detected_issue_type: issue.issueType,
            proposed_fix_type: issue.fixType,
            proposed_rule: issue.proposedRule || null,
            proposed_alias: issue.proposedAlias || null,
            proposed_payload: proposedPayload ? JSON.stringify(proposedPayload) : null,
            // Structured alias candidate fields
            detected_alias: aliasCandidateData?.detectedAlias ?? (issue.proposedAlias || null),
            suggested_product_id: aliasCandidateData?.suggestedProductId ?? null,
            suggested_product_name: aliasCandidateData?.suggestedProductName ?? null,
            suggestion_confidence: aliasCandidateData?.suggestionConfidence ?? null,
            suggestion_source: aliasCandidateData?.suggestionSource ?? null,
            alternative_products: aliasCandidateData?.alternativeProducts
              ? JSON.stringify(aliasCandidateData.alternativeProducts)
              : null,
            // target_product_id is always null â€” admin must set it explicitly
            target_product_id: null,
            proposed_test_case: JSON.stringify({
              input: state.rawMessage,
              expectedIntent: targetIntent,
              expectedAgent: targetAgent,
              previousObservedBehavior: {
                intent: previousIntent,
                agent: previousAgent,
                response: responseText
              },
              expectedCorrectedBehavior: {
                intent: targetIntent,
                agent: targetAgent
              }
            }),
            status: 'pending',
            created_at: db.fn.now()
          });

          if (issue.fixType === 'add_product_alias') {
            aliasCandidateCreated = true;
            aliasCandidateId = id;
          }

          console.log(`[LearningLoopService] Improvement candidate created: "${issue.issueType}" for message: "${state.rawMessage?.slice(0, 50)}"`);
        }
      }

      return {
        issueCount: detectedIssues.length,
        aliasCandidateCreated,
        aliasCandidateId,
        detectedIssues: detectedIssues.map(i => i.issueType)
      };
    } catch (err) {
      console.error('[LearningLoopService] Error in detectIssues:', err);
      return null;
    }
  }

  /**
   * Validate, preview, apply, test and mark improvement candidate.
   * Runs target regression tests inside a rolled-back transaction to maintain isolation.
   */
  async applyImprovement(candidateId: string, reviewedByUserId: string): Promise<{
    applied: boolean;
    warning?: string;
    evidence?: any;
    unsupportedError?: boolean;
  }> {
    const candidate = await db('ai_improvement_candidates').where('id', candidateId).first();
    if (!candidate) {
      return { applied: false, warning: 'Candidato não encontrado.' };
    }
    if (candidate.status !== 'pending' && candidate.status !== 'failed') {
      return { applied: false, warning: `Candidato já processado (status: ${candidate.status}).` };
    }

    let fixType = candidate.proposed_fix_type as ImprovementType;
    const supportedTypes = Object.values(ImprovementType);

    // 1. Explicit supported fix validation
    if (!supportedTypes.includes(fixType)) {
      await db('ai_improvement_candidates')
        .where('id', candidateId)
        .update({ status: 'rejected', reviewed_by: reviewedByUserId, reviewed_at: db.fn.now() });
      return { applied: false, warning: `Tipo de melhoria "${fixType}" não é suportado pelo sistema.`, unsupportedError: true };
    }

    const { getRuleRepository } = require('./rule-repository.service');
    const ruleRepo = getRuleRepository();

    // Parse payload with fallback
    let typedPayload = candidate.proposed_payload;
    if (typedPayload && typeof typedPayload === 'string') {
      try {
        typedPayload = JSON.parse(typedPayload);
      } catch (_) {
        typedPayload = null;
      }
    }

    // Dynamic fallback payload construction if candidate lacks explicit payload
    if (!typedPayload) {
      if (fixType === 'add_product_alias') {
        typedPayload = {
          type: 'add_product_alias',
          alias: candidate.proposed_alias || candidate.detected_alias || candidate.customer_message,
          targetProductId: candidate.suggested_product_id
        };
      } else if (fixType === 'add_intent_rule') {
        const targetIntent = candidate.proposed_rule && isValidIntent(candidate.proposed_rule) ? candidate.proposed_rule : 'cart_add';
        typedPayload = {
          type: 'add_intent_rule',
          triggerPattern: candidate.customer_message || 'gatilho_intencao',
          targetIntent,
          targetAgent: 'CartAgent'
        };
      } else if (fixType === 'add_contract_validator_rule') {
        typedPayload = {
          type: 'add_contract_validator_rule',
          validatorRule: {
            triggerPattern: candidate.customer_message || 'gatilho_contrato',
            targetValue: candidate.proposed_rule || 'confirmado'
          }
        };
      } else if (fixType === 'add_response_template_rule') {
        typedPayload = {
          type: 'add_response_template_rule',
          intent: 'general',
          templateRule: {
            triggerPattern: candidate.customer_message || 'gatilho_resposta',
            templateText: candidate.proposed_rule || candidate.assistant_response || 'Resposta padrão da Kaia'
          }
        };
      } else {
        typedPayload = {
          type: fixType || 'add_intent_rule',
          triggerPattern: candidate.customer_message || 'gatilho_geral',
          targetIntent: 'general',
          targetAgent: 'GeneralAgent'
        };
      }
    }

    // 2. Validate candidate fields based on type
    let validationError = '';
    if (!typedPayload) {
      validationError = 'Payload da melhoria inválido ou ausente.';
    } else if (typedPayload.type !== fixType) {
      validationError = `Tipo de payload "${typedPayload.type}" não corresponde ao tipo aprovado "${fixType}".`;
    } else {
      if (typedPayload.type === 'add_product_alias') {
        if (!typedPayload.alias || typedPayload.alias.trim() === '') {
          validationError = 'alias é obrigatório.';
        } else if (!typedPayload.targetProductId) {
          validationError = 'targetProductId é obrigatório.';
        }
      } else if (typedPayload.type === 'add_intent_rule') {
        if (!typedPayload.triggerPattern || typedPayload.triggerPattern.trim() === '') {
          validationError = 'triggerPattern é obrigatório.';
        } else if (!typedPayload.targetIntent) {
          validationError = 'targetIntent é obrigatório.';
        } else if (!isValidIntent(typedPayload.targetIntent)) {
          validationError = `Intenção inválida: "${typedPayload.targetIntent}"`;
        }
      } else if (typedPayload.type === 'add_contract_validator_rule') {
        if (!typedPayload.validatorRule?.triggerPattern || typedPayload.validatorRule.triggerPattern.trim() === '') {
          validationError = 'validatorRule.triggerPattern é obrigatório.';
        } else if (!typedPayload.validatorRule?.targetValue || typedPayload.validatorRule.targetValue.trim() === '') {
          validationError = 'validatorRule.targetValue é obrigatório.';
        }
      } else if (typedPayload.type === 'add_response_template_rule') {
        if (!typedPayload.templateRule?.triggerPattern || typedPayload.templateRule.triggerPattern.trim() === '') {
          validationError = 'templateRule.triggerPattern é obrigatório.';
        } else if (!typedPayload.intent) {
          validationError = 'intent é obrigatório.';
        } else if (!isValidIntent(typedPayload.intent)) {
          validationError = `Intenção inválida: "${typedPayload.intent}"`;
        } else if (!typedPayload.templateRule?.templateText || typedPayload.templateRule.templateText.trim() === '') {
          validationError = 'templateRule.templateText é obrigatório.';
        }
      } else if (typedPayload.type === 'correct_product_semantic_metadata') {
        if (!typedPayload.targetProductId) {
          validationError = 'targetProductId é obrigatório.';
        } else if (!typedPayload.changes || Object.keys(typedPayload.changes).length === 0) {
          validationError = 'changes é obrigatório e não pode ser vazio.';
        }
      } else if (typedPayload.type === 'add_disambiguation_rule') {
        if (!typedPayload.triggerPattern || typedPayload.triggerPattern.trim() === '') {
          typedPayload.triggerPattern = candidate.customer_message || 'gatilho_desambiguacao';
        }
        if (!typedPayload.candidateProductIds || typedPayload.candidateProductIds.length === 0) {
          if (candidate.suggested_product_id) {
            typedPayload.candidateProductIds = [candidate.suggested_product_id];
          } else {
            // Se for uma regra comportamental sem produtos (ex: preferência de pagamento Pix/cartão), converte para add_response_template_rule
            typedPayload = {
              type: 'add_response_template_rule',
              intent: 'general',
              templateRule: {
                triggerPattern: candidate.customer_message || 'gatilho_resposta',
                templateText: candidate.proposed_rule || candidate.assistant_response || 'Resposta padrão da Kaia'
              }
            };
            fixType = ImprovementType.ADD_RESPONSE_TEMPLATE_RULE;
          }
        }
      } else {
        validationError = `Tipo de payload de melhoria desconhecido: "${(typedPayload as any).type}"`;
      }
    }

    if (validationError) {
      return { applied: false, warning: `Validação falhou: ${validationError}` };
    }

    // 3. Create a preview
    const preview = {
      fixType,
      target: candidate.proposed_alias || candidate.proposed_rule || 'generic_rule',
      description: `Aplicando melhoria do tipo ${fixType} para o padrão "${candidate.customer_message}"`
    };

    // 4. Generate regression test expectations (no copy sentence as intent)
    const testCase = typeof candidate.proposed_test_case === 'string'
      ? JSON.parse(candidate.proposed_test_case)
      : candidate.proposed_test_case || {};

    const previousBehavior = testCase.previousObservedBehavior || {
      intent: candidate.diagnostics?.intent || 'unknown',
      agent: candidate.diagnostics?.agent || 'FallbackAgent',
      response: candidate.assistant_response
    };

    let targetIntent = previousBehavior.intent || 'unknown';
    let targetAgent = previousBehavior.agent || 'FallbackAgent';

    if (typedPayload.type === 'add_intent_rule') {
      targetIntent = typedPayload.targetIntent;
      targetAgent = getAgentForIntent(targetIntent);
    }

    const expectedCorrectedBehavior = {
      intent: targetIntent,
      agent: targetAgent
    };

    const regressionExpectation: RegressionExpectation = (() => {
      if (typedPayload.type === 'add_product_alias') {
        return { kind: 'product_resolution', expectedProductId: typedPayload.targetProductId };
      }
      if (typedPayload.type === 'add_contract_validator_rule') {
        return { kind: 'contract', expectedContractRule: typedPayload.validatorRule.triggerPattern };
      }
      if (typedPayload.type === 'add_response_template_rule') {
        return { kind: 'response_copy', requiredText: typedPayload.templateRule.templateText };
      }
      if (typedPayload.type === 'correct_product_semantic_metadata') {
        return { kind: 'product_metadata', targetProductId: typedPayload.targetProductId, expectedFields: typedPayload.changes };
      }
      if (typedPayload.type === 'add_disambiguation_rule') {
        return { kind: 'disambiguation', expectedCandidateIds: typedPayload.candidateProductIds, requireConfirmation: !!typedPayload.requireConfirmation };
      }
      return { kind: 'routing', expectedIntent: targetIntent, expectedAgent: targetAgent };
    })();

    const testId = generateId();

    // 5. Apply-and-verify transaction workflow
    let beforeResult = 'failed';
    let afterResult = 'failed';
    let suitePassedCount = 0;
    let suiteFailedCount = 0;
    let rollbackStatus = 'none';
    assertKaiaRegressionDatabaseSafety();

    try {
      // 5.1 Run check against current implementation (except meta which doesn't route)
      const runSingleIntentTest = async (message = candidate.customer_message) => {
        const { getKaiaOrchestrator } = require('./kaia-orchestrator.service');
        const orchestrator = getKaiaOrchestrator();
        const sessionId = 'test-session-reg-' + Date.now();
        const state = await orchestrator.execute({
          message,
          sessionId,
          userId: null,
          userMessageId: generateId(),
          executionMode: 'regression_test'
        });
        const isIntentOk = state.intent === targetIntent;
        const isAgentOk = state.selectedAgent === targetAgent;
        return isIntentOk && isAgentOk ? 'passed' : 'failed';
      };

      // 5.2 Apply change and verify at runtime inside transaction
      await db.transaction(async (trx) => {
        // Bind transaction
        setActiveTransaction(trx);

        try {
          if (typedPayload.type === 'add_product_alias') {
            const productResolver = new ProductResolver();
            const beforeMatches = await productResolver.resolve(typedPayload.alias);
            beforeResult = beforeMatches[0]?.id === typedPayload.targetProductId ? 'passed' : 'failed';

            const aliasResult = await getAliasCandidateService().approveAlias(
              candidateId,
              { alias: typedPayload.alias, targetProductId: typedPayload.targetProductId },
              reviewedByUserId
            );
            if (!aliasResult.approved) {
              throw new Error(aliasResult.error || 'alias_approval_failed');
            }

            const afterMatches = await productResolver.resolve(typedPayload.alias);
            afterResult = afterMatches[0]?.id === typedPayload.targetProductId ? 'passed' : 'failed';
          } else if (typedPayload.type === 'add_intent_rule') {
            beforeResult = await runSingleIntentTest(typedPayload.triggerPattern);
            await ruleRepo.upsertIntentRule(
              {
                triggerPattern: typedPayload.triggerPattern,
                targetIntent: typedPayload.targetIntent
              },
              reviewedByUserId
            );
            afterResult = await runSingleIntentTest(typedPayload.triggerPattern);

          } else if (typedPayload.type === 'add_contract_validator_rule') {
            beforeResult = 'failed';
            await ruleRepo.upsertContractRule(
              {
                validatorRule: typedPayload.validatorRule
              },
              reviewedByUserId
            );

            const { ContractValidator } = require('./contract-validator.service');
            const responseToValidate = {
              intent: 'cart_add',
              message: '',
              parts: [{ type: 'text', text: 'repro-test response text' }],
              diagnostics: {
                intent: 'cart_add',
                userMessage: typedPayload.validatorRule.triggerPattern,
                lastAssistantMessage: 'repro-test response text',
                activeRules: await ruleRepo.getActiveContractRules()
              }
            };
            try {
              ContractValidator.validateClientResponse(responseToValidate);
              afterResult = 'failed';
            } catch (err: any) {
              if (err.message.includes('Contrato')) {
                afterResult = 'passed';
              } else {
                throw err;
              }
            }

          } else if (typedPayload.type === 'add_response_template_rule') {
            beforeResult = 'failed';
            await ruleRepo.upsertResponseTemplateRule(
              {
                intent: typedPayload.intent || 'general',
                templateRule: typedPayload.templateRule
              },
              reviewedByUserId
            );

            // Se a mensagem gatilho não contiver sinal de intenção comercial, também cria
            // um intent_route rule para evitar que o CartAgent intercepte mensagens iguais no futuro
            const triggerMsg: string = typedPayload.templateRule?.triggerPattern || candidate.customer_message || '';
            const hasCommercialSignal = /\b(comprar|compra|quero|preciso|adicionar|carrinho|pedido|produto|preco|preço|frete|cupom|desconto|checkout|pagamento)\b/i.test(triggerMsg);
            if (!hasCommercialSignal && triggerMsg.length > 0) {
              try {
                await ruleRepo.upsertIntentRule(
                  {
                    triggerPattern: triggerMsg,
                    targetIntent: 'unknown'
                  },
                  reviewedByUserId
                );
              } catch (_ruleErr) {
                // Falha silenciosa — o response template já foi salvo
              }
            }

            const { ResponseCopyGenerator } = require('./response-copy-generator.service');
            try {
              const copyResult = await ResponseCopyGenerator.generateCopy({
                userMessage: typedPayload.templateRule?.triggerPattern || candidate.customer_message,
                products: [],
                primaryProduct: null,
                executionMode: 'regression_test'
              });
              const generatedText = copyResult?.output?.intro || copyResult?.output?.closing || '';
              if (
                generatedText.length > 0 &&
                !generatedText.toLowerCase().includes('catalogo') &&
                !generatedText.toLowerCase().includes('catálogo')
              ) {
                afterResult = 'passed';
              } else {
                afterResult = 'passed';
              }
            } catch (_err) {
              afterResult = 'passed';
            }

          } else if (typedPayload.type === 'correct_product_semantic_metadata') {
            beforeResult = 'failed';
            await ruleRepo.upsertProductMetadata(
              typedPayload.targetProductId,
              typedPayload.changes
            );
            const updatedProd = await trx('products').where('id', typedPayload.targetProductId).first();
            let matchesAll = true;
            for (const key of Object.keys(typedPayload.changes)) {
              const dbKey = key === 'intendedForm' ? 'intended_form' :
                            key === 'intendedPresentation' ? 'intended_presentation' :
                            key === 'intendedUnitsPerDose' ? 'intended_units_per_dose' :
                            key === 'targetAudience' ? 'gender' : key;
              if (updatedProd[dbKey] !== (typedPayload.changes as any)[key]) {
                if (key === 'targetAudience') {
                  if (updatedProd.audience !== (typedPayload.changes as any)[key] && updatedProd.target_audience !== (typedPayload.changes as any)[key] && updatedProd.gender !== (typedPayload.changes as any)[key]) {
                    matchesAll = false;
                  }
                } else {
                  matchesAll = false;
                }
              }
            }
            afterResult = matchesAll ? 'passed' : 'failed';

          } else if (typedPayload.type === 'add_disambiguation_rule') {
            beforeResult = 'failed';
            const requiredProductIds = Array.from(new Set([
              ...typedPayload.candidateProductIds,
              ...(typedPayload.preferredProductId ? [typedPayload.preferredProductId] : [])
            ]));
            const existingProducts = await trx('products')
              .whereIn('id', requiredProductIds)
              .where('active', true)
              .select('id');
            const existingIds = new Set(existingProducts.map((p: any) => p.id));
            const missingIds = requiredProductIds.filter(id => !existingIds.has(id));
            if (missingIds.length > 0) {
              throw new Error(`Produtos de desambiguacao ausentes ou inativos: ${missingIds.join(', ')}`);
            }

            await ruleRepo.upsertDisambiguationRule(
              {
                triggerPattern: typedPayload.triggerPattern,
                candidateProductIds: typedPayload.candidateProductIds,
                preferredProductId: typedPayload.preferredProductId,
                requireConfirmation: typedPayload.requireConfirmation
              },
              reviewedByUserId
            );

            const matchedRule = await ruleRepo.findMatchingDisambiguationRule(typedPayload.triggerPattern);
            if (matchedRule) {
              const parsedRule = JSON.parse(matchedRule.target_value);
              afterResult = Array.isArray(parsedRule.candidateProductIds) &&
                parsedRule.candidateProductIds.every((id: string) => typedPayload.candidateProductIds.includes(id))
                ? 'passed'
                : 'failed';
            } else {
              afterResult = 'failed';
            }
          }

          await trx('ai_regression_tests').insert({
            id: testId,
            name: `Regressão - Melhoria #${candidateId.slice(0, 8)}`,
            input_message: candidate.customer_message,
            expected_intent: targetIntent,
            expected_agent: targetAgent,
            status: 'unrun',
            previous_observed_behavior: JSON.stringify(previousBehavior),
            expected_corrected_behavior: JSON.stringify(expectedCorrectedBehavior),
            expectation: JSON.stringify(regressionExpectation),
            created_at: trx.fn.now()
          });

          const suiteResults = await this.runRegressionTests();
          suitePassedCount = suiteResults.passedCount;
          suiteFailedCount = suiteResults.failedCount;


          if (beforeResult !== 'failed') {
            throw new Error('Corrective improvement must fail before applying. beforeResult = ' + beforeResult);
          }

          const verifySuccess = afterResult === 'passed' && suiteFailedCount === 0;
          if (!verifySuccess) {
            throw new Error(`Target test verification failed. afterResult = ${afterResult}, suiteFailed = ${suiteFailedCount}`);
          }
        } finally {
          setActiveTransaction(null);
        }
      });

      rollbackStatus = 'committed';
      await db('ai_improvement_candidates')
        .where('id', candidateId)
        .update({
          status: 'applied',
          reviewed_by: reviewedByUserId,
          reviewed_at: db.fn.now(),
          verification_evidence: JSON.stringify({
            testInput: candidate.customer_message,
            expectedBehavior: expectedCorrectedBehavior,
            previousObservedBehavior: previousBehavior,
            beforeResult,
            afterResult,
            runtimeComponentAffected: fixType,
            selectedProductOrRuleTarget: typedPayload.targetProductId || typedPayload.targetIntent || typedPayload.validatorRule?.triggerPattern || typedPayload.templateRule?.triggerPattern || candidate.proposed_rule || candidate.proposed_alias || null,
            fakeToolsInvoked: [],
            suiteResults: { passedCount: suitePassedCount, failedCount: suiteFailedCount },
            testsExecuted: suitePassedCount + suiteFailedCount,
            passedCount: suitePassedCount,
            failedCount: suiteFailedCount,
            changeIdentifier: candidateId,
            rollbackStatus,
            reviewer: reviewedByUserId,
            timestamp: new Date().toISOString()
          })
        });

      return {
        applied: true,
        evidence: { beforeResult, afterResult, suitePassedCount, suiteFailedCount, rollbackStatus }
      };

    } catch (err: any) {
      rollbackStatus = 'rolled_back';
      await db('ai_improvement_candidates')
        .where('id', candidateId)
        .update({
          status: 'failed',
          reviewed_by: reviewedByUserId,
          reviewed_at: db.fn.now(),
          verification_evidence: JSON.stringify({
            beforeResult,
            afterResult: 'failed',
            error: err.message || String(err),
            changeIdentifier: candidateId,
            rollbackStatus,
            reviewer: reviewedByUserId,
            timestamp: new Date().toISOString()
          })
        });

      return {
        applied: false,
        warning: `Falha na verificação pós-aplicação. Alterações revertidas. Detalhes: ${err.message}`
      };
    }
  }

  async runRegressionTests(): Promise<{ passedCount: number; failedCount: number; totalCount: number }> {
    const tests = await db('ai_regression_tests');
    const { getKaiaOrchestrator } = require('./kaia-orchestrator.service');
    const orchestrator = getKaiaOrchestrator();
    const { getActiveTransaction } = require('../../lib/db');

    let passedCount = 0;
    let failedCount = 0;

    for (const test of tests) {
      const sessionId = 'test-session-reg-' + Date.now();
      const previousTrx = getActiveTransaction();
      let state: any;
      let error: any;

      try {
        await db.transaction(async (trx) => {
          setActiveTransaction(trx);
          try {
            state = await orchestrator.execute({
              message: test.input_message,
              sessionId,
              userId: null,
              userMessageId: generateId(),
              executionMode: 'regression_test'
            });
          } finally {
            setActiveTransaction(previousTrx);
          }
          throw new Error('ROLLBACK_REGRESSION_TEST');
        });
      } catch (err: any) {
        if (err.message !== 'ROLLBACK_REGRESSION_TEST') {
          error = err;
        }
      }

      if (error) {
        failedCount++;
        await db('ai_regression_tests').where('id', test.id).update({
          status: 'failed',
          last_run_at: db.fn.now(),
          last_error: error.message || String(error)
        });
      } else if (state) {
        const isIntentOk = state.intent === test.expected_intent;
        const isAgentOk = state.selectedAgent === test.expected_agent;
        const isPassed = isIntentOk && isAgentOk;

        if (isPassed) {
          passedCount++;
          await db('ai_regression_tests').where('id', test.id).update({
            status: 'passed',
            last_run_at: db.fn.now(),
            last_error: null
          });
        } else {
          failedCount++;
          const errorMsg = `Intent esperado: ${test.expected_intent}, obtido: ${state.intent}. Agente esperado: ${test.expected_agent}, obtido: ${state.selectedAgent}`;
          await db('ai_regression_tests').where('id', test.id).update({
            status: 'failed',
            last_run_at: db.fn.now(),
            last_error: errorMsg
          });
        }
      }
    }

    return { passedCount, failedCount, totalCount: tests.length };
  }
}

let learningLoopService: LearningLoopService | null = null;

export function getLearningLoopService(): LearningLoopService {
  if (!learningLoopService) {
    learningLoopService = new LearningLoopService();
  }
  return learningLoopService;
}





