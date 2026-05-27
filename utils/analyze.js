const API_CONFIG = {
  useMock: false,
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'sk-a0d7e6efd7144f5e8b644c01678c8dc6',
  defaultModel: 'deepseek-chat',
  complexModel: 'deepseek-reasoner'
};

const DEFAULT_SCENE = '用户自由输入';

const EMOTION_TYPES = ['积极', '消极', '暧昧', '冷淡', '矛盾', '不确定'];
const RISK_LEVELS = ['低', '中', '高'];

const EXTREME_KEYWORDS = [
  '自杀',
  '轻生',
  '不想活',
  '结束生命',
  '伤害自己',
  '伤害他人',
  '杀了',
  '报复',
  '同归于尽',
  '威胁'
];

function buildAnalyzePrompt(inputText, scene) {
  return [
    '你是一个情感关系分析助手。',
    '',
    '要求：',
    '1. 不要下绝对结论',
    '2. 不要制造焦虑',
    '3. 不鼓励操控、PUA、冷暴力',
    '4. 给出理性判断和可执行建议',
    '5. 输出 JSON',
    '',
    '安全要求：遇到自伤或伤人风险时，优先建议用户联系现实中的可信任人员和当地紧急服务。',
    '只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 字段必须稳定，结构如下：',
    '{',
    '  "emotionType": "积极|消极|暧昧|冷淡|矛盾|不确定",',
    '  "riskLevel": "低|中|高",',
    '  "psychology": "对方可能心理，120 字以内",',
    '  "situationAnalysis": "用户当前处境分析，160 字以内",',
    '  "replySuggestions": ["高情商回复 1", "高情商回复 2", "高情商回复 3"],',
    '  "avoidSaying": ["不建议说的话 1", "不建议说的话 2", "不建议说的话 3"]',
    '}',
    '',
    `用户场景：${scene || DEFAULT_SCENE}`,
    `用户描述：${inputText}`
  ].join('\n');
}

function chooseDeepSeekModel(inputText, scene) {
  const text = String(inputText || '');
  const normalizedScene = String(scene || '');
  const complexKeywords = [
    '前任',
    '复合',
    '分手',
    '冷暴力',
    '拉黑',
    '出轨',
    '暧昧',
    '异地',
    '三角关系',
    '长期',
    '反复',
    '吵架',
    '道歉',
    '见家长',
    '结婚',
    '离婚'
  ];

  if (text.length >= 350) return API_CONFIG.complexModel;
  if ((text.match(/[。！？!?；;]/g) || []).length >= 6) return API_CONFIG.complexModel;
  if (complexKeywords.some((keyword) => text.indexOf(keyword) !== -1 || normalizedScene.indexOf(keyword) !== -1)) {
    return API_CONFIG.complexModel;
  }
  return API_CONFIG.defaultModel;
}

function detectExtremeContent(text) {
  const normalizedText = String(text || '').replace(/\s/g, '');
  return EXTREME_KEYWORDS.some((keyword) => normalizedText.indexOf(keyword) !== -1);
}

function normalizeAiResult(rawResult, inputText, meta = {}) {
  const result = rawResult || {};
  const emotionType = EMOTION_TYPES.indexOf(result.emotionType) >= 0 ? result.emotionType : '不确定';
  const riskLevel = RISK_LEVELS.indexOf(result.riskLevel) >= 0 ? result.riskLevel : '中';
  const replySuggestions = Array.isArray(result.replySuggestions) ? result.replySuggestions.slice(0, 3) : [];
  const avoidSaying = Array.isArray(result.avoidSaying) ? result.avoidSaying.slice(0, 3) : [];

  while (replySuggestions.length < 3) {
    replySuggestions.push('我想先认真理解你的感受，也尊重你的节奏。我们可以找个合适的时间好好聊聊吗？');
  }

  while (avoidSaying.length < 3) {
    avoidSaying.push('不要用逼问、威胁或试探的方式要求对方立刻表态。');
  }

  return {
    inputText,
    scene: meta.scene || DEFAULT_SCENE,
    model: meta.model || '',
    emotionType,
    riskLevel,
    psychology: result.psychology || '目前信息有限，建议先观察对方表达是否稳定、是否愿意回应具体问题。',
    situationAnalysis: result.situationAnalysis || '你正处在需要确认关系信号的阶段，适合用清晰、温和、不施压的方式沟通。',
    replySuggestions,
    avoidSaying
  };
}

