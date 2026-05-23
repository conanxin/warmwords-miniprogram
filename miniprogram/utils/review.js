/**
 * Review 工具 - 简单间隔复习逻辑
 */

const storage = require('./storage.js');

/**
 * 获取今日需要复习的词卡
 */
function getDueWords(allWords) {
  if (!allWords || allWords.length === 0) {
    return [];
  }

  const now = Date.now();

  // 筛选出到期的词卡（nextReviewAt <= now）
  const due = allWords.filter(word => {
    const nextReview = word.nextReviewAt || 0;
    return nextReview <= now && nextReview > 0;
  });

  // 优先排序：未复习过的 > 很久没复习的
  return due.sort((a, b) => {
    // 未复习过的排前面
    if (!a.lastReviewedAt && b.lastReviewedAt) return -1;
    if (a.lastReviewedAt && !b.lastReviewedAt) return 1;

    // 按复习次数升序（次数少的先复习）
    if (a.reviewCount !== b.reviewCount) {
      return (a.reviewCount || 0) - (b.reviewCount || 0);
    }

    // 按上次复习时间降序（早复习的先复习）
    return (a.lastReviewedAt || 0) - (b.lastReviewedAt || 0);
  });
}

/**
 * 标记词卡复习结果
 * @param {string} wordId - 词卡 id
 * @param {string} result - 'known' | 'learning'
 */
function markWord(wordId, result) {
  return storage.updateWordReview(wordId, result);
}

/**
 * 计算下次复习时间（用于显示）
 */
function getNextReviewTime(word) {
  if (!word || !word.nextReviewAt) return null;

  const now = Date.now();
  const diff = word.nextReviewAt - now;

  if (diff <= 0) return '现在';

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) return `${days} 天后`;
  if (hours > 0) return `${hours} 小时后`;
  return '很快';
}

module.exports = {
  getDueWords,
  markWord,
  getNextReviewTime
};