const mongoose = require('mongoose');

const OrderHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderDate: { type: Date, default: Date.now },
  items: [
      {
          coffeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coffee', required: true },
          quantity: { type: Number, required: true },
          supplyPrice: { type: Number, required: true }, 
          salePrice: { type: Number, required: true }, 
      }
  ],
  totalSupplyPrice: { type: Number, required: true }, 
  totalSalePrice: { type: Number, required: true }, 
  status: {
    type: String,
    enum: ['Создан', 'Обрабатывается', 'Упаковывается', 'Отправлен', 'Доставлен'],
    default: 'Создан'
  },
});


const OrderHistory = mongoose.model('OrderHistory', OrderHistorySchema);

module.exports = OrderHistory;
