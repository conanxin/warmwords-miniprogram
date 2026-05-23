# Phase 3F 云端定期清理任务设计

## 目标

为 `recognition-inputs/` 临时识别图片提供兜底清理机制，防止前端 `deleteFile` 失败时图片长期残留。

## 当前策略

**第一层**：result 页面识别完成后立即 `deleteCloudImage(cloudFileID)`

**第二层**：`cleanupRecognitionImages` 云函数用于定期兜底清理

## 当前实现

- `cleanupRecognitionImages` 支持 manual fileList cleanup
- `dryRun` 默认 `true`
- `maxAgeHours` 默认 `24`
- `prefix` 只允许 `recognition-inputs/`
- `dryRun=false` 才执行删除
- 单次最多删除 100 个候选文件

## 两种工作模式

### 模式 A：manual fileList cleanup

调用方提供 `event.fileList`：

```js
event = {
  fileList: [{ fileID, cloudPath, uploadedAt }],
  dryRun: false,
  maxAgeHours: 24
}
```

- 过滤 `cloudPath` 不以 `recognition-inputs/` 开头的项（安全边界）
- 过滤 `uploadedAt` 未超过 `maxAgeHours` 的项
- `dryRun=true` 只返回候选数
- `dryRun=false` 调用 `cloud.deleteFile` 执行删除

### 模式 B：placeholder（自动扫描暂不实现）

调用方不提供 `fileList` 时返回：

```json
{
  "ok": true,
  "mode": "placeholder",
  "message": "Automatic storage listing is not implemented yet; provide fileList or implement CloudBase storage listing API."
}
```

## 自动扫描限制

wx-server-sdk 当前**无法可靠列举云存储目录**，因此自动扫描暂不伪实现。

## 推荐后续方案：recognition_uploads 索引集合

1. 上传时写入云数据库集合 `recognition_uploads`：
   - `cloudFileID`
   - `cloudPath`
   - `uploadedAt`
   - `status`（`pending` | `deleted` | `cleanup_failed`）
2. `cleanupRecognitionImages` 定时触发时查询：
   - `uploadedAt < (now - 24h) AND status != deleted`
3. 调用 `cloud.deleteFile` 删除文件
4. 更新 `status = deleted` 或 `cleanup_failed`

## 定时触发建议

| 阶段 | 周期 | dryRun | 说明 |
|------|------|--------|------|
| 验证期 | 每 6 小时 | `true` | 运行 1 天，确认候选文件范围 |
| 正式期 | 每 6 小时 | `false` | 确认无问题后启用删除 |

**注意**：上线前保留每次运行的日志供人工审查。

## 风险控制

- 只删除 `recognition-inputs/` 路径的文件
- 不删除用户本地图片
- 不删除其他云存储目录
- 单次最多 100 个文件
- 默认 `dryRun=true`，需要明确传入 `dryRun=false` 才执行删除
- 返回结果中不包含完整 fileID 列表
- 不打印完整 fileID / cloudFileID
---

## Phase 3G Update — recognition_uploads Index Integrated

**Status:** PASS (已完成 Phase 3G 实现)

**recognition_uploads 索引已接入：**

- `uploadImageForRecognition` 成功后自动写入 `recognition_uploads`
- `result.js` 识别成功后更新 `status = "recognized"`
- `cloudImage.js` 删除成功后更新 `status = "deleted"`

**推荐定时触发 cleanupRecognitionImages：**

```json
{
  "mode": "index",
  "dryRun": true,
  "maxAgeHours": 24
}
```

- 建议先配置 `dryRun=true` 运行 1 天，确认候选记录数量合理
- 稳定后改为 `dryRun=false` 正式启用删除
- 定时周期：每 6 小时

---

## Phase 3H — Timer Trigger Verification

**STATUS:** PASS

- 定时触发器 `cleanup-recognition-images-dryrun` 已上传到云开发控制台
- cron: `0 0 */6 * * * *`（每 6 小时）
- 当前进入 **dryRun 观察期**，不执行真实删除
- 建议观察 24-48 小时日志后再决定是否启用 `dryRun=false`
