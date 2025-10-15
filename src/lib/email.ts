import nodemailer, { Transporter } from 'nodemailer'

// Email service for notifications and communications using NodeMailer
export interface EmailConfig {
     host: string
     port: number
     secure: boolean
     auth: {
          user: string
          pass: string
     }
     fromEmail: string
     fromName: string
}

export interface EmailTemplate {
     to: string
     subject: string
     template: string
     data: Record<string, any>
}

export interface EmailResult {
     success: boolean
     messageId?: string
     error?: string
}

export interface EmailAttachment {
     filename: string
     content: Buffer | string
     contentType?: string
     encoding?: string
}

export class EmailService {
     private config: EmailConfig
     private transporter: Transporter

     constructor(config: EmailConfig) {
          this.config = config
          this.transporter = nodemailer.createTransport({
               host: config.host,
               port: config.port,
               secure: config.secure,
               auth: config.auth
          })
     }

     async sendEmail(template: EmailTemplate, attachments?: EmailAttachment[]): Promise<EmailResult> {
          try {
               const mailOptions = {
                    from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
                    to: template.to,
                    subject: template.subject,
                    html: this.generateEmailHTML(template.template, template.data),
                    attachments: attachments || []
               }

               const result = await this.transporter.sendMail(mailOptions)

               return {
                    success: true,
                    messageId: result.messageId
               }
          } catch (error) {
               console.error('Email sending error:', error)
               return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
               }
          }
     }

     private generateEmailHTML(template: string, data: Record<string, any>): string {
          // Simple template replacement - you can enhance this with a proper templating engine
          let html = this.getEmailTemplate(template)

          // Replace placeholders with data
          Object.keys(data).forEach(key => {
               const placeholder = new RegExp(`{{${key}}}`, 'g')
               html = html.replace(placeholder, data[key] || '')
          })

          return html
     }

     private getEmailTemplate(template: string): string {
          const templates: Record<string, string> = {
               welcome: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                         <h2>Welcome to AI Nutritionist!</h2>
                         <p>Hello {{name}},</p>
                         <p>Thank you for joining AI Nutritionist! We're excited to help you on your nutrition journey.</p>
                         <p>You can access your dashboard here: <a href="{{loginUrl}}">{{loginUrl}}</a></p>
                         <p>Best regards,<br>The AI Nutritionist Team</p>
                    </div>
               `,
               nutrition_report: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                         <h2>Your Personalized Nutrition Report</h2>
                         <p>Hello {{name}},</p>
                         <p>Your personalized nutrition report is ready! Please find it attached to this email.</p>
                         <p>You can also view it online: <a href="{{reportUrl}}">{{reportUrl}}</a></p>
                         <p>Best regards,<br>The AI Nutritionist Team</p>
                    </div>
               `,
               reminder: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                         <h2>Reminder: Your Nutrition Check-in</h2>
                         <p>Hello {{name}},</p>
                         <p>This is a friendly reminder about your {{reminderType}}.</p>
                         <p>Visit your dashboard: <a href="{{dashboardUrl}}">{{dashboardUrl}}</a></p>
                         <p>Best regards,<br>The AI Nutritionist Team</p>
                    </div>
               `,
               nutrition_plan: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                         <h2>Your Personalized Nutrition Plan</h2>
                         <p>Hello {{name}},</p>
                         <p>Your personalized nutrition plan is ready! Please find the detailed PDF attached to this email.</p>
                         <p>This plan has been customized based on your goals, preferences, and dietary requirements.</p>
                         <p>If you have any questions or need adjustments to your plan, please don't hesitate to reach out.</p>
                         <p>Best regards,<br>The AI Nutritionist Team</p>
                    </div>
               `
          }

          return templates[template] || '<p>Email content not found.</p>'
     }

     async sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailResult> {
          return this.sendEmail({
               to: userEmail,
               subject: 'Welcome to AI Nutritionist!',
               template: 'welcome',
               data: {
                    name: userName,
                    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
               }
          })
     }

     async sendNutritionReport(userEmail: string, reportData: any): Promise<EmailResult> {
          return this.sendEmail({
               to: userEmail,
               subject: 'Your Personalized Nutrition Report',
               template: 'nutrition_report',
               data: {
                    ...reportData,
                    reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${reportData.id}`
               }
          })
     }

     async sendReminderEmail(userEmail: string, reminderType: string): Promise<EmailResult> {
          return this.sendEmail({
               to: userEmail,
               subject: 'Reminder: Your Nutrition Check-in',
               template: 'reminder',
               data: {
                    reminderType,
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
               }
          })
     }

     async sendNutritionPlanPDF(
          userEmail: string,
          userName: string,
          pdfBuffer: Buffer,
          filename?: string
     ): Promise<EmailResult> {
          const attachment: EmailAttachment = {
               filename: filename || `nutrition-plan-${userName}-${new Date().toISOString().split('T')[0]}.pdf`,
               content: pdfBuffer,
               contentType: 'application/pdf',
               encoding: 'base64'
          }

          return this.sendEmail({
               to: userEmail,
               subject: 'Your Personalized Nutrition Plan',
               template: 'nutrition_plan',
               data: {
                    name: userName
               }
          }, [attachment])
     }
}

// Export a default instance (you'll need to set the SMTP config in environment variables)
export const emailService = new EmailService({
     host: process.env.SMTP_HOST || 'smtp.gmail.com',
     port: parseInt(process.env.SMTP_PORT || '587'),
     secure: process.env.SMTP_SECURE === 'true',
     auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
     },
     fromEmail: process.env.FROM_EMAIL || 'noreply@ai-nutritionist.com',
     fromName: process.env.FROM_NAME || 'AI Nutritionist'
})
