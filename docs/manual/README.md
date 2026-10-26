# Manual de uso do HemoBridge

Navegação e apresentação inicial atualizadas em 26/10/2026. A [revisão atual das interfaces](../testes/revisao-interfaces-2026-10-26.md) complementa as evidências históricas abaixo.

Versão preparada em 21/10/2026 e consolidada em 22/10. Os passos foram conferidos com a base `7b3ac2e4` e a navegação web executada após a reconciliação `1b64f929`. As figuras indicadas como protótipo ilustram o Figma e não comprovam a execução do aplicativo em um aparelho. As capturas identificadas como aplicação web foram obtidas no site local com contas de teste. A revisão de capturas e o ensaio da equipe estão registrados em [Revisão e evidências](revisao-e-evidencias.md).

O HemoBridge aproxima pessoas interessadas em doar sangue de instituições de saúde. A plataforma organiza cadastro, consultas, solicitações de exames, necessidades de sangue e conversas na comunidade. A equipe responsável pelo atendimento orienta cada etapa e avalia a aptidão para doar.

Para apresentar o projeto, use os [slides editáveis](../apresentacao/hemobridge-apresentacao.pptx), as [prévias e orientações de abertura](../apresentacao/README.md) e o [roteiro de apresentação](../roteiro-apresentacao.md). O ensaio coletivo continua pendente.

## Escolha seu capítulo

| Perfil | O que encontrará |
| --- | --- |
| [Visitante](visitante.md) | Conhecer a plataforma, consultar a comunidade, fazer o pré-cadastro e entrar |
| [Paciente/Doador](paciente-doador.md) | Situação, consultas, exames, perfil, notificações e busca de locais |
| [Médico](medico.md) | Instituição de trabalho, agenda, atendimento e avaliação de exames |
| [Representante de Hospital](representante.md) | Necessidades da instituição, avisos e estoque de bolsas |
| [Administrador](administrador.md) | Mapa regional, moderação e atendimento de solicitações de privacidade |

## Site e aplicativo

| Forma de acesso | Navegação |
| --- | --- |
| Site em computador | Barra lateral com ícones. Use o botão de menu para expandir ou recolher os nomes das opções |
| Site no celular | Botão de menu no cabeçalho. Abra-o e escolha a página; o menu se recolhe ao navegar |
| Aplicativo | Quatro ícones inferiores, definidos pelo perfil. O nome e o ícone indicam a área selecionada |

O site e o aplicativo usam a mesma conta, quando conectados ao mesmo serviço. O protótipo do Figma serve para conhecer as telas; ações feitas nele não gravam cadastro, horários ou exames.

Site e aplicativo abrem no Início do visitante. A explicação da plataforma e a leitura da Comunidade podem ser exploradas antes de entrar. A sessão já concluída pode acessar sua área; uma conta com apresentação pendente encontra a introdução antes das funções privadas.

Para instalar e preparar o ambiente local de testes, a equipe deve seguir o [guia de instalação e testes](../guia-de-testes.md). Este manual não contém senhas de usuários nem credenciais operacionais.

## Primeiro acesso e apresentação

1. Entre com seu e-mail e sua senha pessoal.
2. Se a conta profissional exigir a troca da senha inicial, defina a nova senha e leia o termo apresentado antes de confirmar.
3. No primeiro acesso à área autenticada, leia a introdução sobre o HemoBridge. Só depois escolha **Entendi o HemoBridge. Conhecer minha jornada**. Use **Continuar** para conhecer as etapas e áreas do seu perfil.
4. Na última etapa, escolha **Concluir e acessar**. Aguarde a confirmação para começar a usar a área.
5. Para rever a apresentação, use **Rever minha jornada** no menu do site ou no Perfil do app. A revisão pode ser fechada e preserva a tela de origem.

A apresentação inicial precisa ser concluída para liberar as funções da conta. Você pode usar **Sair e continuar depois**; a pendência será preservada. Se surgir erro ao concluir, leia a mensagem e tente novamente quando a conexão estiver disponível. Recarregar não substitui a confirmação nem abre o modal automaticamente.

## Comunidade: publicar, comentar e acompanhar

Estas instruções se aplicam aos perfis autenticados de Paciente/Doador, Médico, Representante de Hospital e Administrador.

