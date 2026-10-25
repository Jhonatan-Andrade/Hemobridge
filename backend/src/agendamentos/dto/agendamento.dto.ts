import { IsUUID } from 'class-validator';

// RF06 (agendar) e RF07 (reagendar): o horário escolhido.
export class HorarioEscolhidoDto {
  @IsUUID('all', { message: 'Horário inválido' })
  horarioId: string;
}
