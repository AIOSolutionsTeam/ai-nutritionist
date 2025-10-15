# Email Service Setup

The email service has been updated to use NodeMailer with SMTP configuration. Here's how to set it up:

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# SMTP Configuration for Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Settings
FROM_EMAIL=noreply@ai-nutritionist.com
FROM_NAME=AI Nutritionist

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## SMTP Provider Examples

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
```

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Custom SMTP Server

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Usage

The email service provides a `sendNutritionPlanPDF` method specifically for sending nutrition plan PDFs:

```typescript
import { emailService } from "@/lib/email";

// Send nutrition plan PDF
const result = await emailService.sendNutritionPlanPDF(
  "user@example.com",
  "John Doe",
  pdfBuffer,
  "nutrition-plan-john-doe.pdf"
);

if (result.success) {
  console.log("Email sent successfully:", result.messageId);
} else {
  console.error("Email failed:", result.error);
}
```

## Features

- ✅ SMTP configuration with NodeMailer
- ✅ HTML email templates
- ✅ PDF attachment support
- ✅ Customizable email templates
- ✅ Error handling and logging
- ✅ TypeScript support

## Security Notes

- Use App Passwords for Gmail instead of your regular password
- Keep your SMTP credentials secure and never commit them to version control
- Consider using environment-specific configurations for different deployment stages
