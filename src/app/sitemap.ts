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
    
    // Fetch active jobs
    const jobsSnapshot = await db
      .collection('jobs')
      .where('status', 'in', ['Open for Bidding', 'open'])
      .get();

    jobsSnapshot.forEach((doc) => {
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
    const usersSnapshot = await db
      .collection('users')
      .where('roles', 'array-contains', 'Professional')
      .where('status', '==', 'active')
      .get();

    usersSnapshot.forEach((doc) => {
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
  }

  return routes;
}
