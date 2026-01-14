import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const emailConfig = this.configService.get('email');
    this.transporter = nodemailer.createTransport({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      host: (emailConfig as any).host,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      port: (emailConfig as any).port,
      secure: false, // true for 465, false for other ports
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        user: (emailConfig as any).user,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        pass: (emailConfig as any).password,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    const emailConfig = this.configService.get('email');

    try {
      const info = await this.transporter.sendMail({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        from: (emailConfig as any).from,
        to,
        subject,
        text,
        html,
      });

      this.logger.info('Email sent successfully', {
        to,
        subject,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        messageId: info.messageId,
        context: EmailService.name,
      });
    } catch (error) {
      this.logger.error('Failed to send email', {
        to,
        subject,
        error,
        context: EmailService.name,
      });
      throw error;
    }
  }

  async sendTeamInvitation(
    to: string,
    playerName: string,
    teamName: string,
    clubName: string,
    invitationLink: string,
    expiryDays: number,
  ): Promise<void> {
    const subject = `Team Invitation: ${teamName}`;
    const html = `
      <h2>Team Invitation</h2>
      <p>Hello ${playerName},</p>
      <p>You have been invited to join <strong>${teamName}</strong> from <strong>${clubName}</strong>.</p>
      <p>Click the link below to accept or reject the invitation:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This invitation will expire in ${expiryDays} days.</p>
      <p>Best regards,<br>Cricket Spirit Team</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendClubInvitation(
    to: string,
    playerName: string,
    clubName: string,
    invitationLink: string,
    expiryDays: number,
  ): Promise<void> {
    const subject = `Club Invitation: ${clubName}`;
    const html = `
      <h2>Club Invitation</h2>
      <p>Hello ${playerName},</p>
      <p>You have been invited to join <strong>${clubName}</strong>.</p>
      <p>Click the link below to accept or reject the invitation:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This invitation will expire in ${expiryDays} days.</p>
      <p>Best regards,<br>Cricket Spirit Team</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendTournamentInvitation(
    to: string,
    teamName: string,
    tournamentName: string,
    invitationLink: string,
    expiryDays: number,
  ): Promise<void> {
    const subject = `Tournament Invitation: ${tournamentName}`;
    const html = `
      <h2>Tournament Invitation</h2>
      <p>Hello,</p>
      <p>Your team <strong>${teamName}</strong> has been invited to participate in the tournament <strong>${tournamentName}</strong>.</p>
      <p>Click the link below to accept or reject the invitation:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This invitation will expire in ${expiryDays} days.</p>
      <p>Best regards,<br>Cricket Spirit Team</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendMatchInvitation(
    to: string,
    teamName: string,
    matchDetails: string,
    invitationLink: string,
    expiryDays: number,
  ): Promise<void> {
    const subject = `Match Invitation`;
    const html = `
      <h2>Match Invitation</h2>
      <p>Hello,</p>
      <p>Your team <strong>${teamName}</strong> has been invited to a match.</p>
      <p>Match Details: ${matchDetails}</p>
      <p>Click the link below to accept or reject the invitation:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This invitation will expire in ${expiryDays} days.</p>
      <p>Best regards,<br>Cricket Spirit Team</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendEmailVerification(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const subject = 'Verify Your Email Address';
    const html = `
      <h2>Email Verification</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with Cricket Spirit. Please use the following OTP to verify your email address:</p>
      <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; text-align: center;">${otp}</h1>
      <p>This OTP will expire in 15 minutes.</p>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Best regards,<br>Cricket Spirit Team</p>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendPasswordReset(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const subject = 'Password Reset Request';
    const html = `
      <h2>Password Reset</h2>
      <p>Hello ${name},</p>
      <p>You have requested to reset your password. Please use the following OTP to reset your password:</p>
      <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; text-align: center;">${otp}</h1>
      <p>This OTP will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br>Cricket Spirit Team</p>
    `;

    await this.sendEmail(to, subject, html);
  }
}

