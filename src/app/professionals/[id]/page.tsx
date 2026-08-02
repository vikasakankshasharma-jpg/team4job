import React from 'react';
import { notFound } from 'next/navigation';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Briefcase, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@/lib/types';

export const revalidate = 3600; // Cache for 1 hour

async function getProfessional(id: string): Promise<User | null> {
    const db = getAdminDb();
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as any;
    if (!data.roles?.includes('Professional')) return null;
    return { id: doc.id, ...data } as User;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const professional = await getProfessional(resolvedParams.id);
    if (!professional) return { title: 'Professional Not Found' };
    
    return {
        title: `${professional.name} | Professional on Team4Job`,
        description: professional.professionalProfile?.bio || `View ${professional.name}'s professional profile on Team4Job.`,
    };
}

export default async function ProfessionalProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const professional = await getProfessional(resolvedParams.id);

    if (!professional) {
        notFound();
    }

    const { professionalProfile } = professional;
    const joinDate = professional.memberSince ? new Date((professional.memberSince as any)._seconds * 1000).toLocaleDateString() : 'Unknown';

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Profile Header */}
                <div className="bg-background rounded-2xl shadow-sm overflow-hidden mb-8">
                    <div className="h-32 bg-blue-600"></div>
                    <div className="px-8 pb-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12 gap-6">
                            <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                                <AvatarImage src={professional.avatarUrl || ''} />
                                <AvatarFallback className="text-4xl">{professional.name?.charAt(0) || 'P'}</AvatarFallback>
                            </Avatar>
                            <div className="text-center sm:text-left flex-1">
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                                    {professional.name}
                                    {professionalProfile?.verified && (
                                        <span title="Verified Professional">
                                            <CheckCircle className="h-6 w-6 text-blue-500" />
                                        </span>
                                    )}
                                </h1>
                                <p className="text-gray-500 text-lg mt-1">{professionalProfile?.specialties?.[0] || 'Professional'}</p>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-gray-600">
                                    {professional.address?.city && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {professional.address.city}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        Joined {joinDate}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column - Stats & Info */}
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <Star className="h-5 w-5 text-yellow-500" /> Rating
                                    </span>
                                    <span className="font-semibold">{professionalProfile?.rating?.toFixed(1) || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-blue-500" /> Jobs Completed
                                    </span>
                                    <span className="font-semibold">{professionalProfile?.reviews || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Total Earned</span>
                                    <span className="font-semibold">N/A</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Skills</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {professionalProfile?.skills?.map((skill, index) => (
                                        <Badge key={index} variant="secondary">{skill}</Badge>
                                    )) || <span className="text-gray-500">No skills listed</span>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - About & Portfolio */}
                    <div className="md:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">About Me</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none text-gray-700">
                                    {professionalProfile?.bio ? (
                                        <p className="whitespace-pre-line">{professionalProfile.bio}</p>
                                    ) : (
                                        <p className="text-gray-500 italic">This professional hasn&apos;t added a bio yet.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Can add Portfolio or Reviews here later */}
                    </div>
                </div>
            </div>
        </div>
    );
}
