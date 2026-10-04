import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { aparar, emailNormalizado, maiusculas, somenteDigitos } from '../../common/transformacoes.js';
import { UFS } from '../../common/uf.js';
import { IsCpf } from '../../common/validators.js';
import { StatusUsuario } from '../../generated/prisma/enums.js';

// UC22 passos 4–5
export class NovoMedicoDto {
  @Transform(aparar)
  @IsString()
  @Length(3, 150)
  nome: string;

  @Transform(somenteDigitos)
  @IsCpf()
  cpf: string;

  @Transform(emailNormalizado)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;

  @Transform(somenteDigitos)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter DDD e 8 ou 9 dígitos' })
  telefone: string;

  @Transform(somenteDigitos)
  @Matches(/^\d{1,10}$/, { message: 'CRM deve conter apenas números (até 10 dígitos)' })
  crm: string;

  @Transform(maiusculas)
  @IsIn(UFS, { message: 'UF do CRM inválida' })
  ufCrm: string;

  // RF13: o representante declara que a instituição conferiu CRM e UF.
  @Equals(true, {
    message: 'É obrigatório declarar que a instituição conferiu o CRM e a UF do médico',
  })
  declaracaoCrmConferido: boolean;
}

// FA01: CPF e CRM não são editáveis.
export class AtualizarMedicoDto {
  @IsOptional()
  @Transform(emailNormalizado)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(somenteDigitos)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter DDD e 8 ou 9 dígitos' })
  telefone?: string;
}

export class ListarMedicosDto {
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(StatusUsuario)
  status?: StatusUsuario;

  /** Nome, e-mail ou CRM. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(2, 150)
  busca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  tamanhoPagina: number = 20;
}
