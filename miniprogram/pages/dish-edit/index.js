const api = require('../../utils/api');

Page({
  data: {
    dishId: '',
    name: '',
    category: '荤菜',
    categories: ['主食', '荤菜', '素菜', '汤品', '甜品', '饮品', '早餐', '其他'],
    minutes: '30',
    description: '',
    photoPath: '',
    photoFileID: '',
    isAvailable: true,
    periodFriendly: false,
    gender: 'female',
    saving: false
  },

  onLoad(options) {
    this.setData({ gender: getApp().globalData.gender || 'female' });
    if (options.id) {
      const page = this;
      api.call('menu').then(function (data) {
        const dish = (data.dishes || []).find(function (entry) { return entry._id === options.id; });
        if (dish) page.setData({
          dishId: dish._id, name: dish.name, category: dish.category,
          minutes: String(dish.minutes || 30), description: dish.description || '',
          photoPath: dish.photoUrl || '', photoFileID: dish.photoFileID || '',
          isAvailable: dish.isAvailable !== false, periodFriendly: dish.periodFriendly === true
        });
      }).catch(function (error) { wx.showToast({ title: error.message, icon: 'none' }); });
    }
  },

  nameInput(event) { this.setData({ name: event.detail.value }); },
  minutesInput(event) { this.setData({ minutes: event.detail.value }); },
  descriptionInput(event) { this.setData({ description: event.detail.value }); },
  categoryChange(event) { this.setData({ category: this.data.categories[Number(event.detail.value)] }); },
  toggleAvailable(event) { this.setData({ isAvailable: event.detail.value }); },
  togglePeriodFriendly(event) { this.setData({ periodFriendly: event.detail.value }); },

  choosePhoto() {
    const page = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (result) {
        const file = result.tempFiles[0];
        page.setData({ photoPath: file.tempFilePath });
      },
      fail: function (error) {
        if (error.errMsg && error.errMsg.indexOf('cancel') >= 0) return;
        wx.showToast({ title: '没有选到图片', icon: 'none' });
      }
    });
  },

  save() {
    const page = this;
    const name = this.data.name.trim();
    const minutes = Math.max(1, Math.min(600, Number(this.data.minutes) || 30));
    if (!name) return wx.showToast({ title: '给这道菜起个名字吧', icon: 'none' });
    if (this.data.saving) return;

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中' });

    const upload = this.data.photoPath && !this.data.photoFileID
      ? wx.cloud.uploadFile({
          cloudPath: 'dish-images/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg',
          filePath: this.data.photoPath
        }).then(function (result) { return result.fileID; })
      : Promise.resolve(this.data.photoFileID);

    upload.then(function (fileID) {
      return api.call('saveDish', {
        dishId: page.data.dishId,
        name: name,
        category: page.data.category,
        minutes: minutes,
        description: page.data.description.trim().slice(0, 120),
        photoFileID: fileID || '',
        isAvailable: page.data.isAvailable,
        periodFriendly: page.data.periodFriendly
      });
    }).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '菜品已上架', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 450);
    }).catch(function (error) {
      wx.hideLoading();
      page.setData({ saving: false });
      wx.showToast({ title: error.message || '保存失败，请检查云存储配置', icon: 'none' });
    });
  }
});
