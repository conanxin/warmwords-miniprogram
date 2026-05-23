# Phase 4A Recognition Quality Test Plan

## 目标

验证真实视觉 Provider 识别质量，确保多语言字段稳定性、儿童适配性和兜底 fallback 链路正常。

## 测试范围

- 最低 30 张测试图片
- 覆盖 5 大分类
- 每张图检查 13 个检查项
- 与 mock 对比 fallback 行为

## 图片分类

| 分类 | 说明 | 样例 |
|------|------|------|
| 日常物体 | 常见物品 | book, cup, chair, apple, ball |
| 自然动物 | 动物 | dog, cat, butterfly, tree, flower |
| 交通/公共物 | 交通工具、设施 | bus, bicycle, traffic light |
| 室内场景 | 室内物品 | table, window, lamp |
| 人物/动漫复杂图 | 人物、卡通、角色 | girl, boy, cartoon character |

## 每张图检查项

1. **mode** — 应为 `provider`（真实识别）或 `mock`（fallback）
2. **fallback** — 是否走了 fallback
3. **en** — 英文词汇是否普通名词（非专有名词）
4. **zh** — 中文词汇是否准确
5. **ja** — 日文词汇（非汉字注音）
6. **ko** — 韩文词汇
7. **phonetic** — 音标是否合理
8. **exampleEn** — 英文例句是否自然
9. **exampleZh** — 中文例句是否自然
10. **kidNote** — 儿童适配说明是否友好
11. **tags** — 标签是否稳定（≤6 个）
12. **是否专有名词** — 是否误输出角色名/品牌名
13. **cleanup success** — 图片是否被删除

## 通过标准

| 指标 | 阈值 |
|------|------|
| Provider 成功率 | ≥ 80%（30 张中 ≥ 24 张返回 provider） |
| 字段完整率 | ≥ 90%（每张图有效字段 ≥ 12/13） |
| Cleanup Success | ≥ 95% |
| P0 问题数 | 0 |
| 专有名词率 | ≤ 10% |

## 失败分级

| 级别 | 定义 | 处理 |
|------|------|------|
| **P0** | 白屏 / key 泄露 / 图片无法删除 / 持续失败 | 阻塞发布 |
| **P1** | 大量解析错误 / 字段缺失 / 专有名词失控 | 修复后发布 |
| **P2** | 文案不自然 / tags 不稳定 / 偶发错误 | 可接受 |

## 专有名词处理

以下情况应在测试中标记为 FAIL：
- en 字段为动漫角色名（pikachu, conan, doraemon, mickey mouse）
- en 字段为品牌名（lego, nike, disney）
- en 字段为名人人名（trump, messi）
- en 字段为地标名（eiffel tower）

上述情况如 normalize 后输出 generic 词（如 cartoon character、person）可接受。

## 测试矩阵

见 `docs/PHASE_4A_RECOGNITION_QUALITY_TEST_MATRIX.md`

## 测试步骤

1. 在微信开发者工具中切换到真实识别（ENABLE_CLOUD_RECOGNITION=true）
2. 准备 30 张测试图片（建议 5-10MB 以内）
3. 逐张选择图片，拍照或从相册选择
4. 记录 result 页面显示结果
5. 检查控制台输出
6. 填写测试矩阵
7. 汇总 P0/P1/P2 数量
8. 对照通过标准判断是否可发布

## 测试环境

- HOST_SCOPE: 本地 WSL2 / DESKTOP-3A8N7VN
- 微信开发者工具: Stable 2.01.2510290
- 云环境: cloud1 免费开发环境
- AI Provider: 真实视觉模型（gpt-4o-mini 或等效）