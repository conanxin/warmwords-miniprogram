#!/usr/bin/env node
/**
 * 小程序静态审计脚本 - 拍词贴 MVP
 * 
 * 检查：页面完整性 / usingComponents / 事件函数 / 跳转目标 / WXSS 风险
 * 用法: node scripts/audit_miniprogram_static.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MP = path.join(ROOT, 'miniprogram');

// ---- Helpers ----

function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch { return ''; }
}

function exists(fp) {
  try { return fs.existsSync(fp); } catch { return false; }
}

const PAGE_TYPES = ['pages/index/index', 'pages/result/result', 'pages/library/library', 'pages/review/review'];
const COMPONENTS = ['components/sticker-card/sticker-card', 'components/lang-tabs/lang-tabs'];
const UTILS = ['utils/mockVision', 'utils/storage', 'utils/review', 'utils/audio'];

// ---- 1. app.json 检查 ----
function checkAppJson() {
  const appJsonPath = path.join(MP, 'app.json');
  const app = readJSON(appJsonPath);
  const errors = [];
  const warnings = [];

  if (!app) {
    errors.push('app.json 解析失败');
    return { errors, warnings, pages: [], tabBar: null };
  }

  const pages = app.pages || [];
  const tabBar = app.tabBar || null;

  // 检查 pages 完整性
  for (const page of pages) {
    const base = path.join(MP, page);
    for (const ext of ['.js', '.json', '.wxml', '.wxss']) {
      if (!exists(base + ext)) {
        errors.push(`app.json pages 中声明了 ${page} 但缺少 ${ext} 文件`);
      }
    }
  }

  // 检查 app.wxss 是否存在
  if (!exists(path.join(MP, 'app.wxss'))) {
    errors.push('app.wxss 不存在');
  }

  return { errors, warnings, pages, tabBar };
}

// ---- 2. usingComponents 检查 ----
function checkUsingComponents(pages, components) {
  const errors = [];
  const warnings = [];

  const allItems = [
    ...pages.map(p => ({ type: 'page', key: p })),
    ...components.map(c => ({ type: 'component', key: c }))
  ];

  for (const item of allItems) {
    const jsonPath = path.join(MP, item.key + '.json');
    const json = readJSON(jsonPath);
    if (!json || !json.usingComponents) continue;

    for (const [compName, compPath] of Object.entries(json.usingComponents)) {
      const resolved = path.join(MP, compPath.replace(/^\//, '') + '.js');
      if (!exists(resolved)) {
        errors.push(`[${item.key}] usingComponents "${compName}" => ${compPath} 不存在 (.js)`);
      }
    }
  }

  return { errors, warnings };
}

// ---- 3. WXML 事件函数检查 ----
function extractWxmlEvents(wxml) {
  const events = [];
  // match bindtap="foo" bindtap='foo' bindtap='foo'
  const re = /bindtap\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(wxml)) !== null) events.push({ type: 'bindtap', fn: m[1] });
  // catchtap
  const re2 = /catchtap\s*=\s*["']([^"']+)["']/g;
  while ((m = re2.exec(wxml)) !== null) events.push({ type: 'catchtap', fn: m[1] });
  // bindchange
  const re3 = /bindchange\s*=\s*["']([^"']+)["']/g;
  while ((m = re3.exec(wxml)) !== null) events.push({ type: 'bindchange', fn: m[1] });
  // hover-class (skip, not event)
  return events;
}

function checkWxmlEvents(pages, components) {
  const errors = [];
  const warnings = [];

  for (const page of pages) {
    const wxmlPath = path.join(MP, page + '.wxml');
    const jsPath = path.join(MP, page + '.js');
    const wxml = readFile(wxmlPath);
    const js = readFile(jsPath);

    const events = extractWxmlEvents(wxml);
    for (const ev of events) {
      // 检查 JS 中是否存在该函数名
      // 简单检查：函数名 + 冒号 或 函数名 + 空格+括号
      const fnRe = new RegExp(`(,|^|\\n)\\s*${ev.fn}\\s*[(:]`);
      if (!fnRe.test(js) && !js.includes(`${ev.fn}(`)) {
        errors.push(`[${page}] WXML 使用了 ${ev.type}="${ev.fn}" 但 JS 中未找到该函数`);
      }
    }
  }

  for (const comp of components) {
    const wxmlPath = path.join(MP, comp + '.wxml');
    const jsPath = path.join(MP, comp + '.js');
    const wxml = readFile(wxmlPath);
    const js = readFile(jsPath);

    const events = extractWxmlEvents(wxml);
    for (const ev of events) {
      const fnRe = new RegExp(`(,|^|\\n)\\s*${ev.fn}\\s*[(:]`);
      if (!fnRe.test(js) && !js.includes(`${ev.fn}(`)) {
        errors.push(`[${comp}] WXML 使用了 ${ev.type}="${ev.fn}" 但 JS 中未找到该函数`);
      }
    }
  }

  return { errors, warnings };
}

// ---- 4. 跳转目标检查 ----
function checkNavigation(pages) {
  const errors = [];
  const warnings = [];

  const validPages = new Set(pages);
  // normalize: pages/index -> /pages/index
  const validSet = new Set([...pages].map(p => '/' + p));

  const allJs = pages.map(p => readFile(path.join(MP, p + '.js'))).join('\n');

  // wx.navigateTo({ url: '/pages/...' })
  const navRe = /wx\.(?:navigateTo|redirectTo|reLaunch)\s*\(\s*\{[^}]*?url\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = navRe.exec(allJs)) !== null) {
    const url = m[1].split('?')[0]; // strip query
    if (!validSet.has(url)) {
      errors.push(`导航到未在 app.json pages 中声明的页面: ${url}`);
    }
  }

  // wx.switchTab — 检查是否在 tabBar 中
  const switchRe = /wx\.switchTab\s*\(\s*\{[^}]*?url\s*:\s*["']([^"']+)["']/g;
  while ((m = switchRe.exec(allJs)) !== null) {
    warnings.push(`使用了 wx.switchTab 到 ${m[1]}，需确认 app.json 中配置了 tabBar`);
  }

  return { errors, warnings };
}

// ---- 5. WXSS 风险检查 ----
function checkWXSSRisk(pages, components) {
  const errors = [];
  const warnings = [];

  const allWxss = [
    ...pages.map(p => ({ key: p, content: readFile(path.join(MP, p + '.wxss')) })),
    ...components.map(c => ({ key: c, content: readFile(path.join(MP, c + '.wxss')) }))
  ];

  for (const { key, content } of allWxss) {
    // var() 无 fallback — 警告
    if (/var\s*\(--[^)]+\)/.test(content) && !/:?\s*[^;}\n]*var\s*\(--[^)]+\)[^;}\n]*(?:#[a-f0-9]|rgb|hsl)/.test(content)) {
      // 简单检测：如果 var() 使用后没有紧跟 fallback，则警告
      // 放宽：只要有 var() 就记录 warning
      warnings.push(`[${key}.wxss] 使用了 var()，需确认微信开发者工具版本支持；建议有硬编码 fallback`);
    }

    // :root 在 WXSS 中不推荐
    if (/:root\s*\{/.test(content)) {
      warnings.push(`[${key}.wxss] 使用了 :root 选择器，WXSS 可能不完全支持`);
    }

    // fixed bottom 没有对应 padding-bottom
    if (/position\s*:\s*fixed/.test(content) && /bottom\s*:\s*0/.test(content)) {
      // 检查是否有页面有 fixed bottom 但没有 padding-bottom
      warnings.push(`[${key}.wxss] 使用了 position:fixed bottom，需确认页面有足够 padding-bottom`);
    }
  }

  // 检查 app.wxss 中的 var() 是否都有 fallback
  const appWxss = readFile(path.join(MP, 'app.wxss'));
  const varLines = appWxss.match(/[^\n]*var\s*\(--[^\)]+\)[^\n]*/g) || [];
  for (const line of varLines) {
    // 如果 var() 所在行没有硬编码 fallback，则 warning
    if (!/#[a-f0-9]{3,8}|rgba?/.test(line.split('var')[0])) {
      // 检测 color:; color:var(--x); 这种只有 var 没有 fallback
      const before = line.split('var')[0].trim();
      if (before === '' || before.endsWith(':')) {
        warnings.push(`[app.wxss] 发现无 fallback 的 var(): ${line.trim()}`);
      }
    }
  }

  return { errors, warnings };
}

