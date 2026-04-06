import { redirect } from 'next/navigation';

/**
 * /jobs is a public-facing URL used in the homepage navbar and footer.
 * Redirect to the authenticated browse jobs page.
 * If unauthenticated, the dashboard shell will show the sign-in CTA.
 */
export default function JobsRedirectPage() {
    redirect('/dashboard/jobs');
}
