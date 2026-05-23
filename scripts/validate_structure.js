#!/usr/bin/env node
/**
 * 结构验证脚本 - 拍词贴 MVP
 * 
 * 验证微信小程序标准项目结构
 * 用法: node scripts/validate_structure.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const CHECKS = [
  // project.config.json
  { file: 'project.config.json', reason: '微信开发者工具入口配置' },
  
  // miniprogram 核心
  { file: 'miniprogram/app.json', reason: '小程序全局配置' },
  { file: 'miniprogram/app.js', reason: '小程序入口' },
  { file: 'miniprogram/app.wxss', reason: '全局样式' },
  { file: 'miniprogram/sitemap.json', reason: 'sitemap 配置' },
  
  // pages
  { file: 'miniprogram/pages/index/index.js', reason: '首页' },
  { file: 'miniprogram/pages/index/index.wxml', reason: '首页模板' },
  { file: 'miniprogram/pages/index/index.json', reason: '首页配置' },
  { file: 'miniprogram/pages/index/index.wxss', reason: '首页样式' },
  
  { file: 'miniprogram/pages/result/result.js', reason: '结果页' },
  { file: 'miniprogram/pages/result/result.wxml', reason: '结果页模板' },
  { file: 'miniprogram/pages/result/result.json', reason: '结果页配置' },
  { file: 'miniprogram/pages/result/result.wxss', reason: '结果页样式' },
  
  { file: 'miniprogram/pages/library/library.js', reason: '贴纸书' },
  { file: 'miniprogram/pages/library/library.wxml', reason: '贴纸书模板' },
  { file: 'miniprogram/pages/library/library.json', reason: '贴纸书配置' },
  { file: 'miniprogram/pages/library/library.wxss', reason: '贴纸书样式' },
  
  { file: 'miniprogram/pages/review/review.js', reason: '复习页' },
  { file: 'miniprogram/pages/review/review.wxml', reason: '复习页模板' },
  { file: 'miniprogram/pages/review/review.json', reason: '复习页配置' },
  { file: 'miniprogram/pages/review/review.wxss', reason: '复习页样式' },
  
  // components
  { file: 'miniprogram/components/sticker-card/sticker-card.js', reason: '词汇卡片组件' },
  { file: 'miniprogram/components/sticker-card/sticker-card.wxml', reason: '词汇卡片模板' },
  { file: 'miniprogram/components/sticker-card/sticker-card.json', reason: '词汇卡片配置' },
  { file: 'miniprogram/components/sticker-card/sticker-card.wxss', reason: '词汇卡片样式' },

  // utils
  { file: 'miniprogram/utils/mockVision.js', reason: 'Mock 视觉识别（12 词条）' },
  { file: 'miniprogram/utils/storage.js', reason: '本地存储' },
  { file: 'miniprogram/utils/review.js', reason: '间隔复习逻辑' },
  { file: 'miniprogram/utils/cloudImage.js', reason: '云存储图片上传工具' },
  { file: 'miniprogram/utils/audio.js', reason: 'TTS 占位' },
  
  // cloudfunctions（根目录）
  { file: 'cloudfunctions/recognizeObject/index.js', reason: 'recognizeObject 云函数' },
  { file: 'cloudfunctions/recognizeObject/package.json', reason: 'recognizeObject 依赖' },
  { file: 'cloudfunctions/recognizeObject/README.md', reason: 'recognizeObject 说明' },
  { file: 'cloudfunctions/tts/index.js', reason: 'tts 云函数' },
  { file: 'cloudfunctions/tts/package.json', reason: 'tts 依赖' },
  { file: 'cloudfunctions/tts/README.md', reason: 'tts 说明' },
];

const WARNINGS = [
  {
    path: 'tts/',
    reason: '根目录存在 stray tts/ 目录（应位于 cloudfunctions/ 下）'
  },
  {
    path: 'miniprogram/cloudfunctions/',
    reason: 'miniprogram/cloudfunctions/ 不应在 miniprogram 内（应位于根目录 cloudfunctions/）'
  }
];

function checkFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  try {
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

function checkDir(relPath) {
  const fullPath = path.join(ROOT, relPath);
  try {
    return fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

console.log('='.repeat(60));
console.log('拍词贴 MVP - 项目结构验证');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;
const missing = [];

console.log('【文件检查】');
for (const check of CHECKS) {
  const ok = checkFile(check.file);
  if (ok) {
    console.log(`  ✅ ${check.file}`);
    passed++;
  } else {
    console.log(`  ❌ ${check.file}  — ${check.reason}`);
    missing.push(check.file);
    failed++;
  }
}

console.log('');
console.log('【警告检查】');
let warnings = 0;
for (const warn of WARNINGS) {
  if (checkDir(warn.path) || checkFile(warn.path)) {
    console.log(`  ⚠️  ${warn.path}: ${warn.reason}`);
    warnings++;
  } else {
    console.log(`  ✅ ${warn.path} 不存在（正常）`);
  }
}

console.log('');
console.log('='.repeat(60));
if (failed === 0) {
  console.log('✅ PASS — 所有检查通过');
} else {
  console.log(`❌ FAIL — ${failed} 个文件缺失`);
  console.log('');
  console.log('缺失文件:');
  for (const f of missing) {
    console.log(`  - ${f}`);
  }
}
console.log('='.repeat(60));
console.log(`文件检查: ${passed} 通过, ${failed} 失败`);
console.log(`警告: ${warnings} 个`);
console.log('');

process.exit(failed > 0 ? 1 : 0);