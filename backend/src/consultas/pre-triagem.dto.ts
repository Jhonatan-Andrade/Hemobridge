import { Equals, IsBoolean, IsISO8601, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';

export const VERSAO_PRE_TRIAGEM = '2026-10-23';

export class ResponderPreTriagemDto {
  @Equals(VERSAO_PRE_TRIAGEM) versao: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(400) pesoKg: number;
  @IsBoolean() doouAntes: boolean;
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataUltimaDoacao?: string;
  @IsOptional() @IsBoolean() doouAntesDos60?: boolean;
  @IsBoolean() condicaoSaudeRequerAvaliacao: boolean;
}
