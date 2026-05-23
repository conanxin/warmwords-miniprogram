/**
 * 云函数：cleanupRecognitionImages
 *
 * 清理云存储 recognition-inputs/ 下超过指定时间的临时识别图片。
 * 作为前端 deleteFile 失败时的兜底清理机制。
 *
 * 安全边界：
 * - 只允许清理 prefix 以 recognition-inputs/ 开头的路径
 * - 默认 dryRun=true，需要明确传入 dryRun=false 才执行删除
 * - 单次最多删除 100 个文件
 * - 不打印完整 fileID / cloudFileID
 * - 不删除 recognition-inputs/ 以外的任何路径
 *
 * 模式 A：manual fileList cleanup
 *   event = {
 *     fileList: [{ fileID, cloudPath, uploadedAt }],
 *     dryRun: true/false,
 *     maxAgeHours: 24
 *   }
 *
 * 模式 B：placeholder（自动扫描暂不实现）
 *   - 如果 event.fileList 缺失，返回 placeholder 模式说明
 *
 * 模式 C：index 模式（从云数据库查询过期记录）
 *   event = {
 *     mode: 'index',
 *     dryRun: true/false,
 *     maxAgeHours: 24
 *   }
 *   - 查询 recognition_uploads 集合中 status IN ['uploaded','recognized']
 *     且 uploadedAt < (now - maxAgeHours) 的记录
 *   - 返回候选项数量和详情（供人工确认后执行删除）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ALLOWED_PREFIX = 'recognition-inputs/';
const MAX_DELETE_COUNT = 100;
const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_DRY_RUN = true;
const COLLECTION_NAME = 'recognition_uploads';

/**
 * 判断 cloudPath 是否安全（以 ALLOWED_PREFIX 开头）
 */
function isAllowedPath(cloudPath) {
  if (!cloudPath || typeof cloudPath !== 'string') return false;
  if (!cloudPath.startsWith(ALLOWED_PREFIX)) return false;
  if (cloudPath.includes('..') || cloudPath.startsWith('/')) return false;
  return true;
}

/**
 * 判断 uploadedAt 是否超过 maxAgeHours
 */
function isExpired(uploadedAt, maxAgeHours) {
  if (!uploadedAt) return false;
  const uploadTime = new Date(uploadedAt).getTime();
  if (isNaN(uploadTime)) return false;
  const ageHours = (Date.now() - uploadTime) / (1000 * 60 * 60);
  return ageHours > maxAgeHours;
}

/**
 * 模式 C：从云数据库查询过期记录
 */
async function runIndexMode(dryRun, maxAgeHours) {
  const db = cloud.database();
  const now = Date.now();
  const cutoff = new Date(now - maxAgeHours * 3600000);

  // 查询已过期的上传索引记录
  const queryResult = await db.collection(COLLECTION_NAME)
    .where({
      status: db.command.in(['uploaded', 'recognized']),
      uploadedAt: db.command.lt(cutoff)
    })
    .limit(MAX_DELETE_COUNT)
    .get();

  const records = (queryResult.data || []);
  if (records.length === 0) {
    return {
      ok: true,
      mode: 'index',
      dryRun,
      maxAgeHours,
      count: 0,
      candidates: [],
      message: 'No expired records found.'
    };
  }

  // 构建候选项（安全过滤 + 只返回必要字段）
  const candidates = [];
  for (const rec of records) {
    if (!rec.cloudFileID || !rec.cloudPath) continue;
    if (!isAllowedPath(rec.cloudPath)) continue;
    // cloudFileID 完整保存在 candidates 中用于删除，但不打印完整值
    candidates.push({
      _id: rec._id,
      cloudFileID: rec.cloudFileID,
      cloudPath: rec.cloudPath,
      uploadedAt: rec.uploadedAt,
      status: rec.status
    });
  }

  if (dryRun) {
    return {
      ok: true,
      mode: 'index',
      dryRun: true,
      maxAgeHours,
      count: candidates.length,
      candidates: candidates.map(c => ({
        _id: c._id,
        cloudPath: c.cloudPath,
        uploadedAt: c.uploadedAt,
        status: c.status
        // cloudFileID 不在 dryRun 返回值中
      })),
      message: `Dry run: ${candidates.length} expired record(s) found. No deletion performed.`
    };
  }

  // 执行删除
  const fileIDs = candidates.map(c => c.cloudFileID);
  try {
    const deleteResult = await cloud.deleteFile({ fileList: fileIDs });
    const fileList = deleteResult.fileList || [];
    const successIds = [];
    const failIds = [];
    for (let i = 0; i < fileList.length; i++) {
      if (fileList[i].status === 0) {
        successIds.push(candidates[i]._id);
      } else {
        failIds.push(candidates[i]._id);
      }
    }

    // 更新数据库状态
    const batch = db.collection(COLLECTION_NAME);
    const nowDate = new Date();
    if (successIds.length > 0) {
      for (const id of successIds) {
        await batch.doc(id).update({
          data: { status: 'deleted', deletedAt: nowDate }
        });
      }
    }
    if (failIds.length > 0) {
      for (const id of failIds) {
        await batch.doc(id).update({
          data: { status: 'cleanup_failed', lastError: 'delete_failed', cleanupAttempts: 1 }
        });
      }
    }

    return {
      ok: true,
      mode: 'index',
      dryRun: false,
      maxAgeHours,
      deletedCount: successIds.length,
      failedCount: failIds.length,
      message: `Deleted ${successIds.length} file(s), ${failIds.length} failed.`
    };
  } catch (err) {
    return {
      ok: false,
      mode: 'index',
      dryRun: false,
      maxAgeHours,
      error: 'delete_failed',
      message: err.message || 'Delete operation failed.'
    };
  }
}

