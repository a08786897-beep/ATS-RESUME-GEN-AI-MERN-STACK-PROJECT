const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');

const authMiddleware = require('../middleware/auth.middleware');
const analysisModel = require('../models/analysis.model');
const { generateResumeAnalysis } = require('../services/ai.service');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf') || file.originalname.toLowerCase().endsWith('.txt')) {
      cb(null, true);
      return;
    }
    const error = new Error('Only PDF and TXT files are allowed.');
    error.statusCode = 400;
    cb(error);
  },
});

async function extractResumeText(file, fallbackText = '') {
  if (!file) {
    return typeof fallbackText === 'string' ? fallbackText.trim() : '';
  }

  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const pdfData = await parser.getText();
      return (pdfData.text || '').trim();
    } catch (error) {
      const parseError = new Error('The uploaded PDF could not be read. Please upload a valid PDF or enter resume text.');
      parseError.statusCode = 400;
      throw parseError;
    } finally {
      await parser.destroy();
    }
  }

  if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
    return file.buffer.toString('utf8').trim();
  }

  return typeof fallbackText === 'string' ? fallbackText.trim() : '';
}

router.post('/analyze', authMiddleware.authUser, upload.single('resumeFile'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const resumeTextInput = body.resumeText || '';
    const jobDescription = body.jobDescription || '';
    const jobTitle = body.jobTitle || 'General Role';
    const companyName = body.companyName || '';

    if (
      typeof resumeTextInput !== 'string' ||
      typeof jobDescription !== 'string' ||
      typeof jobTitle !== 'string' ||
      typeof companyName !== 'string'
    ) {
      return res.status(400).json({
        message: 'Please provide text values for the resume and job details.',
      });
    }

    if (!jobDescription.trim()) {
      return res.status(400).json({
        message: 'Please provide a job description for analysis.',
      });
    }

    const resumeText = await extractResumeText(req.file, resumeTextInput);

    if (!resumeText.trim()) {
      return res.status(400).json({
        message: 'Please provide resume text or upload a valid PDF/TXT resume.',
      });
    }

    const analysis = await generateResumeAnalysis({
      resumeText,
      jobDescription,
      jobTitle,
      companyName,
    });

    const savedReport = await analysisModel.create({
      user: req.user.id,
      jobTitle,
      companyName,
      resumeText,
      jobDescription,
      result: analysis,
    });

    res.status(201).json({
      success: true,
      message: 'Resume analysis complete.',
      analysis,
      reportId: savedReport._id,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history', authMiddleware.authUser, async (req, res, next) => {
  try {
    const reports = await analysisModel
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      reports: reports.map((report) => ({
        id: report._id,
        jobTitle: report.jobTitle,
        companyName: report.companyName,
        createdAt: report.createdAt,
        result: report.result,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
