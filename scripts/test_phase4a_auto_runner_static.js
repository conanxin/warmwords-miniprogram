/**
 * Phase 4A Auto Runner Static Checks
 * 
 * Validates:
 * - run_phase4a_recognition_quality_batch.js exists
 * - phase4a_cases.json exists
 * - Script checks AI_PROVIDER_API_KEY env var
 * - Script does not contain real keys
 * - Script does not console.log Authorization/base64/imageBuffer
 * - Output directory is test-results/phase4a
 * - PHASE_4A_AUTO_TESTING_GUIDE.md exists
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const checks = [];

function check(name, condition, detail) {
  checks.push({ name, pass: !!condition, detail });
  console.log(`${!!condition ? '✅' : '❌'} ${name}`);
  if (!condition && detail) console.log(`   → ${detail}`);
}

const batchScript = path.join(PROJECT_ROOT, 'scripts', 'run_phase4a_recognition_quality_batch.js');
check('run_phase4a_recognition_quality_batch.js exists', fs.existsSync(batchScript));

const casesFile = path.join(PROJECT_ROOT, 'test-assets', 'phase4a', 'phase4a_cases.json');
check('phase4a_cases.json exists', fs.existsSync(casesFile));

const guideFile = path.join(PROJECT_ROOT, 'docs', 'PHASE_4A_AUTO_TESTING_GUIDE.md');
check('PHASE_4A_AUTO_TESTING_GUIDE.md exists', fs.existsSync(guideFile));

if (fs.existsSync(batchScript)) {
  const content = fs.readFileSync(batchScript, 'utf8');
  
  check('Script checks AI_PROVIDER_API_KEY',
    content.includes('AI_PROVIDER_API_KEY'),
    'Missing AI_PROVIDER_API_KEY env var check');
  
  check('Script does not contain real API key patterns',
    !/sk-[a-zA-Z0-9]{20,}/.test(content) && !/sk-proj-[a-zA-Z0-9_-]{20,}/.test(content),
    'Possible API key found in script');
  
  check('Script does not console.log Authorization header',
    !/console\.log.*Authorization/.test(content),
    'Found console.log with Authorization');
  
  check('Script does not console.log base64',
    !/console\.log.*base64/i.test(content),
    'Found console.log with base64');
  
  check('Script does not console.log imageBuffer',
    !/console\.log.*imageBuffer/.test(content),
    'Found console.log with imageBuffer');
  
  check('Script outputs to test-results/phase4a',
    content.includes('test-results') && content.includes('phase4a'),
    'Missing test-results/phase4a output path');
  
  check('Script has delay between requests',
    content.includes('setTimeout') || content.includes('delay'),
    'No inter-request delay found');
  
  check('Script exits with code 2 on missing env vars',
    content.includes('process.exit(2)'),
    'Missing safe exit with code 2');
  
  check('Script has errorMessageShort max 160 chars',
    content.includes('160'),
    'Missing 160-char limit on errorMessageShort');
}

if (fs.existsSync(casesFile)) {
  const cases = JSON.parse(fs.readFileSync(casesFile, 'utf8'));
  check('phase4a_cases.json has 30 cases',
    cases.length === 30,
    `Found ${cases.length} cases, expected 30`);
  
  check('All cases have required fields',
    cases.every(c => c.index && c.filename && c.expectedEn && c.expectedZh && c.category),
    'Some cases missing required fields');
}

console.log('\n--- Summary ---');
const passed = checks.filter(c => c.pass).length;
const total = checks.length;
console.log(`${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);