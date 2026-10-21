import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const prefix = config.get<string>('API_PREFIX');
  if (prefix) app.setGlobalPrefix(prefix);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Origens autorizadas a chamar a API pelo navegador (separadas por vírgula).
  // Web usa cookie protegido; aplicativo usa Authorization.
  const origens = config
    .get<string>(
      'CORS_ORIGENS',
      config.get<string>('FRONTEND_URL', 'http://localhost:5174'),
    )
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origens,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Retry-After'],
    maxAge: 600,
  });

  // Atrás de proxy reverso (nginx, load balancer), use o IP real do cliente
  // para o limite de requisições e para o registro de consentimento.
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy) {
    app.set(
      'trust proxy',
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const porta = process.env.PORT ?? 3000;
  await app.listen(porta, '0.0.0.0');
  Logger.log(`API rodando na porta ${porta}`, 'Bootstrap');
}
await bootstrap();
