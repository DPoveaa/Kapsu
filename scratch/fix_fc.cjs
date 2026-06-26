const fs = require('fs');
const path = 'd:/Daniel/Projetos GitHub/Sanare/src/components/FloatingChat.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF for consistent replacements
const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n');
content = normalizeLineEndings(content);

// 1. Replace the setAddingProductIds catch block in handleAddProductDirectly
const oldCatch = `      } else {
        throw new Error('Produto não encontrado')
      }
    } catch (error) {
      console.error('Erro ao adicionar produto diretamente:', error)
      setAddingProductIds(prev => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: \`❌ Não foi possível adicionar "\${product.name}" ao carrinho. Tente novamente.\`,
          timestamp: Date.now(),
        }
      ])
    }
  }`;

const newCatch = `      } else {
        throw new Error('Produto não encontrado');
      }
    } catch (error) {
      console.error('Erro ao adicionar produto diretamente:', error);
      setActionStates(prev => {
        const next = { ...prev };
        delete next[stateKey];
        return next;
      });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: \`❌ Não foi possível adicionar "\${product.name}" ao carrinho. Tente novamente.\`,
          timestamp: Date.now(),
        }
      ]);
    }
  }`;

if (content.includes(normalizeLineEndings(oldCatch))) {
  content = content.replace(normalizeLineEndings(oldCatch), newCatch);
  console.log("1. Catch block replaced!");
} else {
  console.log("1. Catch block NOT found!");
}

// 2. Replace the part.actions rendering block
const oldActionsBlock = `                                 if (part.type === 'actions') {
                                     const partActions = part.actions || []
                                     return (
                                       <div key={\`part-actions-\${index}-\${partIdx}\`} className="flex flex-wrap gap-2 w-full max-w-[85%] sm:max-w-[80%] justify-start">
                                         {partActions.map((action: any, actionIdx: number) => (
                                           <button
                                             key={\`part-action-btn-\${index}-\${partIdx}-\${actionIdx}\`}
                                             onClick={() => {
                                               if (isLoading) return
                                               const href = action.href || action.url
                                               if (href) {
                                                 if (href.startsWith('action://')) {
                                                   handleChatActionUrl(href, action.label)
                                                 } else if (href.startsWith('http')) {
                                                   window.open(href, '_blank', 'noopener,noreferrer')
                                                 } else {
                                                   navigate(href)
                                                   setIsOpen(false)
                                                 }
                                               }
                                             }}
                                             className={\`px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors cursor-pointer flex-grow text-center \${action.type === 'primary'
                                               ? 'bg-green-600 hover:bg-green-700 text-white'
                                               : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                               }\`}
                                           >
                                             {action.label}
                                           </button>
                                         ))}
                                       </div>
                                     )
                                   }`;

const newActionsBlock = `                                 if (part.type === 'actions') {
                                   const layout = msg.metadata?.responseLayout || 'product_recommendation';
                                   const productIds = msg.metadata?.recommendedProducts?.map(p => p.id) || [];
                                   const primaryProductId = productIds[0];
                                   const partActions = normalizeActionsForLayout(layout, part.actions || [], {
                                     primaryProductId,
                                     productIds,
                                     productAlreadyInCart: (id) => items.some(item => item.product?.id === id)
                                   });

                                   return (
                                     <div key={\`part-actions-\${index}-\${partIdx}\`} className="flex flex-wrap gap-2 w-full max-w-[85%] sm:max-w-[80%] justify-start">
                                       {partActions.map((action: any, actionIdx: number) => {
                                         const isCartAdd = action.type === 'cart_add';
                                         const stateKey = getActionStateKey(msg.id || msg.clientTempId, partIdx, action, actionIdx, index);
                                         const state = actionStates[stateKey];

                                         // Obter dados do produto a partir do payload ou metadados
                                         const pId = action.payload?.productId || action.productId;
                                         const pName = action.payload?.productName || action.label || 'Produto';
                                         const pPrice = action.payload?.price || 0;
                                         const mockProd = { id: pId, name: pName, price: pPrice };

                                         return (
                                           <button
                                             key={\`part-action-btn-\${index}-\${partIdx}-\${actionIdx}\`}
                                             onClick={(event) => {
                                               if (isCartAdd) {
                                                 if (pId) {
                                                   handleAddProductDirectly(mockProd, { stateKey, fromElement: event.currentTarget });
                                                 }
                                                 return;
                                               }
                                               if (isLoading) return;
                                               const href = action.href || action.url;
                                               if (href) {
                                                 if (href.startsWith('action://')) {
                                                   handleChatActionUrl(href, action.label);
                                                 } else if (href.startsWith('http')) {
                                                   window.open(href, '_blank', 'noopener,noreferrer');
                                                 } else {
                                                   navigate(href);
                                                   setIsOpen(false);
                                                 }
                                               }
                                             }}
                                             className={\`px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors cursor-pointer flex-grow text-center
                                               \${isCartAdd
                                                 ? state === 'success'
                                                   ? 'bg-green-700 text-white border border-green-500 scale-95'
                                                   : state === 'loading'
                                                     ? 'bg-green-600 opacity-70 text-white'
                                                     : 'bg-green-600 hover:bg-green-700 text-white'
                                                 : action.type === 'primary'
                                                   ? 'bg-green-600 hover:bg-green-700 text-white'
                                                   : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                               }\`}
                                           >
                                             {isCartAdd ? (
                                               state === 'loading' ? (
                                                 <span className="flex items-center justify-center space-x-1">
                                                   <Loader2 className="w-3 h-3 animate-spin" />
                                                   <span>Adicionando...</span>
                                                 </span>
                                               ) : state === 'success' ? (
                                                 'Adicionado ao carrinho'
                                               ) : (
                                                 action.label || 'Adicionar ao carrinho'
                                               )
                                             ) : (
                                               action.label
                                             )}
                                           </button>
                                         );
                                       })}
                                     </div>
                                   );
                                 }`;

