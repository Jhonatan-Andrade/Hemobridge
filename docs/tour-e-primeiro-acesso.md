# Apresentação inicial e linguagem das interfaces

Cada conta possui uma preferência booleana `isFirstAccess`, inicialmente verdadeira quando não existe registro local. A Web persiste a conclusão em `localStorage`, na chave `hemobridge.isFirstAccess.<usuarioId>`. O app usa `SharedPreferences`, na chave `isFirstAccess.<usuarioId>`. A conclusão de uma conta não libera outra. Limpar os dados locais ou trocar de dispositivo faz a apresentação reaparecer.

O tour obrigatório começa após o login e, quando aplicável, depois da troca da senha provisória. São quatro etapas por perfil: a jornada da doação, as áreas de trabalho ou acompanhamento, Comunidade e serviços relacionados, e Perfil/privacidade. A Web explica os destinos do menu; o app explica suas quatro abas inferiores. O conteúdo evita instruções de preenchimento de campos.

Na Web, um diálogo modal nativo bloqueia o restante da página e mantém o foco no tour. Escape, clique no fundo, mudança de rota e recarregamento não registram conclusão. No Flutter, um `Dialog` é apresentado antes da montagem da área principal; `PopScope` bloqueia o retorno durante o primeiro acesso. O botão de conclusão só aparece na última etapa. O app só libera a área principal após salvar a preferência; uma falha permite tentar novamente. A Web mantém a conclusão na aba se o armazenamento local estiver indisponível, reapresentando o tour após abrir uma nova aba ou sessão sem persistência.

Após concluir, a orientação pode ser revista pelo menu da Web ou pelo Perfil do app. Nessa revisão, fechar ou voltar é permitido e não redefine o primeiro acesso. A preferência local é um controle de experiência; as permissões e a autenticação continuam sendo aplicadas pela API.

## Tempos das etapas

As duas versões consultam `GET /jornada/estimativas` para Triagem, Doação na unidade e Atualização do status. A API retorna somente estimativas de instituições ativas e verificadas. Minutos positivos, identificação da unidade e fonte são apresentados juntos. Unidades diferentes mantêm seus próprios prazos; não é calculada uma média geral sem base operacional.

Quando não há estimativa cadastrada para triagem ou atualização do status, a interface informa que o prazo é comunicado pela unidade. Nenhum tempo administrativo é inventado. Para a coleta em si, a referência geral é de cerca de dez minutos, conforme o [serviço de doação da Hemominas](https://www.hemominas.mg.gov.br/servicos/doar-sangue). Essa duração não representa o atendimento inteiro, a espera na fila ou a liberação técnica da bolsa.

Se a consulta de estimativas falhar, as orientações gerais continuam acessíveis e o usuário pode tentar novamente. A falha não impede a leitura nem a conclusão da apresentação.

## Limpeza e validação

Os componentes e estilos de tela usam os nomes das áreas e dos perfis do produto. Os endereços antigos já compartilhados continuam aceitos por um adaptador de rotas fora dos componentes de tela, direcionando para páginas com nomes completos.

Os testes verificam persistência, reinício, isolamento entre contas, percursos por perfil, prazos com fonte, retorno bloqueado, clique fora, revisão opcional, falha de gravação e leitura em 360 pixels com fonte ampliada. Execute `npm test`, `npm run lint`, `npm run check:naming` e `npm run build` em `frontend`; `flutter analyze` e `flutter test` em `app`.
