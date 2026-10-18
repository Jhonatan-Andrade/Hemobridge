# Apresentação inicial e linguagem das interfaces

Cada conta possui a flag booleana `isFirstAccess`, inicialmente verdadeira no PostgreSQL. A API devolve a flag e a versão vigente em `GET /auth/me`. A Web e o app registram a conclusão em `POST /auth/tour/conclusao`, enviando somente a versão; a conta é determinada pela sessão autenticada. A conclusão é idempotente e grava versão e instante. Trocar de dispositivo ou limpar as preferências do navegador não desfaz a conclusão. Uma nova versão obrigatória volta a exigir a apresentação.

O tour obrigatório começa após o login e, quando aplicável, depois da troca da senha provisória. São quatro etapas por perfil: a jornada da doação, as áreas de trabalho ou acompanhamento, Comunidade e serviços relacionados, e Perfil/privacidade. A Web explica os destinos do menu; o app explica suas quatro abas inferiores. O conteúdo evita instruções de preenchimento de campos.

Na Web, um diálogo modal nativo bloqueia o restante da página, cicla Tab/Shift+Tab entre controles e recupera o foco se houver tentativa de saída. Escape, clique no fundo, mudança de rota e recarregamento não registram conclusão. No Flutter, um `Dialog` é apresentado antes da montagem da área principal; `PopScope` bloqueia o retorno durante o primeiro acesso. O botão de conclusão só aparece na última etapa. Ambos aguardam a confirmação do servidor; falha de rede ou gravação mantém o bloqueio e permite tentar novamente. Nenhuma preferência local pode liberar uma conta.

Após concluir, a orientação pode ser revista pelo menu da Web ou pelo Perfil do app. Nessa revisão, fechar ou voltar é permitido e não redefine o primeiro acesso. A flag controla a experiência dos clientes; a API aplica autorização independentemente do tour e não usa essa flag como permissão clínica.

## Tempos das etapas

As duas versões consultam `GET /jornada/estimativas` para Triagem, Doação na unidade e Atualização do status. A API retorna somente estimativas de instituições ativas e verificadas. Minutos positivos, identificação da unidade e fonte são apresentados juntos. Unidades diferentes mantêm seus próprios prazos; não é calculada uma média geral sem base operacional.

Quando não há estimativa cadastrada para triagem ou atualização do status, a interface informa que o prazo é comunicado pela unidade. Nenhum tempo administrativo é inventado. Para a coleta em si, a referência geral é de cerca de dez minutos, conforme o [serviço de doação da Hemominas](https://www.hemominas.mg.gov.br/servicos/doar-sangue). Essa duração não representa o atendimento inteiro, a espera na fila ou a liberação técnica da bolsa.

Se a consulta de estimativas falhar, as orientações gerais continuam acessíveis e o usuário pode tentar novamente. A falha não impede a leitura nem a conclusão da apresentação.

## Limpeza e validação

Os componentes e estilos de tela usam os nomes das áreas e dos perfis do produto. Os endereços antigos já compartilhados continuam aceitos por um adaptador de rotas fora dos componentes de tela, direcionando para páginas com nomes completos.

Os testes verificam persistência, reinício, isolamento entre contas, percursos por perfil, prazos com fonte, retorno bloqueado, clique fora, revisão opcional, falha de gravação e leitura em 360 pixels com fonte ampliada. Execute `npm test`, `npm run lint`, `npm run check:naming` e `npm run build` em `frontend`; `flutter analyze` e `flutter test` em `app`.
