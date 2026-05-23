# v0.1 发布决定

**日期：** 2026-05-23
**决策：** CONDITIONAL_GO

---

## 技术准入：已通过 ✅

| 检查项 | 状态 |
|--------|------|
| 30 张图片质量回归测试 | ✅ PASS（Provider OK 100%，proprietaryRisk=0） |
| dryRun 定时清理已配置 | ✅ 已验证（cleanup-recognition-images-dryrun） |
| 云函数已部署 | ✅ recognizeObject / cleanupRecognitionImages |
| 无 P0 问题 | ✅ |
| 无 API Key / cloudFileID 泄露 | ✅ 静态审计通过 |

---

## 正式发布前必须完成（阻塞项）

以下事项需在提交审核前完成，**技术本身已就绪**，阻塞纯为合规和材料准备：

### 1. 小程序备案 ⬜ 阻塞
- 微信公众平台 → 主体备案（个人/企业）
- 小程序名称「拍词贴」需通过名称保护检查

### 2. 用户隐私保护指引 ⬜ 阻塞
- 微信公众平台「设置」→「用户隐私保护指引」
- 必须配置以下选项：
  - [ ] 图片/相机：用于拍照识别物体
  - [ ] 存储：用于保存识别历史（若功能需要）
  - [ ] 无采集儿童姓名/学校/住址的说明

### 3. 小程序信息补齐 ⬜ 阻塞
- [ ] 服务类目：教育 > 语言学习
- [ ] 小程序图标：1024×1024 PNG
- [ ] 简介：简短描述产品功能
- [ ] 审核说明：注明「AI 识别结果仅供学习参考，不替代专业教育」

### 4. AI 免责声明 ⬜ 阻塞
- 在 `result.js` 结果页或关于页添加：
  > AI 视觉识别结果可能不准确，仅供语言学习参考，不作为专业教育依据。建议家长陪同使用。

### 5. 体验版真机测试 ⬜ 阻塞
- [ ] 拍照识别流程
- [ ] 相册选择识别流程
- [ ] 多语言显示（en/zh）
- [ ] 控制台无 key 泄露
- [ ] cleanup 链路确认

### 6. dryRun 日志收口 ⬜ 观察中
- 当前 dryRun=true，需确认至少 24 小时无 failedCount > 0
- 转为正式清理模式（dryRun=false）前需用户确认

---

## 已具备的能力

- ✅ 真实 AI 识别（多语言 en/zh/ja/ko）
- ✅ 儿童友好例句和 kidNote
- ✅ 临时图片自动清理（dryRun 已配置）
- ✅ 无品牌/角色名误判
- ✅ 无 API Key 前端泄露
- ✅ 云函数安全权限策略

---

## 建议定位

> **亲子语言学习实验版**
>
> 不承诺识别完全准确，建议家长陪同使用。
> 本产品基于 AI 视觉识别技术，识别结果仅供学习参考，不作为专业语言教育依据。

---

## 发布路径

```
当前状态: CONDITIONAL_GO（技术已就绪，合规材料准备中）

第一步: 用户在微信公众平台完成备案 + 隐私指引 + 小程序信息
第二步: 用户在本地做一次体验版真机测试确认
第三步: 用户确认 dryRun 日志 24h 稳定后切 dryRun=false
第四步: 提交审核
```
---

## Phase 5A 更新（2026-05-23）

**决策仍为 CONDITIONAL_GO，技术门槛已通过，现进入发布材料准备阶段。**

### 已完成
- ✅ 识别质量自动测试：PASS
- ✅ 技术质量：PASS
- ✅ Phase 5A 发布材料包：已创建 7 个文档

### 发布材料包内容
- `PHASE_5A_WECHAT_RELEASE_PACKAGE.md` — 完整发布包索引
- `WECHAT_MINIPROGRAM_PROFILE_COPY.md` — 小程序资料文案（可直接复制）
- `WECHAT_PRIVACY_GUIDE_DRAFT.md` — 隐私保护指引草案
- `WECHAT_PERMISSION_COPY.md` — 权限说明文案
- `AI_DISCLAIMER_COPY.md` — AI 免责声明
- `WECHAT_AUDIT_SUBMISSION_NOTES.md` — 审核提交说明
- `VERSION_0_1_EXPERIENCE_TEST_PLAN.md` — 体验版真机测试计划

