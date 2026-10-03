import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
    async  login(data:LoginDto) {
        return { data, message: 'Login successful' };
    }
    async  register(data:RegisterDto) {
        return { data, message: 'Registration successful' };
    }
}
