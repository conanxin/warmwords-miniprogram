# Development Handoff Guide

## 目标

说明如何在另一台机器上从 GitHub clone 项目并继续开发。

## 克隆仓库

```bash
git clone https://github.com/conanxin/warmwords-miniprogram.git
cd warmwords-miniprogram
```

## 用微信开发者工具打开

- 打开微信开发者工具
- 导入项目根目录
- 修改 project.config.json 中 appid 为自己的小程序 AppID
- 不要提交 project.private.config.json

## 云开发环境

需要创建或绑定自己的云开发环境。

需要部署云函数：
- recognizeObject
- tts
- cleanupRecognitionImages

## 环境变量

### recognizeObject

- ENABLED_CLOUD_RECOGNITION=true
- AI_PROVIDER_BASE_URL
- AI_PROVIDER_API_KEY
- AI_PROVIDER_MODEL

### tts

- TTS_SECRET_ID
- TTS_SECRET_KEY
- TTS_REGION=ap-guangzhou
- TTS_VOICE_TYPE=101001
- TTS_CODEC=mp3
- TTS_SAMPLE_RATE=16000

说明：
不要使用 TENCENTCLOUD_ / QCLOUD_ / SCF_ 前缀。

**重要提醒：**
- `.env.example` 包含所有所需环境变量名（占位符），clone 后可参考此文件配置真实值
- 新机器开发时不要把真实 key 复制到仓库
- 真实值应配置到微信云函数环境变量（Cloud Development → Environment Variables）

## 数据库集合

需要创建：
- recognition_uploads

用途：
- 跟踪临时图片清理状态

## 云存储目录

运行时会使用：
- recognition-inputs/
- tts-audio/

## 定时触发器

cleanupRecognitionImages 使用 config.json 配置：
- cleanup-recognition-images-dryrun
- cron: 0 0 */6 * * * *
- 默认 dryRun=true

## 本地验证

```bash
node scripts/validate_structure.js
node scripts/audit_miniprogram_static.js
node scripts/test_tts_integration_static.js
node scripts/test_tts_response_parse_static.js
find miniprogram cloudfunctions scripts -name "*.js" -type f -print0 | xargs -0 -n1 node -c
```

## 不要提交

- project.private.config.json
- .env / .env.*
- SecretId / SecretKey
- API Key
- backups/
- test-results/
- test-assets/
- cloud:// 文件 ID
- audioFileID / cloudFileID

## 新机器开发建议流程

1. clone GitHub 仓库
2. 导入微信开发者工具
3. 配置 AppID
4. 开通云开发
5. 创建 recognition_uploads 集合
6. 部署 recognizeObject
7. 部署 tts
8. 部署 cleanupRecognitionImages
9. 配置环境变量
10. 运行云端测试
11. 上传体验版真机验证