# Phase 5E-3 TTS Playback Diagnostics

## 问题
TTS 云函数已成功生成 audioFileID（4032 bytes，mode=audio, ok=true），但真机点击"听一听发音"后未听到声音。

## 播放链路
```
audioFileID
  → wx.cloud.getTempFileURL()  获取临时 URL
  → wx.createInnerAudioContext()  创建播放器
  → audioCtx.src = tempFileURL
  → audioCtx.play()
```

## 新增诊断日志

### TTS response（成功时）
```
[Audio] TTS response {"ok":true,"mode":"audio","fallback":false,"hasAudioFileID":true,"audioFileIDLength":95,"codec":"mp3","stage":"done","reason":"tts_success"}
```

### temp URL 状态
```
[Audio] temp URL ready {"hasUrl":true,"urlLength":142,"status":0,"errMsg":""}
```

### 播放事件
```
[Audio] play requested {"hasSrc":true}
[Audio] playback started
[Audio] playback ended
```

### 播放失败
```
[Audio] playback failed {"errCode":10001,"errMsg":"err_no_permission"}
```

## 真机验证方法

1. 微信开发者工具 → 详情 → 开启调试（不限时）
2. 真机连接开发者工具
3. 点击"听一听发音"
4. 观察 Console 输出：
   - `[Audio] playback started` → 播放已启动
   - `[Audio] playback failed` → 播放失败，记录 errCode/errMsg
5. iPhone 检查：媒体音量 + 静音开关

## errCode 参考（常见）

| errCode | 含义 |
|---------|------|
| 10001 | 媒体资源不存在 |
| 10003 | 无法识别的文件格式 |
| 10004 | 无效的音频 URL |
| 20001 | 服务器内部错误 |
| -1 | 未知错误（网络断开等）|

## fallback modal

若 getTempFileURL 或 playback 失败，显示：
- 标题：🔊 发音
- 内容：`[word]\n\n可以和孩子一起读一遍哦 😊`

## 代码变更（audio.js）

1. **模块级 `currentAudio` 变量** — 防止音频 Context 被 GC 提前回收
2. **play 加载提示** — `wx.showLoading({ mask: true })`，成功/失败时 `wx.hideLoading()`
3. **TTS response 安全摘要** — 打印 hasAudioFileID / audioFileIDLength，不打印完整 ID
4. **temp URL 安全摘要** — 打印 hasUrl / urlLength / status，不打印完整 URL
5. **playback 事件监听** — onPlay / onEnded / onStop / onError 全覆盖
6. **errCode 安全摘要** — 打印 errCode / safeShort(errMsg)，不打印堆栈