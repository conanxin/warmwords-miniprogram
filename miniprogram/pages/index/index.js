Page({
  data: {
    productName: '拍词贴',
    slogan: '看到什么，拍一下，变成你的单词贴纸。',
    subSlogan: '和孩子一起，把上学路、厨房、公园和旅行\n变成一本会说话的词汇书。'
  },

  onLoad() {
    console.log('[Index] Page loaded');
  },

  chooseMedia() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('[Index] Camera image selected:', tempFilePath);
        this.navigateToResult(tempFilePath);
      },
      fail: (err) => {
        console.warn('[Index] Camera failed:', err);
        this.chooseImageFallback();
      }
    });
  },

  chooseAlbum() {
    wx.chooseImage({
      count: 1,
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        console.log('[Index] Album image selected:', tempFilePath);
        this.navigateToResult(tempFilePath);
      },
      fail: (err) => {
        console.warn('[Index] Album failed:', err);
        wx.showToast({ title: '访问失败，请在设置中开启相册权限', icon: 'none', duration: 2500 });
      }
    });
  },

  chooseImageFallback() {
    try {
      wx.chooseImage({
        count: 1,
        sourceType: ['camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          console.log('[Index] Fallback camera image:', tempFilePath);
          this.navigateToResult(tempFilePath);
        },
        fail: () => {
          wx.showToast({ title: '无法访问相机，请在设置中开启权限', icon: 'none', duration: 2500 });
        }
      });
    } catch (e) {
      console.error('[Index] Fallback exception:', e);
      this.navigateToResult('/mock/image_' + Date.now() + '.jpg');
    }
  },

  navigateToResult(imagePath) {
    if (imagePath) {
      wx.navigateTo({
        url: `/pages/result/result?imagePath=${encodeURIComponent(imagePath)}`
      });
    } else {
      wx.navigateTo({
        url: '/pages/result/result?imagePath=mock_demo.jpg'
      });
    }
  }
});