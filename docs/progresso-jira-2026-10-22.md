# Fechamento das pendências de design e documentação

Consolidação de 22/10/2026. Responsável no Jira: Thaiza dos Santos. A aprovação anterior das telas e a revisão do responsável pelo front-end foram informadas pela usuária; os estados complementares de 22/10 estão identificados separadamente. Este registro distingue protótipo, aplicação executada, testes e publicação.

## Estado verificado no Jira

| Tarefa | Estado | Entrega ou próximo passo |
| --- | --- | --- |
| [HEM-18](https://jhonatanjaqstudy.atlassian.net/browse/HEM-18) | Feito | Identidade e biblioteca com componentes, estados e selos |
| [HEM-19](https://jhonatanjaqstudy.atlassian.net/browse/HEM-19) | Feito | Acesso, cadastro, painel e perfil; revisão do front-end confirmada |
| [HEM-20](https://jhonatanjaqstudy.atlassian.net/browse/HEM-20) | Feito | Gestão, bancos e agenda; entrada Web mobile e publicação por intervalo reconciliadas |
| [HEM-54](https://jhonatanjaqstudy.atlassian.net/browse/HEM-54) | Feito | Jornada clínica, compatibilidade e estados preenchidos de locais recomendados |
| [HEM-55](https://jhonatanjaqstudy.atlassian.net/browse/HEM-55) | Feito | Indicadores preenchidos nas três versões, relatórios e estrutura do PDF |
| [HEM-2](https://jhonatanjaqstudy.atlassian.net/browse/HEM-2) | Fazendo | Conferência conjunta dos estados complementares antes de encerrar o épico |
| [HEM-57](https://jhonatanjaqstudy.atlassian.net/browse/HEM-57) | Fazendo | Registros PT01–PT23, execução técnica e medição atual preparados; completar roteiros parciais e validação dos resultados |
| [HEM-58](https://jhonatanjaqstudy.atlassian.net/browse/HEM-58) | Fazendo | Incorporar e conferir capítulos 10–12 na base editável localizada; Quadro42, figuras, referências e limites precisam corresponder às evidências |
| [HEM-59](https://jhonatanjaqstudy.atlassian.net/browse/HEM-59) | Fazendo | Manual, dez slides e roteiro preparados; falta ensaio coletivo e cadeia completa da versão de entrega |
| [HEM-79](https://jhonatanjaqstudy.atlassian.net/browse/HEM-79) | Fazendo | Defeito de reserva concorrente corrigido e retestado; código em revisão, sem merge/publicação |

Os prazos originais não foram alterados para esconder atrasos. “Feito” nas cinco primeiras linhas é fechamento de **prototipagem**, sem declarar concluída uma operação de produção.

## Evidências da rodada

- [Revisão inicial das interfaces](design/aceite-das-interfaces-2026-10-21.md) e [estados complementares de 22/10](design/complementos-prototipo-2026-10-22.md): 534 telas de estado no inventário, correspondentes às jornadas e versões do projeto, com rastreio por ID. Não são 534 requisitos distintos. A inspeção estrutural não substitui execução manual de todos os caminhos.
- [Conferência web](testes/responsividade-web-2026-10-21.md): 47 combinações de página/largura, cinco cenários de conta, dimensões 360/768/1440 px, sem rolagem lateral observada.
- [Casos formais e planilha editável](testes/execucao-pt01-pt23-2026-10-21.md), [correção e cinco novos contratos](testes/complemento-pt04-pt09-pt11-pt16-pt18-2026-10-22.md), [desempenho atual](testes/desempenho-pt20-2026-10-22.md). Nenhum aceite humano foi preenchido automaticamente.
- [CI do código corrigido em 22/10](https://github.com/Jhonatan-Andrade/Hemobridge/actions/runs/39755613944): API com 226 unitários e 83 integrados; web com 35 testes; análise/testes Flutter e compilação de APK aprovados. A execução está associada ao head `f8f1f457`, com checkout de merge candidato.
- [Manual por perfil](manual/README.md), [slides editáveis](apresentacao/hemobridge-apresentacao.pptx), [roteiro de ensaio](roteiro-apresentacao.md) e [texto das seções finais](tcc/secoes-10-11-12-2026-10-21.md).

## Base editável do TCC localizada

A busca encontrou `C:\Users\email\Downloads\Hemobridge - Projeto Lógico - Revisão Mínima Final.docx`, SHA-256 `61F0CCDC3F2374E7E3392F9DCD9C35933B46665D73190591F531F591BB6E6207`. Seu conteúdo corresponde fortemente ao PDF parcial de referência, com capítulos 10, 11 e 12 e Quadros41/42. É a base de setembro, com resultados ainda planejados, não uma versão final de outubro já atualizada.

O outro arquivo `Hemobridge - TCC.docx` é um rascunho anterior com seções finais vazias. Não foi escolhido como base. O original e os arquivos sincronizados de `sources/` permanecem preservados. A revisão em cópia de trabalho deve registrar fonte, alterações e limites antes de a equipe adotar uma versão final única.

## Ordem de conclusão

1. Conferir os estados complementares no Figma e completar o fechamento do épico de design.
2. Usar os roteiros da planilha para completar os cenários ainda parciais e validar os registros. Registrar defeitos reais e sua reexecução; não transformar mera ausência de evidência em Bug.
3. Quando o Android estiver conectado, instalar o APK corrigido e repetir os fluxos físicos pendentes do [registro Android](homologacao-android-2026-10-19.md), com autorização pontual para permissões sensíveis quando necessária.
4. Conferir a revisão do TCC e incorporar somente resultados observados, com numeração, legenda e fonte das figuras e normas adotadas pela UTP.
5. Realizar e medir o ensaio coletivo. O roteiro explicita interfaces web ainda ausentes para administração completa, registro de doação e indicadores/relatórios; serviços e protótipos não substituem esses destinos executáveis.
6. Jhonatan revisa e realiza o merge do [PR3](https://github.com/Jhonatan-Andrade/Hemobridge/pull/3). Os conflitos com a main foram reconciliados; nenhuma automação de merge ou implantação foi ativada.

AWS, domínio/HTTPS, assinatura/lojas, iOS e migração da VM são etapas de publicação real. Não foram acrescentadas como exigências inexistentes para concluir prototipagem ou PT20.
