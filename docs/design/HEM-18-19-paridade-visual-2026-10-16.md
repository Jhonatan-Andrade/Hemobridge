# HemoBridge — paridade visual e navegação por plataforma

Esta revisão responde à orientação final: **site desktop** com barra lateral, **site no navegador mobile** com menu no cabeçalho e **protótipo de app mobile** com destinos principais na barra inferior. Os três contextos compartilham a identidade HemoBridge, mas mantêm controles adequados à área disponível. O Figma é o [arquivo existente](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge); as telas anteriores foram preservadas.

## Antes e depois

| Área | Antes | Depois verificável |
| --- | --- | --- |
| Site mobile | O trilho lateral comprimia a home e os formulários em 390 px. | [Captura da home a 390 px](qa-2026-10-16/web-mobile-390.png): logo completa, ícone de menu no cabeçalho, hero azul-petróleo, magenta nos comandos e cartão de explicação. Não há barra inferior fixa sobre os controles. |
| App mobile no Figma | A tentativa de reutilizar o trilho do desktop reduzia a área útil dos quadros de 390 px. | [Painel no Present](qa-2026-10-16/figma-app-mobile-patient-present.png): destinos do paciente com ícone e rótulo na base. Home `43:1309`, Comunidade `49:13034`, Painel `8:518` e Perfil `8:751` preservam os percursos originais. |
| Site mobile no Figma | Havia somente o protótipo de app, sem um conjunto específico para o navegador pequeno. | A [página **HemoBridge / Web mobile**](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-5911) contém 123 quadros editáveis, com logo e menu superior. [Home `660:7571`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-7571), [Comunidade `660:7691`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-7691), [Painel `660:6547`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-6547) e [Perfil `660:6886`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-6886) são entradas para revisão. |
| Site desktop no Figma | Quadros legados de autenticação, paciente, comunidade, jornada, profissionais e acessibilidade não acompanhavam o padrão de barra lateral do React. | Na página principal, 83 dos 110 quadros de 1440 × 1000 px têm barra lateral por perfil e viewport deslocado para `x=76`, sem conteúdo sob o trilho. Os 27 restantes são retornos técnicos, tours com máscaras de posição fixa ou sobreposições do próprio menu. |
| Cartões do paciente no Figma | Os cartões compartilhados eram planos e a situação tinha o mesmo peso visual dos secundários. | O componente `Card Kind=Situation` (`3:221`) usa gradiente azul-petróleo com texto claro; as quatro variantes de cartão (`3:221`, `3:224`, `3:227`, `3:230`) recebem elevação suave. A hierarquia se aproxima do painel React sem editar o conteúdo de cada tela. |
| Botões e cantos no Figma | Variações de raio e tratamentos divergentes entre telas. | `radius/14`, `radius/22` e o novo `radius/pill` estão vinculados a controles e às 15 variantes do botão; o React usa `--hb-pill-radius`. |

## Direção visual compartilhada

Fundo claro `#F5F5F2`, superfície branca, texto azul-petróleo `#18313B`, vermelho/magenta de marca `#AC123F` e vinho como profundidade dos gradientes. O rosa `#F4ECEF` atua em poucos realces. Poppins sustenta a interface; o trecho editorial da home mantém serifada itálica. Botões em pílula, cartões com raio maior e sombra de baixa opacidade criam níveis consistentes. A marca completa fica no topo; o símbolo isolado serve como detalhe e não substitui a assinatura. Imagens abstratas já licenciadas apoiam hero e comunidade, com [origem e créditos registrados](HEM-19-editorial-media-2026-10-13.md).

O novo conjunto web mobile foi derivado das telas existentes: mantém textos, hierarquia, estados e ligações, acrescentando apenas a navegação própria do navegador. Os menus de visitante, paciente e profissional usam a mesma base azul-petróleo, com magenta para seleção. No React, a ilustração das três etapas da comunidade passou a usar variáveis de cor da identidade, e as páginas de acessibilidade, jornada e profissionais perderam o espaço de rodapé reservado à antiga barra mobile. O conteúdo não fica coberto.

## Navegação e verificação

