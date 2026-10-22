# Revisão para conferência do TCC

Data: 22/10/2026. Arquivo de trabalho: [hemobridge-tcc-atualizado.docx](hemobridge-tcc-atualizado.docx).

SHA-256 desta cópia conferida: `4FA028B36E082CD02D48D3DA9AE1AA8A84E8408CE1B85A3208E91C289E4618A0`.

Esta é uma cópia completa do TCC com as seções 10, 11 e 12 atualizadas e esclarecimentos factuais correlatos. Não foi declarada aprovação acadêmica, conferência integral das normas UTP ou conclusão da homologação. O arquivo original não foi substituído. A pessoa responsável pelo trabalho deve conferir esta cópia antes de adotá-la como versão acadêmica única.

## Fonte preservada

- Caminho de origem no notebook: `C:\Users\email\Downloads\Hemobridge - Projeto Lógico - Revisão Mínima Final.docx`.
- SHA-256 da origem, verificado antes e depois da edição: `61F0CCDC3F2374E7E3392F9DCD9C35933B46665D73190591F531F591BB6E6207`.
- O arquivo `Hemobridge - TCC.docx` encontrado em Downloads era uma versão anterior incompleta e não foi usado como base.
- O PDF `docs/2026-2_Parcial_HemoBridge_01.pdf` permanece referência histórica e não foi alterado.

## Atualizações realizadas

| Trecho | Atualização |
| --- | --- |
| Seção 10 | Estado da implementação por perfil e plataforma, identidade visual, navegação desktop/Web mobile/app, tour, IBGE/GPS e limites das interfaces executáveis. |
| Quadro 41 | Aplicação observada dos critérios de consistência, responsividade, acessibilidade, privacidade, estados, necessidade/estoque e pré-triagem, com limites explícitos. |
| Figuras 19 a 22 | Duas capturas da aplicação web e dois estados do Figma, com datas e identificação correta da origem. As imagens de design não são apresentadas como execução da API ou do aplicativo. |
| Seção 11 e Quadro 42 | Mantidos os 23 casos formais, sua rastreabilidade, cenários e resultados esperados; incluídos resultados técnicos e pendências reais. Nenhuma linha recebeu aceite humano presumido. |
| Evidência de 22/10 | CI com 226 unidades e 83 integrados da API, 35 testes web e análise/testes/compilação do aplicativo. A contagem de 76 testes Flutter é identificada como histórica de 19/10. |
| Desempenho | Incorporada a medição local de 1.000 respostas HTTP, com 100% abaixo de três segundos e p95 de 6,8 a 11,0 ms, preservando os limites do ambiente e a separação do SQL exploratório. |
| Seção 12 | Conclusão baseada nas entregas verificadas, limites de interface e homologação, diferença entre aprovação visual e funcional e preparação AWS ainda não implantada. |
| Sumário | As 60 entradas receberam a numeração impressa observada na renderização desta cópia. A paginação pode variar se o arquivo for aberto com outras fontes ou outro editor. |

As 29 seções de página, as 45 tabelas e as 18 imagens originais foram preservadas. Foram acrescentadas quatro imagens, totalizando 22. Mantiveram-se as páginas A4 em retrato/paisagem, o corpo em Arial e o padrão original de títulos e legendas. As larguras dos Quadros 41/42 foram ajustadas ao conteúdo, mantendo a fonte de 9 pontos da base. O Quadro 42 repete o cabeçalho e impede a divisão de suas linhas entre páginas.

## Esclarecimentos necessários fora das seções 10 a 12

Foram alterados nove parágrafos da base; não houve reescrita da fundamentação teórica, das referências ou dos diagramas:

