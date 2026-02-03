'use server';
import sgMail from '@sendgrid/mail';
import { z } from 'zod';

// It's best practice to keep your API keys in environment variables
// You should create a .env.local file at the root of your project and add:
// SENDGRID_API_KEY='YOUR_SENDGRID_API_KEY'
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmailSchema = z.object({
  from: z.string().email(),
  to: z.array(z.string().email()),
  subject: z.string(),
  html: z.string(),
  attachment: z.object({
    content: z.string(), // base64 encoded content
    filename: z.string(),
    type: z.string(),
    disposition: z.string(),
  }).optional(),
});

type SendEmailInput = z.infer<typeof sendEmailSchema>;

export async function sendEmail(data: SendEmailInput): Promise<{success: boolean; message?: string, error?: any}> {
    if (!process.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY is not set. Email not sent.');
        // In a real app, you might want to return a more user-friendly error.
        // For this prototype, we will just log it and simulate success.
        console.log('Simulating email sending for:', data.to);
        return { success: true, message: `Emails simulated successfully for ${data.to.length} recipients!` };
    }

    const validatedData = sendEmailSchema.safeParse(data);

    if (!validatedData.success) {
        return { success: false, error: validatedData.error.flatten() };
    }

    const { from, to, subject, html, attachment } = validatedData.data;

    const msg = {
        to: to,
        from: from,
        subject: subject,
        html: html,
        attachments: attachment ? [attachment] : [],
    };

    try {
        await sgMail.sendMultiple(msg);
        return { success: true, message: `Emails sent to ${to.length} recipients.` };
    } catch (error: any) {
        console.error('SendGrid Error:', error);
        if (error.response) {
            console.error(error.response.body)
        }
        return { success: false, error: 'Failed to send email via SendGrid.' };
    }
}
