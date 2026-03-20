import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private createTransporter() {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use STARTTLS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      requireTLS: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  async sendVerificationEmail(email: string, code: string) {
    const transporter = this.createTransporter();
    try {
      await transporter.sendMail({
        from: `"Infinity Housing" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - Infinity Housing',
        html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h2>Verify Your Email</h2>
          <p>Thank you for signing up with Infinity Housing!</p>
          <p>Please use the following 6-digit code to verify your email address:</p>
          <h3 style="color: #2c3e50;">${code}</h3>
          <p>This code will expire in 15 minutes.</p>
          <br />
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      });
    } catch (err) {
      this.logger.error('Failed to send verification email', err as any);
      throw err;
    }
  }

  async sendResendVerificationEmail(email: string, code: string) {
    const transporter = this.createTransporter();
    try {
      await transporter.sendMail({
        from: `"Infinity Housing" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Resend: Your Verification Code - Infinity Housing',
        html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Your Verification Code</h2>
        <p>We received a request to resend your verification code.</p>
        <p>Please use the 6-digit code below to verify your email:</p>
        <h3 style="color: #2c3e50;">${code}</h3>
        <p>This code will expire in 15 minutes.</p>
        <br />
        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `,
      });
    } catch (err) {
      this.logger.error('Failed to send resend verification email', err as any);
      throw err;
    }
  }

}