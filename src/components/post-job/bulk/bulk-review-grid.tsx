
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

interface BulkReviewGridProps {
    jobs: any[];
    onRemove: (index: number) => void;
    onSubmitAll: () => void;
    isSubmitting: boolean;
}

export function BulkReviewGrid({ jobs, onRemove, onSubmitAll, isSubmitting }: BulkReviewGridProps) {
    return (
        <Card data-testid="bulk-review-grid" className="overflow-hidden border-2 border-primary/20 shadow-xl">
            <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg">Review Bulk Submissions</h3>
                    <p className="text-sm text-muted-foreground">Confirm the details for {jobs.length} jobs before posting.</p>
                </div>
                <Button
                    onClick={onSubmitAll}
                    disabled={isSubmitting || jobs.length === 0}
                    className="shadow-lg shadow-primary/20"
                >
                    Post All {jobs.length} Jobs
                </Button>
            </div>

            <div className="max-h-[500px] overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[300px]">Title</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Pincode</TableHead>
                            <TableHead>Budget</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs.map((job, idx) => (
                            <TableRow key={idx} className="group hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        {job.title}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                                    {job.address || "No address provided"}
                                </TableCell>
                                <TableCell>{job.pincode}</TableCell>
                                <TableCell>
                                    {job.budget ? `₹${job.budget.min} - ₹${job.budget.max}` : "N/A"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => onRemove(idx)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {jobs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No jobs remaining in the queue.</p>
                </div>
            )}
        </Card>
    );
}
