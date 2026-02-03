'use server';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Instructions for .env.local:
// GMAIL_EMAIL="your_email@gmail.com"
// GMAIL_APP_PASSWORD="your_16_character_app_password"
// GMAIL_SENDER_NAME="Your Name" // Optional

const sendEmailSchema = z.object({
  // from is not needed for gmail, but we keep it for schema consistency
  from: z.string().email(),
  to: z.array(z.string().email()),
  subject: z.string(),
  html: z.string(),
  attachment: z.object({
    content: z.string(), // base64 encoded content
    filename: z.string(),
    type: z.string(),
  }).optional(),
});

type SendEmailInput = z.infer<typeof sendEmailSchema>;

export async function sendEmail(data: SendEmailInput): Promise<{success: boolean; message?: string, error?: any}> {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
        console.error('GMAIL_EMAIL or GMAIL_APP_PASSWORD is not set. Email not sent.');
        // For this prototype, we will just log it and simulate success if keys are missing.
        console.log('Simulating email sending for:', data.to);
        return { success: true, message: `Emailuri simulate cu succes pentru ${data.to.length} destinatari!` };
    }

    const validatedData = sendEmailSchema.safeParse(data);

    if (!validatedData.success) {
        return { success: false, error: validatedData.error.flatten() };
    }

    const { to, subject, html, attachment } = validatedData.data;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      }
    });

    const senderName = process.env.GMAIL_SENDER_NAME || 'MailCannon';
    const fromAddress = `"${senderName}" <${process.env.GMAIL_EMAIL}>`;

    const mailOptions = {
        from: fromAddress,
        to: to, // Nodemailer handles array of emails
        subject: subject,
        html: html,
        attachments: attachment ? [{
            filename: attachment.filename,
            content: attachment.content,
            encoding: 'base64',
            contentType: attachment.type,
        }] : [],
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: `Email trimis la ${to.length} destinatari.` };
    } catch (error: any) {
        console.error('Nodemailer Error:', error);
        return { success: false, error: `Trimiterea email-ului a eșuat: ${error.message}` };
    }
}
