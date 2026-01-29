
import { Milestone, Job, User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, Clock } from "lucide-react";

interface MilestoneListProps {
    job: Job;
    user: User | null;
    isJobGiver: boolean;
    onRelease: (milestoneId: string) => Promise<void>;
}

export function MilestoneList({ job, user, isJobGiver, onRelease }: MilestoneListProps) {
    const milestones = job.milestones || [];

    if (milestones.length === 0) return null;

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-lg">Project Milestones</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {milestones.map((milestone) => (
                        <div key={milestone.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg bg-white shadow-sm">
                            <div className="mb-3 sm:mb-0">
                                <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                                <p className="text-sm text-gray-500">{milestone.description}</p>
                                <div className="mt-2 flex items-center space-x-2">
                                    <Badge variant={milestone.status === 'released' ? 'default' : 'secondary'}>
                                        {milestone.status}
                                    </Badge>
                                    <span className="text-sm font-medium text-gray-700">
                                        ₹{milestone.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {isJobGiver && milestone.status === 'funded' && (
                                <Button size="sm" onClick={() => onRelease(milestone.id)} className="w-full sm:w-auto">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Release Payment
                                </Button>
                            )}

                            {milestone.status === 'released' && (
                                <div className="flex items-center text-green-600 text-sm font-medium">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Paid
                                </div>
                            )}
                            {milestone.status === 'pending' && (
                                <div className="flex items-center text-gray-400 text-sm font-medium">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Pending
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
