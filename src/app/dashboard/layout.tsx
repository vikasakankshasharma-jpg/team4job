import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { DashboardProviders } from '@/components/dashboard/dashboard-providers';
import { BetaFeedbackButton } from '@/components/dashboard/beta-feedback-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
      <div className="flex min-h-screen w-full flex-row bg-muted/40 overflow-x-hidden">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col sm:ml-14 min-w-0">
          <Header />
          <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 md:gap-8 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <BetaFeedbackButton />
      <MobileBottomNav />
    </DashboardProviders>
  );
}
