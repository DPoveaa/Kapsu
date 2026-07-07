import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Mojibake patterns
const patterns = [
  { regex: /Ã[¡©í³ºãõ§ª´¢à]/g, name: 'Double-encoded UTF-8 (Ã + character)' },
  { regex: /â€/g, name: 'Special punctuation mojibake (â€)' },
  { regex: /\uFFFD/g, name: 'Replacement character ()' }
];

// Folders/files to scan
const scanTargets = [
  'src',
  'public',
  'index.html',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.js'
];

// Files to completely ignore (e.g. binaries, assets)
const ignoreExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.zip', '.gif', '.pdf'];

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        scanDir(filePath, fileList);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      if (!ignoreExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

let failed = false;

console.log('🔍 Starting UTF-8 Encoding and Mojibake audit...');

const filesToScan = [];
for (const target of scanTargets) {
  const fullPath = path.join(rootDir, target);
  if (!fs.existsSync(fullPath)) continue;
  
  if (fs.statSync(fullPath).isDirectory()) {
    scanDir(fullPath, filesToScan);
  } else {
    filesToScan.push(fullPath);
  }
}

console.log(`Scanning ${filesToScan.length} files...`);

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(rootDir, filePath);
  
  const lines = content.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    patterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        console.error(`❌ [ENCODING ERROR] File: [${relativePath}:${lineIndex + 1}]`);
        console.error(`   Pattern matched: "${pattern.name}"`);
        console.error(`   Content: "${line.trim()}"`);
        failed = true;
      }
    });
  });
}

if (failed) {
  console.error('\n❌ Audit failed! Found encoding/Mojibake issues in source files.');
  process.exit(1);
} else {
  console.log('\n✅ Audit passed! All files are clean and properly encoded in UTF-8.');
  process.exit(0);
}
