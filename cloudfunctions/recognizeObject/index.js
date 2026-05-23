/**
 * 云函数：recognizeObject
 * 
 * 功能：接收小程序上传的图片，返回多语言词汇结构
 * 
 * AI 接入架构：
 * 1. 前端传递 imagePath、cloudFileID 或 imageBase64
 * 2. 如果 cloudFileID 存在，尝试下载图片 buffer
 * 3. 判断是否启用真实 AI（useProvider=true 且环境变量齐全）
 * 4. 优先调用 OpenAI-Compatible Vision Provider
 * 5. 失败则 fallback 到 Mock Provider
 * 6. 所有结果经过 normalizeWordResult 清洗后返回
 * 
 * 安全边界：
 * - API Key 不得放在 miniprogram 前端代码中
 * - 所有 AI 调用必须通过云函数
 * - 生产环境需在微信云开发控制台配置环境变量
 * - 不返回图片 base64 或完整 buffer 到前端
 */

// 安全初始化 wx-server-sdk：本地 Node 环境可能不存在该包
let cloud = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  console.log('[recognizeObject] wx-server-sdk initialized');
} catch (e) {
  console.warn('[recognizeObject] wx-server-sdk unavailable in this environment:', e.message);
}

const { OpenAICompatibleVisionProvider } = require('./providers/openaiCompatibleVisionProvider');
const { getStableWord } = require('./providers/mockProvider');
const { normalize } = require('./providers/normalizeWordResult');

const ENABLED_CLOUD_RECOGNITION = process.env.ENABLED_CLOUD_RECOGNITION === 'true';

/**
 * 尝试下载云存储图片 buffer
 * @param {string} cloudFileID 
 * @returns {Promise<{buffer: Buffer|null, reason?: string}>}
 */
async function downloadCloudImage(cloudFileID) {
  if (!cloudFileID) {
    return { buffer: null, reason: 'no_cloudFileID' };
  }
  if (!cloud) {
    return { buffer: null, reason: 'cloud_sdk_unavailable' };
  }
  if (typeof cloud.downloadFile !== 'function') {
    return { buffer: null, reason: 'downloadFile_not_available' };
  }
  try {
    const res = await cloud.downloadFile({ fileID: cloudFileID });
    if (res && res.fileContent) {
      const bytes = res.fileContent.length;
      console.log('[recognizeObject] Downloaded cloud image:', bytes, 'bytes');
      return { buffer: res.fileContent };
    }
    return { buffer: null, reason: 'empty_fileContent' };
  } catch (err) {
    console.warn('[recognizeObject] Failed to download cloud image:', err.message || err.errMsg);
    return { buffer: null, reason: 'download_failed' };
  }
}

exports.main = async (event, context) => {
  const { imagePath, cloudFileID, cloudPath, imageBase64, useProvider } = event;

  // 尝试下载云存储图片
  const downloadResult = cloudFileID
    ? await downloadCloudImage(cloudFileID)
    : { buffer: null, reason: 'no_cloudFileID' };

  const imageBuffer = downloadResult.buffer;

  const debugInfo = {
    hasCloudFile: !!imageBuffer,
    imageBytes: imageBuffer ? imageBuffer.length : 0,
    reason: downloadResult.reason || ''
  };

  const shouldUseProvider = useProvider === true && ENABLED_CLOUD_RECOGNITION;

  // 尝试真实 AI Provider（当前阶段：预留图片输入，但仍走 mock 或 provider fallback）
  if (shouldUseProvider) {
    const provider = new OpenAICompatibleVisionProvider();
    if (provider.isConfigured()) {
      try {
        console.log('[recognizeObject] Using AI provider:', provider.getProviderName());
        const { word: rawWord, rawProvider } = await provider.recognize(imageBase64 || '', { imagePath, imageBuffer });
        const word = normalize(rawWord, rawProvider);
        return { ok: true, mode: 'provider', word, fallback: false, debugInfo };
      } catch (err) {
        const errMsg = err.message || '';
        console.warn('[recognizeObject] Provider failed, falling back to mock:', errMsg);
        // 分类 provider 错误原因，不把堆栈返回前端
        if (errMsg.includes('provider_timeout')) {
          debugInfo.providerError = 'provider_timeout';
        } else if (errMsg.includes('API Error') || errMsg.includes('网络请求失败')) {
          debugInfo.providerError = 'provider_api_error';
        } else if (errMsg.includes('JSON 解析失败') || errMsg.includes('无法从内容中提取有效 JSON')) {
          debugInfo.providerError = 'provider_parse_error';
        } else {
          debugInfo.providerError = 'provider_error';
        }
      }
    } else {
      console.warn('[recognizeObject] Provider not configured, falling back to mock');
    }
  } else {
    console.log('[recognizeObject] useProvider=false or ENABLED_CLOUD_RECOGNITION not set, using mock');
  }

  // Fallback 到 Mock Provider
  try {
    const word = getStableWord(imagePath || '');
    const normalized = normalize({ ...word, source: 'mock' }, 'mock');
    return {
      ok: true,
      mode: 'mock',
      word: normalized,
      fallback: true,
      reason: shouldUseProvider ? 'provider_unavailable' : 'useProvider=false',
      debugInfo
    };
  } catch (err) {
    console.error('[recognizeObject] Mock provider failed:', err);
    return { ok: false, error: '识别服务暂时不可用，请稍后重试', debugInfo };
  }
};