// ---- 6. WXML 表达式风险扫描 ----
function checkWxmlExpressionRisk(pages, components) {
  const errors = [];
  const warnings = [];

  const RISKY_PATTERNS = [
    { pattern: /\.toFixed\s*\(/, reason: 'toFixed() 在 WXML 中不可用' },
    { pattern: /\.map\s*\(/, reason: 'Array.map() 在 WXML 中不可用' },
    { pattern: /\.filter\s*\(/, reason: 'Array.filter() 在 WXML 中不可用' },
    { pattern: /\.reduce\s*\(/, reason: 'Array.reduce() 在 WXML 中不可用' },
    { pattern: /\.split\s*\(/, reason: 'String.split() 在 WXML 中不可用' },
    { pattern: /\.join\s*\(/, reason: 'Array.join() 在 WXML 中不可用' },
    { pattern: /Math\./, reason: 'Math.* 在 WXML 中不可用' },
    { pattern: /new Date\s*\(/, reason: 'new Date() 在 WXML 中不可用' }
  ];

  const allItems = [
    ...pages.map(p => ({ key: p, path: path.join(MP, p + '.wxml') })),
    ...components.map(c => ({ key: c, path: path.join(MP, c + '.wxml') }))
  ];

  // 额外扫描所有 wxml 文件（包括子目录）
  const scanDir = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(full);
        } else if (entry.name.endsWith('.wxml')) {
          const content = readFile(full);
          const relPath = path.relative(ROOT, full);
          for (const { pattern, reason } of RISKY_PATTERNS) {
            if (pattern.test(content)) {
              warnings.push(`[${relPath}] WXML 表达式风险: ${reason}`);
            }
          }
        }
      }
    } catch {}
  };

  scanDir(MP);

  return { errors, warnings };
}

// ---- 6b. API Key 安全扫描 ----
function checkApiKeySecurity() {
  const errors = [];
  const warnings = [];

  // 前端不允许出现的 key 模式
  const FRONTEND_FORBIDDEN = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API Key (sk-)', scope: 'miniprogram' },
    { pattern: /api_key\s*[:=]\s*["'][^"']{10,}["']/i, name: 'api_key literal', scope: 'miniprogram' },
    { pattern: /API_KEY\s*[:=]\s*["'][^"']{10,}["']/i, name: 'API_KEY literal', scope: 'miniprogram' },
    { pattern: /Authorization\s*[:=]\s*["']Bearer\s+sk-/i, name: 'Bearer token with sk-', scope: 'miniprogram' },
    { pattern: /AI_PROVIDER_API_KEY\s*[:=]\s*["'][^\s"']+["']/i, name: 'AI_PROVIDER_API_KEY in code', scope: 'miniprogram' }
  ];

  // 云函数中疑似硬编码 key（非 env 读取）
  const CLOUDFORBIDDEN = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'Hardcoded OpenAI key', scope: 'cloudfunctions' }
  ];

  // 文档中不应出现真实 key 样式
  const DOCS_FORBIDDEN = [
    { pattern: /sk-[a-zA-Z0-9]{48,}/, name: 'Suspicious long key in docs', scope: 'docs' }
  ];

  const scanFile = (fp, rules) => {
    const content = readFile(fp);
    for (const { pattern, name } of rules) {
      if (pattern.test(content)) {
        const rel = path.relative(ROOT, fp);
        errors.push(`[${rel}] 危险: ${name} 可能暴露`);
      }
    }
  };

  // 扫描 miniprogram/**/*.js
  const scanDirJs = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirJs(full);
        } else if (entry.name.endsWith('.js')) {
          scanFile(full, FRONTEND_FORBIDDEN);
        }
      }
    } catch {}
  };
  scanDirJs(MP);

  // 扫描 cloudfunctions/**/*.js
  const cfDir = path.join(ROOT, 'cloudfunctions');
  const scanCfDir = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scanCfDir(full);
        else if (entry.name === 'index.js' || entry.name.endsWith('.js')) scanFile(full, CLOUDFORBIDDEN);
      }
    } catch {}
  };
  scanCfDir(cfDir);

  // 扫描 docs/
  const docsDir = path.join(ROOT, 'docs');
  const scanDocs = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scanDocs(full);
        else if (entry.name.endsWith('.md')) scanFile(full, DOCS_FORBIDDEN);
      }
    } catch {}
  };
  scanDocs(docsDir);

  // 6b+. 新增：provider 文件安全扫描
  const providerPath = path.join(ROOT, 'cloudfunctions/recognizeObject/providers/openaiCompatibleVisionProvider.js');
  if (exists(providerPath)) {
    const content = readFile(providerPath);
    if (/sk-[a-zA-Z0-9]{20,}/.test(content)) {
      errors.push('[cloudfunctions/recognizeObject/providers/openaiCompatibleVisionProvider.js] 发现疑似硬编码 API Key');
    }
    if (/console\.log\s*\([^)]*base64[^)]*\)/i.test(content)) {
      errors.push('[cloudfunctions/recognizeObject/providers/openaiCompatibleVisionProvider.js] console.log 打印 base64');
    }
    if (/console\.log\s*\([^)]*Authorization[^)]*\)/i.test(content)) {
      errors.push('[cloudfunctions/recognizeObject/providers/openaiCompatibleVisionProvider.js] console.log 打印 Authorization');
    }
    if (/console\.log\s*\([^)]*apiKey[^)]*\)/i.test(content)) {
      errors.push('[cloudfunctions/recognizeObject/providers/openaiCompatibleVisionProvider.js] console.log 打印 apiKey');
    }
  }

  return { errors, warnings };
}

