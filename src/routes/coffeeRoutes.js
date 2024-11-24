const express = require('express');
const Coffee = require('../models/Coffee'); 
const User = require('../models/User'); 
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const checkRole = require('../middlewares/auth/checkRole'); 
const fs = require('fs');

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


router.post('/addCoffee', upload.single('img'), async (req, res) => {
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

router.get('/catalog', async (req, res) => {
  try {
    const uniqueCountries = await Coffee.distinct("origin");
   
   
   
    let imgPath = null;  // Default value in case the user is not logged in
    try{
     const token = req.cookies.token;
    if (token) {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (userId) {
        const user = await User.findById(userId);

        if (user) {
          imgPath = user.imgPath; // Only assign imgPath if user is found
        }
      }
    }
    }catch(e){}

   
    

    const coffees = await Coffee.find(); 
    res.render('catalog', { coffees,uniqueCountries, message: null,imgPath  }); 
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

    res.render('coffeeOne', { coffee , message: null });
  } catch (error) {
    console.error('Ошибка при получении кофе:', error);
    res.status(500).send('Ошибка сервера');
  }
});

router.get('/catalog/search', async (req, res) => {
  const searchText = req.query.text;
  console.log(`Поиск: ${searchText}`);

  if (!searchText) {
      return res.redirect('/catalog');
  }

  try {

    let imgPath = null;  // Default value in case the user is not logged in
    try{
     const token = req.cookies.token;
    if (token) {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (userId) {
        const user = await User.findById(userId);

        if (user) {
          imgPath = user.imgPath; // Only assign imgPath if user is found
        }
      }
    }
    }catch(e){}


    const uniqueCountries = await Coffee.distinct("origin");
    const coffees = await Coffee.find({ name: { $regex: searchText, $options: 'i' } });

    if (coffees.length === 0) {
      return res.render('catalog', { uniqueCountries, message: "Ничего не найдено", coffees: [] ,imgPath});
    }

    res.render('catalog', { coffees, uniqueCountries, message: null ,imgPath});
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

  try {
    
    let imgPath = null;  // Default value in case the user is not logged in
    try{
     const token = req.cookies.token;
    if (token) {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (userId) {
        const user = await User.findById(userId);

        if (user) {
          imgPath = user.imgPath; // Only assign imgPath if user is found
        }
      }
    }
    }catch(e){}

   
      const coffees = await Coffee.find(query);
      const uniqueCountries = await Coffee.distinct("origin");
      if (coffees.length === 0) {
        return res.render('catalog', { uniqueCountries, message: "Ничего не найдено", coffees: [],imgPath });
      }
      res.render('catalog', { coffees, uniqueCountries, message: null,imgPath });
  } catch (error) {
      console.error('Ошибка при фильтрации кофе:', error);
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
