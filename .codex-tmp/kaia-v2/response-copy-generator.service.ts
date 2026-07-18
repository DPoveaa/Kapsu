import { getAPIKeyManager } from '../api-key-manager.service';
import { generateGeminiContent } from '../gemini-client.service';
import { resolveGeminiModel } from '../../config/gemini-models';
import db from '../../lib/db';
import { ResponseBuilder } from './response-builder.service';

export interface CopyGeneratorInput {
  userMessage: string;
  goal?: string;
  products: any[];
  primaryProduct?: any;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  executionMode?: 'live' | 'regression_test' | 'admin_replay';
}

export interface CopyGeneratorOutput {
  intro: string;
  closing: string;
}

export interface CopyGeneratorResult {
  output: CopyGeneratorOutput;
  diagnostics: {
    copyGeneratedBy: 'llm' | 'fallback';
    copyFallbackUsed: boolean;
    copyValidation: 'passed' | 'failed' | 'unsafe_claim' | 'invalid_length';
    copySafetyLevel?: 'sensitive_commercial' | 'general';
    blockedTermsRemoved?: string[];
    reason?: string;
    copyGenerationSucceeded?: boolean;
    copyParseFailed?: boolean;
    copyRepairAttempted?: boolean;
    copyErrorCategory?: string | null;
  };
}

export interface FreeShippingCopyInput {
  userMessage: string;
  minOrderValue: number;
  cartValue: number;
  remainingValue: number;
  percentComplete: number;
  requiresCep: boolean;
  cep?: string | null;
  eligibleRegion?: boolean | null;
  ruleActive: boolean;
  source: string;
  validRegionsSummary?: string;
  pendingAction?: any;
  executionMode?: 'live' | 'regression_test' | 'admin_replay';
}

export interface FreeShippingCopyOutput {
  intro: string;
  explanation: string;
  closing: string;
}

export interface FreeShippingCopyResult {
  output: FreeShippingCopyOutput;
  diagnostics: {
    copyGeneratedBy: 'llm' | 'fallback';
    copyFallbackUsed: boolean;
    copyValidation: 'passed' | 'failed' | 'invalid_length' | 'unsafe_claim';
    copyContext: 'free_shipping_info';
    reason?: string;
    copyGenerationSucceeded?: boolean;
    copyParseFailed?: boolean;
    copyRepairAttempted?: boolean;
    copyErrorCategory?: string | null;
  };
}
function normalizeMoneyValue(value: string): number | null {
  const raw = String(value || '').trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/(?<=\d)\.(?=\d{3}(\D|$))/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function mentionedMinimumValues(text: string): number[] {
  const values: number[] = [];
  const pattern = /(?:a partir de|acima de|valor minimo|minimo|mínimo|compras? a partir de|pedidos? a partir de)[^\n\r]{0,40}?R\$\s*(\d{1,5}(?:[.,]\d{2})?)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const value = normalizeMoneyValue(match[1]);
    if (value !== null) values.push(value);
  }
  return values;
}

function findBlockedTerms(text: string): string[] {
  const norm = text.toLowerCase();
  const list = [
    { term: "novo você", pattern: /\bnovo voc[eéê]\b/i },
    { term: "transformação", pattern: /\btransforma[cç][aã]o\b/i },
    { term: "grande aliado", pattern: /\bgrande aliado\b/i },
    { term: "resultado garantido", pattern: /\bresultado garantido\b/i },
    { term: "secar rápido", pattern: /\bsecar r[aá]pido\b/i },
    { term: "queimar gordura", pattern: /\bqueimar gordura\b/i },
    { term: "cura", pattern: /\bcura[rs]?\b/i },
    { term: "tratamento", pattern: /\btratamento\b/i },
    { term: "combater", pattern: /\bcombater\b/i },
    { term: "eliminar", pattern: /\beliminar\b/i },
    { term: "milagre", pattern: /\bmilagre\b/i }
  ];
  const found: string[] = [];
  for (const item of list) {
    if (item.pattern.test(norm)) {
      found.push(item.term);
    }
  }
  return found;
}

