
import { z } from 'zod';

export const startWorkSchema = z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    otp: z.union([z.string(), z.number()]).transform((val) => val.toString()),
    userId: z.string().min(1, 'User ID is required'),
});

export const rescheduleJobSchema = z.object({
    action: z.enum(['propose', 'accept', 'reject', 'dismiss']),
    userId: z.string().min(1, 'User ID is required'),
    proposedDate: z.string().datetime().optional(), // ISO string expected
    userRole: z.string().optional(),
}).refine((data) => {
    if (data.action === 'propose' && !data.proposedDate) {
        return false;
    }
    return true;
}, {
    message: "Proposed date is required for 'propose' action",
    path: ["proposedDate"],
});

export type StartWorkInput = z.infer<typeof startWorkSchema>;
export type RescheduleJobInput = z.infer<typeof rescheduleJobSchema>;
