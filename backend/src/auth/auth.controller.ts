import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post('login')
    async login(@Body() body: LoginDto) {
        return await this.authService.login(body);
    }

    @Post('register')
    async register(@Body() body: RegisterDto) {
        return await this.authService.register(body);
    }
}