function safeParseCopy(responseText: string): { intro: string; closing: string } | null {
  if (!responseText) return null;
  let clean = responseText.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') {
      const intro = typeof parsed.intro === 'string' ? parsed.intro.trim() : '';
      const closing = typeof parsed.closing === 'string' ? parsed.closing.trim() : '';
      if (intro && closing) {
        return { intro, closing };
      }
    }
  } catch (err) {
    const introMatch = clean.match(/"intro"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    const closingMatch = clean.match(/"closing"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    if (introMatch && closingMatch) {
      return {
        intro: introMatch[1].trim(),
        closing: closingMatch[1].trim()
      };
    }
  }
  return null;
}

export class ResponseCopyGenerator {
  static async generateCopy(input: CopyGeneratorInput): Promise<CopyGeneratorResult> {
    const copyStartedAt = Date.now();
    let copyGeminiCalls = 0;
    const primaryProductName = input.primaryProduct?.name || 'produto principal';
    const isSensitive = input.goal === 'weight_loss' || 
      /\b(gorda|gordo|obesa|obeso|engordei|acima do peso|peso extra|gordura|perder peso|emagrecer|emagrecimento|perder barriga|secar|secando|reduzir medidas|reduc.*medidas|não estou feliz com meu peso|preciso perder peso|quero algo para emagrecer|perder medidas|peso ideal|gordura abdominal|inchado|inchada|desinchar)\b/i.test(input.userMessage);
      
    const safetyLevel = isSensitive ? 'sensitive_commercial' : 'general';

    const fallbackCopy = ResponseBuilder.buildGroundedRecommendationCopy(input.products, input.goal || input.userMessage);

    if (input.executionMode === 'regression_test' || input.executionMode === 'admin_replay') {
      return {
        output: fallbackCopy,
        diagnostics: {
          copyGeneratedBy: 'fallback',
          copyFallbackUsed: true,
          copyValidation: 'passed',
          copySafetyLevel: safetyLevel,
          copyGenerationSucceeded: true,
          copyParseFailed: false,
          copyRepairAttempted: false,
          copyErrorCategory: null,
          copyLatencyMs: Date.now() - copyStartedAt,
          copyGeminiCalls
        } as any
      };
    }

    let copyGenerationSucceeded = false;
    let copyParseFailed = false;
    let copyRepairAttempted = false;
    let copyFallbackUsed = false;
    let copyErrorCategory: string | null = null;
    let parsed: { intro: string; closing: string } | null = null;

    try {
      const apiKeyManager = getAPIKeyManager();
      const productsContext = input.products.slice(0, 3).map((p, idx) => 
        `${idx + 1}. ID: ${p.id} | Nome: ${p.name} | Preço: R$ ${Number(p.price || 0).toFixed(2)} | Benefícios: ${p.benefits || ''}`
      ).join('\n');

      const systemInstruction = `Você é um redator de copy comercial extremamente profissional da Kapsu, um marketplace de bem-estar.
Sua missão é gerar duas frases curtas (uma introdução e um fechamento) para apresentar recomendações de produtos.
Você DEVE retornar APENAS o JSON com as chaves "intro" e "closing".

REGRAS DE CONVERSÃO E SEGURANÇA:
1. O campo "intro" deve ter no máximo 220 caracteres. Nunca cite todos os produtos nela.
2. O campo "closing" deve ter no máximo 280 caracteres. Você DEVE mencionar o nome do produto principal ("${primaryProductName}") e convidar para adicionar ao carrinho ou simular o frete.
3. Nunca invente promessas milagrosas. Se a mensagem do usuário for sensível (ex: peso, queda de cabelo), adote um tom empático e positivo.
- NUNCA use termos exagerados: "novo você", "transformação", "grande aliado", "resultado garantido", "secar rápido", "queimar gordura", "cura", "tratamento", "combater", "eliminar", "milagre".`;

      const prompt = `Mensagem do Usuário: "${input.userMessage}"
Objetivo Detectado: "${input.goal || 'geral'}"
Produtos Selecionados para Recomendação:
${productsContext}
Produto Principal: "${primaryProductName}"`;

      const model = resolveGeminiModel('chat');

      try {
        copyGeminiCalls++;
        const responseText = await apiKeyManager.executeWithRetry(
          async (client) =>
            generateGeminiContent(client, {
              model,
              contents: prompt,
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  intro: { type: 'STRING' },
                  closing: { type: 'STRING' }
                },
                required: ['intro', 'closing']
              },
              temperature: 0.4,
              maxOutputTokens: 600,
            }),
          undefined,
          { model, maxAttempts: 1, requestTimeoutMs: 4500 }
        );
        parsed = safeParseCopy(responseText);
        if (parsed) {
          copyGenerationSucceeded = true;
        } else {
          copyParseFailed = true;
        }
      } catch (err: any) {
        copyErrorCategory = err.message || 'llm_error';
      }

      if (!parsed) {
        copyRepairAttempted = false;
      }
    } catch (err: any) {
      copyErrorCategory = err.message || 'unknown_error';
    }

    if (!parsed) {
      copyFallbackUsed = true;
      parsed = fallbackCopy;
    }

    const blockedFound = [...findBlockedTerms(parsed.intro), ...findBlockedTerms(parsed.closing)];
    const uniqueBlocked = Array.from(new Set(blockedFound));
    if (uniqueBlocked.length > 0) {
      copyFallbackUsed = true;
      parsed = fallbackCopy;
    }

    return {
      output: parsed,
      diagnostics: {
        copyGeneratedBy: copyFallbackUsed ? 'fallback' : 'llm',
        copyFallbackUsed,
        copyValidation: uniqueBlocked.length > 0 ? 'unsafe_claim' : (copyFallbackUsed ? 'failed' : 'passed'),
        copySafetyLevel: safetyLevel,
        blockedTermsRemoved: uniqueBlocked,
        copyGenerationSucceeded,
        copyParseFailed,
        copyRepairAttempted,
        copyErrorCategory,
        copyLatencyMs: Date.now() - copyStartedAt,
        copyGeminiCalls
      } as any
    };
  }

  static async generateFreeShippingCopy(input: FreeShippingCopyInput): Promise<FreeShippingCopyResult> {
    const copyStartedAt = Date.now();
    let copyGeminiCalls = 0;
    const money = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
    const fallbackOutput = (): FreeShippingCopyOutput => {
      if (!input.ruleActive) {
        return {
          intro: 'Nao ha regra ativa de frete gratis agora. Posso simular o frete normal para seu CEP.',
          explanation: '',
          closing: ''
        };
      }
      if (input.cep && input.eligibleRegion === false) {
        return {
          intro: 'Esse CEP nao participa da promocao de frete gratis atual. Posso simular o frete normal para voce.',
          explanation: '',
          closing: ''
        };
      }
      if (input.cep && input.eligibleRegion === true) {
        const valueText = input.remainingValue <= 0
          ? `Seu CEP participa. Seu carrinho ja atingiu ${money(input.minOrderValue)} para ganhar frete gratis.`
          : `Seu CEP participa. Seu carrinho esta em ${money(input.cartValue)}, entao faltam ${money(input.remainingValue)} para ganhar frete gratis.`;
        return { intro: valueText, explanation: '', closing: '' };
      }
      const valueText = input.cartValue <= 0
        ? `Nas regioes atendidas, o frete gratis entra a partir de ${money(input.minOrderValue)}. Seu carrinho esta vazio, entao faltam ${money(input.minOrderValue)}.`
        : input.remainingValue <= 0
          ? `Seu carrinho ja atingiu ${money(input.minOrderValue)} para frete gratis. Envie seu CEP para validar a regiao.`
          : `Nas regioes atendidas, o frete gratis entra a partir de ${money(input.minOrderValue)}. Faltam ${money(input.remainingValue)}.`;
      return {
        intro: input.requiresCep ? `${valueText} Me envie seu CEP para confirmar a regiao.` : valueText,
        explanation: '',
        closing: ''
      };
    };

    if (input.executionMode === 'regression_test' || input.executionMode === 'admin_replay') {
      return {
        output: fallbackOutput(),
        diagnostics: {
          copyGeneratedBy: 'fallback',
          copyFallbackUsed: true,
          copyValidation: 'passed',
          copyContext: 'free_shipping_info',
          copyGenerationSucceeded: true,
          copyParseFailed: false,
          copyRepairAttempted: false,
          copyErrorCategory: null,
          copyLatencyMs: Date.now() - copyStartedAt,
          copyGeminiCalls
        } as any
      };
    }

    let copyGenerationSucceeded = false;
    let copyParseFailed = false;
    let copyRepairAttempted = false;
    let copyFallbackUsed = false;
    let copyErrorCategory: string | null = null;
    let parsed: { intro: string; closing: string } | null = null;

    try {
      const apiKeyManager = getAPIKeyManager();
      const prompt = `Pergunta original: "${input.userMessage}"
Contexto real de frete gratis:
- Regra ativa: ${input.ruleActive ? 'sim' : 'nao'}
- Fonte da regra: ${input.source}
- Valor minimo: ${money(input.minOrderValue)}
- Valor atual do carrinho: ${money(input.cartValue)}
- Valor restante: ${money(input.remainingValue)}
- Progresso: ${input.percentComplete}%
- Precisa de CEP: ${input.requiresCep ? 'sim' : 'nao'}
- CEP conhecido: ${input.cep || 'nao'}
- Regiao elegivel: ${input.eligibleRegion === null || input.eligibleRegion === undefined ? 'desconhecida' : input.eligibleRegion ? 'sim' : 'nao'}
- Regioes resumidas: ${input.validRegionsSummary || 'regioes atendidas cadastradas'}
- Pending action: ${input.pendingAction?.type || 'nenhuma'}
 
Gere JSON com intro e closing. A soma dos textos deve ter no maximo 220 caracteres antes do CEP e 240 caracteres depois do CEP. Use somente os valores numericos fornecidos. Sem listas, produtos, cupons ou promotion_cards. Nao invente regra. Se precisar de CEP, peca de forma curta. Se ja houver CEP validado, nao peca CEP de novo.`;

      const chatModel = resolveGeminiModel('chat');

      try {
        copyGeminiCalls++;
        const responseText = await apiKeyManager.executeWithRetry(
          async (client) =>
            generateGeminiContent(client, {
              model: chatModel,
              contents: prompt,
              systemInstruction:
                'Voce gera copy curta e segura para frete gratis da Kaia. Retorne apenas JSON valido com intro e closing. Nunca altere valores monetarios fornecidos.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  intro: { type: 'STRING' },
                  closing: { type: 'STRING' }
                },
                required: ['intro', 'closing']
              },
              temperature: 0.3,
              maxOutputTokens: 400,
            }),
          undefined,
          { model: chatModel }
        );
        parsed = safeParseCopy(responseText);
        if (parsed) {
          copyGenerationSucceeded = true;
        } else {
          copyParseFailed = true;
        }
      } catch (err: any) {
        copyErrorCategory = err.message || 'llm_error';
      }

      if (!parsed) {
        copyRepairAttempted = false;
      }
    } catch (err: any) {
      copyErrorCategory = err.message || 'unknown_error';
    }

    let finalOutput: FreeShippingCopyOutput;
    if (parsed) {
      finalOutput = {
        intro: parsed.intro,
        explanation: '',
        closing: parsed.closing
      };
    } else {
      copyFallbackUsed = true;
      finalOutput = fallbackOutput();
    }

    const combined = `${finalOutput.intro} ${finalOutput.explanation} ${finalOutput.closing}`.trim();
    const maxLength = input.cep ? 240 : 220;
    const mentionsPromotionProduct = /\b(serum|produto em promocao|promotion_cards|cupom|oferta no produto|aproveite essa promocao no produto)\b/i.test(combined);
    const hasCorruption = /probem-estar|ï¿½|Ò¯¿½|\\uFFFD/i.test(combined);
    const invalidLength = !finalOutput.intro || combined.length > maxLength;
    const mismatchedMinimumValue = mentionedMinimumValues(combined).some((value) => Math.abs(value - Number(input.minOrderValue || 0)) > 0.009);

    if (mentionsPromotionProduct || invalidLength || hasCorruption || mismatchedMinimumValue) {
      copyFallbackUsed = true;
      finalOutput = fallbackOutput();
    }

    return {
      output: finalOutput,
      diagnostics: {
        copyGeneratedBy: copyFallbackUsed ? 'fallback' : 'llm',
        copyFallbackUsed,
        copyValidation: mentionsPromotionProduct || hasCorruption ? 'unsafe_claim' : (invalidLength ? 'invalid_length' : 'passed'),
        copyContext: 'free_shipping_info',
        copyGenerationSucceeded,
        copyParseFailed,
        copyRepairAttempted,
        copyErrorCategory,
        copyLatencyMs: Date.now() - copyStartedAt,
        copyGeminiCalls,
        reason: mentionsPromotionProduct ? 'promotion_product_mention' : hasCorruption ? 'corrupted_text' : mismatchedMinimumValue ? 'mismatched_minimum_value' : (invalidLength ? 'invalid_length' : undefined)
      } as any
    };
  }
}
