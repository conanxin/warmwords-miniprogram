/**
 * OpenAI-Compatible Vision Provider
 * 
 * 通过环境变量配置:
 *   AI_PROVIDER_BASE_URL  - e.g. https://api.openai.com/v1
 *   AI_PROVIDER_API_KEY   - API key
 *   AI_PROVIDER_MODEL     - 模型名称，如 gpt-4o, gpt-4o-mini
 * 
 * 如果环境变量缺失，抛出错误由调用方 fallback 到 mockProvider。
 * 不写死任何 key，不返回真实原始响应。
 * 
 * 安全约束：
 * - 不打印 API Key
 * - 不打印 Authorization header
 * - 不打印完整 raw response
 * - 不打印图片 base64
 * - 超时 20 秒
 *
 * 超时配置关系说明：
 * - 云函数平台超时时间必须大于 provider timeout
 * - 推荐云函数超时时间：30 秒（平台层硬限制）
 * - provider timeout：20 秒（用于提前 fallback，避免平台硬超时）
 * - 前端 fallback：云函数失败时 fallback 到本地 mock
 * - 关系：平台超时(30s) > provider timeout(20s) > 真实模型响应时间
 *
 * 安全约束：
 * - 不打印 API Key
 * - 不打印 Authorization header
 * - 不打印完整 raw response
 * - 不打印图片 base64
 * - 超时 20 秒（提前失败，避免云函数平台强制超时）
 */

const https = require('https');
const REQUEST_TIMEOUT_MS = 20000;

class OpenAICompatibleVisionProvider {
  constructor() {
    this.baseUrl = process.env.AI_PROVIDER_BASE_URL;
    this.apiKey = process.env.AI_PROVIDER_API_KEY;
    this.model = process.env.AI_PROVIDER_MODEL || 'gpt-4o';
  }

  /**
   * 检查环境变量是否齐全
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.baseUrl && this.apiKey);
  }

  /**
   * 获取供应商名称（用于 rawProvider 字段）
   */
  getProviderName() {
    try {
      const url = new URL(this.baseUrl);
      return url.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 调用视觉识别模型
   * @param {string} imageBase64 - 图片 base64 字符串（不含 data URI 前缀）
   * @param {object} options - 可选参数
   *   - imagePath: 图片路径
   *   - imageBuffer: Buffer 对象（可选）
   *   - model: 覆盖默认模型
   * @returns {Promise<object>} - 返回 { word, rawProvider }
   */
  async recognize(imageBase64, options = {}) {
    if (!this.isConfigured()) {
      throw new Error(
        'OpenAICompatibleVisionProvider 未配置: ' +
        '请设置 AI_PROVIDER_BASE_URL 和 AI_PROVIDER_API_KEY 环境变量'
      );
    }

    // 从 imageBuffer 转为 base64
    let actualBase64 = imageBase64;
    if (!actualBase64 && options.imageBuffer) {
      try {
        actualBase64 = options.imageBuffer.toString('base64');
      } catch (e) {
        console.warn('[visionProvider] Failed to encode imageBuffer to base64');
      }
    }

    if (!actualBase64) {
      throw new Error('没有可用的图片输入（需要 imageBase64 或 imageBuffer）');
    }

    const model = options.model || this.model;
    const prompt = this._buildPrompt();

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: '你是儿童语言学习词卡生成助手。只输出严格 JSON，不要解释，不要 Markdown。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${actualBase64}`,
                detail: 'low'
              }
            }
          ]
        }
      ],
      max_tokens: 1024,
      temperature: 0.3
    };

    const bodyString = JSON.stringify(requestBody);
    // 只记录 payload 长度，不打印 base64
    console.log('[visionProvider] Sending vision request, model:', model, 'payload length:', bodyString.length);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.baseUrl + '/chat/completions');
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(bodyString)
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(`API Error: ${parsed.error.message || JSON.stringify(parsed.error)}`));
              return;
            }
            const content = parsed.choices?.[0]?.message?.content;
            if (!content) {
              reject(new Error('API 返回为空'));
              return;
            }
            // 尝试解析 JSON（支持 Markdown 代码块包裹）
            let word;
            try {
              word = this._extractJson(content);
            } catch (parseErr) {
              reject(new Error(`JSON 解析失败: ${parseErr.message}`));
              return;
            }
            console.log('[visionProvider] Vision parse success, word.en:', word.en || 'unknown');
            resolve({
              word,
              rawProvider: `${this.getProviderName()}/${model}`
            });
          } catch (err) {
            reject(new Error(`响应解析失败: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`网络请求失败: ${err.message}`));
      });

      // 超时处理
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error('provider_timeout'));
      });

      req.write(bodyString);
      req.end();
    });
  }

  /**
   * 从可能包含 Markdown 或额外文本的内容中提取 JSON
   * @param {string} content
   * @returns {object}
   */
  _extractJson(content) {
    if (!content) throw new Error('内容为空');
    
    let cleaned = content.trim();
    
    // 去掉可能的 markdown 代码块
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }
    
    // 尝试直接解析
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 尝试提取第一个 JSON 对象
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法从内容中提取有效 JSON');
    }
  }

  /**
   * 构建 prompt，要求模型返回严格 JSON
   */
  _buildPrompt() {
    return `You are a multilingual vocabulary identification assistant for a children's learning app called "拍词贴".

TASK: Identify the main object in the image that is most suitable for a child's language learning.

PRIORITY RULES:
- Prefer common, everyday nouns suitable for young learners (e.g., dog, cat, book, chair, tree, cup, apple, ball, car, sun, moon, water, food, toy).
- If the image shows a person, anime character, cartoon character, movie/TV character, celebrity, brand logo, or complex scene, do NOT output the specific character name, brand name, or celebrity name.
- Instead output a generic category word such as: girl, boy, person, child, animal, cartoon character, vehicle, plant, food, toy, book, furniture, clothing.
- If multiple objects are present, choose the one that is most visually clear and most suitable for child vocabulary learning.
- Never output character names like "Conan", "Detective Conan", "Pikachu", "Mickey Mouse", "Mickey", or any specific character or brand names.

Return ONLY a valid JSON object with this exact structure:
{
  "id": "a-lowercase-single-word-id",
  "zh": "简体中文名称",
  "en": "English name (lowercase)",
  "ja": "日本語名称",
  "ko": "한국어 이름",
  "phonetic": "English phonetic transcription",
  "exampleEn": "One example sentence in English",
  "exampleZh": "对应的中文解释例句",
  "kidNote": "A short encouraging note for children (within 50 characters)",
  "confidence": 0.95,
  "soundHint": "a-filename-hint.mp3",
  "tags": ["tag1", "tag2", "tag3"]
}

Rules:
- Return ONLY the JSON, no explanation, no markdown, no code fences.
- id should be lowercase alphanumeric with underscores.
- kidNote must be within 50 Chinese characters.
- tags should be 1-5 short Chinese tags.
- confidence should be a number between 0 and 1.
- If you cannot identify the object, return id: "unknown" with confidence: 0.1.`;
  }
}

module.exports = { OpenAICompatibleVisionProvider };