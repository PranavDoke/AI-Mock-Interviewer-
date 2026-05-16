import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { abandonSession, resetInterview, startSession } from '../store/interviewSlice';
import { interviewAPI, questionAPI } from '../services/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiPlay, FiCode, FiHash, FiClock, FiSliders, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: 'JS' },
  { id: 'python', label: 'Python', icon: 'PY' },
  { id: 'cpp', label: 'C++', icon: 'C++' },
  { id: 'java', label: 'Java', icon: 'JV' },
  { id: 'c', label: 'C', icon: 'C' },
];

const TOPICS = [
  'arrays', 'string', 'searching', 'stack', 'dp', 'graph',
  'heap', 'matrix', 'hashing', 'hash-tables', 'backtracking',
  'tree', 'design', 'binary-search', 'bit-manipulation',
  'greedy', 'intervals', 'linked-list', 'segment-tree',
  'sliding-window', 'two-pointers', 'math', 'sorting',
];

const DURATIONS = [15, 30, 45, 60, 90];
const QUESTION_COUNTS = [3, 5, 8, 10];

const InterviewSetupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state) => state.interview);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [existingSessionId, setExistingSessionId] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAbandoningSession, setIsAbandoningSession] = useState(false);
  const [topicAvailability, setTopicAvailability] = useState({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [startError, setStartError] = useState('');

  const [config, setConfig] = useState({
    language: user?.preferences?.preferredLanguage || 'javascript',
    topics: user?.preferences?.preferredTopics?.length ? user.preferences.preferredTopics : ['arrays'],
    totalQuestions: 3,
    duration: user?.preferences?.interviewDuration || 30,
    difficulty: null, // auto
  });

  const toggleTopic = (topic) => {
    if ((topicAvailability[topic] || 0) === 0) return;

    setConfig((prev) => {
      const topics = prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic];
      return { ...prev, topics: topics.length > 0 ? topics : prev.topics };
    });
  };

  const loadTopicAvailability = useCallback(async () => {
    setIsLoadingAvailability(true);
    try {
      const { data } = await questionAPI.getTopicAvailability({ type: 'coding' });
      const counts = data?.data?.byTopic || {};
      setTopicAvailability(counts);
      setConfig((prev) => {
        const filteredTopics = prev.topics.filter((topic) => (counts[topic] || 0) > 0);
        return {
          ...prev,
          topics: filteredTopics.length ? filteredTopics : prev.topics,
        };
      });
    } catch (error) {
      setTopicAvailability({});
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  const loadActiveSession = useCallback(async () => {
    setIsCheckingSession(true);
    try {
      const { data } = await interviewAPI.listSessions({ status: 'active', limit: 1 });
      const activeSession = data?.data?.[0] || null;
      setExistingSessionId(activeSession?._id || null);
    } catch (error) {
      setExistingSessionId(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadActiveSession();
    }
  }, [loadActiveSession, user]);

  useEffect(() => {
    if (user) {
      loadTopicAvailability();
    }
  }, [loadTopicAvailability, user]);

  const totalAvailableForSelectedTopics = config.topics.reduce(
    (sum, topic) => sum + (topicAvailability[topic] || 0),
    0
  );

  const hasEnoughQuestions = totalAvailableForSelectedTopics >= config.totalQuestions;

  const handleStart = async () => {
    if (existingSessionId || !user) return;
    setStartError('');

    try {
      dispatch(resetInterview());
      const result = await dispatch(startSession(config));
      
      // Check if session was created successfully
      if (result.payload?.session?._id) {
        // Navigate to interview page immediately
        navigate(`/interview/${result.payload.session._id}`);
        return;
      }

      // Handle errors
      if (result.payload?.reason === 'topic_pool_exhausted') {
        setStartError('All questions for selected topics are already completed. Choose different topics.');
        return;
      }

      if (typeof result.payload === 'string') {
        if (result.payload.toLowerCase().includes('active interview session')) {
          await loadActiveSession();
        } else {
          setStartError(result.payload);
        }
        return;
      }

      setStartError('Failed to start interview session. Please try again.');
    } catch (error) {
      setStartError('Error starting interview: ' + (error.message || 'Unknown error'));
    }
  };

  const handleContinueSession = () => {
    if (existingSessionId) {
      dispatch(resetInterview());
      navigate(`/interview/${existingSessionId}`);
    }
  };

  const handleAbandonExistingSession = async () => {
    if (!existingSessionId) return;

    setIsAbandoningSession(true);
    const result = await dispatch(abandonSession(existingSessionId));
    if (abandonSession.fulfilled.match(result)) {
      setExistingSessionId(null);
    } else {
      await loadActiveSession();
    }
    setIsAbandoningSession(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Setup Interview</h1>
        <p className="text-gray-400 mt-1">Configure your practice session</p>
      </div>

      {isCheckingSession ? (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Checking for existing active sessions...</p>
        </div>
      ) : existingSessionId ? (
        <div className="mb-6 bg-yellow-950/40 border border-yellow-900 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <FiAlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-yellow-300 font-semibold">Active Session Found</h2>
              <p className="text-yellow-200/80 text-sm mt-1">
                You have an active interview session. Continue it or start a new one.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleContinueSession}
                  disabled={isLoading || isAbandoningSession}
                  className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <FiPlay className="w-4 h-4" />
                  <span>Continue Session</span>
                </button>
                <button
                  onClick={handleAbandonExistingSession}
                  disabled={isAbandoningSession || isLoading}
                  className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {isAbandoningSession ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <FiTrash2 className="w-4 h-4" />
                  )}
                  <span>Abandon & Start New</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                disabled={isLoadingAvailability || (topicAvailability[topic] || 0) === 0}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  config.topics.includes(topic)
                    ? 'bg-green-600 text-white'
                    : (topicAvailability[topic] || 0) === 0
                      ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {topic.replace(/-/g, ' ')} ({topicAvailability[topic] || 0})
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {isLoadingAvailability
              ? 'Loading topic availability...'
              : `Selected topics have ${totalAvailableForSelectedTopics} available questions.`}
          </p>
          {!isLoadingAvailability && !hasEnoughQuestions && (
            <p className="text-xs text-red-400 mt-1">
              Not enough questions in selected topics for {config.totalQuestions} questions. Reduce count or choose more topics.
            </p>
          )}
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
        {startError && (
          <p className="text-sm text-red-400">{startError}</p>
        )}
        <button
          onClick={handleStart}
          disabled={
            isLoading ||
            config.topics.length === 0 ||
            isCheckingSession ||
            isAbandoningSession ||
            isLoadingAvailability ||
            !hasEnoughQuestions ||
            !user
          }
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
