# v0.1.0 — Initial Open Source Release

**Released:** 2026-05-23

---

## Overview

WarmWords / 拍词贴 is a WeChat Mini Program for parent-child vocabulary learning. Users take or select a photo of an everyday object, use AI vision recognition to identify it, and receive a multilingual vocabulary card with English word, phonetics, example sentence, and child-friendly explanation — plus authentic TTS pronunciation playback.

---

## Highlights

### Core Features
- **AI image recognition** for everyday objects (toys, fruits, animals, household items)
- **Multilingual word cards** — English, Chinese, Japanese, and Korean
- **English example sentence** and child-friendly explanation
- **Tencent Cloud TextToVoice TTS** pronunciation playback with graceful fallback
- **Sticker-book style** saved word cards
- **Simple review flow** for saved cards
- **Temporary image upload and cleanup** workflow

### Cloud Functions
- `recognizeObject` — AI vision recognition with mock/cloud provider switch
- `tts` — Tencent Cloud TextToVoice TTS generation
- `cleanupRecognitionImages` — Scheduled cleanup of old recognition input files (dry-run by default)

### Open Source Security
- **No API keys** in repository
- **No AppSecret** in repository
- **No `project.private.config.json`** in repository
- **No test assets** (personal photos, etc.)
- **No cloud file IDs** in code or documentation
- All credentials managed via WeChat cloud function environment variables

---

## Setup

See `README.md` for detailed instructions:

1. Install [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/download.html)
2. Import project into WeChat Developer Tools
3. Set `appid` in `project.config.json`
4. Enable Cloud Development
5. Deploy cloud functions: `recognizeObject`, `tts`, `cleanupRecognitionImages`
6. Configure cloud function environment variables:
   - `recognizeObject`: `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_PROVIDER_MODEL`
   - `tts`: `TTS_SECRET_ID`, `TTS_SECRET_KEY`, `TTS_REGION`, `TTS_VOICE_TYPE`, `TTS_CODEC`, `TTS_SAMPLE_RATE`
7. Configure Tencent Cloud TTS service and resource pack
8. Run validation scripts

---

## Known Limitations

- **v0.1 is an experimental release** — review before production use
- **AI recognition may be inaccurate** — results are for learning reference only
- **TTS requires Tencent Cloud TTS** service, quota, or resource pack
- **TTS audio cleanup** strategy should be improved in future versions
- Some internal phase documents (`docs/PHASE_3*`, `docs/PHASE_4*`, `docs/PHASE_5*`) may be simplified or reorganized in future releases
- Parent dashboard and multi-child profiles are not yet implemented

---

## What's Next

- v0.2: TTS voice options, mistake book, word card editing, parent dashboard
- v0.3: Offline vocabulary fallback, graded levels, learning statistics
- Future: Printable word cards, theme packs, local/private model exploration

---

## Disclaimer

AI-generated vocabulary cards are for learning reference only. Parents or guardians should accompany children when using the app. WarmWords does not collect personal data from children.