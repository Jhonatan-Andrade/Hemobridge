# HEM-19 — Comunidade e mapas (17/10/2026)

Esta revisão parte do frontend React e do arquivo Figma existentes. Nenhuma alteração foi feita no backend, no banco ou nas tarefas de outros integrantes.

## Interface web

- A comunidade aparece na navegação de visitante, paciente e profissional. Paciente, médico, representante e administrador podem criar publicações na sessão local; visitantes recebem o destino de entrada. O feed contém exemplos claramente identificados de instituição, médico e equipe editorial, com mais comentários e controle para mostrar os próximos dez.
- O paciente encontra `#external-locations` no menu e no painel. A página mostra um mapa interativo de referência do OpenStreetMap, pesquisa por cidade e UF que abre o Google Maps para doação, exame de sangue e exames adicionais, e a lista de hemocentros do Ministério da Saúde. Não há estabelecimentos nem serviços confirmados no mapa. A geolocalização é opcional, solicitada após clique, e a posição é arredondada antes de centralizar o mapa.
- O médico pode alternar entre instituições ilustrativas, sem misturar agendas. O administrador tem um mapa das cinco regiões com geometria da API de malhas do IBGE e filtros por região e tipo sanguíneo. O estado de necessidade fica vazio até existir fonte institucional autorizada, com critério e data de atualização; a cor neutra não indica urgência.

O GeoJSON local em `frontend/src/data/brazilRegionsIbge.json` foi obtido da [API de malhas do IBGE, versão 3](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3), em qualidade intermediária, em 17/10/2026. O SVG em `frontend/public/hemobridge/mapa-regioes-ibge.svg` é derivado desse arquivo e pode ser regenerado com `node frontend/scripts/generate-ibge-svg.mjs` a partir da raiz do repositório. A geometria representa limites regionais, não locais de atendimento nem dados de estoque.

## Figma

As telas foram acrescentadas ao [arquivo existente](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge), preservando os quadros anteriores: mapa do administrador desktop `705:7037`, app mobile `706:7061`, web mobile `708:7087` e menu web mobile aberto `710:7096`; locais do paciente desktop `707:7062`, app mobile `707:7122`, web mobile `708:7138` e menu aberto `710:7143`. O feed mobile `49:13034`, o feed desktop `49:13468`, a agenda médica `101:3115` e os painéis existentes receberam apenas os acréscimos pertinentes.

No Present, foi confirmado por clique: painel do paciente mobile → Encontrar locais, barra inferior da tela de locais → Comunidade, e menu do navegador mobile → Comunidade. A barra inferior da tela de locais também tem destinos para Painel e Perfil. As telas novas usam transição Dissolve de 180 ms; o conteúdo não depende da animação. O quadro mobile deve ser visto no Present com `scaling=scale-down` para mostrar a barra inferior inteira em janelas menores que o artboard.

O Figma mostra campos e mapas estáticos: a digitação, permissão de localização, busca no Google Maps, carregamento de azulejos OpenStreetMap, filtros React e publicação na sessão só funcionam na web. O mapa cartográfico do administrador no Figma é vetorial editável. Ainda não há telas próprias de painel e perfil do administrador em app mobile; portanto, esses dois ícones no novo quadro de mapa não foram conectados a destinos inadequados. Essa reconciliação requer as telas correspondentes.

## Dependências para operação real

O backend atual não persiste publicações, comentários ou reações. Também não representa um médico em mais de um hospital, nem mantém um cadastro verificado de serviços de exames e doação. A necessidade sanguínea atual é qualitativa por hospital: não basta para afirmar qual região do Brasil mais precisa de cada tipo. A integração precisa definir fonte autorizada, abrangência, atualização, autorização e moderação antes de apresentar dados reais.

Referências externas: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [política de azulejos do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) e [lista de hemocentros do Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/saes/doacao-de-sangue/arquivos/lista-de-hemocentros.pdf/view).