// ---- 6c. 云函数结构完整性检查 ----
function checkCloudFunctionStructure() {
  const errors = [];
  const warnings = [];

  const cfRoot = path.join(ROOT, 'cloudfunctions');

  // 检查 recognizeObject 关键文件
  const reqFiles = [
    'recognizeObject/index.js',
    'recognizeObject/providers/mockProvider.js',
    'recognizeObject/providers/openaiCompatibleVisionProvider.js',
    'recognizeObject/providers/normalizeWordResult.js'
  ];
  for (const f of reqFiles) {
    const fp = path.join(cfRoot, f);
    if (!exists(fp)) {
      errors.push(`[cloudfunctions] 缺少关键文件: ${f}`);
    }
  }

  // 检查 index.js 是否导出 main
  const idxPath = path.join(cfRoot, 'recognizeObject/index.js');
  if (exists(idxPath)) {
    const content = readFile(idxPath);
    if (!/exports\.main\s*=/.test(content)) {
      errors.push('[cloudfunctions/recognizeObject] index.js 未导出 exports.main');
    }
  }

  // 检查 smoke test 脚本
  const smokeScript = path.join(ROOT, 'scripts/test_recognizeObject_cloud_local.js');
  if (!exists(smokeScript)) {
    warnings.push('[scripts] 缺少 test_recognizeObject_cloud_local.js（云函数本地 smoke test）');
  }

  // 检查部署检查文档
  const deployDoc = path.join(ROOT, 'docs/WECHAT_CLOUD_DEPLOY_CHECKLIST.md');
  if (!exists(deployDoc)) {
    warnings.push('[docs] 缺少 WECHAT_CLOUD_DEPLOY_CHECKLIST.md（云函数部署检查文档）');
  }

  return { errors, warnings };
}

