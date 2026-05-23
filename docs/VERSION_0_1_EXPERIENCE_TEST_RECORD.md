# v0.1 体验版真机测试记录

**日期：** 待填写
**测试人：** 待填写

---

## 测试结论

| 设备 | 系统 | 微信版本 | 网络 | 结论 |
|------|------|----------|------|------|
| iPhone | 待填 | 待填 | Wi-Fi / 蜂窝 | ⬜ 待测 |
| Android | 待填 | 待填 | Wi-Fi / 蜂窝 | ⬜ 待测 |

**总体 STATUS:** ⬜ PENDING

---

## 测试 Checklist

| # | 项目 | iPhone | Android | 备注 |
|---|------|--------|---------|------|
| 1 | 首次进入小程序不白屏 | ⬜ | ⬜ | |
| 2 | 隐私/AI 提示可见（result 页） | ⬜ | ⬜ | 检查合规提示是否正常显示 |
| 3 | 拒绝相机权限有友好提示 | ⬜ | ⬜ | 应提示「请在设置中开启权限」 |
| 4 | 允许相机权限后可拍照 | ⬜ | ⬜ | |
| 5 | 从相册选择图片可用 | ⬜ | ⬜ | |
| 6 | result 页面显示真实词卡 | ⬜ | ⬜ | 检查 en/zh/ja/ko 例句 |
| 7 | mode=provider 成功（真实识别） | ⬜ | ⬜ | |
| 8 | 听一听发音按钮可点击 | ⬜ | ⬜ | |
| 9 | 保存到贴纸书成功 | ⬜ | ⬜ | |
| 10 | 贴纸书列表正常 | ⬜ | ⬜ | |
| 11 | 复习页正常 | ⬜ | ⬜ | |
| 12 | 云端图片 cleanup success | ⬜ | ⬜ | 检查云函数日志 |
| 13 | 弱网下有 fallback（不卡死） | ⬜ | ⬜ | |
| 14 | 无 API Key / cloudFileID / base64 泄露 | ⬜ | ⬜ | 审计 console |

---

## 发布阻塞判定

### P0 阻塞（不可发布）
- [ ] 白屏
- [ ] API Key 泄露
- [ ] 图片无法清理（cleanup 持续失败）
- [ ] 相机/相册完全无法使用
- [ ] 真实识别持续失败且 fallback 不可用

### P1 阻塞（需修复后才能提交）
- [ ] 隐私提示缺失
- [ ] AI 免责声明不可见
- [ ] 词卡字段大量缺失（zh/ja/ko 有 nil）

### 通过条件
- 所有 P0 和 P1 项均已解决
- iPhone 和 Android 任选其一全流程通过即可提交

---

## 问题记录

| # | 设备 | 问题描述 | 严重度 | 状态 |
|---|------|----------|--------|------|
| 1 | | | P0/P1 | 待填 |

---

## 提交审核前确认

- [ ] 小程序备案已完成
- [ ] 用户隐私保护指引已配置（微信公众平台）
- [ ] 小程序信息已补齐（名称/图标/类目/简介）
- [ ] AI 免责声明已展示（result 页底部）
- [ ] 体验版真机测试 P0/P1 项全部通过
- [ ] dryRun 日志 24h 稳定
### TTS 发音测试（新增）

| # | 项目 | iPhone | Android | 备注 |
|---|------|--------|---------|------|
| TTS-1 | 配置 TTS 前：点击"听一听发音" fallback 到发音 modal | ⬜ | ⬜ | 无密钥时应显示 modal，发音提示孩子读一遍 |
| TTS-2 | 配置 TTS 后：点击"听一听发音"可听到真实发音 | ⬜ | ⬜ | 需部署 tts 云函数并配置环境变量 |
| TTS-3 | TTS 失败时不白屏、不报错，显示友好提示 | ⬜ | ⬜ | 应显示"发音暂时不可用" modal |
| TTS-4 | 弱网下 TTS 超时有 fallback | ⬜ | ⬜ | 超时应触发 modal，不卡死 |

**TTS 测试通过条件：** TTS-1 + TTS-3 基础通过；TTS-2 + TTS-4 云函数部署后完整通过。

---

## Phase 5E-3 TTS 播放链路诊断（2026-05-23）

| # | 项目 | 状态 | 备注 |
|---|------|------|------|
| TTS-5 | TTS 云端生成 audioFileID | ✅ PASS | 云开发控制台测试 mode=audio, audio_bytes=4032 |
| TTS-6 | getTempFileURL 获取临时 URL | ✅ PASS | 真机 Console 观察 `[Audio] temp URL ready` |
| TTS-7 | playback started | ✅ PASS | 真机 Console 观察 `[Audio] playback started` |
| TTS-8 | 真机可听到声音 | ✅ PASS | iPhone 真机测试出声 |
| TTS-9 | playback failed → fallback modal | ⬜ 待测 | 观察 errCode / errMsg |
| TTS-10 | audio ctx 避免 GC 提前回收 | ✅ 代码 PASS | 模块级 currentAudio 变量 |

**TTS 播放诊断文档：** `docs/PHASE_5E3_TTS_PLAYBACK_DIAGNOSTICS.md`
