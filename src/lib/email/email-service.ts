import nodemailer from 'nodemailer';

interface SendInvoiceEmailProps {
    to: string;
    userName: string;
    invoiceAmount: string;
    invoiceDate: string;
    invoiceNumber: string;
    downloadLink: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const emailService = {
    sendInvoice: async ({ to, userName, invoiceAmount, invoiceDate, invoiceNumber, downloadLink }: SendInvoiceEmailProps) => {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log("---------------------------------------------------");
            console.log(`[Email Mock] Sending Invoice Email to: ${to}`);
            console.log(`Subject: Invoice #${invoiceNumber} from DoDo`);
            console.log(`Body: Hi ${userName}, your payment of ${invoiceAmount} was successful.`);
            console.log(`Link: ${downloadLink}`);
            console.log("---------------------------------------------------");
            return;
        }

        const htmlContent = `
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
            await transporter.sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'DoDo Support'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to,
                subject: `Invoice #${invoiceNumber} - Payment Receipt`,
                html: htmlContent,
            });
            console.log(`[Email Service] Invoice email sent to ${to}`);
        } catch (error) {
            console.error('[Email Service] Failed to send email:', error);
            // Don't throw, just log. Email failure shouldn't crash the webhook.
        }
    }
};
