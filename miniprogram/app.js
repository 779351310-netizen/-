const config = require('./config');

App({
  globalData: {
    cloudReady: false,
    gender: 'female'
  },

  applyGenderTheme(gender) {
    const isMale = gender === 'male';
    this.globalData.gender = isMale ? 'male' : 'female';
    wx.setStorageSync('coupleKitchenGender', this.globalData.gender);
    const background = isMale ? '#f2f8ff' : '#fff8f6';
    wx.setBackgroundColor({ backgroundColor: background, backgroundColorTop: background, backgroundColorBottom: background });
    wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: background });
    wx.setTabBarStyle({
      color: isMale ? '#8295aa' : '#9c807c',
      selectedColor: isMale ? '#6b9fd8' : '#ef7888',
      backgroundColor: isMale ? '#fbfdff' : '#fffdfc',
      borderStyle: 'white'
    });
  },

  onLaunch() {
    const savedGender = wx.getStorageSync('coupleKitchenGender');
    if (savedGender === 'male' || savedGender === 'female') this.globalData.gender = savedGender;
    this.applyGenderTheme(this.globalData.gender);
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
