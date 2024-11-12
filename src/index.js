const connectDB = require('./db');
const app = require('./app'); 

const startServer = async () => {
  try {
    await connectDB();
    app.listen(3000, () => {
      console.log('Сервер работает на порту 3000');
    });
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error);
    process.exit(1); 
  }
};

startServer();
