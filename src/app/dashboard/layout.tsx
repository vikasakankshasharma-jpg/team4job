
"use client";

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { SearchProvider } from '@/hooks/use-search';
import { Providers } from "@/components/providers";
import Tour from '@/components/tour/tour';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <SearchProvider>
        <div className="flex min-h-screen w-full flex-row bg-muted/40">
          <DashboardSidebar />
          <div className="grid flex-1 auto-rows-auto">
            <Header />
            <main className="grid items-start gap-4 p-4 sm:px-6 md:gap-8">
              {children}
            </main>
          </div>
        </div>
        <Tour />
      </SearchProvider>
  );
}
