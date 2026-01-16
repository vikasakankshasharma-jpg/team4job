
"use client";

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { SearchProvider } from '@/hooks/use-search';
import { Providers } from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchProvider>
      <div className="flex min-h-screen w-full flex-row bg-muted/40">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col sm:ml-14">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:gap-8 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </SearchProvider>
  );
}
