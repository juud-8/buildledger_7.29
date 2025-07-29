import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendInvoiceEmailParams {
  to: string;
  subject: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  pdfBuffer: Buffer;
  clientName?: string;
  dueDate?: string;
}

export async function sendInvoiceEmail({
  to,
  subject,
  invoiceNumber,
  amount,
  currency,
  pdfBuffer,
  clientName,
  dueDate
}: SendInvoiceEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BuildLedger <noreply@buildledger.pro>',
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice ${invoiceNumber}</h2>
          ${clientName ? `<p><strong>Client:</strong> ${clientName}</p>` : ''}
          <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
          ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
          <p>Please find your invoice attached.</p>
          <p>Thank you for your business!</p>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

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