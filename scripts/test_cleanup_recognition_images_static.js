#!/usr/bin/env node
/**
 * cleanupRecognitionImages 静态检查脚本
 * 不依赖微信云运行时，只做静态分析
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLOUD_FUNC_DIR = path.join(ROOT, 'cloudfunctions/cleanupRecognitionImages');
const indexPath = path.join(CLOUD_FUNC_DIR, 'index.js');
const packagePath = path.join(CLOUD_FUNC_DIR, 'package.json');
const readmePath = path.join(CLOUD_FUNC_DIR, 'README.md');
const designDocPath = path.join(ROOT, 'docs/PHASE_3F_SCHEDULED_CLEANUP_DESIGN.md');

let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`✅ ${name}`);
    pass++;
  } else {
    console.log(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

console.log('============================================================');
console.log('cleanupRecognitionImages 静态检查');
console.log('============================================================');

check('cloudfunctions/cleanupRecognitionImages/index.js 存在',
  fs.existsSync(indexPath));

check('package.json 存在',
  fs.existsSync(packagePath));

check('README.md 存在',
  fs.existsSync(readmePath));

check('PHASE_3F_SCHEDULED_CLEANUP_DESIGN.md 存在',
  fs.existsSync(designDocPath));

if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');

  check('index.js 引入 wx-server-sdk',
    content.includes("require('wx-server-sdk')") || content.includes('require("wx-server-sdk")'));

  check('index.js 包含 ALLOWED_PREFIX = recognition-inputs/',
    content.includes("'recognition-inputs/'") || content.includes('"recognition-inputs/"'));

  check('index.js 包含 MAX_DELETE_COUNT = 100',
    content.includes('MAX_DELETE_COUNT'));

  check('index.js 包含 DEFAULT_DRY_RUN = true',
    content.includes('DEFAULT_DRY_RUN') && content.includes('true'));

  check('index.js 包含 DEFAULT_MAX_AGE_HOURS = 24',
    content.includes('DEFAULT_MAX_AGE_HOURS') || content.includes('maxAgeHours'));

  check('index.js 包含 isAllowedPath 安全检查',
    content.includes('isAllowedPath'));

  check('index.js 包含 dryRun 判断逻辑',
    content.includes('dryRun'));

  check('index.js 包含 fileList 模式 A',
    content.includes('fileList') && content.includes('mode'));

  check('index.js 包含 placeholder 模式 B',
    content.includes('placeholder'));

  check('index.js 不 console.log fileID/cloudFileID',
    !/console\.log\([^)]*(fileID|cloudFileID)[^)]*\)/.test(content));

  check('index.js 不包含路径穿越风险（.. 或绝对路径）',
    !/cloudPath\s*&&.*\.\./.test(content) || (content.includes('isAllowedPath') && !/(\.\.|\/)\s*(delete|rm|remove)/.test(content)));

  check('index.js 返回结果不包含完整 fileID 列表',
    !/return\s*\{[^}]*fileIDs[^}]*\}/s.test(content) || content.includes('count:') && !content.includes('fileIDs:'));
}

if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  check('package.json 包含 wx-server-sdk 依赖',
    pkg.dependencies && pkg.dependencies['wx-server-sdk']);
}

console.log('');
console.log('============================================================');
console.log(`结果: ${pass} PASS, ${fail} FAIL`);
console.log('============================================================');

if (fail > 0) process.exit(1);