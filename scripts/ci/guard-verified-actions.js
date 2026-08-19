#!/usr/bin/env node

/**
 * CI Guardrail: Anti-Self-Deception in Action Tools
 * 
 * Verifies that any tool under src/tools/ performing external state modifications
 * (post, send, publish, delete) uses real verification (verifyWithVision / VerifiedActionResult)
 * and does not return unverified blind { success: true }.
 */

const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, '..', '..', 'src', 'tools');

if (!fs.existsSync(toolsDir)) {
  console.log('[CI Guard] No tools directory found at src/tools. Skipping check.');
  process.exit(0);
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const toolFiles = getAllFiles(toolsDir);
let hasErrors = false;

const MUTATION_PATTERNS = [/post/i, /send/i, /publish/i, /delete/i];

console.log(`[CI Guard] Auditing ${toolFiles.length} tool file(s) for Verified Action Compliance...`);

for (const file of toolFiles) {
  const relativePath = path.relative(path.join(__dirname, '..', '..'), file);
  const baseName = path.basename(file);
  const content = fs.readFileSync(file, 'utf8');

  const isMutationTool = MUTATION_PATTERNS.some(p => p.test(baseName) || p.test(content.slice(0, 1000)));

  if (isMutationTool) {
    const hasVerificationImport = content.includes('verifyWithVision') || content.includes('VerifiedActionResult');
    const hasBlindSuccessReturn = /return\s*\{\s*success\s*:\s*true\s*,\s*(?!.*verified)/m.test(content);

    if (!hasVerificationImport) {
      console.error(`❌ [CI Guard Error] ${relativePath}: Mutation tool must import verifyWithVision or VerifiedActionResult.`);
      hasErrors = true;
    }

    if (hasBlindSuccessReturn) {
      console.error(`❌ [CI Guard Error] ${relativePath}: Blind return of 'success: true' detected without verified confirmation.`);
      hasErrors = true;
    }

    if (hasVerificationImport && !hasBlindSuccessReturn) {
      console.log(`✓ [CI Guard Passed] ${relativePath}: Compliant with VerifiedActionResult standard.`);
    }
  }
}

if (hasErrors) {
  console.error('\n🚨 CI Guardrail Failed: Unverified action returns detected in src/tools/.');
  console.error('All external mutation tools must verify state using verifyWithVision before returning success: true.\n');
  process.exit(1);
}

console.log('[CI Guard] All mutation tools comply with anti-self-deception requirements.\n');
process.exit(0);
