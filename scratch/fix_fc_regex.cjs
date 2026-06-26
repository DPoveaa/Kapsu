const fs = require('fs');
const path = 'd:/Daniel/Projetos GitHub/Sanare/src/components/FloatingChat.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings
const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n');
content = normalizeLineEndings(content);

// 1. Actions block regex replacement
const actionsRegex = /if\s*\(\s*part\.type\s*===\s*['"]actions['"]\s*\)\s*\{\s*const\s+partActions\s*=\s*part\.actions\s*\|\|\s*\[\]\s*return\s*\(\s*<div\s+key=\{\`part-actions-\$\{index\}-\$\{partIdx\}\`\}[\s\S]*?<\/div>\s*\)\s*\}/;

const newActionsBlock = `if (part.type === 'actions') {
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

if (actionsRegex.test(content)) {
  content = content.replace(actionsRegex, newActionsBlock);
  console.log("2. Actions block replaced successfully!");
} else {
  console.log("2. Actions block NOT found via regex!");
}

// 2. Legacy recommendations block regex replacement
const recRegex = /msg\.role\s*===\s*['"]assistant['"]\s*&&\s*msg\.metadata\?\.recommendedProducts\s*&&\s*msg\.metadata\.recommendedProducts\.length\s*>\s*0\s*&&\s*\(\s*<div\s+className=["']mt-2\s+space-y-2\s+w-full\s+max-w-\[85%\]\s+sm:max-w-\[80%\]["']>\s*\{msg\.metadata\.recommendedProducts\.map\(\s*\(\s*prod:\s*any\s*\)\s*=>\s*\([\s\S]*?<\/div>\s*\}\s*<\/div>\s*\)/;

const newLegacyRecBlock = `msg.role === 'assistant' && msg.metadata?.recommendedProducts && msg.metadata.recommendedProducts.length > 0 && (
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
                               )`;

if (recRegex.test(content)) {
  content = content.replace(recRegex, newLegacyRecBlock);
  console.log("3. Legacy recommendations block replaced successfully!");
} else {
  console.log("3. Legacy recommendations block NOT found via regex!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Done!");
