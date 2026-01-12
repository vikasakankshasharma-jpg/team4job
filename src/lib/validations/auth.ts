
import { z } from 'zod';

export const verifyEmailSchema = z.object({
    email: z.string().email('Invalid email address'),
    action: z.enum(['send', 'verify']),
    otp: z.string().length(6, 'OTP must be 6 digits').optional(),
}).refine((data) => {
    if (data.action === 'verify' && !data.otp) {
        return false;
    }
    return true;
}, {
    message: "OTP is required for verification",
    path: ["otp"],
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
