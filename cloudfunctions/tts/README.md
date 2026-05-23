# TTS 云函数

## 功能

将英文单词/短语转为语音 mp3 文件，上传到云存储并返回 `cloudFileID`，前端通过临时 URL 播放。

**v0.1 支持模式：**
- `mode: "audio"` — 真实 TTS 音频（腾讯云 TextToVoice）
- `mode: "fallback"` — 文字提示（`wx.showToast`），当未配置凭证或 TTS 调用失败时触发

---

## 安全原则

- **SecretId / SecretKey 只存在于云函数环境变量**，绝不写入前端代码
- 不打印凭证
- 不打印音频 base64
- 文本长度限制 1–80 字符
- 不接受 HTML 或特殊脚本内容
- 环境变量缺失时返回安全的 `fallback` JSON，不暴露技术细节

---

## 腾讯云 TTS 配置

### 1. 开通服务

腾讯云控制台 → 语音合成（Text-to-Speech）→ 开通服务

### 2. 创建密钥

腾讯云控制台 → 访问密钥 → 创建 SecretId + SecretKey

### 3. 云函数环境变量

在微信开发者工具 → 云开发控制台 → 环境 → 函数配置 中添加：

| 变量 | 值 | 说明 |
|------|---|------|
| `TTS_SECRET_ID` | `your_secret_id` | 腾讯云 SecretId |
| `TTS_SECRET_KEY` | `your_secret_key` | 腾讯云 SecretKey |
| `TTS_REGION` | `ap-guangzhou` | 地域（默认广州） |
| `TTS_VOICE_TYPE` | `101001` | 英文发音人，101001=en-US |
| `TTS_CODEC` | `mp3` | 音频格式 |
| `TTS_SAMPLE_RATE` | `16000` | 采样率 |

**注意：** 微信云函数环境变量不允许使用 `SCF_` / `QCLOUD_` / `TENCENTCLOUD_` 前缀（会报错 `InvalidParameterValue.Environment`），因此变量名使用 `TTS_SECRET_ID` / `TTS_SECRET_KEY`，而非 `TENCENTCLOUD_SECRET_ID`。

**voice type 参考：**
- 101001：English (US) — 儿童友好，清晰
- 101002：English (UK)
- 100001：中文（大陆）
- 100002：中文（广东话）
- 100005：日语
- 100006：韩语

---

## 云函数部署

```bash
cd cloudfunctions/tts
npm install
# 在微信开发者工具中上传并部署
```

**注意：** `wx-server-sdk` 由微信云开发平台自动提供，无需上传 `node_modules`。

---

## 前端调用

```javascript
const audio = require('../../utils/audio.js');

audio.play('apple', 'en').then(() => {
  console.log('Playback done');
}).catch(err => {
  console.warn('Play failed:', err.message);
});
```

---

## 返回格式

### 成功音频
```json
{
  "ok": true,
  "mode": "audio",
  "audioFileID": "cloud://env/tts/xxx.mp3",
  "message": "success"
}
```

### Fallback
```json
{
  "ok": true,
  "mode": "fallback",
  "audioFileID": "",
  "message": "tts_not_configured"
}
```

### 错误
```json
{
  "ok": false,
  "mode": "fallback",
  "message": "invalid_characters"
}
```

---

## 音频存储策略

- 路径：`tts/tts_${timestamp}_${word}.mp3`
- 权限：仅云函数可写，前端通过临时 URL 播放（有效期约 10 分钟）
- 建议后续加定时清理（参考 cleanupRecognitionImages 定时任务模式）
- v0.1 先观察 TTS 使用量再决定是否加清理