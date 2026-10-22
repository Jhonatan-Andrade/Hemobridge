# Reconciliação clínica e dos formulários nativos no Figma

Verificação: 19/10/2026. Arquivo: [HemoBridge — interfaces oficiais](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=0-1). Página: `0:1`.

## Escopo concluído nesta fase

Foram reconciliados **113 estados de interface**: 36 de avaliação clínica de exames, 6 de agenda nas três versões e 71 dos formulários nativos entregues nesta fase. Foram preservados 26 identificadores de entrada/estado existentes e acrescentados 87 estados funcionais. Não foram criadas cópias de versões antigas para os mesmos estados.

A fotografia final do arquivo contém **519 frames de primeiro nível**. As 113 telas desta revisão têm camadas editáveis, instâncias dos controles oficiais, Poppins e variáveis de cor, espaço e arredondamento.

- Web desktop: 1440 × 1000, com navegação lateral.
- Web mobile: 390 × 844, com ícone que expande o menu.
- Aplicativo: 390 × 844. As abas principais usam navegação inferior; cadastro, agendamento, envio de arquivo, publicação de horário e atendimento são páginas empilhadas com retorno ao contexto correto. O resumo do perfil e as áreas principais de estoque/necessidades conservam a navegação inferior. “Editar meus dados” abre uma página separada, sem a barra inferior; todos os estados de edição, inclusive salvo, erro e seleção IBGE, retornam ao resumo do perfil.

As coleções foram renomeadas para **“HemoBridge / Fundação visual”** e **“HemoBridge / Comunidade”**, preservando identificadores e vínculos. Foram removidos dos grupos reconciliados os textos que remetiam decisões clínicas ao grupo, a contratos ainda não existentes ou à ausência de operação real.

## Avaliação de exames nas três versões

A decisão começa vazia. Validar exige escolher explicitamente um dos oito tipos sanguíneos e confirmar a revisão; solicitar novo envio exige motivo/orientação e confirmação independente. Os estados de histórico/sucesso são somente leitura.

O estado de conflito representa recuperação de resposta HTTP 409 e retorna à lista de exames do mesmo contexto. Nenhuma destas transições usa temporizador.

| Estado | Web desktop | Web mobile | Aplicativo |
| --- | --- | --- | --- |
| Lista | `154:3753` | `660:11448` | `232:5126` |
| Escolher decisão | `824:10086` | `824:9615` | `824:9135` |
| Validar: selecionar tipo | `825:9338` | `825:9253` | `825:9173` |
| Escolher tipo sanguíneo | `825:9357` | `825:9270` | `825:9187` |
| Validar: revisar | `824:10121` | `824:9643` | `824:9146` |
| Validar: confirmar | `824:10156` | `824:9671` | `824:9157` |
| Novo envio: orientar | `824:10191` | `824:9699` | `824:9168` |
| Novo envio: confirmar | `824:10226` | `824:9727` | `824:9179` |
| Avaliação registrada | `824:10261` | `824:9755` | `824:9190` |
| Novo envio solicitado | `824:10296` | `824:9783` | `824:9201` |
| Conflito de atualização | `824:10331` | `824:9811` | `824:9212` |
| Resultado privado | `824:10366` | `824:9839` | `824:9223` |

Entradas: [desktop](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=154-3753), [web mobile](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-11448), [aplicativo](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=232-5126).

## Formulários nativos reconciliados