exports.main = async (event, context) => {
  // 定时触发器不传 event，安全默认值
  if (!event || typeof event !== 'object') event = {};
  if (event.mode === undefined) event.mode = 'index';

  const dryRun = event.dryRun !== undefined ? Boolean(event.dryRun) : DEFAULT_DRY_RUN;
  const maxAgeHours = event.maxAgeHours !== undefined ? Number(event.maxAgeHours) : DEFAULT_MAX_AGE_HOURS;

  // 模式 C：index 模式
  if (event.mode === 'index') {
    return runIndexMode(dryRun, maxAgeHours);
  }

  // 模式 A：manual fileList cleanup
  if (event.fileList && Array.isArray(event.fileList)) {
    const candidates = [];
    for (const item of event.fileList) {
      if (!item.cloudPath || !isAllowedPath(item.cloudPath)) continue;
      if (!isExpired(item.uploadedAt, maxAgeHours)) continue;
      candidates.push(item);
    }

    const count = candidates.length;
    if (count === 0) {
      return { ok: true, mode: 'manual', dryRun, maxAgeHours, count: 0, message: 'No files to delete.' };
    }
    if (count > MAX_DELETE_COUNT) {
      return {
        ok: false, mode: 'manual', dryRun, maxAgeHours, count,
        message: `Too many candidates (${count}). Maximum: ${MAX_DELETE_COUNT}.`
      };
    }

    const fileIDs = candidates.map(item => item.fileID).filter(Boolean);
    if (dryRun) {
      return {
        ok: true, mode: 'manual', dryRun: true, maxAgeHours,
        count: fileIDs.length,
        message: `Dry run: would delete ${fileIDs.length} file(s).`
      };
    }

    try {
      const deleteResult = await cloud.deleteFile({ fileList: fileIDs });
      let successCount = 0;
      let failCount = 0;
      if (Array.isArray(deleteResult.fileList)) {
        for (const r of deleteResult.fileList) {
          if (r.status === 0) successCount++;
          else failCount++;
        }
      }
      return {
        ok: true, mode: 'manual', dryRun: false, maxAgeHours,
        deletedCount: successCount, failedCount: failCount,
        message: `Deleted ${successCount} file(s), ${failCount} failed.`
      };
    } catch (err) {
      return { ok: false, mode: 'manual', dryRun: false, maxAgeHours, error: 'delete_failed', message: 'Failed.' };
    }
  }

  // 模式 B：placeholder
  return {
    ok: true,
    mode: 'placeholder',
    dryRun,
    maxAgeHours,
    message:
      'Automatic storage listing is not implemented. ' +
      'Provide event.fileList (mode A) or event.mode="index" (mode C). ' +
      'Future: recognition_uploads index collection enables automatic expired record scanning.'
  };
};