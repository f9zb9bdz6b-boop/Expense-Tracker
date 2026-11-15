import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 px-4 lg:px-6 py-4">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
