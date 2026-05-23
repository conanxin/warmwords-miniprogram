const mockVision = require('../../utils/mockVision.js');
const storage = require('../../utils/storage.js');
const audio = require('../../utils/audio.js');
const { uploadImageForRecognition, deleteCloudImage, markRecognitionUploadStatus } = require('../../utils/cloudImage.js');

// 云函数调用开关：false=使用本地 Mock，true=尝试调用云函数 recognizeObject
// 生产环境上线前应确保云函数已部署且环境变量已配置
const ENABLE_CLOUD_RECOGNITION = true;

Page({
  data: {
    imagePath: '',
    word: null,
    saved: false,
    currentLang: 'en'
  },

  onLoad(options) {
    const imagePath = options.imagePath ? decodeURIComponent(options.imagePath) : '';
    console.log('[Result] Page loaded with imagePath:', imagePath);
    this.setData({ imagePath });

    this._recognize(imagePath);
  },

  async _recognize(imagePath) {
    if (!ENABLE_CLOUD_RECOGNITION) {
      // 本地 Mock 模式
      const word = mockVision.recognize(imagePath);
      console.log('[Result] Using local mock recognition');
      this.setData({ word });
      this._logSoundHint(word);
      return;
    }

    // 云函数模式
    console.log('[Result] Using cloud recognition');
    // 防御：wx.cloud 不可用时直接 fallback
    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      console.warn('[Result] wx.cloud unavailable, fallback to local mock');
      this._fallbackToMock(imagePath);
      return;
    }

    // 尝试上传图片到云存储
    let cloudUpload = null;
    let cloudFileID = null;
    let uploadIndexId = null;
    try {
      console.log('[Result] Uploading image for cloud recognition');
      cloudUpload = await uploadImageForRecognition(imagePath);
      console.log('[Result] Image uploaded for recognition');
    } catch (uploadErr) {
      console.warn('[Result] Image upload failed, fallback to cloud mock:', uploadErr.message);
    }

    try {
      const callData = {
        imagePath,
        useProvider: true
      };
      if (cloudUpload && cloudUpload.ok) {
        cloudFileID = cloudUpload.cloudFileID;
        uploadIndexId = cloudUpload.uploadIndexId || null;
        callData.cloudFileID = cloudFileID;
        callData.cloudPath = cloudUpload.cloudPath;
      }

      const res = await wx.cloud.callFunction({
        name: 'recognizeObject',
        data: callData
      });

      const result = res.result;
      if (result.ok) {
        console.log('[Result] Cloud recognition success, mode:', result.mode);
        this.setData({ word: result.word });
        this._logSoundHint(result.word);
        // 标记索引状态为已识别
        if (uploadIndexId) {
          markRecognitionUploadStatus(uploadIndexId, 'recognized');
        }
      } else {
        console.warn('[Result] Cloud recognition returned error, fallback to local mock:', result.error);
        this._fallbackToMock(imagePath);
      }
    } catch (err) {
      console.warn('[Result] Cloud recognition exception, fallback to local mock:', err.message);
      this._fallbackToMock(imagePath);
    } finally {
      // 识别完成后尝试删除云存储临时图片，不影响结果展示
      if (cloudFileID) {
        try {
          const deleteResult = await deleteCloudImage(cloudFileID, { uploadIndexId });
          if (deleteResult.ok && deleteResult.deleted) {
            console.log('[Result] Cloud image cleanup success');
          } else {
            console.log('[Result] Cloud image cleanup skipped or failed:', deleteResult.reason || 'unknown');
          }
        } catch (deleteErr) {
          console.log('[Result] Cloud image cleanup skipped or failed: delete_error');
        }
      }
    }
  },

  _fallbackToMock(imagePath) {
    const word = mockVision.recognize(imagePath);
    console.log('[Result] Cloud recognition failed, fallback to local mock');
    this.setData({ word });
    this._logSoundHint(word);
  },

  _logSoundHint(word) {
    if (word) {
      console.log('[Result] Sound hint for', word.en, ':', word.soundHint);
    }
  },

  onReady() {
    const word = this.data.word;
    if (word) {
      console.log('[Result] Sound hint for', word.en, ':', word.soundHint);
    }
  },

  playPronunciation() {
    const word = this.data.word;
    if (!word) return;

    // Use TTS cloud function if available, else fallback to text hint
    const displayText = `${word.en} /${word.phonetic}/`;
    console.log('[Result] Play pronunciation:', displayText);

    audio.play(word.en, this.data.currentLang).catch(err => {
      console.warn('[Result] Audio play failed, fallback to toast:', err.message);
      wx.showToast({
        title: `🔊 ${displayText}`,
        icon: 'none',
        duration: 2000
      });
    });
  },

  saveToLibrary() {
    const word = this.data.word;
    if (!word) return;

    const ok = storage.saveWord(word);
    if (ok) {
      this.setData({ saved: true });
      wx.showToast({
        title: '已放进你的贴纸书 📚',
        icon: 'success',
        duration: 1500
      });
    } else {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  takeAnother() {
    wx.navigateBack();
  },

  switchLang(e) {
    const lang = e.currentTarget.dataset.lang;
    this.setData({ currentLang: lang });
  }
});