import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
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
import { IsCpf } from '../../common/validators.js';
import { Perfil, StatusUsuario } from '../../generated/prisma/enums.js';

// UC26 passo 2
export class ListarUsuariosDto {
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(Perfil)
  perfil?: Perfil;

  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(StatusUsuario)
  status?: StatusUsuario;

  /** Nome, e-mail ou CPF. */
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

// UC26 passo 4 – dados que o administrador pode editar (CPF não é editável).
export class AtualizarUsuarioDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(3, 150)
  nome?: string;

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

// UC26 FA01
export class NovoAdministradorDto {
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

  @IsOptional()
  @Transform(somenteDigitos)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter DDD e 8 ou 9 dígitos' })
  telefone?: string;
}