// ---- 6e. cleanupRecognitionImages 云函数检查 ----
function checkCleanupRecognitionImages() {
  const errors = [];
  const warnings = [];

  const cfDir = path.join(ROOT, 'cloudfunctions/cleanupRecognitionImages');
  const indexPath = path.join(cfDir, 'index.js');
  const packagePath = path.join(cfDir, 'package.json');
  const readmePath = path.join(cfDir, 'README.md');
  const designDoc = path.join(ROOT, 'docs/PHASE_3F_SCHEDULED_CLEANUP_DESIGN.md');

  if (!exists(cfDir)) {
    errors.push('[cloudfunctions] 缺少 cleanupRecognitionImages 云函数目录');
  } else {
    if (!exists(indexPath)) {
      errors.push('[cloudfunctions/cleanupRecognitionImages] 缺少 index.js');
    }
    if (!exists(packagePath)) {
      errors.push('[cloudfunctions/cleanupRecognitionImages] 缺少 package.json');
    }
    if (!exists(readmePath)) {
      warnings.push('[cloudfunctions/cleanupRecognitionImages] 缺少 README.md');
    }
    if (!exists(designDoc)) {
      warnings.push('[docs] 缺少 PHASE_3F_SCHEDULED_CLEANUP_DESIGN.md');
    }

    if (exists(indexPath)) {
      const content = readFile(indexPath);
      // 安全 prefix 检查
      if (!content.includes('recognition-inputs/')) {
        errors.push('[cleanupRecognitionImages] 缺少 recognition-inputs/ 安全前缀限制');
      }
      // dryRun 默认 true
      if (!/DEFAULT_DRY_RUN.*true/.test(content)) {
        errors.push('[cleanupRecognitionImages] dryRun 默认值应为 true');
      }
      // 不打印 fileID/cloudFileID
      if (/console\.log\([^)]*(fileID|cloudFileID)[^)]*\)/.test(content)) {
        errors.push('[cleanupRecognitionImages] 不应 console.log fileID/cloudFileID');
      }
      // 最多 100 个限制
      if (!content.includes('MAX_DELETE_COUNT') || !content.includes('100')) {
        warnings.push('[cleanupRecognitionImages] 建议限制单次最多删除 100 个文件');
      }
      // placeholder 模式
      if (!content.includes('placeholder')) {
        warnings.push('[cleanupRecognitionImages] 建议实现 placeholder 模式说明自动扫描暂不实现');
      }
    }
  }

  return { errors, warnings };
}

