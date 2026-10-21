function call(action, payload) {
  const app = getApp();
  if (!app.globalData.cloudReady) {
    return Promise.reject(new Error('请先在 miniprogram/config.js 填写 CloudBase 环境 ID，并重启开发者工具。'));
  }

  return wx.cloud.callFunction({
    name: 'orderApi',
    data: Object.assign({ action: action }, payload || {})
  }).then(function (response) {
    const result = response.result || {};
    if (!result.ok) throw new Error(result.message || '请求失败，请稍后重试。');
    return result.data;
  });
}

module.exports = { call: call };
