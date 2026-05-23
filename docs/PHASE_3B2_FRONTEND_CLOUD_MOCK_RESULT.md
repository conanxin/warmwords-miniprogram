# Phase 3B-2 前端云端 mock 链路验证结果

## 验证结论

STATUS: PASS

## 验证环境

- HOST_SCOPE: 本地 WSL2 / DESKTOP-3A8N7VN
- 微信开发者工具：Stable 2.01.2510290
- 云环境：cloud1 免费开发环境
- 云函数：recognizeObject
- 前端开关：ENABLE_CLOUD_RECOGNITION=true

## 成功日志

- [WarmWords] wx.cloud initialized
- [Result] Using cloud recognition
- [Result] Cloud recognition success, mode: mock
- [Result] Sound hint for apple : apple.mp3
- [Storage] Word saved: apple total: 3

## 已验证链路

- 首页/相册选择
- result 页面加载 imagePath
- wx.cloud.callFunction 调用 recognizeObject
- recognizeObject 云函数返回 mockProvider 结果
- sticker-card 正常显示词卡
- 保存到我的贴纸书成功

## 当前仍是 mock 的原因

- 未配置真实 AI_PROVIDER_* 环境变量
- 尚未实现真实图片上传/读取链路
- 当前云函数只用 imagePath 作为稳定 mock hash 输入

## 非阻塞提示

### EISDIR watch error

现象：
DevTools 控制台出现 EISDIR watch 相关错误，路径指向 WSL 项目路径。

判断：
DevTools + WSL 路径监听兼容问题，不影响当前页面运行和云函数调用。

建议：
如影响热重载，可复制项目到 Windows 原生目录后再导入。

### SharedArrayBuffer deprecation

判断：
DevTools Chromium 环境提示，不影响业务。

## 是否保持 ENABLE_CLOUD_RECOGNITION=true

建议保持 true。

理由：
- 云端 recognizeObject 已部署成功
- 云端 mockProvider 已通过
- provider fallback 已通过
- 前端云函数失败时仍会 fallback 到本地 mock
- 有利于后续 Phase 3C 真实图片上传链路开发

## 下一阶段建议

Phase 3C：真实图片上传链路设计与实现。

目标：
- 小程序端将临时图片上传到云存储，或压缩转 base64
- 云函数读取图片内容
- 传给 vision provider
- provider 失败时 fallback 到 mock
- 完善儿童图片隐私边界
