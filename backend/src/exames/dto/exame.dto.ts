import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

// UC15
export class SolicitarExamesDto {
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value))
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um exame.' })
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  exames: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  orientacoes?: string;
}
