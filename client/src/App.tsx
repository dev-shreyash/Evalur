import './App.css'
import './index.css'
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store/store';
import { initializeAuth } from './feature/auth/store/authSlice';
import { ReactQueryProvider } from './app/providers/ReactQueryProvider';
import { AppRouter } from './app/router/AppRouter';
import { Toaster } from '../src/components/ui/sonner';

function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(initializeAuth());
  }, []);

  return <>{children}</>;
}

function App() {
  return (
    <Provider store={store}>
      <ReactQueryProvider>
        <AppInitializer>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AppInitializer>
      </ReactQueryProvider>
    </Provider>
  );
}

export default App;
