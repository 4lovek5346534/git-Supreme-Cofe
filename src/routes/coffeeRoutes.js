const express = require('express');
const Coffee = require('../models/Coffee'); 
const User = require('../models/User'); 
const Questions = require('../models/Questions');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const checkRole = require('../middlewares/auth/checkRole'); 
const fs = require('fs');
const Cart = require('../models/Cart'); 
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'public/images/coffees_img');
  },
  filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage: storage });


router.get('/catalog', async (req, res) => {
  try {
    const uniqueCountries = await Coffee.distinct("origin");
   
   
   let countOfCartItem=0;
    let imgPath = null;  // Default value in case the user is not logged in
    try{
     const token = req.cookies.token;
    if (token) {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (userId) {
        const user = await User.findById(userId);
        const cart= await Cart.findOne({ userId });
        if (user) {
          imgPath = user.imgPath; // Only assign imgPath if user is found
          countOfCartItem=cart.items.reduce((total, item) => total + item.quantity, 0);
        }
      }
    }
    }catch(e){}

   
    

    const coffees = await Coffee.find(); 
    const count = await Coffee.countDocuments(); 
        res.render('catalog', { coffees,uniqueCountries, message: null,imgPath,count, countOfCartItem  }); 
  } catch (error) {
    console.error('Error fetching coffees:', error);
    res.status(500).send('Server error');
  }
})

router.get('/catalog/:name/:id', async (req, res) => {
  const { name, id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Некорректный ID товара');
  }

  try {
    const coffee = await Coffee.findById(id);
    if (!coffee) {
      return res.status(404).send('Кофе не найден');
    }

    if (coffee.name !== name) {
      return res.status(404).send('Кофе не найдено по имени');
    }

    coffee.popularity++;
    await coffee.save();

    const questions = await Questions.find({ CoffeeId: id });

    const userIds = [...new Set(questions.flatMap(q => q.items.map(item => item.userId)))];
    const adminIds = [...new Set(questions.flatMap(q => q.items.map(item => item.AdminId)).filter(Boolean))];

    const users = await User.find({ '_id': { $in: userIds } }).select('name imgPath');
    const admins = await User.find({ '_id': { $in: adminIds } }).select('name imgPath');

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = {
        name: user.name,
        avatar: user.imgPath,
      };
      return acc;
    }, {});

    const adminMap = admins.reduce((acc, admin) => {
      acc[admin._id.toString()] = {
        name: admin.name,
        avatar: admin.imgPath,
      };
      return acc;
    }, {});

    const transformedQuestions = questions.map(question => ({
      CoffeeId: question.CoffeeId,
      items: question.items.map(item => ({
        userId: item.userId,
        userName: userMap[item.userId]?.name || 'Неизвестный пользователь',
        userAvatar: userMap[item.userId]?.avatar || '/images/user_img/user_img_default.jpg',
        Question: item.Question,
        AdminId: item.AdminId,
        adminName: item.AdminId ? adminMap[item.AdminId]?.name || 'Администратор' : null,
        adminAvatar: item.AdminId ? adminMap[item.AdminId]?.avatar || '/images/user_img/user_img_default.jpg' : null,
        answer: item.answer,
      })),
    }));

    res.render('coffeeOne', { coffee, questions: transformedQuestions });
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    res.status(500).send('Ошибка сервера');
  }
});

router.get('/catalog/search', async (req, res) => {
  const searchText = req.query.text;
  console.log(`Поиск: ${searchText}`);

  if (!searchText) {
      return res.redirect('/catalog');
  }
 let countOfCartItem=0;
  try {

    let imgPath = null;  // Default value in case the user is not logged in
    try{
     const token = req.cookies.token;

    
    if (token) {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (userId) {
        const user = await User.findById(userId);
        const cart= await Cart.findOne({ userId });

        if (user) {
          imgPath = user.imgPath; // Only assign imgPath if user is found
          countOfCartItem=cart.items.reduce((total, item) => total + item.quantity, 0);

        }
      }
    }
    }catch(e){}


    const uniqueCountries = await Coffee.distinct("origin");
    const coffees = await Coffee.find({ name: { $regex: searchText, $options: 'i' } });

    if (coffees.length === 0) {
      const count=0;
      return res.render('catalog', { uniqueCountries, message: "Ничего не найдено", coffees: [] ,imgPath, count, countOfCartItem});
    }
    const count = coffees.length;
    res.render('catalog', { coffees, uniqueCountries, message: null ,imgPath,count, countOfCartItem});
  } catch (error) {
    console.error('Ошибка при поиске кофе:', error);
    res.status(500).send('Ошибка сервера. Пожалуйста, попробуйте позже.');
  }
});

