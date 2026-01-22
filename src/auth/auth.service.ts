import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/database.service';
import { EmailService } from '../common/email/email.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { InvitationStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, name, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check if there's already a pending registration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existingPending = await this.prisma.pendingRegistration.findUnique({
      where: { email },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = this.generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 15); // 15 minutes expiry

    // Create or update pending registration
    if (existingPending) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.pendingRegistration.update({
        where: { email },
        data: {
          name,
          password: hashedPassword,
          otp,
          otpExpires,
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.pendingRegistration.create({
        data: {
          email,
          name,
          password: hashedPassword,
          otp,
          otpExpires,
        },
      });
    }

    // Send verification email with OTP
    await this.emailService.sendEmailVerification(email, name, otp);

    this.logger.info('Registration initiated, OTP sent', {
      email,
      context: AuthService.name,
    });

    return {
      message:
        'Registration initiated. Please check your email for the verification OTP.',
      data: {
        email,
        name,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with player profile and owned clubs
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        player: {
          include: {
            address: true,
            bowlingTypes: {
              include: {
                bowlingType: true,
              },
            },
          },
        },
        clubs: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            profilePicture: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Format player data if exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playerData: any = null;
    if (user.player) {
      playerData = {
        ...user.player,
        bowlingTypes: user.player.bowlingTypes.map((pt) => pt.bowlingType),
      };
    }

    this.logger.info('User logged in successfully', {
      userId: user.id,
      email,
      context: AuthService.name,
    });

    return {
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          hasPlayerProfile: !!user.player,
        },
        player: playerData,
        ownedClubs: user.clubs,
        ...tokens,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const jwtConfig = this.configService.get('jwt');

      const payload = this.jwtService.verify(refreshToken, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        secret: jwtConfig.refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where: { id: payload.sub },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User not found or deactivated');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        message: 'Token refreshed successfully',
        data: tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyEmail(email: string, otp: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already registered');
    }

    // Find pending registration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const pendingRegistration =
      await this.prisma.pendingRegistration.findUnique({
        where: { email },
      });

    if (!pendingRegistration) {
      throw new BadRequestException(
        'No pending registration found for this email',
      );
    }

    // Validate OTP
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (pendingRegistration.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Check OTP expiry
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (pendingRegistration.otpExpires < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Create the actual user
    const user = await this.prisma.user.create({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        email: pendingRegistration.email,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        name: pendingRegistration.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        password: pendingRegistration.password,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // Delete pending registration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.pendingRegistration.delete({
      where: { email },
    });

    this.logger.info('Email verified and user created successfully', {
      userId: user.id,
      email,
      context: AuthService.name,
    });

    return {
      message: 'Email verified successfully. You can now login.',
      data: user,
    };
  }

  async resendVerificationOTP(email: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already registered. Please login.');
    }

    // Find pending registration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const pendingRegistration =
      await this.prisma.pendingRegistration.findUnique({
        where: { email },
      });

    if (!pendingRegistration) {
      throw new BadRequestException(
        'No pending registration found for this email',
      );
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 15); // 15 minutes expiry

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.pendingRegistration.update({
      where: { email },
      data: {
        otp,
        otpExpires,
      },
    });

    // Send verification email with new OTP
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.emailService.sendEmailVerification(
      email,
      pendingRegistration.name,
      otp,
    );

    this.logger.info('Verification OTP resent successfully', {
      email,
      context: AuthService.name,
    });

    return {
      message: 'Verification OTP has been resent to your email.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        message:
          'If an account with that email exists, a password reset OTP has been sent.',
      };
    }

    // Generate 6-digit OTP
    const resetOTP = this.generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 15); // 15 minutes expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOTP: resetOTP,
        passwordResetOTPExpires: otpExpires,
      },
    });

    // Send reset email with OTP
    await this.emailService.sendPasswordReset(user.email, user.name, resetOTP);

    this.logger.info('Password reset OTP sent', {
      userId: user.id,
      context: AuthService.name,
    });

    return {
      message:
        'If an account with that email exists, a password reset OTP has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetOTP: token,
        passwordResetOTPExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetOTP: null,
        passwordResetOTPExpires: null,
      },
    });

    this.logger.info('Password reset successfully', {
      userId: user.id,
      context: AuthService.name,
    });

    return {
      message: 'Password reset successfully',
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        player: {
          include: {
            address: true,
            bowlingTypes: {
              include: {
                bowlingType: true,
              },
            },
            clubMemberships: {
              where: { status: InvitationStatus.ACCEPTED },
              include: {
                club: {
                  select: {
                    id: true,
                    name: true,
                    profilePicture: true,
                  },
                },
              },
            },
            teamMemberships: {
              where: { status: InvitationStatus.ACCEPTED },
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    logo: true,
                    clubId: true,
                  },
                },
              },
            },
          },
        },
        clubs: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            profilePicture: true,
            address: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    // Format player data if exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playerData: any = null;
    if (user.player) {
      playerData = {
        ...user.player,
        bowlingTypes: user.player.bowlingTypes.map((pt) => pt.bowlingType),
        joinedClubs: user.player.clubMemberships.map((cm) => cm.club),
        joinedTeams: user.player.teamMemberships.map((tm) => tm.team),
      };
      delete playerData.clubMemberships;
      delete playerData.teamMemberships;
    }

    return {
      message: 'User retrieved successfully',
      data: {
        ...user,
        player: playerData,
        ownedClubs: user.clubs,
      },
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtConfig = this.configService.get('jwt');

    const payload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion
        secret: (jwtConfig as any).refreshSecret,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion
        expiresIn: (jwtConfig as any).refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateOTP(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
