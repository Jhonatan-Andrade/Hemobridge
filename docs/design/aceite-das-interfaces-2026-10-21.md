# Aceite das interfaces e reconciliação com os contratos

Revisão e correções no Figma: 21/10/2026. Encerramento deste registro e conferência dos arquivos: 22/10/2026. Arquivo: [HemoBridge no Figma](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=0-1).

A usuária informou que as telas foram aprovadas pela equipe. Esta revisão preservou os IDs e as conexões existentes e corrigiu lacunas encontradas na comparação com o código. A aprovação informada é das interfaces; ela não comprova execução de operações da API, homologação clínica, acessibilidade completa ou conclusão do código web/Flutter.

## Resultado e rastreabilidade

Foram ajustados 361 IDs distintos e criados 166 IDs de camadas editáveis, incluindo quatro estados de publicação de horário na Web mobile. O registro exato, com os valores anteriores e posteriores dos textos e todos os IDs afetados, está em [aceite-das-interfaces-2026-10-21.json](aceite-das-interfaces-2026-10-21.json). Não houve exclusão de telas existentes nesta revisão.

No encerramento desta rodada, o inventário por nome identificou 521 telas: 148 Web desktop, 170 Web mobile e 203 Aplicativo. A varredura estrutural dos destinos percorridos encontrou 2.924 ações de navegação, nenhum destino ausente e nenhum cruzamento entre versões. A análise das oito transições temporizadas encontradas na leitura final não detectou ciclos automáticos. Os métodos e resultados brutos estão no JSON; esses números descrevem a varredura histórica e não substituem um teste manual de cada caminho no Present. Uma rodada complementar posterior acrescentou estados e atualizou o inventário, conforme [Complementos de 22/10](complementos-prototipo-2026-10-22.md).

A varredura textual final não encontrou termos fictício/fictícios, códigos como HEM54/A01, dados de teste, decisão pendente por grupo/equipe ou a expressão quebrada “nesta .”. Textos legítimos sobre avaliação pela equipe clínica foram preservados. Créditos de imagens com a descrição “ilustrativa” foram preservados como atribuição editorial.

## Critério → evidência → alcance

| Tarefa | Evidência no Figma | Verificação realizada e limite |
| --- | --- | --- |
| HEM-18 · identidade e biblioteca | Button 3:92; Field 3:178; Message 3:187; Consent 3:200; PatientBadge 3:213; NavigationItem 3:220; Card 3:233; Dialog 3:243; LevelBadge 98:3121; DataTable 99:3151; identidade 516:5350 | Biblioteca possui estados de botões e campos, feedback, menus, modais, tabelas, seis situações do paciente e cinco níveis de necessidade. Poppins, Fraunces e os tokens existentes foram reutilizados. Candidata a encerramento do escopo de design com o aceite da equipe informado; não foi refeita uma auditoria de contraste de todas as combinações. |
| HEM-19 · acesso, cadastro, consentimento e perfil | Desktop: 8:1257–8:1571, 8:1584, 8:1979, 8:2205, 8:2318; Web mobile: 660:6034, 660:7330, 660:7279; app: 8:29, 8:751, 8:1090 | Inspecionados estados de acesso e as telas correspondentes. O consentimento de saúde e o termo de sigilo agora usam os textos vigentes 1.1 do servidor; nenhum aceite de “usar dados de teste” permanece. Isso não valida gravação de consentimento, envio de e-mail ou autenticação real. As correções de texto desta revisão devem integrar a evidência de aceite. |
| HEM-20 · gestão e agenda | Cadastros 101:3111, 101:3112, 101:3113; necessidades 101:3114; agenda desktop 101:3115 / 832:9757; publicação mobile listada abaixo | Instituições, representantes, médicos, usuários e necessidades possuem telas e campos. A agenda desktop recebeu calendário e formulário de início/fim/HTTPS. A Web mobile recebeu os quatro estados de publicação com retorno para sua própria agenda. O cadastro/alteração/desativação efetivos, prevenção de sobreposição no servidor e o fluxo de publicação habilitada no desktop precisam de homologação funcional; a presença da tela não comprova CRUD executado. |
| HEM-54 · jornada e orientação clínica | Pré-triagem 8:2437 / 8:1209; locais 8:2473 / 660:7538 / 8:1245; atendimento 154:3704 / 840:10035; exames 154:3753 / 232:5126; compatibilidade 157:3604, 158:3653–158:3959 | Fluxos de consultas, exames, atendimento e compatibilidade estão representados. Locais explica tipo validado, intervalo orientativo e prioridade de necessidade; vazio/carregando/erro foram preservados. Os sinais Rh negativos foram restaurados nos seletores, tabelas e nomes de estado. Não foram inventadas tipagens de pacientes nem próxima data individual; esses valores dependem do servidor. Não equivale a validação médica nem teste de agendamento/cancelamento/exame por API. |
| HEM-55 · indicadores, doação avulsa e relatórios | Hospital 153:3515; administrador 154:3520; doação 154:3653; relatórios 154:3555 / 154:3604; estrutura PDF 154:3804 | Eliminados textos de escopo “aguardando contrato/equipe”. Indicadores refletem campos agregados existentes; barras sem dados foram ocultadas. A coleta avulsa recebeu data e tipo, com aviso de finalidade estatística e responsabilidade da triagem. Relatórios mostram tipos e limites reais por perfil e o cabeçalho previsto na API. A exportação web, os estados de dados/erro e o registro efetivo precisam ser homologados. Não foi encontrado endpoint REST de registro de doação vinculada ao doador; esse fluxo não foi apresentado como concluído. |
| HEM-2 · épico de interfaces | Três conjuntos oficiais, biblioteca e jornadas acima | Pode receber evidências de aceite das subtarefas. Não encerrar automaticamente o épico antes de verificar as subtarefas e distinguir design concluído de integrações pendentes. |

