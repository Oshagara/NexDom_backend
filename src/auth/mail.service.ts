import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private resend = new Resend(process.env.RESEND_API_KEY)

  async sendVerificationEmail(email: string, code: string) {
    try {
      await this.resend.emails.send({
        from: 'NexDom <onboarding@resend.dev>', // default domain (works instantly)
        to: email,
        subject: 'Verify Your Email - NexDom',
        html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h2>Verify Your Email</h2>
          <p>Welcome to NexDom!</p>
          <p>Your verification code is:</p>
          <h1 style="color:#2c3e50;">${code}</h1>
          <p>This code expires in 15 minutes.</p>
        </div>
        `,
      })
    } catch (err) {
      this.logger.error('Failed to send verification email', err as any)
      // ❗ do NOT throw
    }
  }

  async sendResendVerificationEmail(email: string, code: string) {
    try {
      await this.resend.emails.send({
        from: 'NexDom <onboarding@resend.dev>',
        to: email,
        subject: 'Resend: Your Verification Code',
        html: `<h2>Your code: ${code}</h2>`,
      })
    } catch (err) {
      this.logger.error('Failed to resend verification email', err as any)
    }
  }
}