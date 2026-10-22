# Correções da auditoria técnica

Revisão de 18/10/2026, sobre a base integrada do HemoBridge. O commit exato da entrega consta no manifesto do ZIP e no pull request. Esta revisão corrige os achados de código e reconcilia as evidências; não declara implantação AWS ou aceite acadêmico concluídos.

| Achado | Correção implementada | Verificação |
|---|---|---|
| A01 — Links abriam a página inicial | Recuperação usa `/#reset?token=…`; caminhos antigos continuam aceitos. E-mails de avisos abrem Notificações para todos os perfis, com retorno ao destino após login | Testes da rota e do token; conferência da tela no navegador |
| A02 — Duplicidade/perda de avisos | Evento persistido na transação do estoque; processamento com lock de evento e de instituição; RN20 atômica. Reserva por token e prazo coordena e-mails; fila inclui mensagens nunca tentadas | Duas instâncias concorrentes; falha após commit; reserva expirada e recuperação de tentativa zero |
| A03 — Encerramento sem atendimento | Área administrativa de privacidade com decisão fundamentada e confirmação; encerramento transacional, revogação, cancelamento, retirada de conteúdo e retenção cifrada quando necessária. Trigger impede reativação de conta encerrada | Autorização, protocolo único, repetição, conta sem histórico e preservação cifrada de vínculo clínico |
| A04 — Tour somente local | Flag booleana versionada no PostgreSQL por conta; Web e Flutter aguardam confirmação da API. Falha mantém o bloqueio. Tab/Shift+Tab, Escape e clique externo tratados | Teste entre sessões/contas, idempotência e falhas; navegador a 360 px; widgets Flutter |
| A05 — Origem da publicação perdida | Origem Início/Comunidade preservada no histórico, com posição de rolagem e foco do botão. Login a partir do post volta ao mesmo contexto | Testes do contexto e conferência dos dois retornos no navegador |
| A06 — Dados de saúde no e-mail | Assunto e corpo genéricos; detalhes de necessidade, tipo sanguíneo, exame e mensagens permanecem autenticados | Asserção de ausência desses dados na mensagem enviada |
| A07 — Desativação deixava consultas | Cancelamentos e notificações gravados na mesma transação. Médico com vários hospitais perde somente o vínculo desativado; agenda valida vínculos explícitos | Desativação de paciente, instituição e vínculo médico; outro hospital permanece disponível |
| A08 — Pacote antigo | Empacotador gera ZIP do commit limpo, com código Web/API/Flutter, SQL e guia; recusa arquivos operacionais e marcadores de credenciais | Manifesto de arquivos, commit, tamanho e SHA-256 junto ao ZIP |
| A09 — Evidência/documentos desatualizados | Documentação de tour, cookies, privacidade e implantação reconciliada; adendo técnico e matriz dos 23 casos; progresso registrado para revisão | Evidências automatizadas separadas do aceite acadêmico, de homologação física e do merge |

## Resultado da execução local

- API: **216 testes unitários e 67 de integração aprovados**, incluindo nove cenários novos de regressão. Compilação e lint sem erros.
- Web: **24 testes aprovados**, com compilação, lint e convenção de nomes. Conferência de navegação, foco e largura nas resoluções solicitadas.
- Flutter: **22 testes aprovados** e análise sem problemas; GPS controlado nos testes, sem consultar a posição real do notebook.
- Banco: **12 migrações** versionadas, aplicadas em PostgreSQL/PostGIS descartável. SQL consolidado atualizado para instalação em banco vazio.
- Figma: tours reconciliados em quatro etapas por perfil e plataforma; fluxo web de atendimento de privacidade com estados de análise, resposta e erro. Autenticação e persistência reais pertencem ao código, não ao Present.

Os relatórios brutos e capturas locais ficam separados do pacote de código. Erros deliberados de SMTP, armazenamento e interrupção após commit aparecem nos logs dos cenários negativos; não representam falha da bateria quando a asserção de recuperação passa.

## Limites e requisitos de liberação

Jhonatan mantém a responsabilidade pela revisão e pelo merge. A execução dos testes locais não aprova por si só o pull request. Os resultados remotos da integração contínua devem ser conferidos na revisão publicada.

SMTP não garante entrega exatamente uma vez quando o provedor aceita a mensagem e a tarefa cai antes de gravar a confirmação. A reserva impede processamento simultâneo, e tentativas repetidas podem gerar uma cópia nesse caso. Alertas sobre eventos antigos, tentativas esgotadas e falhas de entrega devem ser configurados na operação.

Encerramento com retenção exige política aprovada, procedimento de revisão, gestão das chaves e restauração de ensaio. A solução utiliza pseudonimização e cifra; não apaga automaticamente prontuários, backups ou auditoria. Consulte [a política técnica de encerramento](encerramento-e-retencao.md).

Continuam necessários: homologação GPS em Android/iOS físicos, paridade das operações nativas descritas no README do app, carga concorrente representativa na AWS, restauração e monitoramento, identificação jurídica/canal operacional e aceite formal dos casos acadêmicos. Consulte [rastreabilidade](rastreabilidade-de-testes.md), [adendo do TCC](adendo-tecnico-tcc.md) e [plano AWS](../infra/aws/README.md).

## Escopo de dados da entrega

O ZIP é produzido exclusivamente a partir dos arquivos versionados do commit, sem histórico Git nem arquivos locais não versionados. A chave SSH recebida, `.env` operacional, estado da VM, dumps e objetos clínicos não fazem parte desse processo. Os exemplos de configuração e fixtures contêm somente valores de desenvolvimento/teste. A verificação de nomes e marcadores conhecida é registrada no manifesto; ela não é uma certificação da máquina virtual nem de arquivos externos ao pacote.
