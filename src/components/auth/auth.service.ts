import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../../components/auth/dto/Register.dto';
import { PrismaService } from 'prisma/prisma.service';
import { serviceConfig } from '../../config/env.config';


@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, password: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email },
                select: { id: true, name: true, email: true, password: true },
            });

            if (!user) return null;

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return null;

            return user;

        } catch (error) {
            console.error('validateUser Error :: ', error);
            throw new Error('validateUser service failed: ' + error.message);
        }
    }

    private getAccessToken(payload: any) {
        try {
            return this.jwtService.sign(payload, {
                secret: serviceConfig.service.jwtSecret,
                expiresIn: serviceConfig.service.jwtExpiry,
            });
        } catch (error) {
            console.error('getAccessToken Error :: ', error);
            throw new Error('getAccessToken service failed: ' + error.message);
        }
    }

    private getRefreshToken(payload: any) {
        try {
            return this.jwtService.sign(payload, {
                secret: serviceConfig.service.jwtRefreshSecret,
                expiresIn: serviceConfig.service.jwtRefreshExpiry,
            });
        } catch (error) {
            console.error('getRefreshToken Error :: ', error);
            throw new Error('getRefreshToken service failed: ' + error.message);
        }
    }

    private async saveHashedRefreshToken(userId: string, refreshToken: string, expiresAt?: Date, device?: string) {
        try {
            const hash = await bcrypt.hash(refreshToken, 10);
            //* single refresh token
            await this.prisma.user.update({
                where: { id: userId },
                data: { refreshHash: hash },
            });

            //* multible refresh tokens (RefreshToken model)
            // await this.prisma.refreshToken.create({
            //     data: {
            //         tokenHash: hash,
            //         userId,
            //         expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            //         device,
            //     },
            // });
        } catch (error) {
            console.error('saveHashedRefreshToken Error :: ', error);
            throw new Error('saveHashedRefreshToken service failed: ' + error.message);
        }
    }

    async generateTokens(user: any) {
        try {
            const payload = { id: user.id, email: user.email };
            const token = this.getAccessToken(payload);
            const refreshToken = this.getRefreshToken(payload);

            //* multible refresh tokens (RefreshToken model)
            // compute expiry date from JWT_REFRESH_EXPIRY (simple approach: 7 days)
            // const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            // await this.saveHashedRefreshToken(user.id, refreshToken, refreshExpiry);

            await this.saveHashedRefreshToken(user.id, refreshToken);
            return { token, refreshToken };
        } catch (error) {
            console.error('generateTokens Error :: ', error);
            throw new Error('generateTokens service failed: ' + error.message);
        }
    }

    async login(user: any) {
        try {
            const tokens = await this.generateTokens(user)
            return {
                token: tokens.token,
                refreshToken: tokens.refreshToken,
                name: user.name,
            };
        } catch (error) {
            console.error('login Error :: ', error);
            throw new Error('login service failed: ' + error.message);
        }
    }

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email is already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
            },
        });
        const tokens = await this.generateTokens(user);

        return {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            name: user.name,
            email: user.email,
        };
    }

    async refreshTokens(providedRefreshToken: string) {
        try {
            // Verify signature & decode payload
            let payload: any;
            try {
                payload = this.jwtService.verify(providedRefreshToken, {
                    secret: serviceConfig.service.jwtRefreshSecret,
                });
            } catch (err) {
                throw new ForbiddenException('Invalid refresh token');
            }

            // Find stored hashed refresh token for user and compare
            const user = await this.prisma.user.findUnique({
                where: { id: payload.id },
            });

            if (!user || !user.refreshHash)
                throw new ForbiddenException('Access denied');

            const isMatch = await bcrypt.compare(
                providedRefreshToken,
                user.refreshHash,
            );

            if (!isMatch) throw new ForbiddenException('Refresh token invalid');

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            // Store new hashed refresh token (rotation)
            const hashedNewRefresh = await bcrypt.hash(tokens.refreshToken, 10);

            await this.prisma.user.update({
                where: { id: user.id },
                data: { refreshHash: hashedNewRefresh },
            });

            return tokens;
        } catch (error) {
            console.error('refreshTokens Error :: ', error);
            throw new Error('refreshTokens service failed: ' + error.message);
        }

    }
}
