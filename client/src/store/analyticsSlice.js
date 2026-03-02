import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsAPI } from '../services/endpoints';

export const fetchDashboard = createAsyncThunk(
  'analytics/fetchDashboard',
  async (period = '30d', { rejectWithValue }) => {
    try {
      const { data } = await analyticsAPI.getDashboard(period);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }
);

export const fetchTopicAnalytics = createAsyncThunk(
  'analytics/fetchTopicAnalytics',
  async ({ topic, period }, { rejectWithValue }) => {
    try {
      const { data } = await analyticsAPI.getTopicAnalytics(topic, period);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch topic analytics');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    dashboard: null,
    topicDetails: null,
    period: '30d',
    isLoading: false,
    error: null,
  },
  reducers: {
    setPeriod: (state, action) => {
      state.period = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchTopicAnalytics.fulfilled, (state, action) => {
        state.topicDetails = action.payload;
      });
  },
});

export const { setPeriod } = analyticsSlice.actions;
export default analyticsSlice.reducer;
