const fs = require('fs');
const path = 'd:/Daniel/Projetos GitHub/Sanare/src/components/FloatingChat.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings
const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n');
content = normalizeLineEndings(content);

// 1. Replace the map declaration
const oldMapDecl = 'msg.metadata.recommendedProducts.map((prod: any) => (';
const newMapDecl = 'msg.metadata.recommendedProducts.map((prod: any, productIdx: number) => (';

if (content.includes(oldMapDecl)) {
  content = content.replace(oldMapDecl, newMapDecl);
  console.log("1. Map declaration replaced!");
} else {
  console.log("1. Map declaration NOT found (might already be replaced)!");
}

// 2. Replace the legacy button
const oldButtonRegex = /<button\s+onClick=\{\(\)\s*=>\s*handleAddProductDirectly\(prod\)\}\s+disabled=\{addingProductIds\[prod\.id\]\s*===\s*['"]loading['"]\}\s+className=\{\`py-1\s+text-center\s+rounded\s+text-\[10px\]\s+font-semibold\s+transition-colors\s+flex\s+items-center\s+justify-center\s+space-x-1\s+cursor-pointer[\s\S]*?<\/button>/;

const newButton = `{(() => {
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
                                         })()}`;

if (oldButtonRegex.test(content)) {
  content = content.replace(oldButtonRegex, newButton);
  console.log("2. Legacy button replaced!");
} else {
  console.log("2. Legacy button NOT found via regex!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Done!");
