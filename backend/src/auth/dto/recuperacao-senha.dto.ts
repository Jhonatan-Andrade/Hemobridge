import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsIgualA, IsSenhaValida } from '../../common/validators.js';

// UC06 passos 2–3
export class RecuperarSenhaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;
}

// UC06 passos 6–7
export class RedefinirSenhaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  token: string;

  @IsSenhaValida()
  novaSenha: string;

  @IsIgualA('novaSenha', { message: 'A confirmação de senha não confere' })
  confirmacaoSenha: string;
}
