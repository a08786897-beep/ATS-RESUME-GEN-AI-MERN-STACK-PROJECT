const jwt = require('jsonwebtoken');
const tokenBlackListModel = require('../models/blacklist.model');

async function authUser(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Authentication token is missing.',
    });
  }

  try {
    const isTokenBlacklisted = await tokenBlackListModel.findOne({ token });

    if (isTokenBlacklisted) {
      return res.status(401).json({
        message: 'Authentication token has been revoked.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      return next(error);
    }

    return res.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
}

module.exports = { authUser };