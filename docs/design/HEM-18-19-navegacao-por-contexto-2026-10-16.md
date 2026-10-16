# HemoBridge — navegação por contexto (16/10/2026)

Esta decisão substitui a descrição de navegação mobile da [revisão de 14/10](HEM-18-19-identidade-navegacao-2026-10-14.md). São três experiências distintas, com os mesmos destinos por perfil e com a marca completa no topo:

| Contexto | Padrão final | Comportamento |
| --- | --- | --- |
| Site no navegador desktop, a partir de 900 px | Barra lateral esquerda com ícones, recolhida em 76 px; botão de três traços a expande para 238 px | O conteúdo acompanha a largura; a rota atual tem estado visível. `Esc` recolhe e devolve o foco ao botão. |
| Site no navegador mobile, até 899 px | Somente ícone de menu no cabeçalho; sem barra lateral persistente e sem navegação inferior | O menu abre abaixo do cabeçalho, mostra rótulos e se fecha ao escolher destino, clicar fora ou pressionar `Esc`. O primeiro destino recebe foco. |
| Protótipo de app mobile no Figma, 390 × 844 px | Barra inferior com ícones e rótulos nos quadros principais; sem trilho lateral | Visitante: Início, Comunidade e Entrar. Paciente: Início, Comunidade, Meu painel e Perfil. Formulários, tour e estados técnicos podem ocultar a barra para priorizar a tarefa. |

Os destinos do React continuam definidos por `navigationItems.ts`; médico, hospital e administrador mantêm seus subdestinos próprios. O protótipo do Figma representa a interface do **app**, não a quebra responsiva do navegador. O React permanece a referência executável para 360, 390, 768 e 1440 px.

## Antes e depois verificável

| Vista | Antes | Depois |
| --- | --- | --- |
| Web desktop | [Captura anterior com trilho lateral](qa-2026-10-14/home-1440.png) | [Barra lateral atual, comunidade](qa-2026-10-16/web-desktop-1440.png) |
| Web mobile | [Captura anterior com trilho lateral estreito](qa-2026-10-14/home-360.png) | [Home atual com ícone de menu](qa-2026-10-16/web-mobile-390.png) |
| App mobile no Figma | Trilho lateral cobria 60 px de um quadro de 390 px; a barra inferior existente estava oculta | [Painel no Present com barra inferior](qa-2026-10-16/figma-app-mobile-patient-present.png) |

No Figma existente, as barras antigas foram **reexibidas** em 79 quadros mobile de navegação e os trilhos mobile anteriores foram ocultos, sem apagar componentes nem reconectar para destinos diferentes. Os demais quadros de 390 px incluem etapas focadas de cadastro, autenticação, tour e estados de apoio. Nas 246 ligações visíveis dessas barras, `resetScrollPosition` está ativo. Isso resolve a entrada da comunidade no meio do feed após sair da home, observada em teste por clique.

## Movimento e acessibilidade

| Elemento | Gatilho | Duração | Deslocamento | Easing | Sem movimento |
| --- | --- | --- | --- | --- | --- |
| Barra lateral e recuo do site desktop | Abrir/recolher | 260 ms | Largura 76 ↔ 238 px; margem correspondente | `cubic-bezier(.2,.8,.2,1)` | Troca imediata |
| Rótulos da barra desktop | Abrir/recolher | Opacidade 140 ms; largura até 230 ms | Sem translação | `ease` / curva acima | Estado final imediato |
| Menu do navegador mobile | Abrir pelo ícone | 180 ms | −6 → 0 px; opacidade 0 → 1 | `cubic-bezier(.2,.8,.2,1)` | Exibição imediata |
| Links e botões do menu | Hover ou foco | 160 ms | Sem deslocamento | `ease` | Cor final imediata |
| Barra inferior do app no Figma | Clicar em um destino | Sem animação temporal | Nova tela inicia no topo | Não aplicável | Mesmo resultado |

Todas as transições CSS acima estão sob `prefers-reduced-motion: no-preference`. O menu funciona sem animação; seus links permanecem acessíveis por teclado. As trilhas de keyframe das homes mobile `43:1309` e desktop `43:1340` foram removidas do Present porque a reprodução continuava em loop mesmo após selecionar “Play once” no editor; os quadros e os estados visuais ficaram preservados. O site mantém sua entrada curta em CSS e a alternativa sem movimento. Nenhuma dependência de animação foi adicionada.

## Verificação desta correção

- React: build e lint passaram; o menu mobile abriu por clique, moveu foco para o primeiro link e fechou com `Esc`, devolvendo foco ao botão. O desktop expandiu e recolheu a barra com `Esc`.
- Largura: a home não excedeu o viewport a 360 e 768 px, e a home a 390 px com texto em 200% permaneceu sem rolagem horizontal. A preferência foi restaurada para 100% após o teste.
- Present **por clique**: Home mobile `43:1309` → Comunidade `49:13034` abriu no topo; painel do paciente `8:518` → Perfil `8:751` abriu no topo. Isto é evidência de clique, além da inspeção das propriedades dos 246 links.
- Present **por observação temporal**: duas capturas da home após intervalo superior a 3 s produziram os mesmos bytes; a inspeção confirmou zero nós com trilhas de keyframe nas duas homes. Isso valida as cenas verificadas, não todos os fluxos do arquivo.

## Limites e próximos cuidados

O Figma é uma demonstração estática de quadros de 390 px; não simula responsividade contínua, foco real, zoom a 200% nem `prefers-reduced-motion`. As entradas desktop legadas do Figma, como a home `43:1340`, ainda apresentam o antigo acionador de sobreposição; sua migração visual total para a barra lateral exigirá ajustar composições fixas de 1440 px e repetir os cliques no Present. A navegação do **site desktop executável** já usa a barra lateral. O conteúdo do app continua protótipo: não há integração nativa nem autenticação/agenda reais.
