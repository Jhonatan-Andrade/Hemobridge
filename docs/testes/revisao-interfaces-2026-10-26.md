# Revisão das interfaces e da jornada — 26/10/2026

## Decisão aprovada e comportamento entregue

A autora aprovou a proposta da jornada e acrescentou: “apenas certifique-se do tour nao aparecer de primeira, mas sim após a pessoa ler e entender o que é o hemobridge”. Essa aprovação orienta os clientes e o protótipo.

Site desktop, web mobile e aplicativo Flutter abrem na página do visitante. A pessoa conhece a plataforma antes de escolher cadastro ou login. Após autenticar, uma conta com apresentação pendente encontra uma introdução, sem modal automático. Somente a ação **Entendi o HemoBridge. Conhecer minha jornada** abre o roteiro obrigatório. A introdução permite explorar conteúdo público; publicar, comentar e usar funções privadas exige concluir a apresentação. Sair preserva a pendência. Concluir depende da resposta da API por conta; a revisão posterior é opcional e retorna ao contexto de origem.

Paciente/Doador tem seis etapas; os perfis profissionais têm quatro. Cadastro, pré-triagem automática, avaliação de exames e aptidão na triagem presencial são conceitos distintos. Não foi criada uma aprovação administrativa do pré-cadastro. O doador aprovado recebe orientações de etapas já percorridas e o próximo passo de encontrar onde doar. Nenhuma duração geral foi inventada para consulta, exames ou atualização de status.

## Revisão executada, passo a passo

| Etapa | Verificação | Evidência e resultado |
| --- | --- | --- |
| 1. Entrada pública | Home, explicação, acesso e introdução anterior ao modal | Home em 360 e 1440 px; nenhum tour imposto na entrada. As cinco contas de teste receberam a introdução antes da ação de iniciar. |
| 2. Paciente/Doador | Percurso de seis etapas, foco, Escape, avanço, retorno, conclusão e revisão | Paciente em 360 px concluiu sem mudar sua situação de Pré-cadastrado. A barra voltou para 5 ao retornar da última etapa. Revisão fechou no mesmo Perfil e devolveu o foco ao acionador. |
| 3. Doador aprovado | Introdução, seis etapas e painel correspondente | Em 1440 px, manteve Aprovado, tipagem validada e Encontrar onde doar; a apresentação não tornou consulta uma nova pendência clínica. Locais ofereceu busca manual e recomendações. |
| 4. Médico | Instituição, agenda, atendimento, exames e Comunidade | Percurso de quatro etapas em 1440 px; atendimento/exames em desktop e exames/Comunidade em 360 px. Mantidos vínculos e controles determinados pela API. Não foi enviada decisão clínica. |
| 5. Representante | Necessidades, registro de doação, modalidade avulsa, estoque e aviso | Quatro etapas em 360 px. Registro de doação conferido em 360 e 1440 px, com confirmação inicialmente desabilitada. Estoque e Comunidade conferidos em desktop. Não foi registrada coleta, alterado estoque ou publicado aviso. |
| 6. Administrador | Mapa, seleção de região, moderação, privacidade e Comunidade | Quatro etapas em 1440 px; mapa e privacidade também em 360 px. Cartografia do IBGE identificada, cobertura informada e solicitação vazia tratada como lista vazia. Nenhuma decisão administrativa foi enviada. |
| 7. Localidades | Estado/Município do IBGE e troca da UF | No Perfil do paciente, 27 UFs foram carregadas; RJ apresentou seus municípios. Ao trocar para SP, a seleção de município foi limpa e ficou indisponível durante a consulta, sendo depois carregados os municípios de SP. A alteração não foi salva. |
| 8. Comunidade | Cronologia, verificação, aviso prioritário, paginação, link direto e retorno | Feed de 30 publicações/240 comentários sintéticos. Aviso ativo e verificado no topo; selo médico conferido. Paginação de 20 para 30 itens; link direto à conversa 30 recarregado e foco recebido em Comentários (8). Revisão opcional preservou a conversa; voltar ao feed focou Ler publicação. Rascunho não foi enviado. |
| 9. Figma | Três pontos iniciais, introdução antes da CTA, etapas, barra e destinos | 12 introduções e 54 etapas verificadas estruturalmente; nenhuma abertura automática. Inventário final: 164 telas desktop, 188 web mobile e 221 app; 587 destinos distintos conferidos, nenhum ausente. Biblioteca contada separadamente. |
| 10. Formulários no Figma | Registro de doação identificado e avulso | Acrescentados 21 estados editáveis nas três versões, preservando as telas existentes. No Present do app: buscar → conferir → confirmar → conclusão; avulsa → selecionar tipagem → conferir → confirmar → conclusão. Selecionar a tipagem não confirma a triagem. Rolagem preservada entre conferência e confirmação. |

