# Phase 5E TTS 诊断文档

**日期：** 2026-05-23
**问题：** 云端 TTS 云函数部署后调用报错 `ReferenceError: secretId is not defined`

---

## 问题现象

用户在云开发控制台测试 TTS 云函数，event 为：
```json
{ "text": "cat", "lang": "en", "wordId": "test-cat" }
```

云端返回：
```
errorCode: -1
errorMessage: User code exception caught
statusCode: 430
stackTrace: ReferenceError: secretId is not defined
at exports.main (/var/user/index.js:158:3)
```

---

## 根因分析

Phase 5E-1a 将环境变量从 `TENCENTCLOUD_SECRET_ID/SECRET_KEY` 改为 `TTS_SECRET_ID/SECRET_KEY`，
但在 `cloudfunctions/tts/index.js` 第 158 行，`secretId` 和 `secretKey` 仍在 `callTencentTTS()`
内部读取（作为参数），而主 handler 中没有定义这两个变量。

伪代码问题：
```javascript
// callTencentTTS 内部读取 secretId
async function callTencentTTS(text, voiceType) {
  const secretId = process.env.TTS_SECRET_ID;  // ← 这里的 secretId
  ...
}

// handler 中直接使用 secretId 但未定义
exports.main = async (event, context) => {
  ...
  if (!secretId || !secretKey || ...) {  // ← ReferenceError: secretId not defined
    ...
  }
}
```

`secretId` 在 `callTencentTTS` 内部是局部变量，但 handler 级别的第 158 行直接引用了它，
而 Phase 5E-1a 没有在 handler 级别定义它。

---

## 修复方案

在 `exports.main` handler 开头（console.log 之后）添加：
```javascript
const secretId = process.env.TTS_SECRET_ID;
const secretKey = process.env.TTS_SECRET_KEY;
```

确保：
1. `secretId` / `secretKey` 在 handler 级别定义
2. 所有签名、鉴权逻辑不再依赖闭包捕获的局部变量
3. 缺失凭证时返回安全的 fallback JSON，不抛 ReferenceError

---

## 修复后行为

| 场景 | 用户看到 | 技术日志 |
|------|----------|----------|
| 凭证缺失 | fallback modal | `[TTS] Provider not configured (TTS_SECRET_ID/SECRET_KEY missing), returning fallback` |
| 凭证存在 | 真实音频播放 | `[TTS] Request text="cat" length=3 lang=en` + audio_bytes |
| TTS API 失败 | fallback modal | `[TTS] Cloud TTS failed: ...message` |

---

## 预防措施

新增静态测试 `scripts/test_tts_integration_static.js` 检查项：
- `process.env.TTS_SECRET_ID` 必须在 index.js 中出现
- `process.env.TTS_SECRET_KEY` 必须在 index.js 中出现
- `secretId` 变量必须被声明（`const secretId` 或 `let secretId`）
- `secretKey` 变量必须被声明
- 禁止出现 `TENCENTCLOUD_SECRET_ID` / `TENCENTCLOUD_SECRET_KEY`
- 禁止 `console.log secretId` / `console.log secretKey` / `console.log audioData` / `console.log audioFileID`
---

## Phase 5E-1d 更新（2026-05-23）

**问题：** 云端 TTS 返回 `tts_error_fallback`，缺少诊断字段，无法判断是鉴权/签名/参数/响应解析/上传哪一步失败。

**修复：** 所有 fallback 返回统一结构化字段：

```json
{
  "ok": false,
  "mode": "fallback",
  "fallback": true,
  "audioFileID": "",
  "codec": "mp3",
  "text": "cat",
  "message": "...",
  "stage": "env_check|input_validate|tencent_tts_request|tencent_tts_response|upload_audio|unknown",
  "reason": "tts_provider_not_configured|provider_http_error|provider_error|provider_audio_missing|upload_audio_failed|...",
  "providerCode": "400|403|AUDIO_MISSING|UPLOAD_FAILED|...",
  "providerMessageShort": "..." // 最多 180 字符，已过滤 secretId/signature
}
```