function getExtremeSafetyResult(inputText) {
  return normalizeAiResult({
    emotionType: '不确定',
    riskLevel: '高',
    psychology: '内容中出现了可能涉及自伤、伤人或威胁的信号，此时不适合继续做关系博弈式分析。',
    situationAnalysis: '请先把现实安全放在第一位。若你或他人有即时危险，请立刻联系当地紧急服务、身边可信任的人，或前往安全的公共场所寻求帮助。',
    replySuggestions: [
      '我现在更关心你和大家的安全。我们先暂停争执，分别找可信任的人陪同，好吗？',
      '我不想用刺激的话让情况升级。如果你现在很痛苦，我们先联系能到你身边的人或专业热线。',
      '这件事可以晚点再谈，眼下最重要的是确保没有人会受伤。'
    ],
    avoidSaying: [
      '你敢这样我就让你后悔。',
      '你要是真这样就去做吧。',
      '我一定要让你付出代价。'
    ]
  }, inputText);
}

function mockAnalyzeEmotion(inputText) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (detectExtremeContent(inputText)) {
        resolve(getExtremeSafetyResult(inputText));
        return;
      }

      const text = String(inputText || '');
      const coldSignals = ['不回', '冷淡', '忽冷忽热', '敷衍', '已读不回'];
      const conflictSignals = ['吵架', '生气', '误会', '拉黑', '分手'];
      const positiveSignals = ['开心', '主动', '约', '喜欢', '想你'];

      let emotionType = '暧昧';
      let riskLevel = '中';

      if (coldSignals.some((keyword) => text.indexOf(keyword) !== -1)) {
        emotionType = '冷淡';
        riskLevel = '中';
      }

      if (conflictSignals.some((keyword) => text.indexOf(keyword) !== -1)) {
        emotionType = '矛盾';
        riskLevel = '高';
      }

      if (positiveSignals.some((keyword) => text.indexOf(keyword) !== -1)) {
        emotionType = '积极';
        riskLevel = riskLevel === '高' ? '中' : '低';
      }

      resolve(normalizeAiResult({
        emotionType,
        riskLevel,
        psychology: getMockPsychology(emotionType),
        situationAnalysis: getMockSituation(emotionType, riskLevel),
        replySuggestions: getMockReplies(emotionType),
        avoidSaying: getMockAvoidSaying(emotionType)
      }, inputText));
    }, 900);
  });
}

function getMockPsychology(emotionType) {
  const map = {
    积极: '对方释放了比较正向的互动信号，可能愿意继续靠近，也在观察你的回应是否自然、轻松。',
    消极: '对方可能正处在低能量或防御状态，短时间内不太愿意承接更重的情绪表达。',
    暧昧: '对方对关系有兴趣，但还没有完全确认边界，可能在试探舒适距离和你的反应。',
    冷淡: '对方回应热度下降，可能是忙碌、情绪疲惫，也可能在降低关系投入，需要结合长期行为判断。',
    矛盾: '双方情绪都被触发，对方可能更在意被理解和被尊重，而不是立刻讨论谁对谁错。',
    不确定: '现有信息不足以判断真实动机，更适合先补充事实、减少脑补，再做下一步沟通。'
  };
  return map[emotionType] || map['不确定'];
}

function getMockSituation(emotionType, riskLevel) {
  if (riskLevel === '高') {
    return '当前关系存在升级或误解加深的风险。建议先降温，避免连续追问、试探和情绪化表达，再选择一个具体问题温和沟通。';
  }

  if (emotionType === '冷淡') {
    return '你现在容易因为回应变少而焦虑。更稳妥的方式是给对方一点空间，同时用一次清晰、不施压的表达确认对方状态。';
  }

  if (emotionType === '积极') {
    return '你处在相对有利的位置，可以顺着轻松的氛围推进互动，但仍要尊重对方节奏，不急着索要承诺。';
  }

  return '这段关系有继续沟通的空间，但信号还不够稳定。建议用低压力表达拉近距离，同时保留自己的边界感。';
}

function getMockReplies(emotionType) {
  const map = {
    积极: [
      '听到你这么说我还挺开心的，那我们找个时间把这件事认真安排一下？',
      '我也觉得和你聊天很舒服，不用太赶，我们顺着这个节奏慢慢来。',
      '你的回应让我感觉很被看见，谢谢你愿意这样表达。'
    ],
    冷淡: [
      '我感觉你最近回复少了一些，不确定是不是比较忙。如果你需要空间我可以理解，也想知道你的真实状态。',
      '我不想给你压力，只是想确认我们之间是不是还适合继续这样互动。',
      '如果你最近状态一般，我们可以先放慢一点；等你方便时再好好聊。'
    ],
    矛盾: [
      '我刚才的表达可能让你不舒服了，我愿意先听你怎么感受，再说我的想法。',
      '我们先不急着争对错，我更想把误会说清楚，也希望彼此都能被尊重。',
      '我需要一点时间整理情绪，晚点我们用更平和的方式聊，可以吗？'
    ],
    暧昧: [
      '和你聊天我会觉得轻松，也有点期待继续了解你。我们可以慢慢来，不用急着定义。',
      '你刚刚这句话让我有点心动，但我也想确认你是不是认真这样想的。',
      '我喜欢这种自然的靠近，如果你也舒服，我们可以找个时间见面聊聊。'
    ]
  };
  return map[emotionType] || [
    '我想先确认一下你的感受，避免我自己误会。你愿意说说你真实的想法吗？',
    '这件事对我有点重要，但我会尊重你的节奏，我们可以找个合适的时间聊。',
    '我不想用猜的方式消耗彼此，如果你愿意，我们把话说清楚一点。'
  ];
}

