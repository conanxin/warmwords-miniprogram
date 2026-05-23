# 微信开发者工具导入检查

## 1. 导入项目

**项目根目录**：
```
/home/conanxin/projects/warmwords-miniprogram
```

**导入步骤**：
1. 打开微信开发者工具
2. 选择"导入项目"
3. 项目目录：选择上述路径
4. AppID：先使用 `touristappid`（测试号），或填入真实 AppID
5. 确认以下配置：
   - `miniprogramRoot`：`miniprogram/`
   - `cloudfunctionRoot`：`cloudfunctions/`
6. 点击"导入"

**重要**：`project.config.json` 已配置 `appid: "touristappid"`，无需真实 AppID 即可预览前端页面。

---

## 2. 项目结构概览

```
warmwords-miniprogram/
├── miniprogram/          # 小程序主目录
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── index/       # 首页（拍照入口）
│   │   ├── result/      # 结果页（词汇卡片）
│   │   ├── library/    # 贴纸书
│   │   └── review/     # 复习页
│   ├── components/
│   │   ├── sticker-card/
│   │   └── lang-tabs/
│   └── utils/
│       ├── mockVision.js    # Mock AI（12 词条）
│       ├── storage.js
│       ├── review.js
│       └── audio.js
├── cloudfunctions/       # 云函数（Mock 占位）
│   ├── recognizeObject/
│   └── tts/
├── scripts/
│   ├── validate_structure.js
│   └── audit_miniprogram_static.js
├── docs/
└── project.config.json
```

---

## 3. 需要检查的页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `pages/index/index` | 拍照/相册选择入口 |
| 结果页 | `pages/result/result` | Mock AI 词汇卡片展示 |
| 贴纸书 | `pages/library/library` | 本地收藏管理 |
| 复习页 | `pages/review/review` | 间隔复习 |

---

## 4. 模拟器检查项

### 4.1 基础检查
- [ ] 编译无报错（控制台无红色 error）
- [ ] 首页正常加载，产品名"拍词贴"显示
- [ ] 4 个页面均可通过导航切换

### 4.2 首页
- [ ] 产品名"拍词贴"显示正常
- [ ] slogan 显示："看到什么，拍一下，变成你的单词贴纸。"
- [ ] 副标题显示
- [ ] 3 个 Feature chip 可见
- [ ] "拍下一个单词"按钮存在
- [ ] "从相册选择"按钮存在
- [ ] 今日灵感 3 个卡片可见
- [ ] 底部固定导航可见（不遮挡内容）

### 4.3 结果页
- [ ] 进入页面有"识别完成"绿色标签
- [ ] 词汇卡片弹入动画正常
- [ ] 语言 Tab（中/EN/日/韩）可切换
- [ ] 主词随 Tab 切换变化
- [ ] "识别信心 XX%" badge 可见
- [ ] "给小朋友的话"区域可见
- [ ] "听一听发音"按钮存在
- [ ] "保存到我的贴纸书"按钮点击后变为"已保存"
- [ ] 保存成功 Toast："已放进你的贴纸书 📚"
- [ ] "再拍一个"按钮可返回首页

### 4.4 贴纸书（Library）
- [ ] 标题"我的贴纸书"显示
- [ ] 副标题显示："这里收藏了你从真实世界里发现的单词。"
- [ ] 空状态正确显示
- [ ] 有词卡时以图鉴卡片列表展示
- [ ] "清空贴纸书"按钮存在
- [ ] 清空前有二次确认弹窗

### 4.5 复习页
- [ ] 标题"今日复习"显示
- [ ] 副标题显示
- [ ] 无待复习时显示鼓励文案
- [ ] 有待复习时显示词卡列表
- [ ] "我认识"按钮为绿色
- [ ] "我还不熟"按钮为红色
- [ ] 点击后 Toast 正确："太棒了，3 天后再见 🎯" / "没关系，明天再练一次 📝"
- [ ] 操作后词卡从列表消失

### 4.6 控制台常见问题

| 症状 | 可能原因 | 解决方式 |
|------|----------|----------|
| 白屏 | app.json pages 路径错误 | 检查 pages 数组 |
| 组件不显示 | usingComponents 路径错误 | 检查组件路径 |
| 拍照无反应 | 模拟器不支持 wx.chooseMedia | 使用"编译模式"或真机预览 |
| 样式错位 | WXSS var() 兼容性 | 检查微信开发者工具版本 |

---

## 5. 真机预览检查项（如条件允许）

| 检查项 | 说明 |
|--------|------|
| iPhone 屏幕安全区 | 底部导航是否被刘海/圆角遮挡 |
| Android 低端机样式 | 是否有文字溢出、按钮过小 |
| 图片临时路径显示 | 拍照/相册选择的图片是否正常显示 |
| storage 持久化 | 关闭小程序后重新打开，贴纸书数据是否保留 |
| 动画流畅度 | 卡片弹入动画是否卡顿 |
| TTS Toast | "听一听发音"是否触发 Toast |

---

## 6. 云函数（Mock 占位）

当前 `cloudfunctions/` 目录下的云函数均为**占位实现**，不接真实 AI 服务。

如需接入真实 AI：
1. 在微信云开发控制台开通云开发
2. 在云函数中配置多模态 AI API Key（环境变量，绝不放在前端）
3. 参考 `docs/ARCHITECTURE.md` 中的接入说明

---

## 7. 已知限制

- **Mock AI**：识别结果为预设 12 词条，非真实 AI
- **TTS 占位**：发音使用 Toast 模拟，无真实语音
- **无账号系统**：数据仅存在本地 storage，删除小程序后丢失
- **隐私文档**：`docs/PRIVACY.md` 待补充（上线前必须补充）

---

## 8. 相关文档

- `docs/PRODUCT_SPEC.md` — 产品规格
- `docs/ARCHITECTURE.md` — 系统架构
- `docs/MVP_TEST_PLAN.md` — 测试计划
- `docs/VISUAL_QA_CHECKLIST.md` — 视觉 QA 清单
- `docs/OPENCLAW_RUN_REPORT.md` — 开发运行报告