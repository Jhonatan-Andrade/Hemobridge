# Homologação da jornada clínica

Fase executada em 18/10/2026, após a correção da conclusão do tour. O escopo é a jornada web/API e o isolamento institucional. A execução usou PostgreSQL/PostGIS, S3 local e dados sintéticos.

## Funcionalidades concluídas

- O médico avalia resultados pela tela Exames: valida com tipagem conferida ou reprova com orientação para novo envio. A decisão exige confirmação explícita e fica restrita ao profissional responsável com vínculo ativo.
- Cada resultado validado registra tipagem, autoria e data. O cadastro só passa a aprovado quando todos os últimos resultados das solicitações vigentes estiverem validados e as tipagens forem coerentes. Um resultado antigo reprovado não bloqueia um reenvio válido.
- Avaliações e uploads concorrentes usam trava por paciente. A tentativa excedente recebe conflito, sem duplicar decisão ou resultado em análise.
- A remoção de um vínculo bloqueia agenda, atendimento, listagem e download dos exames daquela unidade, mesmo quando o médico continua ativo em outro hospital.
- Ausência registrada libera o paciente para novo agendamento quando não há outra consulta agendada.
- Após expiração da sessão ou troca de perfil, o login retorna à área autorizada da nova conta. O retorno a comentários e notificações continua preservado.

## Evidências automatizadas

| Verificação | Resultado |
|---|---|
| API unitária | 219 aprovados |
| Integração da API | 77 casos distintos aprovados |
| Web | 29 aprovados |
| Compilação e lint | API e Web aprovados; nomes do frontend conferidos |
| Persistência | 13 migrações; SQL consolidado regenerado |
| Carga de testes | Executada em banco descartável com arquivos sintéticos no S3 local |

Os 77 casos correspondem à bateria de 75 casos sem os dois testes de disponibilidade, acrescida desses dois casos. A jornada de sete casos foi repetida após acrescentar download e igualdade dos bytes; a repetição não foi somada como cobertura adicional. Consulte a [evidência estruturada](evidencias/homologacao-clinica-2026-10-18.json).

A jornada nova cobre publicação de horário, reserva, atendimento, pedido de exame, envio, download pelo paciente e pelo médico, avaliação, situação no painel, auditoria e notificação. Inclui reprovação/reenvio, pendência de outro pedido, divergência de tipagem, ausência, concorrência e acesso indevido. Somente o relógio de uma disponibilidade foi antecipado no banco descartável para testar o atendimento sem aguardar dois dias.

## Conferência no navegador

Na instalação de testes do notebook, o paciente reservou um horário e o painel passou a Consulta agendada. O cancelamento com mais de 24 horas foi confirmado e o painel voltou a Pré-cadastrado. O médico abriu a avaliação; a confirmação ficou bloqueada até informar decisão, tipo e confirmação explícita. Uma avaliação de resultado sintético foi gravada e permaneceu validada após recarregar.

A tela foi medida em 1440 px e 360 px, sem rolagem horizontal. A largura do documento foi, respectivamente, 1425 px e 345 px, descontada a barra de rolagem. As capturas locais estão separadas do pacote de código.

A migração foi aplicada no banco local de testes após conferir nome, host e porta, sem executar novamente a carga nesse banco e sem apagar registros. A bateria automatizada usou outro banco descartável. Segredos, banco em execução e arquivos de exames não entram no pacote de código.

## Continuidade e limites

O Flutter mantém a leitura de exames. Avaliação nativa, cadastro, edição completa de perfil, agendamento/reagendamento e envio nativo de arquivos continuam pendentes. Esta rodada não declara paridade completa do app nem reconciliação das novas ações no Figma.

Jhonatan mantém a revisão e o merge. A próxima etapa é completar os formulários nativos e o roteiro formal de aceite; depois preparar homologação AWS, restauração, carga e monitoramento. GPS em Android/iOS físicos, identidade jurídica e canais operacionais reais continuam necessários antes da publicação.
