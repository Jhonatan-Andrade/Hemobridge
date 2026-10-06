# Guia de instalação — Backend Hemobridge

Passo a passo para subir a API em ambiente de desenvolvimento: banco PostgreSQL
(com PostGIS) no Docker, variáveis de ambiente, Prisma (migrations, seed e
Prisma Studio) e a caixa de e-mails de teste (Mailpit).

Todos os comandos abaixo são executados dentro da pasta `backend/`.

---

## 1. Pré-requisitos

| Ferramenta | Versão usada no projeto | Como conferir |
| --- | --- | --- |
| Node.js | 24.x | `node -v` |
| npm | o que vem com o Node | `npm -v` |
| Docker + Docker Compose | Docker 29 / Compose v2 | `docker --version` e `docker compose version` |

> **WSL2:** o Docker Desktop precisa estar aberto no Windows com a integração
> WSL ativada (*Settings → Resources → WSL Integration*). Os endereços
> `localhost:xxxx` abertos no WSL funcionam normalmente no navegador do Windows.

---

## 2. Variáveis de ambiente (`.env`)

Copie o modelo e edite:

```bash
cp .env.example .env
```

O `.env` **não é versionado** (está no `.gitignore`). Cada pessoa mantém o seu.

### 2.1 Servidor

| Variável | Exemplo | Para que serve |
| --- | --- | --- |
| `PORT` | `3333` | Porta da API. Se omitida, usa `3000`. |

### 2.2 Banco de dados (Docker + Prisma)

| Variável | Exemplo | Para que serve |
| --- | --- | --- |
| `POSTGRES_USER` | `hemobridge` | Usuário criado no container. |
| `POSTGRES_PASSWORD` | `UmaSenhaForte123` | Senha do usuário. **Obrigatória** — o `docker compose` recusa subir sem ela. |
| `POSTGRES_DB` | `hemobridge` | Nome do banco. |
| `POSTGRES_PORT` | `5434` | Porta **do seu computador** que aponta para o Postgres do container. Usamos 5434 para não conflitar com um Postgres local na 5432. |
| `DATABASE_URL` | `postgresql://hemobridge:UmaSenhaForte123@localhost:5434/hemobridge` | Conexão usada pela API e pelo Prisma. |

> ⚠️ A `DATABASE_URL` precisa bater com as quatro variáveis acima:
> `postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:<POSTGRES_PORT>/<POSTGRES_DB>`.
> Se a senha tiver caracteres especiais (`@`, `#`, `/`, `:`…), codifique-os na
> URL (ex.: `@` vira `%40`) ou use só letras e números.

### 2.3 Administrador inicial (seed)

Usadas **apenas** pelo seed (`npx prisma db seed`) para criar o primeiro
administrador (RN16).

| Variável | Exemplo | Observação |
| --- | --- | --- |
| `ADMIN_NOME` | `Administrador Hemobridge` | |
| `ADMIN_EMAIL` | `admin@hemobridge.local` | E-mail de login. |
| `ADMIN_CPF` | `52998224725` | Precisa ser um CPF **válido** (com ou sem máscara). |
| `ADMIN_SENHA_INICIAL` | `Admin12345` | Precisa seguir a RN06: 8 a 128 caracteres, com maiúscula, minúscula e número. |

> ⚠️ O valor de exemplo `troque-esta-senha` do `.env.example` **não passa** na
> validação (não tem maiúscula nem número) e o seed vai falhar com
> `ADMIN_SENHA_INICIAL inválida`. Troque por algo como `Admin12345`.
>
> A senha é **provisória**: no primeiro login o sistema exige a troca.

### 2.4 Autenticação (JWT)

| Variável | Exemplo | Observação |
| --- | --- | --- |
| `JWT_SECRET` | (gerado) | **Obrigatória** — a API não sobe sem ela. Gere com `openssl rand -base64 48`. |
| `JWT_EXPIRACAO` | `1h` | Validade do token. Padrão: `1h`. |

### 2.5 E-mail (SMTP)

Em desenvolvimento os e-mails vão para o **Mailpit** (ver seção 6), então os
valores do `.env.example` já funcionam:

| Variável | Desenvolvimento | Observação |
| --- | --- | --- |
| `SMTP_HOST` | `localhost` | |
| `SMTP_PORTA` | `1025` | Porta SMTP do Mailpit. |
| `SMTP_SEGURO` | `false` | `true` apenas para SMTP com TLS direto (porta 465). |
| `SMTP_USUARIO` / `SMTP_SENHA` | (vazios) | Só em produção, se o servidor SMTP exigir login. |
| `EMAIL_REMETENTE` | `Hemobridge <nao-responda@hemobridge.local>` | Remetente dos e-mails. |

### 2.6 Frontend, CORS e proxy

