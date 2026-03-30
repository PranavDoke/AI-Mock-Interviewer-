import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser } from '../store/authSlice';
import { userAPI, authAPI } from '../services/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  FiUser,
  FiMail,
  FiCode,
  FiSave,
  FiLock,
  FiSettings,
} from 'react-icons/fi';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'c', label: 'C' },
];

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);

  const [profileForm, setProfileForm] = useState({
    name: '',
    preferences: {
      preferredLanguage: 'javascript',
      interviewDuration: 30,
    },
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        preferences: {
          preferredLanguage: user.preferences?.preferredLanguage || 'javascript',
          interviewDuration: user.preferences?.interviewDuration || 30,
        },
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await userAPI.updateProfile(profileForm);
      dispatch(loadUser());
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading || !user) return <LoadingSpinner fullScreen />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FiUser className="w-4 h-4" />
          <span>Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FiSettings className="w-4 h-4" />
          <span>Preferences</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FiLock className="w-4 h-4" />
          <span>Security</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
            </div>

            {/* Stats Display */}
            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Your Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-white">
                    {user.stats?.totalInterviews ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Interviews</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">
                    {user.stats?.avgScore != null
                      ? `${Math.round(user.stats.avgScore)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Avg Score</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">
                    {user.stats?.streak ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Streak</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {savingProfile ? (
              <LoadingSpinner size="sm" />
            ) : (
              <FiSave className="w-5 h-5" />
            )}
            <span>Save Profile</span>
          </button>
        </form>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <FiCode className="inline w-4 h-4 mr-1" />
                Default Language
              </label>
              <div className="grid grid-cols-5 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() =>
                      setProfileForm((p) => ({
                        ...p,
                        preferences: { ...p.preferences, preferredLanguage: lang.id },
                      }))
                    }
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      profileForm.preferences.preferredLanguage === lang.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Default Session Duration (minutes)
              </label>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={profileForm.preferences.interviewDuration}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    preferences: { ...p.preferences, interviewDuration: Number(e.target.value) },
                  }))
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 min</span>
                <span className="text-white font-medium">
                  {profileForm.preferences.interviewDuration} min
                </span>
                <span>120 min</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {savingProfile ? <LoadingSpinner size="sm" /> : <FiSave className="w-5 h-5" />}
            <span>Save Preferences</span>
          </button>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                }
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                }
                required
                minLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {savingPassword ? <LoadingSpinner size="sm" /> : <FiLock className="w-5 h-5" />}
            <span>Change Password</span>
          </button>
        </form>
      )}

      {/* Account Info */}
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Account Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-300">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-300 capitalize">{user.role || 'user'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
