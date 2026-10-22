import { Module } from '@nestjs/common';
import { HospitaisAdminController } from './hospitais-admin.controller.js';
import { HospitaisAdminService } from './hospitais-admin.service.js';
import { UsuariosAdminController } from './usuarios-admin.controller.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';
import { PrivacidadeAdminController } from './privacidade-admin.controller.js';
import { PrivacidadeAdminService } from './privacidade-admin.service.js';

@Module({
  controllers: [
    HospitaisAdminController,
    UsuariosAdminController,
    PrivacidadeAdminController,
  ],
  providers: [
    HospitaisAdminService,
    UsuariosAdminService,
    PrivacidadeAdminService,
  ],
})
export class AdminModule {}