| Variável | Exemplo | Observação |
| --- | --- | --- |
| `FRONTEND_URL` | `http://localhost:5173` | Usada nos links dos e-mails (recuperação de senha etc.) e como origem padrão do CORS. |
| `CORS_ORIGENS` | `http://localhost:5173,https://app.exemplo.com` | Opcional. Origens liberadas, separadas por vírgula. |
| `TRUST_PROXY` | `1` | Opcional. Só atrás de proxy reverso (nginx, load balancer). |

### 2.7 Dados de exemplo

| Variável | Valor | Observação |
| --- | --- | --- |
| `SEED_DADOS_EXEMPLO` | `true` / `false` | Com `true`, o seed cria hospitais **fictícios** para testar. Nunca use em produção. |

### 2.8 Exemplo de `.env` pronto para desenvolvimento

```dotenv
PORT=3333

POSTGRES_USER=hemobridge
POSTGRES_PASSWORD=Hemobridge123
POSTGRES_DB=hemobridge
POSTGRES_PORT=5434
DATABASE_URL=postgresql://hemobridge:Hemobridge123@localhost:5434/hemobridge

ADMIN_NOME=Administrador Hemobridge
ADMIN_EMAIL=admin@hemobridge.local
ADMIN_CPF=52998224725
ADMIN_SENHA_INICIAL=Admin12345

JWT_SECRET=cole-aqui-a-saida-do-openssl-rand-base64-48
JWT_EXPIRACAO=1h

SMTP_HOST=localhost
SMTP_PORTA=1025
SMTP_SEGURO=false
EMAIL_REMETENTE=Hemobridge <nao-responda@hemobridge.local>

FRONTEND_URL=http://localhost:5173

SEED_DADOS_EXEMPLO=true
```

---

## 3. PostgreSQL no Docker

O arquivo `docker-compose.yml` sobe dois serviços:

| Serviço | Container | Imagem | Porta |
| --- | --- | --- | --- |
| `db` | `hemobridge-postgres` | `postgis/postgis:17-3.5` (PostgreSQL 17 + PostGIS) | `5434` → 5432 |
| `mail` | `hemobridge-mailpit` | `axllent/mailpit` | `1025` (SMTP) e `8025` (interface web) |

O Docker Compose lê o `.env` automaticamente, então crie o `.env` **antes** de
subir.

```bash
# Sobe banco e Mailpit em segundo plano
docker compose up -d

# Confere se estão rodando (o db deve aparecer como "healthy")
docker compose ps
```

Na primeira vez, o script `docker/postgres-init/20-remove-extensoes-extras.sql`
remove as extensões que a imagem PostGIS cria sozinha — assim quem cria a
extensão `postgis` (e a `unaccent`) são as migrations do Prisma.

### Comandos úteis do Docker

```bash
docker compose logs -f db        # ver logs do Postgres
docker compose stop              # parar (mantém os dados)
docker compose start             # iniciar de novo
docker compose down              # remover containers (mantém os dados no volume)
docker compose down -v           # ⚠️ remove containers E apaga o banco (volume hemobridge-pgdata)

# Abrir o psql dentro do container
docker exec -it hemobridge-postgres psql -U hemobridge -d hemobridge
```

> Se mudar `POSTGRES_USER`, `POSTGRES_PASSWORD` ou `POSTGRES_DB` depois que o
> volume já existe, o Postgres **ignora** os novos valores (eles só valem na
> criação). Nesse caso rode `docker compose down -v` e suba de novo.

---

## 4. Dependências e Prisma

### 4.1 Instalar dependências

```bash
npm install
```

O `postinstall` já roda `prisma generate`, que gera o Prisma Client em
`src/generated/prisma/` (pasta não versionada).

### 4.2 Arquivos do Prisma

| Arquivo | O que é |
| --- | --- |
| `prisma.config.ts` | Configuração do Prisma 7: caminho do schema, das migrations, comando do seed e `DATABASE_URL` (lida do `.env`). |
| `prisma/schema.prisma` | Modelos, enums e extensões (`postgis`, `unaccent`). |
| `prisma/migrations/` | Histórico de migrations SQL (inclui CHECKs, colunas geradas e índices GiST que o schema não expressa). |
| `prisma/seed.ts` | Carga inicial: tipos sanguíneos, compatibilidade, administrador e (opcional) hospitais de exemplo. |

### 4.3 Aplicar as migrations

Com o banco no ar:

```bash
npx prisma migrate dev
```

Isso cria todas as tabelas e gera o client. Em um banco novo deve terminar com
*"Your database is now in sync with your schema"*.

### 4.4 Rodar o seed

No Prisma 7 o seed **não roda sozinho** após a migration — execute:

```bash
npx prisma db seed
```

Saída esperada (aproximada):

```
Tipos sanguíneos: 8; pares de compatibilidade: 27
Administrador inicial criado: admin@hemobridge.local
Hospitais de exemplo: ...        # só com SEED_DADOS_EXEMPLO=true
```

O seed pode ser rodado várias vezes sem duplicar dados (se o administrador já
existir, ele avisa e não faz nada).