function getMockAvoidSaying(emotionType) {
  if (emotionType === '冷淡') {
    return ['你是不是不喜欢我了？必须现在说清楚。', '你再不回我，我也不会理你了。', '我看你就是故意吊着我。'];
  }

  if (emotionType === '矛盾') {
    return ['你怎么总是这样？', '都是你的问题。', '你要是不道歉，我们就别联系了。'];
  }

  return ['你到底什么意思，别装了。', '你必须给我一个答案。', '我这样做都是为了测试你。'];
}

function parseJsonContent(content) {
  const text = String(content || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw error;
  }
}

function buildDeepSeekPayload(inputText, scene, model) {
  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个克制、温和、边界清晰的情感关系分析助手。必须输出 JSON。'
      },
      {
        role: 'user',
        content: buildAnalyzePrompt(inputText, scene)
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1800,
    stream: false
  };

  if (model !== API_CONFIG.complexModel) {
    payload.temperature = 0.6;
  }

  return payload;
}

function getDeepSeekErrorMessage(statusCode, data) {
  const apiMessage = data && (data.error && data.error.message || data.message);

  if (statusCode === 401) {
    return 'DeepSeek API Key 无效或已过期，请检查密钥。';
  }

  if (statusCode === 402) {
    return 'DeepSeek 账号余额不足或未开通额度，请充值后再分析。';
  }

  if (statusCode === 429) {
    return 'DeepSeek 请求过于频繁，请稍后再试。';
  }

  return apiMessage || `DeepSeek 接口返回异常：${statusCode}`;
}

function getRequestFailMessage(error) {
  const errMsg = error && error.errMsg ? error.errMsg : '';

  if (errMsg.indexOf('url not in domain list') !== -1 || errMsg.indexOf('合法域名') !== -1) {
    return '微信小程序还没有配置 DeepSeek 合法域名，请在小程序后台添加 https://api.deepseek.com。';
  }

  if (errMsg.indexOf('timeout') !== -1) {
    return 'DeepSeek 请求超时，请检查网络后重试。';
  }

  return errMsg || 'DeepSeek 请求失败，请稍后重试。';
}

function requestRealAnalyze(inputText, options = {}) {
  return new Promise((resolve, reject) => {
    if (!API_CONFIG.baseUrl || !API_CONFIG.apiKey) {
      reject(new Error('未配置 DeepSeek API 信息'));
      return;
    }

    const scene = options.scene || DEFAULT_SCENE;
    const model = chooseDeepSeekModel(inputText, scene);

    wx.request({
      url: `${API_CONFIG.baseUrl}/chat/completions`,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        Authorization: `Bearer ${API_CONFIG.apiKey}`
      },
      data: buildDeepSeekPayload(inputText, scene, model),
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(getDeepSeekErrorMessage(res.statusCode, res.data)));
          return;
        }

        try {
          const content = res.data
            && res.data.choices
            && res.data.choices[0]
            && res.data.choices[0].message
            && res.data.choices[0].message.content;
          const rawResult = parseJsonContent(content);
          resolve(normalizeAiResult(rawResult, inputText, { scene, model }));
        } catch (error) {
          reject(new Error('DeepSeek 返回内容不是可解析的 JSON'));
        }
      },
      fail: (error) => reject(new Error(getRequestFailMessage(error)))
    });
  });
}

function analyzeEmotion(inputText, options = {}) {
  const safeInput = String(inputText || '').trim();
  if (!safeInput) {
    return Promise.reject(new Error('请输入需要分析的内容'));
  }

  if (detectExtremeContent(safeInput)) {
    return Promise.resolve({
      ...getExtremeSafetyResult(safeInput),
      scene: options.scene || DEFAULT_SCENE,
      model: 'local-safety'
    });
  }

  if (API_CONFIG.useMock) {
    return mockAnalyzeEmotion(safeInput);
  }

  return requestRealAnalyze(safeInput, options);
}

module.exports = {
  API_CONFIG,
  buildAnalyzePrompt,
  chooseDeepSeekModel,
  detectExtremeContent,
  mockAnalyzeEmotion,
  requestRealAnalyze,
  analyzeEmotion
};