| Local | Motivo e tratamento |
| --- | --- |
| Resumo | Substituída a descrição exclusivamente futura por resultados implementados e limitações verificadas; não se afirma impacto assistencial medido. |
| Introdução ao levantamento de requisitos | Explicitado que os quadros e casos de uso conservam a versão lógica original. Identificadas as ampliações de vínculos médicos e bolsas e a revisão integral ainda necessária. |
| Seção 6.1.3, parágrafo sobre Hospital | Diferenciado o vínculo único previsto originalmente dos múltiplos vínculos médicos autorizados na implementação. A multiplicidade antiga da Figura 6 não foi redesenhada. |
| Seção 6.1.3, parágrafo sobre NecessidadeEstoque | A ausência de bolsas passa a ser característica do modelo lógico histórico da figura; o código atual registra bolsas em domínio separado. |
| Abertura da Seção 9 | DER e dicionário identificados como base lógica original, com ampliações físicas nas migrações e no esquema consolidado. |
| Seção 9.1.1, necessidade e estoque | Diferenciados `NecessidadeEstoque`, `BolsaSangue` e `MovimentoEstoque`. O Quadro 40 não é declarado dicionário integral das ampliações. |
| Seção 9.1.6, arquivos clínicos | Registrada a proteção AES-256-GCM implementada e distinguido HTTPS exigido para publicação da conexão local de desenvolvimento. |
| Seção 9.2, abertura | Incluído Flutter como segundo cliente da API; Figura 18 conservada e identificada como arquitetura lógica original da web. |
| Seção 9.2.1 | Explicadas as três formas de navegação e a autorização revalidada pela API. |

## Evidências utilizadas

- [Consolidação das seções 10 a 12](secoes-10-11-12-2026-10-21.md).
- [Execução individual dos casos PT01 a PT23](../testes/execucao-pt01-pt23-2026-10-21.csv) e [planilha de homologação](../testes/execucao-pt01-pt23-2026-10-21.xlsx).
- [Responsividade web de 21/10](../testes/responsividade-web-2026-10-21.md).
- [Complemento de PT04, PT09, PT11, PT16 e PT18](../testes/complemento-pt04-pt09-pt11-pt16-pt18-2026-10-22.md).
- [Medição de PT20 em 22/10](../testes/desempenho-pt20-2026-10-22.md).
- [Homologação parcial Android de 19/10](../homologacao-android-2026-10-19.md).
- [Complementos do Figma em 22/10](../design/complementos-prototipo-2026-10-22.md).
- [Integração contínua de 22/10](https://github.com/Jhonatan-Andrade/Hemobridge/actions/runs/39755613944), associada ao candidato `f8f1f457`.

O aceite visual comunicado pela responsável em 21/10 foi preservado. Os 13 estados complementares do Figma de 22/10 não foram apresentados como reaprovados pela equipe.

## Conferência de diagramação e limites

A cópia foi convertida com LibreOffice 7.4.7.2 em contêiner local isolado e pelo fluxo do renderizador de documentos da sessão, usando as fontes Arial disponíveis no notebook. Não foram enviadas credenciais ao contêiner nem aberto serviço público. Os PDFs e PNGs de conferência ficam fora do repositório e do ZIP, em `work/tcc-docx-2026-10-22/`; não são uma segunda versão acadêmica a ser adotada.

A renderização da origem no mesmo motor produziu 101 páginas; a cópia atualizada produziu 109. O PDF histórico tem 123 páginas. Essa diferença já existe entre a origem editável e o PDF de referência e não foi tratada como exclusão de conteúdo. Contagem de estruturas, integridade dos arquivos e preservação das imagens foram conferidas separadamente.

Houve triagem visual de todas as páginas da primeira renderização por pranchas, ampliação das páginas novas e das suspeitas de problemas e nova conferência dos trechos afetados após os ajustes. A triagem não equivale à leitura ampliada integral de cada linha de todas as páginas. Não foram observados cortes ou sobreposições nos trechos novos examinados. A revisão não declara formatação perfeita de todo o material histórico.

Foram confirmados na origem, por identidade dos PNGs sob o mesmo motor, dois problemas de legenda e um de fonte: legenda do Quadro 5 separada de sua tabela, legenda do Quadro 14 separada de sua tabela e fonte do Quadro 16 isolada na página seguinte. Há ainda espaços amplos decorrentes de quebras e mudanças de orientação na modelagem histórica. Esses aspectos foram preservados fora do escopo desta edição e devem ser corrigidos na conferência acadêmica integral.

Antes do aceite final, permanecem a reconciliação integral de quadros e diagramas históricos com as ampliações do código, a conferência das normas institucionais, a homologação formal individual de PT01–PT23 e a adoção desta cópia pela pessoa responsável. O documento não atesta publicação, homologação iOS, conformidade jurídica integral ou operação com dados reais.
