import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer, { sessionExpired, getInitialAuthState } from '@/feature/auth/store/authSlice';
import { setSessionExpiredHandler } from '@/api/axios';

const rootReducer = combineReducers({
  auth: authReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        ...getInitialAuthState(),
        ...preloadedState?.auth,
      },
      ...preloadedState,
    },
  });
};

export const store = setupStore();

setSessionExpiredHandler(() => {
  store.dispatch(sessionExpired());
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = typeof store.dispatch;

export default store;

