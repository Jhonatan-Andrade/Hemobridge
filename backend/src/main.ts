import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Origens autorizadas a chamar a API pelo navegador (separadas por vírgula).
  // A autenticação usa o cabeçalho Authorization, então cookies não são necessários.
  const origens = config
    .get<string>('CORS_ORIGENS', config.get<string>('FRONTEND_URL', 'http://localhost:5173'))
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origens,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Retry-After'],
    maxAge: 600,
  });

  // Atrás de proxy reverso (nginx, load balancer), use o IP real do cliente
  // para o limite de requisições e para o registro de consentimento.
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
