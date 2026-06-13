import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchMe,
  login as apiLogin,
  loginWithLocks,
  register as apiRegister,
  type LocksLoginInput,
} from './api';
import { clearSession, getSessionUser, saveSession, type SessionUser } from './session';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithProviderTokens: (locks: LocksLoginInput) => Promise<void>;
  logout: () => void;
  completeOAuth: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getSessionUser();
    if (!cached) {
      setLoading(false);
      return;
    }

    fetchMe()
      .then(({ user: me }) => setUser(me))
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await apiLogin(email, password);
    saveSession(loggedIn, token);
    setUser(loggedIn);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user: registered } = await apiRegister(name, email, password);
    saveSession(registered, token);
    setUser(registered);
  }, []);

  const loginWithProviderTokens = useCallback(async (locks: LocksLoginInput) => {
    const { token, user: loggedIn } = await loginWithLocks(locks);
    saveSession(loggedIn, token);
    setUser(loggedIn);
  }, []);

  const completeOAuth = useCallback(async (token: string) => {
    saveSession({ id: '', name: '', email: '', avatarUrl: null, provider: 'oauth' }, token);
    const { user: me } = await fetchMe();
    saveSession(me, token);
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithProviderTokens,
      logout,
      completeOAuth,
    }),
    [user, loading, login, register, loginWithProviderTokens, logout, completeOAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
