import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// UC05. A política de senha (RN06) não é aplicada aqui: só se confere a credencial.
export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  @MaxLength(128)
  senha: string;
}
