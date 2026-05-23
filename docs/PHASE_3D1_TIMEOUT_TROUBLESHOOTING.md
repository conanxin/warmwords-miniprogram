# Phase 3D-1 真实 Provider 测试超时排查

## 现象

```
cloud.callFunction:fail Error: errCode: -504003
errMsg: Invoking task timed out after 3 seconds
```

页面 fallback 到本地 mock，显示 tree 词卡。

## 判断

前端 `uploadFile` 成功，云函数调用已发起，但 `recognizeObject` 云函数平台超时时间仍为默认 **3 秒**，真实视觉模型调用无法在 3 秒内稳定完成。

## 根因

微信云开发云函数平台默认超时时间为 **3 秒**，而真实视觉模型调用（包含网络请求、模型推理）通常需要 **5-15 秒**。

## 处理方式

在微信开发者工具 / 云开发控制台中进入：

**云开发 → 云函数 → recognizeObject → 版本与配置 → $LATEST → 配置**

修改：

- **超时时间**：30 秒
- **内存**：256MB 或 512MB

保存后重新部署 `recognizeObject`。

## 推荐超时关系

| 层级 | 超时时间 | 说明 |
|------|----------|------|
| 云函数平台超时 | 30 秒 | 平台层硬限制，需手动配置 |
| provider 请求超时 | 20 秒 | provider 内部超时，提前失败避免平台硬超时 |
| 前端 fallback | N/A | 云函数失败时 fallback 到本地 mock |

**关系**：平台超时(30s) > provider timeout(20s) > 真实模型响应时间

## 成功标准

- 不再出现 `-504003`
- 如果 provider 成功：`mode=provider`, `fallback=false`
- 如果 provider 失败：云函数返回 `mode=mock`, `fallback=true`, `reason=provider_xxx`
- 页面不白屏

## 下一步

重新部署后再次测试简单图片，例如 apple / cup / chair。