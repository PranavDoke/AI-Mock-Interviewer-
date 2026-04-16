import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard, fetchTopicAnalytics, setPeriod } from '../store/analyticsSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart2,
  FiClock,
  FiTarget,
  FiActivity,
} from 'react-icons/fi';

const PERIODS = ['7d', '30d', '90d', 'all'];
const PERIOD_LABELS = { '7d': 'Week', '30d': 'Month', '90d': 'Quarter', 'all': 'All Time' };

const AnalyticsPage = () => {
  const dispatch = useDispatch();
  const { dashboard, topicDetails, period, isLoading } = useSelector(
    (state) => state.analytics
  );
  const [selectedTopic, setSelectedTopic] = useState(null);

  useEffect(() => {
    dispatch(fetchDashboard(period));
  }, [dispatch, period]);

  useEffect(() => {
    if (selectedTopic) {
      dispatch(fetchTopicAnalytics({ topic: selectedTopic, period }));
    }
  }, [dispatch, selectedTopic]);

  if (isLoading && !dashboard) return <LoadingSpinner fullScreen />;

  const overall = dashboard?.overall || {};
  const topicBreakdown = dashboard?.topics || [];
  const difficultyProg = dashboard?.difficultyProgression || [];
  const improvement = dashboard?.improvementTrend || {};
  const heatmap = dashboard?.activityHeatmap || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Deep dive into your interview performance</p>
        </div>
        <div className="flex space-x-1 mt-4 sm:mt-0 bg-gray-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => dispatch(setPeriod(p))}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {PERIOD_LABELS[p] || p}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <FiBarChart2 className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-500">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-white">{overall.totalSessions ?? 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <FiTarget className="w-5 h-5 text-green-400" />
            <span className="text-xs text-gray-500">Avg Score</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {overall.avgScore != null ? `${Math.round(overall.avgScore)}%` : '—'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <FiClock className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-gray-500">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {overall.avgDuration != null ? `${Math.round(overall.avgDuration)}m` : '—'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <FiActivity className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-gray-500">Questions</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {overall.totalQuestions ?? 0}
          </p>
        </div>
      </div>

      {/* Improvement Trend */}
      {improvement && (improvement.firstHalfAvg != null || improvement.secondHalfAvg != null) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Improvement Trend</h2>
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-1">Earlier Sessions</p>
              <p className="text-xl font-bold text-white">
                {Math.round(improvement.firstHalfAvg ?? 0)}%
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {(improvement.improvement ?? 0) >= 0 ? (
                <div className="flex items-center space-x-2 text-green-400">
                  <FiTrendingUp className="w-8 h-8" />
                  <span className="text-lg font-bold">
                    +{Math.round(improvement.improvement ?? 0)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-400">
                  <FiTrendingDown className="w-8 h-8" />
                  <span className="text-lg font-bold">
                    {Math.round(improvement.improvement ?? 0)}%
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-1">Recent Sessions</p>
              <p className="text-xl font-bold text-white">
                {Math.round(improvement.secondHalfAvg ?? 0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Topic Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Topic Performance</h2>
          {topicBreakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No topic data yet</p>
          ) : (
            <div className="space-y-3">
              {topicBreakdown.map((topic) => {
                const topicId = topic._id || topic.topic;
                const avg = Math.round(topic.avgScore ?? 0);
                return (
                  <button
                    key={topicId}
                    onClick={() => setSelectedTopic(topicId)}
                    className={`w-full text-left space-y-1 p-2 rounded-lg transition-colors ${
                      selectedTopic === topicId
                        ? 'bg-gray-800 ring-1 ring-blue-500'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 capitalize">
                        {(topicId || '').replace(/-/g, ' ')}
                      </span>
                      <span className="text-white font-medium">{avg}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          avg >= 70
                            ? 'bg-green-500'
                            : avg >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, avg)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {topic.attempts ?? 0} questions attempted
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Difficulty Progression */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Difficulty Distribution</h2>
          {difficultyProg.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No difficulty data yet</p>
          ) : (
            <div className="space-y-3">
              {difficultyProg.map((d) => {
                const labels = {
                  1: 'Easy',
                  2: 'Medium-Easy',
                  3: 'Medium',
                  4: 'Medium-Hard',
                  5: 'Hard',
                };
                const colors = {
                  1: 'bg-green-500',
                  2: 'bg-blue-500',
                  3: 'bg-yellow-500',
                  4: 'bg-orange-500',
                  5: 'bg-red-500',
                };
                const avg = Math.round(d.avgScore ?? 0);
                return (
                  <div key={d._id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{labels[d._id] || `Level ${d._id}`}</span>
                      <span className="text-white font-medium">
                        {avg}% ({d.count} Q)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[d._id] || 'bg-gray-500'}`}
                        style={{ width: `${Math.min(100, avg)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Topic Details */}
      {selectedTopic && topicDetails && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 capitalize">
            {selectedTopic.replace(/-/g, ' ')} — Detailed Analytics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {Math.round(topicDetails.avgScore ?? 0)}%
              </p>
              <p className="text-xs text-gray-500">Avg Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{topicDetails.totalAttempts ?? 0}</p>
              <p className="text-xs text-gray-500">Total Attempts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {topicDetails.avgDifficulty ? topicDetails.avgDifficulty.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-gray-500">Avg Difficulty</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {topicDetails.bestScore != null ? `${Math.round(topicDetails.bestScore)}%` : '—'}
              </p>
              <p className="text-xs text-gray-500">Best Score</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Heatmap (simple table-based) */}
      {heatmap.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Activity Calendar</h2>
          <div className="flex flex-wrap gap-1">
            {heatmap.slice(-90).map((day, idx) => {
              const count = day.count || 0;
              const bg =
                count === 0
                  ? 'bg-gray-800'
                  : count <= 1
                  ? 'bg-green-900'
                  : count <= 3
                  ? 'bg-green-700'
                  : 'bg-green-500';
              return (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-sm ${bg}`}
                  title={`${day._id || ''}: ${count} sessions`}
                />
              );
            })}
          </div>
          <div className="flex items-center space-x-2 mt-3 text-xs text-gray-500">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-green-900" />
            <div className="w-3 h-3 rounded-sm bg-green-700" />
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