**stage 说明：**

| stage | 说明 |
|-------|------|
| `env_check` | 凭证未配置 |
| `input_validate` | 输入校验失败（空文本/超长/非法字符） |
| `tencent_tts_request` | HTTP 请求发送失败（网络错误/超时） |
| `tencent_tts_response` | HTTP 200 但响应异常（Error JSON / 空 audio） |
| `upload_audio` | 云存储上传失败 |
| `unknown` | 其他 |

**reason 说明：**

| reason | 说明 |
|--------|------|
| `tts_provider_not_configured` | TTS_SECRET_ID / TTS_SECRET_KEY 未配置 |
| `provider_http_error` | 非 200 HTTP 状态码 |
| `provider_error` | TTS API 返回 Error JSON |
| `provider_audio_missing` | HTTP 200 但 audio body 为空 |
| `audio_too_large` | audio > 1MB |
| `audio_too_small` | audio < 1000 bytes |
| `upload_audio_failed` | cloud.uploadFile 失败 |
| `provider_timeout` | 15s 超时 |
| `provider_network_error` | 网络错误 |

**providerMessageShort 安全过滤：**
- 移除 `secretId=xxx` / `signature=xxx` 等敏感片段
- 最多 180 字符

**下一步排查：**
1. 用户在云开发控制台重新测试 TTS
2. 查看返回的 `stage` / `reason` / `providerCode` / `providerMessageShort`
3. 对照上表定位问题

---

## Phase 5E-1g — Deployment Marker and Audio Debug Fields

**问题：** 云端 TTS fallback 返回没有 `diagnosticVersion`，无法确认云端是否运行最新代码。

**修复：** 所有 TTS 返回（含 fallback）均包含 `diagnosticVersion: "phase5e-1g-audio-debug"`。

**新增 debug 字段（仅在 AUDIO_TOO_SMALL 时出现）：**

```json
{
  "debug": {
    "audioBytes": 42,
    "audioMagicHex": "3c21444f43545950",
    "audioLooksLikeMp3": false,
    "audioLooksLikeWav": false,
    "audioLooksLikeJson": true
  }
}
```

`audioMagicHex` 为前 8 bytes 的 hex 字符串，用于判断实际返回的 payload 类型：
- `494433` → 可能是 MP3 文件头（ID3）
- `52494646` → WAV (RIFF)
- `7b` → JSON 对象（`{`）
- `5b` → JSON 数组（`[`）

**验证云端是否运行最新代码：**
1. 云开发控制台 → tts 云函数 → 测试
2. event: `{"text":"apple","lang":"en"}`
3. 检查返回是否包含 `"diagnosticVersion": "phase5e-1g-audio-debug"`
4. 如果没有 diagnosticVersion，说明云函数没有成功重新部署

**AUDIO_TOO_SMALL 返回 debug 示例：**
```json
{
  "ok": false,
  "mode": "fallback",
  "fallback": true,
  "audioFileID": "",
  "codec": "mp3",
  "text": "apple",
  "message": "tts_error_fallback",
  "stage": "tencent_tts_response",
  "reason": "audio_too_small",
  "providerCode": "AUDIO_TOO_SMALL",
  "providerMessageShort": "Audio too small or empty",
  "diagnosticVersion": "phase5e-1g-audio-debug",
  "debug": {
    "audioBytes": 42,
    "audioMagicHex": "7b2265727222...",
    "audioLooksLikeMp3": false,
    "audioLooksLikeWav": false,
    "audioLooksLikeJson": true
  }
}
```

如果 `audioLooksLikeJson: true`，说明 TTS API 返回了 JSON 错误响应而非音频数据，需要检查 providerMessageShort 中的 API 错误信息。

---

## Phase 5E-1h — Response Parsing Fix

**问题：** `audioMagicHex=7b22526573706f6e` → `{"Respon"...` 说明 TTS API 返回了 JSON 而不是音频。当前代码把整个 HTTP body 当作 binary audio 处理，但没有从 JSON 的 `Response.Audio` 字段提取 base64。

