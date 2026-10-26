# Sistema de Agendamento de Doação de Sangue

Plataforma web de **agendamento de doação de sangue em hemocentros**. O paciente escolhe um hemocentro, vê os horários com vagas e agenda. O hemocentro define quantas pessoas atende em cada horário, registra os dados de cada doação, e esse histórico fica disponível para os outros hemocentros onde o paciente vier a doar, em conformidade com a LGPD.

## Sumário

- [Visão Geral](#visão-geral)
- [Perfis de Usuário](#perfis-de-usuário)
- [Áreas do Paciente](#áreas-do-paciente)
- [Funcionalidades](#funcionalidades)
  - [Requisitos Funcionais](#requisitos-funcionais)
  - [Requisitos Não Funcionais](#requisitos-não-funcionais)
  - [Regras de Negócio](#regras-de-negócio)
- [Fluxo Principal](#fluxo-principal)
- [Vagas por Horário](#vagas-por-horário)
- [Necessidades do Hemocentro](#necessidades-do-hemocentro)
- [Histórico Compartilhado entre Hemocentros](#histórico-compartilhado-entre-hemocentros)
- [Conformidade com a LGPD](#conformidade-com-a-lgpd)
- [Fora do Escopo](#fora-do-escopo)

## Visão Geral

O sistema organiza a doação de sangue a partir do agendamento: o paciente se cadastra, escolhe um hemocentro parceiro de acordo com as necessidades informadas, agenda um horário com vaga e comparece. A equipe do hemocentro registra o atendimento, ativa a conta do paciente como doador e passa a contar com o histórico de doações dele, inclusive o registrado em outros hemocentros. O modelo de dados está em [`der.md`](./der.md).

## Perfis de Usuário

| Perfil | Papel |
|---|---|
| **Paciente** | Faz cadastro e login. Usa as 3 áreas do sistema (Apresentação, Painel, Doar). A conta nasce `PENDENTE` e vira `ATIVA` (doador) depois da ativação. |
| **Equipe do hemocentro** | Vinculada a **um hemocentro**. Tem dois papéis: **Médico** (vê quem está agendado e registra a doação) e **Admin do hemocentro** (gerencia horários e vagas, informa as necessidades por tipo sanguíneo, cadastra os médicos do seu hemocentro e ativa contas de pacientes). |
| **Administrador da plataforma** | Cadastra e desativa hemocentros e cria o primeiro Admin de cada hemocentro. Escopo mínimo, sem telas elaboradas. |

## Áreas do Paciente

| Área | Rota | Conteúdo |
|---|---|---|
| **Apresentação** | `/` | Página pública: o que é o Hemobridge, por que doar, como funciona (cadastro → escolhe hemocentro → agenda → doa), hemocentros parceiros e chamadas para cadastro e login. |
| **Painel** | `/painel` | Área logada: dados pessoais, status da conta (`PENDENTE`/`ATIVA`), tipo sanguíneo (somente leitura, depois da ativação), histórico de todas as doações (data, hemocentro, resultado), próximos agendamentos com cancelar e reagendar, e a solicitação de exclusão de dados. |
| **Doar** | `/doar` | Hemocentros com busca por nome/cidade e as necessidades atuais por tipo sanguíneo. Com o tipo do paciente registrado, quem precisa exatamente desse tipo ganha destaque. Ao escolher um hemocentro, mostra os horários por data com as vagas restantes ("4 de 6 vagas"); horário lotado aparece indisponível. O paciente confirma e vê a confirmação. |

## Funcionalidades

### Requisitos Funcionais

| Código | Descrição |
|---|---|
| RF01 | Cadastro do paciente com dados básicos (inclusive o sexo) e aceite do termo LGPD (incluindo compartilhamento entre hemocentros). |
| RF02 | Autenticação por credenciais com controle de acesso por perfil e papel. |
| RF03 | Página pública de apresentação do Hemobridge. |
| RF04 | Painel do paciente com dados, status da conta, tipo sanguíneo e histórico de doações com o hemocentro de origem. |
| RF05 | Página Doar: listar hemocentros, buscar por nome/cidade e ver horários com vagas restantes. |
| RF06 | Agendamento de doação pelo paciente em horário com vaga. |
| RF07 | Cancelamento e reagendamento pelo paciente, liberando a vaga. |
| RF08 | O Admin do hemocentro define horários e a quantidade de vagas de cada um, inclusive em lote semanal. |
| RF09 | O sistema impede overbooking, agendamento em horário passado/inativo, duplicidade e agendamento fora do intervalo mínimo entre doações (RN20). |
| RF10 | O médico visualiza, por data e horário, os pacientes agendados no seu hemocentro. |
| RF11 | O médico registra o atendimento, vinculado ao hemocentro: comparecimento, triagem clínica (entrevista confidencial), aferições do dia (peso, pressão, pulso, temperatura, hemoglobina ou hematócrito), aptidão (apto, inapto temporário até uma data ou inapto definitivo), dados da coleta (volume, número da bolsa, reações), tipo sanguíneo, motivo de não doar e observações. |
| RF12 | A equipe consulta o histórico de doações do paciente em outros hemocentros, nas condições da regra de compartilhamento. |
| RF13 | O Admin do hemocentro lista pacientes com registro pendente de ativação e ativa a conta. |
| RF14 | O Admin do hemocentro cadastra e desativa os médicos do seu hemocentro. |
| RF15 | O administrador da plataforma cadastra e desativa hemocentros e cria o Admin inicial de cada um. |
| RF16 | O paciente solicita exclusão dos seus dados (LGPD). |
| RF17 | O Admin do hemocentro cadastra e atualiza o nível de necessidade de cada tipo sanguíneo do seu hemocentro. |
| RF18 | A página Doar exibe as necessidades de cada hemocentro e destaca os que precisam do tipo sanguíneo do paciente, quando conhecido. |
| RF19 | O médico e o Admin do hemocentro consultam o histórico de atendimentos do próprio hemocentro, por período, com o resultado de cada registro. |
| RF20 | O médico lança, uma única vez, os exames da amostra de cada doação (pesquisa de anticorpos e sorologias para HIV, hepatites B e C, sífilis, Chagas, HTLV e, em regiões endêmicas, malária). Com resultado alterado, o paciente só vê no painel que o hemocentro vai contatá-lo de forma reservada. |

### Requisitos Não Funcionais

| Código | Descrição |
|---|---|
| RNF01 | Interface responsiva (mobile e desktop). |
| RNF02 | Proteção de dados pessoais e de saúde conforme a LGPD (Lei nº 13.709/2018). |
| RNF03 | Controle de acesso por perfil/papel em todas as rotas do backend e do frontend. |
| RNF04 | Equipe de hemocentro só acessa dados de pacientes vinculados ao seu hemocentro por agendamento. |
| RNF05 | Log de auditoria de acesso e alteração de dados sensíveis, em especial leitura de histórico de outro hemocentro. |
| RNF06 | Consistência de vagas sob concorrência (transação + lock). |
| RNF07 | Senhas com hash forte (bcrypt/argon2), validação de entrada nos DTOs e segredos só via `.env`. |

### Regras de Negócio

Regras de acesso herdadas da versão anterior e mantidas no código, mais a regra de intervalo entre doações (as referências `RNxx` nos comentários apontam para esta tabela):

| Código | Regra |
|---|---|
| RN06 | Senha com 8 a 128 caracteres, ao menos uma letra maiúscula, uma minúscula e um número; CPF validado pelos dígitos verificadores. |
| RN07 | Cinco tentativas de login inválidas seguidas bloqueiam a conta por 15 minutos. |
| RN14 | A recuperação de senha responde sempre a mesma mensagem, exista ou não a conta. |
| RN20 | Intervalo entre doações de sangue total (Ministério da Saúde): homens a cada 60 dias, até 4 doações em 12 meses; mulheres a cada 90 dias, até 3. Contam as doações efetivas e os agendamentos ativos, nos dois sentidos da data. Sem sexo informado (contas anteriores ao campo), vale a regra mais restritiva (90 dias, 3 doações). |
| RN21 | Inaptidão declarada na triagem: inapto definitivo não agenda mais; inapto temporário só agenda a partir da data informada pelo médico. Ao registrar a inaptidão, os agendamentos futuros que caem nela são cancelados. Quem doou foi considerado apto. |
| RN15 | Contas criadas por terceiros (equipe e administradores) recebem senha provisória válida por 72 horas e precisam trocá-la no primeiro acesso, aceitando o termo de responsabilidade e sigilo. |

## Fluxo Principal

```
Paciente agenda no hemocentro → Médico registra a doação → Admin do hemocentro ativa a conta → histórico compartilhado
```

1. O paciente se cadastra (com consentimento LGPD) e faz login. A conta nasce `PENDENTE`.
2. Em **Doar**, escolhe o hemocentro, o dia e o horário com vaga e agenda.
3. No dia, o **médico** do hemocentro abre a agenda e vê, por horário, os pacientes agendados (com a data e o hemocentro da última doação, se houver).
4. Após o atendimento, o médico **registra a doação**: compareceu ou não, se doou ou não, tipo sanguíneo (ABO + Rh) quando houver, motivo se não doou, observações.
5. O **Admin do hemocentro** vê os pacientes com registro aguardando ativação e **ativa a conta**; o tipo sanguíneo passa a aparecer no Painel do paciente.
6. A doação fica **vinculada ao hemocentro** que a registrou.

## Vagas por Horário

O hemocentro define, para cada horário, **quantos pacientes pode atender**. Exemplo: domingo às 13h, 6 vagas → só 6 pacientes podem agendar; o 7º vê o horário esgotado.

- O Admin do hemocentro cria horários por data/hora com `vagas_total` e pode criar **em lote por dia da semana** (ex.: todo domingo às 13h, 6 vagas, pelas próximas N semanas).
- Vagas restantes = `vagas_total` − agendamentos com status `AGENDADO`. Cancelar libera a vaga.
- **Sem overbooking em concorrência:** o agendamento acontece numa transação com `SELECT … FOR UPDATE` na linha do horário. Pedidos simultâneos esperam uns pelos outros e cada um conta as vagas já confirmadas.
- Não se agenda horário passado, lotado ou inativo, e um paciente não tem dois agendamentos ativos no mesmo horário (índice único parcial no banco).
- As vagas de um horário não podem ser reduzidas abaixo dos agendamentos já feitos. Desativar um horário impede novos agendamentos, mas mantém os existentes.

## Necessidades do Hemocentro

- O Admin do hemocentro define, para cada um dos 8 tipos (A+, A−, B+, B−, AB+, AB−, O+, O−), um **nível de necessidade**: `URGENTE`, `NECESSARIO` ou `ESTAVEL` (sem lotes, quantidades em bolsas ou data de coleta). Tipo sem registro aparece como "não informado".
- Há no máximo um registro por hemocentro e tipo, com `atualizado_em` e `atualizado_por`.
- A leitura é pública (página Doar e Apresentação). A escrita é só do Admin do hemocentro dono.
- Não há notificação automática nem compatibilidade entre tipos.

## Histórico Compartilhado entre Hemocentros

Quando o paciente doa em outro hemocentro, a equipe desse hemocentro pode ver o que foi coletado nos anteriores.

- Cada registro de doação guarda `hemocentro_id`, e a interface sempre mostra **de qual hemocentro veio**.
- A equipe de um hemocentro só consulta o histórico completo (incluindo registros de outros hemocentros) de pacientes que **têm ou tiveram agendamento nesse hemocentro**. Não existe busca livre por paciente.
- Um hemocentro **não edita** registros criados por outro; só lê. Depois de registrada, a doação não é editada.
- Vão para os outros hemocentros: data, resultado, tipo sanguíneo, aferições, volume, reações e aptidão. **A triagem clínica, os exames da amostra e o número da bolsa ficam só no hemocentro que atendeu**, e só o médico desse hemocentro os lê.
- Todo acesso ao histórico de outro hemocentro gera registro em `auditoria`, assim como cada leitura da triagem e dos exames (`VER_DADOS_CLINICOS`).
- O texto de consentimento do cadastro informa claramente esse compartilhamento.

## Conformidade com a LGPD

O sistema trata dados sensíveis de saúde (tipo sanguíneo, triagem clínica, aferições, registros de doação e exames da amostra) e adota as seguintes salvaguardas:

- **Consentimento explícito e versionado** no cadastro (termo 3.0), descrevendo a triagem, as aferições, a coleta e os exames, o compartilhamento do histórico entre hemocentros, o contato reservado em caso de exame alterado e a notificação compulsória às autoridades de saúde (RF01).
- **Sigilo dos dados clínicos:** triagem e exames não saem do hemocentro que atendeu; o Admin do hemocentro não os vê; o paciente vê aferições e aptidão, e de exame alterado só o aviso de contato reservado (RF20).
- **Minimização:** o cadastro não coleta peso nem endereço; só o necessário para agendar, identificar o paciente e aplicar o intervalo entre doações (sexo).
- **Controle de acesso** por perfil e papel, com o hemocentro vindo sempre do vínculo da conta (RNF03, RNF04).
- **Log de auditoria** de leitura do histórico, registro de doação, ativação de conta e exclusão de dados (RNF05).
- **Direito de exclusão** (RF16): o paciente pede a exclusão pelo Painel, confirmando a senha. Nome, CPF, e-mail, telefone e data de nascimento são anonimizados, a conta é encerrada, os agendamentos ativos são cancelados e o consentimento é revogado. Os registros de doação, de triagem e de exames são mantidos sem identificação direta, por obrigação legal de retenção da legislação sanitária (Art. 16 da LGPD).

## Fora do Escopo

Ficaram fora desta versão: consulta online com médico, solicitação e envio de exames, aprovação/reprovação do paciente pelo médico, perfil de representante de hospital, lotes e estoque físico de hemocomponentes, compatibilidade entre tipos sanguíneos, busca por geolocalização e mapa, verificação automática de elegibilidade além do intervalo entre doações (peso, idade, triagem clínica), notificações e relatórios/dashboards de gestão.
