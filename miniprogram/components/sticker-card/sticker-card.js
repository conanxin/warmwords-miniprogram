// 计算 confidencePercent 的工具函数
function toConfidencePercent(word) {
  const raw = word && typeof word.confidence === 'number' ? word.confidence : 0;
  const value = Math.round(raw * 100);
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

Component({
  properties: {
    word: {
      type: Object,
      value: {},
      observer: function(newWord) {
        this.setData({ confidencePercent: toConfidencePercent(newWord) });
      }
    },
    imagePath: {
      type: String,
      value: ''
    },
    compact: {
      type: Boolean,
      value: false
    }
  },

  data: {
    currentLang: 'en',
    confidencePercent: 0
  },

  lifetimes: {
    attached: function() {
      this.setData({ confidencePercent: toConfidencePercent(this.data.word) });
    }
  },

  methods: {
    switchLang(e) {
      const lang = e.currentTarget.dataset.lang;
      this.setData({ currentLang: lang });
    }
  }
});