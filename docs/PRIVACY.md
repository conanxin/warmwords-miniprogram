# 隐私说明

## 当前版本行为

**拍词贴 v1.0.0（Mock AI 阶段）**

当前版本默认使用本地 Mock AI 识别，**不会将任何图片发送到外部服务器**。

## 若开启云函数识别

若将 `ENABLE_CLOUD_RECOGNITION` 切换为 `true` 并部署云函数，图片将通过以下流程处理：

1. 小程序前端 → 微信云开发云函数
2. 云函数 → AI 识别服务（如 OpenAI GPT-4V 或兼容服务）

**隐私风险提示：**

- 儿童图片会短暂经过第三方 AI 服务
- 不应长期保存儿童照片
- 上线前必须提供：隐私政策、家长知情同意、数据删除机制
- **严禁**在 miniprogram 前端代码中写入任何 API Key
- 建议只上传压缩后的临时图片，识别后尽快从云存储删除

## 儿童数据特殊要求

对儿童使用场景，**严格避免采集**：
- 真实姓名
- 学校信息
- 家庭住址
- GPS 位置
- 其他可识别个人身份的信息

## 云存储上传测试阶段

当前 Phase 3C 正在实现小程序临时图片 → 微信云存储 → 云函数读取图片 buffer 的链路。

**当前行为：**
- 前端将临时图片上传到微信云存储 `recognition-inputs/` 目录
- cloudPath 使用随机文件名，不暴露用户原始文件名
- 云函数通过 `cloud.downloadFile` 读取图片 buffer
- 当前阶段不将图片转发到任何第三方 AI 服务
- 图片仅在微信云存储中短暂存在，不上传到外部

**后续上线前必须补充：**
- 定期清理已识别图片的自动化策略
- 家长知情同意机制
- 明确的数据保留期限（建议 ≤ 7 天）

**当前开发测试状态（Phase 3C）：**
- 已验证图片会上传到云存储 `recognition-inputs/`
- 当前尚未实现自动删除
- 上线前必须补充自动清理策略，例如：
  - 识别完成后立即从云存储删除
  - 或设置定期清理任务（Cloud Functions cron / 定时触发器）
- 不应长期保存儿童图片

---

**当前开发测试状态（Phase 3C）：**
- 已验证图片会上传到云存储 `recognition-inputs/`
- 当前尚未实现自动删除
- 上线前必须补充自动清理策略，例如：
  - 识别完成后立即从云存储删除
  - 或设置定期清理任务（Cloud Functions cron / 定时触发器）
- 不应长期保存儿童图片

---

## 真实视觉模型阶段（Phase 3D）

当配置 `AI_PROVIDER_BASE_URL` / `AI_PROVIDER_API_KEY` / `AI_PROVIDER_MODEL` 并启用真实识别后：

**数据流向：**
1. 用户拍照/选择图片
2. 图片上传到微信云存储（临时）
3. 云函数读取图片 buffer
4. 图片转为 base64 发送到第三方 AI 视觉模型（如 OpenAI GPT-4o）
5. 返回识别结果词卡

**隐私风险提示：**
- 儿童图片会被发送到第三方 AI 服务进行处理
- 第三方 AI 服务可能有数据保留政策（如 OpenAI 保留 30 天用于安全审查）
- 部分 AI 服务有年龄限制（如 OpenAI API 要求 18+ 或家长同意）
- 建议只发送压缩后的低分辨率图片（当前 detail='low'）

**上线前必须补充：**
- 用户明确授权机制（拍照前提示数据将发送到第三方 AI）
- 家长知情同意机制
- 隐私政策页面说明数据流向
- 数据保留期限和删除策略
- 不应长期保存儿童图片在云存储

---

## 真实 AI 接入时的额外注意事项

- 查阅所用 AI 服务提供商的儿童数据处理政策
- 部分 AI 服务有年龄限制（如 OpenAI API 要求 18+ 或家长同意）
- 存储的图片和识别结果应加密传输（HTTPS）
- 云函数日志中避免打印儿童图片 base64 或完整人脸描述

