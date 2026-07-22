import { SpecializedAgent } from './base.agent';
import { KaiaGraphState } from '../kaia-orchestrator.service';
import { getKaiaToolProvider } from '../tool-provider';
import { buildSuccessfulCartClearParts } from '../cart-clear-response.util';
import db from '../../../lib/db';
import { generateId } from '../../../utils/id';
import { getProductResolver } from '../product-resolver.service';


import { extractProductQuery } from '../cart-parser.service';
const extractProductPhrase = extractProductQuery;

export class CartAgent implements SpecializedAgent {
  name = 'CartAgent';
  authorizedTools = [
    'getCustomerCart',
    'clearCustomerCart',
    'addCartItem',
    'removeCartItem',
    'updateCartItemQuantity',
    'getCartSummary',
    'getCartFreeShippingProgress'
  ];

  async run(state: KaiaGraphState): Promise<Partial<KaiaGraphState>> {
    const toolRegistry = getKaiaToolProvider(state);
    const warnings: string[] = [];
    const parts: any[] = [];
    let toolResultContext = '';
    let cartMutationConfirmed = false;
    let cartAlreadyEmpty = false;
    let mutationError = '';
    const toolsUsed: string[] = [];
    let cartBefore: any = null;
    let cartAfter: any = null;
    let clearResult: any = null;

    const intent = state.intent;

    try {
      if (intent === 'cart_clear') {
        toolsUsed.push('getCustomerCart');
        cartBefore = await toolRegistry.getCustomerCart(state.sessionId, state.userId);

        if (cartBefore.itemCount === 0) {
          cartAlreadyEmpty = true;
          cartAfter = cartBefore;
          toolResultContext = 'CARRINHO JÁ VAZIO: Nenhuma ação de limpeza necessária.';
        } else {
          toolsUsed.push('clearCustomerCart');
          clearResult = await toolRegistry.clearCustomerCart(state.sessionId, state.userId);
          toolsUsed.push('getCustomerCart');
          cartAfter = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
          cartMutationConfirmed = cartAfter.itemCount === 0;
          if (cartMutationConfirmed) {
            toolResultContext = 'MUTAÇÃO CONFIRMADA: O carrinho foi esvaziado com sucesso.';
          } else {
            mutationError = 'Carrinho não ficou vazio após a limpeza.';
            toolResultContext = `MUTAÇÃO FALHOU: ${mutationError}`;
            warnings.push(mutationError);
          }
        }
      } else if (intent === 'cart_add') {
        let productEntity = state.resolvedEntities?.find((e) => e.type === 'product');
        let quantity = Number(state.resolvedEntities?.find((e) => e.type === 'quantity')?.value || 1);
        let isConfirmedAdd = false;
        let productId: string | null = null;
        let productName = 'Produto';
        let productResolution: any = null;
        let isProductSafe = false;
        let matches: any[] = [];

        if (state.diagnostics.pendingActionBefore === 'cart_add_confirm' && state.pendingAction?.type === 'cart_add_confirm') {
          productId = state.pendingAction.productId;
          productName = state.pendingAction.productName || 'Produto';
          quantity = state.pendingAction.quantity || 1;
          isConfirmedAdd = true;
        }

        const activeProducts = await db('products')
          .where('active', true)
          .select('id', 'name', 'price', 'promo_price', 'image', 'category', 'description');

        if (!isConfirmedAdd) {
          // --- Clarification check for quantity ---
          const hasQuantity = state.resolvedEntities?.some((e) => e.type === 'quantity');
          if (!hasQuantity && state.lastRejectedCartAdd) {
            const prev = state.lastRejectedCartAdd;
            productId = prev.productId;
            const resolvedProduct = activeProducts.find(p => p.id === productId);
            if (resolvedProduct) {
              productName = resolvedProduct.name;
            } else {
              productName = prev.productName || 'Produto';
            }

            const responseText = `Você quer adicionar quantas unidades de ${productName}? Posso adicionar até 100 por vez.`;
            parts.push({ type: 'text', role: 'assistant', text: responseText });

            const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
            toolsUsed.push('getCustomerCart');

            parts.push({
              type: 'cart_items',
              items: cart.items,
              mutationType: 'add',
              cartAfter: { itemCount: cart.itemCount, total: cart.total }
            });

            return {
              ...state,
              parts,
              toolResults: {
                ...state.toolResults,
                toolResultContext: `CLARIFICAÇÃO DE QUANTIDADE: Solicitado quantidade para ${productName}.`
              },
              diagnostics: {
                ...state.diagnostics,
                agent: 'CartAgent',
                intent: 'cart_add',
                cartMutation: false,
                mutationType: 'add',
                mutationConfirmed: false,
                quantityClarificationRequired: true,
                product: { name: productName },
                toolsUsed
              }
            };
          }

          let resolvedProduct = null;
          productResolution = null;
          matches = [];
          isProductSafe = false;

          if (productEntity) {
            resolvedProduct = activeProducts.find(p => p.id === productEntity.id);
            if (resolvedProduct) {
              productId = resolvedProduct.id;
              productName = resolvedProduct.name;
              isProductSafe = true;
              productResolution = {
                inputPhrase: extractProductPhrase(state.rawMessage),
                selectedProductId: resolvedProduct.id,
                selectedProductName: resolvedProduct.name,
                source: productEntity.source || 'product_database',
                confidence: productEntity.confidence || 1.0,
                candidates: [{
                  id: resolvedProduct.id,
                  name: resolvedProduct.name,
                  price: Number(resolvedProduct.price)
                }]
              };
            }
          } else {
            const searchPhrase = extractProductPhrase(state.rawMessage);
            const productResolver = getProductResolver();
            matches = await productResolver.resolve(searchPhrase, state.conversationId);

            try {
              const { getRuleRepository } = require('../rule-repository.service');
              const matchedRule = await getRuleRepository().findMatchingDisambiguationRule(state.rawMessage);
              if (matchedRule) {
                let parsed = { candidateProductIds: [] as string[], preferredProductId: null as string | null, requireConfirmation: false };
                try {
                  parsed = JSON.parse(matchedRule.target_value);
                } catch {
                  parsed = { candidateProductIds: [matchedRule.target_value], preferredProductId: matchedRule.target_value, requireConfirmation: false };
                }

                if (parsed.requireConfirmation) {
                  if (parsed.candidateProductIds && parsed.candidateProductIds.length > 0) {
                    matches = matches.filter(m => parsed.candidateProductIds.includes(m.id));
                    const missingCandidateIds = parsed.candidateProductIds.filter((id: string) => !matches.some(m => m.id === id));
                    if (missingCandidateIds.length > 0) {
                      const configuredProducts = await db('products')
                        .whereIn('id', missingCandidateIds)
                        .where('active', true)
                        .select('id', 'name', 'price', 'promo_price', 'image', 'category', 'description');
                      matches.push(...configuredProducts.map((prod: any) => ({
                        id: prod.id,
                        name: prod.name,
                        price: Number(prod.price),
                        promoPrice: prod.promo_price ? Number(prod.promo_price) : null,
                        category: prod.category || '',
                        description: prod.description || '',
                        image: prod.image || null,
                        score: 0.99,
                        matchType: 'exact',
                        matchSource: 'semantic_fields'
                      })));
                    }
                  }
                  isProductSafe = false;
                  state.diagnostics = {
                    ...state.diagnostics,
                    forcedDisambiguationApplied: true
                  };
                } else if (parsed.preferredProductId) {
                  const matchedProd = matches.find(m => m.id === parsed.preferredProductId);
                  if (matchedProd) {
                    matches = [{
                      ...matchedProd,
                      score: 1.0,
                      matchType: 'exact',
                      matchSource: 'db_alias'
                    }];
                  }
                }
              }
            } catch (err) {
              console.error('[CartAgent] Error resolving disambiguation rules:', err);
            }

            if (matches.length > 0) {
              const normalizedSearchPhrase = searchPhrase
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();
              const isUnapprovedShortAlias = normalizedSearchPhrase.length >= 2 && normalizedSearchPhrase.length <= 3 && !/\s/.test(searchPhrase.trim());
              const hasExplicitAliasMatch = matches.some(m => m.matchSource === 'db_alias' || m.matchType === 'exact');

              if (isUnapprovedShortAlias && !hasExplicitAliasMatch) {
                matches = [];
                state.diagnostics = {
                  ...state.diagnostics,
                  unapprovedShortAliasCandidate: normalizedSearchPhrase
                };
              }
            }

            if (matches.length > 0) {
              const [best] = matches;
              const isExact = best.score === 1.0 || best.matchType === 'exact';

              const secondBest = matches.length > 1 ? matches[1] : null;
              const scoreGap = secondBest ? (best.score - secondBest.score) : 1.0;
              const isHighConfidence = best.score >= 0.85;
              const noCompetingProducts = matches.length === 1 || scoreGap >= 0.10;

              if (quantity <= 10) {
                isProductSafe = isHighConfidence && noCompetingProducts && isExact;
              } else {
                isProductSafe = isHighConfidence && noCompetingProducts && best.score >= 0.88 && isExact;
              }

              if (isProductSafe) {
                resolvedProduct = best;
                productId = best.id;
                productName = best.name;
                productResolution = {
                  inputPhrase: extractProductPhrase(state.rawMessage),
                  selectedProductId: best.id,
                  selectedProductName: best.name,
                  source: best.matchSource || (best.matchType === 'exact' ? 'exact_match' : 'normalized_plural_fuzzy_match'),
                  confidence: best.score,
                  scoreGap,
                  confidenceBand: best.score >= 0.85 ? 'high' : best.score >= 0.65 ? 'medium' : 'low',
                  confirmationRequired: !isProductSafe,
                  candidates: matches.slice(0, 3).map(m => ({
                    id: m.id,
                    name: m.name,
                    price: m.promoPrice ?? m.price,
                    score: m.score,
                    scoreDifferenceFromBest: Number((best.score - m.score).toFixed(4)),
                    confirmationRequired: m.id !== best.id || !isProductSafe
                  }))
                };
              }
            }
          }

          // After resolution: if quantity > 100, reject immediately (no disambiguation, no pendingAction)
          if (quantity > 100) {
            const rejectProductId: string | null = isProductSafe ? productId : null;
            const rejectProductName = isProductSafe && productName !== 'Produto' ? productName : 'Produto';

            const warningMsg = `Só posso adicionar até 100 unidades por vez. Informe uma quantidade menor.`;
            parts.push({ type: 'text', role: 'assistant', text: warningMsg });

            const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
            toolsUsed.push('getCustomerCart');

            parts.push({
              type: 'cart_items',
              items: cart.items,
              mutationType: 'add',
              cartAfter: { itemCount: cart.itemCount, total: cart.total }
            });

            await db('customer_conversation_events').insert({
              id: generateId(),
              conversation_id: state.conversationId,
              event_type: 'last_rejected_cart_add',
              metadata: JSON.stringify({
                productId: rejectProductId,
                productName: rejectProductName,
                requestedQuantity: quantity,
                maxQuantityPerRequest: 100,
                reason: 'quantity_too_high',
                createdAt: new Date().toISOString()
              }),
              created_at: db.fn.now()
            });

            return {
              ...state,
              parts,
              toolResults: {
                ...state.toolResults,
                toolResultContext: `MUTAÇÃO FALHOU: Quantidade superior a 100 unidades (${quantity}).`
              },
              diagnostics: {
                ...state.diagnostics,
                agent: 'CartAgent',
                intent: 'cart_add',
                cartMutation: false,
                mutationType: 'add',
                mutationConfirmed: false,
                warnings: [`Quantidade solicitada (${quantity}) excede 100 unidades.`],
                quantityRequested: quantity,
                quantityAdded: 0,
                maxQuantityPerRequest: 100,
                stockLimitExceeded: true,
                lastRejectedCartAddStored: true,
                product: { id: rejectProductId || undefined, name: rejectProductName },
                toolsUsed
              }
            };
          }

          if (!isProductSafe && matches.length > 0) {
            const options = matches.slice(0, 3).map((m) => ({
              id: m.id,
              name: m.name,
              price: m.promoPrice ?? m.price
            }));

            const firstOptionName = options[0].name.toLowerCase();
            const allSameName = options.every(opt => opt.name.toLowerCase() === firstOptionName);

            let responseText = '';
            if (options.length === 1) {
              responseText = `Encontrei o produto ${options[0].name}. É este que você deseja adicionar?`;
            } else if (allSameName) {
              responseText = `Encontrei mais de um produto chamado ${options[0].name}. Qual você quer adicionar?`;
            } else {
              responseText = `Encontrei alguns produtos parecidos. Qual você quer adicionar?`;
            }

            parts.push({ type: 'text', role: 'assistant', text: responseText });
            parts.push({
              type: 'product_cards',
              disambiguationMode: true,
              quantity: quantity,
              products: matches.slice(0, 3).map(m => ({
                id: m.id,
                name: m.name,
                price: Number(m.price || 0),
                promoPrice: m.promoPrice ?? null,
                category: m.category,
                description: m.description,
                image: m.image
              }))
            });

            await db('customer_conversation_events').insert({
              id: generateId(),
              conversation_id: state.conversationId,
              event_type: 'pending_action',
              metadata: JSON.stringify({
                status: 'pending',
                type: 'cart_add_product_disambiguation',
                quantity,
                candidates: options.map(opt => ({
                  id: opt.id,
                  name: opt.name,
                  price: opt.price
                })),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
              }),
              created_at: db.fn.now()
            });

            const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
            toolsUsed.push('getCustomerCart');

            return {
              ...state,
              parts,
              intent: 'product_disambiguation',
              pendingAction: {
                status: 'pending',
                type: 'cart_add_product_disambiguation',
                quantity,
                originalPhrase: state.rawMessage,
                candidates: options.map(opt => ({
                  id: opt.id,
                  name: opt.name,
                  price: Number(opt.price),
                  promoPrice: null,
                  image: null
                }))
              },
              toolResults: {
                ...state.toolResults,
                toolResultContext: 'MUTAÇÃO FALHOU: Produto ambíguo.'
              },
              diagnostics: {
                ...state.diagnostics,
                agent: 'CartAgent',
                intent: 'product_disambiguation',
                ambiguousProducts: true,
                optionsCount: matches.length,
                toolsUsed
              }
            };
          }

          if (!resolvedProduct && !productId) {
            productId = null;
          }
        }

        if (productId) {
          const product = activeProducts.find(p => p.id === productId);
          if (product && !isConfirmedAdd) {
            productName = product.name;
          }

          if (!isConfirmedAdd) {
            if (quantity > 100) {
              const warningMsg = `Só posso adicionar até 100 unidades por vez. Informe uma quantidade menor.`;
              parts.push({ type: 'text', role: 'assistant', text: warningMsg });

              const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
              toolsUsed.push('getCustomerCart');

              parts.push({
                type: 'cart_items',
                items: cart.items,
                mutationType: 'add',
                cartAfter: { itemCount: cart.itemCount, total: cart.total }
              });

              await db('customer_conversation_events').insert({
                id: generateId(),
                conversation_id: state.conversationId,
                event_type: 'last_rejected_cart_add',
                metadata: JSON.stringify({
                  productId,
                  productName,
                  requestedQuantity: quantity,
                  maxQuantityPerRequest: 100,
                  reason: 'quantity_too_high',
                  createdAt: new Date().toISOString()
                }),
                created_at: db.fn.now()
              });

              return {
                ...state,
                parts,
                toolResults: {
                  ...state.toolResults,
                  toolResultContext: `MUTAÇÃO FALHOU: Quantidade superior a 100 unidades (${quantity}).`
                },
                diagnostics: {
                  ...state.diagnostics,
                  agent: 'CartAgent',
                  intent: 'cart_add',
                  cartMutation: false,
                  mutationType: 'add',
                  mutationConfirmed: false,
                  warnings: [`Quantidade solicitada (${quantity}) excede 100 unidades.`],
                  quantityRequested: quantity,
                  quantityAdded: 0,
                  maxQuantityPerRequest: 100,
                  stockLimitExceeded: true,
                  lastRejectedCartAddStored: true,
                  product: { name: productName },
                  toolsUsed
                }
              };
            }

            if (quantity >= 11 && quantity <= 100) {
              let responseText = '';
              if (productResolution && productResolution.source === 'normalized_plural_fuzzy_match') {
                responseText = `Encontrei ${productName} para “${productResolution.inputPhrase}”. Você quer adicionar ${quantity} unidades dele?`;
              } else {
                responseText = `Você quer adicionar ${quantity} unidades de ${productName}. Confirma?`;
              }
              parts.push({ type: 'text', role: 'assistant', text: responseText });

              parts.push({
                type: 'actions',
                actions: [
                  { id: 'confirm-add', label: 'Sim, confirmar', type: 'cart_add', style: 'primary', payload: { productId, quantity } },
                  { id: 'cancel-add', label: 'Não, cancelar', type: 'cart_add_cancel', style: 'secondary' }
                ]
              });

              await db('customer_conversation_events').insert({
                id: generateId(),
                conversation_id: state.conversationId,
                event_type: 'pending_action',
                metadata: JSON.stringify({
                  status: 'pending',
                  type: 'cart_add_confirm',
                  productId,
                  productName,
                  quantity,
                  productResolution: productResolution ? {
                    inputPhrase: productResolution.inputPhrase,
                    source: productResolution.source,
                    confidence: productResolution.confidence
                  } : null,
                  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                }),
                created_at: db.fn.now()
              });

              const isFromRejected = (state.resolvedEntities?.find((e) => e.type === 'product')?.source === 'lastRejectedCartAdd');

              return {
                ...state,
                parts,
                intent: 'cart_add_confirm_required',
                pendingAction: {
                  status: 'pending',
                  type: 'cart_add_confirm',
                  productId: productId!,
                  productName,
                  quantity
                },
                toolResults: {
                  ...state.toolResults,
                  toolResultContext: `CONFIRMAÇÃO NECESSÁRIA: Adicionar ${quantity} unidades de ${productName}.`
                },
                diagnostics: {
                  ...state.diagnostics,
                  agent: 'CartAgent',
                  intent: 'cart_add_confirm_required',
                  cartMutation: false,
                  pendingActionAfter: 'cart_add_confirm',
                  quantityRequested: quantity,
                  product: {
                    id: productId,
                    name: productName,
                    source: isFromRejected ? 'lastRejectedCartAdd' : undefined
                  },
                  productResolution: productResolution ? {
                    inputPhrase: productResolution.inputPhrase,
                    selectedProductId: productResolution.selectedProductId,
                    selectedProductName: productResolution.selectedProductName,
                    source: productResolution.source,
                    confidence: productResolution.confidence,
                    candidates: productResolution.candidates
                  } : undefined,
                  maxQuantityPerRequest: 100,
                  confirmationThreshold: 10,
                  toolsUsed
                }
              };
            }
          }

          toolsUsed.push('addProductToCart');
          await toolRegistry.addCartItem(state.sessionId, state.userId, productId, quantity);
          cartMutationConfirmed = true;
          toolResultContext = `MUTAÇÃO: Adicionado o produto ID ${productId} com quantidade ${quantity} ao carrinho.`;

          if (isConfirmedAdd && state.pendingAction?.eventId) {
            const eventId = state.pendingAction.eventId;
            const event = await db('customer_conversation_events').where('id', eventId).first();
            if (event) {
              const meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata;
              meta.status = 'confirmed';
              await db('customer_conversation_events')
                .where('id', eventId)
                .update({ metadata: JSON.stringify(meta) });
            }
          }

          const messageText = `Adicionei ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'} de ${productName} ao seu carrinho.`;
          parts.push({ type: 'text', role: 'assistant', text: messageText });

          const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
          toolsUsed.push('getCustomerCart');

          parts.push({
            type: 'cart_items',
            items: cart.items,
            mutationType: 'add',
            cartAfter: { itemCount: cart.itemCount, total: cart.total }
          });

          return {
            ...state,
            parts,
            pendingAction: null,
            toolResults: {
              ...state.toolResults,
              toolResultContext
            },
            diagnostics: {
              ...state.diagnostics,
              agent: 'CartAgent',
              intent: 'cart_add',
              cartMutation: true,
              mutationType: 'add',
              mutationConfirmed: true,
              cartMutationConfirmed: true,
              product: { id: productId, name: productName },
              quantityRequested: quantity,
              quantityAdded: quantity,
              pendingActionBefore: isConfirmedAdd ? 'cart_add_confirm' : undefined,
              pendingActionAfter: null,
              toolsUsed
            }
          };
        } else {
          const missingProduct = extractProductPhrase(state.rawMessage) || 'o produto';
          const responseText = `Não encontrei “${missingProduct}” no catálogo. Você pode me dizer o nome completo ou o que busca no produto?`;
          parts.push({ type: 'text', role: 'assistant', text: responseText });

          parts.push({
            type: 'actions',
            actions: [
              { id: 'provide-fullname', label: 'Informar nome completo', type: 'clarify_name', style: 'primary' },
              { id: 'describe-objective', label: 'Descrever objetivo', type: 'clarify_objective', style: 'secondary' }
            ]
          });

          warnings.push(`Produto não encontrado: ${missingProduct}`);
          toolResultContext = `PRODUTO NÃO ENCONTRADO: ${missingProduct}`;

          let aliasCandidateCreated = false;
          let aliasCandidateId: string | null = null;

          const normAlias = missingProduct.toLowerCase().trim();
          if (normAlias.length >= 2) {
            const dbProducts = await db('products').where('active', true).select('id', 'name', 'price', 'promo_price', 'category', 'description', 'image');
            const { ProductResolver } = require('../product-resolver.service');
            const ranked = dbProducts.map(prod => {
              const initials = prod.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(Boolean)
                .map((w: string) => w[0] || '')
                .join('');
              const isInitialsMatch = initials === normAlias;
              const levSim = ProductResolver.levenshteinSimilarity(normAlias, prod.name.toLowerCase().trim());
              const isSubstring = prod.name.toLowerCase().includes(normAlias);

              let score = levSim;
              let source = 'levenshtein';
              if (isInitialsMatch) {
                score = 0.65;
                source = 'initials_match';
              } else if (isSubstring) {
                score = 0.75;
                source = 'substring';
              }

              return {
                id: prod.id,
                name: prod.name,
                price: Number(prod.price),
                promoPrice: prod.promo_price ? Number(prod.promo_price) : null,
                category: prod.category || '',
                description: prod.description || '',
                image: prod.image || null,
                score,
                source
              };
            })
            .sort((a, b) => b.score - a.score);

            const existingCandidate = await db('ai_improvement_candidates')
              .where({
                source_conversation_id: state.conversationId,
                proposed_alias: normAlias,
                status: 'pending'
              })
              .first();

            if (!existingCandidate) {
              const bestCandidate = ranked[0] || null;
              const alternativeProducts = ranked.slice(0, 5);
              aliasCandidateId = generateId();

              await db('ai_improvement_candidates').insert({
                id: aliasCandidateId,
                source_conversation_id: state.conversationId,
                source_message_id: state.userMessageId || null,
                customer_message: state.rawMessage,
                assistant_response: responseText,
                detected_issue_type: 'product_not_resolved',
                proposed_fix_type: 'add_product_alias',
                proposed_alias: normAlias,
                status: 'pending',
                detected_alias: normAlias,
                suggested_product_id: bestCandidate ? bestCandidate.id : null,
                suggested_product_name: bestCandidate ? bestCandidate.name : null,
                suggestion_confidence: bestCandidate ? bestCandidate.score : null,
                suggestion_source: bestCandidate ? bestCandidate.source : null,
                alternative_products: JSON.stringify(alternativeProducts),
                target_product_id: null,
                proposed_test_case: JSON.stringify({
                  input: state.rawMessage,
                  expected: {
                    intent: 'cart_add',
                    resolvedEntities: [{ type: 'product', name: bestCandidate ? bestCandidate.name : '' }]
                  }
                }),
                created_at: db.fn.now()
              });
              aliasCandidateCreated = true;
            }
          }

          const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
          toolsUsed.push('getCustomerCart');

          parts.push({
            type: 'cart_items',
            items: cart.items,
            mutationType: 'add',
            cartAfter: { itemCount: cart.itemCount, total: cart.total }
          });

          return {
            ...state,
            parts,
            intent: 'cart_add',
            selectedAgent: 'CartAgent',
            toolResults: {
              ...state.toolResults,
              toolResultContext
            },
            diagnostics: {
              ...state.diagnostics,
              agent: 'CartAgent',
              intent: 'cart_add',
              cartMutation: false,
              mutationType: 'add',
              mutationConfirmed: false,
              cartMutationConfirmed: false,
              warnings,
              productNotFound: true,
              aliasCandidateCreated,
              aliasCandidateId,
              toolsUsed
            }
          };
        }
      } else if (intent === 'cart_add_cancel') {
        const responseText = 'Tudo bem, a adição do produto foi cancelada.';
        parts.push({ type: 'text', role: 'assistant', text: responseText });

        const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
        toolsUsed.push('getCustomerCart');

        parts.push({
          type: 'cart_items',
          items: cart.items,
          mutationType: 'add',
          cartAfter: { itemCount: cart.itemCount, total: cart.total }
        });

        if (state.pendingAction?.eventId) {
          const eventId = state.pendingAction.eventId;
          const event = await db('customer_conversation_events').where('id', eventId).first();
          if (event) {
            const meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata;
            meta.status = 'cancelled';
            await db('customer_conversation_events')
              .where('id', eventId)
              .update({ metadata: JSON.stringify(meta) });
          }
        }

        return {
          ...state,
          parts,
          pendingAction: null,
          toolResults: {
            ...state.toolResults,
            toolResultContext: 'MUTAÇÃO CANCELADA: Adição cancelada pelo usuário.'
          },
          diagnostics: {
            ...state.diagnostics,
            agent: 'CartAgent',
            intent: 'cart_add_cancel',
            cartMutation: false,
            pendingActionBefore: 'cart_add_confirm',
            pendingActionAfter: null,
            toolsUsed
          }
        };
      } else if (intent === 'cart_remove_item' || intent === 'cart_remove') {
        const productEntity = state.resolvedEntities?.find((e) => e.type === 'product');
        const rawQty = state.resolvedEntities?.find((e) => e.type === 'quantity')?.value;
        const quantityRequested = rawQty !== undefined ? Number(rawQty) : undefined;
        
        const activeProducts = await db('products')
          .where('active', true)
          .select('id', 'name', 'price', 'promo_price', 'image', 'category', 'description');

        const cleanMsg = state.normalizedMessage
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        let resolvedProduct = null;
        for (const prod of activeProducts) {
          const normProdName = prod.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, '')
            .trim();

          if (normProdName.length > 2 && cleanMsg.includes(normProdName)) {
            resolvedProduct = prod;
            break;
          }
        }
        
        if (!resolvedProduct && productEntity) {
          resolvedProduct = activeProducts.find(p => p.id === productEntity.id);
        }

        const productId = resolvedProduct?.id || state.mainProductId;
        const productName = resolvedProduct ? resolvedProduct.name : 'Produto';

        if (!productId) {
          warnings.push('Nenhum produto especificado para remover do carrinho.');
          toolResultContext = 'MUTAÇÃO FALHOU: Nenhum produto especificado.';
          const responseText = 'Desculpe, não consegui identificar qual produto você quer remover do carrinho.';
          parts.push({ type: 'text', role: 'assistant', text: responseText });
        } else {
          const cart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
          toolsUsed.push('getCustomerCart');

          const cartItem = cart.items.find((item: any) => item.productId === productId || item.product_id === productId);
          
          if (!cartItem) {
            cartMutationConfirmed = false;
            toolResultContext = 'MUTAÇÃO FALHOU: Produto não está no carrinho.';
            const responseText = `Esse produto não está no seu carrinho.`;
            parts.push({ type: 'text', role: 'assistant', text: responseText });
          } else {
            const quantityBefore = cartItem.quantity;
            let mutationType: 'remove' | 'decrement' = 'remove';
            let quantityRemoved = quantityBefore;

            if (quantityRequested !== undefined && quantityRequested !== null) {
              if (quantityBefore <= quantityRequested) {
                mutationType = 'remove';
                quantityRemoved = quantityBefore;
                toolsUsed.push('removeCartItem');
                await toolRegistry.removeCartItem(state.sessionId, state.userId, productId);
                cartMutationConfirmed = true;
                
                const responseText = `Você tinha ${quantityBefore} ${quantityBefore === 1 ? 'unidade' : 'unidades'} de ${productName}, então removi o produto do carrinho.`;
                parts.push({ type: 'text', role: 'assistant', text: responseText });
              } else {
                mutationType = 'decrement';
                quantityRemoved = quantityRequested;
                const newQuantity = quantityBefore - quantityRequested;
                toolsUsed.push('updateCartItemQuantity');
                await toolRegistry.updateCartItemQuantity(state.sessionId, state.userId, productId, newQuantity);
                cartMutationConfirmed = true;

                const responseText = `Removi ${quantityRequested} ${quantityRequested === 1 ? 'unidade' : 'unidades'} de ${productName} do seu carrinho.`;
                parts.push({ type: 'text', role: 'assistant', text: responseText });
              }
            } else {
              mutationType = 'remove';
              quantityRemoved = quantityBefore;
              toolsUsed.push('removeCartItem');
              await toolRegistry.removeCartItem(state.sessionId, state.userId, productId);
              cartMutationConfirmed = true;

              const responseText = `Removi ${productName} do seu carrinho.`;
              parts.push({ type: 'text', role: 'assistant', text: responseText });
            }

            const updatedCart = await toolRegistry.getCustomerCart(state.sessionId, state.userId);
            toolsUsed.push('getCustomerCart');

            parts.push({
              type: 'cart_items',
              items: updatedCart.items,
              mutationType: 'remove',
              cartAfter: { itemCount: updatedCart.itemCount, total: updatedCart.total }
            });

            return {
              ...state,
              parts,
              toolResults: {
                ...state.toolResults,
                toolResultContext: `MUTAÇÃO: Removido/decrementado o produto ID ${productId} com tipo ${mutationType}.`
              },
              diagnostics: {
                ...state.diagnostics,
                agent: 'CartAgent',
                intent: 'cart_remove',
                cartMutation: true,
                mutationType,
                mutationConfirmed: true,
                product: { id: productId, name: productName },
                quantityRequested: quantityRequested || 0,
                quantityBefore,
                quantityRemoved,
                toolsUsed
              }
            };
          }
        }
      } else if (intent === 'cart_update_quantity') {
        const productEntity = state.resolvedEntities?.find((e) => e.type === 'product');
        const productId = productEntity?.id;
        const quantity = Number(state.resolvedEntities?.find((e) => e.type === 'quantity')?.value || 1);

        if (productId) {
          toolsUsed.push('updateCartItemQuantity');
          await toolRegistry.updateCartItemQuantity(state.sessionId, state.userId, productId, quantity);
          cartMutationConfirmed = true;
          toolResultContext = `MUTAÇÃO: Atualizada quantidade do produto ID ${productId} para ${quantity} no carrinho.`;
        } else {
          warnings.push('Nenhum produto especificado para atualizar quantidade.');
          toolResultContext = 'MUTAÇÃO FALHOU: Nenhum produto especificado.';
        }
      }
    } catch (err: any) {
      console.error('[CartAgent] Mutation failed:', err);
      cartMutationConfirmed = false;
      mutationError = err.message || 'Erro desconhecido';
      warnings.push(`Falha na mutação do carrinho: ${mutationError}`);
      toolResultContext = `MUTAÇÃO FALHOU: ${mutationError}`;
    }

