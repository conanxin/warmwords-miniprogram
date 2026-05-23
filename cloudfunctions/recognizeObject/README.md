# recognizeObject 云函数

## 功能
接收小程序上传的图片，调用多模态 AI 模型识别物体，返回多语言词汇结构。

## 安全原则

### ⚠️ API Key 不得放在前端代码中
所有 AI 服务调用必须通过云函数，API Key 存储在云函数环境变量中，绝不暴露在小程序前端代码中。

### 正确做法
```
miniprogram (前端)
  ↓ wx.cloud.callFunction
cloudfunctions/recognizeObject (云函数)
  ↓ 读取 process.env.MULTIMODAL_API_KEY
AI 服务 (后端)
```

### 错误做法（禁止）
```
miniprogram (前端)
  ↓ 直接 request
AI 服务 (直接暴露 API Key ❌)
```

## 接入步骤

### 1. 申请 AI 服务
可选服务：
- OpenAI GPT-4o（多模态）
- Anthropic Claude（多模态）
- 百度文心一言
- 阿里通义千问
- 腾讯混元

### 2. 配置云函数环境变量
在微信开发者工具 → 云开发控制台 → 环境 → 函数配置 中添加：
```
MULTIMODAL_API_KEY=your-api-key-here
```

### 3. 下载依赖
```bash
cd cloudfunctions/recognizeObject
npm install
```

### 4. 上传云函数
微信开发者工具中右键云函数文件夹 → 上传并部署

## 返回格式
```json
{
  "success": true,
  "word": {
    "id": "apple_12345",
    "zh": "苹果",
    "en": "apple",
    "ja": "りんご",
    "ko": "사과",
    "phonetic": "ˈæpəl",
    "exampleEn": "An apple a day keeps the doctor away.",
    "exampleZh": "每天一个苹果，医生远离我。",
    "kidNote": "红红的苹果可以生吃，也可以做苹果派哦！",
    "confidence": 0.96,
    "tags": ["水果", "食物", "健康"]
  }
}
```