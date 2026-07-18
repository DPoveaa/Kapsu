import { SpecializedAgent } from './base.agent';
import { KaiaGraphState } from '../kaia-orchestrator.service';
import { getVectorRagService } from '../vector-rag.service';
import { getKaiaToolProvider } from '../tool-provider';
import { getProductRecommendationRanker } from '../ranker.service';
import { ResponseCopyGenerator } from '../response-copy-generator.service';
import db from '../../../lib/db';

export class ProductRecommendationAgent implements SpecializedAgent {
  name = 'ProductRecommendationAgent';
  authorizedTools = ['semanticSearchProducts', 'graphSearchProducts', 'getCustomerCart', 'getProductById', 'rankProducts'];

  async run(state: KaiaGraphState): Promise<Partial<KaiaGraphState>> {
    const toolRegistry = getKaiaToolProvider(state);
    const warnings: string[] = [];
    const recommendedProductsTrack: string[] = [];
    let freeShippingSuggestion = false;
    let couponSuggested = false;
    let parts: any[] = [];
    let toolResultContext = '';
    let semanticCount = 0;
    let graphCount = 0;
    let finalProductsCount = 0;
    let copyGeneration: any = undefined;
    let copyDiagnostics: any = undefined;

    const retrievalStartedAt = Date.now();
    const semanticGoal = [state.customerGoal, state.goalSummary].filter(Boolean).join(' | ').trim();
    const retrievalQuery = semanticGoal ? `${semanticGoal} | ${state.rawMessage}` : state.rawMessage;

    // 1. Busca semantica usando o objetivo produzido pelo roteador quando disponivel.
    const semanticCandidates = await getVectorRagService().semanticSearch(retrievalQuery, 10, 0.40);
    semanticCount = semanticCandidates.length;

    // 2. Busca por objetivos no grafo
    let graphProducts: any[] = [];
    const intentGoal = state.customerGoal || state.goalSummary || state.intent;
    if (intentGoal) {
      graphProducts = await toolRegistry.graphSearchProducts(intentGoal);
      graphCount = graphProducts.length;
    }

    // Detecta goals para ranqueamento
    const goalsDetected: string[] = [];
    if (state.customerGoal) goalsDetected.push(state.customerGoal);
    if (state.goalSummary && state.goalSummary !== state.customerGoal) goalsDetected.push(state.goalSummary);
    if (goalsDetected.length === 0 && intentGoal) goalsDetected.push(intentGoal);

    // Consolida o carrinho do cliente
    const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
    const cartProductIds = (cart?.items || []).map((i: any) => i.productId);

    let candidatesForRanking = semanticCandidates;
    if (candidatesForRanking.length === 0 && retrievalQuery.trim()) {
      const normalizedInput = retrievalQuery
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const genericTerms = Array.from(new Set(normalizedInput
        .split(/\s+/)
        .map((term) => term.replace(/[^a-z0-9]/g, ''))
        .filter((term) => term.length >= 4 && !['quero', 'algo', 'para', 'mais', 'com', 'durante', 'minha', 'meu', 'pela', 'pelo', 'cuidados', 'tenho', 'dificuldade'].includes(term))));

      if (genericTerms.length > 0) {
        const rows = await db('products').where('active', true);
        const scored = rows.map((product: any) => {
          const category = String(product.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const benefits = String(product.benefits || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const description = String(product.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const name = String(product.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          let score = 0;
          for (const term of genericTerms) {
            if (category.includes(term)) score += 0.35;
            if (benefits.includes(term)) score += 0.45;
            if (name.includes(term)) score += 0.20;
            if (description.includes(term)) score += 0.12;
          }
          return { product, score };
        })
        .filter((item: any) => item.score >= 0.45)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);

        candidatesForRanking = scored.map(({ product, score }: any) => ({
          id: product.id,
          productId: product.id,
          productName: product.name,
          name: product.name,
          price: Number(product.price || 0),
          promoPrice: product.promo_price ? Number(product.promo_price) : null,
          category: product.category || '',
          benefits: product.benefits || '',
          description: product.description || '',
          searchableText: [product.name, product.category, product.benefits, product.description].filter(Boolean).join(' | '),
          explanation: product.benefits || product.description || '',
          image: product.image || null,
          score: Math.min(0.95, Math.max(0.40, score)),
          matchType: 'textual_goal_fallback',
          matchSource: 'active_product_text_fields'
        }));
        semanticCount = candidatesForRanking.length;
      }
    }

    const retrievalLatencyMs = Date.now() - retrievalStartedAt;

    // Rank products with the commercial recommendation ranker
    const rankingStartedAt = Date.now();
    const ranker = getProductRecommendationRanker();
    const rankedCandidates = await ranker.rankProducts(candidatesForRanking, goalsDetected, {
      cartProductIds,
      userMessage: retrievalQuery
    });

    finalProductsCount = rankedCandidates.length;
    const rankingLatencyMs = Date.now() - rankingStartedAt;
    const rankingDiagnostics = ranker.getLastDiagnostics();

    if (rankedCandidates.length > 0) {
      toolResultContext = `PRODUTOS REAIS DISPONÍVEIS NO ESTOQUE:\n` +
        rankedCandidates.map((p: any) => 
          `- ID: ${p.id} | Nome: ${p.name} | Preço: R$ ${p.price.toFixed(2)}${p.promoPrice ? ` (PROMOÇÃO: R$ ${p.promoPrice.toFixed(2)})` : ''} | Benefícios: ${p.benefits || ''} | Descrição: ${p.explanation || ''}`
        ).join('\n') + `\n\nInstrução: Recomende estes produtos reais explicando o motivo de combinarem com o objetivo do cliente. Ofereça CTAs como 'Adicionar ao carrinho'.`;
      
      parts.push({
        type: 'product_cards',
        products: rankedCandidates.map(c => ({
          id: c.id,
          name: c.name,
          price: c.price,
          promo_price: c.promoPrice,
          category: c.category,
          benefits: c.benefits,
          image: c.image,
          indication: c.explanation
        }))
      });
      rankedCandidates.forEach(p => recommendedProductsTrack.push(p.id));

      // Generate customized copy using ResponseCopyGenerator
      const copyStartedAt = Date.now();
      const copyResult = await ResponseCopyGenerator.generateCopy({
        userMessage: retrievalQuery,
        goal: goalsDetected[0] || 'geral',
        products: rankedCandidates,
        primaryProduct: rankedCandidates[0],
        history: state.history,
        executionMode: state.executionContext?.executionMode
      });
      copyGeneration = copyResult.output;
      copyDiagnostics = {
        ...copyResult.diagnostics,
        copyLatencyMs: (copyResult.diagnostics as any).copyLatencyMs ?? Date.now() - copyStartedAt
      };
    } else {
      warnings.push('Nenhum produto correspondente RAG/Grafo encontrado.');
      toolResultContext = `Nenhum produto correspondente foi encontrado no estoque. Instrução: Diga de forma simpática que não encontrou uma opção exata para esse objetivo no momento, mas ofereça para falar com suporte humano ou refinar a busca.`;
      
      const responseText = `Não encontrei produtos específicos no catálogo voltados para o objetivo de “${state.rawMessage}”. Você gostaria de buscar por outro benefício ou falar com nosso suporte?`;
      parts.push({
        type: 'text',
        role: 'assistant',
        text: responseText
      });
    }

    return {
      lastRecommendedProducts: recommendedProductsTrack,
      mainProductId: recommendedProductsTrack[0] || null,
      parts,
      toolResults: {
        ...state.toolResults,
        toolResultContext,
      },
      diagnostics: {
        ...state.diagnostics,
        warnings,
        retrieval: {
          semanticGoal: semanticGoal || null,
          retrievalQuery,
          semanticResults: semanticCount,
          graphResults: graphCount,
          graphUsed: graphCount > 0,
          finalProducts: finalProductsCount,
          retrievalLatencyMs,
          rankingLatencyMs,
          candidateDiagnostics: rankingDiagnostics
        },
        sales: {
          recommendedProducts: recommendedProductsTrack,
          freeShippingSuggestion,
          couponSuggested
        },
        ...(copyDiagnostics ? copyDiagnostics : {}),
        ...(copyGeneration ? { copyGeneration } : {})
      }
    };
  }
}
