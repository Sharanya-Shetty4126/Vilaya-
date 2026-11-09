/**
 * Zero Network Build Assertion Script
 * Scans built extension distribution files to guarantee zero external network requests.
 * Fails build if fetch(), XMLHttpRequest, or WebSocket are detected.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error('[SECURITY CHECK] Error: dist directory does not exist.');
  process.exit(1);
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json')) {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

const forbiddenPatterns = [
  { name: 'fetch', regex: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest', regex: /\bnew\s+XMLHttpRequest\b/ },
  { name: 'WebSocket', regex: /\bnew\s+WebSocket\b/ },
];

const files = getAllFiles(DIST_DIR);
let violationsFound = 0;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');

  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(content)) {
      console.error(
        `[SECURITY CHECK FAILED] Forbidden network API "${pattern.name}" detected in ${path.relative(
          process.cwd(),
          filePath
        )}`
      );
      violationsFound++;
    }
  }
}

if (violationsFound > 0) {
  console.error(`[SECURITY CHECK] Found ${violationsFound} forbidden network API occurrences.`);
  process.exit(1);
} else {
  console.log(`[SECURITY CHECK PASSED] Verified ${files.length} built files: 0 network APIs detected.`);
}