router.get('/catalog/filters', async (req, res) => {
  const { price, weight, origin, type, composition, text } = req.query;
  const query = {};

  if (text) {
      query.name = { $regex: text, $options: 'i' };
  }

  if (price) {
      const [minPrice, maxPrice] = price.split('-').map(Number);
      query.salePrice = { $gte: minPrice, $lte: maxPrice };
  }

  if (weight) {
      const [minWeight, maxWeight] = weight.split('-').map(Number);
      query.netWeight = { $gte: minWeight, $lte: maxWeight };
  }

  if (origin) {
      query.origin = { $in: origin.split(',') };
  }

  if (type) {
      query.type = { $in: type.split(',') };
  }

  if (composition) {
      query.composition = { $in: composition.split(',') };
  }
  let countOfCartItem=0;
  try {
    
    let imgPath = null;  // Default value in case the user is not logged in
    try{
     const token = req.cookies.token;
    if (token) {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (userId) {
        const user = await User.findById(userId);
        const cart= await Cart.findOne({ userId });

        if (user) {
          imgPath = user.imgPath; // Only assign imgPath if user is found
          countOfCartItem=cart.items.reduce((total, item) => total + item.quantity, 0);

        }
      }
    }
    }catch(e){}

   
      const coffees = await Coffee.find(query);
      const uniqueCountries = await Coffee.distinct("origin");
      if (coffees.length === 0) {
        const count=0;
        return res.render('catalog', { uniqueCountries, message: "Ничего не найдено", coffees: [],imgPath ,count,countOfCartItem});
      }
      const count = coffees.length;
      res.render('catalog', { coffees, uniqueCountries, message: null,imgPath,count,countOfCartItem });
  } catch (error) {
      console.error('Ошибка при фильтрации кофе:', error);
      res.status(500).send('Ошибка сервера');
  }
});

router.post('/catalog/:name/:id/ask', async (req, res) => {
  try {
    const { name, id } = req.params;
    const { Question } = req.body;

    if (!Question) {
      return res.status(400).json({ message: 'Не указан вопрос' });
    }

    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log('Ошибка при проверке токена:', err);
      return res.status(401).json({ message: 'Невалидный токен. Авторизуйтесь заново.' });
    }

    const userId = decoded?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Не удалось определить пользователя. Авторизуйтесь заново.' });
    }

    console.log(`Получен запрос: name = ${name}, id = ${id}, Question = ${Question}, userId = ${userId}`);

    // Найти существующий документ
    let questionDocument = await Questions.findOne({ CoffeeId: id });

    if (questionDocument) {
      // Добавить новый вопрос в массив items
      questionDocument.items.push({
        userId,
        Question,
        AdminId: null,
        answer: "Answer wasn't sent",
      });

      await questionDocument.save();
      res.status(200).json({ message: 'Вопрос успешно добавлен к существующему кофе' });
    } else {
      // Создать новый документ
      const newQuestion = new Questions({
        CoffeeId: id,
        items: [
          {
            userId,
            Question,
            AdminId: null,
            answer: "Answer wasn't sent",
          },
        ],
      });

      await newQuestion.save();
      res.status(200).json({ message: 'Вопрос успешно создан для нового кофе' });
    }
  } catch (error) {
    console.error('Ошибка при добавлении вопроса:', error);
    res.status(500).json({ message: 'Ошибка при добавлении вопроса', error: error.message });
  }
});


router.get('/AnswerToQuestions', checkRole(['ADMIN']), async (req, res) => {
  try {
    const questions = await Questions.find()
      .populate('CoffeeId', 'name imgPath')
      .lean();

    res.render('AnswerToQuestions', { questions });
  } catch (error) {
    console.error('Ошибка при получении вопросов:', error);
    res.status(500).send('Ошибка сервера');
  }
});
router.post('/admin/questions/answer', checkRole(['ADMIN']), async (req, res) => {
  try {
    const { questionId, answer } = req.body;
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log('Ошибка при проверке токена:', err);
      return res.status(401).json({ message: 'Невалидный токен. Авторизуйтесь заново.' });
    }

    const adminId = decoded?.id;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Неверный ID вопроса' });
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: 'Неверный ID администратора' });
    }

    if (!answer) {
      return res.status(400).json({ message: 'Ответ не может быть пустым' });
    }

    const questionDocument = await Questions.findOneAndUpdate(
      { 'items._id': questionId },
      {
        $set: {
          'items.$.answer': answer,
          'items.$.AdminId': new mongoose.Types.ObjectId(adminId), // Исправлено создание ObjectId
        },
      },
      { new: true }
    );

    if (!questionDocument) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    res.status(200).json({ message: 'Ответ успешно отправлен' });
  } catch (error) {
    console.error('Ошибка при отправке ответа:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/questions', checkRole(['ADMIN']), async (req, res) => {
  try {
    // Фильтруем вопросы, где ответ равен "Answer wasn't sent"
    const questions = await Questions.find({ 'items.answer': 'Answer wasn\'t sent' })
      .populate('CoffeeId', 'name imgPath')
      .lean();

    res.render('questions', { questions });  // Отправляем эти вопросы в шаблон 'questions.ejs'
  } catch (error) {
    console.error('Ошибка при получении вопросов без ответа:', error);
    res.status(500).send('Ошибка сервера');
  }
});


async function deleteFile1(filePath) {
    try {
   
            fs.unlinkSync(filePath); 
            console.log(`Файл ${absolutePath} удалён.`);
       
    } catch (err) {
        console.error("Ошибка при удалении файла:", err);
    }
}

router.post('/addCoffee', upload.single('img'),checkRole(['ADMIN']), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Не был загружен файл изображения' });
  }
      const { name, supplyPrice, salePrice, quantity, netWeight, type, origin, composition, info } = req.body;

      const imgPath = req.file.path; 

      const newCoffee = new Coffee({
          name,
          supplyPrice,
          salePrice,
          quantity,
          netWeight,
          type,
          origin,
          composition,
          imgPath, 
          info
      });

      const savedCoffee = await newCoffee.save();

      res.status(201).json({ message: 'Coffee added successfully', coffee: savedCoffee });
  } catch (error) {
      console.error('Error adding coffee:', error);
      res.status(500).json({ message: 'Error adding coffee' });
  }
});

