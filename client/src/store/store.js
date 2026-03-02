import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import interviewReducer from './interviewSlice';
import analyticsReducer from './analyticsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    interview: interviewReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore date serialization warnings
        ignoredActions: ['interview/setSession'],
        ignoredPaths: ['interview.session'],
      },
    }),
});
