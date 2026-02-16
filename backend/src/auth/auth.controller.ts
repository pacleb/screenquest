import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChildLoginDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SkipEmailVerification } from './guards/email-verified.guard';

@ApiTags('Auth')
@Controller('auth')
@SkipEmailVerification()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new parent account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('child-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Child login with family code, name, and PIN' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async childLogin(@Body() dto: ChildLoginDto) {
    return this.authService.childLogin(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ short: { limit: 2, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Request() req: any) {
    return this.authService.resendVerification(req.user.id);
  }

  @Get('verify-email-redirect')
  @ApiOperation({ summary: 'Verify email from link in email and redirect to app' })
  async verifyEmailRedirect(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    let success = false;
    try {
      await this.authService.verifyEmail(token);
      success = true;
    } catch {
      success = false;
    }

    const deepLink = `screenquest://email-verified?success=${success}`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ScreenQuest – Email Verification</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f4f4f7; }
          .card { background: white; border-radius: 12px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          h1 { color: #333; font-size: 22px; }
          p { color: #666; line-height: 1.6; }
          .btn { display: inline-block; background: linear-gradient(135deg, #6C63FF, #4ECDC4); color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🏰 ScreenQuest</h1>
          ${success
            ? '<p>Your email has been verified successfully! ✅</p>'
            : '<p class="error">Verification failed. The link may have expired or already been used.</p>'}
          <a class="btn" href="${deepLink}">Open ScreenQuest</a>
          <p style="margin-top:24px;font-size:13px;color:#999;">If the app didn't open automatically, tap the button above.</p>
        </div>
        <script>window.location.href = "${deepLink}";</script>
      </body>
      </html>
    `);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Get('reset-password-redirect')
  @ApiOperation({ summary: 'Redirect to app deep link for password reset' })
  async resetPasswordRedirect(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const deepLink = `screenquest://reset-password?token=${encodeURIComponent(token)}`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ScreenQuest – Reset Password</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f4f4f7; }
          .card { background: white; border-radius: 12px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          h1 { color: #333; font-size: 22px; }
          p { color: #666; line-height: 1.6; }
          .btn { display: inline-block; background: linear-gradient(135deg, #6C63FF, #4ECDC4); color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🏰 ScreenQuest</h1>
          <p>Opening the app to reset your password...</p>
          <a class="btn" href="${deepLink}">Open ScreenQuest</a>
          <p style="margin-top:24px;font-size:13px;color:#999;">If the app didn't open automatically, tap the button above.</p>
        </div>
        <script>window.location.href = "${deepLink}";</script>
      </body>
      </html>
    `);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@Request() req: any) {
    return this.authService.logoutAll(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