| Grupo | Estados | Entrada e referências de confirmação/recuperação |
| --- | --- | --- |
| Cadastro Paciente/Doador | 9 | Entrada `8:29`; preenchido `8:107`; termo vigente `8:1133`; consentimento `835:9360`; Estado selecionado/município vazio `835:9388`; erro `8:185`; conclusão `8:343` |
| Perfil Paciente/Doador | 7 | Resumo `8:751`; editar `848:9800`; Estado alterado/município vazio `835:9956`; salvo `8:825`; erro `8:901` |
| Consultas do paciente | 15 | Lista `8:1221`; escolha `836:9446`; aceite `836:9471`; confirmação `836:9496`; conflito `836:9571`; reagendamento `836:9596`; cancelamento `836:9671` |
| Exames do paciente | 11 | Lista `8:1233`; seleção `837:9406`; confirmação `837:9431`; em análise `837:9456`; reenvio `837:9481`; arquivo inválido `837:9506`; conflito `837:9531` |
| Estoque institucional | 12 | Lista `747:7641`; cadastro `838:9337`; registro confirmado `838:9359`; quarentena `838:9370`; liberação com referência `838:9392`; confirmação `838:9403`; conflito `838:9425` |
| Necessidades da instituição | 5 | Entrada `226:5092`; nível alterado `838:9967`; confirmação `838:9989`; salvo `838:10011`; erro `838:10033` |
| Publicação de horário médico | 4 | Entrada `840:9742`; preenchido `840:9764`; publicado `840:9786`; conflito `840:9808` |
| Atendimento médico | 8 | Retomada de realizado `232:5109`; solicitação preenchida `840:9989`; enviada `840:10012`; confirmar atendimento `840:10058`; confirmar ausência `840:10081`; falha `840:10127` |

O mapa integral de nomes e identificadores está em [reconciliacao-clinica-app.json](reconciliacao-clinica-app.json).

O cadastro representa termo vigente e consentimento separado. O resumo do perfil apresenta nome, e-mail, papel, “Editar meus dados”, “Ver apresentação” e “Sair”. O formulário separado mantém identidade/tipo sanguíneo em leitura e permite editar somente contato, peso e localização. O botão de retorno da edição aponta para `8:751`, inclusive nos estados salvo/erro/IBGE, sem desviar para o painel. Os estados de troca de UF esvaziam a seleção de município e bloqueiam a conclusão até a nova seleção.

Nas consultas foram incluídos escolha de horário, termos de telessaúde, aceite, confirmação, conflito concorrente, cancelamento e reagendamento. A regra de antecedência de 24 horas aparece no contexto pertinente; a reserva anterior é preservada até a confirmação do reagendamento.

O envio de exames apresenta PDF/JPG/PNG de até 5 MB, conferência antes do envio, resultado em análise, histórico/reenvio e recuperação de formato/tamanho inválido ou conflito. Os arquivos e decisões permanecem na área privada.

O estoque começa em quarentena; a liberação técnica pede referência e motivo, com confirmação explícita. São representados conflito de atualização e bloqueio de bolsa vencida. Necessidades exibem os oito tipos sanguíneos, níveis críticos e confirmação institucional antes de salvar.

A publicação de horário representa período futuro de até quatro horas e endereço HTTPS informado pela instituição. O atendimento realizado pode ser retomado pelo histórico e encaminha solicitações para a área de Exames.

## Agenda nas três versões

| Versão | Próximos | Histórico |
| --- | --- | --- |
| Aplicativo | `226:5074` | `832:9579` |
| Web mobile | `660:11338` | `832:9669` |
| Web desktop | `101:3115` | `832:9757` |

As agendas apresentam instituição, separação entre Próximos/Histórico, referência de paginação de até 30 atendimentos e retomada de consultas realizadas. O registro de atendimento futuro fica desabilitado antes do início agendado. No aplicativo, “Publicar horário” está conectado ao formulário nativo correspondente.

As entradas do painel do paciente foram reconectadas: agendar, ver consulta, enviar/ver/reenviar exame e editar perfil retornam aos estados do próprio contexto.

## Auditoria integrada

