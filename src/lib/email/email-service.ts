import { sendServerEmail } from '@/lib/server-email';

interface SendInvoiceEmailProps {
    to: string;
    userName: string;
    invoiceAmount: string;
    invoiceDate: string;
    invoiceNumber: string;
    downloadLink: string;
}

interface SendWelcomeEmailProps {
    to: string;
    userName: string;
}

interface SendJobNotificationProps {
    to: string;
    userName: string;
    jobTitle: string;
    jobLink?: string;
}

export const emailService = {
    sendInvoice: async ({ to, userName, invoiceAmount, invoiceDate, invoiceNumber, downloadLink }: SendInvoiceEmailProps) => {
        const subject = `Invoice #${invoiceNumber} - Payment Receipt`;
        const text = `Hi ${userName}, your payment of ${invoiceAmount} was successful. Download your invoice here: ${downloadLink}`;
        const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Payment Successful</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Thank you for your payment. Your transaction has been completed successfully.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${invoiceDate}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${invoiceAmount}</p>
        </div>

        <p>You can view and download your invoice from your dashboard or by clicking the link below:</p>
        
        <a href="${downloadLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Invoice</a>

        <p style="margin-top: 30px; font-size: 12px; color: #888;">
          If you have any questions, please contact our support team.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">© ${new Date().getFullYear()} DoDo Platform. All rights reserved.</p>
      </div>
    `;

        try {
            await sendServerEmail(to, subject, text, html);
            console.log(`[Email Service] Invoice email sent to ${to}`);
        } catch (error) {
            console.error('[Email Service] Failed to send email:', error);
        }
    },

    sendWelcomeEmail: async ({ to, userName }: SendWelcomeEmailProps) => {
        const subject = 'Welcome to DoDo Platform';
        const text = `Hi ${userName}, welcome to DoDo! We're excited to have you on board.`;
        const html = `<h1>Welcome to DoDo, ${userName}!</h1><p>We're excited to have you on board.</p>`;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Welcome error:', e);
        }
    },

    sendBidReceivedEmail: async ({ to, userName, jobTitle, jobLink }: SendJobNotificationProps) => {
        const subject = `New Bid Received: ${jobTitle}`;
        const text = `Hi ${userName}, you have received a new bid on your job: ${jobTitle}. View it here: ${jobLink}`;
        const html = `<p>Hi ${userName}, you have received a new bid on your job: <strong>${jobTitle}</strong>.</p><a href="${jobLink}">View Bid</a>`;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Bid error:', e);
        }
    },

    sendJobAwardedEmail: async ({ to, userName, jobTitle, jobLink }: SendJobNotificationProps) => {
        const subject = `Congratulations! Job Awarded: ${jobTitle}`;
        const text = `Congratulations ${userName}! You have been awarded the job: ${jobTitle}. View details here: ${jobLink}`;
        const html = `<p>Congratulations ${userName}! You have been awarded the job: <strong>${jobTitle}</strong>.</p><a href="${jobLink}">View Job Details</a>`;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Award error:', e);
        }
    },

    sendDisputeRaisedEmail: async ({ to, userName, jobTitle, disputeLink, reason }: SendJobNotificationProps & { reason: string, disputeLink: string }) => {
        const subject = `Dispute Raised: ${jobTitle}`;
        const text = `Hi ${userName}, a dispute has been raised for the job: ${jobTitle}. Reason: ${reason}. Related funds are frozen.`;
        const html = `<p>Hi ${userName}, a dispute has been raised for the job: <strong>${jobTitle}</strong>.</p>
                      <p><strong>Reason:</strong> ${reason}</p>
                      <p>The job status and related funds have been frozen temporarily.</p>
                      <a href="${disputeLink}">View Dispute Details</a>`;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Dispute error:', e);
        }
    },

    sendDisputeUpdateEmail: async ({ to, userName, jobTitle, disputeLink, status }: SendJobNotificationProps & { status: string, disputeLink: string }) => {
        const subject = `Dispute Update: ${jobTitle}`;
        const text = `Hi ${userName}, there is an update on the dispute for: ${jobTitle}. Current Status: ${status}.`;
        const html = `<p>Hi ${userName}, there is an update on the dispute for: <strong>${jobTitle}</strong>.</p>
                      <p><strong>Current Status:</strong> ${status}</p>
                      <a href="${disputeLink}">View Details</a>`;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Dispute update error:', e);
        }
    },

    sendNewMessageEmail: async ({ to, userName, senderName, jobTitle, messagePreview, chatLink }: { to: string, userName: string, senderName: string, jobTitle: string, messagePreview: string, chatLink: string }) => {
        const subject = `New Message from ${senderName}`;
        const text = `Hi ${userName}, you have a new message from ${senderName} regarding the job: ${jobTitle}. Message: ${messagePreview}`;
        const html = `<p>Hi ${userName}, you have a new message from <strong>${senderName}</strong> regarding the job: <strong>${jobTitle}</strong>.</p>
                      <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #666;">${messagePreview}</blockquote>
                      <a href="${chatLink}">Reply Now</a>`;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Message notification error:', e);
        }
    },
    sendPasswordResetEmail: async ({ to, userName, resetLink }: { to: string, userName: string, resetLink: string }) => {
        const subject = 'Reset Your Password - DoDo Platform';
        const text = `Hi ${userName}, you requested a password reset. Click here to reset it: ${resetLink}. If you didn't request this, please ignore this email.`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one:</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">${resetLink}</p>
            <p>If you didn't request this, you can safely ignore this email. Your password won't change until you create a new one.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">© ${new Date().getFullYear()} DoDo Platform</p>
          </div>
        `;
        try {
            await sendServerEmail(to, subject, text, html);
        } catch (e) {
            console.error('[Email Service] Password reset error:', e);
        }
    }
};
