import { useEffect, useCallback, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  hydrateInterview,
  getNextQuestion,
  submitAnswer,
  executeCode,
  abandonSession,
  setExplanation,
  clearEvaluation,
  resetInterview,
  setCode,
} from '../store/interviewSlice';
import { interviewAPI, questionAPI } from '../services/endpoints';
import CodeEditor from '../components/CodeEditor';
import Timer from '../components/Timer';
import FeedbackPanel from '../components/FeedbackPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FiPlay,
  FiSend,
  FiSkipForward,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiTerminal,
  FiAlertTriangle,
} from 'react-icons/fi';

const DifficultyBadge = ({ level }) => {
  const colors = {
    1: 'bg-green-900 text-green-300',
    2: 'bg-blue-900 text-blue-300',
    3: 'bg-yellow-900 text-yellow-300',
    4: 'bg-orange-900 text-orange-300',
    5: 'bg-red-900 text-red-300',
  };
  const labels = { 1: 'Easy', 2: 'Medium-Easy', 3: 'Medium', 4: 'Medium-Hard', 5: 'Hard' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || colors[3]}`}>
      {labels[level] || `Level ${level}`}
    </span>
  );
};

const InterviewPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    session,
    currentQuestion,
    code,
    explanation,
    executionResult,
    evaluation,
    isLoading,
    isExecuting,
    isSubmitting,
    isComplete,
    questionsRemaining,
    timer,
  } = useSelector((state) => state.interview);

  const [showHints, setShowHints] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  // Ref to CodeEditor for direct value access (bypasses Redux sync issues)
  const editorRef = useRef(null);
  const hydrationInFlightRef = useRef(false);

  const { sessionId } = useParams();

  // Hydrate the active session from the URL when needed.
  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      if (!sessionId) {
        navigate('/interview/setup');
        return;
      }

      if (!/^[0-9a-fA-F]{24}$/.test(sessionId)) {
        navigate('/interview/setup');
        return;
      }

      if (hydrationInFlightRef.current) {
        return;
      }

      if (session?._id === sessionId && currentQuestion) {
        setIsHydrating(false);
        return;
      }

      setIsHydrating(true);
      hydrationInFlightRef.current = true;
      try {
        const { data } = await interviewAPI.getSession(sessionId);
        const loadedSession = data?.data?.session;

        if (!loadedSession) {
          throw new Error('Session not found');
        }

        let loadedQuestion = null;
        if (loadedSession.currentQuestionId?._id) {
          loadedQuestion = loadedSession.currentQuestionId;
        } else if (loadedSession.currentQuestionId) {
          const questionId = typeof loadedSession.currentQuestionId === 'string'
            ? loadedSession.currentQuestionId
            : loadedSession.currentQuestionId?._id;
          if (questionId) {
            const questionResponse = await questionAPI.getQuestion(questionId);
            loadedQuestion = questionResponse?.data?.data?.question || null;
          }
        }

        if (!loadedQuestion && loadedSession.status === 'active') {
          const nextQuestionResponse = await interviewAPI.getNextQuestion(sessionId);
          loadedQuestion = nextQuestionResponse?.data?.data?.question || null;
        }

        const hydratedQuestion = loadedQuestion || (session?._id === sessionId ? currentQuestion : null);

        if (!cancelled) {
          dispatch(hydrateInterview({ session: loadedSession, currentQuestion: hydratedQuestion }));
          setIsHydrating(false);
        }
      } catch (error) {
        if (!cancelled) {
          setIsHydrating(false);
          const statusCode = error?.response?.status;
          if (statusCode === 400 || statusCode === 404) {
            navigate('/interview/setup');
          }
        }
      } finally {
        hydrationInFlightRef.current = false;
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [dispatch, currentQuestion?._id, navigate, session?._id, sessionId]);

  // Navigate to result when complete
  useEffect(() => {
    if (!isHydrating && isComplete && session && session._id === sessionId) {
      navigate(`/interview/${session._id}/result`);
    }
  }, [isComplete, isHydrating, session, sessionId, navigate]);

  // Safety net: never keep users on a permanent loading spinner.
  useEffect(() => {
    if (!isHydrating) return undefined;
    const timerId = setTimeout(() => {
      setIsHydrating(false);
    }, 5000);

    return () => clearTimeout(timerId);
  }, [isHydrating]);

  // Helper to clean up extra closing braces from starter code template
  const cleanupCode = (rawCode) => {
    if (!rawCode) return '';
    
    // Count function opening braces
    const openBraces = (rawCode.match(/\{/g) || []).length;
    const closeBraces = (rawCode.match(/\}/g) || []).length;
    const excess = closeBraces - openBraces;
    
    if (excess > 0) {
      // Remove excess trailing closing braces
      let cleaned = rawCode.trimEnd();
      for (let i = 0; i < excess; i++) {
        cleaned = cleaned.replace(/\}\s*$/, '');
      }
      return cleaned;
    }
    
    return rawCode;
  };

  const handleRunCode = useCallback(() => {
    if (isTimeUp) return;

    // Get current code directly from Monaco editor (source of truth)
    let currentCode = editorRef.current?.getValue() || code || '';
    
    // Clean up any extra template braces
    currentCode = cleanupCode(currentCode);
    
    if (!currentCode.trim()) return;
    
    // Ensure Redux is in sync with editor
    if (currentCode !== code) {
      dispatch(setCode(currentCode));
    }
    
    dispatch(
      executeCode({
        code: currentCode,
        language: session?.config?.language || 'javascript',
        input: customInput || undefined,
      })
    );
    setShowConsole(true);
  }, [dispatch, code, session, customInput, isTimeUp]);

  const handleSubmit = useCallback(() => {
    if (isTimeUp) return;

    if (!session || !currentQuestion) return;
    
    // Get current code directly from Monaco editor (source of truth)
    let currentCode = editorRef.current?.getValue() || code || '';
    
    // Clean up any extra template braces
    currentCode = cleanupCode(currentCode);
    
    // Ensure Redux is in sync with editor
    if (currentCode !== code) {
      dispatch(setCode(currentCode));
    }
    
    dispatch(
      submitAnswer({
        sessionId: session._id,
        answerData: {
          questionId: currentQuestion._id,
          code: currentCode,
          explanation,
          language: session.config?.language || 'javascript',
          timeSpentMs: (timer || 0) * 1000,
        },
      })
    );
  }, [dispatch, session, currentQuestion, code, explanation, timer, isTimeUp]);

  const handleNextQuestion = useCallback(() => {
    if (!session) return;
    dispatch(clearEvaluation());
    dispatch(getNextQuestion(session._id));
  }, [dispatch, session]);

  const handleAbandon = useCallback(() => {
    if (!session) return;
    dispatch(abandonSession(session._id));
    dispatch(resetInterview());
    navigate('/dashboard');
  }, [dispatch, session, navigate]);

  if (isHydrating) {
    return <LoadingSpinner fullScreen />;
  }

  if (!session || session._id !== sessionId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-white">Session not available</h2>
          <p className="text-gray-400 mt-2">
            We could not load this interview session. It may be expired or no longer active.
          </p>
          <button
            onClick={() => navigate('/interview/setup')}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Go to Setup
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-white">Unable to load question</h2>
          <p className="text-gray-400 mt-2">
            This session has no active question right now. Please return to setup and start or continue a valid session.
          </p>
          <button
            onClick={() => navigate('/interview/setup')}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Go to Setup
          </button>
        </div>
      </div>
    );
  }

  const language = session.config?.language || 'javascript';
  const maxQuestions = session.config?.maxQuestions || 5;
  const questionNumber = maxQuestions - questionsRemaining;
  const doneCount = Math.min((session.submissions || []).length, maxQuestions);

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-gray-900 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center space-x-4">
          <h2 className="text-white font-semibold text-sm">
            Q{questionNumber}/{maxQuestions}
          </h2>
          <div className="flex items-center space-x-1">
            {Array.from({ length: maxQuestions }, (_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full ${idx < doneCount ? 'bg-green-500' : 'bg-gray-700'}`}
                title={idx < doneCount ? 'Done' : 'Pending'}
              />
            ))}
          </div>
          <DifficultyBadge level={currentQuestion.difficulty} />
          <span className="text-gray-500 text-sm capitalize">
            {(currentQuestion.topic || '').replace(/-/g, ' ')}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Timer
            startedAt={session.startedAt}
            timeLimitMinutes={session.config?.timeLimitMinutes}
            onExpire={() => setIsTimeUp(true)}
          />
          <button
            onClick={() => setConfirmAbandon(true)}
            className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1"
          >
            <FiXCircle className="w-4 h-4" />
            <span>End</span>
          </button>
        </div>
      </div>

      {/* Main Content — Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Question + Explanation */}
        <div className="w-2/5 flex flex-col border-r border-gray-800 overflow-y-auto">
          <div className="p-5 space-y-4">
            {isTimeUp && (
              <div className="bg-red-950/40 border border-red-900 rounded-lg p-3 text-sm text-red-200">
                Time is up for this interview session. End this session to save progress and start a new one.
              </div>
            )}
            {/* Question Title */}
            <div>
              <h3 className="text-xl font-bold text-white">{currentQuestion.title}</h3>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                  {currentQuestion.type}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {currentQuestion.description}
              </p>
            </div>

            {/* Constraints */}
            {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Constraints</h4>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                  {currentQuestion.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Test Cases (visible ones) */}
            {currentQuestion.testCases && currentQuestion.testCases.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Examples</h4>
                {currentQuestion.testCases
                  .filter((tc) => !tc.isHidden)
                  .slice(0, 3)
                  .map((tc, i) => (
                    <div
                      key={i}
                      className="bg-gray-800 rounded-lg p-3 mb-2 text-sm font-mono"
                    >
                      <p className="text-gray-400">
                        <span className="text-gray-500">Input: </span>
                        <span className="text-green-300">{tc.input}</span>
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Output: </span>
                        <span className="text-blue-300">{tc.expectedOutput}</span>
                      </p>
                      {tc.explanation && (
                        <p className="text-gray-500 mt-1 text-xs">{tc.explanation}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Hints */}
            {currentQuestion.hints && currentQuestion.hints.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 text-sm"
                >
                  {showHints ? <FiChevronUp /> : <FiChevronDown />}
                  <span>{showHints ? 'Hide' : 'Show'} Hints ({currentQuestion.hints.length})</span>
                </button>
                {showHints && (
                  <div className="mt-2 space-y-1">
                    {currentQuestion.hints.map((hint, i) => (
                      <p key={i} className="text-sm text-yellow-200/70 bg-yellow-900/20 px-3 py-2 rounded">
                        💡 {hint}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Explanation Input */}
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                Explain Your Approach (Optional)
              </h4>
              <textarea
                value={explanation}
                onChange={(e) => dispatch(setExplanation(e.target.value))}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe your approach, time/space complexity, tradeoffs..."
              />
            </div>
          </div>

          {/* Feedback Panel (shows after submission) */}
          {evaluation && (
            <div className="p-5 border-t border-gray-800">
              <FeedbackPanel evaluation={evaluation} />
              {!isComplete && questionsRemaining > 0 && (
                <button
                  onClick={handleNextQuestion}
                  disabled={isLoading || isTimeUp}
                  className="mt-4 w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <FiSkipForward className="w-5 h-5" />
                  <span>Next Question ({questionsRemaining} left)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Code Editor + Console */}
        <div className="flex-1 flex flex-col">
          {/* Editor */}
          <div className="flex-1 min-h-0">
            <CodeEditor ref={editorRef} language={language} />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between bg-gray-900 border-t border-gray-800 px-4 py-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunCode}
                disabled={isExecuting || isTimeUp || !code.trim()}
                className="flex items-center space-x-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isExecuting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <FiPlay className="w-4 h-4" />
                )}
                <span>Run</span>
              </button>
              <button
                onClick={() => setShowConsole(!showConsole)}
                className="flex items-center space-x-1.5 text-gray-400 hover:text-gray-300 text-sm px-3 py-2"
              >
                <FiTerminal className="w-4 h-4" />
                <span>Console</span>
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isTimeUp || !code.trim()}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
              <span>Submit</span>
            </button>
          </div>

          {/* Console Output */}
          {showConsole && (
            <div className="h-48 bg-gray-900 border-t border-gray-800 flex flex-col">
              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-medium">Console Output</span>
                {executionResult && (
                  <span
                    className={`text-xs ${
                      (executionResult.stderr || executionResult.exitCode !== 0) ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {(executionResult.stderr || executionResult.exitCode !== 0) ? 'Error' : 'Success'}
                  </span>
                )}
              </div>
              <div className="flex-1 flex overflow-hidden">
                {/* Custom Input */}
                <div className="w-1/3 border-r border-gray-700 flex flex-col">
                  <span className="text-xs text-gray-500 px-3 py-1">Custom Input</span>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white font-mono p-3 resize-none focus:outline-none"
                    placeholder="stdin..."
                  />
                </div>
                {/* Output */}
                <div className="flex-1 p-3 overflow-y-auto">
                  {isExecuting ? (
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <LoadingSpinner size="sm" />
                      <span>Running...</span>
                    </div>
                  ) : executionResult ? (
                    <pre
                      className={`text-sm font-mono whitespace-pre-wrap ${
                        (executionResult.stderr || executionResult.exitCode !== 0) ? 'text-red-400' : 'text-green-300'
                      }`}
                    >
                      {executionResult.stdout || executionResult.stderr || executionResult.compileOutput || 'No output'}
                    </pre>
                  ) : (
                    <p className="text-gray-600 text-sm">Run your code to see output here</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Abandon Confirmation Modal */}
      {confirmAbandon && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <FiAlertTriangle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">End Interview?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              This will abandon your current session. Your progress so far will be saved but the
              session will be marked as abandoned.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmAbandon(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Continue Interview
              </button>
              <button
                onClick={handleAbandon}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
