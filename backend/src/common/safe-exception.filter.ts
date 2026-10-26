import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const body = error.getResponse();
      response
        .status(error.getStatus())
        .json(
          typeof body === 'string'
            ? { statusCode: error.getStatus(), message: body }
            : body,
        );
      return;
    }
    const traceId = randomUUID();
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : 'INTERNAL';
    const conflict = ['P2002', 'P2003', 'P2004', 'P2025'].includes(code);
    // Não registrar mensagens de drivers: podem conter parâmetros ou dados clínicos.
    this.logger.error(
      `Falha ${code.replace(/[^A-Z0-9_]/g, '').slice(0, 32)} · referência ${traceId}`,
    );
    response
      .status(conflict ? 409 : 500)
      .json({
        statusCode: conflict ? 409 : 500,
        message: conflict
          ? 'O registro está indisponível ou foi alterado. Atualize os dados e tente novamente.'
          : 'Não foi possível concluir a solicitação.',
        referencia: traceId,
      });
  }
}
