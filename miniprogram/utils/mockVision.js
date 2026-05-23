/**
 * Mock Vision - 模拟 AI 视觉识别
 * MVP 阶段使用固定词库 + hash 稳定返回
 */

const WORD_BANK = [
  {
    id: 'apple',
    zh: '苹果',
    en: 'apple',
    ja: 'りんご',
    ko: '사과',
    phonetic: 'ˈæpəl',
    exampleEn: 'An apple a day keeps the doctor away.',
    exampleZh: '每天一个苹果，医生远离我。',
    kidNote: '红红的苹果可以生吃，也可以做苹果派哦！',
    confidence: 0.96,
    soundHint: 'apple.mp3',
    tags: ['水果', '食物', '健康']
  },
  {
    id: 'road_sign',
    zh: '路标',
    en: 'road sign',
    ja: '道路標識',
    ko: '도로 표지판',
    phonetic: 'rəʊd saɪn',
    exampleEn: 'Follow the road signs to the park.',
    exampleZh: '跟着路标走向公园。',
    kidNote: '路标告诉我们要往哪里走，很重要！',
    confidence: 0.88,
    soundHint: 'road_sign.mp3',
    tags: ['交通', '城市', '出行']
  },
  {
    id: 'cup',
    zh: '杯子',
    en: 'cup',
    ja: 'カップ',
    ko: '컵',
    phonetic: 'kʌp',
    exampleEn: 'Would you like a cup of tea?',
    exampleZh: '你想要一杯茶吗？',
    kidNote: '杯子有很多种：玻璃杯、陶瓷杯、塑料杯…',
    confidence: 0.94,
    soundHint: 'cup.mp3',
    tags: ['餐具', '生活', '日常']
  },
  {
    id: 'backpack',
    zh: '背包',
    en: 'backpack',
    ja: 'バックパック',
    ko: '백팩',
    phonetic: 'ˈbækpæk',
    exampleEn: 'I put my books in my backpack.',
    exampleZh: '我把书放进背包里了。',
    kidNote: '上学的日子，背包是最重要的伙伴！',
    confidence: 0.91,
    soundHint: 'backpack.mp3',
    tags: ['学习', '旅行', '日常']
  },
  {
    id: 'chair',
    zh: '椅子',
    en: 'chair',
    ja: '椅子',
    ko: '의자',
    phonetic: 'tʃeə',
    exampleEn: 'Please sit on the chair.',
    exampleZh: '请坐在椅子上。',
    kidNote: '坐久了要站起来动一动哦！',
    confidence: 0.93,
    soundHint: 'chair.mp3',
    tags: ['家具', '房间', '日常']
  },
  {
    id: 'tree',
    zh: '树',
    en: 'tree',
    ja: '木',
    ko: '나무',
    phonetic: 'triː',
    exampleEn: 'Birds live in the tree.',
    exampleZh: '小鸟住在树上。',
    kidNote: '树木会净化空气，是我们地球的好朋友！',
    confidence: 0.97,
    soundHint: 'tree.mp3',
    tags: ['自然', '植物', '户外']
  },
  {
    id: 'dog',
    zh: '狗',
    en: 'dog',
    ja: '犬',
    ko: '개',
    phonetic: 'dɒɡ',
    exampleEn: 'The dog loves to play fetch.',
    exampleZh: '这只狗喜欢玩捡球游戏。',
    kidNote: '狗狗是人类最忠实的朋友！汪汪！',
    confidence: 0.98,
    soundHint: 'dog.mp3',
    tags: ['动物', '宠物', '朋友']
  },
  {
    id: 'bicycle',
    zh: '自行车',
    en: 'bicycle',
    ja: '自転車',
    ko: '자전거',
    phonetic: 'ˈbaɪsɪkəl',
    exampleEn: 'I ride my bicycle to school.',
    exampleZh: '我骑自行车去学校。',
    kidNote: '骑车要戴头盔，注意安全！',
    confidence: 0.89,
    soundHint: 'bicycle.mp3',
    tags: ['交通工具', '运动', '出行']
  },
  {
    id: 'book',
    zh: '书',
    en: 'book',
    ja: '本',
    ko: '책',
    phonetic: 'bʊk',
    exampleEn: 'I read a book every night.',
    exampleZh: '我每天晚上读一本书。',
    kidNote: '书中有很多有趣的故事和知识！',
    confidence: 0.95,
    soundHint: 'book.mp3',
    tags: ['学习', '故事', '知识']
  },
  {
    id: 'umbrella',
    zh: '雨伞',
    en: 'umbrella',
    ja: '傘',
    ko: '우산',
    phonetic: 'ʌmˈbrelə',
    exampleEn: 'Open your umbrella when it rains.',
    exampleZh: '下雨的时候撑开雨伞。',
    kidNote: '下雨天，雨伞可以让我们不被淋湿！',
    confidence: 0.90,
    soundHint: 'umbrella.mp3',
    tags: ['天气', '生活', '雨具']
  },
  {
    id: 'traffic_light',
    zh: '红绿灯',
    en: 'traffic light',
    ja: '信号機',
    ko: '신호등',
    phonetic: 'ˈtræfɪk laɪt',
    exampleEn: 'Stop when the traffic light is red.',
    exampleZh: '红灯亮时要停下。',
    kidNote: '红灯停、绿灯行，黄灯亮了等一等！',
    confidence: 0.92,
    soundHint: 'traffic_light.mp3',
    tags: ['交通', '城市', '安全']
  },
  {
    id: 'flower',
    zh: '花',
    en: 'flower',
    ja: '花',
    ko: '꽃',
    phonetic: 'ˈflaʊə',
    exampleEn: 'The flower smells wonderful.',
    exampleZh: '这朵花闻起来很香。',
    kidNote: '不同的花有不同的颜色和香味！',
    confidence: 0.96,
    soundHint: 'flower.mp3',
    tags: ['植物', '自然', '美丽']
  }
];

/**
 * 根据图片路径返回一个 Mock 识别结果
 * 使用简单 hash 保证同一张图稳定返回同一结果
 */
function recognize(imagePath) {
  if (!imagePath || imagePath.startsWith('mock')) {
    // Demo/mock 模式：随机返回一个
    return randomWord();
  }

  // 根据路径做稳定 hash
  let hash = 0;
  for (let i = 0; i < imagePath.length; i++) {
    const char = imagePath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % WORD_BANK.length;
  return { ...WORD_BANK[index], _hash: hash };
}

/**
 * 随机返回一个词条（用于 demo）
 */
function randomWord() {
  const index = Math.floor(Math.random() * WORD_BANK.length);
  return { ...WORD_BANK[index] };
}

/**
 * 获取所有词条
 */
function getAllWords() {
  return WORD_BANK;
}

module.exports = {
  recognize,
  randomWord,
  getAllWords,
  WORD_BANK
};