const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      coffeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coffee', required: true },
      quantity: { type: Number, required: true },
      salePrice: { type: Number, required: true }
    }
  ],
  orderDate: { type: Date, default: Date.now, required: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'], default: 'pending' },
  totalAmount: { type: Number, required: true }
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
