App({
  onLaunch() {
    // 初始化本地存储
    const library = wx.getStorageSync('warmwords_library') || [];
    const reviewLog = wx.getStorageSync('warmwords_review_log') || {};
    console.log('[WarmWords] App launched, library count:', library.length);

    // 初始化微信云开发
    if (wx.cloud && typeof wx.cloud.init === 'function') {
      wx.cloud.init({
        traceUser: true
      });
      console.log('[WarmWords] wx.cloud initialized');
    } else {
      console.warn('[WarmWords] wx.cloud unavailable; cloud recognition disabled');
    }
  }
});