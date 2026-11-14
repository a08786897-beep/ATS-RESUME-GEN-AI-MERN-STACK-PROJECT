const express = require('express');

const authController = require('../Controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const authRouter = express.Router();

authRouter.post('/register', authController.registerUserController);
authRouter.post('/login', authController.loginUser);
authRouter.post('/logout', authController.logoutUser);
authRouter.get('/logout', authController.logoutUser);
authRouter.get('/session', authController.getSessionController);
authRouter.get('/me', authMiddleware.authUser, authController.getMeController);
authRouter.get('/get-me', authMiddleware.authUser, authController.getMeController);

module.exports = authRouter;