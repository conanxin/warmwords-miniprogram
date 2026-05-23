# Phase 3D-1 真实视觉 Provider 验证结果

## 验证结论

**STATUS: PASS**

## 验证环境

- **HOST_SCOPE**: 本地 WSL2 / DESKTOP-3A8N7VN
- **微信开发者工具**: Stable 2.01.2510290
- **云环境**: cloud1 免费开发环境
- **云函数**: recognizeObject
- **ENABLE_CLOUD_RECOGNITION**: true
- **云函数平台超时时间**: 30 秒
- **provider timeout**: 20 秒

## 成功证据

微信开发者工具控制台日志显示：

```
[Result] Using cloud recognition
[Result] Uploading image for cloud recognition
[CloudImage] Image uploaded for recognition
[Result] Image uploaded for recognition
[Result] Cloud recognition success, mode: provider
[Storage] Word saved
```

result 页面已显示 provider 返回词卡，例如：
- **girl / 女孩子**
- The girl is looking out the window.
- 女孩正望着窗外。

## 已验证链路

1. 小程序临时图片路径 → `wx.chooseImage`
2. `wx.cloud.uploadFile` → 云存储
3. `cloudFileID` → `recognizeObject` 云函数
4. `cloud.downloadFile` → `imageBuffer`
5. `imageBuffer` → `OpenAICompatibleVisionProvider`
6. provider 返回 JSON（格式正确）
7. `normalizeWordResult` 清洗
8. result 页面展示词卡
9. 保存到贴纸书（storage.js）

## 观察到的问题

- 模型可能把动漫或角色图识别成角色名/作品名，如 "detective conan"
- 对儿童词汇产品来说，更适合输出通用名词，例如 girl / person / cartoon character
- 已在 Phase 3D-2 加强 prompt 与轻量 denylist

## 当前限制

- 真实图片会发送到第三方 AI 服务
- 云存储图片尚未自动删除
- 仍需补充用户授权、家长同意、数据保留期限

## 下一步

**Phase 3D-2**（已执行）：Prompt 安全加固 + denylist 去专有化  
或 **Phase 3E**：云存储图片清理策略与隐私完善  
或 **Phase 3D-3**：更多真实图片回归测试