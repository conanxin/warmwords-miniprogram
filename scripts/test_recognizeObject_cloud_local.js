#!/usr/bin/env node
/**
 * 云函数 recognizeObject 本地 Smoke Test
 * 
 * 直接测试 providers 和 normalize 逻辑（不依赖 wx-server-sdk）
 * 然后模拟云函数 main() 逻辑做完整流程验证
 * 
 * 用法: node scripts/test_recognizeObject_cloud_local.js
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CF_DIR = path.join(ROOT, 'cloudfunctions', 'recognizeObject');

// 加载 provider 模块（纯 Node.js，无微信依赖）
const { getStableWord } = require(path.join(CF_DIR, 'providers', 'mockProvider'));
const { normalize } = require(path.join(CF_DIR, 'providers', 'normalizeWordResult'));

// ---- 模拟云函数 main() 逻辑 ----
const ENABLED_CLOUD_RECOGNITION = process.env.ENABLED_CLOUD_RECOGNITION === 'true';

class MockOpenAICompatibleVisionProvider {
  isConfigured() {
    return !!(process.env.AI_PROVIDER_BASE_URL && process.env.AI_PROVIDER_API_KEY);
  }
  getProviderName() {
    return process.env.AI_PROVIDER_BASE_URL ? new URL(process.env.AI_PROVIDER_BASE_URL).hostname : 'unknown';
  }
  async recognize() {
    throw new Error('Mock: 真实 AI 未配置');
  }
}

async function cloudMain(event) {
  const { imagePath, cloudFileID, cloudPath, imageBase64, useProvider } = event;

  // 本地 Node 环境安全判断：跳过 cloud.downloadFile
  let imageBuffer = null;
  let downloadReason = 'no_cloudFileID';
  if (cloudFileID) {
    // 本地 Node 无 wx-server-sdk cloud 能力，不抛异常
    console.log('[mock] cloudFileID present but cloud.downloadFile unavailable in local env');
    imageBuffer = null;
    downloadReason = 'cloud_sdk_unavailable';
  }

  const debugInfo = {
    hasCloudFile: !!imageBuffer,
    imageBytes: imageBuffer ? imageBuffer.length : 0,
    cloudPath: cloudPath || '',
    reason: downloadReason
  };

  const shouldUseProvider = useProvider === true && ENABLED_CLOUD_RECOGNITION;

  if (shouldUseProvider) {
    const provider = new MockOpenAICompatibleVisionProvider();
    if (provider.isConfigured()) {
      try {
        const { word: rawWord, rawProvider } = await provider.recognize(imageBase64 || '', { imagePath, imageBuffer });
        const word = normalize(rawWord, rawProvider);
        return { ok: true, mode: 'provider', word, fallback: false, debugInfo };
      } catch (err) {
        console.warn('[mock] Provider failed, falling back to mock:', err.message);
      }
    } else {
      console.warn('[mock] Provider not configured, falling back to mock');
    }
  } else {
    console.log('[mock] useProvider=false or ENABLED_CLOUD_RECOGNITION not set, using mock');
  }

  try {
    const word = getStableWord(imagePath || '');
    const normalized = normalize({ ...word, source: 'mock' }, 'mock');
    return {
      ok: true,
      mode: 'mock',
      word: normalized,
      fallback: true,
      reason: shouldUseProvider ? 'provider_unavailable' : 'useProvider=false',
      debugInfo
    };
  } catch (err) {
    console.error('[mock] Mock provider failed:', err);
    return { ok: false, error: '识别服务暂时不可用，请稍后重试', debugInfo };
  }
}

// ---- 测试用例 ----
const CASES = [
  {
    label: 'Case 1: useProvider=false → mock 模式',
    input: { imagePath: 'mock://apple-test.jpg', useProvider: false },
    expect: (res) => {
      if (!res.ok) return 'ok !== true';
      if (res.mode !== 'mock') return 'mode !== mock: got ' + res.mode;
      if (res.word.source !== 'mock') return 'word.source !== mock: got ' + res.word.source;
      if (!res.word.zh || !res.word.en || !res.word.ja || !res.word.ko) return 'missing language fields';
      if (typeof res.word.confidence !== 'number' || res.word.confidence < 0 || res.word.confidence > 1) {
        return 'confidence out of range: ' + res.word.confidence;
      }
      return null;
    }
  },
  {
    label: 'Case 2: useProvider=true 但无环境变量 → fallback mock',
    input: { imagePath: 'mock://provider-fallback-test.jpg', useProvider: true },
    expect: (res) => {
      if (!res.ok) return 'ok !== true';
      if (res.mode !== 'mock') return 'mode !== mock: got ' + res.mode;
      if (res.fallback !== true) return 'fallback !== true';
      if (!res.reason) return 'reason is empty';
      if (res.word.source !== 'mock') return 'word.source !== mock: got ' + res.word.source;
      return null;
    }
  },
  {
    label: 'Case 3: 非法输入（空参数）→ 应不崩溃',
    input: {},
    expect: (res) => {
      if (!res.ok) return 'ok !== true';
      if (res.mode !== 'mock') return 'mode !== mock: got ' + res.mode;
      return null;
    }
  },
  {
    label: 'Case 4: normalize - confidence 范围校验',
    input: { imagePath: 'mock://normalize-test.jpg', useProvider: false },
    expect: (res) => {
      if (res.word.confidence > 1) return 'confidence should be clamped to 1: got ' + res.word.confidence;
      if (res.word.confidence < 0) return 'confidence should be clamped to 0: got ' + res.word.confidence;
      return null;
    }
  },
  {
    label: 'Case 5: normalize - tags 必须为数组',
    input: { imagePath: 'mock://tags-test.jpg', useProvider: false },
    expect: (res) => {
      if (!Array.isArray(res.word.tags)) return 'tags should be array: got ' + typeof res.word.tags;
      return null;
    }
  },
  {
    label: 'Case 6: cloudFileID placeholder → 本地环境安全 fallback mock',
    input: { imagePath: 'mock://cloud-file-placeholder.jpg', cloudFileID: 'cloud://fake-placeholder', useProvider: false },
    expect: (res) => {
      if (!res.ok) return 'ok !== true';
      if (res.mode !== 'mock') return 'mode !== mock: got ' + res.mode;
      if (res.debugInfo && res.debugInfo.hasCloudFile !== false) return 'debugInfo.hasCloudFile should be false in local env';
      return null;
    }
  }
];

// ---- 运行测试 ----
async function runTests() {
  console.log('='.repeat(60));
  console.log('recognizeObject 云函数本地 Smoke Test');
  console.log('='.repeat(60));
  console.log('');

  let passCount = 0;
  let failCount = 0;

  for (const tc of CASES) {
    process.stdout.write('测试: ' + tc.label + '... ');
    try {
      const res = await cloudMain(tc.input);
      const errMsg = tc.expect(res);
      if (errMsg) {
        console.log('❌ FAIL');
        console.log('     原因: ' + errMsg);
        console.log('     返回: mode=' + res.mode + ', fallback=' + res.fallback + ', word.en=' + (res.word && res.word.en) + ', confidence=' + (res.word && res.word.confidence));
        failCount++;
      } else {
        console.log('✅ PASS');
        console.log('     mode=' + res.mode + ', fallback=' + res.fallback + ', word.en=' + (res.word && res.word.en) + ', confidence=' + (res.word && res.word.confidence));
        passCount++;
      }
    } catch (err) {
      console.log('❌ FAIL');
      console.log('     未捕获异常: ' + err.message);
      failCount++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('结果: ' + passCount + ' PASS, ' + failCount + ' FAIL');
  console.log('='.repeat(60));
  console.log('');
  console.log('--- Summary ---');
  console.log('CASE_COUNT: ' + CASES.length);
  console.log('PASS_COUNT: ' + passCount);
  console.log('FAIL_COUNT: ' + failCount);
  console.log('PROVIDER_ENV_PRESENT: ' + (!!(process.env.AI_PROVIDER_BASE_URL && process.env.AI_PROVIDER_API_KEY) ? 'yes' : 'no'));
  console.log('MOCK_FALLBACK_OK: ' + (passCount === CASES.length ? 'yes' : 'no'));
  console.log('---');

  process.exit(failCount > 0 ? 1 : 0);
}

runTests();