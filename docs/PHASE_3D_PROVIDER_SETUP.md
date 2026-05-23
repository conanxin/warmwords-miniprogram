# Phase 3D 真实视觉模型接入说明

## 1. 当前前提

- Phase 3C 图片上传链路已通过
- recognizeObject 可以读取 imageBuffer
- 当前 provider 仍未配置真实环境变量
- openaiCompatibleVisionProvider.js 已完成安全强化
- normalizeWordResult.js 已完成字段清洗强化

## 2. 云函数环境变量

在微信开发者工具中，进入「云开发」→「云函数」→「recognizeObject」→「版本与配置」→「环境变量」中配置：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ENABLED_CLOUD_RECOGNITION` | 是否启用云端识别 | `true` |
| `AI_PROVIDER_BASE_URL` | OpenAI-compatible API 端点 | `https://api.openai.com/v1` |
| `AI_PROVIDER_API_KEY` | API 密钥 | `sk-...` |
| `AI_PROVIDER_MODEL` | 支持视觉输入的模型名 | `gpt-4o` |

**重要安全边界：**
- 不要把 key 写进代码、文档、截图或聊天
- 不要在任何 git commit message 中提及真实 key
- 云函数环境变量是唯一安全路径

## 3. 推荐测试顺序

### Step 1: 本地 readiness 验证

```bash
cd /home/conanxin/projects/warmwords-miniprogram
node scripts/test_provider_readiness.js
```

期望：`9 PASS, 0 FAIL`

### Step 2: 配置环境变量

在微信开发者工具云开发面板中配置上述环境变量。

### Step 3: 重新部署云函数

右键 `cloudfunctions/recognizeObject` → 上传并部署：云端安装依赖

### Step 4: 测试 provider 调用

在开发者工具中：
1. 编译小程序
2. 选择图片
3. 观察云函数日志

期望日志：
```
[recognizeObject] wx-server-sdk initialized
[recognizeObject] Downloaded cloud image: 241935 bytes
[recognizeObject] Using AI provider: api.openai.com
[visionProvider] Sending vision request, model: gpt-4o payload length: 324567
[visionProvider] Vision parse success, word.en: apple
[recognizeObject] Provider success
```

期望返回：
```json
{
  "ok": true,
  "mode": "provider",
  "word": {
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
    "rawProvider": "api.openai.com/gpt-4o"
  },
  "fallback": false,
  "debugInfo": {
    "hasCloudFile": true,
    "imageBytes": 241935,
    "cloudPath": "recognition-inputs/20260522/z74u6bs5.jpg",
    "reason": ""
  }
}
```

### Step 5: 验证 fallback

临时删除 `AI_PROVIDER_API_KEY` 环境变量，重新部署后测试：

期望：
- 日志显示 `[recognizeObject] Provider not configured, falling back to mock`
- 返回 `mode: "mock"`，`fallback: true`
- 页面仍正常显示词卡

## 4. 供应商选择建议

| 供应商 | 特点 | 注意事项 |
|--------|------|----------|
| OpenAI | 最稳定，文档完善 | 需绑定信用卡，成本较高 |
| 硅基流动 (SiliconFlow) | 国内可用，兼容 OpenAI | 需要注册和 API Key |
| OneAPI | 统一聚合层 | 需自行部署或购买 |
| Cloudflare AI Gateway | 有免费额度 | 需绑定 Cloudflare 账号 |

所有供应商均通过修改 `AI_PROVIDER_BASE_URL` 即可切换。

## 5. 上线前检查清单

- [ ] 云函数环境变量已配置
- [ ] 本地 `node scripts/test_provider_readiness.js` 通过
- [ ] 本地 `node scripts/audit_miniprogram_static.js` 0 errors
- [ ] 真实 provider 调用成功
- [ ] fallback 到 mock 正常
- [ ] 不返回图片 base64 到前端
- [ ] 不打印 API Key 到日志
- [ ] 云存储图片自动删除策略已设计
- [ ] 隐私政策文档已补充
- [ ] 家长知情同意机制已设计

## 6. 已知风险

| 风险 | 说明 | 缓解措施 |
|------|------|----------|
| **成本超支** | AI API 按 token 计费 | 设置用量告警，限制图片频率 |
| **延迟** | 网络 + AI 处理耗时 | 显示 loading 状态，Mock 兜底 |
| **识别失败** | 图片质量或模型能力问题 | 降级到 Mock，保持功能可用 |
| **儿童隐私** | 儿童图片发送到第三方 | 参见 `docs/PRIVACY.md` |
| **Key 泄露** | 若误放到前端会被反编译获取 | 云函数环境变量是唯一安全路径 |
| **超时** | 网络不稳定或模型响应慢 | 20 秒超时后 fallback 到 mock |
