const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart'); 
const jwt =require('jsonwebtoken');
const Coffee = require('../models/Coffee');
const checkRole = require('../middlewares/auth/checkRole'); 
const OrderHistory = require('../models/OrderHistory');

router.get('/catalog/cart', checkRole(['ADMIN', 'USER']), async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return res.render('cart', { cartItems: [] });
        }

        const coffeeIds = cart.items.map(item => item.coffeeId);
        const cartItems = await Coffee.find({ '_id': { $in: coffeeIds } });

        const coffeeMap = new Map(cartItems.map(coffee => [coffee._id.toString(), coffee]));

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
                    price: 0, 
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

router.post('/cart/add', checkRole(['ADMIN', 'USER']), async (req, res) => {
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

router.post('/cart/create', checkRole(['ADMIN', 'USER']), async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            console.error('Ошибка: пользователь не авторизован');
            return res.status(401).json({ success: false, message: 'Вы не авторизованы' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        console.log(`Создание заказа для пользователя с ID: ${userId}`);

        const cart = await Cart.findOne({ userId }).populate('items.coffeeId');
        if (!cart || cart.items.length === 0) {
            console.warn('Корзина пуста или не найдена');
            return res.status(400).json({ success: false, message: 'Корзина пуста' });
        }

        console.log('Корзина найдена, количество товаров:', cart.items.length);

        const insufficientItems = [];
        for (const item of cart.items) {
            if (!item.coffeeId) {
                console.warn(`Товар с ID ${item._id} не найден в базе данных`);
                continue;
            }
            if (item.coffeeId.quantity < item.quantity) {
                insufficientItems.push({
                    name: item.coffeeId.name,
                    available: item.coffeeId.quantity
                });
                console.warn(
                    `Недостаточное количество для товара "${item.coffeeId.name}": ` +
                    `Доступно ${item.coffeeId.quantity}, требуется ${item.quantity}`
                );
                return res.status(400).json({
                    success: false,
                    message: `Недостаточное количество для товара ${item.coffeeId.name}. Доступно ${item.coffeeId.quantity}, требуется ${item.quantity}`,
                    insufficientItems
                });

            }
        }

        if (insufficientItems.length > 0) {
            console.error('Некоторые товары недоступны в нужном количестве:', insufficientItems);
            return res.status(400).json({
                success: false,
                message: `Недостаточное количество для товара ${item.coffeeId.name}. Доступно ${item.coffeeId.quantity}, требуется ${item.quantity}`,
                insufficientItems
            });
        }


        const orderItems = cart.items
            .filter(item => item.coffeeId) 
            .map(item => ({
                coffeeId: item.coffeeId._id,
                quantity: item.quantity,
                supplyPrice: item.coffeeId.supplyPrice,
                salePrice: item.coffeeId.salePrice
            }));

        const totalSupplyPrice = orderItems.reduce((total, item) => total + item.supplyPrice * item.quantity, 0);
        const totalSalePrice = orderItems.reduce((total, item) => total + item.salePrice * item.quantity, 0);

        const order = new OrderHistory({
            userId,
            items: orderItems,
            totalSupplyPrice,
            totalSalePrice
        });
        await order.save();

        console.log('Заказ успешно создан:', order);

        for (const item of cart.items) {
            if (item.coffeeId) {
                item.coffeeId.quantity -= item.quantity;
                await item.coffeeId.save();
                console.log(`Количество товара "${item.coffeeId.name}" обновлено: осталось ${item.coffeeId.quantity}`);
            }
        }

        cart.items = [];
        await cart.save();

        console.log('Корзина очищена');
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при создании заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

router.get('/stackOfOrders', checkRole(['ADMIN']), async (req, res) => {
    try {
      const orders = await OrderHistory.find().populate('items.coffeeId userId');
     // res.json(orders);
       res.render('stackOfOrders', { orders });
    } catch (error) {
      console.error('Ошибка при получении заказов:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  router.put('/stackOfOrders/:orderId/status',checkRole(['ADMIN']), async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
  
    try {
      const order = await OrderHistory.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден' });
      }
  
      order.status = status;
      await order.save();
  
      res.json({ success: true, message: 'Статус заказа обновлён', order });
    } catch (error) {
      console.error('Ошибка при обновлении статуса заказа:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  router.get('/statistics',checkRole(['ADMIN']), async (req, res) => {
    try {
      // Агрегация для подсчета статистики по количеству каждого кофе
      const coffeeStats = await OrderHistory.aggregate([
        { $unwind: "$items" }, // Разворачиваем массив items
        { $lookup: { 
            from: 'coffees', // Имя коллекции кофе в базе данных
            localField: 'items.coffeeId', 
            foreignField: '_id', 
            as: 'coffeeDetails'
        }},
        { $unwind: "$coffeeDetails" }, // Разворачиваем результат lookup
        { $group: { 
            _id: "$coffeeDetails.name", // Группируем по названию кофе
            totalQuantity: { $sum: "$items.quantity" }, // Суммируем количество кофе
        }},
        { $sort: { totalQuantity: -1 } } // Сортируем по убыванию количества
      ]);
  
      // Отправляем данные в шаблон statistics
      res.render('statistics', { coffeeData: coffeeStats });
    } catch (error) {
      console.error('Ошибка при получении данных о кофе:', error);
      res.status(500).send('Ошибка сервера');
    }
  });
  
  router.get('/user-orders', checkRole(['USER', 'ADMIN']), async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Находим заказы пользователя и подгружаем данные кофе
        const orders = await OrderHistory.find({ userId }).populate('items.coffeeId');

        // Если возвращаем HTML
        res.render('partials/orders', { orders });
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).send('<p>Ошибка при загрузке заказов</p>');
    }
});
module.exports = router;
