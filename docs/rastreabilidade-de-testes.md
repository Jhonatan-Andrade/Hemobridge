# Rastreabilidade dos casos formais de teste

Revisão de 18/10/2026. Esta matriz relaciona os 23 casos do documento acadêmico com a evidência executável disponível. **Não atribui aceite formal a casos sem roteiro, resultado observado, data, executor e aprovação registrados.** O PDF original permanece como referência histórica; o estado atual deve ser consolidado no texto final a partir desta matriz e do adendo técnico.

| Caso | Assunto | Evidência disponível e limite |
|---|---|---|
| PT01 | Pré-cadastro | Integração de pacientes e contratos de produção; repetir o roteiro completo com cadastro na homologação |
| PT02 | Unicidade de CPF/e-mail | Testes de serviço e restrições únicas PostgreSQL |
| PT03 | Pré-triagem e intervalo | Integração e regras de elegibilidade; resultado é orientativo |
| PT04 | Concorrência no agendamento | Integração de consultas e restrições de horário; regressão de conta/instituição inativa |
| PT05 | Cancelar/reagendar | Integração de consultas, antecedência e liberação do horário; cancelamento institucional é um fluxo distinto |
| PT06 | Ausência ao atendimento | Jornada de integração confirma retorno a Pré-cadastrado e novo agendamento; conferir comunicação no aceite formal |
| PT07 | Arquivos válidos/5 MB | Testes de assinatura, limite, cifra e integração S3 local |
| PT08 | Reprovação e reenvio de exame | Jornada via API reprova com motivo, aceita novo envio, preserva histórico e valida a nova versão |
| PT09 | Paciente não altera tipo sanguíneo | Validação de contrato, autorização e integridade do cadastro |
| PT10 | Aprovação exige tipagem | Jornada exige tipagem conferida, todos os pedidos resolvidos e concordância dos resultados; decisão do médico autorizado |
| PT11 | Nível de necessidade e histórico | Integração de necessidade e trigger de histórico |
| PT12 | Alerta crítico/RN20 | Integração de compatibilidade e regressão concorrente com duas instâncias; recuperação de evento após falha |
| PT13 | Doação vinculada | Integração de doação, situação e tipagem coerentes |
| PT14 | Doação avulsa | Integração de registro institucional e restrições de doação |
| PT15 | Intervalos 60/90 dias | Regras de elegibilidade e restrições PostgreSQL; não substituem triagem individual |
| PT16 | Isolamento institucional | Testes de autorização; regressão de médico com dois hospitais preserva o vínculo restante |
| PT17 | Restrição de exames | Integração bloqueia dados alheios, administrador, representante e médico sem vínculo atual, inclusive após revogação parcial |
| PT18 | Ordenação de locais | Integração de recomendação/consulta; disponibilidade real exige conferência da instituição |
| PT19 | Encerramento | Nova regressão cobre protocolo único, decisão autorizada, revogação, dados sem histórico, cifra e retenção; operação de backups/chaves ainda exige homologação |
| PT20 | Desempenho | Medição histórica local existe; falta carga concorrente representativa no ambiente AWS e registro formal atualizado |
| PT21 | Bloqueio de login | Testes de cinco tentativas e janela de quinze minutos |
| PT22 | Recuperação de senha | Testes de token, expiração, uso único e revogação; regressão de rota corrige o link enviado por e-mail |
| PT23 | Responsividade | Medições web de 360/1440 px e conferência intermediária; widgets Flutter em 360 px com texto ampliado. Android/iOS físicos e aceite formal permanecem pendentes |

## Como registrar o aceite

Adendo de 19/10/2026: os formulários Flutter, a agenda paginada e o encerramento de sessão possuem evidências adicionais em [homologação dos fluxos nativos](homologacao-fluxos-nativos.md). São 71 testes de serviço/widget Flutter, 35 web, 219 unitários da API e 78 de integração. A compilação Android e os ensaios em aparelhos físicos continuam pendentes; estes números não encerram os casos formais.

Para cada caso, anexar o roteiro e suas pré-condições, ambiente/commit, entrada sem dados reais, resultado esperado e observado, evidência de execução e responsável pelo aceite. Quando falhar, registrar o defeito e a nova execução após a correção. As quantidades de testes automatizados não correspondem uma a uma aos casos formais: um caso pode depender de vários testes e de homologação física.

As tarefas de prototipagem e testes permanecem aguardando revisão/aceite no Jira. Merge é responsabilidade do Jhonatan. A aprovação do pull request, a homologação operacional e a aprovação acadêmica são registros separados.
