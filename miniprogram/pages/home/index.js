const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    paired: false,
    couple: null,
    profile: null,
    dishes: [],
    orders: [],
    pendingCount: 0
  },

  onShow() { this.load(); },
  onPullDownRefresh() {
    this.load().finally(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    const page = this;
    this.setData({ loading: true });
    return api.call('home').then(function (data) {
      page.setData({
        loading: false,
        paired: !!data.couple,
        couple: data.couple,
        profile: data.profile,
        dishes: data.dishes || [],
        orders: data.orders || [],
        pendingCount: (data.orders || []).filter(function (order) {
          return order.status !== 'done';
        }).length
      });
    }).catch(function (error) {
      page.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  goMenu() { wx.switchTab({ url: '/pages/menu/index' }); },
  goOrders() { wx.switchTab({ url: '/pages/orders/index' }); },
  goProfile() { wx.switchTab({ url: '/pages/profile/index' }); },
  addDish() {
    if (!this.data.paired) return this.goProfile();
    wx.navigateTo({ url: '/pages/dish-edit/index' });
  }
});
