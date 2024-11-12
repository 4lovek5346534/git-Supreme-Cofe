const mongoose = require('mongoose');

const CoffeeSchema = new mongoose.Schema({
    name: { type: String, required: true },  // Назва кави
    supplyPrice: { type: Number, required: true },  // Ціна за одиницю товару (поставка)
    salePrice: { type: Number, required: true },  // Ціна за одиницю товару (продаж)
    quantity: { type: Number, required: true },  // Кількість одиниць даного товару
    netWeight: { type: Number, required: true },  // Маса нетто
    type: { type: String, enum: ['bean', 'ground'], required: true },  // Вид кави (зерно, молота)
    origin: { type: String, required: true },  // Країна-виробник
    composition: { type: String, enum: ['arabica', 'robusta'], required: true },   // Склад кави (арабіка, робуста)
    imgPath: { type: String, required: true },
    popularity:{ type: Number, required: true, default:1 },
    info:{type:String, required:true}
});

module.exports = mongoose.model('Coffee', CoffeeSchema);
