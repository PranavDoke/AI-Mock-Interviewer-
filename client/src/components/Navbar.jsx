import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/authSlice';
import { FiHome, FiPlay, FiBarChart2, FiClock, FiUser, FiLogOut } from 'react-icons/fi';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: FiHome },
    { to: '/interview/setup', label: 'Start Interview', icon: FiPlay },
    { to: '/analytics', label: 'Analytics', icon: FiBarChart2 },
    { to: '/history', label: 'History', icon: FiClock },
    { to: '/profile', label: 'Profile', icon: FiUser },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
              AI
            </div>
            <span className="text-lg font-semibold text-white hidden sm:block">
              Mock Interviewer
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center space-x-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </div>

          {/* User & Logout */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400 hidden sm:block">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
            >
              <FiLogOut size={16} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
