import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
    async  login(data:LoginDto) {
        return { data, message: 'Login successful' };
    }
}
