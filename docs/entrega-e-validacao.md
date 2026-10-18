# Entrega e validação — 17 de outubro de 2026

## Resultado implementado

O site consulta a API para autenticação, cadastro, perfil, jornada clínica, instituições, necessidades, estoque e comunidade. Os dados deixaram de depender de alterações em memória no navegador. As permissões são verificadas no servidor por usuário e instituição. Publicações e comentários são paginados, avisos institucionais verificados têm fixação com expiração e selos são determinados pelo cadastro profissional.

O front-end usa nomes de arquivo em kebab-case, componentes React com convenção de tipos e funções/variáveis em camelCase. Os seletores encadeados consultam Estados e Municípios do IBGE. O tour de primeiro acesso bloqueia a interface, distingue os quatro perfis e persiste a conclusão local por usuário. O Flutter compartilha identidade visual, contratos e estrutura de navegação, com GPS mediante permissão e alternativa manual pelo IBGE.

O Figma concentra as interfaces oficiais em uma página. As versões anteriores foram retiradas do arquivo ativo. As interfaces usam Poppins, magenta, petróleo e cantos arredondados. Há navegação lateral no desktop, acionador de menu na web mobile e quatro destinos inferiores por perfil no aplicativo. As publicações compartilhadas preservam o contexto de navegação. A auditoria estrutural não encontrou destinos removidos, siglas internas de páginas ou textos de apresentação local; os tours não têm transições automáticas em ciclo. Os fluxos principais também foram conferidos em Present; essa inspeção é distinta dos testes de integração do produto.

## Evidências de validação

| Verificação | Resultado |
|---|---|
| Site | Compilação, lint e convenção de nomes aprovados; quatro testes de expiração e ordenação do feed |
| API | Compilação e lint aprovados; 216 testes unitários e 58 de integração aprovados |
| Banco | Nove migrações aplicadas em PostgreSQL/PostGIS descartável; SQL consolidado aplicado separadamente em banco vazio |
| Autorização | Testes cobrem isolamento institucional, sessão, publicação por perfis, consentimento e operações de estoque |
| Arquivos | Envio e recuperação de exames validados com armazenamento S3 local e cifra da aplicação |
| Imagens Docker | API e site compilados e executados localmente com usuário não root e sistema de arquivos somente leitura |
| Aplicativo | Análise do Dart sem problemas e dois testes aprovados, incluindo apresentação obrigatória e tela de 360 px com texto ampliado |
| Navegador | Layouts em 360 e 1440 px sem rolagem horizontal; IBGE, primeiro acesso, menu e apresentação de comunidade conferidos |

Os testes foram executados em ambientes locais descartáveis. Não houve alteração de banco compartilhado da VM, uso da chave SSH ou provisionamento na AWS. A configuração de integração contínua acompanha o repositório; o resultado remoto deve ser conferido no pull request.

## Código e dados recebidos

O bundle foi incorporado com os 15 commits posteriores à base integrada, preservando a autoria. Ele contém esquema, migrações, API e ferramentas de infraestrutura; não contém o banco em execução, os arquivos de exames, backups ou o estado dos serviços da VM. Conforme a mensagem recebida, o banco compartilhado não recebeu essas migrações, enquanto os bancos de desenvolvimento têm outra carga. O conteúdo efetivo da VM não foi acessado nem certificado nesta entrega.

Uma VM é uma forma de executar serviços; o código também pode usar containers locais. Para produção, o plano propõe RDS privado criptografado, ECS/Fargate, S3 privado com KMS, SES e HTTPS. Consulte [banco](../database/README.md) e [arquitetura AWS](../infra/aws/README.md).

## Pendências para publicação

| Item | Próximo passo |
|---|---|
| Revisão e merge | Jhonatan revisa o pull request; não houve merge automático |
| Infraestrutura | Provisionar AWS, domínio, certificados, segredos e contas operacionais; validar carga, restauração e monitoramento |
| Operação e privacidade | Informar responsável jurídico e canal de privacidade reais, formalizar tratamento/guarda dos dados e revisar os textos com profissional habilitado |
| Cadastros institucionais | Verificar instituições, vínculos e registros profissionais antes de aceitar dados reais |
| Aplicativo | Finalizar cadastro nativo, edição completa do perfil, agendamento/reagendamento, envio de exames e formulários de estoque/agenda |
| Distribuição | Android exige SDK e assinatura; iOS exige macOS/Xcode e assinatura. Não foi gerado APK/IPA |
| Migração da VM | Inventariar separadamente dumps e objetos autorizados, verificar hashes e ensaiar restauração; não importar a carga de testes |
| Jira | Atualização remota não confirmada: o conector apresentou falha de verificação da organização; não foram marcadas tarefas como concluídas |

A base de código está estruturada para homologação e preparação de produção. A aprovação de código não substitui a conclusão dessas dependências operacionais e dos fluxos nativos pendentes.
