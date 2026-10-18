import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { RecuperacaoSenhaService } from './recuperacao-senha.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          issuer: config.get<string>('JWT_ISSUER', 'hemobridge'),
          audience: config.get<string>('JWT_AUDIENCE', 'hemobridge-clients'),
          algorithm: 'HS256',
          expiresIn: config.get('JWT_EXPIRACAO', '15m') as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
        },
        verifyOptions: {
          issuer: config.get<string>('JWT_ISSUER', 'hemobridge'),
          audience: config.get<string>('JWT_AUDIENCE', 'hemobridge-clients'),
          algorithms: ['HS256'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RecuperacaoSenhaService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
