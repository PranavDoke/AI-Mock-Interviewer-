import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { interviewAPI } from '../services/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FiCalendar,
  FiClock,
  FiTarget,
  FiChevronRight,
  FiFilter,
} from 'react-icons/fi';

const HistoryPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 10, sortBy: 'createdAt', order: 'desc' };
        if (statusFilter) params.status = statusFilter;
        const { data } = await interviewAPI.listSessions(params);
        setSessions(data.data?.results || data.data || []);
        setTotalPages(data.pagination?.pages || 1);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [page, statusFilter]);

  const statusColors = {
    completed: 'bg-green-900 text-green-300',
    active: 'bg-blue-900 text-blue-300',
    abandoned: 'bg-red-900 text-red-300',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Session History</h1>
          <p className="text-gray-400 mt-1">Review your past interview sessions</p>
        </div>
        <div className="flex items-center space-x-2">
          <FiFilter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="active">Active</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No sessions found</p>
          <Link
            to="/interview/setup"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Start your first interview
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session._id}
                to={`/interview/${session._id}/result`}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        statusColors[session.status] || 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {session.status}
                    </span>
                    <span className="text-sm text-gray-300 capitalize">
                      {session.config?.language || '—'}
                    </span>
                  </div>
                  <p className="text-white font-medium mb-1">
                    {session.config?.topics?.map((t) => t.replace(/-/g, ' ')).join(', ') ||
                      'General'}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <FiCalendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiClock className="w-3.5 h-3.5" />
                      <span>
                        {session.durationMs
                          ? `${Math.round(session.durationMs / 60000)}m`
                          : '—'}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiTarget className="w-3.5 h-3.5" />
                      <span>
                        {session.submissions?.length ?? 0} questions
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {session.scores?.overall != null && (
                    <span
                      className={`text-2xl font-bold ${
                        session.scores.overall >= 70
                          ? 'text-green-400'
                          : session.scores.overall >= 50
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {Math.round(session.scores.overall)}%
                    </span>
                  )}
                  <FiChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-700 text-sm"
              >
                Previous
              </button>
              <span className="text-gray-500 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-700 text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryPage;
