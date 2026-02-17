import { ShieldCheck, Activity, Users, Settings, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:block">
                <div className="p-6">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-amber-500" />
                        Admin
                    </h1>
                </div>
                <nav className="px-4 space-y-1">
                    <Link href="/admin/ai-health" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                        <Activity className="h-5 w-5" />
                        AI Health
                    </Link>
                    <Link href="/admin/ai-feedback" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <MessageSquare className="h-5 w-5" />
                        AI Feedback
                    </Link>
                    {/* Placeholder links for future admin features */}
                    <Link href="#" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Users className="h-5 w-5" />
                        Users (Soon)
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Settings className="h-5 w-5" />
                        Settings (Soon)
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
