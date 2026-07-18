import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
  else console.log(`PASS: ${message}`);
}

const settings = read('src/pages/SiteSettings.tsx');
const chats = read('src/pages/KaiaChats.tsx');
const hook = read('src/hooks/useSiteSettings.ts');

assert(settings.includes('kaia_long_term_memory_enabled'), 'site settings exposes long-term memory toggle');
assert(hook.includes('kaia_long_term_memory_enabled'), 'site settings hook includes memory setting');
assert(chats.includes('/admin/kaia/v2/learning/context/'), 'chat admin panel fetches conversation learning context');
assert(chats.includes('fetchConversationContext'), 'chat admin panel has context loader');
assert(chats.includes('learningQueueDiagnostics'), 'learning page renders queue diagnostics');
assert(chats.includes('pending_admin_approval') && chats.includes('approved') && chats.includes('rejected') && chats.includes('archived'), 'memory tab distinguishes memory statuses');
assert(chats.includes('improvementFilterStatus') && chats.includes('applied'), 'learning tab distinguishes improvement statuses');

if (failures.length) {
  console.error('\nFrontend memory-setting check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Frontend memory-setting checks passed.');
