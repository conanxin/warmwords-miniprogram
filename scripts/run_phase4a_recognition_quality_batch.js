/**
 * Phase 4A Recognition Quality Batch Test Runner
 *
 * Reads test cases from test-assets/phase4a/phase4a_cases.json
 * Calls openaiCompatibleVisionProvider for each image
 * Generates JSON/CSV/Markdown reports in test-results/phase4a/
 *
 * Security:
 * - Does NOT print API Key, Authorization, base64, imageBuffer, fileContent
 * - Does NOT save image content to results
 * - Exits safely if env vars are missing
 */

const fs = require('fs');
const path = require('path');

// --- Env validation ---
const REQUIRED_ENV_VARS = ['AI_PROVIDER_BASE_URL', 'AI_PROVIDER_API_KEY', 'AI_PROVIDER_MODEL'];
const missing = REQUIRED_ENV_VARS.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error('========================================');
  console.error('ERROR: Missing required environment variables:');
  missing.forEach(k => console.error(`  - ${k}`));
  console.error('');
  console.error('To run this script, set them temporarily:');
  console.error('');
  console.error('  AI_PROVIDER_BASE_URL="https://api.hunyuan.cloud.tencent.com/v1" \\');
  console.error('  AI_PROVIDER_API_KEY="your_real_key_here" \\');
  console.error('  AI_PROVIDER_MODEL="hunyuan-vision" \\');
  console.error('  node scripts/run_phase4a_recognition_quality_batch.js');
  console.error('');
  console.error('Or export them in your shell:');
  console.error('  export AI_PROVIDER_BASE_URL="https://api.hunyuan.cloud.tencent.com/v1"');
  console.error('  export AI_PROVIDER_API_KEY="your_real_key_here"');
  console.error('  export AI_PROVIDER_MODEL="hunyuan-vision"');
  console.error('========================================');
  process.exit(2);
}

// --- Imports (after env check) ---
const { OpenAICompatibleVisionProvider } = require('../cloudfunctions/recognizeObject/providers/openaiCompatibleVisionProvider');
const { normalize } = require('../cloudfunctions/recognizeObject/providers/normalizeWordResult');

