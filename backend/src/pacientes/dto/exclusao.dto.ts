import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// RF16: a exclusão é confirmada com a senha da conta.
export class ExclusaoDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha para confirmar' })
  @MaxLength(128)
  senha: string;
}
