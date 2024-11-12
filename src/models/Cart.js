const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  items: [
      {
          coffeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coffee', required: true },
          quantity: { type: Number, required: true }, 
      }
  ],
});

const Cart = mongoose.model('Cart', CartSchema);

module.exports = Cart;
