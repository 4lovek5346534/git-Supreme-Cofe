const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const coffeeRoutes = require('./routes/coffeeRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');

const checkRole = require('./middlewares/auth/checkRole'); 

const app = express();
app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.set('views', path.join(__dirname, '../public/views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public')));
app.use('/catalog/js', express.static(path.join(__dirname, '../public/js')));

app.use((req, res, next) => {
  console.log(`Получен запрос: ${req.method} ${req.url}`);
  next();
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/signup.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/login.html'));
});

app.get('/addCoffee', checkRole(['ADMIN']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/addCoffee.html'));
});

app.get('/adminPage', checkRole(['ADMIN']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/adminPage.html'));
});


app.use('/', coffeeRoutes);
app.use('/', orderRoutes);
app.use('/', userRoutes);
app.use('/api/coffees', coffeeRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/views/404.html')); 
});

module.exports = app; 
