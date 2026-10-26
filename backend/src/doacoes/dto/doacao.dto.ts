import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginacaoDto } from '../../common/paginacao.dto.js';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { aparar, maiusculas } from '../../common/transformacoes.js';

export class AgendaDoDiaDto {
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data deve estar no formato AAAA-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato AAAA-MM-DD' })
  data?: string;
}

const DATA = { message: 'Data deve estar no formato AAAA-MM-DD' };

// Histórico de atendimentos do hemocentro, filtrado pela data do horário.
export class AtendimentosDto extends PaginacaoDto {
  @IsOptional()
  @IsISO8601({ strict: true }, DATA)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, DATA)
  de?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, DATA)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, DATA)
  ate?: string;
}

/** Entrevista confidencial da triagem clínica. Texto vazio significa "nada a declarar". */
export class TriagemDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(1000)
  doencas?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(1000)
  cirurgias?: string;

  @IsBoolean()
  transfusaoAnterior: boolean;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(1000)
  alergias?: string;

  /** Gestações, partos ou abortos. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(500)
  gestacoes?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(1000)
  medicamentos?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(500)
  vacinasRecentes?: string;

  @IsBoolean()
  tatuagemOuPiercingRecente: boolean;

  @IsBoolean()
  usoDeDrogas: boolean;

  @IsBoolean()
  comportamentoSexualDeRisco: boolean;

  /** Destino e data de viagem recente a área de malária, dengue etc. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(500)
  viagemAreaDeRisco?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}

const UMA_CASA = { maxDecimalPlaces: 1 };

/** Aferições do dia; obrigatórias quando houve doação. Faixas fisiológicas, não critérios de aptidão. */
export class AfericoesDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(30, { message: 'Peso deve estar entre 30 e 300 kg' })
  @Max(300, { message: 'Peso deve estar entre 30 e 300 kg' })
  pesoKg?: number;

  @IsOptional()
  @IsInt()
  @Min(100, { message: 'Altura deve estar entre 100 e 250 cm' })
  @Max(250, { message: 'Altura deve estar entre 100 e 250 cm' })
  alturaCm?: number;

  @IsOptional()
  @IsInt()
  @Min(60, { message: 'Pressão sistólica deve estar entre 60 e 260 mmHg' })
  @Max(260, { message: 'Pressão sistólica deve estar entre 60 e 260 mmHg' })
  pressaoSistolica?: number;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Pressão diastólica deve estar entre 30 e 160 mmHg' })
  @Max(160, { message: 'Pressão diastólica deve estar entre 30 e 160 mmHg' })
  pressaoDiastolica?: number;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Pulso deve estar entre 30 e 220 bpm' })
  @Max(220, { message: 'Pulso deve estar entre 30 e 220 bpm' })
  pulso?: number;

  @IsOptional()
  @IsNumber(UMA_CASA)
  @Min(33, { message: 'Temperatura deve estar entre 33 e 43 °C' })
  @Max(43, { message: 'Temperatura deve estar entre 33 e 43 °C' })
  temperatura?: number;

  /** g/dL */
  @IsOptional()
  @IsNumber(UMA_CASA)
  @Min(3, { message: 'Hemoglobina deve estar entre 3 e 25 g/dL' })
  @Max(25, { message: 'Hemoglobina deve estar entre 3 e 25 g/dL' })
  hemoglobina?: number;

  /** % */
  @IsOptional()
  @IsNumber(UMA_CASA)
  @Min(10, { message: 'Hematócrito deve estar entre 10% e 75%' })
  @Max(75, { message: 'Hematócrito deve estar entre 10% e 75%' })
  hematocrito?: number;
}

/** Dados da coleta, quando houve doação. */
export class ColetaDto {
  @IsInt()
  @Min(50, { message: 'Volume deve estar entre 50 e 600 mL' })
  @Max(600, { message: 'Volume deve estar entre 50 e 600 mL' })
  volumeMl: number;

  @Transform(maiusculas)
  @Matches(/^[A-Z0-9-]{3,30}$/, { message: 'Número da bolsa: de 3 a 30 letras, números ou hífen' })
  numeroBolsa: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(1000)
  reacoes?: string;
}

export const APTIDOES = ['APTO', 'INAPTO_TEMPORARIO', 'INAPTO_DEFINITIVO'] as const;
export type Aptidao = (typeof APTIDOES)[number];

// RF11: registro do atendimento pelo médico.
export class RegistrarDoacaoDto {
  @IsUUID('all', { message: 'Agendamento inválido' })
  agendamentoId: string;

  @IsBoolean()
  compareceu: boolean;

  @IsBoolean()
  doou: boolean;

  /** ABO + Rh, quando houver tipagem. */
  @IsOptional()
  @Transform(maiusculas)
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipoSanguineo?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(3, 500, { message: 'O motivo deve ter entre 3 e 500 caracteres' })
  motivoNaoDoacao?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(2000)
  observacoes?: string;

  /** Obrigatória quando o paciente compareceu. */
  @IsOptional()
  @ValidateNested()
  @Type(() => TriagemDto)
  triagem?: TriagemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AfericoesDto)
  afericoes?: AfericoesDto;

  /** Só quando houve doação, e então obrigatória. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ColetaDto)
  coleta?: ColetaDto;

  /** Conclusão da triagem; obrigatória quando o paciente compareceu. */
  @IsOptional()
  @IsIn(APTIDOES, { message: 'Aptidão deve ser APTO, INAPTO_TEMPORARIO ou INAPTO_DEFINITIVO' })
  aptidao?: Aptidao;

  /** Obrigatória para inapto temporário: primeiro dia em que pode voltar a doar. */
  @IsOptional()
  @IsISO8601({ strict: true }, DATA)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, DATA)
  aptoAPartirDe?: string;
}

export const SOROLOGIAS = ['NAO_REAGENTE', 'REAGENTE', 'INCONCLUSIVO'] as const;
export type ResultadoSorologia = (typeof SOROLOGIAS)[number];
const SOROLOGIA = { message: 'Resultado deve ser NAO_REAGENTE, REAGENTE ou INCONCLUSIVO' };

/** Exames da amostra, lançados depois da coleta. */
export class RegistrarExamesDto {
  @IsIn(['NEGATIVA', 'POSITIVA'], { message: 'Pesquisa de anticorpos deve ser NEGATIVA ou POSITIVA' })
  pesquisaAnticorpos: 'NEGATIVA' | 'POSITIVA';

  @IsIn(SOROLOGIAS, SOROLOGIA)
  hiv: ResultadoSorologia;

  @IsIn(SOROLOGIAS, SOROLOGIA)
  hepatiteB: ResultadoSorologia;

  @IsIn(SOROLOGIAS, SOROLOGIA)
  hepatiteC: ResultadoSorologia;

  @IsIn(SOROLOGIAS, SOROLOGIA)
  sifilis: ResultadoSorologia;

  @IsIn(SOROLOGIAS, SOROLOGIA)
  chagas: ResultadoSorologia;

  @IsIn(SOROLOGIAS, SOROLOGIA)
  htlv: ResultadoSorologia;

  /** Só em regiões endêmicas. */
  @IsOptional()
  @IsIn(SOROLOGIAS, SOROLOGIA)
  malaria?: ResultadoSorologia;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
