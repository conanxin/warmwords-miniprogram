/**
 * Audio 工具 - 真实 TTS 云函数 + fallback
 *
 * play(text, lang):
 *   1. 调用 tts 云函数
 *   2. mode=audio → 下载临时 URL 并播放
 *   3. fallback=true → 显示"发音提示"弹窗
 *
 * 安全约束：
 * - 不保存 API Key
 * - 不打印完整 audioFileID / tempFileURL / base64
 * - 只打印安全摘要：fileID length、URL length、errCode、errMsg short
 */

/**
 * @typedef {Object} TTSSafeSummary
 * @property {boolean} ok
 * @property {string} mode
 * @property {boolean} fallback
 * @property {boolean} hasAudioFileID
 * @property {number} audioFileIDLength
 * @property {string} codec
 * @property {string} stage
 * @property {string} reason
 */

/**
 * Truncate a string safely for logging (no secrets, max 80 chars).
 * @param {string} str
 * @returns {string}
 */
function safeShort(str) {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, 80);
}

// --- Module-level audio context to avoid premature GC ---
let currentAudio = null;

/**
 * Play pronunciation for a word.
 * @param {string} text - Word text (e.g. "apple")
 * @param {string} lang - Language code (default "en")
 * @returns {Promise<void>}
 */
function play(text, lang = 'en') {
  if (!text || typeof text !== 'string') return Promise.resolve();

  const safeText = text.trim().slice(0, 80);
  if (safeText.length === 0) return Promise.resolve();

  // Show loading toast
  wx.showLoading({ title: '正在准备发音…', mask: true });

  return wx.cloud.callFunction({
    name: 'tts',
    data: { text: safeText, lang }
  }).then(res => {
    const result = res.result || {};

    // Explicit fallback flag
    if (result.fallback === true) {
      /** @type {TTSSafeSummary} */
      const diag = {
        ok: result.ok,
        mode: result.mode || 'unknown',
        fallback: true,
        hasAudioFileID: Boolean(result.audioFileID),
        audioFileIDLength: result.audioFileID ? result.audioFileID.length : 0,
        codec: result.codec || 'mp3',
        stage: result.stage || 'unknown',
        reason: result.reason || 'unknown',
        providerCode: result.providerCode || ''
      };
      if (result.providerMessageShort) {
        diag.providerMessageShort = safeShort(result.providerMessageShort);
      }
      console.warn('[Audio] TTS fallback', JSON.stringify(diag));

      wx.hideLoading();
      return showFallbackModal(safeText);
    }

    // Success: mode=audio and audioFileID present
    if (result.mode === 'audio' && result.audioFileID) {
      /** @type {TTSSafeSummary} */
      const diag = {
        ok: result.ok,
        mode: result.mode || 'unknown',
        fallback: false,
        hasAudioFileID: true,
        audioFileIDLength: result.audioFileID.length,
        codec: result.codec || 'mp3',
        stage: result.stage || 'unknown',
        reason: result.reason || 'unknown'
      };
      console.log('[Audio] TTS response', JSON.stringify(diag));

      return downloadAndPlay(result.audioFileID, safeText);
    }

    // Unexpected: fall back gracefully
    console.warn('[Audio] Unexpected TTS response mode, fallback to hint');
    wx.hideLoading();
    return showFallbackModal(safeText);
  }).catch(err => {
    wx.hideLoading();
    // Cloud function call failed — log minimal, no stack
    console.warn('[Audio] TTS call failed, fallback to hint');
    return showFallbackModal(safeText);
  });
}

/**
 * Download temp URL and play audio via InnerAudioContext.
 * Uses module-level currentAudio to avoid premature GC.
 * @param {string} audioFileID - WeChat cloud file ID
 */
