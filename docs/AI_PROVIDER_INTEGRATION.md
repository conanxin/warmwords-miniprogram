# 真实 AI 接入文档

## 当前架构

```
miniprogram (前端)
    ↓ wx.cloud.callFunction({ name: 'recognizeObject' })
cloudfunctions/recognizeObject (云函数)
    ↓
providers/openaiCompatibleVisionProvider (AI Provider)
    ↓
providers/normalizeWordResult (结果清洗)
    ↓
返回统一词卡结构给前端
```

## 环境变量配置

在微信云开发控制台 → 云函数环境变量中配置：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `AI_PROVIDER_BASE_URL` | API 端点 | `https://api.openai.com/v1` |
| `AI_PROVIDER_API_KEY` | API 密钥 | `sk-...` |
| `AI_PROVIDER_MODEL` | 模型名称（可选） | `gpt-4o-mini` |
| `ENABLED_CLOUD_RECOGNITION` | 是否启用（可选，默认 false） | `true` |

## 从 Mock 切换到 Cloud Recognition

1. 在微信云开发控制台为 `recognizeObject` 云函数配置上述环境变量
2. 修改 `miniprogram/pages/result/result.js` 中的：
   ```js
   const ENABLE_CLOUD_RECOGNITION = false;  // 改为 true
   ```
3. 重新上传并部署 `recognizeObject` 云函数
4. 在开发者工具中测试

## 为什么 API Key 不能放在前端

微信小程序代码**任何人均可反编译查看**，前端代码中的 Key 会直接泄露。

正确做法：
- API Key 放在**云函数环境变量**中
- 云函数通过 `process.env.VAR_NAME` 读取
- 前端只调用云函数，不直接访问第三方 API

## 返回 JSON Schema

```json
{
  "id": "apple",
  "zh": "苹果",
  "en": "apple",
  "ja": "りんご",
  "ko": "사과",
  "phonetic": "ˈæpəl",
  "exampleEn": "An apple a day keeps the doctor away.",
  "exampleZh": "每天一个苹果，医生远离我。",
  "kidNote": "红红的苹果可以生吃，也可以做苹果派哦！",
  "confidence": 0.96,
  "soundHint": "apple.mp3",
  "tags": ["水果", "食物", "健康"],
  "source": "provider",
  "rawProvider": "api.openai.com/gpt-4o-mini"
}
```

## Fallback 机制

云函数内部实现了两层 fallback：

1. **Provider 不可用**（环境变量缺失或调用失败）→ 自动 fallback 到 Mock Provider
2. **Mock Provider 失败** → 返回 `{ ok: false, error: "..." }`

前端 result.js 也实现了 fallback：
- 云函数调用失败 → 自动回退到本地 `mockVision.js`

## 供应商可替换原则

`openaiCompatibleVisionProvider.js` 仅依赖 OpenAI Chat Completions API 格式。

任何提供 Vision 能力的**OpenAI-compatible API**（如硅基流动、OneAPI、Cloudflare AI Gateway 等）均可直接接入，只需修改环境变量中的 `BASE_URL`。

## 图片输入来源

当前支持三种图片输入方式：

### 1. 小程序临时图片路径（当前默认）

前端只传 `imagePath`，云函数用其生成稳定的 mock hash，不读取真实图片内容。

### 2. 微信云存储 fileID（Phase 3C 新增）

前端先调用 `wx.cloud.uploadFile` 上传图片到云存储，拿到 `cloudFileID`。

调用云函数时：
```js
wx.cloud.callFunction({
  name: 'recognizeObject',
  data: {
    imagePath,
    cloudFileID,   // e.g. 'cloud://envid/recognition-inputs/20260522/abc123.jpg'
    cloudPath,     // e.g. 'recognition-inputs/20260522/abc123.jpg'
    useProvider: true
  }
});
```

云函数端：
```js
const cloud = require('wx-server-sdk');
const res = await cloud.downloadFile({ fileID: cloudFileID });
const imageBuffer = res.fileContent;
```

### 3. imageBase64（未来预留）

若前端已本地压缩并转为 base64，可直接传入：
```js
wx.cloud.callFunction({
  name: 'recognizeObject',
  data: {
    imageBase64: base64String,
    useProvider: true
  }
});
```

**当前 Phase 3C 状态：**
- 云函数已支持 `cloudFileID` 下载图片 buffer
- `openaiCompatibleVisionProvider.js` 已预留 `imageBuffer → base64` 转换
- 真实 AI Provider 尚未接入（未配置环境变量）
- 当前仍返回 mock 结果

---

## 图片输入来源

当前支持三种图片输入方式：

### 1. 小程序临时图片路径（当前默认）

前端只传 `imagePath`，云函数用其生成稳定的 mock hash，不读取真实图片内容。

### 2. 微信云存储 fileID（Phase 3C 新增）

前端先调用 `wx.cloud.uploadFile` 上传图片到云存储，拿到 `cloudFileID`。

调用云函数时：
```js
wx.cloud.callFunction({
  name: 'recognizeObject',
  data: {
    imagePath,
    cloudFileID,   // e.g. 'cloud://envid/recognition-inputs/20260522/abc123.jpg'
    cloudPath,     // e.g. 'recognition-inputs/20260522/abc123.jpg'
    useProvider: true
  }
});
```

云函数端：
```js
const cloud = require('wx-server-sdk');
const res = await cloud.downloadFile({ fileID: cloudFileID });
const imageBuffer = res.fileContent;
```

### 3. imageBase64（未来预留）

