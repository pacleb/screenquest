'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { Sidebar } from '@/components/sidebar';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <ToastProvider>
      <AuthProvider>
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-60 flex-1 p-8">{children}</main>
          </div>
        )}
      </AuthProvider>
    </ToastProvider>
  );
}
