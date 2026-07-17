/**
 * Frontend static contract: site-chat Kaia message payloads must only include
 * message, sessionId, clientRequestId?, cartInfo?
 * Auth identity must come from the Authorization header only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const ALLOWED_BODY_FIELDS = new Set(['message', 'sessionId', 'clientRequestId', 'cartInfo']);
const FORBIDDEN_BODY_FIELDS = [
  'userId',
  'isAuthenticated',
  'conversationHistory',
  'userInfo',
  'memory',
  'intent',
  'selectedAgent',
  'executionMode',
  'diagnostics',
];

const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractObjectKeys(objectBody) {
  const keys = [];
  const lines = objectBody.split('\n');
  for (const line of lines) {
    const trimmed = line.trim().replace(/,$/, '');
    if (!trimmed || trimmed.startsWith('//')) continue;
    const shorthand = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
    if (shorthand) {
      keys.push(shorthand[1]);
      continue;
    }
    const keyed = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (keyed) keys.push(keyed[1]);
  }
  return keys;
}

// 1. whatsapp.service sendSiteMessage body shape
const whatsappSrc = read('src/services/whatsapp.service.ts');
const sendSiteMatch = whatsappSrc.match(
  /async sendSiteMessage[\s\S]*?body:\s*JSON\.stringify\(\{([\s\S]*?)\}\)/
);
if (!sendSiteMatch) {
  failures.push('sendSiteMessage JSON body not found in whatsapp.service.ts');
} else {
  const keys = extractObjectKeys(sendSiteMatch[1]);
  for (const key of keys) {
    if (!ALLOWED_BODY_FIELDS.has(key)) {
      failures.push(`sendSiteMessage body includes unsupported field: ${key}`);
    }
  }
  for (const required of ['message', 'sessionId']) {
    if (!keys.includes(required)) {
      failures.push(`sendSiteMessage body missing ${required}`);
    }
  }
  for (const field of FORBIDDEN_BODY_FIELDS) {
    if (keys.includes(field)) {
      failures.push(`sendSiteMessage body includes forbidden field: ${field}`);
    }
  }
  if (!whatsappSrc.includes("headers['Authorization']") && !whatsappSrc.includes('Authorization')) {
    failures.push('sendSiteMessage must send Authorization header when token exists');
  }
}

// 2. Live integration scripts must not send forbidden fields to /kaia/v2/message
const scriptsDir = path.join(ROOT, 'scripts');
for (const file of fs.readdirSync(scriptsDir)) {
  if (!file.endsWith('.mjs') && !file.endsWith('.js')) continue;
  if (file === 'kaia-message-payload-contract-check.mjs') continue;
  const content = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  if (!content.includes('/kaia/v2/message')) continue;

  const blocks = [...content.matchAll(/JSON\.stringify\(\{([\s\S]*?)\}\)/g)];
  for (const block of blocks) {
    const nearby = content.slice(Math.max(0, block.index - 250), block.index);
    if (!nearby.includes('/kaia/v2/message') && !nearby.includes('kaia/v2/message')) continue;
    const keys = extractObjectKeys(block[1]);
    for (const field of FORBIDDEN_BODY_FIELDS) {
      if (keys.includes(field)) {
        failures.push(`${file}: /kaia/v2/message body includes forbidden field ${field}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Kaia message payload contract FAILED:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('Kaia message payload contract passed.');
console.log(' - sendSiteMessage body fields are limited to message/sessionId/cartInfo/clientRequestId');
console.log(' - Authorization remains header-based');
console.log(' - scripts posting to /kaia/v2/message omit forbidden identity/history fields');
