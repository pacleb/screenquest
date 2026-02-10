'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated, logout } from '@/lib/auth';

interface AuthContextType {
  authed: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ authed: false, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthed(ok);
    setChecking(false);
    if (!ok && pathname !== '/login') {
      router.replace('/login');
    }
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ authed, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
