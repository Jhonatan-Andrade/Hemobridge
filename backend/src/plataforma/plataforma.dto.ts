import {
  Equals,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { IsIgualA, IsSenhaValida } from '../common/validators.js';
import { UFS } from '../common/uf.js';
import { Type } from 'class-transformer';
export class PerfilPacienteDto {
  @IsString() @Length(10, 20) telefone: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(400) pesoKg: number;
  @IsString() @Length(2, 100) cidade: string;
  @IsIn(UFS) estado: string;
}
export class SenhaAtualDto {
  @IsString() @Length(1, 200) senhaAtual: string;
}
export class TrocarSenhaDto extends SenhaAtualDto {
  @IsSenhaValida() novaSenha: string;
  @IsIgualA('novaSenha') confirmacaoSenha: string;
}
export class AgendarDto {
  @IsUUID() disponibilidadeId: string;
  @IsUUID() preTriagemId: string;
  @Equals(true) aceiteTelemedicina: boolean;
}
export class HospitalQueryDto {
  @IsOptional() @IsUUID() hospitalId?: string;
}
export class AgendaQueryDto extends HospitalQueryDto {
  @IsOptional() @IsIn(['true', 'false']) incluirRealizadas?: string;
  @IsOptional() @IsIn(['proximos', 'historico']) periodo?: 'proximos' | 'historico';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) tamanhoPagina?: number;
}
export class DisponibilidadeDto {
  @IsUUID() hospitalId: string;
  @IsISO8601() inicio: string;
  @IsISO8601() fim: string;
  @IsUrl({ protocols: ['https'], require_protocol: true })
  linkVideochamada: string;
}
export class AtendimentoDto {
  @IsIn(['REALIZADA', 'NAO_COMPARECEU']) status: 'REALIZADA' | 'NAO_COMPARECEU';
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string;
  @IsOptional() @IsIn(['SOLICITAR_EXAMES', 'REPROVAR']) decisao?: 'SOLICITAR_EXAMES' | 'REPROVAR';
  @IsOptional() @IsString() @Length(5, 2000) motivoReprovacao?: string;
}
export class CancelarConsultaMedicoDto {
  @IsString() @Length(5, 500) motivo: string;
}
export class BolsaDto {
  @IsString() @Length(1, 100) codigo: string;
  @IsInt() @Min(1) @Max(32767) tipoSanguineoId: number;
  @IsString() @Length(3, 80) componente: string;
  @IsISO8601() coletadaEm: string;
  @IsISO8601() validadeEm: string;
}
export class MovimentoBolsaDto {
  @IsIn(['QUARENTENA', 'DISPONIVEL', 'RESERVADA', 'UTILIZADA', 'DESCARTADA'])
  anterior:
    'QUARENTENA' | 'DISPONIVEL' | 'RESERVADA' | 'UTILIZADA' | 'DESCARTADA';
  @IsIn(['DISPONIVEL', 'RESERVADA', 'UTILIZADA', 'DESCARTADA']) status:
    'DISPONIVEL' | 'RESERVADA' | 'UTILIZADA' | 'DESCARTADA';
  @IsString() @Length(5, 500) motivo: string;
  @IsOptional() @IsString() @Length(3, 200) liberacaoReferencia?: string;
}
export class VerificacaoHospitalDto {
  @IsString() @Length(10, 500) fonte: string;
}
