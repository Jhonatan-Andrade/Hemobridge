import { Equals, IsString, MaxLength } from 'class-validator';
import { IsIgualA, IsSenhaValida } from '../../common/validators.js';

// UC07 – Definir Senha no Primeiro Acesso
export class PrimeiroAcessoDto {
  @IsSenhaValida()
  novaSenha: string;

  @IsIgualA('novaSenha', { message: 'A confirmação de senha não confere' })
  confirmacaoSenha: string;

  // FE03
  @Equals(true, { message: 'O aceite do termo de responsabilidade e sigilo é obrigatório' })
  aceiteTermo: boolean;

  @IsString()
  @MaxLength(20)
  versaoTermo: string;
}
