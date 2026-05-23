/**
 * TTS Response Parsing Static Tests
 *
 * Run: node scripts/test_tts_response_parse_static.js
 *
 * Validates that the TTS cloud function correctly parses Tencent Cloud
 * TextToVoice API responses according to the official API specification.
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

const ttsIndex = path.join(PROJECT_ROOT, 'cloudfunctions', 'tts', 'index.js');
const content = fs.readFileSync(ttsIndex, 'utf8');

console.log('=== TTS Response Parsing Checks ===\n');

// 1. Must read from parsed.Response.Audio
check('index.js reads audio from parsed.Response.Audio',
  content.includes('parsed.Response.Audio'),
  'Missing parsed.Response.Audio — audio must come from Response.Audio field');

// 2. Must check for Response.Error (not top-level Error)
check('index.js checks parsed.Response.Error',
  content.includes('parsed.Response.Error') || content.includes('parsed.Response && parsed.Response.Error'),
  'Must check parsed.Response.Error for API-level errors');

// 3. Must reject when Audio is missing or empty
check('index.js handles missing Response.Audio',
  content.includes('provider_audio_missing'),
  'Missing handler for missing Response.Audio');

// 4. Must detect JSON-instead-of-audio
check('index.js detects decoded JSON audio',
  content.includes('audio_decoded_json_not_audio'),
  'Missing audio_decoded_json_not_audio detection for JSON audio payloads');

// 5. Forbidden: Buffer.from(responseBody, "base64")
check('index.js does NOT Buffer.from(responseBody, "base64")',
  !/Buffer\.from\s*\(\s*responseBody\s*,\s*["']base64["']/.test(content),
  'Found forbidden Buffer.from(responseBody, "base64") — must use parsed.Response.Audio');

// 6. Forbidden: audioData = responseBody
check('index.js does NOT assign audioData = responseBody',
  !/audioData\s*=\s*responseBody/.test(content),
  'Found audioData = responseBody — must use parsed.Response.Audio');

// 7. Forbidden: audioData = parsed.Response
check('index.js does NOT assign audioData = parsed.Response',
  !/audioData\s*=\s*parsed\.Response\b/.test(content),
  'Found audioData = parsed.Response — must extract Audio field explicitly');

// 8. Forbidden: audioData = parsed (bare object)
check('index.js does NOT assign audioData = parsed (bare object)',
  !/\baudioData\s*=\s*parsed\b(?!\s*[\.\&])/.test(content),
  'Found audioData = parsed without property access');

// 9. audioData type/length guard
check('index.js guards audioData type and length',
  content.includes("typeof audioData !== 'string'") || content.includes('typeof audioData !== "string"'),
  'Must guard audioData with typeof check');

// 10. First byte JSON detection (7b or 5b)
check('index.js detects JSON magic byte 7b or 5b',
  (content.includes("'7b'") || content.includes('"7b"')) &&
  (content.includes("'5b'") || content.includes('"5b"')) ||
  content.includes('firstByteHex') || content.includes('audioBuffer[0]'),
  'Must check first byte hex for JSON magic (7b={ or 5b=[)');

// 11. Binary audio fallback when JSON parse fails
check('index.js falls back to binary audio on JSON parse failure',
  /catch[\s\S]{0,120}resolve\s*\(\s*\{[\s\S]{0,60}audioBuffer[\s\S]{0,60}body/.test(content),
  'When JSON parse fails, should treat raw body as binary audio');

// 12. AUDIO_DECODED_JSON provider code
check('index.js returns AUDIO_DECODED_JSON code',
  content.includes('AUDIO_DECODED_JSON'),
  'Missing AUDIO_DECODED_JSON provider code');

// 13. No console.log of audioData (allowed: audioData.length)
check('index.js does NOT log audioData (except .length)',
  !/console\.log[^;]*\baudioData\b(?!\s*\.length)/.test(content),
  'Found console.log with audioData');

// 14. Success condition: audioLooksLikeMp3 or audioLooksLikeWav
check('index.js checks audioLooksLikeMp3 or audioLooksLikeWav',
  content.includes('audioLooksLikeMp3') || content.includes('audioLooksLikeWav'),
  'Must validate audio looks like MP3 or WAV before upload');

// 15. Minimum byte threshold
check('index.js enforces minimum audio byte threshold',
  /audioBuffer\.length\s*<\s*\d+/.test(content),
  'Must check audioBuffer.length against minimum threshold');

// 16. AUDIO_MISSING provider code
check('index.js returns AUDIO_MISSING code',
  content.includes('AUDIO_MISSING'),
  'Missing AUDIO_MISSING provider code');

// --- Summary ---
const passed = checks.filter(c => c.pass).length;
const failed = checks.filter(c => !c.pass).length;
console.log(`\n--- Summary: ${passed}/${passed + failed} passed ---`);
if (failed > 0) {
  console.log('\nFailed checks:');
  checks.filter(c => !c.pass).forEach(c => {
    console.log(`  ❌ ${c.name}`);
    if (c.detail) console.log(`     ${c.detail}`);
  });
  process.exit(1);
}

process.exit(0);