// ---- 6d. 图片上传链路检查 ----
function checkImageUploadPipeline() {
  const errors = [];
  const warnings = [];

  // 1. cloudImage.js 是否存在
  const cloudImagePath = path.join(MP, 'utils', 'cloudImage.js');
  if (!exists(cloudImagePath)) {
    errors.push('[miniprogram/utils] 缺少 cloudImage.js（云存储图片上传工具）');
  } else {
    // 检查是否有 uploadImageForRecognition 导出
    const content = readFile(cloudImagePath);
    if (!content.includes('uploadImageForRecognition')) {
      warnings.push('[miniprogram/utils/cloudImage.js] 缺少 uploadImageForRecognition 函数');
    }
    // 检查是否有 deleteCloudImage 导出
    if (!content.includes('deleteCloudImage')) {
      warnings.push('[miniprogram/utils/cloudImage.js] 缺少 deleteCloudImage 函数');
    }
  }

  // 2. result.js 是否引用 uploadImageForRecognition 和 deleteCloudImage
  const resultPath = path.join(MP, 'pages/result/result.js');
  if (exists(resultPath)) {
    const content = readFile(resultPath);
    if (!content.includes('uploadImageForRecognition')) {
      warnings.push('[miniprogram/pages/result/result.js] 未引用 uploadImageForRecognition');
    }
    if (!content.includes('deleteCloudImage')) {
      warnings.push('[miniprogram/pages/result/result.js] 未引用 deleteCloudImage');
    }
    // 检查 cloudFileID 是否被写入 storage（storage.saveWord 等方法第一个参数为 word，不是 cloudFileID）
    // 只在检测到 storage.* 调用，且其调用参数中包含 cloudFileID 时才报错（排除 saveWord(word) 的误报）
    const storageWritePatterns = [
      /storage\.save\([^)]*cloudFileID[^)]*\)/,
      /storage\.set\([^)]*cloudFileID[^)]*\)/,
      /storage\.put\([^)]*cloudFileID[^)]*\)/
    ];
    for (const pat of storageWritePatterns) {
      if (pat.test(content)) {
        errors.push('[miniprogram/pages/result/result.js] cloudFileID 不应写入本地 storage');
        break;
      }
    }
  }

  // 3. recognizeObject/index.js 是否处理 cloudFileID
  const idxPath = path.join(ROOT, 'cloudfunctions/recognizeObject/index.js');
  if (exists(idxPath)) {
    const content = readFile(idxPath);
    if (!content.includes('cloudFileID')) {
      warnings.push('[cloudfunctions/recognizeObject/index.js] 未处理 cloudFileID');
    }
    if (!content.includes('downloadCloudImage')) {
      warnings.push('[cloudfunctions/recognizeObject/index.js] 缺少 cloudFileID 下载逻辑');
    }
    // debugInfo 不应返回 cloudPath 到前端
    if (content.includes('cloudPath:') && content.includes('debugInfo')) {
      const match = content.match(/debugInfo\s*=\s*\{[^}]+\}/);
      if (match && match[0].includes('cloudPath')) {
        errors.push('[cloudfunctions/recognizeObject/index.js] debugInfo 不应返回 cloudPath 到前端');
      }
    }
  }

  // 4. 扫描 console.log 打印 base64 / fileContent / imageBuffer 等大字段风险
  const scanJsForLeakage = (dir, scope) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanJsForLeakage(full, scope);
        } else if (entry.name.endsWith('.js')) {
          const content = readFile(full);
          // 检测 console.log 中包含 base64 / fileContent / imageBuffer / toString('base64')
          const risky = [
            { pattern: /console\.log\s*\([^)]*base64[^)]*\)/i, reason: 'console.log base64' },
            { pattern: /console\.log\s*\([^)]*fileContent[^)]*\)/i, reason: 'console.log fileContent' },
            { pattern: /console\.log\s*\([^)]*imageBuffer[^)]*\)/i, reason: 'console.log imageBuffer' }
          ];
          for (const { pattern, reason } of risky) {
            if (pattern.test(content)) {
              const rel = path.relative(ROOT, full);
              errors.push(`[${rel}] 数据泄露风险: ${reason}（可能暴露儿童图片内容）`);
            }
          }
        }
      }
    } catch {}
  };

  scanJsForLeakage(MP, 'miniprogram');
  scanJsForLeakage(path.join(ROOT, 'cloudfunctions'), 'cloudfunctions');

  // 5. 确认真实 API Key 不在代码中（已在前文 checkApiKeySecurity 中处理，这里补充扫描 scripts/）
  const scriptsDir = path.join(ROOT, 'scripts');
  try {
    const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(scriptsDir, entry.name);
      if (!entry.isDirectory() && entry.name.endsWith('.js')) {
        const content = readFile(full);
        // 脚本中允许 process.env 读取，但不允许硬编码 key
        const hardcodedKey = /sk-[a-zA-Z0-9]{20,}/;
        if (hardcodedKey.test(content)) {
          const rel = path.relative(ROOT, full);
          errors.push(`[${rel}] 脚本中疑似硬编码 API Key`);
        }
      }
    }
  } catch {}

  return { errors, warnings };
}