if (content.includes(normalizeLineEndings(oldActionsBlock))) {
  content = content.replace(normalizeLineEndings(oldActionsBlock), newActionsBlock);
  console.log("2. Actions block replaced!");
} else {
  console.log("2. Actions block NOT found!");
}

// 3. Replace the legacy recommended products block
const oldLegacyRecBlock = `                              {msg.role === 'assistant' && msg.metadata?.recommendedProducts && msg.metadata.recommendedProducts.length > 0 && (
                                 <div className="mt-2 space-y-2 w-full max-w-[85%] sm:max-w-[80%]">
                                   {msg.metadata.recommendedProducts.map((prod: any) => (
                                     <div
                                       key={prod.id}
                                       className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow transition-shadow flex flex-col space-y-2 text-left"
                                     >
                                       <div className="flex justify-between items-center">
                                         <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded">
                                           {prod.category || 'Geral'}
                                         </span>
                                       </div>
                                       <div>
                                         <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-100 line-clamp-1">
                                           {prod.name}
                                         </h4>
                                         {prod.description && (
                                           <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                                             {prod.description}
                                           </p>
                                         )}
                                       </div>
                                       <div className="flex items-baseline space-x-1.5">
                                         <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                                         </span>
                                         {prod.originalPrice && prod.originalPrice > prod.price && (
                                           <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.originalPrice)}
                                           </span>
                                         )}
                                       </div>
                                       <div className="grid grid-cols-2 gap-1.5 pt-1">
                                         <button
                                           onClick={() => {
                                             navigate(prod.url)
                                             setIsOpen(false)
                                           }}
                                           className="py-1 text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                         >
                                           Ver Produto
                                         </button>
                                         <button
                                           onClick={() => handleAddProductDirectly(prod)}
                                           disabled={addingProductIds[prod.id] === 'loading'}
                                           className={\`py-1 text-center rounded text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer
                                             \${addingProductIds[prod.id] === 'success'
                                               ? 'bg-green-700 text-white border border-green-500 scale-95'
                                               : addingProductIds[prod.id] === 'loading'
                                                 ? 'bg-green-600 opacity-70 text-white cursor-not-allowed'
                                                 : 'bg-green-600 hover:bg-green-700 text-white'
                                             }\`}
                                         >
                                           {addingProductIds[prod.id] === 'loading' ? (
                                             <>
                                               <Loader2 className="w-3 h-3 animate-spin" />
                                               <span>Adicionando...</span>
                                             </>
                                           ) : addingProductIds[prod.id] === 'success' ? (
                                             <span>Adicionado! ✓</span>
                                           ) : (
                                             <span>Adicionar</span>
                                           )}
                                         </button>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               )}`;

