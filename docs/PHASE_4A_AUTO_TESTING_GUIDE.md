# Phase 4A 自动识别质量测试指南

## 前提

测试图片已放入：
```
test-assets/phase4a/assets/
```

图片命名规范：
```
01_apple.jpg
02_cup.jpg
03_book.jpg
...
30_park_scene.jpg
```

## 环境变量要求

本脚本**不读取** `project.private.config.json` 或任何微信云函数配置。

必须通过 shell 临时设置以下环境变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `AI_PROVIDER_BASE_URL` | API 端点 | `https://api.hunyuan.cloud.tencent.com/v1` |
| `AI_PROVIDER_API_KEY` | 真实 API Key | `sk-xxxx...` |
| `AI_PROVIDER_MODEL` | 模型名称 | `hunyuan-vision` |

## 运行方式

**不要把 API Key 写入任何文件。**

```bash
# 方式一：单行临时设置（推荐）
AI_PROVIDER_BASE_URL="https://api.hunyuan.cloud.tencent.com/v1" \
AI_PROVIDER_API_KEY="your_real_key_here" \
AI_PROVIDER_MODEL="hunyuan-vision" \
node scripts/run_phase4a_recognition_quality_batch.js

# 方式二：export 后运行
export AI_PROVIDER_BASE_URL="https://api.hunyuan.cloud.tencent.com/v1"
export AI_PROVIDER_API_KEY="your_real_key_here"
export AI_PROVIDER_MODEL="hunyuan-vision"
node scripts/run_phase4a_recognition_quality_batch.js
```

如果环境变量缺失，脚本会：
- 输出清晰的错误提示
- 显示需要设置哪些变量
- 以 exit code 2 退出（不报堆栈）

## 输出文件

脚本运行后生成以下文件在 `test-results/phase4a/`：

| 文件 | 说明 |
|------|------|
| `recognition_quality_results.json` | 完整结构化结果（机器可读） |
| `recognition_quality_results.csv` | CSV 格式结果（可用 Excel 打开） |
| `PHASE_4A_AUTO_TEST_REPORT.md` | 人工可读的 Markdown 报告 |

## 通过标准（Release Gate）

脚本根据以下指标判断是否通过 v0.1 release gate：

| 指标 | 阈值 | 说明 |
|------|------|------|
| Provider OK Rate | ≥ 80% | provider 成功调用比例 |
| Field Complete Rate | ≥ 90% | 7 个字段（en/zh/ja/ko/exampleEn/exampleZh/kidNote）都存在的比例 |
| Proprietary Name Risk | = 0 | 命中专有名词去专有化 denylist 的数量 |
| Child-Friendly Rate | ≥ 95% | 例句/kidNote 不包含成人、暴力、色情等内容的比例 |

如果全部通过，脚本 exit code 为 0，否则为 1。

## 报告解读

### JSON metadata 字段

```json
{
  "metadata": {
    "totalCases": 30,
    "providerOkCount": 28,
    "providerOkRate": "93.3",
    "fieldCompleteRate": "96.7",
    "expectedMatchRate": "83.3",
    "proprietaryRiskCount": 0,
    "childFriendlyRate": "100.0",
    "avgDurationMs": 2100,
    "gates": {
      "providerOkRate": true,
      "fieldCompleteRate": true,
      "proprietaryNameRisk": true,
      "childFriendlyLikelyRate": true
    },
    "gatePass": true
  }
}
```

### CSV 字段说明

| 字段 | 说明 |
|------|------|
| `providerOk` | provider 调用是否成功 |
| `fieldComplete` | 7 个字段是否都存在 |
| `expectedMatch` | actualEn 是否匹配 expectedEn（或简单同义） |
| `proprietaryNameRisk` | 是否命中专有名词 denylist |
| `childFriendlyLikely` | 例句内容是否对儿童友好 |
| `errorMessageShort` | 错误信息（最多 160 字符） |

## 注意事项

- **不要提交** 测试结果中的敏感内容到 git
- **不要提交** API Key 到任何文件
- **不要上传** 真实儿童正脸图片到仓库
- 测试图片仅用于质量回归测试
- 单张图片失败不会中断整个批量测试
- 每张图片之间有 500ms 延迟，避免请求过快

## 下一步

Phase 4A-1（批量测试脚本）完成后，进入：

**Phase 4B：实际运行批量测试并生成报告**

用户需在本地设置好环境变量后，运行：
```bash
node scripts/run_phase4a_recognition_quality_batch.js
```

然后将 `test-results/phase4a/PHASE_4A_AUTO_TEST_REPORT.md` 用于发布判断。
## 专有名词风险检测规则（Proprietary Name Risk）

### 检测目标

仅检测**明确的角色名、品牌名、名人**，不检测普通生活词汇。

### 规则说明

| 情况 | 是否风险 | 示例 |
|------|----------|------|
| 小写普通词（如 apple），且 `actualEn === expectedEn` | ❌ 不判风险 | actualEn=apple, expectedEn=apple → fruit |
| 大小写不同但词相同（如 Apple），且 expectedEn 匹配 | ❌ 不判风险 | actualEn=Apple, expectedEn=apple → fruit |
| 明确角色名 / 品牌上下文，无 expectedEn | ✅ 判风险 | detective conan / iphone / nike |
| expectedEn 不匹配（如 apple vs fruit basket） | ✅ 判风险 | 词相同但上下文可能不对 |

### 品牌 / 角色 denylist

- **角色名**：conan, pikachu, mickey mouse, doraemon, hello kitty, snoopy, charlie brown, detective conan, one piece, naruto
- **品牌名**：starbucks, nike, adidas, apple inc, iphone, ipad, macbook, apple watch/pencil/bus/tv/music/pay, coca-cola, pepsi, mcdonald, kfc, harry potter, marvel, dc comics, celebrity, politician, sports star

### 常见误判说明

- **apple（水果）**：如果图片目标是水果苹果，且 actualEn === expectedEn === "apple"，不判风险
- **shoes / cup / book**：普通物品名，不判风险
- **cartoon character / girl / person**：泛化词，不判风险

### 单元测试

```bash
node scripts/test_phase4a_risk_rules.js
```
