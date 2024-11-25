const mongoose = require('mongoose');

const QuestionItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  Question: { type: String, required: true }, 
  AdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  answer: { type: String, default: "Answer wasn't sent" } 
});

const QuestionsSchema = new mongoose.Schema({
  CoffeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coffee', required: true }, 
  items: [QuestionItemSchema]
});

const Questions = mongoose.model('Questions', QuestionsSchema);

module.exports = Questions;
