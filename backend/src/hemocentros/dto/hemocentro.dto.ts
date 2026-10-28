import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginacaoDto } from '../../common/paginacao.dto.js';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { aparar, booleano, emailNormalizado, maiusculas, somenteDigitos } from '../../common/transformacoes.js';
import { UFS } from '../../common/uf.js';
import { IsCnpj, IsCpf } from '../../common/validators.js';

/** Na query string o "+" sem codificação vira espaço ("A+" chega como "A "). */
const siglaDaQuery = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/ /g, '+').trim().toUpperCase() : value;

// RF05: página Doar.
export class ConsultarHemocentrosDto extends PaginacaoDto {
  /** Parte do nome ou da cidade, sem diferenciar acentos. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(2, 100)
  busca?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(2, 100)
  cidade?: string;

  /** RF18: tipo do paciente; quem precisa dele vem primeiro e ganha destaque. */
  @IsOptional()
  @Transform(siglaDaQuery)
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipo?: string;
}

// RF15: dados do hemocentro.
export class DadosHemocentroDto {
  @Transform(aparar)
  @IsString()
  @Length(3, 150)
  nome: string;

  @Transform(somenteDigitos)
  @IsCnpj()
  cnpj: string;

  @Transform(aparar)
  @IsString()
  @Length(5, 255)
  endereco: string;

  @Transform(aparar)
  @IsString()
  @Length(2, 100)
  cidade: string;

  @Transform(maiusculas)
  @IsIn(UFS, { message: 'Estado deve ser uma UF válida' })
  estado: string;

  @Transform(somenteDigitos)
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  cep: string;

  @Transform(somenteDigitos)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter DDD e 8 ou 9 dígitos' })
  telefone: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(255)
  horarioFuncionamento?: string;
}

/** Edição dos dados e ativação/desativação do hemocentro. */
export class AtualizarHemocentroDto extends PartialType(DadosHemocentroDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

// RF15: Admin do hemocentro criado pelo administrador da plataforma.
export class NovoAdminHemocentroDto {
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

/** Hemocentro e seu primeiro Admin, criados juntos. */
export class CriarHemocentroDto extends DadosHemocentroDto {
  @ValidateNested()
  @Type(() => NovoAdminHemocentroDto)
  admin: NovoAdminHemocentroDto;
}

export class ListarHemocentrosGestaoDto extends PaginacaoDto {
  /** Nome, cidade ou CNPJ. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(150)
  busca?: string;

  @IsOptional()
  @Transform(booleano)
  @IsBoolean()
  ativo?: boolean;
}
