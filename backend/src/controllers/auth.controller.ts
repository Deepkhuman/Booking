import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ForgotPasswordDto, LoginDto, RefreshTokenDto, RegisterDto, ResetPasswordDto } from '../dto/auth.dto';
import { GoogleAuthGuard, FacebookAuthGuard } from '../guards/social-auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // Google OAuth
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: any) {
    const data = await this.authService.socialLogin(req.user);
    return res.redirect(
      `http://localhost:5173/social-callback?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}&user=${encodeURIComponent(JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role, avatar: data.avatar }))}`
    );
  }

  // Facebook OAuth
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: any, @Res() res: any) {
    const data = await this.authService.socialLogin(req.user);
    return res.redirect(
      `http://localhost:5173/social-callback?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}&user=${encodeURIComponent(JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role, avatar: data.avatar }))}`
    );
  }
}
