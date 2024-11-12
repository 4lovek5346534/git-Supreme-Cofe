// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, unique: true },
  roles:[{type:String, ref:'Role'}],
  sex: { type: String, enum: ['male', 'female','other'] },
  imgPath: { type: String, required: true, default:"public/images/user_img/users_img_default.jpg" },
  items: [
      {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true }, 
     }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
