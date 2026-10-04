import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { UFS } from '../../common/uf.js';
import { IsCnpj, IsCpf } from '../../common/validators.js';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const somenteDigitos = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;
const maiusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const emailNormalizado = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// Dados do banco de sangue (UC25 passo 4)
export class DadosHospitalDto {
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

  // RF22
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class AtualizarHospitalDto extends PartialType(DadosHospitalDto) {}

// Representante (UC25 passo 4 e FA03)
export class NovoRepresentanteDto {
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

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(100)
  cargo?: string;
}

// UC25 passos 5–6: banco de sangue e seu primeiro representante.
export class CriarHospitalDto extends DadosHospitalDto {
  @ValidateNested()
  @Type(() => NovoRepresentanteDto)
  representante: NovoRepresentanteDto;
}

export class ListarHospitaisAdminDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(150)
  busca?: string;

  @IsOptional()
  @Transform(maiusculas)
  @IsIn(UFS)
  estado?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  ativo?: boolean;

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