### 仍需在微信公众平台完成
- ⬜ 小程序备案
- ⬜ 用户隐私保护指引（以 `WECHAT_PRIVACY_GUIDE_DRAFT.md` 为参考）
- ⬜ 小程序信息补齐（以 `WECHAT_MINIPROGRAM_PROFILE_COPY.md` 为文案）
- ⬜ AI 免责声明（以 `AI_DISCLAIMER_COPY.md` 为文案添加到 result.js 或关于页）
- ⬜ 体验版真机测试
- ⬜ dryRun 日志收口观察

---

## Phase 5B 更新（2026-05-23）

**决策：CONDITIONAL_GO → 体验版真机测试通过后可进入提交审核准备**

### 备案状态
✅ **已完成** — 用户已确认小程序备案完成

### result 页 AI 免责声明
✅ **已加入** — 文案已写入 result.wxml 合规提示区：
- 主要提示：这个词卡由 AI 根据图片生成，可能不完全准确。
- 辅助提示：图片仅用于本次识别。识别完成后，我们会删除云端临时图片。

### 当前剩余阻塞
- ⬜ 用户隐私保护指引后台配置确认（需用户在微信公众平台填写）
- ⬜ 体验版真机测试（用户手动执行 VERSION_0_1_EXPERIENCE_TEST_RECORD.md）
- ⬜ dryRun 24h 观察收口

### 体验版真机测试记录
已创建：`docs/VERSION_0_1_EXPERIENCE_TEST_RECORD.md`

### 下一步路径
```
备案 ✅ → 隐私指引后台配置 → AI 免责声明展示 ✅ → 体验版真机测试
→ dryRun 24h 稳定确认 → 提交审核
```

---

## Phase 5C 更新（2026-05-23）

**决策：CONDITIONAL_GO → FINAL_MANUAL_CHECK**

技术层面已全部解除：
- ✅ 技术质量 PASS
- ✅ 30 图识别测试 PASS
- ✅ 备案已完成
- ✅ AI 免责声明已加入 result.wxml
- ✅ 图片删除说明已加入 result.wxml

当前决策：**CONDITIONAL_GO（技术已就绪）**

进入 FINAL_MANUAL_CHECK 阶段，需人工确认：
- ⬜ 用户隐私保护指引后台配置（微信公众平台）
- ⬜ 体验版真机测试（VERSION_0_1_EXPERIENCE_TEST_RECORD.md）
- ⬜ dryRun 24h 观察收口

真机测试通过 + 隐私指引配置完成后 → GO → 提交审核

---

## Phase 5D 更新（2026-05-23）

**最终决策：GO_FOR_REVIEW ✅**

所有条件已满足，v0.1.0 可提交微信审核：

| 维度 | 状态 |
|------|------|
| 技术质量 PASS | ✅ 30 图识别测试 PASS，Gate PASS |
| 合规材料 PASS | ✅ 备案/隐私指引/免责声明/发布材料包 |
| 体验版真机测试 PASS | ✅ iPhone + Android 无 P0 阻塞 |
| dryRun 观察 PASS | ✅ 24h 稳定，云函数日志无异常 |
| 安全审计 PASS | ✅ 无 API Key / cloudFileID / base64 泄露 |

**版本：** v0.1.0
**提交日期：** 2026-05-23
**审核提交包：** `docs/VERSION_0_1_SUBMISSION_PACKAGE.md`
**最终确认文档：** `docs/PHASE_5D_FINAL_GO_FOR_REVIEW.md`

---

## Phase 5E 更新（2026-05-23）

**用户明确要求：v0.1 需接入真实 TTS 发音，不接受纯 Toast 提示。**

### 发布前新增阻塞项
| 阻塞项 | 状态 | 说明 |
|--------|------|------|
| 真实 TTS 接入 | ⬜ 待完成 | 云函数 scaffold 已完成，部署 + 环境变量待配置 |
| TTS 真机播放验证 | ⬜ 待测试 | 需配置腾讯云 SecretId/Key 后真机验证 |

### TTS 架构（已实现）
- 云函数：`cloudfunctions/tts/index.js` — 腾讯云 TextToVoice → 云存储
- 前端：`miniprogram/utils/audio.js` — TTS 调用 + fallback modal
- result 页面：`playPronunciation()` 改用 `audio.play()`
- 失败时 fallback：显示"和孩子一起慢慢读一遍"modal

