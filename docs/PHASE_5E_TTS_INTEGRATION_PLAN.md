# Phase 5E 真实 TTS 接入方案

**日期：** 2026-05-23
**目标：** 为 v0.1 增加真实英文单词发音能力

---

## 架构

```
result 页面
  → audio.play(word.en, "en")
    → wx.cloud.callFunction({ name: "tts", data: { text, lang } })
      → tts 云函数
        → 腾讯云 TextToVoice REST API (HMAC-SHA1 签名)
        → 音频 buffer
        → cloud.uploadFile → tts-audio/YYYYMMDD/<random>.mp3
        → 返回 { ok, mode, audioFileID, codec, text, message }
    → wx.cloud.getTempFileURL(audioFileID)
    → wx.createInnerAudioContext().src = tempFileURL
    → audio.play()
```

---

## 安全边界

| 约束 | 状态 |
|------|------|
| SecretId / SecretKey 仅存于云函数环境变量 | ✅ |
| 前端不保存任何 TTS 密钥 | ✅ |
| 云函数不打印凭证、base64、audio buffer | ✅ |
| 失败自动 fallback 到发音提示 modal | ✅ |
| 文本长度 1–80 字符白名单验证 | ✅ |
| TTS 云函数无额外 npm 依赖（使用 native https） | ✅ |

---

## 环境变量

部署 tts 云函数时在**云开发控制台 → 环境 → 函数配置**中添加：

| 变量 | 值 | 说明 |
|------|---|------|
| `TTS_SECRET_ID` | `your_secret_id` | 腾讯云 SecretId |
| `TTS_SECRET_KEY` | `your_secret_key` | 腾讯云 SecretKey |
| `TTS_REGION` | `ap-guangzhou` | 地域（默认广州） |
| `TTS_VOICE_TYPE` | `101001` | 英文发音人（101001=en-US） |
| `TTS_CODEC` | `mp3` | 音频格式 |
| `TTS_SAMPLE_RATE` | `16000` | 采样率 |

**voice type 参考：**
- 101001：English (US) — 儿童友好，清晰
- 101002：English (UK)
- 100001：中文（大陆）
- 100005：日语
- 100006：韩语

---

## v0.1 范围

- ✅ 仅支持英文单词/短语（ASCII 字母、数字、空格、`'-,.`）
- ✅ 文本长度 1–80 字符
- ✅ 不支持多语言 TTS（前端根据 currentLang 调用，但 v0.1 主要用 en）
- ✅ 不做长期音频缓存策略
- ✅ 失败 fallback 到"和孩子一起慢慢读一遍"modal

---

## 日志记录规则

**允许记录：**
- text length
- lang
- audio bytes length
- upload success/failure
- session ID（不含凭证）

**禁止记录：**
- SecretId / SecretKey
- Authorization header
- 完整 base64
- 完整 audio buffer
- 完整 audioFileID

---

## 测试方法

### 1. 不配置密钥（当前状态）
```
点击"听一听发音" → TTS 云函数返回 fallback=true → 显示"发音提示"弹窗
```
预期：✅ 显示"发音"modal，内容为 word + "可以和孩子一起慢慢读一遍哦 😊"

### 2. 配置密钥并部署 tts 云函数
```
点击"听一听发音" → 正在准备发音 toast → 真实音频播放
```
预期：✅ 可听到 apple 发音，无技术错误弹窗

### 3. 云函数日志审计（部署后必查）
```bash
# 在云开发控制台云函数日志中搜索以下内容，应为空
SecretId
SecretKey
base64
audioBuffer
console.log(完整 fileID)
```

---

## 失败 fallback 说明

| 失败场景 | 用户看到 | 技术日志 |
|----------|----------|----------|
| 环境变量未配置 | "发音" modal（孩子读一遍） | `[TTS] Not configured, returning fallback` |
| TTS API 调用失败 | "发音暂时不可用" modal | `[TTS] Cloud TTS failed: ...message` |
| 云存储上传失败 | "发音暂时不可用" modal | `[TTS] Uploaded fileID_length=...` |
| getTempFileURL 失败 | "发音暂时不可用" modal | `[Audio] Play error, fallback to hint` |

---

## 音频清理策略（未来版本）

v0.1 暂不配置 TTS 音频清理，理由：
- TTS 音频量级小（每次最多 80 字符 mp3 ≈ 10–30KB）
- `tts-audio/` 路径隔离，不会与识别图片混淆
- 可在 v0.2 按需增加 `cleanup-tts-audio` 定时任务

---

## 静态测试

```bash
node scripts/test_tts_integration_static.js
```

检查项：
- tts/index.js 读取 `TTS_SECRET_ID/SECRET_KEY`（非 `TENCENTCLOUD_` 前缀）
- tts/index.js 不包含真实凭证
- tts/index.js 不打印 base64/audio buffer
- tts/index.js 上传至 `tts-audio/` 路径
- audio.js 调用 `wx.cloud.callFunction({ name: 'tts' })`
- audio.js 使用 `wx.createInnerAudioContext`
- result.wxml 仍有"听一听发音"按钮
---

## 微信云函数环境变量保留前缀

微信云函数（SCF）不允许环境变量 Key 使用以下前缀（会报 `InvalidParameterValue.Environment` 错误）：
- `SCF_`
- `QCLOUD_`
- `TENCENTCLOUD_`

因此 **不能** 使用 `TENCENTCLOUD_SECRET_ID` / `TENCENTCLOUD_SECRET_KEY`。实际配置应使用：

| 变量 | 说明 |
|------|------|
| `TTS_SECRET_ID` | 腾讯云 SecretId |
| `TTS_SECRET_KEY` | 腾讯云 SecretKey |

配置后 TTS 云函数将自动启用真实语音合成；未配置时返回安全的 fallback modal，message=`tts_provider_not_configured`。
