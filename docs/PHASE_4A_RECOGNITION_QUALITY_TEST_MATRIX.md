# Phase 4A Recognition Quality Test Matrix

## 测试矩阵说明

- 预填 30 行，实际测试时逐行填写
- 所有字段均需实际测试后填入，不能留空
- 结论列：PASS / FAIL / PENDING

| # | 图片类型 | 预期普通词 | 实际 en | 实际 zh | mode | fallback | 多语言完整 | 儿童适配 | 是否专有名词 | cleanup success | 结论 | 备注 |
|---|---------|-----------|--------|--------|------|---------|-----------|---------|------------|----------------|------|------|
| 1 | 日常物体 | book | | | | | | | | | PENDING | |
| 2 | 日常物体 | cup | | | | | | | | | PENDING | |
| 3 | 日常物体 | chair | | | | | | | | | PENDING | |
| 4 | 日常物体 | apple | | | | | | | | | PENDING | |
| 5 | 日常物体 | ball | | | | | | | | | PENDING | |
| 6 | 日常物体 | pencil | | | | | | | | | PENDING | |
| 7 | 自然动物 | dog | | | | | | | | | PENDING | |
| 8 | 自然动物 | cat | | | | | | | | | PENDING | |
| 9 | 自然动物 | butterfly | | | | | | | | | PENDING | |
| 10 | 自然动物 | tree | | | | | | | | | PENDING | |
| 11 | 自然动物 | flower | | | | | | | | | PENDING | |
| 12 | 自然动物 | bird | | | | | | | | | PENDING | |
| 13 | 交通/公共物 | bus | | | | | | | | | PENDING | |
| 14 | 交通/公共物 | bicycle | | | | | | | | | PENDING | |
| 15 | 交通/公共物 | traffic light | | | | | | | | | PENDING | |
| 16 | 交通/公共物 | car | | | | | | | | | PENDING | |
| 17 | 交通/公共物 | airplane | | | | | | | | | PENDING | |
| 18 | 室内场景 | table | | | | | | | | | PENDING | |
| 19 | 室内场景 | window | | | | | | | | | PENDING | |
| 20 | 室内场景 | lamp | | | | | | | | | PENDING | |
| 21 | 室内场景 | bed | | | | | | | | | PENDING | |
| 22 | 室内场景 | clock | | | | | | | | | PENDING | |
| 23 | 人物/动漫 | girl | | | | | | | | | PENDING | |
| 24 | 人物/动漫 | boy | | | | | | | | | PENDING | |
| 25 | 人物/动漫 | cartoon character | | | | | | | | | PENDING | |
| 26 | 人物/动漫 | family | | | | | | | | | PENDING | |
| 27 | 人物/动漫 | baby | | | | | | | | | PENDING | |
| 28 | 复杂场景 | playground | | | | | | | | | PENDING | |
| 29 | 复杂场景 | beach | | | | | | | | | PENDING | |
| 30 | 复杂场景 | mountain | | | | | | | | | PENDING | |

## 字段说明

- **图片类型**：5 大分类之一
- **预期普通词**：测试前的预期输出（普通名词）
- **实际 en**：实际返回的英文词汇
- **实际 zh**：实际返回的中文词汇
- **mode**：`provider` / `mock`
- **fallback**：`true` / `false`
- **多语言完整**：ja / ko / phonetic 是否齐全
- **儿童适配**：exampleEn / kidNote 是否适合儿童
- **是否专有名词**：是否输出角色名/品牌名/人名
- **cleanup success**：控制台是否出现 cleanup success
- **结论**：PASS（正常）/ FAIL（异常）/ PENDING（未测）

## 通过标准汇总

- Provider 成功率 ≥ 80%（mode=provider ≥ 24/30）
- 字段完整率 ≥ 90%（有效字段 ≥ 12/13 × 30）
- Cleanup Success ≥ 95%（≥ 29/30）
- P0 问题数 = 0
- 专有名词率 ≤ 10%（≤ 3/30）