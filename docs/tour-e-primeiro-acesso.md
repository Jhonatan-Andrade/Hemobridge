# Apresentação inicial e linguagem das interfaces

Cada conta possui a flag booleana `isFirstAccess`, inicialmente verdadeira no PostgreSQL. A API devolve a flag e a versão vigente em `GET /auth/me`. A Web e o app registram a conclusão em `POST /auth/tour/conclusao`, enviando somente a versão; a conta é determinada pela sessão autenticada. A conclusão é idempotente e grava versão e instante. Trocar de dispositivo ou limpar as preferências do navegador não desfaz a conclusão. Uma nova versão obrigatória volta a exigir a apresentação.

Site, web mobile e aplicativo abrem no Início do visitante. Login e tour não são telas iniciais. Após o login e a eventual troca da senha provisória, a conta com apresentação pendente encontra primeiro uma introdução embutida na área: o propósito do HemoBridge, o papel daquele perfil e os recursos disponíveis. Somente **Entendi o HemoBridge. Conhecer minha jornada**, depois das explicações, abre o tour. Não há abertura por tempo, rolagem ou simples autenticação.

Paciente/Doador tem seis etapas: pré-cadastro, pré-triagem/agendamento, consulta, exames e avaliação quando solicitados, locais/triagem presencial/coleta e acompanhamento da conta. Médico, Representante de Hospital e Administrador têm quatro etapas próprias. A Web explica os destinos do menu; o app explica suas abas inferiores e ações específicas. O roteiro distingue cadastro, orientação automática e aptidão clínica; não cria aprovação administrativa do pré-cadastro que a API não possui. Doador aprovado recebe contexto de etapas já percorridas.

Na Web, o diálogo modal nativo bloqueia o restante da página, cicla Tab/Shift+Tab entre controles e recupera o foco se houver tentativa de saída. No Flutter, o diálogo abre sobre a introdução por ação explícita; `PopScope` bloqueia o retorno no modo obrigatório. Escape e clique no fundo não fecham esse modo. **Sair e continuar depois** encerra a sessão sem concluir. Mudança de rota ou recarregamento preserva a pendência e retorna à introdução, sem abrir o modal automaticamente. Conteúdo público continua acessível; funções privadas e participação na Comunidade aguardam a conclusão. O botão de conclusão só aparece na última etapa. Ambos aguardam a confirmação do servidor; falha mantém a pendência e permite nova tentativa. Nenhuma preferência local pode liberar uma conta.

Após concluir, a orientação pode ser revista pelo menu da Web ou pelo Perfil do app. Nessa revisão, fechar ou voltar é permitido e não redefine o primeiro acesso. A flag controla a experiência dos clientes; a API aplica autorização independentemente do tour e não usa essa flag como permissão clínica.

## Tempos das etapas

O roteiro web informa que os prazos variam conforme a instituição. O Flutter pode apresentar estimativas institucionais nas etapas marcadas para isso por `GET /jornada/estimativas`. A API retorna somente estimativas de instituições ativas e verificadas. Quando exibidos, minutos positivos, unidade e fonte permanecem juntos; não é calculada uma média geral sem base operacional.

Quando não há estimativa cadastrada para triagem ou atualização do status, a interface informa que o prazo é comunicado pela unidade. Nenhum tempo administrativo é inventado. Para a coleta em si, a referência geral é de cerca de dez minutos, conforme o [serviço de doação da Hemominas](https://www.hemominas.mg.gov.br/servicos/doar-sangue). Essa duração não representa o atendimento inteiro, a espera na fila ou a liberação técnica da bolsa.

Se a consulta de estimativas falhar, as orientações gerais continuam acessíveis e o usuário pode tentar novamente. A falha não impede a leitura nem a conclusão da apresentação.

## Limpeza e validação

Os componentes e estilos de tela usam os nomes das áreas e dos perfis do produto. Os endereços antigos já compartilhados continuam aceitos por um adaptador de rotas fora dos componentes de tela, direcionando para páginas com nomes completos.

Os testes verificam persistência, reinício, isolamento entre contas, percursos por perfil, prazos com fonte, retorno bloqueado, clique fora, revisão opcional, falha de gravação e leitura em 360 pixels com fonte ampliada. Execute `npm test`, `npm run lint`, `npm run check:naming` e `npm run build` em `frontend`; `flutter analyze` e `flutter test` em `app`.
