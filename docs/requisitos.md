# Sistema de Gestão de Doação de Sangue

Sistema web para conectar doadores, médicos, bancos de sangue (hospitais) e administradores, facilitando o pré-cadastro de doadores, a validação médica, o agendamento de consultas, a gestão de estoque de hemocomponentes e a busca por locais com necessidade de doação — em conformidade com a LGPD.

## Sumário

- [Visão Geral](#visão-geral)
- [Perfis de Usuário](#perfis-de-usuário)
- [Funcionalidades](#funcionalidades)
  - [Requisitos Funcionais](#requisitos-funcionais)
  - [Requisitos Não Funcionais](#requisitos-não-funcionais)
- [Fluxo Principal](#fluxo-principal)
- [Conformidade com a LGPD](#conformidade-com-a-lgpd)

## Visão Geral

O sistema tem como objetivo digitalizar e organizar o processo de doação de sangue, desde o pré-cadastro do paciente/doador até a validação médica de sua elegibilidade, passando pela gestão de estoque dos bancos de sangue e a notificação de doadores compatíveis quando há necessidade.

## Perfis de Usuário

| Perfil | Descrição |
|---|---|
| **Paciente / Doador** | Realiza pré-cadastro, agenda consultas, anexa exames e, após aprovação médica, passa a atuar como doador. |
| **Médico** | Gerencia sua agenda, realiza consultas, solicita exames, registra o tipo sanguíneo e aprova ou reprova o cadastro do paciente como doador. |
| **Representante de Banco de Sangue (Hospital)** | Cadastra e atualiza necessidades de estoque por tipo sanguíneo e acompanha relatórios do próprio hospital. |
| **Administrador** | Gerencia usuários, instituições, aprova cadastros de médicos e representantes, e visualiza dados agregados de todos os hospitais. |

## Funcionalidades

### Requisitos Funcionais

| Código | Descrição |
|---|---|
| RF01 | Pré-cadastro do paciente com dados básicos, incluindo idade e peso. |
| RF02 | Coleta de consentimento do paciente para tratamento de dados sensíveis de saúde (LGPD) no pré-cadastro. |
| RF03 | Cadastro e gerenciamento de horários de disponibilidade do médico para consultas. |
| RF04 | Agendamento de consulta online pelo paciente, conforme disponibilidade do médico. |
| RF05 | Cancelamento ou reagendamento de consulta previamente marcada. |
| RF06 | Solicitação de exames pelo médico, durante ou após a consulta. |
| RF07 | Anexo do resultado do exame pelo paciente para envio ao médico. |
| RF08 | Revisão do exame e registro do tipo sanguíneo do paciente pelo médico. |
| RF09 | Aprovação do cadastro do paciente pelo médico, ativando a conta como doador. |
| RF10 | Reprovação do cadastro pelo médico, com motivo informado e possibilidade de reenvio de exame. |
| RF11 | Restrição de acesso às funcionalidades completas a contas de paciente aprovadas. |
| RF12 | Exibição do tipo sanguíneo registrado ao doador (não editável por ele). |
| RF13 | Cadastro de médicos mediante aprovação do administrador e validação do CRM. |
| RF14 | Autenticação obrigatória via credenciais, com controle de acesso por perfil. |
| RF15 | Cadastro, edição e desativação de bancos de sangue (hospitais). |
| RF16 | Cadastro de representantes de banco de sangue, mediante aprovação do administrador. |
| RF17 | Cadastro e atualização da necessidade de estoque por tipo sanguíneo, por representante. |
| RF18 | Registro da data de coleta de cada lote de hemocomponente em estoque. |
| RF19 | Informação sobre compatibilidade entre tipos sanguíneos. |
| RF20 | Consulta a bancos de sangue e suas respectivas necessidades. |
| RF21 | Busca e filtragem por localização e tipo sanguíneo. |
| RF22 | Armazenamento da localização geográfica dos bancos de sangue. |
| RF23 | Apresentação ao doador dos locais com necessidade de seu tipo sanguíneo ou compatíveis. |
| RF24 | Verificação de elegibilidade do doador (idade, peso, intervalo mínimo) antes de nova doação. |
| RF25 | Notificação ao doador quando surgir necessidade compatível com seu tipo sanguíneo. |
| RF26 | Emissão de relatórios e dashboards com métricas de doações, estoque e necessidades, restritos ao hospital do usuário (exceto administrador, com visão agregada). |
| RF27 | Gerenciamento de usuários e instituições cadastradas pelo administrador. |

### Requisitos Não Funcionais

| Código | Descrição |
|---|---|
| RNF01 | Interface responsiva, adaptável a dispositivos móveis e desktop. |
| RNF02 | Proteção de dados pessoais e de saúde em conformidade com a LGPD (Lei nº 13.709/2018). |
| RNF03 | Controle de acesso de acordo com o perfil do usuário. |
| RNF04 | Isolamento lógico dos dados entre hospitais, via `hospital_id` em todas as consultas relevantes. |
| RNF05 | Log de auditoria de acessos a dados sensíveis de saúde (usuário, data/hora, tipo de acesso). |
| RNF06 | Solicitação de exclusão de dados pessoais pelo paciente, ressalvadas obrigações legais de retenção (Art. 16 da LGPD). |

## Fluxo Principal

1. **Pré-cadastro:** o paciente se cadastra informando dados básicos (idade, peso) e consente com o tratamento de dados sensíveis.
2. **Consulta:** o paciente agenda uma consulta com um médico disponível.
3. **Solicitação de exame:** o médico solicita exames durante ou após a consulta.
4. **Envio de exame:** o paciente anexa o resultado do exame.
5. **Validação médica:** o médico revisa o exame, registra o tipo sanguíneo e aprova (ou reprova, com justificativa) o cadastro como doador.
6. **Doação:** o doador aprovado pode consultar bancos de sangue com necessidade compatível com seu tipo sanguíneo, verificar sua elegibilidade e agendar/registrar uma doação.
7. **Gestão de estoque:** representantes de bancos de sangue mantêm atualizadas as necessidades de estoque por tipo sanguíneo.
8. **Notificações:** doadores são notificados quando surgem necessidades compatíveis com seu tipo sanguíneo.
9. **Relatórios:** hospitais acompanham métricas próprias; o administrador acompanha dados agregados de toda a rede.

## Conformidade com a LGPD

O sistema trata dados sensíveis de saúde (tipo sanguíneo, exames) e, portanto, adota as seguintes salvaguardas:

- Coleta de **consentimento explícito** no momento do pré-cadastro (RF02).
- **Controle de acesso** por perfil de usuário (RNF03).
- **Isolamento lógico** dos dados entre hospitais (RNF04).
- **Log de auditoria** para todo acesso a dados sensíveis de saúde (RNF05).
- **Direito de exclusão** dos dados pessoais, respeitadas as obrigações legais de retenção sanitária (RNF06, Art. 16 da LGPD).
