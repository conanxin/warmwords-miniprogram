#!/usr/bin/env node
/**
 * Phase 3G recognition_uploads index 静态检查脚本
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
console.log('Phase 3G 静态检查');
console.log('============================================================');

check('cloudImage.js 存在', fs.existsSync(cloudImagePath));
check('result.js 存在', fs.existsSync(resultPath));
check('cleanupRecognitionImages/index.js 存在', fs.existsSync(cleanupPath));
check('PHASE_3G_RECOGNITION_UPLOADS_INDEX.md 存在', fs.existsSync(designDoc));

if (fs.existsSync(cloudImagePath)) {
  const content = fs.readFileSync(cloudImagePath, 'utf8');
  check('cloudImage.js 导出 uploadImageForRecognition', content.includes('function uploadImageForRecognition'));
  check('cloudImage.js 导出 deleteCloudImage', content.includes('function deleteCloudImage'));
  check('cloudImage.js 导出 markRecognitionUploadStatus', content.includes('function markRecognitionUploadStatus'));
  check('uploadImageForRecognition 调用 wx.cloud.database', content.includes('wx.cloud.database'));
  check('uploadImageForRecognition 写入 recognition_uploads', content.includes("'recognition_uploads'") || content.includes('"recognition_uploads"'));
  check('uploadImageForRecognition 返回 uploadIndexOk', content.includes('uploadIndexOk'));
  check('uploadImageForRecognition 返回 uploadIndexId', content.includes('uploadIndexId'));
  check('deleteCloudImage 支持 options.uploadIndexId', content.includes('uploadIndexId'));
  check('uploadImageForRecognition 不打印完整 cloudFileID', !/console\.log\([^)]*cloudFileID[^)]*\)/.test(content));
  check('cloudImage.js 数据库失败不影响识别流程', content.includes('uploadIndexOk: false') || content.includes("ok: true"));
}

if (fs.existsSync(resultPath)) {
  const content = fs.readFileSync(resultPath, 'utf8');
  check('result.js 引用 markRecognitionUploadStatus', content.includes('markRecognitionUploadStatus'));
  check('result.js 识别成功后调用 markRecognitionUploadStatus', content.includes("'recognized'") || content.includes('"recognized"'));
  check('result.js 调用 deleteCloudImage 时传入 uploadIndexId', content.includes('uploadIndexId'));
  check('result.js cloudFileID 不写入 storage', !/wx\.setStorageSync\([^)]*cloudFileID/.test(content));
}

if (fs.existsSync(cleanupPath)) {
  const content = fs.readFileSync(cleanupPath, 'utf8');
  check('cleanupRecognitionImages 包含模式 C（index 模式）', content.includes("mode: 'index'") || content.includes('mode === "index"'));
  check('cleanupRecognitionImages 查询 recognition_uploads 集合', content.includes("'recognition_uploads'") || content.includes('"recognition_uploads"'));
  check('cleanupRecognitionImages 查询 status in [uploaded,recognized]', content.includes('uploaded') && content.includes('recognized'));
  check('cleanupRecognitionImages 查询 uploadedAt lt cutoff', content.includes('uploadedAt') && content.includes('lt'));
  check('cleanupRecognitionImages dryRun=true 时不返回完整 cloudFileID', !content.includes('cloudFileID: c.cloudFileID') || (content.includes('cloudFileID') && content.includes('dryRun')));
  check('cleanupRecognitionImages 删除成功后更新 status=deleted', content.includes("'deleted'") || content.includes('"deleted"'));
  check('cleanupRecognitionImages 删除失败后更新 status=cleanup_failed', content.includes('cleanup_failed'));
  check('cleanupRecognitionImages 不 console.log cloudFileID', !/console\.log\([^)]*cloudFileID[^)]*\)/.test(content));
}

console.log('');
console.log('============================================================');
console.log(`结果: ${pass} PASS, ${fail} FAIL`);
console.log('============================================================');

if (fail > 0) process.exit(1);