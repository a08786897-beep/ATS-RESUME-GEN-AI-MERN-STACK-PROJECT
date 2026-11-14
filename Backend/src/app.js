const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth.routes');
const analysisRouter = require('./routes/analysis.routes');

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    database: connected ? 'connected' : 'disconnected',
    message: 'AI Resume Analyzer backend is running.',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/analysis', analysisRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Request error:', err);
  const status = err.code === 'LIMIT_FILE_SIZE'
    ? 413
    : err.statusCode || err.status || (err.name === 'MulterError' ? 400 : 500);
  const message = status < 500 ? err.message : 'An unexpected server error occurred.';

  res.status(status).json({
    success: false,
    message,
  });
});

module.exports = app;