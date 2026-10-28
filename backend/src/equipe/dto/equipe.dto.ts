import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { PaginacaoDto } from '../../common/paginacao.dto.js';
import { aparar, emailNormalizado, maiusculas, somenteDigitos } from '../../common/transformacoes.js';
import { IsCpf } from '../../common/validators.js';
import { PapelEquipe, StatusUsuario } from '../../generated/prisma/enums.js';

// RF14: médico cadastrado pelo Admin do hemocentro.
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
}

/** Nome e CPF não são editáveis; `ativo` desativa ou reativa o acesso. */
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

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class ListarEquipeDto extends PaginacaoDto {
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(PapelEquipe)
  papel?: PapelEquipe;

  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(StatusUsuario)
  status?: StatusUsuario;

  /** Nome ou e-mail. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(2, 150)
  busca?: string;
}
