const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'Kapsu-api');
function edit(relative, transforms) {
  const file = path.join(root, relative);
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const transform of transforms) {
    const next = transform(text);
    if (next === text) throw new Error(`No match in ${relative}`);
    text = next;
  }
  fs.writeFileSync(file, text, 'utf8');
}
edit('src/services/kaia-v2/ai-router.service.ts', [
  s => s.replace("  prompt_injection_attempt: {", `  complaint: {
    intent: 'complaint',
    selectedAgent: 'FallbackAgent',
    requiredTools: [],
    needsAuth: false,
    riskLevel: 'low',
    conversionStage: 'support',
    salesOpportunity: false
  },
  prompt_injection_attempt: {`),
  s => s.replace(/\n    \/\/ 2a\. Commercial preference statements:[\s\S]*?\n    \/\/ 2b\. Coupons/, "\n    // 2b. Coupons"),
  s => s.replace(
    "- FallbackAgent/unknown: somente quando a mensagem esta fora de escopo ou incompreensivel, nao para falha tecnica.",
    `- FallbackAgent/complaint: cliente reclama de atendimento, pedido, produto ou experiencia. Acolha a insatisfacao sem vender, sem invalidar e sem presumir que pediu atendente.
- FallbackAgent/unknown: conversa casual ou mensagem fora de escopo/incompreensivel. Use conversationDecision=converse para conversa casual; nao use unknown para falha tecnica.`,
  )
]);
edit('src/services/kaia-v2/kaia-orchestrator.service.ts', [
  s => s.replace(/\n  private normalizeForPolicy\(value: string\): string \{[\s\S]*?\n  \}\n\n  private decideConversationPolicy/, "\n  private decideConversationPolicy"),
  s => s.replace(
    `      case 'ProductRecommendationAgent':
        agentSpecific = \`VocÃª estÃ¡ atuando como ProductRecommendationAgent. Seu objetivo Ã© ajudar o cliente a encontrar o produto certo.
Use o contexto de produtos fornecido para recomendar de 1 a 3 opÃ§Ãµes de forma simples e natural, explicando o benefÃ­cio principal.\`;
        break;`,
    `      case 'ProductRecommendationAgent':
        if (Number(state.diagnostics?.retrieval?.finalProducts || 0) === 0) {
          agentSpecific = \`Voce esta respondendo a um pedido de recomendacao sem evidencia de catalogo suficiente.
- Nao invente, nao cite nem mostre produtos.
- Nao exponha busca, recuperacao, ranking ou quantidade de opcoes.
- Responda ao objetivo atual e ao historico com honestidade e naturalidade.
- Faca uma pergunta curta que ajude a refinar a necessidade sem pressionar a compra.\`;
        } else {
          agentSpecific = \`VocÃª estÃ¡ atuando como ProductRecommendationAgent. Seu objetivo Ã© ajudar o cliente a encontrar o produto certo.
Use o contexto de produtos fornecido para recomendar de 1 a 3 opÃ§Ãµes de forma simples e natural, explicando o benefÃ­cio principal.\`;
        }
        break;`,
  ),
  s => s.replace(
    `      case 'FallbackAgent':
      default:
        agentSpecific = \`VocÃª estÃ¡ atuando como FallbackAgent.`,
    `      case 'FallbackAgent':
      default:
        if (state.intent === 'complaint') {
          agentSpecific = \`Voce esta respondendo a uma reclamacao real do cliente. Reconheca a insatisfacao de forma especifica, peca desculpas pela experiencia e faca uma pergunta objetiva sobre como resolver. Nao venda, nao recomende produto e nao transfira para humano sem pedido explicito.\`;
          break;
        }
        agentSpecific = \`VocÃª estÃ¡ atuando como FallbackAgent.`,
  )
]);
