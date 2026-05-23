# cleanupRecognitionImages

云函数：定期清理云存储 `recognition-inputs/` 下过期的临时识别图片。

## 功能

作为前端 `deleteFile` 失败时的兜底清理机制，防止临时识别图片在云存储中长期残留。

## 安全设计

- **前缀限制**：只允许清理 `recognition-inputs/` 路径，不允许任意路径删除
- **dryRun 默认**：默认 `dryRun=true`，需要明确传入才执行删除
- **数量限制**：单次最多删除 100 个文件
- **不打印敏感信息**：不打印完整 `fileID` / `cloudFileID`

## 调用方式

### 模式 A：manual fileList cleanup

```js
// 云函数调用
wx.cloud.callFunction({
  name: 'cleanupRecognitionImages',
  data: {
    fileList: [
      { fileID: 'cloud://xxx/recognition-inputs/20260523/abc123.jpg', cloudPath: 'recognition-inputs/20260523/abc123.jpg', uploadedAt: '2026-05-22T10:00:00Z' },
      { fileID: 'cloud://xxx/recognition-inputs/20260523/def456.jpg', cloudPath: 'recognition-inputs/20260523/def456.jpg', uploadedAt: '2026-05-23T09:00:00Z' }
    ],
    dryRun: false,
    maxAgeHours: 24
  }
});
```

### 模式 B：placeholder（自动扫描待实现）

```js
wx.cloud.callFunction({
  name: 'cleanupRecognitionImages',
  data: {
    dryRun: true,
    maxAgeHours: 24
  }
});
// 返回:
// { ok: true, mode: 'placeholder', message: 'Automatic storage listing is not implemented...' }
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fileList` | array | 必填（manual 模式） | 待清理文件列表 |
| `dryRun` | boolean | `true` | `true`=只返回候选数，`false`=执行删除 |
| `maxAgeHours` | number | `24` | 超过多少小时的图片将被清理 |

## 返回结构

```json
{
  "ok": true,
  "mode": "manual",
  "dryRun": false,
  "maxAgeHours": 24,
  "deletedCount": 5,
  "failedCount": 0,
  "message": "Deleted 5 file(s), 0 failed."
}
```

## 定时触发器配置建议

- **触发周期**：每 6 小时
- **第一阶段**：先配置 `dryRun=true` 运行 1 天，确认候选文件范围
- **第二阶段**：确认无问题后改为 `dryRun=false` 正式启用
- **监控**：每次运行的日志应保留供人工审查

## 未来扩展

推荐后续实现 `recognition_uploads` 数据库索引集合，上传时写入记录，cleanup 时查询 `uploadedAt > 24h && status != deleted`，实现可审计的自动清理。