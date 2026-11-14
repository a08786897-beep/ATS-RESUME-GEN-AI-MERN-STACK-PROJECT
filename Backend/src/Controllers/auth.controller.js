const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userModel = require('../models/user.model');
const tokenBlackListModel = require('../models/blacklist.model');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function registerUserController(req, res) {
  const { username, email, password } = req.body || {};

  if (
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !username.trim() ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: 'Please provide username, email, and password.',
    });
  }

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      message: 'Please provide a valid email address.',
    });
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return res.status(400).json({
      message: 'Username must be between 3 and 30 characters long.',
    });
  }

  if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters and no more than 72 bytes.',
    });
  }

  const existingUser = await userModel.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  });

  if (existingUser) {
    return res.status(409).json({
      message: 'An account already exists with that username or email.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await userModel.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: passwordHash,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account already exists with that username or email.',
      });
    }
    throw error;
  }

  const token = createToken(user);

  res.cookie('token', token, cookieOptions);

  res.status(201).json({
    message: 'User registered successfully.',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

async function loginUser(req, res) {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({
      message: 'Please provide email and password.',
    });
  }

  const user = await userModel.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    return res.status(401).json({
      message: 'Invalid email or password.',
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: 'Invalid email or password.',
    });
  }

  const token = createToken(user);

  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    message: 'User logged in successfully.',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

async function logoutUser(req, res) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (token) {
    await tokenBlackListModel.findOneAndUpdate(
      { token },
      { $setOnInsert: { token } },
      { upsert: true, returnDocument: 'after' }
    );
  }

  res.clearCookie('token', {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
  });

  res.status(200).json({
    message: 'User logged out successfully.',
  });
}

async function getMeController(req, res) {
  const user = await userModel.findById(req.user.id).select('-password');

  if (!user) {
    return res.status(404).json({
      message: 'User not found.',
    });
  }

  res.status(200).json({
    message: 'User fetched successfully.',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

async function getSessionController(req, res) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(200).json({ user: null });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isTokenBlacklisted = await tokenBlackListModel.exists({ token });

    if (isTokenBlacklisted) {
      return res.status(200).json({ user: null });
    }

    const user = await userModel.findById(decoded.id).select('-password');

    return res.status(200).json({
      user: user
        ? {
            id: user._id,
            username: user.username,
            email: user.email,
          }
        : null,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(200).json({ user: null });
    }

    throw error;
  }
}

module.exports = {
  registerUserController,
  loginUser,
  logoutUser,
  getMeController,
  getSessionController,
};