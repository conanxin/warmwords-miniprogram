/**
 * 云函数：tts — 文本转语音
 *
 * 功能：将英文单词/短语转为语音 mp3，写入云存储并返回 fileID。
 *
 * 安全约束：
 * - SecretId / SecretKey 仅存于云函数环境变量，不写入前端
 * - 不打印凭证、base64、完整 audio buffer、完整 audioFileID
 * - 文本长度 1–80，白名单验证
 * - 失败返回结构化诊断字段，不泄露敏感信息
 *
 * 事件参数：
 *   { text: string, lang?: string }
 *
 * 返回结构（成功）：
 *   { ok: true, mode: "audio", fallback: false, audioFileID, codec, text, message: "success", stage: "done", reason: "tts_success", diagnosticVersion }
 *
 * 返回结构（失败）：
 *   { ok: false, mode: "fallback", fallback: true, audioFileID: "", codec, text, message, stage, reason, providerCode, providerMessageShort, diagnosticVersion, debug? }
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// --- Config ---
const MAX_TEXT_LEN = 80;
const DEFAULT_VOICE_TYPE = Number(process.env.TTS_VOICE_TYPE) || 101001;
const TTS_CODEC = process.env.TTS_CODEC || 'mp3';
const TTS_SAMPLE_RATE = Number(process.env.TTS_SAMPLE_RATE) || 16000;
const TTS_DIAGNOSTIC_VERSION = 'phase5e-1k-tc3-fixed';

// Tencent Cloud API 3.0 — fixed constants
const TTS_HOST = 'tts.tencentcloudapi.com';
const TTS_ACTION = 'TextToVoice';
const TTS_VERSION = '2019-08-23';
const TTS_PATH = '/';
const TTS_REGION = process.env.TTS_REGION || 'ap-guangzhou';
const TTS_SERVICE = 'tts';

// Safe ASCII-only text for v0.1 English words/phrases
const SAFE_TEXT_RE = /^[a-zA-Z0-9\s\-',\.]+$/;

// Max length for providerMessageShort in fallback response
const MAX_MSG_LEN = 180;

// --- Crypto helpers (TC3-SHA256) ---
function sha256Hex(message) {
  // Returns lowercase hex string of SHA256(message)
  return require('crypto')
    .createHash('sha256')
    .update(message, 'utf8')
    .digest('hex');
}

function hmacSha256(key, message) {
  // key: Buffer or string; message: string; returns Buffer
  return require('crypto')
    .createHmac('sha256', key)
    .update(message, 'utf8')
    .digest();
}

function getUTCDate(timestampSec) {
  // Derive YYYY-MM-DD from Unix timestamp in seconds (UTC)
  return new Date(timestampSec * 1000).toISOString().slice(0, 10);
}

/**
 * Build a safe fallback response.
 * Never includes secretId, secretKey, base64, or full audioFileID.
 * Always includes diagnosticVersion.
 */
function makeFallback({ text, message, stage, reason, providerCode, providerMessageShort, debug }) {
  const result = {
    ok: false,
    mode: 'fallback',
    fallback: true,
    audioFileID: '',
    codec: TTS_CODEC,
    text: text || '',
    message,
    stage: stage || 'unknown',
    reason: reason || 'unknown',
    providerCode: providerCode || '',
    providerMessageShort: (providerMessageShort || '').slice(0, MAX_MSG_LEN),
    diagnosticVersion: TTS_DIAGNOSTIC_VERSION
  };
  if (debug) {
    result.debug = debug;
  }
  return result;
}

/**
 * Build a safe success response.
 */
function makeSuccess({ audioFileID, text }) {
  return {
    ok: true,
    mode: 'audio',
    fallback: false,
    audioFileID,
    codec: TTS_CODEC,
    text,
    message: 'success',
    stage: 'done',
    reason: 'tts_success',
    diagnosticVersion: TTS_DIAGNOSTIC_VERSION
  };
}

/**
 * Truncate a string for logging, filtering sensitive values.
 */
function safeMsg(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/secretId[=:][^\s,}]+/gi, '***').replace(/signature[=:][^\s,}]+/gi, '***').slice(0, MAX_MSG_LEN);
}

