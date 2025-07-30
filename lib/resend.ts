import { Resend } from 'resend';

// Only create Resend instance if API key is available
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendInvoiceEmailParams {
  to: string;
  subject: string;
  message: string;
  from: string;
  replyTo: string;
  pdfUrl?: string;
  recordType: 'invoice' | 'quote';
  recordNumber: string;
  amount: number;
  currency: string;
  clientName?: string;
  dueDate?: string;
}

export async function sendInvoiceEmail({
  to,
  subject,
  message,
  from,
  replyTo,
  pdfUrl,
  recordType,
  recordNumber,
  amount,
  currency,
  clientName,
  dueDate
}: SendInvoiceEmailParams) {
  if (!resend) {
    throw new Error('Resend is not configured. Please set RESEND_API_KEY environment variable.')
  }
  
  try {
    const emailData: any = {
      from: from,
      to: [to],
      subject: subject,
      reply_to: replyTo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${recordType === 'invoice' ? 'Invoice' : 'Quote'} ${recordNumber}</h2>
          ${clientName ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
          <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
          ${dueDate ? `<p><strong>${recordType === 'invoice' ? 'Due Date' : 'Expiry Date'}:</strong> ${dueDate}</p>` : ''}
          <div style="margin: 20px 0;">
            ${message}
          </div>
          ${pdfUrl ? `<p><a href="${pdfUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View ${recordType === 'invoice' ? 'Invoice' : 'Quote'}</a></p>` : ''}
          <p>Thank you for your business!</p>
        </div>
      `,
    };

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error;
  }
}

export async function sendPaymentConfirmationEmail({
  to,
  invoiceNumber,
  amount,
  currency,
  clientName
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  clientName?: string;
}) {
  if (!resend) {
    throw new Error('Resend is not configured. Please set RESEND_API_KEY environment variable.')
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'BuildLedger <noreply@buildledger.pro>',
      to: [to],
      subject: `Payment Received - Invoice ${invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Payment Received!</h2>
          ${clientName ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
          <p><strong>Invoice:</strong> ${invoiceNumber}</p>
          <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
          <p>Thank you for your payment!</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending payment confirmation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    throw error;
  }
}

export { resend };