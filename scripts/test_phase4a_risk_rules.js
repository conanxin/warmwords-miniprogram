/**
 * Phase 4A Risk Rules Unit Tests
 *
 * Tests proprietary risk detection logic for common false positives.
 * Run: node scripts/test_phase4a_risk_rules.js
 */

const PROJECT_ROOT = require('path').resolve(__dirname, '..');

// --- Inline copy of PROPRIETARY_PATTERNS and COMMON_SAFE_WORDS ---
// (mirrors run_phase4a_recognition_quality_batch.js)
const PROPRIETARY_PATTERNS = [
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
  /\bmcdonald(?:'s)?\b/i,
  /\bkfc\b/i,
  /\bharry\s*potter\b/i,
  /\bmarvel\b/i,
  /\bdc\s*comics\b/i,
  /\bcelebrity\b/i,
  /\bpolitician\b/i,
  /\bsports\s*star\b/i
];

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

function hasProprietaryRisk(enText, expectedEn) {
  if (!enText) return false;
  if (expectedEn) {
    const actual = enText.toLowerCase().trim();
    const expected = expectedEn.toLowerCase().trim();
    if (actual === expected && COMMON_SAFE_WORDS.has(expected)) {
      return false;
    }
  }
  return PROPRIETARY_PATTERNS.some(p => p.test(enText));
}

// --- Tests ---
const tests = [
  // ✅ should NOT trigger risk
  { en: 'apple',       expected: 'apple',       want: false, label: 'apple fruit (expected match)' },
  { en: 'Apple',       expected: 'apple',       want: false, label: 'Apple fruit (case diff, expected match)' },
  { en: 'cartoon character', expected: 'cartoon character', want: false, label: 'cartoon character generic' },
  { en: 'girl',        expected: 'girl',        want: false, label: 'girl' },
  { en: 'person',      expected: 'person',      want: false, label: 'person' },
  { en: 'shoes',       expected: 'shoes',       want: false, label: 'shoes' },
  { en: 'Shoes',       expected: 'shoes',       want: false, label: 'Shoes (capitalized, expected match)' },
  { en: 'cup',         expected: 'cup',         want: false, label: 'cup' },
  { en: 'dog',         expected: 'dog',         want: false, label: 'dog' },
  { en: 'flower',      expected: 'flower',       want: false, label: 'flower' },
  { en: 'book',        expected: 'book',        want: false, label: 'book' },
  { en: 'pear',        expected: 'pear',       want: false, label: 'pear fruit' },
  { en: 'orange',      expected: 'orange',      want: false, label: 'orange fruit' },
  { en: 'banana',      expected: 'banana',      want: false, label: 'banana' },
  { en: 'water bottle', expected: 'water bottle', want: false, label: 'water bottle' },

  // ❌ SHOULD trigger risk
  { en: 'detective conan',  expected: null,     want: true,  label: 'detective conan (character)' },
  { en: 'Conan',            expected: null,       want: true,  label: 'Conan (character, no expectedEn)' },
  { en: 'pikachu',          expected: null,       want: true,  label: 'pikachu (character)' },
  { en: 'Mickey Mouse',     expected: null,       want: true,  label: 'Mickey Mouse' },
  { en: 'mickey mouse',    expected: null,        want: true,  label: 'mickey mouse lowercase' },
  { en: 'Doraemon',         expected: null,        want: true,  label: 'Doraemon' },
  { en: 'doraemon',         expected: null,        want: true,  label: 'doraemon lowercase' },
  { en: 'iphone',           expected: null,         want: true,  label: 'iphone' },
  { en: 'iPhone',           expected: null,         want: true,  label: 'iPhone mixed case' },
  { en: 'ipad',             expected: null,         want: true,  label: 'ipad' },
  { en: 'macbook',          expected: null,         want: true,  label: 'macbook' },
  { en: 'Apple Inc.',       expected: null,         want: true,  label: 'Apple Inc. (brand context)' },
  { en: 'APPLE INC',        expected: null,         want: true,  label: 'APPLE INC uppercase' },
  { en: 'Nike shoes',        expected: null,        want: true,  label: 'Nike shoes (brand)' },
  { en: 'nike',             expected: null,           want: true,  label: 'nike standalone' },
  { en: 'adidas',           expected: null,           want: true,  label: 'adidas' },
  { en: 'starbucks',        expected: null,           want: true,  label: 'starbucks' },
  { en: 'coca-cola',        expected: null,           want: true,  label: 'coca-cola' },
  { en: 'Coca-Cola',        expected: null,           want: true,  label: 'Coca-Cola mixed case' },
  { en: 'harry potter',     expected: null,           want: true,  label: 'harry potter character' },
  { en: 'marvel',           expected: null,             want: true,  label: 'marvel' },
  { en: 'celebrity',        expected: null,             want: true,  label: 'celebrity word' },
  { en: 'politician',       expected: null,             want: true,  label: 'politician word' },

  // ⚠️ edge cases — apple with unexpected expectedEn or mismatch
  { en: 'Apple',       expected: null,           want: false, label: 'Apple without expectedEn (case-only flag, no context)' },
];

let passed = 0;
let failed = 0;

console.log('=== Phase 4A Risk Rules Tests ===\n');

for (const t of tests) {
  const got = hasProprietaryRisk(t.en, t.expected);
  const ok = got === t.want;
  if (ok) {
    passed++;
    console.log(`✅ ${t.label}`);
    console.log(`   en=${t.en} expected=${t.expected} → risk=${got}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${t.label}`);
    console.log(`   en=${t.en} expected=${t.expected} → got risk=${got}, want risk=${t.want}`);
  }
}

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}