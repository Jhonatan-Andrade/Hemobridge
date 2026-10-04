import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { EmailService, type MensagemEmail } from './email.service.js';

// Em desenvolvimento aponta para o Mailpit; em produção, para o SMTP real.
@Injectable()
export class SmtpEmailService extends EmailService {
  private readonly transporter: Transporter;
  private readonly remetente: string;

  constructor(config: ConfigService) {
    super();
    const usuario = config.get<string>('SMTP_USUARIO');
    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(config.get('SMTP_PORTA', 1025)),
      secure: config.get('SMTP_SEGURO') === 'true',
      auth: usuario ? { user: usuario, pass: config.get<string>('SMTP_SENHA') } : undefined,
    });
    this.remetente = config.get<string>('EMAIL_REMETENTE', 'Hemobridge <nao-responda@hemobridge.local>');
  }

  async enviar({ para, assunto, texto, html }: MensagemEmail): Promise<void> {
    await this.transporter.sendMail({ from: this.remetente, to: para, subject: assunto, text: texto, html });
  }
}
