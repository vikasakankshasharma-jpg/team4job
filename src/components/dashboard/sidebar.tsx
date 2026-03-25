import { SidebarNav } from "./sidebar-nav";

export function DashboardSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-20 flex-col border-r border-primary/5 bg-card/10 backdrop-blur-2xl sm:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-500" data-tour="sidebar-header">
      <SidebarNav />
    </aside>
  );
}
