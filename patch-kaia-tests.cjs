const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '..', 'Kapsu-api', 'src/tests/test-kaia-response-pipeline.ts');
let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replace(before, after) {
  const next = text.replace(before, after);
  if (next === text) throw new Error('Test transform did not match');
  text = next;
}
replace(
  "    healthSensitivity: 'low'\n",
  "    healthSensitivity: 'low',\n    conversationDecision: 'recommend_products',\n    customerCorrection: false\n",
);
replace(
  "function baseAgentState(message: string): any {",
  `async function executeRejectsWithoutAssistant(message: string, sessionId: string) {
  sessionIds.push(sessionId);
  const userMessageId = generateId();
  let rejected = false;
  try {
    await getKaiaOrchestrator().execute({
      message,
      sessionId,
      userId: null,
      userMessageId,
      executionMode: 'live',
      cartInfo: { itemCount: 0, total: 0, items: [] }
    });
  } catch {
    rejected = true;
  }
  const conversation = await db('customer_conversations').where('session_id', sessionId).first();
  if (conversation?.id) conversationIds.push(conversation.id);
  const persisted = await db('customer_conversation_messages')
    .where({ in_reply_to_user_message_id: userMessageId, sender_type: 'ai' });
  return { rejected, persisted };
}

function baseAgentState(message: string): any {`,
);
replace(
  /  const stateB = await execute\('Minha cabeca nao esta rendendo no trabalho', `pipe-b-\$\{suffix\}`\);[\s\S]*?  assertNoMojibake\('B no mojibake', stateB\.parts\);\n\n  \(global as any\)\.geminiMockHandler = async \(\) => \{ throw new Error\('router provider down'\); \};\n  const stateC = await execute\('Mensagem sem rota local', `pipe-c-\$\{suffix\}`\);[\s\S]*?  assert\('C technical fallback zero product cards\/actions', countsC\.product_cards === 0 && countsC\.actions === 0, countsC\);/,
  `  const failedCopy = await executeRejectsWithoutAssistant(
    'Minha cabeca nao esta rendendo no trabalho',
    \`pipe-b-\${suffix}\`
  );
  assert('B provider failure rejects the live execution', failedCopy.rejected);
  assert('B provider failure persists no deterministic assistant fallback', failedCopy.persisted.length === 0, failedCopy.persisted);

  (global as any).geminiMockHandler = async () => { throw new Error('router provider down'); };
  const failedRouter = await executeRejectsWithoutAssistant('Mensagem sem rota local', \`pipe-c-\${suffix}\`);
  assert('C router failure rejects the live execution', failedRouter.rejected);
  assert('C router failure persists no technical assistant fallback', failedRouter.persisted.length === 0, failedRouter.persisted);`,
);
fs.writeFileSync(file, text, 'utf8');
