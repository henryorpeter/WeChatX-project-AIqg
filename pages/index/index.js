const { analyzeEmotion, detectExtremeContent } = require('../../utils/analyze.js');
const storage = require('../../utils/storage.js');
const { getStatusLayout } = require('../../utils/system.js');

Page({
  data: {
    pageTop: 36,
    inputText: '',
    inputCount: 0,
    maxLength: 1000,
    loading: false,
    errorMessage: '',
    placeholderText: '例如：\n\n他最近总是不回我消息，是不是不喜欢我了？\n我们经常吵架，他是不是对我没感情了？\n...',
    scenes: [
      {
        icon: '/assets/icons/home_scene_warm_chat.png',
        title: '暧昧对象忽冷忽热',
        text: '我和一个暧昧对象聊了两个月，前几天还很热情，最近突然回复很慢，但偶尔又会主动找我。我该怎么回？'
      },
      {
        icon: '/assets/icons/home_scene_no_reply_chat.png',
        title: '对象不回消息',
        text: '对象今天一整天都没回消息，昨晚我们因为见面时间有点不开心。我现在很焦虑，想知道该不该继续发。'
      },
      {
        icon: '/assets/icons/home_scene_angry_face.png',
        title: '吵架后如何和好',
        text: '我们刚刚吵架了，我说话有点重。现在想缓和关系，但又怕自己先低头会显得很卑微。'
      },
      {
        icon: '/assets/icons/home_scene_broken_heart.png',
        title: '他是不是不喜欢我',
        text: '他以前会主动分享生活，现在很少主动。我不知道他是不是真的没那么喜欢我了。'
      },
      {
        icon: '/assets/icons/home_scene_friends.png',
        title: '朋友关系变冷淡',
        text: '以前朋友每天都会分享生活，现在很少主动找我，约她也总说忙。我担心是不是关系变淡了。'
      },
      {
        icon: '/assets/icons/home_scene_hourglass.png',
        title: '前任还会回头吗',
        text: '分开后前任偶尔点赞我的动态，但不主动聊天。我想知道这代表什么，要不要主动联系。'
      }
    ]
  },

  onLoad() {
    this.setData(getStatusLayout(14));
  },

  onInput(e) {
    const inputText = e.detail.value || '';
    this.setData({
      inputText,
      inputCount: inputText.length,
      errorMessage: ''
    });
  },

  useScene(e) {
    const index = e.currentTarget.dataset.index;
    const scene = this.data.scenes[index];
    if (!scene) return;

    this.setData({
      inputText: scene.text,
      inputCount: scene.text.length,
      errorMessage: ''
    });
  },

  clearInput() {
    this.setData({
      inputText: '',
      inputCount: 0,
      errorMessage: ''
    });
  },

  changeScenes() {
    const scenes = this.data.scenes.slice();
    const firstTwo = scenes.splice(0, 2);
    this.setData({ scenes: scenes.concat(firstTwo) });
  },

  async startAnalysis() {
    const inputText = this.data.inputText.trim();
    if (!inputText) {
      this.setData({ errorMessage: '请先输入聊天内容或描述你的情感困惑。' });
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    if (this.data.loading) return;

    if (detectExtremeContent(inputText)) {
      wx.showToast({ title: '将优先给出安全提醒', icon: 'none' });
    }

    this.setData({ loading: true, errorMessage: '' });
    wx.showLoading({ title: '分析中...' });

    try {
      const result = await analyzeEmotion(inputText);
      const record = storage.saveHistory(result);
      getApp().globalData.lastResult = record;
      wx.navigateTo({
        url: `/pages/result/result?id=${encodeURIComponent(record.id)}`
      });
    } catch (error) {
      console.error('分析失败', error);
      this.setData({ errorMessage: '分析暂时失败，请稍后重试。若已接入真实接口，请检查后端域名与返回 JSON。' });
      wx.showToast({ title: '分析失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  goToHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  },

  goHome() {},

  goProfile() {
    wx.reLaunch({ url: '/pages/profile/profile' });
  }
});