As medidas estáveis observadas ficaram dentro da largura disponível: por exemplo, 345 px de documento em viewport de 360 px, e 1425 px em viewport de 1440 px com barra vertical. Leituras imediatamente após redimensionar mostraram transitoriamente 353 px no mobile; a repetição após estabilizar mediu 345 px, ou 360 px na página curta sem barra vertical. Não foi identificado transbordamento horizontal persistente nas páginas especificadas. Esta é uma conferência dos percursos descritos, não uma alegação de execução manual de todas as combinações das 573 telas.

## Correções da revisão

- O prazo de avisos institucionais usava UTC como valor mínimo de um campo `datetime-local`. Agora usa o relógio local; a conversão para o instante enviado à API continua explícita. Dois testes cobrem UTC−3 e a mudança de dia em um fuso positivo. O navegador exibiu o mínimo local no formulário institucional, sem publicar aviso.
- Ao abrir comentários de uma publicação ainda ausente do feed, o foco agora acompanha a chegada daquela publicação. A dependência usa o ID carregado, evitando refoco por edição de rascunho ou atualização de reações. O link direto à conversa 30 foi exercitado após recarregar.
- Cada seletor de necessidade possui nome acessível com seu tipo sanguíneo.
- O Figma mantém progresso proporcional por etapa e uma única marca nos cabeçalhos mobile corrigidos em 25/10. Foram removidos os resíduos editoriais de demonstração na tela institucional e atrás de suas etapas do tour.
- Manual e documentação ativa foram reconciliados com a entrada pública, a introdução, seis/quatro etapas e o registro de doação. Relatórios históricos datados permanecem identificados pelo período em que foram executados.

## Verificações automatizadas desta rodada

| Verificação local | Resultado em 26/10 |
| --- | --- |
| Frontend: análise estática e nomenclatura | Aprovadas |
| Frontend: testes unitários e de renderização | 48 aprovados |
| Frontend: TypeScript e compilação Vite | Aprovados |
| Flutter: análise Dart | Nenhum problema encontrado |
| Flutter: testes de serviço/widget | 105 aprovados |
| Diff: espaços e conflitos textuais | Sem erros em `git diff --check` |

Os testes unitários/renderizados não substituem os percursos no navegador. A bateria de 292 testes unitários e 100 de integração da API pertence à revisão de 24/10, documentada separadamente; não foi reexecutada nesta rodada de interfaces e nenhuma migração foi alterada. A CI do novo commit deve ser consultada no PR.

## Ambiente, evidências e limites

Navegação executada no Edge com viewports de 360 × 800 e 1440 × 900. API local em 3000, Vite em 15174 e PostgreSQL/PostGIS de QA em 55449, banco `hemobridge_alignment_test`. Foram reutilizados somente contêineres identificados pelo rótulo de auditoria local. Não houve acesso à VM ou ao banco compartilhado.

A preparação da carga geral parou no envio de exame ao S3 local com `AccessDenied`, depois de criar as contas e os registros usados na navegação. A carga separada da comunidade concluiu. Essa preparação parcial não comprova armazenamento, envio ou abertura de exames; nenhum bloqueio de S3 foi contornado. Documentos reais, coordenadas pessoais e credenciais operacionais não foram utilizados.

Evidências desta rodada:

- [Formulário do app no Figma](evidencias/revisao-2026-10-26/figma-doacao-app.png).
- [Conferência da coleta na web mobile do Figma](evidencias/revisao-2026-10-26/figma-doacao-web-mobile.png).
- [Mapa administrativo web em 360 px](evidencias/revisao-2026-10-26/web-mapa-360.png).
- [Registro de leituras da navegação web](evidencias/revisao-2026-10-26/percursos-web.json); inclui leituras imediatas que devem ser interpretadas junto das medidas estáveis acima.

O Figma representa estados e transições, com exemplos de preenchimento; não executa autenticação, regras clínicas nem consultas ao banco. A contagem e verificação dos destinos não equivalem a percorrer manualmente cada tela de cada plataforma. O registro no Present foi validado no app e conferido estrutural/visualmente nas versões web; as variantes completas de todas as falhas do registro não foram homologadas manualmente nesta rodada. O Figma usa o cenário de entrada do paciente pré-cadastrado; o cenário de doador já aprovado com apresentação pendente foi exercitado na aplicação real e em testes dos clientes.

Android/iOS físicos, leitor de tela real, GPS, arquivos privados, integrações externas e publicação AWS não foram homologados nesta execução. A revisão editorial das telas já aprovada pela equipe e esta QA não substituem esses testes operacionais. O merge permanece sob responsabilidade do Jhonatan.
