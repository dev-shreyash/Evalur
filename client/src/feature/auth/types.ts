export type Role = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CANDIDATE';

export interface User {
  id?: number;
  name: string;
  email: string;
  role: Role;
  organizationName?: string;
}

export type AuthStatus = 'idle' | 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  cachedUser: User | null;
  token: string | null;
  isInitialized: boolean;
  error: string | null;
}

