const { model } = require("mongoose");
const User = require('../models/User'); 
const Role = require('../models/Role'); 
const bcrypt = require('bcrypt');
const {validationResult}= require('express-validator');
const jwt =require('jsonwebtoken');
const Cart = require('../models/Cart');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function deleteFile1(filePath) {
    try {
   
            fs.unlinkSync(filePath); 
            console.log(`Файл ${absolutePath} удалён.`);
       
    } catch (err) {
        console.error("Ошибка при удалении файла:", err);
    }
}

const generateAccessToken = (id, roles) => {
    const isAdmin = roles.includes("ADMIN");
    const expiresIn = isAdmin ? "1h" : "24h"; 
    return jwt.sign({ id, roles }, process.env.JWT_SECRET, { expiresIn });
};

class UserController {

    async signup(req, res) {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({ message: `Ошибка при регистрации`, errors });
            }

            const { name, email, password } = req.body;
            const candidate = await User.findOne({ email });
            if (candidate) {
                return res.status(400).json({ message: 'Email уже существует' });
            }

            const hashPassword = await bcrypt.hash(password, 10);
            const userRole = await Role.findOne({ value: "USER" });

            // Путь к изображению по умолчанию
            const defaultImgPath = '/public/images/user_img/user_img_default.jpg';

            const newUser = new User({
                name,
                email,
                password: hashPassword,
                roles: [userRole.value],
                imgPath: defaultImgPath // Устанавливаем путь к изображению по умолчанию
            });

            const savedUser = await newUser.save();

            const newCart = new Cart({
                userId: savedUser._id,
                items: [] 
            });
            await newCart.save();

            res.status(201).json({ userId: savedUser._id });
        } catch (error) {
            console.error("Ошибка при сохранении пользователя:", error);
            res.status(500).json({ error: "Не удалось сохранить пользователя" });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: `Пользователь с email ${email} не найден` });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ message: `Неверный пароль` });
            }

            const token = generateAccessToken(user._id, user.roles);
            res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

            return res.status(200).json({ message: 'Успешный вход' });
        } catch (error) {
            console.error("Ошибка входа:", error);
            res.status(500).json({ error: "Ошибка при входе" });
        }
    }

    async getProfile(req, res) {
        try {
            const token = req.cookies.token;
            if (!token) {
                return res.status(401).json({ message: "Не авторизован" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(404).json({ message: "Пользователь не найден" });
            }

            res.render('profile', { user });

        } catch (error) {
            console.error("Ошибка при получении профиля:", error);
            res.status(500).json({ error: "Ошибка сервера" });
        }
    }
  
   
    
    async updateProfile(req, res) {
        try {
            const token = req.cookies.token;
            if (!token) return res.status(401).json({ message: "Не авторизован" });
    
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
    
            const { name, email, sex } = req.body;
            const updates = { name, email, sex };
    
            if (req.file) {
                const user1=await User.findById(userId);
                    deleteFile1(user1.imgPath); 
             
                updates.imgPath = req.file.path.replace(/\\/g, '/');
            } else if (!req.file && req.user && req.user.imgPath) {
                updates.imgPath = req.user.imgPath;
            }
    
            const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    
            if (!updatedUser) {
                return res.status(404).json({ message: "Пользователь не найден" });
            }
    
            res.redirect('/profile'); 
        } catch (error) {
            console.error("Ошибка при обновлении профиля:", error);
            res.status(500).json({ error: "Ошибка при обновлении профиля" });
        }
    }
    
}

  
module.exports = new UserController();
