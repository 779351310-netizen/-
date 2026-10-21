const api = require('../../utils/api');

Page({
  data: { paired: false, gender: 'female', dishes: [], periodForecast: null, periodWindow: false, loading: true },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(function () { wx.stopPullDownRefresh(); }); },

  load() {
    const page = this;
    this.setData({ loading: true });
    return api.call('discover').then(function (data) {
      page.setData({
        loading: false,
        paired: !!data.couple,
        gender: data.profile ? data.profile.gender || 'female' : 'female',
        dishes: data.dishes || [],
        periodForecast: data.periodForecast || null,
        periodWindow: !!data.periodWindow
      });
    }).catch(function (error) {
      page.setData({ loading: false });
      wx.showToast({ title: error.message || '推荐加载失败', icon: 'none' });
    });
  },

  goProfile() { wx.switchTab({ url: '/pages/profile/index' }); },
  goMenu() { wx.switchTab({ url: '/pages/menu/index' }); },

  add(event) {
    const id = event.currentTarget.dataset.id;
    const cart = wx.getStorageSync('coupleKitchenCart') || [];
    const entry = cart.find(function (item) { return item.dishId === id; });
    if (entry) entry.quantity += 1;
    else cart.push({ dishId: id, quantity: 1 });
    wx.setStorageSync('coupleKitchenCart', cart);
    wx.showToast({ title: '放进小餐盘啦', icon: 'success' });
  }
});