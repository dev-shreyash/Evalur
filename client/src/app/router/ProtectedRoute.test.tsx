import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { setupStore } from '@/app/store/store';
import ProtectedRoute from './ProtectedRoute';
import type { User, AuthStatus } from '@/feature/auth/types';

describe('ProtectedRoute Session & Role Enforcement', () => {
  const renderProtectedRoute = ({
    status = 'authenticated' as AuthStatus,
    isInitialized = true,
    user = null as User | null,
    error = null as string | null,
    allowedRoles = ['ADMIN', 'MANAGER'],
    initialEntry = '/admin/dashboard',
  }) => {
    const store = setupStore({
      auth: {
        status,
        isInitialized,
        user,
        cachedUser: user,
        token: user ? 'token' : null,
        error,
      },
    });

    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
              <Route path="/admin/dashboard" element={<div>Protected Dashboard Content</div>} />
            </Route>
            <Route path="/auth/login" element={<div>Login Page Redirect Target</div>} />
            <Route path="/unauthorized" element={<div>Unauthorized Page Redirect Target</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

  it('1. Waits for session verification before making redirects (does not prematurely bounce to login)', () => {
    renderProtectedRoute({
      status: 'initializing',
      isInitialized: false,
      user: null,
    });

    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
    expect(screen.queryByText('Login Page Redirect Target')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('2. Unauthenticated user is redirected to /auth/login after initialization completes', () => {
    renderProtectedRoute({
      status: 'unauthenticated',
      isInitialized: true,
      user: null,
    });

    expect(screen.getByText('Login Page Redirect Target')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('3. Authenticated user with matching role accesses protected route', () => {
    const adminUser: User = {
      id: 1,
      name: 'Admin Alice',
      email: 'admin@evalur.com',
      role: 'ADMIN',
    };

    renderProtectedRoute({
      status: 'authenticated',
      isInitialized: true,
      user: adminUser,
      allowedRoles: ['ADMIN'],
    });

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page Redirect Target')).not.toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Page Redirect Target')).not.toBeInTheDocument();
  });

  it('4. Authenticated user with forbidden role is redirected to /unauthorized', () => {
    const candidateUser: User = {
      id: 2,
      name: 'Candidate Bob',
      email: 'bob@evalur.com',
      role: 'CANDIDATE',
    };

    renderProtectedRoute({
      status: 'authenticated',
      isInitialized: true,
      user: candidateUser,
      allowedRoles: ['ADMIN', 'MANAGER'],
    });

    expect(screen.getByText('Unauthorized Page Redirect Target')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page Redirect Target')).not.toBeInTheDocument();
  });

  it('5. Network/server error provides recoverable screen with Retry button and does not kick user to login', () => {
    renderProtectedRoute({
      status: 'error',
      isInitialized: true,
      user: null,
      error: 'Backend connection timeout',
    });

    expect(screen.getByText('Session Verification Paused')).toBeInTheDocument();
    expect(screen.getByText('Backend connection timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByText('Login Page Redirect Target')).not.toBeInTheDocument();
  });
});