1. Abra **Comunidade** no menu do site ou no ícone inferior do app.
2. Leia os avisos prioritários no topo e as publicações recentes. As publicações comuns são exibidas da mais recente para a mais antiga.
3. Para ler a conversa, abra **Ler publicação** ou o botão de comentários. Use **Mostrar mais comentários** quando disponível.
4. Para participar, escreva um comentário relacionado a saúde e doação, leia as normas e confirme o aceite solicitado. Escolha **Enviar comentário** uma vez e aguarde.
5. Para criar uma postagem, abra **Criar publicação**, informe título, texto e tema. Leia as normas e escolha **Publicar**. Confira a confirmação antes de sair.
6. Para acompanhar uma publicação, use o botão de curtir. Para relatar conteúdo inadequado, utilize **Denunciar** na publicação e informe o motivo solicitado.
7. Use o botão de retorno da publicação para voltar à página de onde a abriu. A navegação do seu perfil continua disponível.

O selo **Perfil Verificado** é exibido quando o cadastro profissional ou institucional atende à verificação registrada no sistema. O usuário não atribui esse selo ao próprio texto. Avisos críticos ativos de instituições verificadas podem ficar fixados no topo até o término do prazo informado.

Publique orientações gerais e informações de interesse da comunidade. Exames, CPF, telefones, informações clínicas individuais, senhas e detalhes de consultas devem permanecer nos canais privados apropriados. Uma postagem não substitui o atendimento pela equipe de saúde.

## Leitura, teclado e acessibilidade

No site, abra **Acessibilidade** para escolher o tamanho do texto. A preferência é guardada nesse navegador. O zoom do navegador também pode ser usado.

O botão **Ativar VLibras** carrega o tradutor oficial externo. Aguarde a mensagem de carregamento; se houver falha, tente novamente. A tradução automática é um recurso de apoio.

É possível percorrer os controles do site com **Tab**, retornar com **Shift + Tab** e acionar links e botões pelo teclado. A indicação de foco mostra onde você está. No aplicativo, use os recursos de tamanho de texto e leitura de tela do aparelho.

## Cuidados com a conta

- Use uma conta individual e confira o perfil e a instituição antes de registrar uma ação.
- Encerre a sessão em **Sair** ao terminar, principalmente em um dispositivo compartilhado.
- Se a sessão expirar, entre novamente antes de continuar. Confira se a última ação foi salva antes de repeti-la.
- Use **Recuperar senha** na tela de entrada. A resposta não confirma publicamente se um endereço possui conta.
- Leia **Privacidade**, **Termos de uso** e **Normas da comunidade** no rodapé do site.
- Solicitações de encerramento seguem o atendimento registrado na plataforma. Consulte o capítulo do paciente para o envio do pedido e o do administrador para a análise autorizada.

## Mensagens e situações frequentes

| Situação | Como proceder |
| --- | --- |
| **Carregando…** | Aguarde a conclusão. Evite confirmar a mesma ação várias vezes |
| **Nenhum registro** ou lista vazia | Confira perfil, instituição, filtros e período. Uma lista vazia não indica, por si só, erro de conexão |
| **Tentar novamente** | Confira a conexão e use o botão. Os dados exibidos podem precisar de atualização |
| Erro em um campo | Corrija o campo indicado e revise os demais antes de confirmar |
| Acesso negado ou opção ausente | Confira a conta e o vínculo institucional. As ações dependem das permissões do perfil |
| Informação alterada por outra pessoa | Atualize a lista e revise o estado atual antes de reenviar a ação |
| Arquivo não abre | Use a nova tentativa quando oferecida e retorne à lista. Não publique o exame na Comunidade para contornar a falha |
| Estado ou município não carrega | Use a tentativa novamente; depois de trocar o Estado, escolha o Município de novo |

## Para a equipe que mantém o manual

Os capítulos se limitam aos controles encontrados no código desta versão. O [registro de revisão](revisao-e-evidencias.md) relaciona os passos às fontes, identifica ilustrações do protótipo e aponta as capturas e funções que ainda precisam de conferência antes da edição final. Aprovação de telas, execução dos testes e publicação do serviço são registros distintos.
