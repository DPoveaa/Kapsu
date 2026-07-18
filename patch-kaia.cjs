const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'Kapsu-api');
function edit(file, transforms) {
  const full = path.join(root, file);
  let text = fs.readFileSync(full, 'utf8');
  for (const transform of transforms) {
    const next = transform(text);
    if (next === text) throw new Error(`No match in ${file}`);
    text = next;
  }
  fs.writeFileSync(full, text, 'utf8');
}
edit('src/services/kaia-v2/ai-router.service.ts', [
  s => s.replace("  healthSensitivity?: 'low' | 'medium' | 'high';\n}", `  healthSensitivity?: 'low' | 'medium' | 'high';
  conversationDecision?: ConversationDecision;
  customerCorrection?: boolean;
}
export type ConversationDecision =
  | 'converse' | 'clarify' | 'recommend_products' | 'product_details'
  | 'compare_products' | 'execute_operation' | 'health_sensitive'
  | 'human_support' | 'technical_failure';`),
  s => s.replace("const VALID_AGENTS = Array.from(new Set(Object.values(INTENT_MAP).map((config) => config.selectedAgent)));\n", `const VALID_AGENTS = Array.from(new Set(Object.values(INTENT_MAP).map((config) => config.selectedAgent)));
const VALID_CONVERSATION_DECISIONS: ConversationDecision[] = [
  'converse', 'clarify', 'recommend_products', 'product_details',
  'compare_products', 'execute_operation', 'health_sensitive',
  'human_support', 'technical_failure'
];
`),
  s => s.replace("    healthSensitivity: { type: 'STRING', enum: ['low', 'medium', 'high'] }\n  },\n  required: ['intent', 'selectedAgent', 'confidence', 'salesOpportunity', 'customerGoal', 'goalSummary', 'needsClarification', 'healthSensitivity']", `    healthSensitivity: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    conversationDecision: { type: 'STRING', enum: VALID_CONVERSATION_DECISIONS },
    customerCorrection: { type: 'BOOLEAN' }
  },
  required: ['intent', 'selectedAgent', 'confidence', 'salesOpportunity', 'customerGoal', 'goalSummary', 'needsClarification', 'healthSensitivity', 'conversationDecision', 'customerCorrection']`),
  s => s.replace("  healthSensitivity: z.enum(['low', 'medium', 'high']).optional()\n}).passthrough();", `  healthSensitivity: z.enum(['low', 'medium', 'high']).optional(),
  conversationDecision: z.enum([
    'converse', 'clarify', 'recommend_products', 'product_details',
    'compare_products', 'execute_operation', 'health_sensitive',
    'human_support', 'technical_failure'
  ]).optional(),
  customerCorrection: z.boolean().optional()
}).passthrough();`),
  s => s.replace("healthSensitivity: 'low' | 'medium' | 'high' } }", "healthSensitivity: 'low' | 'medium' | 'high'; conversationDecision?: ConversationDecision; customerCorrection: boolean } }"),
  s => s.replace("      healthSensitivity: value.healthSensitivity ?? 'low'\n", "      healthSensitivity: value.healthSensitivity ?? 'low',\n      conversationDecision: value.conversationDecision,\n      customerCorrection: value.customerCorrection ?? false\n"),
  s => s.replace("        healthSensitivity: parsedValue.healthSensitivity,\n        resolvedEntity: {", "        healthSensitivity: parsedValue.healthSensitivity,\n        conversationDecision: parsedValue.conversationDecision,\n        customerCorrection: parsedValue.customerCorrection,\n        resolvedEntity: {"),
  s => s.replace("          healthSensitivity: parsedValue.healthSensitivity,\n          routerDiagnostics: {", "          healthSensitivity: parsedValue.healthSensitivity,\n          conversationDecision: parsedValue.conversationDecision,\n          customerCorrection: parsedValue.customerCorrection,\n          routerDiagnostics: {"),
  s => s.replace("Required fields: intent, selectedAgent, confidence, salesOpportunity, customerGoal, goalSummary, needsClarification, healthSensitivity. Invalid previous output preview:", "Use only these conversation decisions: ${VALID_CONVERSATION_DECISIONS.join(', ')}. Required fields: intent, selectedAgent, confidence, salesOpportunity, customerGoal, goalSummary, needsClarification, healthSensitivity, conversationDecision, customerCorrection. Invalid previous output preview:"),
  s => s.replace("      salesOpportunity: false,\n      resolvedEntity: {", "      salesOpportunity: false,\n      conversationDecision: 'technical_failure',\n      customerCorrection: false,\n      resolvedEntity: {"),
  s => s.replace("- healthSensitivity: low para bem-estar geral claro, medium para ansiedade, estresse, sobrecarga mental, sono ambiguo ou tema de saude ambiguo, high para sintoma intenso/urgente.\n", `- healthSensitivity: low para bem-estar geral claro, medium para ansiedade, estresse, sobrecarga mental, sono ambiguo ou tema de saude ambiguo, high para sintoma intenso/urgente.
- conversationDecision: escolha uma politica antes da recuperacao: converse, clarify, recommend_products, product_details, compare_products, execute_operation, health_sensitive ou human_support. Nunca use recommend_products quando needsClarification=true.
- customerCorrection: true quando a mensagem atual corrige ou substitui a interpretacao anterior. A mensagem atual prevalece sobre historico e objetivo anteriores.
`),
  s => s.replace('  "healthSensitivity": "low"\n}', '  "healthSensitivity": "low",\n  "conversationDecision": "converse",\n  "customerCorrection": false\n}')
]);
edit('src/services/kaia-v2/kaia-orchestrator.service.ts', [
  s => s.replace("import { getAiRouter, isAmbiguousHealthSensitive, INTENT_MAP } from './ai-router.service';", "import { getAiRouter, isAmbiguousHealthSensitive, INTENT_MAP, type ConversationDecision } from './ai-router.service';"),
  s => s.replace("  conversationDecision?: 'converse' | 'clarify' | 'recommend_products' | 'health_sensitive' | 'no_grounded_product' | 'technical_failure';", "  conversationDecision?: ConversationDecision;"),
  s => s.replace(/\n  private hasExplicitCommerceRequest[\s\S]*?\n  private decideConversationPolicy/, "\n  private decideConversationPolicy"),
  s => s.replace(/\n    if \(this\.hasExplicitOperationalRequest[\s\S]*?    const sensitive = state\.healthSensitivity === 'medium' \|\| state\.healthSensitivity === 'high';/, `
    const routerDecision = state.conversationDecision;
    const correctionTurn = state.diagnostics?.customerCorrection === true;
    const sensitive = state.healthSensitivity === 'medium' || state.healthSensitivity === 'high';`),
  s => s.replace(/    let decision: KaiaGraphState\['conversationDecision'\] = 'converse';[\s\S]*?    }\n\n    const healthSensitivity/, `    let decision: ConversationDecision = routerDecision || 'converse';
    if (state.selectedAgent === 'ProductRecommendationAgent') {
      decision = state.needsClarification || sensitive ? (sensitive ? 'health_sensitive' : 'clarify') : (routerDecision || 'recommend_products');
    } else if (state.selectedAgent === 'ProductDetailsAgent') {
      decision = 'product_details';
    } else if (state.selectedAgent === 'ProductComparisonAgent') {
      decision = 'compare_products';
    } else if (state.selectedAgent === 'HealthClarificationAgent' || state.intent === 'clarification_needed') {
      decision = sensitive ? 'health_sensitive' : 'clarify';
    } else if (state.selectedAgent === 'HumanSupportAgent') {
      decision = 'human_support';
    } else if (!['FallbackAgent', 'SalesAgent', 'ObjectionHandlingAgent'].includes(state.selectedAgent)) {
      decision = 'execute_operation';
    }
    if (decision === 'recommend_products' && (state.needsClarification || sensitive)) {
      decision = sensitive ? 'health_sensitive' : 'clarify';
    }

    const healthSensitivity`),
  s => s.replace("        correctionTurnDetected: correctionTurn,\n        ambiguousWellbeingDetected: ambiguousWellbeing,\n        explicitCommerceDetected: explicitCommerce,", "        correctionTurnDetected: correctionTurn,"),
  s => s.replace("      healthSensitivity: route.healthSensitivity ?? route.resolvedEntity?.healthSensitivity ?? state.healthSensitivity ?? 'low',\n      riskLevel:", "      healthSensitivity: route.healthSensitivity ?? route.resolvedEntity?.healthSensitivity ?? state.healthSensitivity ?? 'low',\n      conversationDecision: route.conversationDecision ?? route.resolvedEntity?.conversationDecision,\n      riskLevel:"),
  s => s.replace("        healthSensitivity: route.healthSensitivity ?? route.resolvedEntity?.healthSensitivity ?? state.healthSensitivity ?? 'low',\n        routerFinalStatus:", "        healthSensitivity: route.healthSensitivity ?? route.resolvedEntity?.healthSensitivity ?? state.healthSensitivity ?? 'low',\n        customerCorrection: route.customerCorrection ?? route.resolvedEntity?.customerCorrection ?? false,\n        routerConversationDecision: route.conversationDecision ?? route.resolvedEntity?.conversationDecision ?? null,\n        routerFinalStatus:")
]);
edit('src/services/kaia-v2/agents/product-recommendation.agent.ts', [
  s => s.replace(/      toolResultContext = `Nenhum produto correspondente[\s\S]*?      \}\);\r?\n/, `      toolResultContext = \`EVIDENCIA DE CATALOGO: nenhum produto ativo tem metadados suficientes para sustentar o objetivo "\${state.customerGoal || state.goalSummary || state.rawMessage}".
Responda naturalmente ao pedido atual usando o historico relevante. Nao invente nem mostre produtos, nao exponha busca interna e nao use frases prontas sobre quantidade de opcoes. Explique que nao ha indicacao segura e faca uma pergunta curta para refinar a necessidade.\`;
`)
]);
edit('src/services/kaia-v2/response-copy-generator.service.ts', [
  s => s.replace("    if (!parsed) {\n      copyFallbackUsed = true;\n      parsed = fallbackCopy;", `    if (!parsed && input.executionMode === 'live') {
      const error: any = new Error(copyErrorCategory || (copyParseFailed ? 'recommendation_copy_invalid' : 'recommendation_copy_unavailable'));
      error.category = 'provider_error';
      throw error;
    }
    if (!parsed) {
      copyFallbackUsed = true;
      parsed = fallbackCopy;`),
  s => s.replace("    if (uniqueBlocked.length > 0) {\n      copyFallbackUsed = true;", `    if (uniqueBlocked.length > 0) {
      if (input.executionMode === 'live') {
        const error: any = new Error('recommendation_copy_unsafe');
        error.category = 'unsafe_generation';
        throw error;
      }
      copyFallbackUsed = true;`)
]);
