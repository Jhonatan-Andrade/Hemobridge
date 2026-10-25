import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsISO8601, IsString, Length, Matches, MaxLength } from 'class-validator';
import { aparar, emailNormalizado, somenteDigitos } from '../../common/transformacoes.js';
import { IsCpf, IsDataPassada, IsIgualA, IsSenhaValida } from '../../common/validators.js';

// RF01 – Cadastro do paciente
export class CadastroDto {
  @Transform(aparar)
  @IsString()
  @Length(3, 150, { message: 'O nome deve ter entre 3 e 150 caracteres' })
  nome: string;

  @Transform(somenteDigitos)
  @IsCpf()
  cpf: string;

  @Transform(emailNormalizado)
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
  @IsDataPassada({ message: 'A data de nascimento deve ser anterior a hoje' })
  dataNascimento: string;

  // RF01: consentimento explícito, incluindo o compartilhamento entre hemocentros.
  @Equals(true, {
    message: 'O aceite do termo de consentimento é obrigatório para o tratamento de dados de saúde',
  })
  aceiteTermo: boolean;

  @IsString()
  @MaxLength(20)
  versaoTermo: string;
}
