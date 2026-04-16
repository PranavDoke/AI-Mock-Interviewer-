import { FiCheckCircle, FiXCircle, FiAlertCircle, FiCode, FiBookOpen, FiMessageSquare } from 'react-icons/fi';

const ScoreBar = ({ label, score }) => {
  const pct = Math.round(score);
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold text-white">{pct}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const getGrade = (score) => {
  if (score >= 90) return { label: 'Excellent', icon: FiCheckCircle, color: 'text-green-400' };
  if (score >= 70) return { label: 'Good', icon: FiCheckCircle, color: 'text-blue-400' };
  if (score >= 50) return { label: 'Fair', icon: FiAlertCircle, color: 'text-yellow-400' };
  return { label: 'Needs Improvement', icon: FiXCircle, color: 'text-red-400' };
};

const FeedbackPanel = ({ evaluation }) => {
  if (!evaluation) return null;

  // API returns scores as integers (0-100):
  // codeCorrectness, codeQuality, explanationClarity, reasoningDepth,
  // structuredThinking, overallScore, feedback, strengths[], improvements[]
  const overallScore = evaluation.overallScore ?? 0;
  const feedback = evaluation.feedback || '';
  const strengths = evaluation.strengths || [];
  const improvements = evaluation.improvements || [];
  const grade = getGrade(overallScore);
  const GradeIcon = grade.icon;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header with overall score */}
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <FiBookOpen />
            <span>AI Feedback</span>
          </h3>
          <div className={`flex items-center space-x-2 ${grade.color}`}>
            <GradeIcon className="w-5 h-5" />
            <span className="font-bold text-lg">{overallScore}%</span>
            <span className="text-sm">— {grade.label}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Score Breakdown
          </h4>
          {evaluation.codeCorrectness !== undefined && (
            <ScoreBar label="Code Correctness" score={evaluation.codeCorrectness} />
          )}
          {evaluation.codeQuality !== undefined && (
            <ScoreBar label="Code Quality" score={evaluation.codeQuality} />
          )}
          {!!evaluation.explanationClarity && (
            <ScoreBar label="Explanation Clarity" score={evaluation.explanationClarity} />
          )}
          {!!evaluation.reasoningDepth && (
            <ScoreBar label="Reasoning Depth" score={evaluation.reasoningDepth} />
          )}
          {!!evaluation.structuredThinking && (
            <ScoreBar label="Structured Thinking" score={evaluation.structuredThinking} />
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
              <FiMessageSquare className="w-4 h-4" />
              <span>Feedback</span>
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{feedback}</p>
          </div>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide flex items-center space-x-1">
              <FiCheckCircle className="w-4 h-4" />
              <span>Strengths</span>
            </h4>
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {improvements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide flex items-center space-x-1">
              <FiAlertCircle className="w-4 h-4" />
              <span>Areas to Improve</span>
            </h4>
            <ul className="space-y-1">
              {improvements.map((imp, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start space-x-2">
                  <span className="text-yellow-400 mt-0.5">→</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPanel;