// --- Proprietary name denylist ---
// Uses word-boundary or precise phrase matching to avoid false positives on common words.
// All regexes use word boundaries (\b) or precise phrase tokens.
const PROPRIETARY_PATTERNS = [
  // Cartoon / anime characters — always risky (full name or single word)
  /\bconan\b/i,
  /\bpikachu\b/i,
  /\bmickey\s*mouse\b/i,
  /\bdoraemon\b/i,
  /\bhello\s*kitty\b/i,
  /\bsnoopy\b/i,
  /\bcharlie\s*brown\b/i,
  /\bdetective\s*conan\b/i,
  /\bone\s*piece\b/i,
  /\bnaruto\b/i,
  // Corporate brand names — only risky in product contexts
  /\bstarbucks\b/i,
  /\bnike\b/i,
  /\badidas\b/i,
  /\bapple\s*inc\b/i,
  /\biphone\b/i,
  /\bipad\b/i,
  /\bmacbook\b/i,
  /\bapple\s*(?:watch|pencil|bus|tv|music|pay)\b/i,
  /\bcoca-?cola\b/i,
  /\bpepsi\b/i,
  /\bmcdonald(?:\'s)?\b/i,
  /\bkfc\b/i,
  /\bharry\s*potter\b/i,
  /\bmarvel\b/i,
  /\bdc\s*comics\b/i,
  // Public figures
  /\bcelebrity\b/i,
  /\bpolitician\b/i,
  /\bsports\s*star\b/i
];

// Known common words that are NOT proprietary risks even if they appear in the denylist patterns.
// These are everyday objects/foods that may overlap with brand names.
const COMMON_SAFE_WORDS = new Set([
  'apple', 'pear', 'orange', 'banana', 'grape', 'peach',
  'cup', 'mug', 'glass',
  'book', 'pen', 'pencil',
  'chair', 'desk', 'table', 'lamp',
  'door', 'window', 'floor', 'wall', 'roof',
  'car', 'bus', 'train', 'bike', 'bicycle',
  'flower', 'tree', 'grass', 'leaf',
  'dog', 'cat', 'bird', 'fish',
  'water', 'milk', 'bread', 'rice', 'soup',
  'shoes', 'hat', 'bag',
  'key', 'umbrella', 'phone'
]);

// --- Child-unfriendly content patterns ---
const CHILD_UNFRIENDLY_PATTERNS = [
  /violence|violent/i, /blood|gore/i, /weapon|knife|gun/i,
  /porn|sex|nude/i, /drug|weed|cannabis/i,
  /alcohol|beer|wine/i, /gambling|casino/i,
  /political|propaganda/i, /hate|racist/i,
  /death|kill|murder/i, /curse|swear/i
];

// --- Simple synonym map for expectedMatch ---
const SYNONYM_MAP = {
  'water bottle': ['bottle', 'water bottle', 'plastic bottle'],
  'road sign': ['road sign', 'sign', 'traffic sign'],
  'traffic light': ['traffic light', 'traffic signal', 'stop light'],
  'desk lamp': ['desk lamp', 'lamp', 'table lamp'],
  'street_scene': ['street', 'street scene', 'road'],
  'cartoon_character': ['cartoon character', 'cartoon', 'animated character'],
  'cartoon_illustration': ['cartoon illustration', 'illustration', 'cartoon drawing'],
  'park': ['park', 'garden', 'playground']
};

function isExpectedMatch(actualEn, expectedEn) {
  if (!actualEn || !expectedEn) return false;
  const actual = actualEn.toLowerCase().trim();
  const expected = expectedEn.toLowerCase().trim();

  if (actual === expected) return true;
  if (actual.includes(expected) || expected.includes(actual)) return true;

  const synonyms = SYNONYM_MAP[expected] || [];
  return synonyms.some(s => actual.includes(s.toLowerCase()) || s.toLowerCase().includes(actual));
}

function hasProprietaryRisk(enText, expectedEn) {
  if (!enText) return false;

  // If actualEn exactly matches a known common word and expectedEn is the same,
  // this is a normal object description — NOT a proprietary risk.
  // e.g. actualEn="apple", expectedEn="apple" → fruit, not Apple Inc.
  if (expectedEn) {
    const actual = enText.toLowerCase().trim();
    const expected = expectedEn.toLowerCase().trim();
    if (actual === expected && COMMON_SAFE_WORDS.has(expected)) {
      return false;
    }
  }

  // Word-boundary check: only flag if pattern appears as a distinct word/phrase
  return PROPRIETARY_PATTERNS.some(p => p.test(enText));
}

function isChildFriendly(exampleEn, exampleZh, kidNote) {
  const allText = [exampleEn, exampleZh, kidNote].filter(Boolean).join(' ');
  if (!allText) return true;
  return !CHILD_UNFRIENDLY_PATTERNS.some(p => p.test(allText));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main async function ---
async function main() {
  // --- Paths ---
  const PROJECT_ROOT = path.resolve(__dirname, '..');
  const ASSETS_DIR = path.join(PROJECT_ROOT, 'test-assets', 'phase4a', 'assets');
  const CASES_FILE = path.join(PROJECT_ROOT, 'test-assets', 'phase4a', 'phase4a_cases.json');
  const RESULTS_DIR = path.join(PROJECT_ROOT, 'test-results', 'phase4a');

  // Ensure results dir
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // --- Load test cases ---
  const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  console.log(`Loaded ${cases.length} test cases from ${CASES_FILE}`);

  // --- Initialize provider ---
  const provider = new OpenAICompatibleVisionProvider();

  if (!provider.isConfigured()) {
    console.error('ERROR: OpenAICompatibleVisionProvider is not configured (check env vars)');
    process.exit(2);
  }

  // --- Results storage ---
  const results = [];
  let totalDurationMs = 0;

  // --- Process each case ---
  for (const testCase of cases) {
    const imagePath = path.join(ASSETS_DIR, testCase.filename);

    const record = {
      index: testCase.index,
      filename: testCase.filename,
      category: testCase.category,
      expectedEn: testCase.expectedEn,
      expectedZh: testCase.expectedZh,
      actualEn: null,
      actualZh: null,
      actualJa: null,
      actualKo: null,
      phonetic: null,
      exampleEn: null,
      exampleZh: null,
      kidNote: null,
      confidence: null,
      source: null,
      rawProviderStatus: null,
      providerOk: false,
      fieldComplete: false,
      expectedMatch: false,
      proprietaryNameRisk: false,
      childFriendlyLikely: true,
      errorType: null,
      errorMessageShort: null,
      durationMs: null
    };

    const startTime = Date.now();

    try {
      if (!fs.existsSync(imagePath)) {
        record.errorType = 'file_not_found';
        record.errorMessageShort = `Image not found: ${testCase.filename}`;
        record.durationMs = Date.now() - startTime;
        results.push(record);
        console.warn(`[${testCase.index}/${cases.length}] SKIP: ${testCase.filename} not found`);
        await delay(500);
        continue;
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const { word, rawProvider } = await provider.recognize('', { imageBuffer });
      const normalized = normalize(word, rawProvider);

      record.actualEn = normalized.en;
      record.actualZh = normalized.zh;
      record.actualJa = normalized.ja;
      record.actualKo = normalized.ko;
      record.phonetic = normalized.phonetic;
      record.exampleEn = normalized.exampleEn;
      record.exampleZh = normalized.exampleZh;
      record.kidNote = normalized.kidNote;
      record.confidence = normalized.confidence;
      record.source = normalized.source;

      try {
        const rp = JSON.parse(normalized.rawProvider || '{}');
        record.rawProviderStatus = rp.status || '';
      } catch {
        record.rawProviderStatus = '';
      }

      record.providerOk = true;
      record.durationMs = Date.now() - startTime;
      totalDurationMs += record.durationMs;

      record.fieldComplete = !!(
        normalized.en && normalized.zh && normalized.ja && normalized.ko &&
        normalized.exampleEn && normalized.exampleZh && normalized.kidNote
      );

      record.expectedMatch = isExpectedMatch(normalized.en, testCase.expectedEn);
      record.proprietaryNameRisk = hasProprietaryRisk(normalized.en, testCase.expectedEn);
      record.childFriendlyLikely = isChildFriendly(
        normalized.exampleEn, normalized.exampleZh, normalized.kidNote
      );

      const status = record.providerOk ? 'OK' : 'FAIL';
      const match = record.expectedMatch ? 'MATCH' : 'NOMATCH';
      const risk = record.proprietaryNameRisk ? 'RISK' : 'SAFE';
      console.log(`[${testCase.index}/${cases.length}] ${status} | ${match} | ${risk} | ${testCase.filename} → ${normalized.en} (${normalized.zh})`);

    } catch (err) {
      record.durationMs = Date.now() - startTime;
      record.errorType = err.message.includes('timeout') ? 'timeout' : 'error';
      record.errorMessageShort = (err.message || String(err)).slice(0, 160);
      record.providerOk = false;
      console.error(`[${testCase.index}/${cases.length}] ERROR: ${testCase.filename} → ${err.message.slice(0, 80)}`);
    }

    results.push(record);
    await delay(500);
  }

  // --- Compute statistics ---
  const total = results.length;
  const providerOkCount = results.filter(r => r.providerOk).length;
  const fieldCompleteCount = results.filter(r => r.fieldComplete).length;
  const expectedMatchCount = results.filter(r => r.expectedMatch).length;
  const proprietaryRiskCount = results.filter(r => r.proprietaryNameRisk).length;
  const childFriendlyCount = results.filter(r => r.childFriendlyLikely).length;

  const providerOkRate = total > 0 ? (providerOkCount / total * 100).toFixed(1) : '0.0';
  const fieldCompleteRate = total > 0 ? (fieldCompleteCount / total * 100).toFixed(1) : '0.0';
  const expectedMatchRate = total > 0 ? (expectedMatchCount / total * 100).toFixed(1) : '0.0';
  const childFriendlyRate = total > 0 ? (childFriendlyCount / total * 100).toFixed(1) : '0.0';
  const avgDurationMs = total > 0 ? Math.round(totalDurationMs / total) : 0;

  const failedResults = results.filter(r => !r.providerOk);
  const suspiciousResults = results.filter(r => r.proprietaryNameRisk || !r.childFriendlyLikely);

  // --- Release gate check ---
  const GATES = {
    providerOkRate: parseFloat(providerOkRate) >= 80,
    fieldCompleteRate: parseFloat(fieldCompleteRate) >= 90,
    proprietaryNameRisk: proprietaryRiskCount === 0,
    childFriendlyLikelyRate: parseFloat(childFriendlyRate) >= 95
  };
  const GATE_PASS = Object.values(GATES).every(Boolean);

  // --- Write JSON results ---
  const jsonPath = path.join(RESULTS_DIR, 'recognition_quality_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCases: total,
      providerOkCount,
      fieldCompleteCount,
      expectedMatchCount,
      proprietaryRiskCount,
      childFriendlyCount,
      providerOkRate,
      fieldCompleteRate,
      expectedMatchRate,
      childFriendlyRate,
      avgDurationMs,
      gates: GATES,
      gatePass: GATE_PASS
    },
    results
  }, null, 2));
  console.log(`\nJSON results written to ${jsonPath}`);

  // --- Write CSV results ---
  const csvHeaders = [
    'index', 'filename', 'category', 'expectedEn', 'expectedZh',
    'actualEn', 'actualZh', 'actualJa', 'actualKo',
    'phonetic', 'exampleEn', 'exampleZh', 'kidNote',
    'confidence', 'source', 'rawProviderStatus',
    'providerOk', 'fieldComplete', 'expectedMatch',
    'proprietaryNameRisk', 'childFriendlyLikely',
    'errorType', 'errorMessageShort', 'durationMs'
  ];

  const csvLines = [csvHeaders.join(',')];
  for (const r of results) {
    const row = csvHeaders.map(h => {
      const val = r[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }
      return String(val);
    });
    csvLines.push(row.join(','));
  }

  const csvPath = path.join(RESULTS_DIR, 'recognition_quality_results.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`CSV results written to ${csvPath}`);

  // --- Write Markdown report ---
  const now = new Date().toISOString();
  const mdLines = [
    '# Phase 4A Recognition Quality Auto Test Report',
    '',
    `**Generated:** ${now}`,
    `**Total Cases:** ${total}`,
    `**Passed Cases:** ${providerOkCount}`,
    '',
    '## Summary',
    '',
    '| Metric | Value | Gate |',
    '|--------|------|------|',
    `| Provider OK Rate | ${providerOkRate}% | ${GATES.providerOkRate ? '✅ >= 80%' : '❌ < 80%'} |`,
    `| Field Complete Rate | ${fieldCompleteRate}% | ${GATES.fieldCompleteRate ? '✅ >= 90%' : '❌ < 90%'} |`,
    `| Expected Match Rate | ${expectedMatchRate}% | — |`,
    `| Proprietary Name Risk | ${proprietaryRiskCount} | ${GATES.proprietaryNameRisk ? '✅ = 0' : '❌ > 0'} |`,
    `| Child-Friendly Rate | ${childFriendlyRate}% | ${GATES.childFriendlyLikelyRate ? '✅ >= 95%' : '❌ < 95%'} |`,
    `| Avg Duration | ${avgDurationMs}ms | — |`,
    '',
    `## Release Gate: ${GATE_PASS ? '✅ PASS' : '❌ FAIL'}`,
    '',
    '## Failed Cases',
    ''
  ];

  if (failedResults.length === 0) {
    mdLines.push('None.');
  } else {
    mdLines.push('| index | filename | errorType | errorMessage |');
    mdLines.push('|-------|----------|----------|-------------|');
    for (const r of failedResults) {
      mdLines.push(`| ${r.index} | ${r.filename} | ${r.errorType || ''} | ${r.errorMessageShort || ''} |`);
    }
  }

  mdLines.push('');
  mdLines.push('## Suspicious Cases (proprietary risk or child-unfriendly)');
  mdLines.push('');

  if (suspiciousResults.length === 0) {
    mdLines.push('None.');
  } else {
    mdLines.push('| index | filename | actualEn | proprietaryRisk | childFriendly |');
    mdLines.push('|-------|----------|---------|-----------------|---------------|');
    for (const r of suspiciousResults) {
      mdLines.push(`| ${r.index} | ${r.filename} | ${r.actualEn || ''} | ${r.proprietaryNameRisk ? '⚠️ RISK' : 'OK'} | ${r.childFriendlyLikely ? 'OK' : '⚠️ CHECK'} |`);
    }
  }

  const mdPath = path.join(RESULTS_DIR, 'PHASE_4A_AUTO_TEST_REPORT.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));
  console.log(`Markdown report written to ${mdPath}`);

  console.log('\n========================================');
  console.log(`RESULTS: ${providerOkCount}/${total} passed, ${GATE_PASS ? 'GATE PASS ✅' : 'GATE FAIL ❌'}`);
  console.log('========================================');

  process.exit(GATE_PASS ? 0 : 1);
}

// --- Entry point ---
main().catch((err) => {
  console.error('[Phase4A] Batch test failed:', err && err.message ? err.message : String(err));
  process.exit(1);
});