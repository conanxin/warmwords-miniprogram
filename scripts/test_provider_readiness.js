#!/usr/bin/env node
/**
 * Provider Readiness Test
 * 
 * 不需要真实 API Key，检查 provider 文件结构、函数导出、
 * normalize 清洗能力、Markdown JSON 解析能力。
 * 
 * 用法: node scripts/test_provider_readiness.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CF_DIR = path.join(ROOT, 'cloudfunctions', 'recognizeObject');
const PROVIDER_PATH = path.join(CF_DIR, 'providers', 'openaiCompatibleVisionProvider.js');
const NORMALIZE_PATH = path.join(CF_DIR, 'providers', 'normalizeWordResult.js');

function checkFile(label, fp) {
  process.stdout.write('检查: ' + label + '... ');
  if (!fs.existsSync(fp)) {
    console.log('❌ FAIL — 文件不存在:', fp);
    return false;
  }
  console.log('✅ PASS');
  return true;
}

function checkExports(label, fp, expectedExports) {
  process.stdout.write('检查: ' + label + '... ');
  try {
    const mod = require(fp);
    for (const exp of expectedExports) {
      if (mod[exp] === undefined) {
        console.log('❌ FAIL — 缺少导出:', exp);
        return false;
      }
    }
    console.log('✅ PASS');
    return true;
  } catch (err) {
    console.log('❌ FAIL — 加载失败:', err.message);
    return false;
  }
}

function checkNoEnvKeyInCode(label, fp) {
  process.stdout.write('检查: ' + label + '... ');
  const content = fs.readFileSync(fp, 'utf8');
  const hasHardcodedKey = /sk-[a-zA-Z0-9]{20,}/.test(content);
  if (hasHardcodedKey) {
    console.log('❌ FAIL — 发现疑似硬编码 API Key');
    return false;
  }
  console.log('✅ PASS');
  return true;
}

function checkNoSensitiveLog(label, fp) {
  process.stdout.write('检查: ' + label + '... ');
  const content = fs.readFileSync(fp, 'utf8');
  const risky = [
    /console\.log\s*\([^)]*base64[^)]*\)/i,
    /console\.log\s*\([^)]*Authorization[^)]*\)/i,
    /console\.log\s*\([^)]*apiKey[^)]*\)/i
  ];
  for (const pattern of risky) {
    if (pattern.test(content)) {
      console.log('❌ FAIL — 发现敏感日志:', pattern);
      return false;
    }
  }
  console.log('✅ PASS');
  return true;
}

// ---- 测试 normalizeWordResult ----
function testNormalize() {
  process.stdout.write('测试: normalizeWordResult 脏数据清洗... ');
  try {
    const { normalize } = require(NORMALIZE_PATH);

    // Case 1: 正常数据
    const normal = {
      id: 'apple',
      zh: '苹果',
      en: 'apple',
      confidence: 0.95,
      tags: ['水果', '食物']
    };
    const r1 = normalize(normal, 'test/1.0');
    if (r1.en !== 'apple') return fail('正常数据清洗失败');
    if (r1.confidence !== 0.95) return fail('confidence 未保留');
    if (r1.tags.length !== 2) return fail('tags 未保留');

    // Case 2: 超长字段
    const long = {
      en: 'a'.repeat(100),
      zh: '中'.repeat(100),
      kidNote: 'b'.repeat(200),
      confidence: 2.0,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8']
    };
    const r2 = normalize(long, 'test/1.0');
    if (r2.en.length > 40) return fail('en 未截断');
    if (r2.zh.length > 40) return fail('zh 未截断');
    if (r2.kidNote.length > 120) return fail('kidNote 未截断');
    if (r2.confidence !== 1.0) return fail('confidence 未限制到 1');
    if (r2.tags.length > 6) return fail('tags 未限制到 6');

    // Case 3: 缺失字段
    const missing = {};
    const r3 = normalize(missing, 'test/1.0');
    if (r3.en !== 'unknown') return fail('en 默认值不对');
    if (r3.zh !== '未知物体') return fail('zh 默认值不对');
    if (r3.confidence !== 0) return fail('confidence 默认值不对');
    if (r3.tags.length !== 0) return fail('tags 默认值不对');

    // Case 4: source 透传
    const mockData = { source: 'mock' };
    const r4 = normalize(mockData, 'mock');
    if (r4.source !== 'mock') return fail('mock source 未透传');

    console.log('✅ PASS');
    return true;
  } catch (err) {
    console.log('❌ FAIL —', err.message);
    return false;
  }

  function fail(msg) {
    console.log('❌ FAIL —', msg);
    return false;
  }
}

// ---- 测试 _extractJson（Markdown 包裹）----
function testExtractJson() {
  process.stdout.write('测试: Markdown JSON 解析... ');
  try {
    const { OpenAICompatibleVisionProvider } = require(PROVIDER_PATH);
    const provider = new OpenAICompatibleVisionProvider();

    // Case 1: 纯 JSON
    const pure = '{"en":"apple","zh":"苹果"}';
    const r1 = provider._extractJson(pure);
    if (r1.en !== 'apple') return fail('纯 JSON 解析失败');

    // Case 2: Markdown 代码块
    const markdown = '```json\n{"en":"banana","zh":"香蕉"}\n```';
    const r2 = provider._extractJson(markdown);
    if (r2.en !== 'banana') return fail('Markdown JSON 解析失败');

    // Case 3: 带额外文本
    const extra = 'Here is the result:\n```json\n{"en":"cherry","zh":"樱桃"}\n```\nHope that helps!';
    const r3 = provider._extractJson(extra);
    if (r3.en !== 'cherry') return fail('额外文本 JSON 解析失败');

    // Case 4: 无 JSON
    const noJson = 'This is just plain text without any JSON.';
    try {
      provider._extractJson(noJson);
      return fail('无 JSON 时应抛出错误');
    } catch (e) {
      // 预期行为
    }

    console.log('✅ PASS');
    return true;
  } catch (err) {
    console.log('❌ FAIL —', err.message);
    return false;
  }

  function fail(msg) {
    console.log('❌ FAIL —', msg);
    return false;
  }
}

// ---- 测试 provider 缺少环境变量行为 ----
function testProviderNoEnv() {
  return new Promise(async (resolve) => {
    process.stdout.write('测试: Provider 缺少环境变量... ');
    try {
      const { OpenAICompatibleVisionProvider } = require(PROVIDER_PATH);
      const provider = new OpenAICompatibleVisionProvider();

      if (provider.isConfigured()) {
        console.log('⚠️  SKIP — 环境变量已配置（当前环境可能有 AI_PROVIDER_* 变量）');
        resolve(true);
        return;
      }

      try {
        await provider.recognize('fake-base64');
        resolve(fail('缺少环境变量时应抛出错误'));
        return;
      } catch (err) {
        if (!err.message.includes('未配置')) {
          resolve(fail('错误消息不符合预期: ' + err.message));
          return;
        }
      }

      console.log('✅ PASS');
      resolve(true);
    } catch (err) {
      console.log('❌ FAIL —', err.message);
      resolve(false);
    }

    function fail(msg) {
      console.log('❌ FAIL —', msg);
      return false;
    }
  });
}

// ---- Main ----
console.log('='.repeat(60));
console.log('Provider Readiness Test');
console.log('='.repeat(60));
console.log('');

const tests = [
  () => checkFile('Provider 文件存在', PROVIDER_PATH),
  () => checkFile('Normalize 文件存在', NORMALIZE_PATH),
  () => checkExports('Provider 导出', PROVIDER_PATH, ['OpenAICompatibleVisionProvider']),
  () => checkExports('Normalize 导出', NORMALIZE_PATH, ['normalize']),
  () => checkNoEnvKeyInCode('Provider 无硬编码 Key', PROVIDER_PATH),
  () => checkNoSensitiveLog('Provider 无敏感日志', PROVIDER_PATH),
  () => testNormalize(),
  () => testExtractJson(),
  () => testProviderNoEnv()
];

let passCount = 0;
let failCount = 0;

async function runTests() {
  for (const test of tests) {
    if (await test()) {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('结果: ' + passCount + ' PASS, ' + failCount + ' FAIL');
  console.log('='.repeat(60));

  process.exit(failCount > 0 ? 1 : 0);
}

runTests();
