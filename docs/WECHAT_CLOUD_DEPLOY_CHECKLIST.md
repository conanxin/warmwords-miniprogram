# 微信云开发部署检查

## 1. 前置条件

- 微信开发者工具可正常打开项目
- AppID 使用真实小程序 AppID 或测试号
- 已开通云开发环境
- `project.config.json` 中 `cloudfunctionRoot = cloudfunctions/`

## 2. 云函数部署顺序

1. `recognizeObject`
2. `tts`

## 3. recognizeObject 首次部署建议

首次部署**不要配置真实 AI 环境变量**，先验证 mock fallback：

1. `ENABLE_CLOUD_RECOGNITION` 暂时保持 `false`（代码默认值）
2. 部署 `recognizeObject` 云函数
3. 在开发者工具云开发面板测试云函数
4. 测试 event：
   ```json
   {
     "imagePath": "mock://manual-test.jpg",
     "useProvider": false
   }
   ```
5. 期望返回：
   ```json
   {
     "ok": true,
     "mode": "mock",
     "word": { "source": "mock", ... },
     "fallback": true,
     "reason": "useProvider=false"
   }
   ```

## 4. 开启前端云函数调用

只有在云函数 mock fallback 测试通过后，才把：

```js
// miniprogram/pages/result/result.js
const ENABLE_CLOUD_RECOGNITION = true;  // 改为 true
```

然后重新编译小程序。

## 5. 真实 AI 环境变量

真实 AI 测试时，在**云函数环境变量**中配置（微信云开发控制台 → 云函数 → 环境变量）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `AI_PROVIDER_BASE_URL` | API 端点 | `https://api.openai.com/v1` |
| `AI_PROVIDER_API_KEY` | API 密钥 | `sk-...` |
| `AI_PROVIDER_MODEL` | 模型名称（可选） | `gpt-4o-mini` |
| `ENABLED_CLOUD_RECOGNITION` | 是否启用（可选，默认 false） | `true` |

**注意：**
- 不要写进 miniprogram 前端
- 不要写进 git
- 不要写进 docs
- 不要截图泄露
- 密钥只在云函数运行时通过 `process.env` 读取

## 6. 真实 AI 测试 event

```json
{
  "imagePath": "mock://provider-test.jpg",
  "imageBase64": "",
  "useProvider": true
}
```

> **说明**：真实图片上传到云函数的完整链路仍需后续 Phase 3C 完成。当前 `imagePath` 仅用于链路测试和 mock 稳定返回。

## 7. 回退策略

如果真实 AI 失败：
- 云函数应自动 fallback 到 mock（Provider 不可用或环境变量缺失时）
- 前端 `result.js` 在云函数调用失败时自动 fallback 到本地 `mockVision.js`
- **不应白屏**，用户应始终能获得识别结果
- 不应让用户看到原始技术错误

## 8. 已知限制

- 当前还没有真实图片上传到云函数（Phase 3C 待完成）
- `imagePath` 主要用于链路测试，mock 稳定返回
- TTS 仍是 placeholder，真实 TTS 接入待 Phase 3D
- 儿童隐私策略上线前必须完善（参见 `docs/PRIVACY.md`）

## 9. 本地 Smoke Test

在部署前，可先在本地运行 smoke test（不依赖微信运行时）：

```bash
node scripts/test_recognizeObject_cloud_local.js
```

期望：`5 PASS, 0 FAIL`