const newLegacyRecBlock = `                              {msg.role === 'assistant' && msg.metadata?.recommendedProducts && msg.metadata.recommendedProducts.length > 0 && (
                                 <div className="mt-2 space-y-2 w-full max-w-[85%] sm:max-w-[80%]">
                                   {msg.metadata.recommendedProducts.map((prod: any, productIdx: number) => (
                                     <div
                                       key={prod.id}
                                       className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow transition-shadow flex flex-col space-y-2 text-left"
                                     >
                                       <div className="flex justify-between items-center">
                                         <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded">
                                           {prod.category || 'Geral'}
                                         </span>
                                       </div>
                                       <div>
                                         <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-100 line-clamp-1">
                                           {prod.name}
                                         </h4>
                                         {prod.description && (
                                           <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                                             {prod.description}
                                           </p>
                                         )}
                                       </div>
                                       <div className="flex items-baseline space-x-1.5">
                                         <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                                         </span>
                                         {prod.originalPrice && prod.originalPrice > prod.price && (
                                           <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.originalPrice)}
                                           </span>
                                         )}
                                       </div>
                                       <div className="grid grid-cols-2 gap-1.5 pt-1">
                                         <button
                                           onClick={() => {
                                             navigate(prod.url)
                                             setIsOpen(false)
                                           }}
                                           className="py-1 text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                         >
                                           Ver Produto
                                         </button>
                                         {(() => {
                                           const stateKey = \`legacy-rec-\${prod.id}-\${productIdx}\`;
                                           const state = actionStates[stateKey];
                                           return (
                                             <button
                                               onClick={(event) => handleAddProductDirectly(prod, { stateKey, fromElement: event.currentTarget })}
                                               className={\`py-1 text-center rounded text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer
                                                 \${state === 'success'
                                                   ? 'bg-green-700 text-white border border-green-500 scale-95'
                                                   : state === 'loading'
                                                     ? 'bg-green-600 opacity-70 text-white'
                                                     : 'bg-green-600 hover:bg-green-700 text-white'
                                                 }\`}
                                             >
                                               {state === 'loading' ? (
                                                 <>
                                                   <Loader2 className="w-3 h-3 animate-spin" />
                                                   <span>Adicionando...</span>
                                                 </>
                                               ) : state === 'success' ? (
                                                 <span>Adicionado</span>
                                               ) : (
                                                 <span>Adicionar</span>
                                               )}
                                             </button>
                                           );
                                         })()}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               )}`;

if (content.includes(normalizeLineEndings(oldLegacyRecBlock))) {
  content = content.replace(normalizeLineEndings(oldLegacyRecBlock), newLegacyRecBlock);
  console.log("3. Legacy recommendations block replaced!");
} else {
  console.log("3. Legacy recommendations block NOT found!");
}

// 4. Replace the quick suggestions block
const oldSuggestions = `                  {/* Sugestões de ajuda quando autenticado e não há mensagens de usuário ainda */}
                  {messages.filter(m => m.role === 'user').length === 0 && (
                    <div className="flex flex-col space-y-2 mt-4 animate-fade-in">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">Sugestões de ajuda</p>
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {[
                          { label: '🛒 Ver meu carrinho', text: 'Mostrar carrinho' },
                          { label: '🚚 Como ter frete grátis?', text: 'Como ganhar frete grátis?' },
                          { label: '🎫 Quais são os cupons ativos?', text: 'Quais são os cupons ativos?' },
                          { label: '📦 Status do meu último pedido', text: 'Qual o status do meu último pedido?' },
                          { label: '🔥 Promoções', text: 'Quais são as promoções ativas?' },
                          { label: '👥 Falar com atendente', text: 'Quero falar com um atendente' }
                        ].map((sug, sugIdx) => (
                          <button
                            key={sugIdx}
                            onClick={() => sendMessageToServer(sug.text)}
                            className="px-2.5 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium shadow-sm transition-all cursor-pointer hover:scale-105"
                          >
                            {sug.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}`;

const newSuggestions = `                  {/* Sugestões de ajuda quando autenticado e não há mensagens de usuário ainda */}
                  {messages.filter(m => m.role === 'user').length === 0 && (
                    <div className="flex flex-col space-y-2 mt-4 animate-fade-in">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">Sugestões de ajuda</p>
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {[
                          { label: 'Ver meu carrinho', text: 'Mostrar carrinho', icon: ShoppingCart },
                          { label: 'Como ter frete grátis?', text: 'Como ganhar frete grátis?', icon: Truck },
                          { label: 'Quais são os cupons ativos?', text: 'Quais são os cupons ativos?', icon: Ticket },
                          { label: 'Status do meu último pedido', text: 'Qual o status do meu último pedido?', icon: Package },
                          { label: 'Promoções', text: 'Quais são as promoções ativas?', icon: Flame },
                          { label: 'Falar com atendente', text: 'Quero falar com um atendente', icon: Users }
                        ].map((sug, sugIdx) => {
                          const Icon = sug.icon;
                          return (
                            <button
                              key={sugIdx}
                              onClick={() => sendMessageToServer(sug.text)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium shadow-sm transition-all cursor-pointer hover:scale-105"
                            >
                              <Icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span>{sug.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}`;

if (content.includes(normalizeLineEndings(oldSuggestions))) {
  content = content.replace(normalizeLineEndings(oldSuggestions), newSuggestions);
  console.log("4. Suggestions block replaced!");
} else {
  console.log("4. Suggestions block NOT found!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("All modifications written back to FloatingChat.tsx successfully!");
