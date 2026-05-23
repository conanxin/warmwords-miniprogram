/**
 * 微信云存储图片上传工具
 * 
 * 用于将小程序临时图片上传到微信云存储，
 * 供云函数识别使用。
 * 
 * 安全边界：
 * - cloudPath 使用随机文件名，不使用用户原始文件名
 * - 不在持久 storage 中记录 cloudFileID
 * - console 日志不输出完整本地路径，只输出状态
 * - 儿童图片需最小化上传和保存
 * - 不保存原始文件名、base64 或儿童个人信息
 */

/**
 * 上传图片到微信云存储，用于云函数识别
 * @param {string} imagePath - 小程序临时图片路径
 * @returns {Promise<{
 *   ok: boolean,
 *   cloudFileID?: string,
 *   cloudPath?: string,
 *   uploadIndexOk?: boolean,
 *   uploadIndexId?: string,
 *   error?: string
 * }>}
 */
function uploadImageForRecognition(imagePath) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.uploadFile !== 'function') {
      reject(new Error('wx.cloud.uploadFile 不可用'));
      return;
    }

    if (!imagePath) {
      reject(new Error('imagePath 为空'));
      return;
    }

    // 生成日期前缀的 cloudPath，使用随机文件名
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const randomId = Math.random().toString(36).slice(2, 10);
    const cloudPath = `recognition-inputs/${y}${m}${d}/${randomId}.jpg`;

    console.log('[cloudImage] Uploading image for cloud recognition');

    wx.cloud.uploadFile({
      cloudPath,
      filePath: imagePath,
      success(res) {
        console.log('[cloudImage] Image uploaded for recognition');

        // 尝试写入上传索引（不影响识别流程）
        let uploadIndexOk = false;
        let uploadIndexId = null;

        try {
          const db = wx.cloud.database();
          db.collection('recognition_uploads').add({
            data: {
              cloudFileID: res.fileID,
              cloudPath,
              uploadedAt: new Date(),
              status: 'uploaded',
              cleanupAttempts: 0,
              retentionHours: 24,
              source: 'frontend_upload'
            },
            success(addRes) {
              uploadIndexOk = true;
              uploadIndexId = addRes._id;
              console.log('[cloudImage] Upload index written');
              resolve({
                ok: true,
                cloudFileID: res.fileID,
                cloudPath,
                uploadIndexOk: true,
                uploadIndexId: addRes._id
              });
            },
            fail() {
              // 数据库写入失败不影响识别流程
              console.warn('[cloudImage] Upload index write failed, continuing');
              resolve({
                ok: true,
                cloudFileID: res.fileID,
                cloudPath,
                uploadIndexOk: false
              });
            }
          });
        } catch (e) {
          // 异常捕获，确保识别流程不受影响
          console.warn('[cloudImage] Upload index exception:', e.message || e.errMsg || e);
          resolve({
            ok: true,
            cloudFileID: res.fileID,
            cloudPath,
            uploadIndexOk: false
          });
        }
      },
      fail(err) {
        console.warn('[cloudImage] Upload failed:', err.message || err.errMsg);
        reject(new Error(err.message || err.errMsg || '上传失败'));
      }
    });
  });
}

/**
 * 删除云存储中的临时图片
 * @param {string} cloudFileID - 云存储 fileID
 * @param {Object} options - 可选参数
 * @param {string} options.uploadIndexId - 上传索引记录 _id，用于更新状态
 * @param {string} options.status - 删除后更新状态（默认 "deleted"）
 * @returns {Promise<{ok: boolean, deleted?: boolean, reason?: string}>}
 */
function deleteCloudImage(cloudFileID, options) {
  options = options || {};
  const uploadIndexId = options.uploadIndexId || null;
  const targetStatus = options.status || 'deleted';

  return new Promise((resolve) => {
    if (!cloudFileID) {
      resolve({ ok: false, deleted: false, reason: 'missing_cloud_file_id' });
      return;
    }

    if (!wx.cloud || typeof wx.cloud.deleteFile !== 'function') {
      console.warn('[cloudImage] wx.cloud.deleteFile unavailable');
      resolve({ ok: false, deleted: false, reason: 'cloud_delete_unavailable' });
      return;
    }

    wx.cloud.deleteFile({
      fileList: [cloudFileID],
      success() {
        console.log('[cloudImage] Deleted cloud image');
        // 更新索引状态
        if (uploadIndexId) {
          _updateUploadIndex(uploadIndexId, { status: targetStatus, deletedAt: new Date() });
        }
        resolve({ ok: true, deleted: true });
      },
      fail(err) {
        console.warn('[cloudImage] Delete failed:', err.message || err.errMsg);
        // 更新索引：增加清理尝试次数
        if (uploadIndexId) {
          _updateUploadIndex(uploadIndexId, {
            status: 'uploaded',
            cleanupAttempts: 1,
            lastError: err.message || err.errMsg || 'delete_failed'
          }, true /* increment cleanupAttempts */);
        }
        resolve({ ok: false, deleted: false, reason: 'delete_failed' });
      }
    });
  });
}

/**
 * 更新上传索引记录状态
 * @param {string} uploadIndexId - 索引记录 _id
 * @param {Object} data - 要更新的字段
 * @param {boolean} incrementCleanupAttempts - 是否增加 cleanupAttempts
 */
function _updateUploadIndex(uploadIndexId, data, incrementCleanupAttempts) {
  try {
    const db = wx.cloud.database();
    const collection = db.collection('recognition_uploads');
    collection.doc(uploadIndexId).update({
      data: (() => {
        const updateData = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.deletedAt !== undefined) updateData.deletedAt = data.deletedAt;
        if (data.lastError !== undefined) updateData.lastError = data.lastError;
        return updateData;
      })(),
      fail() {
        console.warn('[cloudImage] Failed to update upload index');
      }
    });
  } catch (e) {
    console.warn('[cloudImage] Upload index update exception');
  }
}

/**
 * 标记识别上传记录状态
 * @param {string} uploadIndexId - 索引记录 _id
 * @param {string} status - 新状态
 * @param {Object} extra - 额外字段
 */
function markRecognitionUploadStatus(uploadIndexId, status, extra) {
  if (!uploadIndexId) return;
  try {
    const db = wx.cloud.database();
    const updateData = { status };
    if (extra) Object.assign(updateData, extra);
    db.collection('recognition_uploads').doc(uploadIndexId).update({
      data: updateData,
      fail() {
        console.warn('[cloudImage] Failed to mark upload status');
      }
    });
  } catch (e) {
    console.warn('[cloudImage] Mark upload status exception');
  }
}

module.exports = {
  uploadImageForRecognition,
  deleteCloudImage,
  markRecognitionUploadStatus
};