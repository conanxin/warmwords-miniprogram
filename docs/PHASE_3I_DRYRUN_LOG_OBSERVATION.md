# Phase 3I dryRun 日志观察计划

## 观察结论

**STATUS: OBSERVATION_PENDING**

## 当前配置

- **云函数**: cleanupRecognitionImages
- **触发器**: cleanup-recognition-images-dryrun
- **Cron**: 0 0 */6 * * * *
- **频率**: 每 6 小时
- **dryRun**: true
- **maxAgeHours**: 24
- **mode**: index

## 观察窗口

至少观察 **24 小时**，覆盖以下触发点（UTC+8）：

- 00:00
- 06:00
- 12:00
- 18:00

## 每次检查项目

| 检查项 | 说明 |
|--------|------|
| 是否有自动触发日志 | 确认定时触发器正常工作 |
| `ok` 是否为 `true` | 函数执行无错误 |
| `mode` 是否为 `index` | 使用云数据库查询模式 |
| `dryRun` 是否为 `true` | 未执行实际删除 |
| `count` / `candidateCount` | 候选文件数量是否合理 |
| `failedCount` 是否为 `0` | 删除操作无失败 |
| 数据库权限错误 | 是否出现 `permission denied` |
| `cloud.deleteFile` 异常 | 是否出现删除调用错误 |
| 非 `recognition-inputs/` 候选 | 是否出现路径越界 |
| 真实删除行为 | `dryRun=true` 不应有删除记录 |

## 期望结果

正常情况下：

```json
{
  "ok": true,
  "mode": "index",
  "dryRun": true,
  "maxAgeHours": 24,
  "count": 0,
  "candidates": []
}
```

如果 `count > 0`，需要确认候选记录均符合：

- `status` 为 `uploaded` / `recognized` / `cleanup_failed`
- `uploadedAt` 超过 24 小时
- `cloudPath` 以 `recognition-inputs/` 开头
- `dryRun=true` 未实际删除

## 不允许进入 `dryRun=false` 的情况

- 未观察满 24 小时
- `failedCount > 0`
- 出现数据库权限错误
- 出现非 `recognition-inputs/` 候选
- 日志缺失或触发器不稳定
- 仍不清楚 `candidateCount` 来源

## 下一步决策

| 观察结果 | 决策 |
|---------|------|
| 24 小时稳定，`count` 合理，无错误 | Phase 3J：评估是否启用 `dryRun=false` |
| `count > 0` 来源不明 | 排查 `recognition_uploads` 脏数据 |
| `failedCount > 0` | 修复错误，保持 `dryRun=true` |
| 触发器未正常工作 | 检查 config.json 和上传状态 |
| `permission denied` | 检查云数据库权限配置 |

**Phase 3J**：评估是否启用 `dryRun=false`