**腾讯云 TextToVoice API 正确响应结构：**
```json
{
  "Response": {
    "Audio": "<base64-encoded audio>",
    "RequestId": "..."
  }
}
```

**错误响应结构（需要识别）：**
```json
{
  "Response": {
    "Error": {
      "Code": "InvalidParameterValue",
      "Message": "..."
    }
  }
}
```

**修复策略：**
1. JSON parse HTTP body
2. 检查 `parsed.Response.Error` → 存在则返回 `provider_error`
3. 从 `parsed.Response.Audio` 提取 base64
4. 若 Audio 缺失 → `provider_audio_missing`
5. 若解码后 first byte 是 `7b`(`{`) 或 `5b`(`[`) → `audio_decoded_json_not_audio`
6. JSON parse 失败 → 将 raw body 当作 binary audio 回退（兼容旧实现）

**禁止的模式：**
- `Buffer.from(responseBody, "base64")` — 整段 body 当 audio
- `audioData = responseBody` — 直接赋值
- `audioData = parsed` — 整个对象当 audio
- `audioData = parsed.Response` — 缺少 Audio 字段

**云端验证步骤：**
1. 重新部署 tts 云函数
2. 云开发控制台测试：`{"text":"apple","lang":"en"}`
3. 检查返回是否含 `"diagnosticVersion": "phase5e-1g-audio-debug"`
4. 若 `reason: "audio_decoded_json_not_audio"` → TTS API 凭证/签名问题，检查 `providerMessageShort`
5. 若 `reason: "provider_error"` → API 返回了错误，查看 `providerCode` 和 `providerMessageShort`

---

## Phase 5E-1i — Fix Tencent TextToVoice Request Format (TC3 Signing)

**问题：** `providerCode=InvalidParameter, providerMessageShort=Not Found` — 请求已到腾讯云，但 API 3.0 格式/签名错误。

**根因：** 旧代码使用 HMAC-SHA1 GET 请求（query string + sign 参数），但腾讯云 API 3.0 需要 TC3-HMAC-SHA256 + POST JSON body。

**修复内容：**
- **Host:** `tts.tencentcloudapi.com`（原 `tts.cloud.tencent.com`）
- **Path:** `/`（原 `/stream?...`）
- **Method:** `POST`（原 `GET`）
- **Body:** JSON payload（含 Text, SessionId, VoiceType, Codec, SampleRate, Speed, Volume）
- **签名:** TC3-HMAC-SHA256，canonical request 结构：
  ```
  POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:tts.tencentcloudapi.com\n\ncontent-type;host\n<sha256(payload)>
  ```
- **Headers:** `X-TC-Action`, `X-TC-Version`, `X-TC-Region`, `X-TC-Timestamp`, `Authorization`

**移除的不确定参数：** ModelType, PrimaryLanguage, ProjectId（先用最小参数集合）

**新增诊断字段：** `makeApiDebug()` 返回 `{host, action, version, region, path}`，不含任何 secret。

**云端验证：** 重新部署后测试 `{"text":"apple","lang":"en"}`，检查 `diagnosticVersion: "phase5e-1h-tc3-sign"`。

---

## Phase 5E-1j AuthFailure.InvalidAuthorization — Credential Scope Fix

**问题：** `Credential scope size not valid` — Authorization header 中 Credential scope 缺少 service 段。

**根因：** `credentialScope = ${date}/${TTS_REGION}/tts/tc3_request` — 把 region 当作 service，但 TTS 的 service 是 `tts`，不是 region。

**修复：** `credentialScope = ${date}/${TTS_SERVICE}/tc3_request`，其中 `TTS_SERVICE = 'tts'`。

**Credential scope 格式：**
```
date/service/tc3_request
```
对于 TTS: `2026-05-23/tts/tc3_request`

**Authorization header 格式：**
```
TC3-HMAC-SHA256 Credential=<secretId>/<date>/<service>/tc3_request, SignedHeaders=content-type;host, Signature=<sig>
```

