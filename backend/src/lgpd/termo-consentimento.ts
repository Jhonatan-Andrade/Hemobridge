// RF01: versão vigente do termo de consentimento apresentado no cadastro do
// paciente. Ao alterar o texto, incremente a versão (o aceite é versionado).
export const TERMO_CONSENTIMENTO = {
  versao: '3.0',
  finalidade:
    'Tratamento de dados pessoais e de saúde para agendar doações de sangue, registrar a triagem, a coleta e os exames da doação e compartilhar o histórico de doações entre os hemocentros onde o titular agendar',
  texto: [
    'O Hemobridge usa seus dados pessoais (nome, CPF, e-mail, telefone, data de nascimento e sexo) para criar sua conta e agendar doações de sangue nos hemocentros parceiros. O sexo define o intervalo mínimo entre doações e o limite de doações em 12 meses.',
    'No atendimento, a equipe do hemocentro registra a entrevista de triagem clínica (histórico de saúde, medicamentos, vacinas, hábitos e comportamentos de risco e viagens recentes), as aferições do dia (peso, pressão, pulso, temperatura e hemoglobina), os dados da coleta (volume, número da bolsa e reações) e se você está apto ou inapto para doar. Depois, registra os exames da sua amostra: tipagem sanguínea, pesquisa de anticorpos e testes para HIV, hepatites B e C, sífilis, doença de Chagas, HTLV e, em regiões endêmicas, malária. Esses são dados de saúde, sigilosos, usados para a segurança de quem doa e de quem recebe.',
    'Compartilhamento entre hemocentros: o registro de cada doação fica vinculado ao hemocentro que a fez. A equipe de outro hemocentro em que você tiver agendamento pode ler a data, o resultado, as aferições, os dados da coleta e a aptidão, para conhecer seu histórico. A entrevista de triagem e os resultados dos exames ficam só no hemocentro que atendeu. Nenhum hemocentro altera registros de outro, e todo acesso fica registrado em auditoria.',
    'Se algum exame der alterado, o hemocentro entra em contato com você de forma reservada para orientar e encaminhar ao atendimento; o seu painel mostra apenas esse aviso. Algumas doenças são de notificação compulsória e podem ser comunicadas às autoridades de saúde, como em qualquer serviço de saúde.',
    'Você pode solicitar a exclusão dos seus dados pelo seu painel. Os dados pessoais são anonimizados; os registros de doação, de triagem e de exames são mantidos sem identificação direta pelo prazo exigido pela legislação sanitária.',
  ],
} as const;