// ---- 7. 空值保护检查 ----
function checkNullGuard(pages) {
  const errors = [];
  const warnings = [];

  for (const page of pages) {
    const js = readFile(path.join(MP, page + '.js'));
    // 检测 this.data.word 或 this.data.imagePath 的直接使用
    // 如果 JS 中有 word.en 但没有先检查 word 是否存在，则 warning
    const dangerous = [
      'word.en', 'word.zh', 'word.ja', 'word.ko', 'word.phonetic',
      'word.exampleEn', 'word.exampleZh', 'word.confidence', 'word.kidNote'
    ];
    for (const prop of dangerous) {
      // 如果有 word?.en 或 word && word.en 之类的安全写法则跳过
      // 简单检查：直接使用但 JS 中没有 if (word) 之类的保护
      if (js.includes(prop) && !js.includes('if (!word') && !js.includes('if (word') && !js.includes('word &&')) {
        // 进一步检查：如果 word 存在才使用
        const hasGuard = js.includes('if (!this.data.word') || js.includes('if (this.data.word');
        if (!hasGuard && !js.includes('&& this.data.word')) {
          warnings.push(`[${page}] 可能缺少 word 空值保护：${prop} 被直接使用`);
        }
      }
    }
  }

  return { errors, warnings };
}

// ---- Main ----
console.log('='.repeat(60));
console.log('拍词贴 MVP - 小程序静态审计');
console.log('='.repeat(60));
console.log('');

