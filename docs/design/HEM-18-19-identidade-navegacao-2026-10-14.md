# HemoBridge — identidade e navegação, revisão de 14/10/2026

Continuação da HEM-18/19 sobre o React e o [arquivo Figma existente](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge). O objetivo desta passagem foi reduzir salmão/rosa, consolidar azul-petróleo com vermelho/magenta, tornar a navegação lateral única e dar mais clareza à proposta da plataforma. Home pública, comunidade, painel do paciente e tarefas profissionais continuam áreas distintas. Backend, banco, requisitos de outros integrantes e cópias de referência não foram alterados.

## Antes e depois

| Área | Antes | Depois |
| --- | --- | --- |
| [Home desktop anterior](review-frontend-final-2026-10-02/home-1440.png) → [atual](qa-2026-10-14/home-1440.png) | Cabeçalho e navegação variavam por página; o título e a arte ocupavam o destaque sem explicar de imediato a plataforma. | Logo completa no cabeçalho comum, ícones persistentes à esquerda, imagem abstrata no fundo do hero, título “A ponte que conecta vidas” e explicação visível à direita sobre pessoas interessadas em doar e equipes de hospitais/instituições. |
| [Home mobile anterior](review-frontend-final-2026-10-02/home-360.png) → [atual](qa-2026-10-14/home-360.png) | Barra inferior ocupava área útil; estética mais rosada. | Barra lateral de 60 px com ícones, hero azul-petróleo e magenta, botões mais fáceis de distinguir e marca completa. |
| [Comunidade anterior](review-frontend-final-2026-10-02/feed-360.png) → [atual](qa-2026-10-14/community-360.png) | Arte vermelha inclinada e pouco respiro entre cabeçalho e publicações. | Arte reta reposicionada no quadro, gotas decorativas dentro e fora, gradiente na mesma família da home e intervalo maior antes dos cartões. |
| [Painel anterior](review-frontend-final-2026-10-02/dashboard-1440.png) → [atual](qa-2026-10-14/dashboard-1440.png) | Navegação própria da área e estados de hover com contraste insuficiente. | Mesmo menu lateral da área pública, rótulos brancos legíveis em hover/foco, conteúdo de situação e próximo passo com superfícies discretas. |
| [Painel mobile anterior](review-frontend-final-2026-10-02/dashboard-360.png) → [atual](qa-2026-10-14/dashboard-360.png) | Barra inferior e conteúdo comprimido. | Ícones persistentes no trilho esquerdo e cartões em uma coluna, sem controles cobertos por navegação fixa inferior. |

O menu mostra os ícones quando recolhido. O botão de três traços iguais alterna a expansão; no desktop, escolher um ícone mantém os rótulos visíveis. Em telas estreitas, a expansão fica sobre o conteúdo com fundo de proteção: o conteúdo atrás fica inerte, `Tab` e `Shift+Tab` circulam nos controles do menu, escolher um destino recolhe o menu e `Esc` o fecha devolvendo o foco ao botão. Os destinos continuam definidos por perfil; as áreas profissionais mantêm subdestinos próprios. O botão “Como funciona? Ver tour” tem área de respiro interna e contraste no hover. A home recebeu explicação factual sobre o processo, sem prometer correspondência automática entre doadores e hospitais.

## Direção visual e referências

Superfícies claras `#FFFFFF` sobre fundo `#F5F5F2`; azul-petróleo `#18313B` para estrutura, vermelho/magenta `#AC123F` para ação e seleção, vinho `#651C3A` nos gradientes narrativos. O rosa suave `#F4ECEF` fica restrito a detalhes. Poppins local é a fonte de interface; Georgia itálica na web e Fraunces itálica no Figma marcam trechos editoriais. Sombras leves e bordas arredondadas definem níveis sem competir com o conteúdo. O símbolo oficial de ponte/batimento aparece completo no cabeçalho e como marca pontual no hero. As imagens abstratas existentes são fundos ou apoio editorial e não representam pacientes nem resultados.

