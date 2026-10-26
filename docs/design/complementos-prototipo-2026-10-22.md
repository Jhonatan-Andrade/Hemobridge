# Complementos de protótipo — 22/10/2026

Arquivo: [HemoBridge no Figma](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=0-1).

Esta rodada complementa a [revisão de 21/10](aceite-das-interfaces-2026-10-21.md). As telas existentes foram preservadas. As novas adições de 22/10 **não são apresentadas como reaprovadas pela equipe**; o aceite anterior continua sendo o da rodada informada pela usuária.

O trabalho desta rodada é de design e prototipagem. Não condiciona o fechamento de uma tarefa de protótipo à existência de API, mas também não representa homologação funcional do código.

## Entregas

| Item | Estado anterior | Complemento realizado |
| --- | --- | --- |
| Entrada de Bancos na Web mobile | Tela 660:8707 existente, sem entrada direta identificada na varredura | Locais passou a oferecer “Bancos de sangue”; o novo estado preenchido também leva à lista. A lista retorna a Locais na Web mobile. A leitura final encontrou duas entradas para 660:8707. |
| Locais e recomendações | Tipo e intervalo descritos genericamente, sem próxima data e lista preenchida | Três estados complementares com O+ validado e somente leitura; próxima data orientativa; três instituições ordenadas primeiro por prioridade e depois por distância no mesmo nível. O aviso de que a triagem confirma a elegibilidade permanece explícito. |
| Gráficos de indicadores | Hospital e administrador possuíam apenas estados vazios desktop, com barras sem dados ocultadas | Seis painéis preenchidos: dois perfis nos três formatos. Gráficos por tipo sanguíneo, evolução semanal e, no administrador, necessidades críticas por UF. Estados vazios desktop preservados e quatro estados vazios móveis acrescentados. |
| Leitura responsiva | Não era possível avaliar os gráficos com valores nos formatos móveis | Desktop 1440px em colunas; Web mobile 360px e app 390px empilhados, com rolagem vertical e sem extrapolação horizontal nas 13 telas novas. Rótulos e valores são textos, não dependem apenas da cor. |

## IDs das telas complementares

| Conteúdo | Web desktop | Web mobile | Aplicativo |
| --- | --- | --- | --- |
| Locais preenchido | 906:9914 | 906:9862 | 906:9795 |
| Hospital · indicadores preenchidos | 910:9870 | 910:10093 | 910:10322 |
| Administrador · indicadores preenchidos | 910:9977 | 910:10201 | 910:10464 |
| Hospital · sem registros | 153:3515 preservada | 910:10172 | 910:10418 |
| Administrador · sem registros | 154:3520 preservada | 910:10293 | 910:10573 |

As entradas de indicadores são 910:10629, 910:10632, 910:10635, 910:10638, 910:10641 e 910:10644. Os retornos mantêm o perfil e a versão. Os controles de período alternam os estados preenchido e vazio. A entrada de Bancos Web mobile é 906:9987 e o retorno da lista é 906:9990.

Todos os IDs criados/ajustados, as mudanças de texto, as ligações, os tokens e as cópias transitórias de captura constam de [complementos-prototipo-2026-10-22.json](complementos-prototipo-2026-10-22.json). Foram listados 872 IDs de camadas permanentes criadas e 261 IDs ajustados nesta rodada; não houve remoção de telas aprovadas.

## Dados usados no protótipo

Os valores são **sintéticos, criados exclusivamente para avaliar o design**; não são indicadores operacionais nem registros de pessoas. Essa origem está documentada no JSON e não foi inserida como aviso de demonstração nas interfaces.

- Locais: cenário de intervalo de 60 dias, coleta em 04/09/2026 e próxima data orientativa em 03/11/2026. A apresentação não afirma aptidão para doar. O tipo é exibido como validado e somente leitura.
- Ordem das instituições: Hemocentro Ponte Norte, O+ Crítico, 2,4 km; Hospital Vida Plena, O+ Crítico, 7,1 km; Hospital Aurora, O+ Baixo, 1,3 km. Assim, a distância desempata o mesmo nível e não supera a prioridade clínica informada pela instituição.
- Hospital: 120 doações no período, sendo 80 vinculadas e 40 avulsas. Distribuição em oito tipos e três semanas; as somas coincidem com 120.
- Administrador: 320 doações, 240 doadores aprovados e três hospitais ativos. Distribuição em oito tipos e três semanas; as somas coincidem com 320. Necessidades críticas por UF: SP 3, RJ 2 e MG 1 ocorrência.
- Período preenchido: 01–21/10/2026. Período vazio móvel: 01–21/09/2026. Nenhum exame, diagnóstico ou identificador pessoal compõe os gráficos.

## Verificação de legibilidade e navegação

A inspeção visual considerou capturas integrais dos seis painéis. Há 75 barras: 11 em cada painel de hospital e 14 em cada painel administrativo. Cada série tem título, escala, unidade, rótulo e valor explícito. O menor texto dos rótulos de dados é Poppins 14px; títulos de gráficos usam 20px. A leitura depende de números e comprimento proporcional, além da cor.