| Verificação | Resultado |
| --- | --- |
| Estados reconciliados nesta fase | 113 |
| Destinos diretos de navegação no arquivo | 2.911 |
| Destinos, incluindo ramos condicionais recursivos | 3.438 |
| Destinos inexistentes | 0 |
| Ciclos compostos exclusivamente por `AFTER_TIMEOUT` | 0 |
| Temporizadores nas 113 telas reconciliadas | 0 |
| Temporizadores no arquivo completo | 24, preexistentes em envio/carregamento de comunidade e acessibilidade |
| Nomes duplicados entre os estados reconciliados | 0 |
| Resíduos dos termos legados pesquisados nestes grupos | 0 |
| Elementos físicos excedendo horizontalmente seu contêiner | 0 |
| Elementos excedendo a largura dos artboards, incluindo descendentes de instâncias | 0 |

A auditoria percorre ações em `CONDITIONAL.conditionalBlocks`. Os temporizadores antigos de carregamento foram preservados. Retornos acionados por clique não são ciclos automáticos.

A medição registra também 131 limites internos herdados de instâncias — principalmente logo e controles — maiores que o próprio contêiner do componente. Eles permanecem dentro da largura do artboard; essa medição interna não foi confundida com rolagem horizontal de página. O detalhe está no JSON.

Os formulários extensos têm conteúdo maior que o viewport e rolagem vertical. Na inspeção, o conteúdo do cadastro mede aproximadamente 1947 px, a edição do perfil 1024 px e as necessidades 1629 px; os artboards continuam com altura de 844 px. As capturas de conteúdo completo abaixo não transformam o aplicativo em uma página de altura fixa.

## Capturas finais

- [Avaliação nativa antes da escolha do tipo](evidencias/figma-clinica-app-selecionar-tipo.png)
- [Lista de exames na web mobile](evidencias/figma-clinica-web-mobile-lista.png)
- [Avaliação confirmada no desktop](evidencias/figma-clinica-desktop-confirmar.png)
- [Cadastro nativo com consentimento](evidencias/figma-app-cadastro-confirmado.png)
- [Resumo do perfil com navegação inferior](evidencias/figma-app-perfil-resumo.png)
- [Edição do perfil sem barra inferior](evidencias/figma-app-perfil-editar.png)
- [Perfil com município novamente obrigatório](evidencias/figma-app-perfil-municipio-pendente.png)
- [Confirmação do agendamento](evidencias/figma-app-consulta-confirmar.png)
- [Conferência antes do envio do exame](evidencias/figma-app-exame-confirmar.png)
- [Liberação técnica de estoque](evidencias/figma-app-estoque-liberacao.png)
- [Confirmação de necessidade crítica](evidencias/figma-app-necessidades-critico.png)

As capturas mantêm os arquivos editáveis no Figma. Para revisar os formulários longos, a exportação do conteúdo rolável foi feita com recorte temporariamente desativado e imediatamente restaurado; a configuração final dos viewports permanece preservada.

## Limites e escopo restante

Este é um registro de reconciliação de interface e navegação. O Figma não executa autenticação, chamadas clínicas, validação de CPF/arquivo, envio, download ou gravação real. Estados preenchidos representam cenários finitos; não substituem digitação livre, todas as respostas do IBGE ou os testes automatizados da API/aplicativo.

Nenhum exame de uma pessoa real ou URL operacional de sala de consulta foi incorporado. A visualização de arquivo apresenta metadados e a área privada. O domínio reservado utilizado no campo de endereço é uma referência visual; não abre uma sala real.

A revisão não certifica os outros 406 frames do arquivo e não declara reconciliação integral de todas as versões web para todos os formulários nativos acrescentados. Perfis profissionais, acessibilidade, comunidade e demais áreas fora dos grupos listados mantêm sua situação anterior e exigem sua própria cobertura de revisão.

Artboards em 390 px não comprovam responsividade do código em 360 px, funcionamento de leitor de tela, GPS físico, seletor nativo de arquivos nem execução em Android/iOS reais. Essas verificações pertencem à homologação do aplicativo/site. Nenhuma decisão clínica ou conformidade de segurança é validada apenas pela existência de um estado visual.