Os intervalos de IDs citados são uma referência de inventário, não uma alegação de que cada camada intermediária foi testada manualmente.

## Agenda: 14 estados de referência

| Versão | Agenda | Publicação |
| --- | --- | --- |
| Web desktop | Próximos 101:3115; Histórico 832:9757 | Calendário/intervalo 887:9704 dentro de 101:3115. Estado inicial; publicação de um período por ação, sem prometer geração em lote. |
| Web mobile | Próximos 660:11338; Histórico 832:9669 | Publicar 890:9760; Preenchido 890:9785; Publicado 890:9809; Conflito 890:9822. |
| Aplicativo | Próximos 226:5074; Histórico 832:9579 | Publicar 840:9742; Preenchido 840:9764; Publicado 840:9786; Conflito 840:9808. |

São seis estados de agenda e oito estados de publicação nas versões móveis. As quatro telas Web mobile foram acrescentadas reutilizando as telas do Aplicativo, sem duplicar navegação inferior de app na Web mobile. Os botões de entrada 890:9846 e 890:9849 foram ligados à publicação Web mobile. Todos os retornos e avanços clonados foram remapeados para a mesma versão.

No servidor, POST /medico/agenda cria **um intervalo**. Exige instituição autorizada, início futuro, fim posterior ao início, duração máxima de quatro horas e link HTTPS. Sobreposição retorna conflito. O calendário é uma representação editável de organização da data; não foi implementado um endpoint de geração em lote nem executada publicação na API nesta revisão.

## Contratos usados na reconciliação

- Cadastro e sigilo: backend/src/lgpd/termo-consentimento.ts, termo-responsabilidade.ts, pacientes/dto/pre-cadastro.dto.ts e auth/dto/primeiro-acesso.dto.ts. Versão de ambos os termos: 1.1.
- Locais: backend/src/hospitais/hospitais.service.ts e common/elegibilidade.ts. Tipagem padrão apenas do paciente aprovado com tipo validado. Ordenação: CRITICO, BAIXO, ESTAVEL, ADEQUADO; depois distância disponível e nome. NAO_INFORMADO não significa estoque suficiente. A data orientativa é condicionada ao histórico, impedimentos e regras do servidor e não substitui triagem.
- Agenda: backend/src/plataforma/plataforma.controller.ts e plataforma.dto.ts; formulário atual em frontend/src/pages/professional.tsx.
- Doação avulsa: backend/src/representante/doacoes.controller.ts, doacoes.service.ts e dto/doacao.dto.ts. Busca de CPF por POST, apenas doador aprovado/ativo, registro avulso com data não futura e tipo. Registro estatístico não modifica automaticamente o nível de estoque.
- Relatórios: backend/src/indicadores/indicadores.controller.ts, dto/periodo.dto.ts, relatorios.service.ts, pdf.ts e indicadores.service.ts. Datas de/ate obrigatórias no PDF; início não futuro, ordem válida e até 366 dias. Representante: doações por tipo e histórico da própria instituição. Administrador: também consolidado por hospital. Sem dados: resposta 422, sem PDF vazio.
- Cabeçalho do relatório: HemoBridge, título, abrangência, período, data/hora de emissão e responsável. Conteúdo agregado; exames e dados clínicos individuais não são incluídos.

## Evidências visuais finais

As imagens são capturas das camadas editáveis depois das correções. O JSON identifica os nós alterados e os estados representados.

- [Calendário e publicação por intervalo](evidencias/aceite-2026-10-21/calendario-agenda.png)
- [Publicação na Web mobile](evidencias/aceite-2026-10-21/publicacao-web-mobile.png)
- [Consentimento de sigilo vigente na Web mobile](evidencias/aceite-2026-10-21/termo-sigilo-web-mobile.png)
- [Locais no Aplicativo](evidencias/aceite-2026-10-21/locais-app.png)
- [Registro de doação avulsa](evidencias/aceite-2026-10-21/registro-doacao-avulsa.png)
- [Relatórios do hospital](evidencias/aceite-2026-10-21/relatorios-hospital.png)
- [Estrutura do PDF](evidencias/aceite-2026-10-21/estrutura-pdf.png)

## Encaminhamento para o Jira

O aceite de telas informado pela usuária pode ser registrado nas tarefas de design. HEM-18 apresenta evidência suficiente de biblioteca. HEM-19, HEM-20, HEM-54 e HEM-55 receberam reconciliação e evidências novas; isso deve ser descrito como revisão complementar ao aceite já informado. Não usar este documento para declarar sucesso de operações de produção ou fechar tarefas de implementação ainda incompletas.

Esta revisão não mudou status, responsáveis, datas ou comentários no Jira. Também não realizou merge, deploy ou alterações em dados operacionais.

No primeiro fechamento documental de 22/10/2026 foram conferidos o JSON de rastreabilidade e os sete PNGs, todos com assinatura válida de arquivo PNG. Nenhuma mutação foi aplicada ao Figma durante essa conferência. Depois dela, foi autorizada e executada uma rodada complementar de design, documentada separadamente em [Complementos de 22/10](complementos-prototipo-2026-10-22.md), com novos IDs, capturas, dados sintéticos e contagem atualizada. As novas adições não foram apresentadas como reaprovadas pela equipe.

