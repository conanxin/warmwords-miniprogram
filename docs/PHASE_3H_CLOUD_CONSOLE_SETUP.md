# Phase 3H Cloud Console Setup

## 目标

在微信开发者工具中为 `cleanupRecognitionImages` 云函数配置定时触发器。

## 问题

微信开发者工具的配置弹窗只有内存、超时时间、环境变量，**没有触发器入口**。

## 解决方案

通过 `config.json` 配置云函数定时触发器，然后右键"上传触发器"。

## config.json

文件路径：`cloudfunctions/cleanupRecognitionImages/config.json`

```json
{
  "triggers": [
    {
      "name": "cleanup-recognition-images-dryrun",
      "type": "timer",
      "config": "0 0 */6 * * * *"
    }
  ]
}
```

**解释**：CloudBase 7 位 cron 格式 `秒 分 时 日 月 星期 年`
- `0 0 */6 * * * *` = 每 6 小时准点执行一次（00:00, 06:00, 12:00, 18:00）

## 配置步骤

1. 确认 `cloudfunctions/cleanupRecognitionImages/config.json` 已存在
2. 在微信开发者工具中，右键 `cloudfunctions/cleanupRecognitionImages` 文件夹
3. 选择「上传并部署：云端触发器」
4. 等待部署完成，确认触发器已生效

## 触发器参数默认值

定时触发器不传 `event`，函数必须依赖代码默认值：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `mode` | `"index"` | 从云数据库查询过期记录 |
| `dryRun` | `true` | 只返回候选数，不执行删除 |
| `maxAgeHours` | `24` | 超过 24 小时的记录视为过期 |

**dryRun 必须保持 `true`，禁止改为 `false`**

## 验证方法

1. 微信开发者工具中查看云函数 → 触发器管理
2. 确认触发器名称 `cleanup-recognition-images-dryrun` 存在
3. 检查最近一次触发的日志（云开发控制台 → 云函数 → 日志）
4. dryRun 模式下，应看到返回 `candidateCount` 但无实际删除

## 下一步

1. 运行 dryRun 模式 1 天，观察 `candidateCount` 是否合理
2. 确认无异常后，可改 `dryRun=false` 正式启用删除
3. 建议配合企业微信/邮件告警，监控 `failedCount > 0`
---

## 定时触发器已上传成功

**STATUS:** PASS

- 微信开发者工具中右键 `cloudfunctions/cleanupRecognitionImages` → 「上传并部署：云端触发器」
- 云开发控制台已显示触发器：`cleanup-recognition-images-dryrun: 0 0 */6 * * * *`
- cron 频率：每 6 小时一次（00:00, 06:00, 12:00, 18:00 UTC+8）
- **当前保持 `dryRun=true`**，不改为 `false`

## 观察计划

- 每 24 小时检查一次云函数日志
- 确认返回 `ok=true, mode=index, candidateCount=N`
- 确认无 `failedCount > 0`
