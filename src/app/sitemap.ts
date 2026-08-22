import { MetadataRoute } from 'next';
import { getAdminDb } from '@/infrastructure/firebase/admin';

export const revalidate = 86400; // Revalidate every 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.team4job.com';
  
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const db = getAdminDb();
    
    // Helper function with retry logic for transient Firestore blips
    const fetchWithRetry = async (query: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await query.get();
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff: 1s, 2s, 4s...
        }
      }
    };

    // Fetch active jobs
    const jobsSnapshot = await fetchWithRetry(
      db.collection('jobs').where('status', 'in', ['Open for Bidding', 'open'])
    );

    jobsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const lastModified = data.postedAt?.toDate() || new Date();
      routes.push({
        url: `${baseUrl}/jobs/${doc.id}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

    // Fetch professional profiles
    const usersSnapshot = await fetchWithRetry(
      db.collection('users').where('roles', 'array-contains', 'Professional').where('status', '==', 'active')
    );

    usersSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const lastModified = data.memberSince?.toDate() || new Date();
      routes.push({
        url: `${baseUrl}/professionals/${doc.id}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
    throw new Error(`Failed to generate dynamic sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return routes;
}
