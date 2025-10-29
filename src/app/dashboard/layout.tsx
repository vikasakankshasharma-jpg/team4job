
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
          <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <Header />
            <main className="grid flex-1 gap-4 p-4 sm:px-6 md:gap-8">
              {children}
            </main>
          </div>
        </div>
        <Tour />
      </SearchProvider>
  );
}
