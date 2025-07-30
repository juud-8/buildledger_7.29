# PDF Generation and Email Setup

This document outlines the setup required for the PDF generation and email functionality.

## Dependencies Added

The following dependencies have been added to the project:

- `@react-pdf/renderer` - For generating PDFs
- `resend` - For sending emails

## Storage Buckets Setup

You need to create the following storage buckets in your Supabase project:

### 1. `pdfs` bucket (Private)
- **Purpose**: Store generated PDFs for quotes and invoices
- **Public**: `false` (private access only)
- **Structure**:
  - `{user_id}/invoice-{invoice_id}.pdf`
  - `{user_id}/quote-{quote_id}.pdf`

### 2. `logos` bucket (Public)
- **Purpose**: Store company logos and branding assets
- **Public**: `true` (public access allowed)

## Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
RESEND_API_KEY=your_resend_api_key_here
```

### Getting a Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create a new API key in your dashboard
3. Copy the API key to your environment variables

## Database Schema Updates

The following columns need to be added to your database tables:

### Quotes Table
```sql
ALTER TABLE quotes ADD COLUMN pdf_key TEXT;
ALTER TABLE quotes ADD COLUMN pdf_url TEXT;
```

### Invoices Table
```sql
ALTER TABLE invoices ADD COLUMN pdf_key TEXT;
ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
```

## API Routes Created

### PDF Generation
- `GET /api/pdf/quote?id={quote_id}` - Generate PDF for a quote
- `GET /api/pdf/invoice?id={invoice_id}` - Generate PDF for an invoice

### Email Sending
- `POST /api/invoices/send` - Send quote or invoice via email

### Logo Upload
- `POST /api/upload/logo` - Upload business logo

## UI Updates

### Quotes Page
- Added "Generate PDF" button in dropdown menu
- Added "Send" button in dropdown menu
- Added loading states for both actions
- Mobile view also includes these buttons

### Invoices Page
- Added "Generate PDF" button in dropdown menu
- Added "Send" button in dropdown menu
- Added loading states for both actions
- Mobile view also includes these buttons

## Features

### PDF Generation
- Generates professional PDFs with company branding
- Includes all quote/invoice details, items, and totals
- Uploads PDFs to Supabase Storage
- Updates the record with the PDF URL
- Creates signed URLs for secure access

### Email Sending
- Sends beautifully formatted HTML emails
- Includes PDF link in the email
- Updates record status to 'sent'
- Handles both quotes and invoices
- Uses Resend for reliable email delivery

### Logo Upload
- Uploads logos with user ID prefix for security
- Stores logos in public bucket for easy access
- Updates business record with logo URL
- Supports PNG, JPG, and SVG formats
- Validates file size (max 2MB)

## Usage

1. **Generate PDF**: Click the "Generate PDF" button on any quote or invoice
2. **Send Email**: Click the "Send" button to email the PDF to the client
3. **Automatic PDF Generation**: If a PDF doesn't exist when sending, it will be generated automatically

## Error Handling

- Toast notifications for success/error states
- Loading indicators during operations
- Graceful error handling with user-friendly messages
- Automatic retry for PDF generation if needed

## Security

- All PDFs are stored in private storage buckets with user ID prefixes
- Signed URLs with 1-hour expiry for secure access
- User authentication required for all operations
- Proper authorization checks for data access
- RLS policies ensure users can only access their own files