import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../store/analyticsSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FiPlay,
  FiTrendingUp,
  FiTarget,
  FiClock,
  FiAward,
  FiBarChart2,
  FiZap,
} from 'react-icons/fi';

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-blue-400' }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <Icon className={`w-6 h-6 ${color}`} />
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
  </div>
);

const TopicBadge = ({ topic, level }) => {
  const colors = {
    1: 'bg-gray-700 text-gray-300',
    2: 'bg-blue-900 text-blue-300',
    3: 'bg-green-900 text-green-300',
    4: 'bg-yellow-900 text-yellow-300',
    5: 'bg-red-900 text-red-300',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
        colors[level] || colors[1]
      }`}
    >
      {topic} · Lv.{level}
    </span>
  );
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { dashboard, isLoading } = useSelector((state) => state.analytics);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  if (isLoading && !dashboard) return <LoadingSpinner fullScreen />;

  const stats = dashboard?.overall || {};
  const recentSessions = dashboard?.recentPerformance || [];
  const topicBreakdown = dashboard?.topics || [];
  const skillTopicEntries = user?.skillProfile?.topics
    ? user.skillProfile.topics instanceof Map
      ? Array.from(user.skillProfile.topics.entries())
      : Object.entries(user.skillProfile.topics)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-400 mt-1">Track your progress and keep improving</p>
        </div>
        <Link
          to="/interview/setup"
          className="mt-4 md:mt-0 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <FiPlay className="w-5 h-5" />
          <span>Start Interview</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FiBarChart2}
          label="Total Sessions"
          value={stats.totalSessions ?? 0}
          color="text-blue-400"
        />
        <StatCard
          icon={FiTarget}
          label="Avg Score"
          value={stats.avgScore != null ? `${Math.round(stats.avgScore)}%` : '—'}
          color="text-green-400"
        />
        <StatCard
          icon={FiZap}
          label="Current Streak"
          value={user?.stats?.streak ?? 0}
          sub="consecutive days"
          color="text-yellow-400"
        />
        <StatCard
          icon={FiAward}
          label="Completed"
          value={stats.completedSessions ?? 0}
          sub={`of ${stats.totalSessions ?? 0} started`}
          color="text-purple-400"
        />
      </div>

      {/* Two Columns: Recent Sessions + Topic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <FiClock className="w-5 h-5 text-gray-400" />
              <span>Recent Sessions</span>
            </h2>
            <Link to="/history" className="text-sm text-blue-400 hover:text-blue-300">
              View all
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No sessions yet</p>
              <Link
                to="/interview/setup"
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
              >
                Start your first interview
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session) => (
                <Link
                  key={session._id}
                  to={`/interview/${session._id}/result`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {session.config?.topics?.join(', ') || 'General'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString()} ·{' '}
                      {session.submissions?.length ?? 0} questions
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-bold ${
                        (session.scores?.overall ?? 0) >= 70
                          ? 'text-green-400'
                          : (session.scores?.overall ?? 0) >= 50
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {session.scores?.overall != null
                        ? `${Math.round(session.scores.overall)}%`
                        : '—'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Topic Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <FiTrendingUp className="w-5 h-5 text-gray-400" />
              <span>Topic Skills</span>
            </h2>
            <Link to="/analytics" className="text-sm text-blue-400 hover:text-blue-300">
              Details
            </Link>
          </div>

          {topicBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Complete sessions to see topic breakdown</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topicBreakdown.map((topic) => (
                <div key={topic._id || topic.topic} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 capitalize">
                      {(topic._id || topic.topic || '').replace(/-/g, ' ')}
                    </span>
                    <span className="text-white font-medium">
                      {Math.round(topic.avgScore ?? 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (topic.avgScore ?? 0) >= 70
                          ? 'bg-green-500'
                          : (topic.avgScore ?? 0) >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, topic.avgScore ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skill Badges */}
          {skillTopicEntries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Your skill levels</p>
              <div className="flex flex-wrap gap-2">
                {skillTopicEntries.map(([topic, data]) => (
                  <TopicBadge key={topic} topic={topic} level={data?.level || 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