### 4.5 Prisma Studio (ver e editar o banco no navegador)

```bash
npm run db:studio        # equivale a: npx prisma studio
```

Abre em **http://localhost:5555**. Ali dá para navegar pelas tabelas
(`usuario`, `hospital`, `tipo_sanguineo`…), filtrar, editar e excluir
registros. Para encerrar, `Ctrl + C` no terminal.

> No WSL, se não abrir sozinho, acesse `http://localhost:5555` no navegador do
> Windows.

### 4.6 Comandos do Prisma no dia a dia

| Comando | Quando usar |
| --- | --- |
| `npm run db:generate` | Regerar o client (ex.: depois de um `git pull` que mudou o schema). |
| `npm run db:migrate` | Aplicar migrations novas / criar uma migration após alterar o `schema.prisma` (pede um nome). |
| `npx prisma migrate dev --name minha_mudanca` | Criar migration já com nome. |
| `npx prisma migrate status` | Ver quais migrations foram aplicadas. |
| `npx prisma migrate reset` | ⚠️ Apaga **todos** os dados, reaplica as migrations. Depois rode `npx prisma db seed`. |
| `npx prisma migrate deploy` | Produção: só aplica migrations existentes, sem criar novas. |
| `npm run db:studio` | Abrir o Prisma Studio. |

---

## 5. Rodar a API

```bash
npm run start:dev        # modo desenvolvimento, recarrega ao salvar
```

A API sobe em **http://localhost:3333** (ou na `PORT` do `.env`).

Teste rápido de login com o administrador do seed:

```bash
curl -X POST http://localhost:3333/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hemobridge.local","senha":"Admin12345"}'
```

A documentação das rotas está em `docs/rotas.html` (abra o arquivo no navegador).

Outros comandos:

```bash
npm test                 # testes unitários
npm run test:e2e         # testes e2e
npm run lint             # lint
npm run build && npm run start:prod   # build de produção
```

---

## 6. Onde ver os e-mails (Mailpit)

Em desenvolvimento **nenhum e-mail sai para a internet**: a API envia tudo para
o Mailpit, que sobe junto no `docker compose up -d`.

👉 Abra **http://localhost:8025**

Lá aparecem, como numa caixa de entrada, todos os e-mails enviados pela API —
recuperação de senha, senha provisória de médicos/usuários criados pelo
representante ou administrador etc. —, para **qualquer** destinatário. Dá para
ver o HTML, o texto puro e clicar nos links (que apontam para `FRONTEND_URL`).

Se o e-mail não aparecer:

1. `docker compose ps` — o container `hemobridge-mailpit` está rodando?
2. No `.env`: `SMTP_HOST=localhost`, `SMTP_PORTA=1025`, `SMTP_SEGURO=false`.
3. Veja o terminal da API: falhas de envio aparecem no log.

Para usar um SMTP real (produção), troque `SMTP_HOST`, `SMTP_PORTA`,
`SMTP_SEGURO` e preencha `SMTP_USUARIO`/`SMTP_SENHA`.

---

## 7. Resumo (primeira instalação)

```bash
cd backend
cp .env.example .env           # e ajuste as senhas (seção 2)
docker compose up -d           # Postgres + Mailpit
npm install                    # dependências + prisma generate
npx prisma migrate dev         # cria as tabelas
npx prisma db seed             # tipos sanguíneos + admin
npm run start:dev              # API em http://localhost:3333
```

| O quê | Endereço |
| --- | --- |
| API | http://localhost:3333 |
| Prisma Studio (`npm run db:studio`) | http://localhost:5555 |
| E-mails (Mailpit) | http://localhost:8025 |
| PostgreSQL | `localhost:5434` |

---

## 8. Problemas comuns

| Sintoma | Causa provável / solução |
| --- | --- |
| `defina POSTGRES_PASSWORD no .env` ao subir o Docker | Falta o `.env` ou a variável `POSTGRES_PASSWORD`. |
| `port is already allocated` | Outra coisa usa a porta 5434, 1025 ou 8025. Mude `POSTGRES_PORT`, `MAILPIT_SMTP_PORT` ou `MAILPIT_UI_PORT` no `.env` (e ajuste `DATABASE_URL`/`SMTP_PORTA`). |
| `P1001: Can't reach database server` | Banco não está no ar (`docker compose ps`) ou a porta da `DATABASE_URL` está errada. |
| `P1000: Authentication failed` | Usuário/senha da `DATABASE_URL` diferente do container — ou o volume foi criado com outra senha (ver nota da seção 3). |
| `Cannot find module '.../generated/prisma/...'` | Rode `npm run db:generate`. |
| Seed: `ADMIN_SENHA_INICIAL inválida` | A senha não segue a RN06 (seção 2.3). |
| Seed: `ADMIN_CPF inválido` | Use um CPF com dígitos verificadores válidos. |
| API não sobe: `Configuration key "JWT_SECRET" does not exist` | Defina `JWT_SECRET` no `.env`. |
