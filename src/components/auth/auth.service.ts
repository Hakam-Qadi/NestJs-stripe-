import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../../components/auth/dto/Register.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { serviceConfig } from '../../config/env.config';
import { MessageEnum } from '../../common/enums/message.enum';
import { CustomersService } from '../customers/customers.service';


@Injectable()
export class AuthService {
    readonly useMultipleRefreshTokens = false; // Set to true to enable multiple tokens

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private customersService: CustomersService,
    ) { }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, password: true },
        });

        if (!user) throw new NotFoundException(MessageEnum.error.USER_NOT_FOUND);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new UnauthorizedException(MessageEnum.error.INVALID_CREDENTIALS);

        return user;
    }

    private getAccessToken(payload: any) {
        try {
            return this.jwtService.sign(payload, {
                secret: serviceConfig.service.jwtSecret,
                expiresIn: serviceConfig.service.jwtExpiry,
            });
        } catch (error) {
            console.error('getAccessToken Error :: ', error.message);
            throw new InternalServerErrorException(MessageEnum.error.SERVER_ERROR);
        }
    }

    private getRefreshToken(payload: any) {
        try {
            return this.jwtService.sign(payload, {
                secret: serviceConfig.service.jwtRefreshSecret,
                expiresIn: serviceConfig.service.jwtRefreshExpiry,
            });
        } catch (error) {
            console.error('getRefreshToken Error :: ', error.message);
            throw new InternalServerErrorException(MessageEnum.error.SERVER_ERROR);
        }
    }

    private async saveHashedRefreshToken(userId: string, refreshToken: string, expiresAt?: Date, device?: string) {
        try {
            const hash = await bcrypt.hash(refreshToken, 10);

            if (this.useMultipleRefreshTokens) {
                //* multible refresh tokens (RefreshToken model)
                await this.prisma.refreshToken.create({
                    data: {
                        tokenHash: hash,
                        userId,
                        expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        device,
                    },
                });
            } else {
                //* single refresh token
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { refreshHash: hash },
                });
            }
        } catch (error) {
            console.error('saveHashedRefreshToken Error :: ', error.message);
            throw new InternalServerErrorException(MessageEnum.error.SERVER_ERROR);
        }
    }

    async generateTokens(user: any) {
        const payload = { id: user.id, email: user.email };
        const token = this.getAccessToken(payload);
        const refreshToken = this.getRefreshToken(payload);

        if (this.useMultipleRefreshTokens) {
            //* multiple refresh tokens (RefreshToken model)
            //* compute expiry date from JWT_REFRESH_EXPIRY (simple approach: 7 days)
            const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await this.saveHashedRefreshToken(user.id, refreshToken, refreshExpiry);
        } else {
            await this.saveHashedRefreshToken(user.id, refreshToken);
        }

        return { token, refreshToken };
    }

    async login(user: any) {
        const tokens = await this.generateTokens(user);
        return {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            name: user.name,
        };
    }

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException(MessageEnum.error.EMAIL_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        let stripeCustomer;
        let user;

        try {
            // Create Stripe customer first
            stripeCustomer = await this.customersService.createCustomer(dto);

            // Create user in database with Stripe customer ID
            user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    password: hashedPassword,
                    stripeCustomerId: stripeCustomer.id,
                },
            });
        } catch (error) {
            // Compensation: If DB creation fails but Stripe customer was created, delete the Stripe customer
            if (stripeCustomer && !user) {
                try {
                    await this.customersService.deleteCustomer(stripeCustomer.id);
                    console.error('Rolled back Stripe customer creation due to DB error');
                } catch (deleteError) {
                    console.error('Failed to rollback Stripe customer:', deleteError.message);
                    // Log this for manual cleanup - this is a critical issue
                }
            }
            throw error;
        }

        const tokens = await this.generateTokens(user);

        return {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            name: user.name,
            email: user.email,
        };
    }

    async refreshTokens(providedRefreshToken: string) {
        // Verify signature & decode payload
        let payload: any;
        try {
            payload = this.jwtService.verify(providedRefreshToken, {
                secret: serviceConfig.service.jwtRefreshSecret,
            });
        } catch (err) {
            throw new ForbiddenException(MessageEnum.error.INVALID_REFRESH_TOKEN);
        }

        // Find stored hashed refresh token for user and compare
        const user = await this.prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user || !user.refreshHash) {
            throw new ForbiddenException(MessageEnum.error.ACCESS_DENIED);
        }

        const isMatch = await bcrypt.compare(
            providedRefreshToken,
            user.refreshHash,
        );

        if (!isMatch) {
            throw new ForbiddenException(MessageEnum.error.INVALID_REFRESH_TOKEN);
        }

        // Generate new tokens (this also handles token rotation)
        const tokens = await this.generateTokens(user);

        return tokens;
    }
}
