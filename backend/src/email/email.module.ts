import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { SmtpEmailService } from './smtp-email.service.js';

@Global()
@Module({
  providers: [{ provide: EmailService, useClass: SmtpEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
