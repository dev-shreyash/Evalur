import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from '@/api/axios';
import { setupStore } from '@/app/store/store';
import {
  initializeAuth,
  setCredentials,
  logout,
  sessionExpired,
} from './authSlice';
import type { User } from '../types';

vi.mock('@/api/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
    setSessionExpiredHandler: vi.fn(),
  };
});

describe('Redux Toolkit Auth Slice & Session Initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('1. Initializes correctly when no token exists in localStorage', () => {
    const store = setupStore();
    const state = store.getState().auth;

    expect(state.status).toBe('unauthenticated');
    expect(state.isInitialized).toBe(true);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('2. A valid stored token triggers /auth/me during session initialization', async () => {
    localStorage.setItem('token', 'valid-jwt-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'Initial Alice',
        email: 'alice@evalur.com',
        role: 'STAFF',
      })
    );

    const verifiedUser: User = {
      id: 1,
      name: 'Verified Alice',
      email: 'alice@evalur.com',
      role: 'MANAGER',
      organizationName: 'Evalur Org',
    };

    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: verifiedUser,
      },
    });

    const store = setupStore();

    // Verify initial unverified state before async check resolves
    expect(store.getState().auth.status).toBe('idle');
    expect(store.getState().auth.isInitialized).toBe(false);
    expect(store.getState().auth.user).toBeNull(); // Cached profile is not trusted as verified session

    await store.dispatch(initializeAuth());

    // Verified /auth/me was called
    expect(api.get).toHaveBeenCalledWith('/auth/me');

    const updatedState = store.getState().auth;
    expect(updatedState.status).toBe('authenticated');
    expect(updatedState.isInitialized).toBe(true);
    expect(updatedState.user).toEqual(verifiedUser);
    expect(updatedState.token).toBe('valid-jwt-token');

    // Confirms changed role is reflected in store and persisted
    expect(updatedState.user?.role).toBe('MANAGER');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(verifiedUser);
  });

  it('3. An expired/invalid token (HTTP 401) transitions to unauthenticated and clears credentials', async () => {
    localStorage.setItem('token', 'expired-jwt-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ name: 'Bob', email: 'bob@evalur.com', role: 'CANDIDATE' })
    );

    (api.get as any).mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Token expired' } },
    });

    const store = setupStore();
    await store.dispatch(initializeAuth());

    const state = store.getState().auth;
    expect(state.status).toBe('unauthenticated');
    expect(state.isInitialized).toBe(true);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();

    // Credentials purged from localStorage
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('4. Changed backend role/profile is reflected after successful verification', async () => {
    localStorage.setItem('token', 'promoted-user-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ name: 'Charlie', email: 'charlie@evalur.com', role: 'STAFF' })
    );

    const promotedUser: User = {
      id: 5,
      name: 'Charlie Staff',
      email: 'charlie@evalur.com',
      role: 'ADMIN',
      organizationName: 'Evalur Inc',
    };

    (api.get as any).mockResolvedValueOnce({
      data: { success: true, data: promotedUser },
    });

    const store = setupStore();
    await store.dispatch(initializeAuth());

    const state = store.getState().auth;
    expect(state.user?.role).toBe('ADMIN');
    expect(JSON.parse(localStorage.getItem('user')!).role).toBe('ADMIN');
  });

  it('5. Network errors and HTTP 5xx DO NOT silently delete valid stored credentials or log user out', async () => {
    localStorage.setItem('token', 'stored-valid-token');
    const cachedProfile = {
      id: 7,
      name: 'Dana',
      email: 'dana@evalur.com',
      role: 'MANAGER' as const,
    };
    localStorage.setItem('user', JSON.stringify(cachedProfile));

    // Simulate server 500 error
    (api.get as any).mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Internal Server Error' } },
    });

    const store = setupStore();
    await store.dispatch(initializeAuth());

    const state = store.getState().auth;
    // Status is recoverable error, NOT unauthenticated!
    expect(state.status).toBe('error');
    expect(state.isInitialized).toBe(true);
    expect(state.error).toContain('Internal Server Error');

    // Crucial: Token and cached user are PRESERVED!
    expect(localStorage.getItem('token')).toBe('stored-valid-token');
    expect(localStorage.getItem('user')).toBeTruthy();
    expect(state.token).toBe('stored-valid-token');
    expect(state.cachedUser).toEqual(cachedProfile);
  });

  it('6. Network timeout (no response) preserves credentials and sets error state', async () => {
    localStorage.setItem('token', 'offline-token');
    (api.get as any).mockRejectedValueOnce(new Error('Network Error: Failed to fetch'));

    const store = setupStore();
    await store.dispatch(initializeAuth());

    const state = store.getState().auth;
    expect(state.status).toBe('error');
    expect(state.error).toContain('Failed to fetch');
    expect(localStorage.getItem('token')).toBe('offline-token');
  });

  it('7. Login and logout correctly update Redux state and persistence', () => {
    const store = setupStore();

    const loggedInUser: User = {
      id: 10,
      name: 'Frank',
      email: 'frank@evalur.com',
      role: 'CANDIDATE',
    };

    // Dispatch login / setCredentials
    store.dispatch(setCredentials({ user: loggedInUser, token: 'new-jwt-token' }));

    let state = store.getState().auth;
    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(loggedInUser);
    expect(state.token).toBe('new-jwt-token');
    expect(state.isInitialized).toBe(true);
    expect(localStorage.getItem('token')).toBe('new-jwt-token');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(loggedInUser);

    // Dispatch logout
    store.dispatch(logout());

    state = store.getState().auth;
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('8. Session expired clears credentials and sets user-friendly expiration message', () => {
    localStorage.setItem('token', 'active-token');
    const store = setupStore();

    store.dispatch(sessionExpired());

    const state = store.getState().auth;
    expect(state.status).toBe('unauthenticated');
    expect(state.error).toContain('Your session has expired');
    expect(localStorage.getItem('token')).toBeNull();
  });
});

