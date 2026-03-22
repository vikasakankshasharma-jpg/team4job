import { getDashboardStatsAction } from "@/app/actions/dashboard.actions";
import { auth } from "@/infrastructure/firebase/client";

export default async function VerifyStatsPage() {
    // This is a server component - it uses Admin SDK via the action
    const data = await getDashboardStatsAction('audit-user-id');
    
    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>Dashboard Data Verification</h1>
            <p>If you see data below, the Server Actions and Backend are working perfectly.</p>
            <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '8px' }}>
                {JSON.stringify(data, null, 2)}
            </pre>
            <hr />
            <p>Environment Check:</p>
            <ul>
                <li>Server Time: {new Date().toISOString()}</li>
                <li>Action Success: {data.success ? 'YES' : 'NO'}</li>
            </ul>
        </div>
    );
}
