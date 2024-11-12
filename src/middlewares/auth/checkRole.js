const jwt = require('jsonwebtoken');
const path = require('path');

const checkRole = (roles) => (req, res, next) => {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hasRole = decoded.roles.some(role => roles.includes(role));

    if (!hasRole) {
      return res.status(403).sendFile(path.join(__dirname, '../../../public/views/accessDenied.html'));
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error("Токен истек:", error);
      res.sendFile(path.join(__dirname, '../../../public/views/TokenExpiredError.html'));

      // return res.status(401).json({ message: "Срок действия токена истек, пожалуйста, выполните вход снова" });
    } else {
      console.error("Ошибка при проверке токена:", error);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  }
};

module.exports = checkRole;
