import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { LocalGuard } from '../../common/guards/local.guard';
import { RegisterDto } from '../../components/auth/dto/Register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { getRefreshCookieOptions } from '../../common/utility/cookies';
import { MessageEnum } from '../../common/enums/message.enum';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @UsePipes(new ValidationPipe())
    @ApiBody({ type: RegisterDto })
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.register(dto);
        res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
        return { token: result.token, name: result.name, email: result.email };
    }


    @Post('login')
    @UseGuards(LocalGuard)
    @UsePipes(new ValidationPipe())
    // to make swagger show the expected body
    @ApiBody({ type: LoginDto })

    async login(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(req.user);
        res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
        return { token: result.token, name: result.name };
    }

    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        // read refresh token from cookie
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!refreshToken) throw new ForbiddenException(MessageEnum.error.NO_REFRESH_TOKEN_PROVIDED);
        const result = await this.authService.refreshTokens(refreshToken);
        res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
        return { token: result.token };
    }
}  
