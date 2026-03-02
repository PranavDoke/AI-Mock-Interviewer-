import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import interviewReducer from '../store/interviewSlice';
import analyticsReducer from '../store/analyticsSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';

const createTestStore = (preloadedState = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
      interview: interviewReducer,
      analytics: analyticsReducer,
    },
    preloadedState,
  });

const renderWithProviders = (ui, { preloadedState = {}, ...options } = {}) => {
  const store = createTestStore(preloadedState);
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

describe('LoadingSpinner', () => {
  it('renders correctly', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders full screen variant', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.firstChild.className).toContain('min-h-screen');
  });
});

describe('Navbar', () => {
  it('renders navigation links when authenticated', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: {
          user: { name: 'Test User', email: 'test@test.com' },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        interview: {
          session: null,
          currentQuestion: null,
          code: '',
          explanation: '',
          executionResult: null,
          evaluation: null,
          isLoading: false,
          isExecuting: false,
          isSubmitting: false,
          isComplete: false,
          questionsRemaining: 0,
          error: null,
          timer: 0,
        },
        analytics: {
          dashboard: null,
          topicDetails: null,
          period: 'month',
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.getByText('Mock Interviewer')).toBeTruthy();
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('does not show user name when not authenticated', () => {
    renderWithProviders(<Navbar />, {
      preloadedState: {
        auth: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        },
        interview: {
          session: null,
          currentQuestion: null,
          code: '',
          explanation: '',
          executionResult: null,
          evaluation: null,
          isLoading: false,
          isExecuting: false,
          isSubmitting: false,
          isComplete: false,
          questionsRemaining: 0,
          error: null,
          timer: 0,
        },
        analytics: {
          dashboard: null,
          topicDetails: null,
          period: 'month',
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.queryByText('Test User')).toBeNull();
  });
});
