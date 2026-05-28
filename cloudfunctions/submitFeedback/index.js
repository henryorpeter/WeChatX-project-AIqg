const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const type = cleanText(event.type, 20) || '体验问题';
  const content = cleanText(event.content, 500);
  const contact = cleanText(event.contact, 80);
  const profile = event.profile && typeof event.profile === 'object' ? event.profile : {};
  const now = new Date();

  if (content.length < 5) {
    return {
      success: false,
      message: '反馈内容不能少于 5 个字'
    };
  }

  const result = await db.collection('feedbacks').add({
    data: {
      openid: wxContext.OPENID || '',
      unionid: wxContext.UNIONID || '',
      type,
      content,
      contact,
      profile: {
        nickname: cleanText(profile.nickname, 24),
        avatarUrl: cleanText(profile.avatarUrl, 300)
      },
      status: 'open',
      source: 'miniapp',
      createdAt: now,
      updatedAt: now
    }
  });

  return {
    success: true,
    data: {
      id: result._id
    }
  };
};
