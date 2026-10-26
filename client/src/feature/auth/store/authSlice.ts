import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '@/api/axios';
import type { User, AuthState } from '../types';

export const getInitialAuthState = (): AuthState => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let cachedUser: User | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        cachedUser = JSON.parse(raw);
      } catch {
        cachedUser = null;
      }
    }
  }

  return {
    status: token ? 'idle' : 'unauthenticated',
    user: null, // Cached user is for optimistic pre-rendering only; verified session requires /auth/me
    cachedUser,
    token,
    isInitialized: !token, // If no token exists, initialization is already complete
    error: null,
  };
};

export interface RejectPayload {
  reason: 'unauthorized' | 'forbidden' | 'network_or_server_error';
  status?: number;
  message?: string;
}

export const initializeAuth = createAsyncThunk<
  { user: User; token: string } | { unauthenticated: true },
  void,
  { state: { auth: AuthState }; rejectValue: RejectPayload }
>(
  'auth/initializeAuth',
  async (_, { rejectWithValue }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return { unauthenticated: true };
    }

    try {
      const response = await api.get('/auth/me');
      const payload = response.data?.data || response.data;
      if (!payload || !payload.email) {
        throw new Error('Invalid user profile response from server');
      }

      const verifiedUser: User = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        organizationName: payload.organizationName,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(verifiedUser));
      }

      return { user: verifiedUser, token };
    } catch (err: any) {
      const status = err?.response?.status;

      // 401 Unauthorized: token expired/invalid -> purge credentials
      if (status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        return rejectWithValue({
          reason: 'unauthorized',
          status: 401,
          message: 'Session expired or invalid credentials.',
        });
      }

      // 403 on /auth/me: user identity revoked or invalid session on backend -> purge
      if (status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        return rejectWithValue({
          reason: 'forbidden',
          status: 403,
          message: 'Access to this account is forbidden.',
        });
      }

      // Network errors, timeouts, and 5xx responses:
      // PRESERVE stored credentials and distinguish verification failure from being logged out
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to verify session due to a network or server issue.';

      return rejectWithValue({
        reason: 'network_or_server_error',
        status: status || 0,
        message: errorMessage,
      });
    }
  },
  {
    condition: (_, { getState }) => {
      const { auth } = getState();
      // Prevent duplicate concurrent initialization requests
      if (auth.status === 'initializing') {
        return false;
      }
    },
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialAuthState(),
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.cachedUser = action.payload.user;
      state.token = action.payload.token;
      state.isInitialized = true;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      }
    },
    logout: (state) => {
      state.status = 'unauthenticated';
      state.user = null;
      state.cachedUser = null;
      state.token = null;
      state.isInitialized = true;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },
    sessionExpired: (state) => {
      state.status = 'unauthenticated';
      state.user = null;
      state.cachedUser = null;
      state.token = null;
      state.isInitialized = true;
      state.error = 'Your session has expired. Please log in again.';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.status = 'initializing';
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if ('unauthenticated' in action.payload) {
          state.status = 'unauthenticated';
          state.user = null;
          state.cachedUser = null;
          state.token = null;
          state.isInitialized = true;
          state.error = null;
          return;
        }

        state.status = 'authenticated';
        state.user = action.payload.user;
        state.cachedUser = action.payload.user;
        state.token = action.payload.token;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isInitialized = true;
        const reason = action.payload?.reason;
        if (reason === 'unauthorized' || reason === 'forbidden') {
          state.status = 'unauthenticated';
          state.user = null;
          state.cachedUser = null;
          state.token = null;
          state.error = action.payload?.message || null;
        } else {
          // Network or server 5xx error: credentials preserved in localStorage and state
          state.status = 'error';
          state.error =
            action.payload?.message ||
            'Unable to reach server to verify session. Please check your connection and retry.';
        }
      });
  },
});

export const { setCredentials, logout, sessionExpired, clearAuthError } = authSlice.actions;

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCachedUser = (state: { auth: AuthState }) => state.auth.cachedUser;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated' && !!state.auth.user;
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectIsAuthInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;

export default authSlice.reducer;

