# Phase 3B-1 云函数部署与 mock 链路测试

## 1. 目标

先部署 `recognizeObject` 云函数，不配置真实 AI 环境变量，只验证云函数可以返回 mock fallback。

## 2. 开发者工具部署步骤

1. 打开微信开发者工具
2. 确认项目根目录为 `/home/conanxin/projects/warmwords-miniprogram`
3. 确认 `project.config.json` 中 `cloudfunctionRoot = cloudfunctions/`
4. 打开**云开发面板**（顶部导航栏"云开发"按钮）
5. 确认已开通云开发环境
6. 在文件树中右键 `cloudfunctions/recognizeObject`
7. 选择**"上传并部署：云端安装依赖"**
8. 等待部署成功（控制台无报错）

## 3. 云函数测试 event

在云开发面板的「云函数测试」或「手动测试」中输入：

**useProvider=false：**
```json
{
  "imagePath": "mock://manual-cloud-test.jpg",
  "useProvider": false
}
```
期望：
- `ok: true`
- `mode: "mock"`
- `word.source: "mock"`

**useProvider=true 但无环境变量：**
```json
{
  "imagePath": "mock://provider-fallback-test.jpg",
  "useProvider": true
}
```
期望：
- `ok: true`
- `mode: "mock"`
- `fallback: true`
- `reason` 存在

## 4. 前端云调用测试

> **前置条件**：云函数 mock fallback 测试通过后，才进行此步骤。

1. 临时修改 `miniprogram/pages/result/result.js`：
   ```js
   const ENABLE_CLOUD_RECOGNITION = true;  // 改为 true
   ```
2. 重新编译小程序
3. 首页 → 选择图片 → result 页面
4. 观察控制台，应出现：
   ```
   [Result] Using cloud recognition
   ```
5. 如果云函数失败，应看到：
   ```
   [Result] Cloud recognition failed, fallback to local mock
   ```
6. 测试完成后，**改回** `ENABLE_CLOUD_RECOGNITION = false`（除非已配置真实 AI）

## 5. 常见问题

| 问题 | 检查点 |
|------|--------|
| 云函数未部署 | 右键 recognizeObject → 确认"上传并部署"成功 |
| wx.cloud 未初始化 | 检查 app.js 是否有 wx.cloud.init() 调用 |
| 云开发环境未开通 | 云开发面板 → 环境 → 确认有环境 ID |
| cloudfunctionRoot 未识别 | project.config.json 中 `cloudfunctionRoot` 路径是否正确 |
| 调用报环境权限错误 | 云函数是否上传到正确的环境 |
| WSL 路径导致热重载异常 | 可忽略，主要影响热重载，不影响云函数调用 |

## 6. 不做事项

- ❌ 不配置真实 API Key
- ❌ 不接真实 AI
- ❌ 不上传儿童真实图片到第三方服务
- ❌ 不把 env ID 或 key 写入 git
- ❌ 不默认开启 `ENABLE_CLOUD_RECOGNITION`

## 7. 预期结果

- 云函数可成功部署
- 云函数测试返回 mock 数据
- 前端开启云调用后，console 显示 `[Result] Using cloud recognition`
- 云函数调用失败时，前端自动 fallback 到本地 mock，不白屏