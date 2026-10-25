// RF01: versão vigente do termo de consentimento apresentado no cadastro do
// paciente. Ao alterar o texto, incremente a versão (o aceite é versionado).
export const TERMO_CONSENTIMENTO = {
  versao: '2.0',
  finalidade:
    'Tratamento de dados pessoais e de saúde para agendar doações de sangue e compartilhar o histórico de doações entre os hemocentros onde o titular agendar',
  texto: [
    'O Hemobridge usa seus dados pessoais (nome, CPF, e-mail, telefone e data de nascimento) para criar sua conta e agendar doações de sangue nos hemocentros parceiros.',
    'Quando você é atendido, a equipe do hemocentro registra os dados da doação: comparecimento, se a doação foi feita, tipo sanguíneo, motivo de não doação e observações. Esses são dados de saúde.',
    'Compartilhamento entre hemocentros: o registro de cada doação fica vinculado ao hemocentro que a fez e pode ser lido pela equipe de outro hemocentro em que você tiver agendamento, para que ela conheça seu histórico. Nenhum hemocentro altera registros de outro, e todo acesso fica registrado em auditoria.',
    'Você pode solicitar a exclusão dos seus dados pelo seu painel. Os dados pessoais são anonimizados; os registros de doação são mantidos sem identificação direta pelo prazo exigido pela legislação sanitária.',
  ],
} as const;
