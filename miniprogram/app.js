const config = require('./config');

App({
  globalData: {
    cloudReady: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.warn('当前微信基础库不支持云开发，请升级微信版本。');
      return;
    }

    if (!config.cloudEnvId || config.cloudEnvId.indexOf('YOUR_') === 0) {
      console.warn('请先在 miniprogram/config.js 中填写 CloudBase 环境 ID。');
      return;
    }

    wx.cloud.init({
      env: config.cloudEnvId,
      traceUser: true
    });
    this.globalData.cloudReady = true;
  }
});
