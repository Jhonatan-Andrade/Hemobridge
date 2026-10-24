# Verificação local do alinhamento aos requisitos — 24/10/2026

**Resultado da rodada: verificações automatizadas e ensaios web descritos abaixo aprovados no ambiente local de teste.** O registro delimita cada execução e não atribui aceite humano integral aos 23 casos formais.

O trabalho ocorre na branch local `fix/alinhamento-requisitos-2026-10-23`, a partir de `d276a6e223457ec791902b08866c12e8b1f096d1`, com alterações locais ainda em revisão. A referência é o PDF original `docs/2026-2_Parcial_HemoBridge_01.pdf`, preexistente na main e preservado, conforme [proveniência e contratos](../alinhamento-com-requisitos-originais.md).

## Escopo da rodada

| Frente | Implementação ou asserção a verificar |
| --- | --- |
| Pré-triagem / UC09 / RF28 | Questionário versionado persistido antes do horário, titularidade, validade, uso no agendamento e aviso orientativo de intervalo sem impedir avaliação médica. |
| Novo ciclo / RN10 | Reprovado pode iniciar nova consulta; respostas e exames de ciclos anteriores não alteram a nova decisão. |
| Atendimento / UC14 / RF29 | Observações, decisão com motivo, ausência, cancelamento médico antes do início, transições e notificações. |
| Doação vinculada / UC20–UC21 / PT13 | Conta institucional, paciente aprovado, peso/data/tipagem, elegibilidade, concorrência e trilha; necessidade qualitativa permanece declarativa. Confirmação externa de doação anterior aos 60 anos fica persistida quando fornecida. |
| Recomendação / UC17 / PT18 | Autenticação e aprovação; compatibilidade doador→receptor; níveis crítico/baixo/estável; ordem necessidade→próprio tipo→cidade→estado→distância. |
| Notificações / RF30 | Caixa, leitura individual, marcar todas e destinos internos autorizados com retorno coerente no perfil. |
| Preservação | Treze migrações anteriores intactas; três aditivas, totalizando 16. Nenhum preenchimento retroativo de resposta clínica ou confirmação de doação. |
| Regressão | API, web e Flutter, incluindo testes de contratos e estados negativos pertinentes às alterações. |

## Resultados de 24/10

| Verificação | Resultado conferido | Evidência e alcance |
| --- | --- | --- |
| Unitários da API | **292/292**, 35 arquivos | `backend-unitarios.log`, início às 15:55:38 e duração de 26,97 s. |
| Integração da API | **100/100**, 15 arquivos | `backend-integracao.log`, início às 15:58:52 e duração de 40 s; PostgreSQL/PostGIS novo e exclusivo, com as 16 migrações. |
| Lint, tipos e compilação da API | Aprovados | Lint sem erros, TypeScript sem emissão e compilação NestJS concluídos com sucesso. |
| Testes web | **38/38** | `frontend-testes.log`; testes de lógica/contratos da interface, distintos da navegação em navegador descrita abaixo. |
| Lint, nomenclatura e compilação web | Aprovados | Lint e verificação de nomenclatura sem erros; compilação concluída com sucesso. |
| Testes Flutter | **94/94** | `flutter-testes.log`; testes automatizados do app, sem inferir execução em aparelho nesta rodada. |
| Análise Flutter | Aprovada, sem problemas apontados | `flutter-analyze-final.log`, resultado `No issues found`. |
| Compilação Android | APK de depuração gerado com sucesso | `flutter-apk.log`, `assembleDebug` concluído em 801,5 s; arquivo `app/build/app/outputs/flutter-apk/app-debug.apk` gerado às 16:22:50, com 179.730.222 bytes. Não instalado em aparelho nesta rodada. |
| Preservação do histórico | Confirmada no diff local | As 13 migrações anteriores e o PDF original não foram alterados; as três novas migrações são aditivas. |
| SQL consolidado | Aprovado em banco vazio exclusivo | `database/schema.sql` executado integralmente com `ON_ERROR_STOP=1`, até COMMIT, em `hemobridge_schema_20261024_validation`; log `sql-consolidado.log`. Não executado em banco existente. |
| Desempenho HTTP | Critério RNF08 atendido nos seis cenários | [Medição de 24/10](desempenho-uc17-2026-10-24.md), 1.200 requisições; UC17 p95 de 52,8 ms. |

Os logs desta tabela estão na pasta local `work/alinhamento-requisitos-2026-10-24/`. As contagens pertencem às execuções de 24/10, não aos resultados históricos de 23/10 ou da CI de 19/10. Os ajustes finais de foco da pré-triagem e do próximo passo do doador aprovado foram conferidos separadamente na interface; não se atribui à bateria anterior uma asserção visual que ela não executa.

