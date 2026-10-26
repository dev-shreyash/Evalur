import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  selectAuth,
  selectCurrentUser,
  selectCachedUser,
  selectIsAuthenticated,
  setCredentials,
  logout as logoutAction,
  initializeAuth,
} from '../store/authSlice';
import type { User } from '../types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectCurrentUser);
  const cachedUser = useAppSelector(selectCachedUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const login = useCallback(
    (token: string, userData: User) => {
      dispatch(setCredentials({ token, user: userData }));
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  const retryAuth = useCallback(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return {
    user,
    cachedUser,
    token: auth.token,
    isAuthenticated,
    isLoading: !auth.isInitialized || auth.status === 'initializing',
    isInitialized: auth.isInitialized,
    status: auth.status,
    error: auth.error,
    login,
    logout,
    retryAuth,
  };
};

export default useAuth;

