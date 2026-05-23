# 架构文档 - 拍词贴

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    微信小程序（前端）                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  首页   │  │ 结果页  │  │ 贴纸书  │  │  复习   │        │
│  │ (拍照)  │→ │(词汇卡) │  │ (收藏)  │  │ (记忆)  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│  ┌────┴────────────┴────────────┴────────────┴────┐         │
│  │              本地存储（Storage）                 │         │
│  │   warmwords_library | warmwords_review_log     │         │
│  └─────────────────────────────────────────────────┘         │
└──────────────────────┬──────────────────────────────────────┘
                       │ wx.cloud.callFunction
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 微信云开发（云函数）                           │
│  ┌──────────────────────┐  ┌─────────────────────┐         │
│  │  recognizeObject     │  │       tts           │         │
│  │  (图片识别)           │  │    (语音合成)         │         │
│  └──────────┬───────────┘  └──────────┬──────────┘         │
└─────────────┼─────────────────────────┼──────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│     多模态 AI 服务       │  │      TTS 服务           │
│  (GPT-4V / Claude 等)   │  │  (Azure / 腾讯云 TTS)   │
└─────────────────────────┘  └─────────────────────────┘
```

## 2. 数据结构

### 2.1 词汇对象（Word Object）
```typescript
interface Word {
  // 识别结果
  id: string;              // 唯一标识（来源+时间戳）
  zh: string;              // 中文名
  en: string;              // 英文名
  ja: string;              // 日文名
  ko: string;              // 韩文名
  phonetic: string;        // 英文音标
  exampleEn: string;       // 英文例句
  exampleZh: string;       // 中文解释
  kidNote: string;         // 儿童友好注释
  confidence: number;      // 置信度 0-1
  soundHint: string;       // 音频文件名提示
  tags: string[];          // 标签

  // 本地元数据
  savedAt: number;         // 保存时间戳
  reviewCount: number;     // 复习次数
  nextReviewAt: number;    // 下次复习时间戳
  lastReviewedAt: number;  // 上次复习时间戳
}
```

### 2.2 本地存储（Storage）
```
Key: warmwords_library
Value: Word[]

Key: warmwords_review_log
Value: { [wordId: string]: ReviewLogEntry }
```

### 2.3 云函数返回格式

#### recognizeObject
```json
{
  "success": true,
  "word": { /* Word Object without local metadata */ }
}
```

#### tts
```json
{
  "success": true,
  "audioUrl": "cloud://xxx/tts/123.mp3",
  "duration": 1200
}
```

## 3. 安全边界

### 3.1 前端禁区
- ❌ 禁止在 miniprogram 代码中硬编码任何 API Key
- ❌ 禁止直接请求外部 AI 服务
- ❌ 禁止上传原始图片到非微信服务器
- ❌ 禁止记录设备标识用于追踪

### 3.2 云函数责任
- ✅ 所有 AI/TTS 调用必须经过云函数
- ✅ API Key 从 `process.env` 读取（环境变量）
- ✅ 云函数验证调用来源（微信提供上下文）
- ✅ 返回结构化数据，不暴露内部实现

### 3.3 隐私原则
- 图片仅在用户操作期间作为临时文件使用
- 不建立用户账号体系（无手机号/微信 UnionID 绑定）
- 不上传图片到任何持久化存储（云函数内存处理后即弃）
- 贴纸书数据仅存储在用户本地

## 4. 云函数环境变量

在微信云开发控制台配置：
```
MULTIMODAL_API_KEY=your-multimodal-api-key
TTS_API_KEY=your-tts-api-key
TTS_REGION=your-tts-region
```

## 5. 未来扩展

### 多端同步
```
用户本地 Storage
       ↓（用户触发手动备份）
微信云存储（加密）
       ↓（家庭成员授权）
其他家庭成员的设备
```

### 离线支持
- 预下载常用词汇的 TTS 音频
- 使用 Serivce Worker 缓存关键资源
- 本地识别（端侧模型，待技术成熟）

## 6. 技术约束

| 项目 | 限制 |
|------|------|
| 主包大小 | ≤ 2MB |
| 总包大小（含分包） | ≤ 12MB |
| 云函数单次运行 | ≤ 20s |
| 云函数内存 | ≤ 256MB |
| 临时文件生命周期 | ≤ 12h |
| Storage 大小 | ≤ 10MB（推荐） |