import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Sexo } from '../../generated/prisma/enums.js';
import { normalizarCpf } from '../../common/cpf.js';
import { UFS } from '../../common/uf.js';
import { IsCpf, IsIgualA, IsSenhaValida } from '../../common/validators.js';

const apararTexto = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const somenteDigitos = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizarCpf(value) : value;

// RF01 / UC01
export class PreCadastroDto {
  @Transform(apararTexto)
  @IsString()
  @Length(3, 150, { message: 'O nome deve ter entre 3 e 150 caracteres' })
  nome: string;

  @Transform(somenteDigitos)
  @IsCpf()
  cpf: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;

  @IsSenhaValida()
  senha: string;

  @IsIgualA('senha', { message: 'A confirmação de senha não confere' })
  confirmacaoSenha: string;

  @Transform(somenteDigitos)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter DDD e 8 ou 9 dígitos' })
  telefone: string;

  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'Data de nascimento inválida' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de nascimento deve estar no formato AAAA-MM-DD' })
  dataNascimento: string;

  @IsEnum(Sexo, { message: 'Sexo deve ser MASCULINO ou FEMININO' })
  sexo: Sexo;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Peso inválido' })
  @Min(1)
  @Max(400)
  pesoKg: number;

  @Transform(apararTexto)
  @IsString()
  @Length(2, 100)
  cidade: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(UFS, { message: 'Estado deve ser uma UF válida' })
  estado: string;

  // RN12 / FE03
  @Equals(true, {
    message: 'O aceite do termo de consentimento é obrigatório para o tratamento de dados de saúde',
  })
  aceiteTermo: boolean;

  @IsString()
  @MaxLength(20)
  versaoTermo: string;

  // UC01 FA01: acima de 60 anos, o paciente confirma ciência da regra da RN17.
  @IsOptional()
  @IsBoolean()
  cienteRegraAcimaDe60?: boolean;
}
