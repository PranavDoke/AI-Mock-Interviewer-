import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewAPI } from '../services/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTarget,
  FiBarChart2,
  FiCode,
  FiRepeat,
} from 'react-icons/fi';

const ScoreRing = ({ score, size = 120, label }) => {
  const percentage = Math.round(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? 'text-green-400'
      : percentage >= 60
      ? 'text-yellow-400'
      : percentage >= 40
      ? 'text-orange-400'
      : 'text-red-400';

  const strokeColor =
    percentage >= 80
      ? '#4ade80'
      : percentage >= 60
      ? '#facc15'
      : percentage >= 40
      ? '#fb923c'
      : '#f87171';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{percentage}%</span>
        </div>
      </div>
      {label && <span className="text-sm text-gray-400 mt-2">{label}</span>}
    </div>
  );
};

const SessionResultPage = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await interviewAPI.getSession(sessionId);
        // getSession returns { session } in data.data
        setSession(data.data.session || data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/dashboard" className="text-blue-400 hover:text-blue-300">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  if (!session) return null;

  const scores = session.scores || {};
  const submissions = session.submissions || [];
  const config = session.config || {};
  const durationMin = session.durationMs
    ? Math.round(session.durationMs / 60000)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            to="/history"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Session Results</h1>
            <p className="text-gray-500 text-sm">
              {new Date(session.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              session.status === 'completed'
                ? 'bg-green-900 text-green-300'
                : session.status === 'abandoned'
                ? 'bg-red-900 text-red-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}
          >
            {session.status}
          </span>
          <Link
            to="/interview/setup"
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <FiRepeat className="w-4 h-4" />
            <span>New Session</span>
          </Link>
        </div>
      </div>

      {/* Score Overview */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
          {/* Overall Score Ring */}
          <div className="flex justify-center relative">
            <ScoreRing score={scores.overall ?? 0} label="Overall Score" />
          </div>

          {/* Quick Stats */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <FiTarget className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {Math.round(scores.accuracy ?? 0)}%
              </p>
              <p className="text-xs text-gray-500">Accuracy</p>
            </div>
            <div className="text-center">
              <FiCode className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{submissions.length}</p>
              <p className="text-xs text-gray-500">Questions</p>
            </div>
            <div className="text-center">
              <FiClock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {durationMin != null ? `${durationMin}m` : '—'}
              </p>
              <p className="text-xs text-gray-500">Duration</p>
            </div>
            <div className="text-center">
              <FiBarChart2 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white capitalize">
                {config.language || '—'}
              </p>
              <p className="text-xs text-gray-500">Language</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {session.summary?.overallFeedback && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">AI Summary</h2>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {session.summary.overallFeedback}
          </p>
          {session.summary.strengths?.length > 0 && (
            <div className="mt-4">
              <p className="text-green-400 text-sm font-semibold mb-1">Strengths</p>
              <ul className="list-disc list-inside space-y-1">
                {session.summary.strengths.map((s, i) => (
                  <li key={i} className="text-gray-300 text-sm">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {session.summary.recommendations?.length > 0 && (
            <div className="mt-4">
              <p className="text-blue-400 text-sm font-semibold mb-1">Recommendations</p>
              <ul className="list-disc list-inside space-y-1">
                {session.summary.recommendations.map((r, i) => (
                  <li key={i} className="text-gray-300 text-sm">{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Topic Scores */}
      {scores.topicScores && Object.keys(scores.topicScores).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Topic Scores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(scores.topicScores).map(([topic, score]) => (
              <div key={topic} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize">{topic.replace(/-/g, ' ')}</span>
                  <span className="text-white font-medium">{Math.round(score)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions Detail */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Question Breakdown</h2>
        <div className="space-y-4">
          {submissions.map((sub, idx) => (
            <div
              key={idx}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                  <h4 className="text-white font-medium">
                    {sub.questionId?.title || `Question ${idx + 1}`}
                  </h4>
                </div>
                <div className="flex items-center space-x-2">
                  {sub.evaluation?.overallScore != null && (
                    <span
                      className={`text-lg font-bold ${
                        sub.evaluation.overallScore >= 70
                          ? 'text-green-400'
                          : sub.evaluation.overallScore >= 50
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {Math.round(sub.evaluation.overallScore)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Test results summary */}
              {sub.testResults && sub.testResults.length > 0 && (
                <div className="flex items-center space-x-3 text-sm mb-2">
                  <span className="text-green-400 flex items-center space-x-1">
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span>{sub.testResults.filter((t) => t.passed).length} passed</span>
                  </span>
                  {sub.testResults.filter((t) => !t.passed).length > 0 && (
                    <span className="text-red-400 flex items-center space-x-1">
                      <FiXCircle className="w-3.5 h-3.5" />
                      <span>{sub.testResults.filter((t) => !t.passed).length} failed</span>
                    </span>
                  )}
                </div>
              )}

              {/* Feedback snippet */}
              {sub.evaluation?.feedback && (
                <p className="text-gray-400 text-sm line-clamp-2">
                  {sub.evaluation.feedback}
                </p>
              )}

              {/* Time taken */}
              {sub.timeSpentMs > 0 && (
                <p className="text-gray-600 text-xs mt-2">
                  Time: {Math.round(sub.timeSpentMs / 1000)}s
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionResultPage;
