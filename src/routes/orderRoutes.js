const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart'); 
const jwt =require('jsonwebtoken');
const Coffee = require('../models/Coffee');
const checkRole = require('../middlewares/auth/checkRole'); 

router.get('/catalog/cart', checkRole(['ADMIN', 'USER']), async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return res.render('cart', { cartItems: [] });
        }

        // Получаем ID всех товаров в корзине и находим их в коллекции Coffee
        const coffeeIds = cart.items.map(item => item.coffeeId);
        const cartItems = await Coffee.find({ '_id': { $in: coffeeIds } });

        // Создаем словарь для быстрого поиска товаров по ID
        const coffeeMap = new Map(cartItems.map(coffee => [coffee._id.toString(), coffee]));

        // Форматируем элементы корзины, учитывая удаленные товары
        const formattedCartItems = cart.items.map(item => {
            const coffee = coffeeMap.get(item.coffeeId.toString());
            if (coffee) {
                return {
                    _id: item._id,
                    coffeeName: coffee.name,
                    price: coffee.salePrice,
                    quantity: item.quantity
                };
            } else {
                return {
                    _id: item._id,
                    coffeeName: "Удалено",
                    price: 0, // Устанавливаем цену в 0, если товар удален
                    quantity: item.quantity
                };
            }
        }).filter(item => item.coffeeName !== "Удалено");

        res.render('cart', { cartItems: formattedCartItems });
    } catch (error) {
        console.error("Ошибка при получении корзины:", error);
        res.status(500).json({ error: "Ошибка при получении корзины" });
    }
});

router.post('/cart/update/:id', checkRole(['ADMIN', 'USER']), async (req, res) => {
    try {
        const { change } = req.body;
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "Не авторизован" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: "Корзина не найдена" });
        }

        const cartItem = cart.items.id(req.params.id);

        if (!cartItem) {
            return res.status(404).json({ message: "Элемент корзины не найден" });
        }

        cartItem.quantity += change;

        if (cartItem.quantity < 1) {
            cart.items.pull(cartItem._id); 
        }

        await cart.save(); 

        res.json({ success: true });
    } catch (error) {
        console.error("Ошибка при обновлении корзины:", error);
        res.status(500).json({ error: "Ошибка при обновлении корзины" });
    }
});

router.post('/cart/add', async (req, res) => {
    try {
        const { coffeeId } = req.body;

        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Не авторизован" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        if (!coffeeId || !userId) {
            return res.status(400).json({ error: "Необходимо передать идентификаторы coffeeId и userId" });
        }

        const coffee = await Coffee.findById(coffeeId);
        if (!coffee) {
            return res.status(404).json({ error: "Товар не найден" });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        let cartItem = cart.items.find(item => item.coffeeId.toString() === coffeeId);

        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            cart.items.push({
                coffeeId: coffeeId,
                quantity: 1,
                pricePerUnit: coffee.salePrice 
            });
        }

        await cart.save();
        res.json({ success: true });
    } catch (error) {
        console.error("Ошибка при добавлении товара в корзину:", error);
        res.status(500).json({ error: "Ошибка при добавлении в корзину" });
    }
});

module.exports = router;