**新增常量：**
- `const TTS_SERVICE = 'tts'`
- `makeApiDebug()` 新增 `service: TTS_SERVICE` 和 `credentialScopeShape: 'date/service/tc3_request'`

**云端验证：** 重新部署后测试 `{"text":"apple","lang":"en"}`，检查 `diagnosticVersion: "phase5e-1h-tc3-sign"` 且无 AuthFailure。

---

## Phase 5E-1k — Fix TC3 Signature Mismatch

**症状：** `AuthFailure.SignatureFailure` — 腾讯云返回"provided credentials could not be validated. Please check your signature is correct."

**根因分析：** TC3 签名流程中多处实现细节错误：
1. `canonicalRequestHash` 用单独 `crypto.createHash()` 而非复用 `sha256Hex()` helper
2. canonical request 字符串拼接顺序/分隔符不一致
3. `hmacSha256` 第 1 步 `TC3${secretKey}` 应为 `Buffer.from("TC3"+secretKey, "utf8")` 而非直接字符串
4. 缺少独立的 `sha256Hex()` / `hmacSha256()` / `getUTCDate()` helpers

**Phase 5E-1k 修复要点：**

1. **独立的 crypto helpers：**
   - `sha256Hex(message)` → 返回 lowercase hex string
   - `hmacSha256(key, message)` → key 为 Buffer/string，返回 Buffer（最终 signature 才调用 `.toString('hex')`）
   - `getUTCDate(timestampSec)` → 从 Unix timestamp 秒数返回 UTC YYYY-MM-DD

2. **payload 一次性生成并复用：**
   ```js
   const payload = JSON.stringify(requestBody); // 单次 stringify
   // 签名用: sha256Hex(payload)
   // 发送用: req.write(payload)
   ```

3. **canonical request 标准拼接：**
   ```js
   const canonicalRequest = [
     httpRequestMethod,      // "POST"
     canonicalUri,           // "/"
     canonicalQueryString,   // ""
     canonicalHeaders,      // "content-type:...\nhost:...\n"
     signedHeaders,          // "content-type;host"
     hashedRequestPayload    // sha256Hex(payload)
   ].join('\n');
   ```

4. **signing key 每一步都是 Buffer：**
   ```
   kSecret   = Buffer.from("TC3"+secretKey, 'utf8')
   kDate     = hmacSha256(kSecret, date)         // date: YYYY-MM-DD UTC string
   kService  = hmacSha256(kDate, TTS_SERVICE)   // "tts"
   kSigning  = hmacSha256(kService, 'tc3_request')
   signature = hmacSha256(kSigning, stringToSign).toString('hex')
   ```

5. **date 来自 timestamp（UTC）：**
   ```js
   const timestamp = Math.floor(Date.now() / 1000);
   const date = getUTCDate(timestamp); // "2026-05-23" in UTC
   ```

**云端验证：** 部署后测试 `{"text":"apple","lang":"en"}`，检查：
- `ok: true` 且 `audioFileID` 非空
- `diagnosticVersion: "phase5e-1k-tc3-fixed"`
- 无 `AuthFailure.SignatureFailure`

---

## Phase 5E-1l UnsupportedOperation.PkgExhausted

**错误：**
```json
{
  "providerCode": "UnsupportedOperation.PkgExhausted",
  "providerMessageShort": "The resource pack allowance has been exhausted, please check your resource pack."
}
```

**判断：**
TTS 代码链路已进入腾讯云服务侧，当前阻塞为资源包额度耗尽或未配置可用计费方式。这是账户/计费层问题，不是代码问题。

**处理：**
用户需进入腾讯云语音合成控制台检查资源包、免费额度或后付费状态。恢复额度后无需改代码，重新云端测试 `{"text":"apple","lang":"en"}` 即可。

**恢复后验证步骤：**
1. 腾讯云控制台 → 语音合成 → 检查资源包状态
2. 如有免费额度或新资源包 → 重新部署 tts 云函数
3. 云开发控制台测试 `{"text":"apple","lang":"en"}`
4. 检查 `ok: true` 且 `audioFileID` 非空
