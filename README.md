# WarmWords Mini Program（拍词贴）

**A WeChat Mini Program for parent-child vocabulary learning with AI vision recognition, multilingual flashcards, and TTS pronunciation.**

[English](#english) | [中文](#中文)

---

## English

### What is WarmWords?

WarmWords (拍词贴) is a WeChat Mini Program designed for parents and young children (ages 3–8) to learn everyday English vocabulary together. Take a photo of any object, and the AI will identify it and generate a beautiful multilingual flashcard — complete with English word, phonetic pronunciation, example sentence, and authentic TTS audio.

### Features

- **AI Vision Recognition** — Identify objects from photos (children's items, toys, fruits, animals, etc.)
- **Multilingual Flashcards** — English, Chinese, Japanese, and Korean word cards with phonetics
- **Example Sentences** — Age-appropriate English sentences for each word
- **Child-Friendly Prompts** — Encouraging, simple language throughout
- **Real TTS Pronunciation** — Authentic English pronunciation via Tencent Cloud TTS
- **Graceful Fallback** — If TTS or network is unavailable, shows a friendly pronunciation hint modal
- **Temporary Image Cleanup** — Photos are deleted from cloud storage after recognition
- **Scheduled Cloud Cleanup** — Dry-run cleanup job cleans up old recognition input files
- **Privacy & Safety** — No personal data collection; AI disclaimer displayed on results page

### Architecture

**Recognition Flow:**
```
WeChat Mini Program
  → wx.cloud.uploadFile()
  → recognizeObject cloud function
  → AI Vision Provider
  → normalized word card
  → result page / sticker book / review page
```

**Pronunciation Flow:**
```
Result page "🔊 Listen" button
  → tts cloud function
  → Tencent Cloud TextToVoice API
  → cloud storage (tts-audio/)
  → getTempFileURL()
  → InnerAudioContext playback
```

**Cloud Storage Cleanup:**
```
recognition-inputs/   ← immediate delete after recognition
cleanupRecognitionImages/   ← scheduled dry-run cleanup job
```

### Directory Structure

```
warmwords-miniprogram/
├── miniprogram/                    # WeChat Mini Program frontend
│   ├── pages/
│   │   └── result/                 # Result page (flashcard display)
│   ├── components/                 # Reusable components
│   └── utils/
│       ├── audio.js               # TTS playback + fallback
│       ├── cloudImage.js          # Cloud image upload + delete
│       ├── mockVision.js          # Local mock for offline dev
│       └── storage.js             # Sticker book storage
├── cloudfunctions/
│   ├── recognizeObject/           # AI vision recognition cloud function
│   ├── tts/                        # Tencent Cloud TTS cloud function
│   └── cleanupRecognitionImages/  # Scheduled cleanup cloud function
├── scripts/                        # Local validation & test scripts
│   ├── validate_structure.js       # Project structure checks
│   ├── audit_miniprogram_static.js # Security audit
│   ├── test_tts_integration_static.js
│   ├── test_tts_response_parse_static.js
│   └── test_provider_readiness.js
└── docs/                           # Architecture & design docs
    ├── AI_PROVIDER_INTEGRATION.md
    ├── PRIVACY.md
    ├── PHASE_5E_TTS_INTEGRATION_PLAN.md
    ├── WECHAT_RELEASE_PRECHECKLIST.md
    └── VERSION_0_1_SUBMISSION_PACKAGE.md
```

### Quick Start

#### Prerequisites

- [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/download.html)
- WeChat account with Mini Program capability
- Node.js ≥ 16 (for local scripts)

#### 1. Clone the repository

```bash
git clone https://github.com/conanxin/warmwords-miniprogram.git
cd warmwords-miniprogram
```

#### 2. Open in WeChat Developer Tools

1. Open WeChat Developer Tools
2. Click "Import Project"
3. Select the project root directory
4. Set AppID in `project.config.json` (or create a new project)
5. Enable Cloud Development in the project settings

#### 3. Deploy cloud functions

In WeChat Developer Tools → Cloud Development:

```bash
# Upload each cloud function
Right-click cloudfunctions/recognizeObject → "Upload Cloud Function"
Right-click cloudfunctions/tts → "Upload Cloud Function"
Right-click cloudfunctions/cleanupRecognitionImages → "Upload Cloud Function"
```

#### 4. Configure environment variables

**recognizeObject cloud function env vars:**
- `AI_PROVIDER_BASE_URL` — Your vision API endpoint
- `AI_PROVIDER_API_KEY` — Your vision API key
- `AI_PROVIDER_MODEL` — Vision model name

**tts cloud function env vars:**
- `TTS_SECRET_ID` — Tencent Cloud SecretId
- `TTS_SECRET_KEY` — Tencent Cloud SecretKey
- `TTS_REGION` — Region (default: `ap-guangzhou`)
- `TTS_VOICE_TYPE` — Voice type (default: `101001`)
- `TTS_CODEC` — Audio codec (default: `mp3`)
- `TTS_SAMPLE_RATE` — Sample rate (default: `16000`)

> **Note:** WeChat cloud functions do NOT support `QCLOUD_`, `SCF_`, or `TENCENTCLOUD_` environment variable prefixes. Use the plain names (e.g., `TTS_SECRET_ID`) as shown above.

#### 5. Configure AI Vision Provider

See `docs/AI_PROVIDER_INTEGRATION.md` for detailed setup instructions.

#### 6. Configure Tencent Cloud TTS

1. Go to [Tencent Cloud Console → TTS](https://console.tencentcloud.com/tts)
2. Enable Text-to-Speech service
3. Go to [CAM Console](https://console.tencentcloud.com/cam/cam-overview) → Users → Create Sub-user
4. Grant `QcloudTTSFullAccess` policy
5. Create an access key (SecretId + SecretKey)
6. Configure in tts cloud function environment variables
7. Check your resource pack / billing settings

#### 7. Run local validation

```bash
node scripts/validate_structure.js
node scripts/audit_miniprogram_static.js
find miniprogram cloudfunctions scripts -name "*.js" -type f -print0 | xargs -0 -n1 node -c
node scripts/test_tts_integration_static.js
node scripts/test_tts_response_parse_static.js
```

### Privacy & Safety

- **No sensitive data collection** — WarmWords does not collect children's names, school, home address, or ID numbers
- **Photos used only for recognition** — Images are deleted from cloud storage after processing
- **AI disclaimer** — Results page clearly states AI recognition may be inaccurate
- **No API keys stored in frontend** — All credentials are in cloud function environment variables
- **Recommended** — Parents should accompany children during use
- **Do NOT commit real secrets to GitHub** — Use `.env.example` as a template

### Testing

```bash
# Structure validation
node scripts/validate_structure.js

# Security audit
node scripts/audit_miniprogram_static.js

# Provider readiness check (needs network)
node scripts/test_provider_readiness.js

# TTS integration tests
node scripts/test_tts_integration_static.js
node scripts/test_tts_response_parse_static.js

# Syntax check all JS files
find miniprogram cloudfunctions scripts -name "*.js" -type f -print0 | xargs -0 -n1 node -c
```

### Roadmap

**v0.1 (current)** — Core release
- Photo recognition with AI flashcard generation
- Multilingual word cards (EN/ZH/JA/KO)
- TTS pronunciation
- Sticker book (save & review)
- Temporary image cleanup

**v0.2** — Enhanced experience
- TTS audio cleanup job (scheduled deletion of old tts-audio/ files)
- Multiple TTS voice options
- Mistake book (review missed words)
- Word card editing
- Parent dashboard

**v0.3** — Expanded learning
- Offline vocabulary fallback
- Graded vocabulary levels
- Learning statistics
- Export word cards
- Multi-child profiles (privacy-aware design required)

**Future ideas**
- Notebook / printable flashcard export
- Theme packs
- Multi-modal story generation from word cards
- Local model / private deployment exploration

### License

MIT License — see [LICENSE](./LICENSE)

---

## 中文

### 项目简介

拍词贴（WarmWords）是一款面向亲子英语启蒙的微信小程序。拍照即可识别日常物品，生成中英日韩多语言词卡，支持真人发音，适合 3–8 岁儿童和家长一起学习。

### 主要功能

- AI 图像识别 — 识别照片中的物品（儿童用品、玩具、水果、动物等）
- 多语言词卡 — 英文单词、音标、例句，中日韩语参考翻译
- 儿童友好提示 — 简洁鼓励的语言
- 真实 TTS 发音 — 腾讯云语音合成
- 离线友好 — 无网络/TTS 不可用时显示"跟孩子一起读"的友好提示
- 临时图片清理 — 识别后删除云存储临时文件
- 定时清理任务 — 自动清理过期识别文件
- 隐私保护 — 不采集敏感个人信息

### 技术架构

识别流程：小程序 → `wx.cloud.uploadFile()` → `recognizeObject` 云函数 → AI 视觉 API → 词卡结果

发音流程：结果页"听发音" → `tts` 云函数 → 腾讯云 TextToVoice → 云存储 → `InnerAudioContext` 播放

清理流程：`recognition-inputs/` 临时图片即时删除 + 定时 `cleanupRecognitionImages` 任务

详细架构见 `docs/ARCHITECTURE.md`。

### 快速开始

1. 用微信开发者工具导入项目根目录
2. 配置 `project.config.json` 中的 AppID
3. 部署云函数 `recognizeObject` / `tts` / `cleanupRecognitionImages`
4. 配置各云函数环境变量（见上方英文版步骤 4）
5. 运行本地验证脚本（见上方英文版 Testing 部分）

### License

MIT License — see [LICENSE](./LICENSE)

### Disclaimer

AI 识别和翻译结果仅供参考，可能存在误差，建议家长陪同使用。