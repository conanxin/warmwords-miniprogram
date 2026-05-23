/**
 * normalizeWordResult.js
 * 
 * 校验和清洗模型返回结果
 * - 缺失字段补默认值
 * - confidence 限制在 0~1
 * - tags 保证为数组，最多 6 个
 * - 文本字段限制长度
 * - 不允许返回过长文本
 * - 不允许把 raw 大模型响应透传到前端
 */

const ALLOWED_FIELDS = [
  'id', 'zh', 'en', 'ja', 'ko', 'phonetic',
  'exampleEn', 'exampleZh', 'kidNote',
  'confidence', 'soundHint', 'tags',
  'source', 'rawProvider'
];

const MAX_LENGTHS = {
  id: 40,
  zh: 40,
  en: 40,
  ja: 40,
  ko: 40,
  phonetic: 60,
  soundHint: 40,
  exampleEn: 160,
  exampleZh: 160,
  kidNote: 120,
  tags: 6,
  rawProvider: 100
};

const MAX_TAG_LENGTH = 20;

/**
 * 专有名词去专有化 denylist
 * 命中时将 en/id 替换为通用词，同时在 rawProvider.status 标记 normalized_generic
 * 仅覆盖明确样例，不过度泛化
 */
const ENTITY_DENYLIST = [
  { pattern: /detective\s*conan|conan/i, fallback: { id: 'girl', en: 'girl', zh: '女孩子', ja: '女の子', ko: '소녀' } },
  { pattern: /pikachu/i, fallback: { id: 'cartoon_character', en: 'cartoon character', zh: '卡通角色', ja: 'アニメキャラクター', ko: '만화 캐릭터' } },
  { pattern: /mickey\s*mouse|mickey/i, fallback: { id: 'cartoon_character', en: 'cartoon character', zh: '卡通角色', ja: 'アニメキャラクター', ko: '만화 캐릭터' } },
  { pattern: /doraemon|doraemon/i, fallback: { id: 'cartoon_character', en: 'cartoon character', zh: '卡通角色', ja: 'アニメキャラクター', ko: '만화 캐릭터' } },
];

const DEFAULTS = {
  id: 'unknown',
  zh: '未知物体',
  en: 'unknown',
  ja: '不明',
  ko: '알 수 없음',
  phonetic: '',
  exampleEn: '',
  exampleZh: '',
  kidNote: '',
  confidence: 0,
  soundHint: '',
  tags: [],
  source: 'provider',
  rawProvider: ''
};

/**
 * 清洗并校验模型返回结果
 * @param {object} raw - 模型原始返回
 * @param {string} rawProvider - 供应商名称
 * @returns {object} - 清洗后的结果
 */
function normalize(raw, rawProvider) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('normalizeWordResult: 传入无效数据');
  }

  const result = {};

  for (const field of ALLOWED_FIELDS) {
    if (field === 'source' || field === 'rawProvider') continue;

    const value = raw[field];
    const defaultVal = DEFAULTS[field];

    if (value === undefined || value === null || value === '') {
      result[field] = defaultVal;
    } else {
      result[field] = sanitizeField(field, value);
    }
  }

  // confidence 强制 0~1
  if (typeof result.confidence !== 'number' || isNaN(result.confidence)) {
    result.confidence = 0;
  }
  result.confidence = Math.max(0, Math.min(1, result.confidence));

  // tags 必须是数组，最多 6 个
  if (!Array.isArray(result.tags)) {
    result.tags = [];
  }
  result.tags = result.tags
    .filter(t => typeof t === 'string' && t.length > 0 && t.length <= MAX_TAG_LENGTH)
    .slice(0, MAX_LENGTHS.tags);

  // source 由调用方注入，normalize 只在 provider 模式下设置
  // 如果传入 source 则保留（用于 mock 模式透传）
  if (raw.source !== undefined) {
    result.source = String(raw.source).slice(0, 20);
  } else {
    result.source = 'provider';
  }

  // rawProvider 只允许保留名称和状态，不保留完整模型输出
  let rawProviderStatus = '';
  if (rawProvider && typeof rawProvider === 'object') {
    rawProviderStatus = rawProvider.status || '';
  }

  // denylist 检查：专有名词去专有化
  for (const entry of ENTITY_DENYLIST) {
    if (entry.pattern.test(result.id) || entry.pattern.test(result.en)) {
      // 覆盖为通用词
      Object.assign(result, entry.fallback);
      rawProviderStatus = 'normalized_generic';
      break;
    }
  }

  // rawProvider 组装
  if (rawProvider && typeof rawProvider === 'object') {
    result.rawProvider = JSON.stringify({
      name: rawProvider.name || '',
      status: rawProviderStatus
    }).slice(0, MAX_LENGTHS.rawProvider);
  } else {
    const namePart = String(rawProvider || '').replace(/\/[^/]+$/, '');
    result.rawProvider = JSON.stringify({
      name: namePart,
      status: rawProviderStatus
    }).slice(0, MAX_LENGTHS.rawProvider);
  }

  return result;
}

/**
 * 字段级别清洗
 */
function sanitizeField(field, value) {
  switch (field) {
    case 'id':
    case 'zh':
    case 'en':
    case 'ja':
    case 'ko':
    case 'phonetic':
    case 'soundHint':
      return String(value).slice(0, MAX_LENGTHS[field] || 40).trim();

    case 'exampleEn':
    case 'exampleZh':
    case 'kidNote':
      return String(value).slice(0, MAX_LENGTHS[field] || 160).trim();

    case 'confidence':
      return Math.max(0, Math.min(1, Number(value)));

    case 'tags':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      return [];

    default:
      return value;
  }
}

module.exports = { normalize };