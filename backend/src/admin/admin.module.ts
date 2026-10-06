import { Module } from '@nestjs/common';
import { HospitaisAdminController } from './hospitais-admin.controller.js';
import { HospitaisAdminService } from './hospitais-admin.service.js';
import { UsuariosAdminController } from './usuarios-admin.controller.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';

@Module({
  controllers: [HospitaisAdminController, UsuariosAdminController],
  providers: [HospitaisAdminService, UsuariosAdminService],
})
export class AdminModule {}
