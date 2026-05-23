# Phase 3E 云存储图片清理策略

## 目标

真实识别阶段，图片会被上传到微信云存储 `recognition-inputs/`。为了降低儿童图片长期保存风险，应在识别完成后尽快删除临时图片。

## 当前策略

- 前端 `uploadFile` 上传临时图片
- 调用 `recognizeObject` 完成识别
- 识别完成后，前端调用 `wx.cloud.deleteFile` 尝试删除 `cloudFileID`
- 删除失败不影响用户结果页展示
- 不在本地 storage 持久保存 `cloudFileID`

## 实现细节

### cloudImage.js

```js
/**
 * @param {string} cloudFileID
 * @returns {Promise<{ok: boolean, deleted?: boolean, reason?: string}>}
 */
function deleteCloudImage(cloudFileID) { ... }
```

返回结构：
- `{ ok: false, deleted: false, reason: 'missing_cloud_file_id' }` — cloudFileID 为空
- `{ ok: false, deleted: false, reason: 'cloud_delete_unavailable' }` — `wx.cloud.deleteFile` 不可用
- `{ ok: true, deleted: true }` — 删除成功
- `{ ok: false, deleted: false, reason: 'delete_failed' }` — 删除失败

### result.js 调用时机

在 `_recognize` 的 `finally` 块中调用，识别成功或失败均会执行清理。

### 日志

- 上传：`[Result] Uploading image for cloud recognition`
- 上传成功：`[Result] Image uploaded for recognition`
- 识别成功：`[Result] Cloud recognition success, mode: provider`
- 清理成功：`[Result] Cloud image cleanup success`
- 清理失败：`[Result] Cloud image cleanup skipped or failed: <reason>`

## 安全边界

- 只删除本次上传的 `cloudFileID`
- 不删除用户本地相册图片
- 不批量删除其他路径
- 不打印完整 `cloudFileID`（日志中不输出 cloudFileID 内容）
- 不打印 base64、imageBuffer、fileContent

## 仍需补充

- 云端定期清理任务（兜底方案，处理前端清理失败的情况）
- retention policy，例如 24 小时内自动删除 `recognition-inputs/` 下超过 24 小时的文件
- 正式隐私政策页面
- 家长同意机制
- 用户主动删除数据机制

## 人工验证方式

1. 选择图片，触发识别
2. 确认 `uploadFile` 成功，控制台显示 `[Result] Image uploaded for recognition`
3. 确认 `recognizeObject` 返回
4. 控制台出现 `[Result] Cloud image cleanup success`
5. 在微信开发者工具云存储面板中确认对应文件不再存在

## 下一步

Phase 3E-2：云端定期清理任务（定时触发器或云函数）
或进入功能测试阶段。
---

## Phase 3E-1 verification result

**STATUS:** PASS

- 人工验证已通过
- 控制台出现 `[Result] Cloud image cleanup success`
- 前端 `deleteFile` 清理链路成功
- `cloudFileID` 仅在内存中，不写入 storage
- 下一步需要云端定期清理任务作为兜底
