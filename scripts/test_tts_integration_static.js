/**
 * TTS Integration Static Tests
 *
 * Run: node scripts/test_tts_integration_static.js
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
const audioJs = path.join(PROJECT_ROOT, 'miniprogram', 'utils', 'audio.js');
const resultJs = path.join(PROJECT_ROOT, 'miniprogram', 'pages', 'result', 'result.js');
const resultWxml = path.join(PROJECT_ROOT, 'miniprogram', 'pages', 'result', 'result.wxml');
const ttsPlan = path.join(PROJECT_ROOT, 'docs', 'PHASE_5E_TTS_INTEGRATION_PLAN.md');

check('tts/index.js exists', fs.existsSync(ttsIndex));
check('audio.js exists', fs.existsSync(audioJs));
check('result.js exists', fs.existsSync(resultJs));
check('result.wxml exists', fs.existsSync(resultWxml));
check('PHASE_5E_TTS_INTEGRATION_PLAN.md exists', fs.existsSync(ttsPlan));

if (fs.existsSync(ttsIndex)) {
  const content = fs.readFileSync(ttsIndex, 'utf8');

  // Credential env vars
  check('tts/index.js reads process.env.TTS_SECRET_ID',
    content.includes('process.env.TTS_SECRET_ID'),
    'Missing process.env.TTS_SECRET_ID');

  check('tts/index.js reads process.env.TTS_SECRET_KEY',
    content.includes('process.env.TTS_SECRET_KEY'),
    'Missing process.env.TTS_SECRET_KEY');

  check('tts/index.js declares secretId variable',
    /\bconst\s+secretId\b|\blet\s+secretId\b/.test(content),
    'Missing const/let secretId');

  check('tts/index.js declares secretKey variable',
    /\bconst\s+secretKey\b|\blet\s+secretKey\b/.test(content),
    'Missing const/let secretKey');

  check('tts/index.js does NOT use TENCENTCLOUD_SECRET_ID',
    !content.includes('TENCENTCLOUD_SECRET_ID'),
    'Found TENCENTCLOUD_SECRET_ID (reserved prefix)');

  check('tts/index.js does NOT use TENCENTCLOUD_SECRET_KEY',
    !content.includes('TENCENTCLOUD_SECRET_KEY'),
    'Found TENCENTCLOUD_SECRET_KEY (reserved prefix)');

  // Security: no hardcoded credentials
  check('tts/index.js does NOT console.log secretId',
    !/console\.log.*\bsecretId\b/.test(content),
    'Found console.log with secretId');

  check('tts/index.js does NOT console.log secretKey',
    !/console\.log.*\bsecretKey\b/.test(content),
    'Found console.log with secretKey');

  // Phase 5E-1g: deployment marker
  check('tts/index.js has TTS_DIAGNOSTIC_VERSION constant',
    content.includes('TTS_DIAGNOSTIC_VERSION'),
    'Missing TTS_DIAGNOSTIC_VERSION constant');

  check('tts/index.js diagnosticVersion is phase5e-1k-tc3-fixed',
    content.includes('phase5e-1k-tc3-fixed'),
    'Missing phase5e-1k-tc3-fixed marker');

  check('tts/index.js has audioMagicHex in code',
    content.includes('audioMagicHex'),
    'Missing audioMagicHex in debug output');

  check('tts/index.js uses tts.tencentcloudapi.com',
    content.includes('tts.tencentcloudapi.com'),
    'Missing tts.tencentcloudapi.com host');

  check('tts/index.js uses TextToVoice action',
    content.includes('TextToVoice'),
    'Missing TextToVoice action');

  check('tts/index.js uses 2019-08-23 version',
    content.includes('2019-08-23'),
    'Missing 2019-08-23 version');

  check('tts/index.js uses TTS_PATH constant',
    content.includes('const TTS_PATH'),
    'Missing TTS_PATH constant');

  check('tts/index.js does NOT use tts.cloud.tencent.com',
    !content.includes('tts.cloud.tencent.com'),
    'Found forbidden tts.cloud.tencent.com host');

  check('tts/index.js does NOT use path: "/TextToVoice"',
    !/path[\s:]*['"]\/TextToVoice/.test(content),
    'Found forbidden path /TextToVoice');

  check('tts/index.js does NOT use Action: "TextToSpeech"',
    !/Action[\s:]*['"]TextToSpeech/.test(content),
    'Found forbidden Action TextToSpeech');

  check('tts/index.js uses POST method',
    content.includes('method') && content.includes('POST'),
    'Missing POST method for API 3.0');

  check('tts/index.js uses TC3-HMAC-SHA256 signing',
    content.includes('TC3-HMAC-SHA256') || content.includes('TC3'),
    'Missing TC3 signing');

  // Phase 5E-1j: TC3 credential scope
  check('tts/index.js defines TTS_SERVICE constant',
    content.includes('const TTS_SERVICE') || content.includes('TTS_SERVICE ='),
    'Missing TTS_SERVICE constant');

  check('tts/index.js credentialScope uses TTS_SERVICE',
    content.includes('const credentialScope') &&
    content.includes('TTS_SERVICE') &&
    /credentialScope[\s\S]{0,80}\/tc3_request/.test(content),
    'credentialScope must use TTS_SERVICE, not region');

  check('tts/index.js Authorization uses Credential=secretId/credentialScope',
    content.includes('Credential=${secretId}/${credentialScope}') ||
    /Credential=.*secretId.*credentialScope/.test(content),
    'Authorization must use Credential=${secretId}/${credentialScope}');

  check('tts/index.js does NOT use credentialScope without service',
    !/credentialScope[^;{]*tc3_request/.test(content) || content.includes('TTS_SERVICE'),
    'credentialScope must include service name');

  // Phase 5E-1g: deployment marker checks
  check('tts/index.js returns diagnosticVersion in fallback',
    content.includes('diagnosticVersion: TTS_DIAGNOSTIC_VERSION'),
    'Missing diagnosticVersion in fallback response');

  check('tts/index.js AUDIO_TOO_SMALL branch includes debug',
    /audio_too_small[\s\S]{0,200}debug|debug[\s\S]{0,200}audio_too_small/.test(content),
    'AUDIO_TOO_SMALL fallback missing debug object');

  // Phase 5E-1h: response parsing correctness
  check('tts/index.js reads audio from parsed.Response.Audio',
    content.includes('parsed.Response.Audio'),
    'Missing parsed.Response.Audio — must read from Response.Audio field');

  check('tts/index.js checks parsed.Response.Error',
    content.includes('parsed.Response.Error'),
    'Must check parsed.Response.Error for API-level errors');

  check('tts/index.js handles provider_audio_missing',
    content.includes('provider_audio_missing'),
    'Missing provider_audio_missing for missing Response.Audio');

  check('tts/index.js detects audio_decoded_json_not_audio',
    content.includes('audio_decoded_json_not_audio'),
    'Missing audio_decoded_json_not_audio detection');

  check('tts/index.js does NOT Buffer.from(responseBody, "base64")',
    !/Buffer\.from\s*\(\s*responseBody\s*,\s*["']base64["']/.test(content),
    'Found forbidden Buffer.from(responseBody, "base64")');

  check('tts/index.js does NOT assign audioData = responseBody',
    !/audioData\s*=\s*responseBody/.test(content),
    'Found audioData = responseBody');

  check('tts/index.js does NOT assign audioData = parsed (bare object)',
    !/\baudioData\s*=\s*parsed\b(?!\s*[\.\&])/.test(content),
    'Found audioData = parsed without Response property access');

  check('tts/index.js does NOT console.log audioData (full value)',
    !/console\.log[^;]*\baudioData\b(?!\s*\.length)/.test(content),
    'Found console.log with audioData');

  // Additional safety checks
  check('tts/index.js does NOT console.log audioFileID (full value)',
    !/console\.log[^;]*\baudioFileID\b(?!\s*\.length)/.test(content),
    'Found console.log with audioFileID');

  check('tts/index.js returns fallback when not configured',
    content.includes('tts_provider_not_configured') || content.includes('fallback'),
    'Missing safe fallback for unconfigured state');

  check('tts/index.js has MAX_TEXT_LEN limit',
    content.includes('MAX_TEXT_LEN'),
    'Missing text length limit');

  check('tts/index.js uploads to tts-audio/ cloud path',
    content.includes('tts-audio'),
    'Missing cloud storage upload path for audio');

  check('tts/index.js calls cloud.uploadFile',
    content.includes('cloud.uploadFile'),
    'Missing cloud.uploadFile call');
}

if (fs.existsSync(audioJs)) {
  const content = fs.readFileSync(audioJs, 'utf8');

  check('audio.js calls wx.cloud.callFunction for tts',
    content.includes("name: 'tts'") || content.includes('"tts"'),
    'Missing tts cloud function call');

  check('audio.js uses wx.createInnerAudioContext',
    content.includes('wx.createInnerAudioContext'),
    'Missing InnerAudioContext for playback');

  check('audio.js handles fallback mode',
    content.includes('fallback') || content.includes('Fallback'),
    'Missing fallback handling');

  check('audio.js does NOT print audioFileID full value',
    !/console\.log.*audioFileID/.test(content),
    'Found console.log with audioFileID');

  check('audio.js does NOT print error stack',
    !/console\.error/.test(content),
    'Found console.error (may leak stack)');
}

if (fs.existsSync(resultJs)) {
  const content = fs.readFileSync(resultJs, 'utf8');

  check('result.js calls audio.play for playPronunciation',
    content.includes('audio.play') || content.includes('audio.js'),
    'playPronunciation should call audio.play');
}

if (fs.existsSync(resultWxml)) {
  const content = fs.readFileSync(resultWxml, 'utf8');

  check('result.wxml has "听一听发音" button',
    content.includes('听一听发音'),
    'Missing listen pronunciation button');
}

console.log('\n--- Summary ---');
const passed = checks.filter(c => c.pass).length;
const total = checks.length;
console.log(`${passed}/${total} checks passed`);
if (passed < total) {
  const failed = checks.filter(c => !c.pass);
  failed.forEach(f => {
    console.error(`  ❌ ${f.name}${f.detail ? ' → ' + f.detail : ''}`);
  });
}
process.exit(passed === total ? 0 : 1);