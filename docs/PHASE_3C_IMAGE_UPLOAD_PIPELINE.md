# Phase 3C 图片上传链路

## 目标

小程序临时图片不能直接被云函数或第三方视觉模型读取，因此需要上传到微信云存储。

## 当前链路

```
首页/相册选择
→ result 页面收到 imagePath
→ wx.cloud.uploadFile 上传到 recognition-inputs/
→ recognizeObject 云函数收到 cloudFileID
→ cloud.downloadFile 读取图片 buffer
→ 当前仍返回 mockProvider 结果
```

## 当前不做

- 不接真实 AI
- 不配置 AI_PROVIDER_API_KEY
- 不长期保存儿童图片
- 不返回图片 base64 到前端

## 隐私边界

- cloudPath 使用随机文件名
- 不使用用户原始文件名
- 不在 storage 持久保存 cloudFileID
- 上线前需要设计图片删除策略
- 儿童图片需最小化上传和保存

## 前端接口

```js
const { uploadImageForRecognition, deleteCloudImage } = require('../../utils/cloudImage.js');

// 上传图片用于识别
const { ok, cloudFileID, cloudPath } = await uploadImageForRecognition(imagePath);

// 识别后清理（可选）
await deleteCloudImage(cloudFileID);
```

## 云函数接口

```js
// 接收参数
{
  imagePath: 'temp://xxx.jpg',
  cloudFileID: 'cloud://xxx',
  cloudPath: 'recognition-inputs/20260522/abc123.jpg',
  useProvider: true
}

// 返回结果
{
  ok: true,
  mode: 'mock',
  word: { ... },
  fallback: true,
  reason: 'provider_unavailable',
  debugInfo: {
    hasCloudFile: true,
    imageBytes: 5243,
    cloudPath: 'recognition-inputs/20260522/abc123.jpg'
  }
}
```

## 安全边界

1. 不返回图片 base64 或 buffer 到前端
2. console.log 不打印完整 fileContent
3. cloudPath 使用随机 ID，不暴露用户原始文件名
4. 本地 mock 测试阶段不上传真实儿童照片到第三方
5. 上线前需实现定期清理云存储图片策略

## 下一阶段建议

Phase 3C-2：
- 在微信开发者工具中重新部署 recognizeObject 云函数
- 真机/模拟器测试 uploadFile
- 确认云函数返回 debugInfo.hasCloudFile=true
- 之后再接真实 vision provider

## Phase 3C-2 issue: cloud.init required

**问题现象：**
- 前端 wx.cloud.uploadFile 成功
- cloudFileID/cloudPath 已传入 recognizeObject 云函数
- 但云函数日志显示：`[recognizeObject] Failed to download cloud image: errCode: -1 errMsg: Cloud API isn't enabled, please call init first`
- debugInfo：`hasCloudFile: false, imageBytes: 0`

**根因：**
- 原代码使用 `if (!cloud.DYNAMIC_CURRENT_ENV)` 判断是否需要 init
- 但 `cloud.DYNAMIC_CURRENT_ENV` 是 wx-server-sdk 导出的常量，总是存在，所以 `!cloud.DYNAMIC_CURRENT_ENV` 恒为 false
- 导致 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })` 从未执行

**修复方式：**
```js
let cloud = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (e) {
  // 本地环境无 wx-server-sdk
}
```

- 使用 try/catch 包裹 require 和 init
- 本地 Node 环境无 wx-server-sdk 时安全降级
- 微信云函数环境中正确初始化
- 重新部署 recognizeObject 云函数后验证 debugInfo.hasCloudFile=true

**验证结果：**
- 本地 smoke test：6 PASS, 0 FAIL
- 本地环境缺少 wx-server-sdk 时安全 fallback，不崩溃

---

## Phase 3C-2 verification result

**已验证：**
- uploadFile 成功
- cloud.downloadFile 成功
- debugInfo.hasCloudFile=true
- imageBytes=241935
- 当前仍 fallback 到 mockProvider

**进入 Phase 3D 前需要先设计：**
- 云存储清理策略
- 真实 AI Provider 环境变量配置

**Status:** Phase 3C 链路骨架 + 验证均完成，可以进入 Phase 3D 真实视觉模型接入。