router.get('/editCoffees',checkRole(['ADMIN']), async (req, res) => {
  try {   

    const coffees = await Coffee.find(); 

    if (coffees.length === 0) {
      return res.render('catalog', { message: "Ничего не найдено", coffees: [] });
    }

    res.render('editCoffees', { coffees,message:null  }); 
  } catch (error) {
    console.error('Error fetching coffees:', error);
    res.status(500).send('Server error');
  }
})

router.delete('/editCoffees/delete/:id',checkRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Некорректный ID товара' });
  }

  try {

    const coffee = await Coffee.findByIdAndDelete(id);
    if (coffee) {
      deleteFile1(coffee.imgPath);
    }
    else {
      console.log('Запись не найдена.');
    }

    res.json({ message: 'Товар успешно удалён' });
  } catch (error) {
    console.error('Ошибка при удалении товара:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/editCoffees/edit/:id',checkRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Некорректный ID товара');
  }

  try {
    const coffee = await Coffee.findById(id);
    if (!coffee) {
      return res.status(404).send('Кофе не найден');
    }

    await coffee.save();

    res.render('EditCoffeeOne', { coffee , message: null });
  } catch (error) {
    console.error('Ошибка при получении кофе:', error);
    res.status(500).send('Ошибка сервера');
  }
});

router.put('/editCoffees/edit/:id', checkRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Некорректный ID товара');
  }

  try {
    const coffee = await Coffee.findById(id);
    if (!coffee) {
      return res.status(404).send('Кофе не найден');
    }

    Object.keys(updates).forEach(key => {
      coffee[key] = updates[key];
    });

    await coffee.save();
    res.status(200).send('Данные обновлены успешно');
  } catch (error) {
    console.error('Ошибка при обновлении кофе:', error);
    res.status(500).send('Ошибка сервера');
  }
});

router.get('/orderCoffees',checkRole(['ADMIN']), async (req, res) => {
  try {   

    const coffees = await Coffee.find(); 

    if (coffees.length === 0) {
      return res.render('catalog', { message: "Ничего не найдено", coffees: [] });
    }

    res.render('orderCoffees', { coffees,message:null  }); 
  } catch (error) {
    console.error('Error fetching coffees:', error);
    res.status(500).send('Server error');
  }
})

router.put('/orderCoffees/:id', checkRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { quantity, newSupplyPrice, newSalePrice } = req.body;

  try {
      const coffee = await Coffee.findById(id);

      if (!coffee) {
          return res.status(404).json({ message: 'Кофе не найдено' });
      }

      const updateFields = {};

      if (quantity && !isNaN(quantity)) {
          updateFields.quantity = coffee.quantity + parseInt(quantity, 10);
      }

      if (newSupplyPrice && !isNaN(newSupplyPrice)) {
          updateFields.supplyPrice = parseFloat(newSupplyPrice);
      }
      if (newSalePrice && !isNaN(newSalePrice)) {
          updateFields.salePrice = parseFloat(newSalePrice);
      }

      if (Object.keys(updateFields).length === 0) {
          return res.status(400).json({ message: 'Нет данных для обновления' });
      }

      await Coffee.findByIdAndUpdate(id, updateFields);

      res.status(200).json({ message: 'Данные успешно обновлены' });
  } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
      res.status(500).json({ message: 'Ошибка при обновлении данных' });
  }
});

module.exports = router;