const { errors: appErrors, warnings: appWarnings, pages, tabBar } = checkAppJson();
const { errors: ucErrors, warnings: ucWarnings } = checkUsingComponents(pages, COMPONENTS);
const { errors: evErrors, warnings: evWarnings } = checkWxmlEvents(pages, COMPONENTS);
const { errors: navErrors, warnings: navWarnings } = checkNavigation(pages);
const { errors: wxssErrors, warnings: wxssWarnings } = checkWXSSRisk(pages, COMPONENTS);
const { errors: exprErrors, warnings: exprWarnings } = checkWxmlExpressionRisk(pages, COMPONENTS);
const { errors: keyErrors, warnings: keyWarnings } = checkApiKeySecurity();
const { errors: nullErrors, warnings: nullWarnings } = checkNullGuard(pages);
const { errors: cfErrors, warnings: cfWarnings } = checkCloudFunctionStructure();
const { errors: pipeErrors, warnings: pipeWarnings } = checkImageUploadPipeline();
const { errors: cleanupErrors, warnings: cleanupWarnings } = checkCleanupRecognitionImages();

const allErrors = [...appErrors, ...ucErrors, ...evErrors, ...navErrors, ...wxssErrors, ...exprErrors, ...keyErrors, ...nullErrors, ...cfErrors, ...pipeErrors, ...cleanupErrors];
const allWarnings = [...appWarnings, ...ucWarnings, ...evWarnings, ...navWarnings, ...wxssWarnings, ...exprWarnings, ...keyWarnings, ...nullWarnings, ...cfWarnings, ...pipeWarnings, ...cleanupWarnings];

if (allErrors.length > 0) {
  console.log('❌ ERRORS:');
  for (const e of allErrors) console.log('  -', e);
  console.log('');
}

if (allWarnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  for (const w of allWarnings) console.log('  -', w);
  console.log('');
}

console.log('='.repeat(60));
if (allErrors.length === 0) {
  console.log('✅ PASS — 无错误');
} else {
  console.log(`❌ FAIL — ${allErrors.length} 个错误`);
}
console.log(`警告: ${allWarnings.length} 个`);
console.log('='.repeat(60));
console.log('');
console.log('检查范围:');
console.log(`  页面: ${pages.length} 个`);
console.log(`  组件: ${COMPONENTS.length} 个`);
console.log('');

process.exit(allErrors.length > 0 ? 1 : 0);