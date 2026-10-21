const api = require('../../utils/api');

Page({
  data: {
    paired: false,
    role: 'diner',
    dishes: [],
    shown: [],
    categories: ['全部', '主食', '荤菜', '素菜', '汤品', '甜品', '饮品'],
    category: '全部',
    cart: [],
    note: '',
    total: 0,
    loading: true
  },

  onShow() {
    const cart = wx.getStorageSync('coupleKitchenCart') || [];
    this.setData({ cart: cart });
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    const page = this;
    this.setData({ loading: true });
    return api.call('menu').then(function (data) {
      page.setData({
        loading: false,
        paired: !!data.couple,
        role: data.profile ? data.profile.role : 'diner',
        dishes: data.dishes || []
      }, function () { page.filter(); });
    }).catch(function (error) {
      page.setData({ loading: false });
      wx.showToast({ title: error.message || '菜单加载失败', icon: 'none' });
    });
  },

  chooseCategory(event) {
    this.setData({ category: event.currentTarget.dataset.category }, this.filter);
  },

  filter() {
    const page = this;
    const shown = this.data.dishes.filter(function (dish) {
      return page.data.category === '全部' || dish.category === page.data.category;
    });
    this.setData({ shown: shown });
  },

  add(event) {
    const id = event.currentTarget.dataset.id;
    const cart = this.data.cart.slice();
    const item = cart.find(function (entry) { return entry.dishId === id; });
    if (item) item.quantity += 1;
    else cart.push({ dishId: id, quantity: 1 });
    this.setData({ cart: cart, total: cart.reduce(function (sum, entry) { return sum + entry.quantity; }, 0) });
    wx.setStorageSync('coupleKitchenCart', cart);
    wx.showToast({ title: '放进小餐盘啦', icon: 'success' });
  },

  remove(event) {
    const id = event.currentTarget.dataset.id;
    const cart = this.data.cart.map(function (entry) {
      return entry.dishId === id ? Object.assign({}, entry, { quantity: entry.quantity - 1 }) : entry;
    }).filter(function (entry) { return entry.quantity > 0; });
    this.setData({ cart: cart, total: cart.reduce(function (sum, entry) { return sum + entry.quantity; }, 0) });
    wx.setStorageSync('coupleKitchenCart', cart);
  },

  noteInput(event) { this.setData({ note: event.detail.value }); },

  goProfile() { wx.switchTab({ url: '/pages/profile/index' }); },

  editDish(event) {
    wx.navigateTo({ url: '/pages/dish-edit/index?id=' + event.currentTarget.dataset.id });
  },

  addDish() {
    if (!this.data.paired) return wx.switchTab({ url: '/pages/profile/index' });
    if (this.data.role !== 'chef') return wx.showToast({ title: '切换到厨房主理人后可上菜', icon: 'none' });
    wx.navigateTo({ url: '/pages/dish-edit/index' });
  },

  checkout() {
    const page = this;
    if (!this.data.paired) return wx.switchTab({ url: '/pages/profile/index' });
    if (!this.data.cart.length) return wx.showToast({ title: '先挑一道喜欢的菜吧', icon: 'none' });

    wx.showModal({
      title: '确认下单吗？',
      content: '下单后会通知厨房主理人，记得写下想说的话。',
      confirmText: '发送给厨房',
      success: function (result) {
        if (!result.confirm) return;
        wx.showLoading({ title: '正在下单' });
        api.call('createOrder', { items: page.data.cart, note: page.data.note }).then(function () {
          wx.hideLoading();
          wx.removeStorageSync('coupleKitchenCart');
          page.setData({ cart: [], total: 0, note: '' });
          wx.showToast({ title: '订单送到啦', icon: 'success' });
          setTimeout(function () { wx.switchTab({ url: '/pages/orders/index' }); }, 450);
        }).catch(function (error) {
          wx.hideLoading();
          wx.showToast({ title: error.message || '下单失败', icon: 'none' });
        });
      }
    });
  }
});
