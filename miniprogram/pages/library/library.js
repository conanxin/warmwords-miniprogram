const storage = require('../../utils/storage.js');

Page({
  data: {
    words: [],
    isEmpty: true
  },

  onShow() {
    this.loadLibrary();
  },

  loadLibrary() {
    const words = storage.getLibrary();
    console.log('[Library] Loaded', words.length, 'words');
    this.setData({
      words,
      isEmpty: words.length === 0
    });
  },

  clearLibrary() {
    wx.showModal({
      title: '清空贴纸书',
      content: '确定要清空所有贴纸吗？清空后可以重新拍摄。',
      confirmText: '清空',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          storage.clearLibrary();
          this.setData({ words: [], isEmpty: true });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});