function downloadAndPlay(audioFileID, fallbackText) {
  return wx.cloud.getTempFileURL({
    fileList: [audioFileID]
  }).then(res => {
    const fileList = res.fileList || [];
    const item = fileList[0];

    /** @type {object} */
    const urlDiag = {
      hasUrl: Boolean(item && item.tempFileURL),
      urlLength: (item && item.tempFileURL) ? item.tempFileURL.length : 0,
      status: item ? item.status : 'unknown',
      errMsg: item ? safeShort(item.errMsg || '') : 'no_item'
    };
    console.log('[Audio] temp URL ready', JSON.stringify(urlDiag));

    if (!item || item.status !== 0 || !item.tempFileURL) {
      throw new Error('temp_url_unavailable');
    }

    const tempFileURL = item.tempFileURL;

    // Destroy any existing audio context to avoid GC issues
    if (currentAudio) {
      try { currentAudio.stop(); currentAudio.destroy(); } catch (_) {}
      currentAudio = null;
    }

    currentAudio = wx.createInnerAudioContext();
    const audioCtx = currentAudio;

    // Set src and allow background playback on devices that support it
    audioCtx.src = tempFileURL;
    audioCtx.obeyMuteSwitch = false;

    console.log('[Audio] play requested', { hasSrc: Boolean(audioCtx.src) });

    return new Promise((resolve, reject) => {
      audioCtx.onPlay(() => {
        console.log('[Audio] playback started');
        wx.hideLoading();
        resolve();
      });

      audioCtx.onEnded(() => {
        console.log('[Audio] playback ended');
        try { audioCtx.destroy(); } catch (_) {}
        currentAudio = null;
        resolve();
      });

      audioCtx.onStop(() => {
        console.log('[Audio] playback stopped');
        try { audioCtx.destroy(); } catch (_) {}
        currentAudio = null;
        resolve();
      });

      audioCtx.onError(err => {
        /** @type {object} */
        const errDiag = {
          errCode: err.errCode !== undefined ? err.errCode : 'unknown',
          errMsg: safeShort(err.errMsg || 'unknown')
        };
        console.warn('[Audio] playback failed', JSON.stringify(errDiag));
        try { audioCtx.destroy(); } catch (_) {}
        currentAudio = null;
        wx.hideLoading();
        showFallbackModalFromError();
        reject(new Error(errDiag.errMsg));
      });

      // Safety timeout — stop after 12 seconds max
      setTimeout(() => {
        try {
          if (currentAudio === audioCtx) {
            audioCtx.stop();
            audioCtx.destroy();
            currentAudio = null;
          }
        } catch (_) {}
        resolve();
      }, 12000);

      audioCtx.play();
    });
  }).catch(err => {
    wx.hideLoading();
    console.warn('[Audio] getTempFileURL failed, fallback to hint');
    return showFallbackModal(fallbackText || '发音');
  });
}

/**
 * Show fallback pronunciation hint modal (success case).
 * @param {string} text - Word text
 */
function showFallbackModal(text) {
  wx.showModal({
    title: '🔊 发音',
    content: `${text}\n\n可以和孩子一起慢慢读一遍哦 😊`,
    showCancel: false,
    buttonText: '好的'
  });
  return Promise.resolve();
}

/**
 * Show fallback modal when audio play fails.
 */
function showFallbackModalFromError() {
  wx.showModal({
    title: '🔊 发音',
    content: '发音暂时不可用，你可以和孩子一起读一遍 😊',
    showCancel: false,
    buttonText: '好的'
  });
}

/**
 * Stop any active audio and destroy the context.
 * @returns {Promise<void>}
 */
function stop() {
  if (currentAudio) {
    try { currentAudio.stop(); currentAudio.destroy(); } catch (_) {}
    currentAudio = null;
  }
  return Promise.resolve();
}

/**
 * Check if TTS cloud function is callable.
 * @returns {boolean}
 */
function isAvailable() {
  return !!(wx && wx.cloud && typeof wx.cloud.callFunction === 'function');
}

module.exports = {
  play,
  stop,
  isAvailable
};