A compilação Android instalou os componentes oficiais ausentes do SDK 35, cujas licenças já estavam aceitas no ambiente. Avisos de compatibilidade de XML do SDK, nível Java 8 e uso de API depreciada pelo `geolocator_android` não impediram o resultado. O APK usa configuração de depuração e não equivale a um pacote assinado de distribuição. O cache Kotlin gerado foi excluído do versionamento por `app/android/.gitignore`.

S3 e Mailpit locais reais foram usados nos casos de integração pertinentes. Simulações específicas de falha foram mantidas nos cenários que verificam indisponibilidade e reprocessamento; isso não transforma um erro esperado de teste em incidente operacional. As contas e dados pertencem ao ambiente exclusivo, sem aplicação de migrações ou carga na VM e no banco do notebook.

## Navegação observada no navegador

Foram usados cinco acessos de teste: Paciente/Doador, doador aprovado, Médico, Representante de Hospital e Administrador. O login e a conclusão da apresentação inicial ocorreram sem o erro anterior. Essa observação confirma esses passos das cinco contas; não representa execução de todos os recursos de cada perfil.

| Tela/fluxo observado | Largura e resultado | Evidência |
| --- | --- | --- |
| Escolha de horário do paciente | 360 px; sem rolagem lateral observada | [Horários](evidencias-alinhamento-2026-10-24/horarios-360.jpg) |
| Locais recomendados | 360 e 1440 px; sem rolagem lateral observada | [360 px](evidencias-alinhamento-2026-10-24/recomendacoes-360.jpg), [1440 px](evidencias-alinhamento-2026-10-24/recomendacoes-1440.jpg) |
| Atendimento médico | 360 px; sem rolagem lateral observada | [Atendimento](evidencias-alinhamento-2026-10-24/atendimento-360.jpg) |
| Registro de doação institucional | 360 e 1440 px; sem rolagem lateral observada | [360 px](evidencias-alinhamento-2026-10-24/doacoes-360.jpg), [1440 px](evidencias-alinhamento-2026-10-24/doacoes-1440.jpg) |
| Área administrativa | 1440 px; sem rolagem lateral observada | [Administrador](evidencias-alinhamento-2026-10-24/administrador-1440.jpg) |

Na caixa de notificações, abrir um aviso crítico direcionou para Locais, marcou o aviso como lido e deixou zero não lidas no cenário. Voltar retornou à caixa de notificações. Na pré-triagem, o foco passou para o título da etapa após a correção e foi observado no navegador. Esses ensaios não comprovam todos os estados de acessibilidade, resolução, formulário ou dado extenso do PT23.

## Resultados históricos conferidos de 23/10

| Conjunto | Resultado registrado | Fonte local |
| --- | --- | --- |
| Unitários da API | 267/267, 32 arquivos | `work/alinhamento-requisitos-2026-10-23/backend-unitarios.log` |
| Integração da API | 100/100, 15 arquivos | `work/alinhamento-requisitos-2026-10-23/backend-integracao-final.log` |
| Testes web | 37/37 | `work/alinhamento-requisitos-2026-10-23/frontend-testes.log` |
| Desempenho HTTP | 1.200 requisições, 100% abaixo de três segundos; UC17 p95 de 59,8 ms | [Relatório de desempenho de 23/10](desempenho-uc17-2026-10-23.md) |

Essas execuções antecedem os ajustes finais. O benchmark pertence à versão com 15 migrações. Não foram transpostas para a coluna de aprovação de 24/10.

## Limites e governança

Os ensaios usam serviços locais exclusivos e descartáveis. Não há autorização nesta rodada para alterar a VM, o banco do notebook, Jira, Google Docs, GitHub ou ambientes AWS. Nenhum push, merge, publicação ou aceite humano é atribuído por este registro; Jhonatan continua responsável pelo merge.

A aprovação das telas pela equipe é evidência de revisão do design e permanece separada da aceitação dos 23 casos formais. Testes automatizados, compilação do APK e ensaio físico são evidências distintas. GPS, seletor nativo de arquivos, permissões e os fluxos Android/iOS em aparelhos reais dependem de homologação própria; não são inferidos de testes de widgets ou de API.

A revisão de PT13/PT18 corrige o alcance das evidências anteriores: a preparação direta de vínculo não comprovava o registro HTTP de doação; o filtro público por tipo exato não comprovava UC17. Os registros históricos permanecem preservados com esse esclarecimento em [rastreabilidade](../rastreabilidade-de-testes.md).