若前端已本地压缩并转为 base64，可直接传入：
```js
wx.cloud.callFunction({
  name: 'recognizeObject',
  data: {
    imageBase64: base64String,
    useProvider: true
  }
});
```

**当前 Phase 3C 状态：**
- 云函数已支持 `cloudFileID` 下载图片 buffer
- `openaiCompatibleVisionProvider.js` 已预留 `imageBuffer → base64` 转换
- 真实 AI Provider 尚未接入（未配置环境变量）
- 当前仍返回 mock 结果

---

## Phase 3D Provider Readiness

### 当前状态
- openaiCompatibleVisionProvider.js 已完成安全强化
- normalizeWordResult.js 已完成字段清洗强化
- index.js 已完成 provider 错误分类和 fallback
- 本地 readiness test：`node scripts/test_provider_readiness.js` → 9 PASS

### 接入流程
1. 配置 `AI_PROVIDER_BASE_URL` / `AI_PROVIDER_API_KEY` / `AI_PROVIDER_MODEL`
2. 重新部署 recognizeObject 云函数
3. 测试真实视觉识别
4. 失败时自动 fallback 到 mock

### imageBuffer → base64 → provider 链路
```
小程序选择图片
→ wx.cloud.uploadFile → 云存储
→ recognizeObject 云函数
→ cloud.downloadFile → imageBuffer
→ openaiCompatibleVisionProvider.recognize(imageBuffer)
→ imageBuffer.toString('base64')
→ OpenAI-compatible vision API
→ JSON 解析
→ normalizeWordResult 清洗
→ 返回前端
```

### provider 失败 fallback mock
```
provider 失败 (timeout / api_error / parse_error / unauthorized)
→ index.js catch
→ debugInfo.providerError = "provider_xxx"
→ getStableWord(imagePath)
→ normalize({...word, source: 'mock'}, 'mock')
→ 返回 { ok: true, mode: 'mock', word, fallback: true }
```

---

## 后续真实接入步骤

1. 申请 AI 服务账号（建议使用支持计费告警的供应商）
2. 配置 `AI_PROVIDER_BASE_URL`、`AI_PROVIDER_API_KEY`、`AI_PROVIDER_MODEL`
3. 在云开发控制台设置 `ENABLED_CLOUD_RECOGNITION=true`
4. 部署并测试
5. 配置 TTS 服务（参考 `cloudfunctions/tts/index.js`）
6. 补充隐私政策页面

## 风险提示

| 风险 | 说明 | 缓解措施 |
|------|------|----------|
| **成本超支** | AI API 按 token 计费 | 设置用量告警，限制图片频率 |
| **延迟** | 网络 + AI 处理耗时 | 显示 loading 状态，Mock 兜底 |
| **识别失败** | 图片质量或模型能力问题 | 降级到 Mock，保持功能可用 |
| **儿童隐私** | 儿童图片发送到第三方 | 参见 `docs/PRIVACY.md` |
| **Key 泄露** | 若误放到前端会被反编译获取 | 云函数环境变量是唯一安全路径 |
## Phase 3B-0 Local Smoke Test

本地 smoke test 在不依赖微信运行环境的情况下验证云函数逻辑：

```bash
node scripts/test_recognizeObject_cloud_local.js
```

**期望输出：**
```
5 PASS, 0 FAIL
```

**验证内容：**
- `useProvider=false` → mock 模式，`word.source === 'mock'`
- `useProvider=true` 但无 `AI_PROVIDER_*` 环境变量 → fallback mock，`fallback === true`
- 非法空输入 → 不崩溃，返回 mock 结果
- `normalize()` 正确裁剪 confidence 到 0~1
- `normalize()` 正确将 tags 转为数组

**当前状态：** ✅ 5/5 PASS

---

## Phase 3D-1 真实 Provider 验证结果

### 验证结论
**STATUS: PASS** — 2026-05-23

### 验证证据
微信开发者工具控制台：
```
[Result] Using cloud recognition
[Result] Cloud recognition success, mode: provider
```
result 页面已显示 provider 词卡（girl / 女孩子）。

### prompt 加固（Phase 3D-2 已实施）
- 优先识别适合儿童语言学习的普通名词
- 明确禁止输出角色名、品牌名、名人名、动漫角色名
- 若出现人物/角色，输出通用词如 girl, boy, person, cartoon character
- 禁止 Markdown，只输出纯 JSON

### denylist 去专有化（Phase 3D-2 已实施）
normalizeWordResult.js 中新增轻量 denylist：
- detective conan / conan -> girl
- pikachu -> cartoon character
- mickey mouse -> cartoon character
- doraemon -> cartoon character

命中时 rawProvider.status = normalized_generic，用于后续分析。

### 不建议输出类型
- 动漫角色（Conan, Pikachu, Doraemon 等）
- 影视角色（Mickey Mouse 等）
- 品牌名称、产品名
- 名人姓名
- 复杂场景名称（应输出其中最清晰的普通物体）

---

## Phase 3E 云存储图片清理（真实 Provider 阶段）

真实 Provider 阶段不应长期保存 cloudFileID。每次识别完成后：

1. 前端调用 `wx.cloud.deleteFile` 尝试删除本次上传的 cloudFileID
2. 删除在 `finally` 块执行，识别成功或 fallback 均会清理
3. 删除失败不影响结果展示，日志记录原因
4. `debugInfo` 不再返回 `cloudPath`（已移除），不打印完整 cloudFileID

云端定期清理任务（待实现）：
- 定时触发器定期扫描 `recognition-inputs/` 目录
- 删除超过 24 小时的临时文件
- 作为前端清理失败的兜底
