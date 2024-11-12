const express = require('express');
const multer = require('multer'); // Добавьте эту строку
const controller = require('../controllers/UserController');
const { check } = require('express-validator');
const path = require('path'); // Подключение path, если ещё не подключено
const router = express.Router();
const checkRole = require('../middlewares/auth/checkRole'); 
router.post('/signup', [
    check('name', "Имя не может быть пустым").notEmpty(),
    check('password', "Длина пароля должна быть от 4 до 8 символов").isLength({ min: 4, max: 8 })
], controller.signup);

router.post('/login', controller.login);

router.get('/profile',checkRole(['ADMIN','USER']), controller.getProfile);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/user_img');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});

const upload = multer({ storage: storage });
router.post('/profile/update', upload.single('img'), controller.updateProfile);

module.exports = router;