    const cart = cartAfter || (await toolRegistry.getCustomerCart(state.sessionId, state.userId));
    if (!toolsUsed.includes('getCustomerCart')) {
      toolsUsed.push('getCustomerCart');
    }

    if (!toolResultContext) {
      toolResultContext =
        `CARRINHO ATUAL DO CLIENTE:\n` +
        `- Total de Itens: ${cart.itemCount}\n` +
        `- Valor Total: R$ ${cart.total.toFixed(2)}\n` +
        `- Itens: ${cart.items.map((i: any) => `${i.name} (Qtd: ${i.quantity})`).join(', ') || 'Vazio'}\n`;
    } else {
      toolResultContext +=
        `\nESTADO ATUAL DO CARRINHO:\n` +
        `- Total de Itens: ${cart.itemCount}\n` +
        `- Valor Total: R$ ${cart.total.toFixed(2)}\n` +
        `- Itens: ${cart.items.map((i: any) => `${i.name} (Qtd: ${i.quantity})`).join(', ') || 'Vazio'}\n`;
    }

    if (intent === 'cart_clear') {
      if (cartAlreadyEmpty) {
        parts.push(...buildSuccessfulCartClearParts({ alreadyEmpty: true }));
      } else if (cartMutationConfirmed) {
        parts.push(...buildSuccessfulCartClearParts({ alreadyEmpty: false }));
      } else {
        const message = mutationError
          ? `Não consegui esvaziar o carrinho: ${mutationError}`
          : 'Não consegui esvaziar o carrinho completamente. Verifique os itens e tente novamente.';
        parts.push({ type: 'text', role: 'assistant', text: message });
        parts.push({
          type: 'actions',
          actions: [
            { id: 'open-cart-after-clear-failed', label: 'Abrir carrinho', type: 'cart_open', style: 'primary', payload: { path: '/carrinho' } }
          ]
        });
        parts.push({
          type: 'cart_items',
          items: cart.items,
          mutationType: 'clear',
          cartAfter: { itemCount: cart.itemCount, total: cart.total }
        });
      }
    } else {
      parts.push({
        type: 'cart_items',
        items: cart.items,
        cartAfter: { itemCount: cart.itemCount, total: cart.total }
      });

      if (cart.itemCount > 0) {
        const progress = await toolRegistry.getCartFreeShippingProgress(cart.total, cart.items);
        toolsUsed.push('getCartFreeShippingProgress');
        parts.push({
          type: 'free_shipping_progress',
          data: progress
        });
      }
    }

    return {
      cart,
      parts,
      toolResults: {
        ...state.toolResults,
        toolResultContext
      },
      diagnostics: {
        ...state.diagnostics,
        warnings,
        toolsUsed,
        cartMutation: intent === 'cart_clear' && !cartAlreadyEmpty,
        cartAlreadyEmpty: intent === 'cart_clear' ? cartAlreadyEmpty : undefined,
        cartSource: cart.source || clearResult?.source,
        cartId: cart.id || clearResult?.cartId,
        cartMutationConfirmed: intent === 'cart_clear' ? cartMutationConfirmed : cartMutationConfirmed,
        mutationConfirmed: cartMutationConfirmed,
        mutationError: mutationError || undefined,
        cartBefore: cartBefore ? { itemCount: cartBefore.itemCount, total: cartBefore.total } : undefined,
        cartAfter: { itemCount: cart.itemCount, total: cart.total },
        mutationType: intent === 'cart_clear' ? 'clear' : undefined,
        sales: {
          recommendedProducts: [],
          freeShippingSuggestion: intent !== 'cart_clear' && cart.itemCount > 0,
          couponSuggested: false
        }
      }
    };
  }
}
