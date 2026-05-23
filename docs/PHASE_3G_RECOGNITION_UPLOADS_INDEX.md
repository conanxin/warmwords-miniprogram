# Phase 3G recognition_uploads 上传索引集合

## 目标

为 `recognition-inputs/` 临时图片建立可审计索引，解决云存储目录无法可靠自动列举的问题。

## 集合名称

`recognition_uploads`

## 字段设计

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 云数据库自动生成 |
| `cloudFileIDHash` | string | cloudFileID 短 hash（不保存完整 cloudFileID 到日志） |
| `cloudFileID` | string | 用于后续删除；不打印 |
| `cloudPath` | string | recognition-inputs/YYYYMMDD/random.jpg |
| `uploadedAt` | Date | 上传时间 |
| `status` | string | uploaded / recognized / deleted / cleanup_failed |
| `deletedAt` | Date\|null | 删除时间 |
| `cleanupAttempts` | number | 清理尝试次数 |
| `lastError` | string\|null | 最近一次错误 |
| `source` | string | "frontend_upload" |
| `retentionHours` | number | 24 |

## 状态流转

```
uploaded → recognized → deleted
```

异常：
- uploaded / recognized 超过 retentionHours → cleanupRecognitionImages 定时处理 → deleted 或 cleanup_failed

## 前端写入时机

- `uploadImageForRecognition` 成功后，写入 `recognition_uploads`
- 返回 `{ ok, cloudFileID, cloudPath, uploadIndexId, uploadIndexOk }`
- 如果数据库写入失败，不影响识别流程，返回 `uploadIndexOk=false`

## 前端更新时机

- 识别完成后：更新 status = "recognized"
- 删除成功后：更新 status = "deleted"，设置 deletedAt
- 删除失败后：更新 cleanupAttempts +1，lastError

## cleanupRecognitionImages 云函数模式

### 模式 C：index 模式

当 `event.mode === 'index'` 时，从 `recognition_uploads` 集合查询过期记录：

```js
event = {
  mode: 'index',
  dryRun: true/false,
  maxAgeHours: 24
}
```

查询条件：
- `status IN ['uploaded', 'recognized']`
- `uploadedAt < (now - maxAgeHours * 3600000)`

返回：
```js
{
  ok: true,
  mode: 'index',
  dryRun,
  candidates: [{ _id, cloudFileID, cloudPath, uploadedAt }],
  count: 5,
  message: 'Dry run: 5 candidates found'
}
```

## 安全边界

- 仅允许 `recognition-inputs/` 前缀
- 不保存用户原始文件名
- 不保存图片 base64
- 不保存识别结果全文
- 不保存儿童姓名、学校、家庭地址等敏感信息

## 上线前要求

- 数据库权限收紧（仅允许前端写入 / 云函数读写）
- 清理任务 dryRun 观察
- 隐私政策写明临时上传与删除机制