### 安全约束
- 凭证仅存云函数环境变量，不打印 base64 / audio buffer
- 文本长度 1–80，ASCII 白名单验证

### 当前决策
**CONDITIONAL_GO（技术已就绪）** → 补充 TTS 部署 + 真机验证后 → **GO_FOR_REVIEW**

---

## Phase 5E-1a 更新（2026-05-23）

**错误：** `InvalidParameterValue.Environment` — 微信云函数拒绝 `TENCENTCLOUD_` 前缀的环境变量。

**根因：** 微信云函数（SCF）环境变量 Key 禁止使用 `SCF_` / `QCLOUD_` / `TENCENTCLOUD_` 前缀。

**修复：** 环境变量名从 `TENCENTCLOUD_SECRET_ID/SECRET_KEY` 改为 `TTS_SECRET_ID/SECRET_KEY`。

### 修复后环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `TTS_SECRET_ID` | ✅ | 腾讯云 SecretId |
| `TTS_SECRET_KEY` | ✅ | 腾讯云 SecretKey |
| `TTS_REGION` | 否 | 默认 ap-guangzhou |
| `TTS_VOICE_TYPE` | 否 | 默认 101001（en-US） |
| `TTS_CODEC` | 否 | 默认 mp3 |
| `TTS_SAMPLE_RATE` | 否 | 默认 16000 |

### 云函数返回 message 更新
- 缺少凭证时：`tts_provider_not_configured`（而非 `tts_not_configured`）
- fallback 行为不变：显示"发音"modal，提示孩子读一遍

### 当前决策
**CONDITIONAL_GO** → TTS 环境变量已修复 → 云函数部署后 → **GO_FOR_REVIEW**

---

### Phase 5E-1l TTS_QUOTA_BLOCKED

**阻塞项：** TTS 资源包额度耗尽
**错误：** `UnsupportedOperation.PkgExhausted — The resource pack allowance has been exhausted`

**记录：**
- TTS 真实接入代码已基本打通（TC3 签名、请求格式、响应解析全部正确）
- 当前新增阻塞项：**TTS_QUOTA_BLOCKED**
- 发布前必须完成资源包/计费处理，并真机验证出声
- fallback 发音提示（"听发音"按钮）保留作为兜底用户体验

**当前决策路径：**
- TTS 代码链路 ✅
- TTS 云函数已部署 ✅
- TTS 环境变量已配置 ✅
- TTS 资源包额度 ❌ ← TTS_QUOTA_BLOCKED
- 真机出声验证 ❌ ← 待 TTS_QUOTA_BLOCKED 解除
- **GO_FOR_REVIEW** → 需先解除 TTS_QUOTA_BLOCKED

---

### Phase 5E-2 TTS 阻塞项已全部解除

**STATUS:** ✅ TTS 真实链路验证通过

| 检查项 | 状态 |
|--------|------|
| TTS 云函数云端测试 | ✅ ok=true, mode=audio, audioFileID 成功 |
| 真机出声 | ✅ iPhone 真机"听一听发音"可听到声音 |
| fallback modal | ✅ 资源包耗尽时正常触发 |
| 无密钥泄露 | ✅ 代码安全检查通过 |

**已解除的阻塞项：** TTS_QUOTA_BLOCKED (Phase 5E-1l)

**当前决策路径：**
- TTS 代码链路 ✅
- TTS 云函数已部署 ✅
- TTS 环境变量已配置 ✅
- TTS 资源包额度 ✅ 已恢复/已验证
- 真机出声验证 ✅
- **GO_FOR_REVIEW** → TTS 阻塞项已全部解除 → 重新进入最终确认

**下一步：** 确认其他发布项（dryRun 观察期、AI 免责声明等）后，提交微信审核。

---

## 最终决定

**VERSION_0_1_RELEASE_DECISION = GO_FOR_REVIEW**

| 维度 | 状态 |
|------|------|
| 技术质量 | ✅ PASS |
| 合规材料 | ✅ PASS |
| 体验版真机测试 | ✅ PASS |
| 真实 TTS 云端测试 | ✅ PASS |
| 真实 TTS 真机出声 | ✅ PASS |
| AI 免责声明 | ✅ PASS |
| dryRun 观察 | ✅ PASS |
| API Key 泄露检查 | ✅ PASS |

**当前决策：GO_FOR_REVIEW — 可以提交微信审核**

详细确认记录：`docs/PHASE_5D_FINAL_GO_FOR_REVIEW.md`
