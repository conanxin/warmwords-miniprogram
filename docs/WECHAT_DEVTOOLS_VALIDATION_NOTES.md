# 微信开发者工具人工验证记录

## 当前验证状态

- 微信开发者工具可打开项目
- 首页可以加载
- result 页面可以显示 Mock 识别词卡
- 保存到贴纸书成功
- library 可以读取已保存词卡
- review 可以读取待复习词卡并更新状态

## 已修复问题

- sticker-card.wxml 中 WXML 不支持 .toFixed()，已改为 JS 中预计算 confidencePercent。

## 前端云端 mock 链路（Phase 3B-2）

- 前端云端 mock 链路已通过
- ENABLE_CLOUD_RECOGNITION=true
- recognizeObject 云函数调用成功
- 当前仍是 mock，不是真实 AI
- 日志：[Result] Using cloud recognition → [Result] Cloud recognition success, mode: mock

## 当前非阻塞 warning / error

### EISDIR watch error

现象：
微信开发者工具控制台出现 EISDIR / watch 相关错误，路径指向 WSL 文件系统。

初步判断：
这更像是 DevTools 对 WSL 路径监听的兼容问题，不是小程序业务代码错误。

处理建议：
如果频繁影响热重载，可把项目复制到 Windows 原生路径后再导入，例如：
C:\Users\<用户名>\Projects\warmwords-miniprogram

### reportRealtimeAction:fail not support

初步判断：
开发者工具/基础库能力提示，不影响当前 Mock 原型主流程。

### SharedArrayBuffer deprecation

初步判断：
Chromium / DevTools 环境提示，不是业务代码错误。

## 仍需人工检查

- 控制台是否还有真正的 WXML/WXSS 编译错误
- 首页按钮是否全部可点
- result 页面底部按钮是否不再贴底
- library 页面空状态和有数据状态是否正常
- review 页面按钮是否正常更新
- 真机预览是否存在安全区问题