/**
 * Build a debug snapshot of the audio buffer.
 * Only uses first 8 bytes for magic hex — never the full buffer.
 */
function makeAudioDebug(audioBuffer) {
  if (!audioBuffer || audioBuffer.length === 0) return null;
  const first8 = audioBuffer.slice(0, 8);
  const magicHex = first8.toString('hex');
  const starts = (prefix) => magicHex.startsWith(prefix);
  return {
    audioBytes: audioBuffer.length,
    audioMagicHex: magicHex,
    audioLooksLikeMp3: starts('494433') || starts('fffb') || starts('fff3') || starts('fff2'),
    audioLooksLikeWav: starts('52494646'),
    audioLooksLikeJson: starts('7b') || starts('5b')
  };
}

/**
 * Build API debug info (excludes secrets).
 */
function makeApiDebug() {
  return {
    host: TTS_HOST,
    action: TTS_ACTION,
    version: TTS_VERSION,
    region: TTS_REGION,
    path: TTS_PATH,
    service: TTS_SERVICE,
    credentialScopeShape: 'date/service/tc3_request'
  };
}

// --- Tencent Cloud TTS via native HTTPS + TC3 HMAC-SHA256 signing ---
async function callTencentTTS(text, voiceType, secretId, secretKey) {
  const https = require('https');

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).slice(2, 10);
  const sessionId = `tts_${timestamp}_${nonce}`;

  // --- Build request body (single source of truth for payload) ---
  const requestBody = {
    Text: text,
    SessionId: sessionId,
    VoiceType: voiceType,
    Codec: TTS_CODEC,
    SampleRate: TTS_SAMPLE_RATE,
    Speed: 0,
    Volume: 0
  };
  const payload = JSON.stringify(requestBody);

  // --- Derive UTC date from timestamp ---
  const date = getUTCDate(timestamp);  // YYYY-MM-DD in UTC

  // --- TC3 Step 1: Build Canonical Request ---
  const httpRequestMethod = 'POST';
  const canonicalUri = TTS_PATH;
  const canonicalQueryString = '';
  const contentType = 'application/json; charset=utf-8';
  // Canonical headers: lowercase keys, values trimmed, always end with \n
  const canonicalHeaders = `content-type:${contentType}\nhost:${TTS_HOST}\n`;
  const signedHeaders = 'content-type;host';
  const hashedRequestPayload = sha256Hex(payload);

  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n');

  // --- TC3 Step 2: Build String to Sign ---
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${TTS_SERVICE}/tc3_request`;
  const hashedCanonicalRequest = sha256Hex(canonicalRequest);

  const stringToSign = [
    algorithm,
    String(timestamp),
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  // --- TC3 Step 3: Compute Signature ---
  // kSecretKey = "TC3" + SecretKey (string, UTF-8)
  const kSecret = Buffer.from(`TC3${secretKey}`, 'utf8');
  // kDate = HMAC(kSecret, date)
  const kDate = hmacSha256(kSecret, date);
  // kService = HMAC(kDate, service)
  const kService = hmacSha256(kDate, TTS_SERVICE);
  // kSigning = HMAC(kService, "tc3_request")
  const kSigning = hmacSha256(kService, 'tc3_request');
  // signature = HMAC(kSigning, stringToSign)
  const signature = hmacSha256(kSigning, stringToSign).toString('hex');

  // --- Build Authorization header ---
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    'Host': TTS_HOST,
    'Content-Type': contentType,
    'X-TC-Action': TTS_ACTION,
    'X-TC-Version': TTS_VERSION,
    'X-TC-Region': TTS_REGION,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Algorithm': algorithm,
    'Authorization': authorization,
    'Content-Length': Buffer.byteLength(payload)
  };

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TTS_HOST,
      port: 443,
      path: TTS_PATH,
      method: httpRequestMethod,
      headers
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);

        // Non-200 HTTP status
        if (res.statusCode !== 200) {
          const shortMsg = safeMsg(body.toString());
          const err = new Error(`TTS HTTP ${res.statusCode}: ${shortMsg}`);
          err.stage = 'tencent_tts_request';
          err.reason = 'provider_http_error';
          err.providerCode = String(res.statusCode);
          err.providerMessageShort = shortMsg;
          err.debug = makeApiDebug();
          reject(err);
          return;
        }

        // Parse JSON response: {"Response": {"Audio": "<base64>", ...}}
        let parsed;
        try {
          parsed = JSON.parse(body.toString());
        } catch {
          // Not JSON — treat raw body as binary audio
          if (body.length > 0) {
            resolve({ audioBuffer: body, sessionId });
          } else {
            const err = new Error('Empty response body from TTS API');
            err.stage = 'tencent_tts_response';
            err.reason = 'provider_audio_missing';
            err.providerCode = 'AUDIO_MISSING';
            err.providerMessageShort = 'Empty audio from TTS provider';
            reject(err);
          }
          return;
        }

        // Check for API-level error inside Response
        if (parsed && parsed.Response && parsed.Response.Error) {
          const e = parsed.Response.Error;
          const shortMsg = safeMsg(e.Message || JSON.stringify(e));
          const err = new Error(`TTS API Error: ${shortMsg}`);
          err.stage = 'tencent_tts_response';
          err.reason = 'provider_error';
          err.providerCode = String(e.Code || res.statusCode);
          err.providerMessageShort = shortMsg;
          err.debug = makeApiDebug();
          reject(err);
          return;
        }

        // Extract Audio field — the base64-encoded audio binary
        const audioData = parsed && parsed.Response && parsed.Response.Audio;
        if (typeof audioData !== 'string' || audioData.length === 0) {
          const err = new Error('Tencent response did not include Response.Audio');
          err.stage = 'tencent_tts_response';
          err.reason = 'provider_audio_missing';
          err.providerCode = 'AUDIO_MISSING';
          err.providerMessageShort = 'Tencent response did not include Response.Audio';
          err.debug = makeApiDebug();
          reject(err);
          return;
        }

        const audioBuffer = Buffer.from(audioData, 'base64');

        // If decoded buffer looks like JSON, the API returned JSON instead of audio
        const firstByteHex = audioBuffer.length > 0 ? audioBuffer[0].toString(16) : '';
        if (firstByteHex === '7b' || firstByteHex === '5b') {
          const err = new Error('Decoded Audio looks like JSON, response parsing is likely wrong');
          err.stage = 'tencent_tts_response';
          err.reason = 'audio_decoded_json_not_audio';
          err.providerCode = 'AUDIO_DECODED_JSON';
          err.providerMessageShort = 'Decoded Audio looks like JSON, response parsing is likely wrong';
          err.debug = makeAudioDebug(audioBuffer);
          reject(err);
          return;
        }

        resolve({ audioBuffer, sessionId });
      });
    });

    req.on('error', (err) => {
      err.stage = 'tencent_tts_request';
      err.reason = 'provider_network_error';
      err.providerCode = 'NETWORK_ERROR';
      err.providerMessageShort = safeMsg(err.message);
      err.debug = makeApiDebug();
      reject(err);
    });

    req.setTimeout(15000, () => {
      const err = new Error('TTS API timeout');
      err.stage = 'tencent_tts_request';
      err.reason = 'provider_timeout';
      err.providerCode = 'TIMEOUT';
      err.providerMessageShort = 'TTS API timeout after 15s';
      req.destroy();
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Upload audio buffer to WeChat cloud storage.
 * Path: tts-audio/YYYYMMDD/<random>.mp3
 */
async function uploadToCloudStorage(audioBuffer) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');  // YYYYMMDD
  const randomHex = Math.random().toString(36).slice(2, 10);
  const cloudPath = `tts-audio/${dateStr}/${randomHex}.mp3`;

  try {
    const result = await cloud.uploadFile({
      cloudPath,
      fileContent: audioBuffer
    });
    return result.fileID;
  } catch (err) {
    const error = new Error('Cloud storage upload failed');
    error.stage = 'upload_audio';
    error.reason = 'upload_audio_failed';
    error.providerCode = 'UPLOAD_FAILED';
    error.providerMessageShort = safeMsg(err.message || 'upload error');
    throw error;
  }
}

// --- Main handler ---
exports.main = async (event, context) => {
  const { text, lang = 'en' } = event;

  // --- Input validation ---
  if (!text || typeof text !== 'string') {
    return makeFallback({ message: 'missing_text', stage: 'input_validate', reason: 'missing_text' });
  }

  const safeText = text.trim();

  if (safeText.length === 0 || safeText.length > MAX_TEXT_LEN) {
    return makeFallback({
      text: safeText,
      message: `text_length_out_of_range_${MAX_TEXT_LEN}`,
      stage: 'input_validate',
      reason: 'text_length_invalid'
    });
  }

  if (!SAFE_TEXT_RE.test(safeText)) {
    return makeFallback({ text: safeText, message: 'invalid_characters', stage: 'input_validate', reason: 'invalid_characters' });
  }

  console.log(`[TTS] Request text="${safeText}" length=${safeText.length} lang=${lang}`);

  // --- Read credentials at handler level ---
  const secretId = process.env.TTS_SECRET_ID;
  const secretKey = process.env.TTS_SECRET_KEY;

  if (!secretId || !secretKey || !secretId.trim() || !secretKey.trim()) {
    console.log('[TTS] Provider not configured (TTS_SECRET_ID/SECRET_KEY missing), returning fallback');
    return makeFallback({
      text: safeText,
      message: 'tts_provider_not_configured',
      stage: 'env_check',
      reason: 'tts_provider_not_configured'
    });
  }

  // --- Real TTS call ---
  let audioBuffer;
  let sessionId;

  try {
    const result = await callTencentTTS(safeText, DEFAULT_VOICE_TYPE, secretId, secretKey);
    audioBuffer = result.audioBuffer;
    sessionId = result.sessionId;
    console.log(`[TTS] audio_bytes=${audioBuffer.length} session=${sessionId}`);
  } catch (err) {
    console.warn(`[TTS] TTS provider error: stage=${err.stage} reason=${err.reason} code=${err.providerCode}`);
    return makeFallback({
      text: safeText,
      message: err.message || 'tts_error_fallback',
      stage: err.stage || 'unknown',
      reason: err.reason || 'unknown',
      providerCode: err.providerCode || '',
      providerMessageShort: err.providerMessageShort || '',
      debug: err.debug || null
    });
  }

  // --- Validate audio buffer ---
  if (!audioBuffer || audioBuffer.length === 0) {
    return makeFallback({
      text: safeText,
      message: 'tts_error_fallback',
      stage: 'tencent_tts_response',
      reason: 'provider_audio_missing',
      providerCode: 'AUDIO_MISSING',
      providerMessageShort: 'Empty audio buffer from provider'
    });
  }

  if (audioBuffer.length > 1024 * 1024) {
    return makeFallback({
      text: safeText,
      message: 'tts_error_fallback',
      stage: 'tencent_tts_response',
      reason: 'audio_too_large',
      providerCode: 'AUDIO_TOO_LARGE',
      providerMessageShort: 'Audio exceeds 1MB limit'
    });
  }

  if (audioBuffer.length < 256) {
    return makeFallback({
      text: safeText,
      message: 'tts_error_fallback',
      stage: 'tencent_tts_response',
      reason: 'audio_too_small',
      providerCode: 'AUDIO_TOO_SMALL',
      providerMessageShort: 'Audio too small or empty',
      debug: makeAudioDebug(audioBuffer)
    });
  }

  // --- Upload to cloud storage ---
  let audioFileID;
  try {
    audioFileID = await uploadToCloudStorage(audioBuffer);
    console.log(`[TTS] Uploaded fileID_length=${audioFileID.length}`);
  } catch (err) {
    console.warn(`[TTS] Upload failed: stage=${err.stage} reason=${err.reason}`);
    return makeFallback({
      text: safeText,
      message: err.message || 'tts_error_fallback',
      stage: err.stage || 'upload_audio',
      reason: err.reason || 'upload_audio_failed',
      providerCode: err.providerCode || 'UPLOAD_FAILED',
      providerMessageShort: err.providerMessageShort || ''
    });
  }

  // --- Success ---
  return makeSuccess({ audioFileID, text: safeText });
};