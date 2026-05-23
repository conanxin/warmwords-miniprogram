/**
 * Storage 工具 - 本地贴纸书存取
 */

const LIBRARY_KEY = 'warmwords_library';
const REVIEW_LOG_KEY = 'warmwords_review_log';

/**
 * 获取词库
 */
function getLibrary() {
  try {
    const data = wx.getStorageSync(LIBRARY_KEY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[Storage] Failed to get library:', e);
    return [];
  }
}

/**
 * 保存词卡到贴纸书
 */
function saveWord(word) {
  try {
    const library = getLibrary();

    // 检查是否已存在
    const exists = library.some(w => w.id === word.id && w.en === word.en);
    if (exists) {
      console.log('[Storage] Word already saved:', word.en);
      return false;
    }

    // 添加时间戳和复习数据
    const wordWithMeta = {
      ...word,
      savedAt: Date.now(),
      reviewCount: 0,
      nextReviewAt: Date.now(), // 立即可复习
      lastReviewedAt: null
    };

    library.unshift(wordWithMeta);
    wx.setStorageSync(LIBRARY_KEY, library);
    console.log('[Storage] Word saved:', word.en, 'total:', library.length);
    return true;
  } catch (e) {
    console.error('[Storage] Failed to save word:', e);
    return false;
  }
}

/**
 * 清空贴纸书
 */
function clearLibrary() {
  try {
    wx.removeStorageSync(LIBRARY_KEY);
    console.log('[Storage] Library cleared');
    return true;
  } catch (e) {
    console.error('[Storage] Failed to clear library:', e);
    return false;
  }
}

/**
 * 获取复习记录
 */
function getReviewLog() {
  try {
    const data = wx.getStorageSync(REVIEW_LOG_KEY);
    return data || {};
  } catch (e) {
    return {};
  }
}

/**
 * 更新词卡复习状态
 */
function updateWordReview(wordId, reviewResult) {
  try {
    const library = getLibrary();
    const idx = library.findIndex(w => w.id === wordId);

    if (idx === -1) {
      console.warn('[Storage] Word not found for review update:', wordId);
      return false;
    }

    const now = Date.now();
    let nextReviewAt;

    if (reviewResult === 'known') {
      // 认识：3天后复习
      nextReviewAt = now + 3 * 24 * 60 * 60 * 1000;
    } else {
      // 不熟：明天复习
      nextReviewAt = now + 1 * 24 * 60 * 60 * 1000;
    }

    library[idx].reviewCount = (library[idx].reviewCount || 0) + 1;
    library[idx].lastReviewedAt = now;
    library[idx].nextReviewAt = nextReviewAt;

    wx.setStorageSync(LIBRARY_KEY, library);
    console.log('[Storage] Review updated:', wordId, reviewResult, 'next:', new Date(nextReviewAt).toLocaleDateString());
    return true;
  } catch (e) {
    console.error('[Storage] Failed to update review:', e);
    return false;
  }
}

module.exports = {
  getLibrary,
  saveWord,
  clearLibrary,
  getReviewLog,
  updateWordReview
};