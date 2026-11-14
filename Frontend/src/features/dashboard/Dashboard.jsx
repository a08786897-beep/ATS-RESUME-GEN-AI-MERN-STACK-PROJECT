import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, BriefcaseBusiness, FileText, LogOut, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../auth/hooks/useAuth.js';
import { api } from '../auth/services/auth.api.js';

const emptyForm = {
  jobTitle: '',
  companyName: '',
  jobDescription: '',
  resumeText: '',
};

const emptyAnalysis = {
  matchScore: null,
  technicalMatch: null,
  softSkillMatch: null,
  experienceMatch: null,
  educationMatch: null,
  matchedSkills: [],
  missingSkills: [],
  partialSkills: [],
  resumeStrengths: [],
  resumeWeaknesses: [],
  missingKeywords: [],
  improvementSuggestions: [],
  interviewQuestions: { technical: [], behavioral: [], hr: [] },
  preparationRoadmap: { week1: [], week2: [], week3: [], week4: [] },
};

function getScoreStyle(score) {
  return {
    background: `conic-gradient(#22c55e ${score}%, #1e293b 0%)`,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const result = analysis || emptyAnalysis;
  const radarData = useMemo(
    () => [
      { subject: 'Technical', value: result.technicalMatch || 0 },
      { subject: 'Soft Skills', value: result.softSkillMatch || 0 },
      { subject: 'Experience', value: result.experienceMatch || 0 },
      { subject: 'Education', value: result.educationMatch || 0 },
    ],
    [result]
  );

  const comparisonData = useMemo(
    () => (analysis ? [{ name: 'Match', value: analysis.matchScore }] : []),
    [analysis]
  );

  useEffect(() => {
    let active = true;

    api.get('/api/analysis/history')
      .then((response) => {
        if (active) {
          setReports(response.data.reports || []);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err?.response?.status === 401) {
          navigate('/login', {
            state: { message: 'Your session expired. Please sign in again.' },
          });
        } else {
          setHistoryError(err?.response?.data?.message || 'Unable to load previous analyses.');
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (!file && !form.resumeText.trim()) {
      setError('Enter resume text or upload a PDF/TXT resume.');
      setLoading(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append('jobTitle', form.jobTitle);
      payload.append('companyName', form.companyName);
      payload.append('jobDescription', form.jobDescription);
      payload.append('resumeText', form.resumeText);

      if (file) {
        payload.append('resumeFile', file);
      }

      const response = await api.post('/api/analysis/analyze', payload);

      setAnalysis(response.data.analysis);
      try {
        const historyResponse = await api.get('/api/analysis/history');
        setReports(historyResponse.data.reports || []);
        setHistoryError('');
      } catch (historyErr) {
        setHistoryError(historyErr?.response?.data?.message || 'Analysis saved, but history could not be refreshed.');
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate('/login', {
          state: { message: 'Your session expired. Please sign in again.' },
        });
      } else {
        setError(err?.response?.data?.message || 'Something went wrong while analyzing this resume.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await handleLogout();
      navigate('/login');
    } catch (error) {
      setLogoutError(error?.response?.data?.message || 'Unable to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">AI Resume</p>
            <h1 className="text-2xl font-bold">Skill Gap Analyzer</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Welcome</p>
              <p className="font-semibold text-white">{user?.username || 'User'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              <LogOut size={16} />
              {loggingOut ? 'Signing out...' : 'Logout'}
            </button>
          </div>
        </div>
        {logoutError && <p className="mx-auto mt-3 max-w-7xl text-sm text-rose-400">{logoutError}</p>}
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Your workspace</p>
              <h2 className="text-xl font-bold text-white">Recent analyses</h2>
            </div>
            {historyLoading && <p className="text-sm text-slate-400">Loading history...</p>}
          </div>
          {historyError && <p className="mb-3 text-sm text-rose-400">{historyError}</p>}
          {!historyLoading && reports.length === 0 && !historyError && (
            <p className="text-sm text-slate-400">Your completed analyses will appear here.</p>
          )}
          {reports.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <button
                  type="button"
                  key={report.id}
                  onClick={() => {
                    setAnalysis(report.result);
                    setForm((current) => ({
                      ...current,
                      jobTitle: report.jobTitle || '',
                      companyName: report.companyName || '',
                    }));
                    setFile(null);
                  }}
                  className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-indigo-400"
                >
                  <span className="block font-semibold text-white">{report.jobTitle}</span>
                  {report.companyName && <span className="mt-1 block text-sm text-slate-400">{report.companyName}</span>}
                  <span className="mt-3 block text-xs text-slate-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-300">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
                <h2 className="text-2xl font-bold text-white">Career readiness snapshot</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Match Score', analysis ? `${result.matchScore}%` : '—'],
                ['Technical', analysis ? `${result.technicalMatch}%` : '—'],
                ['Saved reports', String(reports.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Resume Match</p>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full p-3" style={getScoreStyle(result.matchScore || 0)}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-center">
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {analysis ? `${result.matchScore}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {!analysis && <p className="mt-4 text-center text-sm text-slate-400">Analyze a resume to see your match score.</p>}
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Input</p>
                <h3 className="text-xl font-bold text-white">Resume + job description</h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="jobTitle">Target job title</label>
                <input
                  id="jobTitle"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-indigo-400"
                  value={form.jobTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, jobTitle: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="companyName">Company name</label>
                <input
                  id="companyName"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-indigo-400"
                  value={form.companyName}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="resumeFile">Resume upload (PDF/TXT, up to 2 MB)</label>
                <input
                  id="resumeFile"
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-xl border border-dashed border-slate-700 bg-slate-950 p-3 text-sm text-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="resumeText">Resume text</label>
                <textarea
                  id="resumeText"
                  rows={7}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-indigo-400"
                  value={form.resumeText}
                  onChange={(event) => setForm((prev) => ({ ...prev, resumeText: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="jobDescription">Job description</label>
                <textarea
                  id="jobDescription"
                  rows={8}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-indigo-400"
                  value={form.jobDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, jobDescription: event.target.value }))}
                />
              </div>

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Target size={18} />
                {loading ? 'Analyzing...' : 'Analyze Resume'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-300">
                  <BriefcaseBusiness size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Skill gap overview</h3>
              </div>

              <div className="h-72">
                {analysis ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                      <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.45} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Results will appear after your first analysis.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
                  <ArrowUpRight size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Match distribution</h3>
              </div>

              <div className="h-52">
                {analysis ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No match data yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {analysis && <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Matched skills</h3>
            <div className="flex flex-wrap gap-2">
              {result.matchedSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Missing skills</h3>
            <div className="flex flex-wrap gap-2">
              {result.missingSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-rose-500/15 px-3 py-1.5 text-sm font-medium text-rose-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Partially matched</h3>
            <div className="flex flex-wrap gap-2">
              {result.partialSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>}

        {analysis && <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Resume strengths</h3>
            <ul className="space-y-3">
              {result.resumeStrengths.map((item) => (
                <li key={item} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Improvement suggestions</h3>
            <ul className="space-y-3">
              {result.improvementSuggestions.map((item) => (
                <li key={item} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>}

        {analysis && <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Interview questions</h3>
            <div className="space-y-5">
              {Object.entries(result.interviewQuestions).map(([category, questions]) => (
                <div key={category}>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{category}</h4>
                  <div className="space-y-3">
                    {(questions || []).slice(0, 2).map((item, index) => (
                      <div key={`${category}-${index}`} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                        <p className="font-medium text-white">{item.question}</p>
                        <p className="mt-2 text-sm text-slate-400">Difficulty: {item.difficulty}</p>
                        <p className="mt-1 text-sm text-slate-300">{item.answerGuideline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Roadmap</h3>
            <div className="space-y-4">
              {Object.entries(result.preparationRoadmap).map(([week, tasks]) => (
                <div key={week} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <h4 className="mb-2 font-semibold text-white">{week}</h4>
                  <ul className="space-y-2">
                    {(tasks || []).map((task) => (
                      <li key={task} className="text-sm text-slate-300">• {task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>}

        {analysis && <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-xl font-bold text-white">Keywords to improve</h3>
          <div className="flex flex-wrap gap-2">
            {result.missingKeywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-indigo-500/15 px-3 py-1.5 text-sm font-medium text-indigo-300">
                {keyword}
              </span>
            ))}
          </div>
        </section>}
      </main>
    </div>
  );
}
