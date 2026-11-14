const { GoogleGenAI } = require('@google/genai');

function getAiClient() {
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    const error = new Error('Resume analysis is unavailable because GOOGLE_GENAI_API_KEY is not configured.');
    error.statusCode = 503;
    throw error;
  }

  return new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
}

function parseJsonFromText(text) {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

function requireStringArray(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`The analysis provider returned an invalid ${field} field.`);
  }
  return value;
}

function normalizeAnalysis(analysis, { resumeText, jobDescription, jobTitle, companyName }) {
  const scoreFields = [
    'matchScore',
    'technicalMatch',
    'softSkillMatch',
    'experienceMatch',
    'educationMatch',
  ];

  for (const field of scoreFields) {
    if (!Number.isFinite(analysis?.[field]) || analysis[field] < 0 || analysis[field] > 100) {
      throw new Error(`The analysis provider returned an invalid ${field} score.`);
    }
  }

  const arrayFields = [
    'matchedSkills',
    'missingSkills',
    'partialSkills',
    'resumeStrengths',
    'resumeWeaknesses',
    'missingKeywords',
    'improvementSuggestions',
  ];
  const normalized = { ...analysis };

  for (const field of arrayFields) {
    normalized[field] = requireStringArray(analysis[field], field);
  }

  const categories = ['technical', 'behavioral', 'hr'];
  for (const category of categories) {
    const questions = analysis.interviewQuestions?.[category];
    if (
      !Array.isArray(questions) ||
      questions.some(
        (question) =>
          typeof question?.question !== 'string' ||
          typeof question?.difficulty !== 'string' ||
          typeof question?.answerGuideline !== 'string'
      )
    ) {
      throw new Error(`The analysis provider returned invalid ${category} interview questions.`);
    }
  }

  const roadmapWeeks = ['week1', 'week2', 'week3', 'week4'];
  for (const week of roadmapWeeks) {
    requireStringArray(analysis.preparationRoadmap?.[week], `preparationRoadmap.${week}`);
  }

  normalized.summary = {
    jobTitle: jobTitle || 'General Role',
    companyName: companyName || '',
    resumeLength: resumeText.length,
    jobDescriptionLength: jobDescription.length,
  };

  return normalized;
}

async function generateResumeAnalysis({ resumeText, jobDescription, jobTitle, companyName }) {
  if (!resumeText || !jobDescription) {
    throw new Error('Resume text and job description are required.');
  }

  const ai = getAiClient();
  const prompt = `
    Analyze the candidate resume against the job description.
    Return valid JSON only with this exact structure:
    {
      "matchScore": 0,
      "technicalMatch": 0,
      "softSkillMatch": 0,
      "experienceMatch": 0,
      "educationMatch": 0,
      "matchedSkills": [],
      "missingSkills": [],
      "partialSkills": [],
      "resumeStrengths": [],
      "resumeWeaknesses": [],
      "missingKeywords": [],
      "improvementSuggestions": [],
      "interviewQuestions": {
        "technical": [{ "question": "", "difficulty": "", "answerGuideline": "" }],
        "behavioral": [{ "question": "", "difficulty": "", "answerGuideline": "" }],
        "hr": [{ "question": "", "difficulty": "", "answerGuideline": "" }]
      },
      "preparationRoadmap": {
        "week1": [],
        "week2": [],
        "week3": [],
        "week4": []
      }
    }

    Candidate resume:
    ${resumeText}

    Target job description:
    ${jobDescription}

    Keep values realistic, explainable, and relevant to the role. Use percentages 0 to 100.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const analysis = parseJsonFromText(response?.text);
    return normalizeAnalysis(analysis, { resumeText, jobDescription, jobTitle, companyName });
  } catch (error) {
    console.error('Gemini analysis failed:', error.message);
    const providerError = new Error('Resume analysis could not be completed. Please try again later.');
    providerError.statusCode = 502;
    throw providerError;
  }
}

module.exports = {
  generateResumeAnalysis,
  normalizeAnalysis,
};
