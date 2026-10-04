import { Module } from '@nestjs/common';
import { HospitaisAdminController } from './hospitais-admin.controller.js';
import { HospitaisAdminService } from './hospitais-admin.service.js';
import { UsuariosAdminController } from './usuarios-admin.controller.js';

@Module({
  controllers: [HospitaisAdminController, UsuariosAdminController],
  providers: [HospitaisAdminService],
})
export class AdminModule {}
