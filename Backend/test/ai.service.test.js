const assert = require('node:assert/strict');
const { test } = require('node:test');

const { generateResumeAnalysis, normalizeAnalysis } = require('../src/services/ai.service');

const validAnalysis = {
  matchScore: 80,
  technicalMatch: 82,
  softSkillMatch: 75,
  experienceMatch: 78,
  educationMatch: 70,
  matchedSkills: ['React'],
  missingSkills: ['Docker'],
  partialSkills: ['Node.js'],
  resumeStrengths: ['Relevant experience'],
  resumeWeaknesses: ['Few measurable results'],
  missingKeywords: ['CI/CD'],
  improvementSuggestions: ['Add project outcomes'],
  interviewQuestions: {
    technical: [{ question: 'How do you test APIs?', difficulty: 'Medium', answerGuideline: 'Discuss test layers.' }],
    behavioral: [{ question: 'Describe a challenge.', difficulty: 'Medium', answerGuideline: 'Explain your approach.' }],
    hr: [{ question: 'Why this role?', difficulty: 'Easy', answerGuideline: 'Connect your goals.' }],
  },
  preparationRoadmap: {
    week1: ['Review fundamentals'],
    week2: ['Practice system design'],
    week3: ['Build a sample feature'],
    week4: ['Complete a mock interview'],
  },
};

test('normalizes summary from the submitted resume and job description', () => {
  const result = normalizeAnalysis(validAnalysis, {
    resumeText: 'Resume',
    jobDescription: 'Job description',
    jobTitle: 'Engineer',
    companyName: 'Example Co.',
  });

  assert.deepEqual(result.summary, {
    jobTitle: 'Engineer',
    companyName: 'Example Co.',
    resumeLength: 6,
    jobDescriptionLength: 15,
  });
  assert.equal(result.matchScore, 80);
});

test('rejects invalid scores and incomplete provider output', () => {
  assert.throws(
    () => normalizeAnalysis({ ...validAnalysis, matchScore: 101 }, {
      resumeText: 'Resume',
      jobDescription: 'Job',
    }),
    /invalid matchScore score/
  );
  assert.throws(
    () => normalizeAnalysis({ ...validAnalysis, matchedSkills: 'React' }, {
      resumeText: 'Resume',
      jobDescription: 'Job',
    }),
    /invalid matchedSkills field/
  );
});

test('fails clearly when AI service credentials are not configured', async () => {
  const originalKey = process.env.GOOGLE_GENAI_API_KEY;
  delete process.env.GOOGLE_GENAI_API_KEY;

  try {
    await assert.rejects(
      generateResumeAnalysis({ resumeText: 'Resume', jobDescription: 'Job' }),
      (error) => error.statusCode === 503 && /GOOGLE_GENAI_API_KEY/.test(error.message)
    );
  } finally {
    if (originalKey === undefined) {
      delete process.env.GOOGLE_GENAI_API_KEY;
    } else {
      process.env.GOOGLE_GENAI_API_KEY = originalKey;
    }
  }
});
