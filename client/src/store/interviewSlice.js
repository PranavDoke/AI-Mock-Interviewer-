import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { interviewAPI, executionAPI } from '../services/endpoints';

export const startSession = createAsyncThunk(
  'interview/startSession',
  async (config, { rejectWithValue }) => {
    try {
      // Map frontend field names to API schema field names
      const apiConfig = {
        type: 'technical',
        topics: config.topics,
        language: config.language,
        maxQuestions: config.totalQuestions ?? config.maxQuestions ?? 5,
        timeLimitMinutes: config.duration ?? config.timeLimitMinutes ?? 30,
      };
      const { data } = await interviewAPI.startSession(apiConfig);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start session');
    }
  }
);

export const getNextQuestion = createAsyncThunk(
  'interview/getNextQuestion',
  async (sessionId, { rejectWithValue }) => {
    try {
      const { data } = await interviewAPI.getNextQuestion(sessionId);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get question');
    }
  }
);

export const submitAnswer = createAsyncThunk(
  'interview/submitAnswer',
  async ({ sessionId, answerData }, { rejectWithValue }) => {
    try {
      const { data } = await interviewAPI.submitAnswer(sessionId, answerData);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit answer');
    }
  }
);

export const executeCode = createAsyncThunk(
  'interview/executeCode',
  async ({ code, language, input }, { rejectWithValue }) => {
    try {
      const { data } = await executionAPI.executeCode({ code, language, input });
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to execute code');
    }
  }
);

export const abandonSession = createAsyncThunk(
  'interview/abandonSession',
  async (sessionId, { rejectWithValue }) => {
    try {
      const { data } = await interviewAPI.abandonSession(sessionId);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to abandon session');
    }
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState: {
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
    timer: 0, // seconds elapsed
  },
  reducers: {
    setCode: (state, action) => {
      state.code = action.payload;
    },
    setExplanation: (state, action) => {
      state.explanation = action.payload;
    },
    setTimer: (state, action) => {
      state.timer = action.payload;
    },
    resetInterview: (state) => {
      state.session = null;
      state.currentQuestion = null;
      state.code = '';
      state.explanation = '';
      state.executionResult = null;
      state.evaluation = null;
      state.isComplete = false;
      state.questionsRemaining = 0;
      state.timer = 0;
      state.error = null;
    },
    clearEvaluation: (state) => {
      state.evaluation = null;
      state.executionResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start session
      .addCase(startSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.session = action.payload.session;
        state.currentQuestion = action.payload.currentQuestion;
        const lang = action.payload.session?.config?.language || 'javascript';
        state.code =
          action.payload.currentQuestion?.starterCode?.[lang] ||
          action.payload.currentQuestion?.starterCode?.javascript ||
          '';
        state.isComplete = false;
        state.questionsRemaining = (action.payload.session?.config?.maxQuestions || 5) - 1;
      })
      .addCase(startSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get next question
      .addCase(getNextQuestion.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getNextQuestion.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.completed) {
          state.isComplete = true;
          state.session = action.payload.session || state.session;
        } else {
          const lang = state.session?.config?.language || 'javascript';
          const maxQ = state.session?.config?.maxQuestions || 5;
          state.currentQuestion = action.payload.question;
          state.code =
            action.payload.question?.starterCode?.[lang] ||
            action.payload.question?.starterCode?.javascript ||
            '';
          state.questionsRemaining = maxQ - ((action.payload.questionIndex || 0) + 1);
          state.explanation = '';
          state.evaluation = null;
          state.executionResult = null;
          state.timer = 0;
        }
      })
      .addCase(getNextQuestion.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Submit answer
      .addCase(submitAnswer.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.evaluation = action.payload.evaluation;
        state.isComplete = action.payload.isComplete;
        state.questionsRemaining = action.payload.questionsRemaining;
      })
      .addCase(submitAnswer.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      })
      // Execute code
      .addCase(executeCode.pending, (state) => {
        state.isExecuting = true;
        state.executionResult = null;
      })
      .addCase(executeCode.fulfilled, (state, action) => {
        state.isExecuting = false;
        state.executionResult = action.payload;
      })
      .addCase(executeCode.rejected, (state, action) => {
        state.isExecuting = false;
        state.error = action.payload;
      })
      // Abandon session
      .addCase(abandonSession.fulfilled, (state) => {
        state.session = null;
        state.currentQuestion = null;
        state.isComplete = false;
      });
  },
});

export const { setCode, setExplanation, setTimer, resetInterview, clearEvaluation } = interviewSlice.actions;
export default interviewSlice.reducer;
