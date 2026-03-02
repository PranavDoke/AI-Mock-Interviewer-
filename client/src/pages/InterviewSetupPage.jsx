import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { startSession } from '../store/interviewSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiPlay, FiCode, FiHash, FiClock, FiSliders } from 'react-icons/fi';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: 'JS' },
  { id: 'python', label: 'Python', icon: 'PY' },
  { id: 'cpp', label: 'C++', icon: 'C++' },
  { id: 'java', label: 'Java', icon: 'JV' },
  { id: 'c', label: 'C', icon: 'C' },
];

const TOPICS = [
  'arrays', 'strings', 'linked-lists', 'stacks-queues',
  'trees', 'graphs', 'hash-tables', 'sorting',
  'searching', 'dynamic-programming', 'greedy', 'backtracking',
  'bit-manipulation', 'math', 'recursion', 'oop',
];

const DURATIONS = [15, 30, 45, 60, 90];
const QUESTION_COUNTS = [3, 5, 8, 10];

const InterviewSetupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state) => state.interview);
  const { user } = useSelector((state) => state.auth);

  const [config, setConfig] = useState({
    language: user?.preferences?.preferredLanguage || 'javascript',
    topics: user?.preferences?.preferredTopics?.length ? user.preferences.preferredTopics : ['arrays'],
    totalQuestions: 5,
    duration: user?.preferences?.interviewDuration || 30,
    difficulty: null, // auto
  });

  const toggleTopic = (topic) => {
    setConfig((prev) => {
      const topics = prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic];
      return { ...prev, topics: topics.length > 0 ? topics : prev.topics };
    });
  };

  const handleStart = async () => {
    const result = await dispatch(startSession(config));
    if (result.payload?.session?._id) {
      navigate(`/interview/${result.payload.session._id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Setup Interview</h1>
        <p className="text-gray-400 mt-1">Configure your practice session</p>
      </div>

      <div className="space-y-8">
        {/* Language Selection */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
            <FiCode className="w-5 h-5 text-blue-400" />
            <span>Programming Language</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setConfig((p) => ({ ...p, language: lang.id }))}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                  config.language === lang.id
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="text-xl font-mono font-bold mb-1">{lang.icon}</span>
                <span className="text-sm">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Topic Selection */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
            <FiHash className="w-5 h-5 text-green-400" />
            <span>Topics</span>
            <span className="text-sm font-normal text-gray-500">
              ({config.topics.length} selected)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  config.topics.includes(topic)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {topic.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Duration & Questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
              <FiClock className="w-5 h-5 text-yellow-400" />
              <span>Duration</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setConfig((p) => ({ ...p, duration: d }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    config.duration === d
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
              <FiSliders className="w-5 h-5 text-purple-400" />
              <span>Questions</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {QUESTION_COUNTS.map((q) => (
                <button
                  key={q}
                  onClick={() => setConfig((p) => ({ ...p, totalQuestions: q }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    config.totalQuestions === q
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {q} questions
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Difficulty Override (optional) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Difficulty</h2>
          <p className="text-sm text-gray-400 mb-4">
            Leave on &quot;Adaptive&quot; for AI-powered difficulty adjustment, or override manually.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfig((p) => ({ ...p, difficulty: null }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                config.difficulty === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Adaptive (AI)
            </button>
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => setConfig((p) => ({ ...p, difficulty: d }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  config.difficulty === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Level {d}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isLoading || config.topics.length === 0}
          className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-colors"
        >
          {isLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <>
              <FiPlay className="w-6 h-6" />
              <span>Start Interview</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InterviewSetupPage;
