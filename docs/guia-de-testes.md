# Testar o HemoBridge no notebook

Este pacote contém o código do site, da API e do aplicativo. As ações autenticadas consultam a API e persistem no PostgreSQL. Abrir o HTML diretamente não inicia esses serviços. Não é necessário acessar a VM do laboratório para testar localmente.

## Preparação

Instale Node.js 24 e Docker Desktop e mantenha o Docker aberto. Extraia o ZIP em uma pasta própria, abra um terminal na raiz e execute:

```powershell
node tools/prepare-local-test.mjs
cd backend
npm ci
docker compose up -d --wait
npm run db:setup
npm run db:seed:teste
npm run db:seed:comunidade
npm run start:dev
```

O preparador gera segredos locais, escolhe o banco `hemobridge_teste` e recusa sobrescrever um `.env` existente. Banco, armazenamento e e-mails usam respectivamente as portas 5436, 8335, 1027/8027. Se essas portas ou os nomes dos containers já estiverem em uso, prepare outro ambiente seguindo o guia do backend; preserve os volumes e as configurações existentes. Não execute as cargas de testes na VM compartilhada ou em produção.

Em outro terminal, na raiz do pacote:

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Abra `http://localhost:5174`. A API permanece aberta no primeiro terminal. Os e-mails de recuperação ficam na caixa local `http://localhost:8027`, sem envio a destinatários externos. O tour obrigatório termina somente na última etapa, grava a conclusão por conta no servidor e pode ser reaberto pelo menu. Utilize somente dados de testes ao experimentar cadastro, comentários e anexos.

O preparador autoriza explicitamente `http://localhost:5174` e `http://127.0.0.1:5174`. Para uma configuração local já existente, ajuste `CORS_ORIGENS` no `backend/.env` para esses dois endereços e reinicie a API. A mensagem “Origem da requisição não autorizada” ao salvar uma ação indica que o endereço usado no navegador não consta nessa lista. Em produção, autorize somente os domínios HTTPS publicados.

## Contas e roteiro

Senha das contas abaixo: `Teste2026hb`. São exclusivas do banco de testes e não acompanham uma instalação de produção.

| Perfil | Login | Conferir |
|---|---|---|
| Paciente/Doador | paciente.teste@hemobridge.local | Painel, perfil, Estado/Município, locais, comunidade e comentários |
| Doador aprovado | doador.teste@hemobridge.local | Situação, notificações e jornada disponível |
| Médico | medico.teste@hemobridge.local | Agenda, instituição, atendimentos atribuídos, exames e comunidade |
| Representante de Hospital | representante.teste@hemobridge.local | Necessidades, estoque e avisos da comunidade |
| Administrador | admin.teste@hemobridge.local | Mapa regional, informações verificadas, moderação e comunidade |

Para conferir as correções: abra uma publicação a partir do Início e volte à mesma origem; repita na Comunidade. Conclua o tour, recarregue e entre na mesma conta em outro navegador. Abra a recuperação pela mensagem da caixa local e confira a tela de nova senha. Notificações devem ter e-mails genéricos; detalhes ficam na área autenticada. No menu administrativo, Privacidade reúne solicitações de encerramento com fundamentação e revisão de guarda. Teste esse encerramento somente com uma conta descartável própria, pois ele revoga seu acesso. A execução automatizada equivalente está em `backend/test/audit-remediation.e2e-spec.ts`.

Teste o site com janela larga e estreita: desktop com barra lateral; web mobile com ícone para abrir o menu. Na comunidade, confira o aviso fixado, os selos, os comentários e o carregamento de mais publicações. Publique uma mensagem geral sobre doação, recarregue e confirme a persistência. Exames e operações clínicas seguem as permissões e a situação de cada conta.

O estoque começa sem bolsas cadastradas, sem simular disponibilidade. Registre uma bolsa pelo representante para testar quarentena, liberação com referência técnica e demais transições. Hospitais desta carga são reservados a testes e não indicam serviços reais de atendimento.

## Aplicativo e Figma

O app está em `app/`. Exige Flutter e os SDKs da plataforma; siga o README dessa pasta para configurar a URL HTTPS da API. A navegação é inferior. Cadastro, perfil do paciente, consultas, envio de exames, agenda/atendimento/avaliação médica e necessidades/estoque possuem formulários nativos ligados à API. Confira o [roteiro e os limites da homologação nativa](homologacao-fluxos-nativos.md) e o [registro dos testes em Android real](homologacao-android-2026-10-19.md). O ZIP contém código; não inclui APK nem assinatura de distribuição. A compilação Android já foi validada na integração contínua; o APK de teste fica nos artefatos da execução correspondente no GitHub Actions. A distribuição pública ainda exige assinatura de lançamento e homologação dos cenários restantes.

No [Figma oficial](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge), escolha o fluxo de desktop, web mobile ou aplicativo e o perfil correspondente. O Figma apresenta layouts e interações; persistência, autenticação e GPS são executados pelo código.

Para encerrar os serviços locais sem apagar dados, use `docker compose stop` dentro de backend. Não remova volumes para resolver uma falha de conexão. Nunca compartilhe `.env`, exames, dumps, certificados ou chaves SSH junto com o código.
