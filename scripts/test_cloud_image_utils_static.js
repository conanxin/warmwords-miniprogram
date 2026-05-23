#!/usr/bin/env node
/**
 * cloudImage.js 静态检查脚本
 * 不依赖 wx 运行时，只做静态分析
 * 
 * 检查项：
 * 1. cloudImage.js 包含 uploadImageForRecognition
 * 2. cloudImage.js 包含 deleteCloudImage
 * 3. deleteCloudImage 中使用 wx.cloud.deleteFile
 * 4. result.js 引用了 deleteCloudImage
 * 5. result.js 包含 cleanup success / cleanup failed 日志
 * 6. result.js 不包含 wx.setStorageSync 保存 cloudFileID 的逻辑
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const cloudImagePath = path.join(ROOT, 'miniprogram/utils/cloudImage.js');
const resultPath = path.join(ROOT, 'miniprogram/pages/result/result.js');

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

const cloudImageContent = fs.readFileSync(cloudImagePath, 'utf8');
const resultContent = fs.readFileSync(resultPath, 'utf8');

console.log('============================================================');
console.log('cloudImage.js 静态检查');
console.log('============================================================');

check('cloudImage.js 包含 uploadImageForRecognition',
  cloudImageContent.includes('function uploadImageForRecognition'));

check('cloudImage.js 包含 deleteCloudImage',
  cloudImageContent.includes('function deleteCloudImage'));

check('deleteCloudImage 使用 wx.cloud.deleteFile',
  cloudImageContent.includes('wx.cloud.deleteFile'));

check('deleteCloudImage 返回 {ok, deleted, reason}',
  /\breturn\s*\{[^}]*ok[^}]*\}.*deleted/.test(cloudImageContent) ||
  cloudImageContent.includes('ok: false, deleted: false, reason:'));

check('deleteCloudCloud 不打印完整 cloudFileID',
  !/console\.log\([^)]*cloudFileID[^)]*\)/.test(cloudImageContent));

console.log('');
console.log('============================================================');
console.log('result.js 静态检查');
console.log('============================================================');

check('result.js 引用了 deleteCloudImage',
  resultContent.includes('deleteCloudImage'));

check('result.js 包含 cleanup success 日志',
  resultContent.includes('Cloud image cleanup success') ||
  resultContent.includes('cleanup success'));

check('result.js 包含 cleanup failed/skipped 日志',
  resultContent.includes('Cloud image cleanup skipped') ||
  resultContent.includes('cleanup skipped') ||
  resultContent.includes('Cloud image cleanup failed'));

check('result.js 在 finally 块中调用 deleteCloudImage',
  /finally\s*\{[\s\S]*deleteCloudImage/.test(resultContent));

check('result.js 不使用 wx.setStorageSync 保存 cloudFileID',
  !/wx\.setStorageSync\([^)]*cloudFileID/.test(resultContent) &&
  !/setStorageSync\([^)]*cloudFileID/.test(resultContent));

console.log('');
console.log('============================================================');
console.log(`结果: ${pass} PASS, ${fail} FAIL`);
console.log('============================================================');

if (fail > 0) process.exit(1);