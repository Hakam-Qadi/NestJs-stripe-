import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { LocalGuard } from '../../common/guards/local.guard';
import { RegisterDto } from '../../components/auth/dto/Register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { serviceConfig } from 'src/config/env.config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @UsePipes(new ValidationPipe())
    @ApiBody({ type: RegisterDto })
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.register(dto);
        // set httpOnly cookie for refresh token (recommended)
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: serviceConfig.service.nodeEnv,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return { token: result.token, name: result.name, email: result.email };
    }


    @Post('login')
    @UseGuards(LocalGuard)
    @UsePipes(new ValidationPipe())
    // to make swagger show the expected body
    @ApiBody({ type: LoginDto })

    async login(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(req.user);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: serviceConfig.service.nodeEnv,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return { token: result.token, name: result.name };
    }

    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        // read refresh token from cookie
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!refreshToken) throw new ForbiddenException('No refresh token provided');
        const tokens = await this.authService.refreshTokens(refreshToken);
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: serviceConfig.service.nodeEnv,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return { token: tokens.token };
    }
}  
