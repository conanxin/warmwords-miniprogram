#!/usr/bin/env node
/**
 * recognition_uploads index 静态检查脚本
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const cloudImagePath = path.join(ROOT, 'miniprogram/utils/cloudImage.js');
const resultPath = path.join(ROOT, 'miniprogram/pages/result/result.js');
const cleanupPath = path.join(ROOT, 'cloudfunctions/cleanupRecognitionImages/index.js');
const designDoc = path.join(ROOT, 'docs/PHASE_3G_RECOGNITION_UPLOADS_INDEX.md');

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
console.log('recognition_uploads index 静态检查');
console.log('============================================================');

check('cloudImage.js 存在', fs.existsSync(cloudImagePath));
check('result.js 存在', fs.existsSync(resultPath));
check('cleanupRecognitionImages/index.js 存在', fs.existsSync(cleanupPath));
check('PHASE_3G_RECOGNITION_UPLOADS_INDEX.md 存在', fs.existsSync(designDoc));

if (fs.existsSync(cloudImagePath)) {
  const content = fs.readFileSync(cloudImagePath, 'utf8');
  check('cloudImage.js 使用 recognition_uploads', content.includes('recognition_uploads'));
  check('uploadImageForRecognition 写入 status=uploaded', content.includes("status:") && content.includes('uploaded'));
  check('deleteCloudImage 支持 uploadIndexId', content.includes('uploadIndexId'));
  check('cloudImage.js 不 console.log cloudFileID', !/console\.log\([^)]*cloudFileID[^)]*\)/.test(content));
}

if (fs.existsSync(resultPath)) {
  const content = fs.readFileSync(resultPath, 'utf8');
  check('result.js cloudFileID 不写入 storage', !/wx\.setStorageSync\([^)]*cloudFileID/.test(content));
  check('result.js 调用 deleteCloudImage 传入 uploadIndexId', content.includes('uploadIndexId'));
}

if (fs.existsSync(cleanupPath)) {
  const content = fs.readFileSync(cleanupPath, 'utf8');
  check('cleanupRecognitionImages 支持 mode=index', content.includes("mode") && (content.includes("'index'") || content.includes('"index"')));
  check('cleanupRecognitionImages 查询 recognition_uploads', content.includes('recognition_uploads'));
  check('cleanupRecognitionImages 默认 dryRun=true', content.includes('DEFAULT_DRY_RUN') || content.includes('dryRun'));
  check('cleanupRecognitionImages 限制 recognition-inputs/ 前缀', content.includes('recognition-inputs/'));
  check('cleanupRecognitionImages 不 console.log cloudFileID', !/console\.log\([^)]*cloudFileID[^)]*\)/.test(content));
}

console.log('');
console.log('============================================================');
console.log(`结果: ${pass} PASS, ${fail} FAIL`);
console.log('============================================================');

if (fail > 0) process.exit(1);