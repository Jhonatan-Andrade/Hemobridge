# HemoBridge

Plataforma que conecta pessoas interessadas em doar sangue a instituições de saúde. Reúne pré-cadastro, consulta, exames privados, necessidades de sangue, estoque institucional e comunidade. A aptidão para doar depende de avaliação profissional e da triagem do serviço de hemoterapia.

## Aplicações e responsabilidades

| Diretório | Responsabilidade |
|---|---|
| frontend | Site React, TypeScript e Vite; navegação lateral no desktop e menu recolhido na web mobile |
| app | Aplicativo Flutter/Dart; navegação inferior e identidade visual compartilhada |
| backend | API NestJS; autenticação, autorização, validação, auditoria e regras de negócio |
| database | SQL consolidado e documentação da persistência |
| infra/aws | Plano de produção, imagens Docker e configuração de tarefas ECS |
| infra/vm | Ferramentas do ambiente de desenvolvimento do laboratório |
| docs | Requisitos, documentação jurídica e guia das interfaces oficiais |

Paciente/Doador acompanha a própria jornada. Médico acessa suas agendas, instituições e atendimentos. Representante de Hospital atualiza necessidades e estoque da instituição. Administrador gerencia informações administrativas, mapa agregado e moderação. Todos os perfis autenticados participam da comunidade conforme suas normas. O servidor determina as permissões.

## Desenvolvimento local

Instale Node.js 24, Docker e Flutter. Em backend, copie .env.example para .env, configure segredos locais, execute npm ci, docker compose up -d, npm run db:setup e npm run start:dev. A API atende a porta 3000. Em frontend, execute npm ci e npm run dev -- --host 127.0.0.1 --port 5174. O Vite encaminha /api para a API local. O site exige API e banco disponíveis para as ações autenticadas.

O seed normal cadastra somente os tipos sanguíneos, compatibilidade e, quando configurado, o administrador inicial. Dados de testes têm comando separado e não devem ser importados em produção. Consulte backend/docs/install.md. Não utilize o banco compartilhado para rodar testes automatizados.

## Validação e publicação

Frontend: npm run lint, npm run check:naming e npm run build. Backend: npm run lint, npm run build e npm test. Os testes de integração exigem PostgreSQL/PostGIS descartável. App: flutter analyze e flutter test. Os detalhes de assinatura e execução estão em app/README.md.

O plano em infra/aws/README.md descreve RDS criptografado, ECS/Fargate, S3 privado, HTTPS e segredos por identidade de execução. Os templates não criam recursos na AWS. A publicação exige domínio, conta AWS, identidade jurídica, canal de privacidade, segredos, assinatura do app e homologação operacional. O build de publicação do site bloqueia a ausência de identificação jurídica e contato.

## Referências oficiais

- Interfaces: https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge
- Banco: database/README.md
- Arquitetura: infra/aws/README.md
- Termos e privacidade: docs/legal/README.md
- Interfaces e navegação: docs/design/interfaces-oficiais.md

O código recebido por bundle foi integrado em uma branch própria, preservando a autoria dos commits. Banco, arquivos de exames, código e chave SSH são entregas distintas: o bundle não contém o conteúdo da VM. A revisão e o merge permanecem a cargo de Jhonatan.
