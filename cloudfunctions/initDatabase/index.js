const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const COLLECTIONS = [
  'orders',
  'memberships',
  'analysis_usage',
  'analysis_usage_logs'
];

async function createCollection(name) {
  try {
    await db.createCollection(name);
    return { name, status: 'created' };
  } catch (error) {
    const message = error && (error.message || error.errMsg) || '';
    const code = error && (error.errCode || error.code);

    if (message.indexOf('already exists') !== -1 || message.indexOf('collection exists') !== -1 || code === -502005) {
      return { name, status: 'exists' };
    }

    return { name, status: 'failed', message };
  }
}

exports.main = async () => {
  const results = [];

  for (const name of COLLECTIONS) {
    results.push(await createCollection(name));
  }

  return {
    success: results.every((item) => item.status !== 'failed'),
    data: results
  };
};