| Contexto | Componente de navegação | Destinos principais | Movimento |
| --- | --- | --- | --- |
| Web desktop | Barra lateral persistente; 76 px recolhida, 238 px aberta | Itens por perfil, com acessibilidade e tour em grupo secundário | Expansão de 260 ms; sem movimento quando solicitado pelo sistema |
| Web mobile | Ícone no cabeçalho e menu temporário | Itens por perfil, rótulos sempre visíveis no menu | Entrada de 180 ms, opacidade e −6 → 0 px; exibição imediata em movimento reduzido |
| Figma web mobile | [Menus de visitante `660:11302`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=660-11302), paciente `660:11320` e profissional `660:12494` | Ligações internas remapeadas para os quadros desta página | Sobreposição `MOVE_IN` de 200 ms; fechamento explícito |
| Figma app mobile | Barra inferior das telas de navegação | Visitante: Início, Comunidade, Entrar; paciente: Início, Comunidade, Meu painel, Perfil | Troca de quadro; os destinos iniciam no topo |

Na inspeção estrutural do novo conjunto web mobile, **123/123 quadros** têm logo e gatilho de menu, **nenhum** exibe a barra inferior do app e **1.165 ações de navegação** apontam para a própria página. Na página principal, a inspeção de propriedades identificou **110 quadros desktop de 1440 × 1000 px**, sendo **83 com barra lateral** e viewport começando em `x=76`; os **27 sem barra** são 8 retornos/quadros de infraestrutura, 14 quadros de tour com máscaras ou pontos de destaque posicionados e 5 overlays do próprio menu. Nenhum conteúdo dos 83 quadros fica sob o trilho. Essas são evidências de **propriedades**, separadas dos percursos abaixo.

No **Present por clique**, a Home `660:7571` abriu o Pré-cadastro `660:6034`; dali o menu de visitante abriu e levou à Comunidade `660:7691`, e o menu da comunidade levou a Entrar `660:6373`. Em outro início de fluxo, o Painel `660:6547` abriu o menu do paciente e o item Perfil levou a `660:6886`. No percurso profissional, o acesso `660:7312` abriu o menu do perfil e o item Jornada levou a `660:11382`. Os IDs de destino e a cena visível mudaram em cada clique. Estes percursos confirmam as entradas principais, não cada uma das 1.165 ligações. Os cliques anteriores no app original foram Home → Comunidade e Painel → Perfil. **No desktop, o novo teste por clique permaneceu inconclusivo**: o Present exibiu os pontos interativos, mas não navegou nas tentativas feitas no navegador. A inspeção de propriedades dos quadros desktop não substitui essa verificação por clique.

O Figma demonstra três tamanhos/contextos por quadros fixos; não reproduz a responsividade contínua da web, foco de teclado, preferência do sistema por movimento reduzido, aumento de texto a 200%, dados em memória nem o carregamento incremental de comentários. A implementação React é a referência executável para esses comportamentos. A [decisão anterior de navegação](HEM-18-19-navegacao-por-contexto-2026-10-16.md) contém as especificações de foco e o registro dos testes já concluídos.

## Arquivos e componentes alterados nesta passagem

| Local | Finalidade |
| --- | --- |
| `frontend/src/hemobridge-editorial.css` | Token de raio da pílula alinhado ao Figma. |
| `frontend/src/pages/Community.tsx` | Ilustração das etapas vinculada às cores compartilhadas. |
| `frontend/src/pages/Accessibility.css`, `PatientJourney.css`, `Professional.css` | Respiro inferior coerente com a navegação web mobile sem barra fixa. |
| Figma: variáveis `radius/14`, `radius/22`, `radius/pill` | Cantos de campos, cartões e botões. |
| Figma: Button `3:92`, Card `3:233`, estilo `HEM-19 / Elevation / Surface` | Aparência reutilizável e editável aplicada nas telas existentes. |
| Figma: página `660:5911` | Variante web mobile de 123 quadros, preservando o app original. |
| Figma: 83 quadros desktop da página principal | Barra lateral por perfil e área de conteúdo deslocada, preservando os quadros especiais de tour, overlays e retornos. |

## Limites de entrega

A reconciliação visual dos quadros desktop de conteúdo foi concluída. O teste novo de suas conexões no Present segue inconclusivo e deve ser repetido em uma sessão do Figma que efetivamente navegue ao clicar; por isso não se declara aprovação integral das rotas desktop. O site React implementa a barra lateral. Backend, banco, conteúdo sincronizado em `sources/`, backups e requisitos de outras pessoas não foram alterados.