Contrastes calculados a partir dos tokens efetivamente usados no modo visual apresentado:

| Combinação | Contraste |
| --- | --- |
| Texto principal / superfície branca | 13.63:1 |
| Texto secundário / superfície branca | 6.43:1 |
| Texto secundário / fundo | 5.88:1 |
| Magenta / superfície branca | 6.92:1 |
| Barra magenta / trilho cinza | 4.74:1 |

Os textos calculados superam 4,5:1 e a distinção gráfica supera 3:1 nesse modo. Esta verificação não é uma auditoria completa de todos os temas, estados ou configurações de acessibilidade.

A varredura final identificou **534 telas**: 151 desktop, 175 Web mobile e 208 app. Nos destinos percorridos: 3.011 ações de navegação, nenhum destino ausente e nenhum cruzamento entre versões. Cada tela nova tem entrada. As 13 telas novas não apresentam extrapolação horizontal em suas camadas visíveis. Não foram encontrados códigos acadêmicos, menções a fictício/demonstração ou decisão de equipe pendente nos estados novos. Isso não equivale a clicar manualmente em todos os caminhos do Present.

## Evidências antes/depois

| Evidência | Antes | Depois |
| --- | --- | --- |
| Locais app | [Captura anterior](evidencias/complementos-2026-10-22/antes-locais-app.png) | [Conteúdo integral](evidencias/complementos-2026-10-22/depois-locais-app.png) |
| Locais nas outras versões | — | [Desktop](evidencias/complementos-2026-10-22/depois-locais-desktop.png), [Web mobile](evidencias/complementos-2026-10-22/depois-locais-web-mobile.png) |
| Bancos Web mobile | Entrada ausente na varredura anterior | [Lista com retorno](evidencias/complementos-2026-10-22/depois-bancos-web-mobile.png) |
| Hospital desktop | [Estado vazio anterior](evidencias/complementos-2026-10-22/antes-painel-hospital-desktop.png) | [Estado preenchido](evidencias/complementos-2026-10-22/depois-hospital-desktop.png) |
| Hospital móvel | Não havia painel de gráficos preenchido | [Web mobile](evidencias/complementos-2026-10-22/depois-hospital-web-mobile.png), [App](evidencias/complementos-2026-10-22/depois-hospital-app.png) |
| Administrador desktop | [Estado vazio anterior](evidencias/complementos-2026-10-22/antes-painel-admin-desktop.png) | [Estado preenchido](evidencias/complementos-2026-10-22/depois-admin-desktop.png) |
| Administrador móvel | Não havia painel de gráficos preenchido | [Web mobile](evidencias/complementos-2026-10-22/depois-admin-web-mobile.png), [App](evidencias/complementos-2026-10-22/depois-admin-app.png) |

Capturas integrais mostram também a área abaixo da dobra. Para produzi-las foram usadas cópias transitórias isoladas, removidas na mesma operação. Essas imagens de conteúdo não incluem a navegação que é irmã do viewport; isso não indica ausência de navegação na tela permanente.

Uma conferência adicional das 13 telas permanentes confirmou o padrão de navegação, sem aplicar qualquer mutação: desktop com rail lateral; Web mobile com acionador do menu; app com quatro ícones inferiores fora da área rolável. Os IDs e as reações estão em [Verificação da navegação permanente](complementos-prototipo-2026-10-22-chrome.json). Exemplos: rail 910:9985 no administrador desktop, barra 910:10328 no hospital app, barra 910:10470 no administrador app e barra 906:9814 no Locais app. O menu de Locais Web mobile é 906:9866 e abre o overlay 660:11320 da mesma versão.

Capturas do viewport real, com a navegação visível: [Administrador desktop](evidencias/complementos-2026-10-22/viewport-admin-desktop.png), [Hospital app](evidencias/complementos-2026-10-22/viewport-hospital-app.png), [Administrador app](evidencias/complementos-2026-10-22/viewport-admin-app.png) e [Locais app](evidencias/complementos-2026-10-22/viewport-locais-app.png). As barras inferiores permanecem em y=756 com viewport de 756px nos indicadores e y=751 com viewport de 751px em Locais, sem cobrir cards. Os 17 PNGs foram conferidos como arquivos válidos.

## Conclusão para as tarefas de design

- HEM-20: os seis destinos de gestão/bancos continuam presentes; a lacuna de entrada de Bancos Web mobile foi resolvida. Não se exige API para considerar essa evidência de prototipagem.
- HEM-54: a lacuna de Locais está resolvida no design: tipo validado, próxima data orientativa e lista preenchida priorizada nas três versões. As sete perguntas e o aviso orientativo já inspecionados permanecem preservados.
- HEM-55: a falta de gráficos preenchidos nos três formatos foi resolvida; agora há evidência para avaliar valores, unidades, rótulos, contraste, quebra de linha e rolagem. O estado vazio não é a única representação.

Esta rodada pode ser anexada ao Jira como complemento de prototipagem concluído, distinguindo o aceite anterior das telas das novas adições de 22/10. Nenhuma nova aprovação da equipe foi presumida. O relatório não atesta geração de dados pela API, publicação na AWS ou operações de produção.

