const storage = require('../../utils/storage.js');
const review = require('../../utils/review.js');

Page({
  data: {
    dueWords: [],
    isEmpty: true,
    todayEncouragement: ''
  },

  onShow() {
    this.loadReviewWords();
  },

  loadReviewWords() {
    const allWords = storage.getLibrary();
    const dueWords = review.getDueWords(allWords);

    const encouragements = [
      '太棒了，今天没有要复习的词！🎉',
      '学得真好！休息一下或者去拍新单词吧 ✨',
      '今日复习已完成，继续保持！🌟',
      '没有待复习的贴纸，去探索世界吧 🌍'
    ];

    this.setData({
      dueWords,
      isEmpty: dueWords.length === 0,
      todayEncouragement: encouragements[Math.floor(Math.random() * encouragements.length)]
    });

    console.log('[Review] Due words:', dueWords.length);
  },

  markKnown(e) {
    const id = e.currentTarget.dataset.id;
    review.markWord(id, 'known');
    this.loadReviewWords();
    wx.showToast({ title: '太棒了，3 天后再见 🎯', icon: 'success', duration: 1500 });
  },

  markLearning(e) {
    const id = e.currentTarget.dataset.id;
    review.markWord(id, 'learning');
    this.loadReviewWords();
    wx.showToast({ title: '没关系，明天再练一次 📝', icon: 'none', duration: 1500 });
  }
});