---
_本文档随版本更新。如有变更，将在 CHANGELOG 中标注。_
---

## 真实视觉 Provider 阶段额外隐私提示（Phase 3D-1 验证后补充）

### 动漫/角色图片识别说明
模型可能将动漫角色图片（如《名侦探柯南》、《宝可梦》）识别为角色名而非通用词。

示例：
- 柯南图片可能被识别为 "detective conan"
- 皮卡丘图片可能被识别为 "pikachu"

已在 Phase 3D-2 中通过 prompt 指令和 denylist 降低此问题，但仍无法完全杜绝。

### 上线前必须补充的限制或说明
- 在隐私政策页面明确说明：图片将发送到第三方 AI 服务进行处理
- 建议在拍照/选图前展示简短提示："图片将用于 AI 识别，可能发送到第三方服务"
- 对动漫、影视角色图片的识别结果不做为核心功能依赖
- 不应长期保存儿童图片，建议识别完成后自动删除云存储中的图片（参见 Phase 3E）

---

## 云存储临时图片删除（Phase 3E）

- 当前开发版已加入识别后尝试删除云存储临时图片的机制（`deleteCloudImage`）。
- 删除操作在前端 result.js 的 `finally` 块中执行，无论识别成功或 fallback 均会尝试清理。
- 删除失败不会影响用户识别结果页展示，但会记录日志。
- 建议在隐私政策中明确：图片在识别完成后会尽快删除，最长保留时间不超过 24 小时。
- 上线前仍建议增加云端定期清理任务作为兜底，删除 `recognition-inputs/` 下超过指定时间的文件。

---

## 云存储临时图片删除验证（Phase 3E-1）

- 已验证识别完成后立即尝试删除云存储临时图片，控制台出现 `Cloud image cleanup success`
- `cloudFileID` 仅在内存中，不写入 storage
- 仍需云端定时清理任务作为兜底，处理前端清理失败的情况
- 推荐 retention policy：
  - 正常情况：识别完成后立即删除
  - 异常残留：不超过 24 小时
  - 需在隐私政策中明确数据保留期限

---

## 云端定期清理兜底

- 当前已有前端识别后立即删除机制。
- Phase 3F 新增 `cleanupRecognitionImages` 云函数，用于兜底清理 `recognition-inputs/` 下异常残留的临时图片。
- 默认 `dryRun=true`，正式启用前需人工确认候选文件范围。
- 推荐策略：每 6 小时运行一次，删除超过 24 小时的 `recognition-inputs/` 临时图片。
- 上线前应结合数据库索引（`recognition_uploads`）实现可审计的清理记录。

---

## Phase 3G recognition_uploads 上传索引集合

- 新增 `recognition_uploads` 云数据库集合，记录每次上传的 cloudFileID / cloudPath / uploadedAt / status
- `uploadImageForRecognition` 成功后自动写入索引；数据库写入失败不影响识别流程
- 识别成功后 `result.js` 更新 status = "recognized"
- 删除成功后 `cloudImage.js` 更新 status = "deleted"
- `cleanupRecognitionImages` 云函数新增 index 模式，查询 `status IN ['uploaded','recognized']` 且 `uploadedAt` 超过 24 小时的记录，执行删除并更新状态
- 不保存原始文件名、base64、识别结果全文或儿童个人信息
- cloudFileID 仅存于云数据库，不打印、不写入 storage

---

## recognition_uploads 集合使用说明

- `recognition_uploads` 仅用于清理审计追踪，不保存原始图片内容、base64、本地路径或儿童个人信息
- `cloudFileID` 仅用于通过 `cloud.deleteFile` 删除云存储中的临时图片
- 建议 `retentionHours = 24`，超过 24 小时的记录由定时清理任务处理
- 数据库权限应仅允许前端写入和云函数读写