| Referência | Princípio aproveitado; limite para o HemoBridge |
| --- | --- |
| [Heron AI](https://heronaiapp.com/) | Aproveitou-se a explicação progressiva de um produto complexo; seria inadequado importar sua densidade de efeitos de rolagem para formulários e tarefas clínicas. |
| [Nick Ho Motorsports](https://nickho-motorsports.nl/) | Aproveitou-se o ritmo entre imagem expressiva e texto; seriam inadequados o som e o espetáculo de movimento para um percurso de saúde. |
| [The Design Society](https://www.thedesignsociety.fr/) | Aproveitou-se a personalidade tipográfica e a composição assimétrica; a linguagem lúdica de “sociedade secreta” prejudicaria clareza e confiança aqui. |
| [Paragon](https://www.paragonproductions.co/) | Aproveitou-se a edição visual intencional por seções; vídeo e sobreposição de produção criativa desviariam a atenção das tarefas do paciente. |
| [Neutomni](https://neutomni.com/) | Aproveitou-se a gramática visual consistente de marca, interface e processo; metáforas decorativas em excesso atrapalhariam leitura e conclusão de cadastro. |

Não houve mídia nova nesta rodada. Origem, crédito e licença Unsplash dos fundos de [Sean Fahrenbruch](HEM-19-editorial-media-2026-10-13.md) e da arte de [remapstudio](HEM-19-editorial-media-2026-10-12.md) continuam registrados; os créditos não ocupam a interface conforme a orientação visual mais recente. O logotipo e Poppins são ativos já existentes no repositório. Nenhuma biblioteca de animação foi adicionada: CSS cobre os efeitos implementados, sem necessidade de Motion ou GSAP.

## Especificação de movimento implementada

| Elemento | Gatilho | Duração e intervalo | Deslocamento | Easing | `prefers-reduced-motion: reduce` |
| --- | --- | --- | --- | --- | --- |
| Barra lateral e recuo do conteúdo | Abrir/fechar; escolher ícone expande no desktop e recolhe no mobile | 260 ms | Largura 76→238 px no desktop; 60→238 px no mobile; margem acompanha apenas no desktop | `cubic-bezier(.2,.8,.2,1)` | Troca imediata |
| Rótulos do menu | Expansão/recolhimento | Opacidade 140 ms; largura até 230 ms | Sem translação | `ease` / curva acima | Texto aparece imediatamente |
| Fundo de proteção mobile | Abrir menu | 180 ms | Sem deslocamento; opacidade 0→1 | `ease-out` | Aparece imediatamente |
| Título e blocos do hero | Entrada da home | 480 ms; atrasos 0/70/130/190 ms | `translateY(12px)`→0, opacidade .55→1 | `cubic-bezier(.2,.8,.2,1)` | Estado final estático |
| Traço do hero | Entrada da home | 700 ms | Escala horizontal 0→1 | Mesma curva | Traço completo |
| Prévias da comunidade na home | Entrada da home | 380 ms; atrasos 0/75/150 ms | `translateY(12px)`→0, opacidade .55→1 | Mesma curva | Cartões estáticos |
| Botões e cartões | Hover com ponteiro | 180 ms nos botões | Botões −2 px; cartões −4 px | Mesma curva | Sem transformação/transição |
| Cartão do tour | Abrir tour | 240 ms | `translateY(8px)`→0, opacidade .94→1 | Mesma curva | Aparece no estado final |
| Holofote do tour | Mudar etapa/alvo ou viewport | 180 ms | Interpolação geométrica até o elemento-alvo | `ease` | Posicionamento imediato |
| Marca no hero | Hero visível | 4,8 s, ciclo discreto | Escala 1→1,035→1 | `ease-in-out` | Marca estática |

Conteúdo e controles existem antes e depois das animações. Não há rolagem forçada, autoplay com som, animação em campo ou mensagem de erro. A regra global de movimento reduzido desliga `animation` e `transition`, inclusive em pseudoelementos. Os ouvintes e observadores do menu/tour são removidos ao desmontar ou mudar o estado.

## Mapa das alterações

| Arquivo/componente | Papel |
| --- | --- |
| `frontend/src/components/UnifiedHeader.tsx` e `.css`, `navigationItems.ts`, `ui.tsx` | Navegação lateral única, ícones e estados recolhido/expandido, cabeçalho com logo, foco, Escape e ajuste à altura real da barra superior. |
| `frontend/src/App.tsx` | Integra cabeçalho/menu em todas as rotas e remove a barra inferior redundante. |
| `frontend/src/hemobridge-editorial.css`, `hemobridge-base.css`, `index.css` | Paleta, gradientes, respiro, botão do tour, quebra de texto a 200%, gotas e alternativa sem movimento. |
| `frontend/src/pages/Community.tsx` | Explicação da home sobre o propósito da plataforma; mantém cartões e destinos existentes. |
| `frontend/index.html` | Título e favicon oficial. |
| Removidos: `frontend/src/App.css`, `frontend/src/assets/{hero.png,react.svg,vite.svg}`, `frontend/public/{favicon.svg,icons.svg}` | Sobras do starter sem referências no código atual. Backups, `sources/` e outro checkout foram preservados. |

No Figma, os tokens locais de marca, hover, fundo, superfície, suavização, acento, creme e vinho foram atualizados **no lugar**; os gradientes das entradas de home/comunidade foram harmonizados; a explicação da home desktop (`469:5139`) foi alinhada ao React; a distância antes dos cartões foi ampliada nos grupos `49:15018` e `49:14427`; os textos dos dois CTAs primários da home (`I43:1322;3:63`, `I43:1353;3:63`) foram vinculados ao token branco para corrigir o contraste. Os menus conectados de visitante [mobile `468:5147`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=468-5147) e [desktop `468:5148`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=468-5148) receberam azul-petróleo, magenta e branco pelos tokens existentes, sem trocar seus dez destinos. A [prancha de identidade visual editável `516:5350`](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=516-5350) apresenta logotipo, símbolo, paleta vinculada a tokens, Poppins/Fraunces, gradiente, gota e os componentes de menu `515:5330`/`515:5355` com Auto Layout. Nenhum script antigo de construção foi executado.

## Verificações e diferenças entre web e Figma

- `npm.cmd run build` e `npm.cmd run lint` passaram em 14/10/2026; o build gerou 45 módulos.
- Em navegador, home, comunidade, pré-cadastro, painel e área profissional foram medidos em **360, 390, 768 e 1440 px**, a **100% e 200%** de texto: `scrollWidth` não excedeu a largura do viewport em nenhuma das 40 combinações. O pré-cadastro em 360 px/200% recebeu quebra de linha específica após o teste detectar excesso. Não há barra inferior mobile; conteúdo começa após o trilho de ícones.
- As capturas mobile de home, comunidade, pré-cadastro e painel foram feitas com a mesma aba em viewport de 360 px, após carregar as imagens; os arquivos são PNG e incluem apenas a área útil de 345 px, pois 15 px ficam para a barra de rolagem do navegador.
- Por teclado, `Enter` abriu o menu e navegou, `Esc` recolheu-o e devolveu foco visível ao botão. No tour, `Shift+Tab` permaneceu dentro do diálogo; avanço mudou rota e mostrou o destaque correspondente após o posicionamento. O botão do menu recolhido também foi acionado por clique após corrigir sua área interativa para coincidir com a parte visível.
- O CSS de movimento reduzido foi conferido para todos os efeitos acima. Em Edge headless com `prefers-reduced-motion: reduce` emulado, a home retornou `matchMedia=true`, duração `0s` para a animação do hero e `0s` para a transição do menu. Isso valida a regra no navegador, embora ainda não substitua um teste visual em dispositivo configurado para redução.
- No **Present por clique**, o CTA “Fazer pré-cadastro” da home mobile `43:1309` abriu T02 `8:29` e a URL/cena mudaram. A home também foi vista no Present após o retoque dos menus; o clique no menu atualizado ficou inconclusivo porque a barra do Figma cobriu o controle. A inspeção de propriedades confirmou os dez destinos dos menus, tokens, Auto Layout, IDs e componentes, mas ela **não** equivale a esse clique. Percursos de tour já testados no Present estão no [registro anterior](HEM-19-formas-e-tour-2026-10-14.md), sem repetição integral após esta mudança.
- A prancha de identidade mostra os dois estados da navegação de forma estática. Na auditoria inicial havia 82 telas com barra inferior e 55 com navegação horizontal em um conjunto de centenas de quadros, muitos com conexões próprias. A migração parcial de 15/10 está detalhada abaixo. Substituí-los em todos os fluxos exigirá migrar cada hotspot e repetir os cliques no Present. Animação, quebra responsiva, foco, escala a 200%, carregamento de comentários e dados em memória só funcionam na web.

## Limites reais para entrega e lançamento

A interface continua alimentada por dados locais; não autentica, cadastra, reserva consulta nem informa avaliação médica real. O aviso superior de revisão permanece, e ações dependentes de integração mantêm contexto honesto. Antes de publicar com domínio, são necessárias integração com API/agenda, revisão dos textos jurídicos e clínicos, checagem de mídia/licenças, revisão do frontend por integrante responsável, teste em aparelhos reais e reconciliação completa das navegações antigas do Figma com o novo componente. Esta revisão não alterou backend nem banco.

## Atualização de 15/10: pacote, fluxos e critérios ainda abertos

O [PR #3](https://github.com/Jhonatan-Andrade/Hemobridge/pull/3) passou a apresentar a primeira entrega navegável em português. O aviso de uso da versão de avaliação foi incluído no fluxo de entrada e pré-cadastro; os [textos jurídicos](../legal/README.md) distinguem esse aviso das minutas para a operação futura. O pacote compilado para colegas contém o site estático, um servidor local e instruções de teste; o controle de diagnóstico de backend foi reservado ao ambiente de desenvolvimento. Build, lint e `git diff --check` passaram novamente. No pacote, foram percorridos por clique o login com dados de exemplo até o painel, as seis etapas do tour do paciente, o perfil e as áreas de médico, representante e administrador. A ausência de rolagem horizontal no pré-cadastro foi conferida em 360, 390, 768 e 1440 px. Isso não equivale à execução dos 23 casos finais da HEM-57 nem a teste de API.

A auditoria dos critérios HEM-18 encontrou botões, campos com rótulo/erro acessível, cards, menu por perfil, diálogo e uma tabela semântica de calendário no React. Ainda não há evidência de um componente de tabela reutilizável nem de biblioteca Figma completa para todos esses padrões. Os cinco níveis de necessidade aparecem com texto e cor na visão hospitalar, mas são dados locais: o contrato do backend usa os valores `CRITICO`, `BAIXO`, `ESTAVEL`, `ADEQUADO` e `NAO_INFORMADO`, sendo o último um estado inicial de leitura. O frontend usa nomes internos em inglês e não integra essas rotas. O banco define seis situações do paciente, incluindo um único `REPROVADO`; a prévia visual separa reprovação por exame e por atendimento. A origem da reprovação precisará de contrato explícito antes de se exibir essa distinção com dados reais. Nenhum contrato, banco ou backend foi alterado nesta entrega.

### Reconciliação adicional do Figma em 15/10

Os componentes editáveis de navegação lateral estão aplicados agora em **51 quadros** do arquivo existente: 43 mobile e 8 desktop. Nesta passagem foram incluídas a home mobile, variantes da comunidade (incluindo vazio, carregando e erro) e estados de acessibilidade para visitante e paciente. Cada quadro mantém a barra antiga oculta para preservar seu histórico; o conteúdo passou a começar após o trilho lateral. As ligações dos ícones das variantes da comunidade foram copiadas dos respectivos itens antigos, inclusive seus estados sem ação quando o destino já é a tela atual. Uma inspeção de propriedades confirmou nos 51 quadros o recuo de 60/76 px, a largura remanescente de 330/1364 px, as barras antigas ocultas e o acionador do menu com destino de sobreposição.

Esta inspeção **não é teste por clique no Present** dos 26 quadros migrados hoje. O clique de home para cadastro citado acima ocorreu antes desta passagem. Restam telas legadas de tour com máscaras próprias, estados de outras frentes e entradas desktop com cabeçalho horizontal; migrá-las mecanicamente poderia cobrir hotspots ou deslocar máscaras. A reconciliação integral e a validação de cada destino no Present continuam pendentes. O menu expandido de médico ainda usa posicionamento central no protótipo e pode ser cortado no Present; hospital e administrador foram ajustados para o canto superior esquerdo. A propriedade do médico é somente leitura pela API usada nesta sessão e requer ajuste no editor visual.

### Ajuste de largura mobile no Figma em 16/10

A navegação lateral de 60 px havia reduzido o viewport útil de 390 para 330 px, mas vários contêineres internos ainda mediam 390 px e cortavam títulos, botões, cartões e campos. Ajustei o Auto Layout e a largura de preenchimento dos descendentes nas 43 telas mobile com a nova barra lateral, incluindo home, variantes da comunidade e acessibilidade. A home `43:1309` agora mantém título, explicação e ações dentro da área útil; as publicações e seus textos se refluem na comunidade. Removi o destaque de navegação indevido nas telas de acessibilidade. Uma auditoria geométrica dos descendentes visíveis nessas 43 telas não encontrou mais estouro horizontal acima de 4 px, desconsiderando as gotas decorativas posicionadas intencionalmente fora dos quadros.

No **Present**, conferi visualmente a home `43:1309`, a primeira variante da comunidade `49:13044` e a acessibilidade `191:4063`; não executei cliques em todos os 43 quadros. A ação do CTA principal da home mantém a variável e o destino T02 `8:29`. O menu expandido de visitante `468:5147` continua configurado no centro do protótipo e pode ficar parcialmente fora da janela baixa do Present; seu posicionamento e o clique de abertura ainda exigem confirmação no editor. Um quadro estático de 390 px no Figma representa esse breakpoint, enquanto a adaptação contínua a 360/768 px e o movimento reduzido pertencem à implementação web.
