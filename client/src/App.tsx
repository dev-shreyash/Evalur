import './index.css';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store/store';
import { initializeAuth } from './feature/auth/store/authSlice';
import { ReactQueryProvider } from './app/providers/ReactQueryProvider';
import { AppRouter } from './app/router/AppRouter';
import { Toaster } from '../src/components/ui/sonner';
import { ThemeProvider } from './components/ThemeProvider';

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
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <AppInitializer>
            <BrowserRouter>
              <AppRouter />
              <Toaster position="top-right" richColors />
            </BrowserRouter>
          </AppInitializer>
        </ThemeProvider>
      </ReactQueryProvider>
    </Provider>
  );
}

export default App;
