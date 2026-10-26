# 🩸 Hemobridge

Plataforma web de **agendamento de doação de sangue em hemocentros**. O paciente escolhe um hemocentro, vê os horários com vagas e agenda. O hemocentro define quantas pessoas atende em cada horário, registra os dados de cada doação, e esse histórico fica disponível para os outros hemocentros onde o paciente vier a doar.

## Problema

Hemocentros recebem doadores sem previsão, com filas em alguns horários e salas vazias em outros, e cada um conhece só as doações feitas ali. O Hemobridge organiza a doação pelo agendamento com vagas, mostra de quais tipos sanguíneos cada hemocentro precisa e leva o histórico do doador entre os hemocentros, com consentimento e auditoria.

## Como funciona

```
Paciente agenda no hemocentro → Médico registra a doação → Admin do hemocentro ativa a conta → histórico compartilhado
```

1. O paciente cria a conta, aceitando o termo LGPD (que inclui o compartilhamento entre hemocentros). A conta nasce **pendente**.
2. Em **Doar**, escolhe o hemocentro, o dia e um horário com vaga.
3. No dia, o **médico** vê os agendados na agenda e registra o atendimento: compareceu, doou ou não, tipo sanguíneo, motivo e observações.
4. O **Admin do hemocentro** ativa a conta; o tipo sanguíneo aparece no painel do paciente.
5. Em outro hemocentro onde o paciente agendar, a equipe vê o histórico, sempre com o hemocentro de origem de cada registro, e o acesso fica auditado.

## Perfis de usuário

| Perfil | O que faz |
| --- | --- |
| 🧑 Paciente | Cria a conta, agenda, cancela e reagenda doações e acompanha o painel (status da conta, tipo sanguíneo, histórico). Pode pedir a exclusão dos dados. |
| 👩‍⚕️ Médico (equipe do hemocentro) | Vê a agenda do dia por horário, registra cada doação e consulta o histórico do paciente. |
| 🏥 Admin do hemocentro (equipe do hemocentro) | Cria horários e vagas (inclusive em lote semanal), informa as necessidades por tipo sanguíneo, cadastra os médicos e ativa as contas dos pacientes. |
| 🛠️ Administrador da plataforma | Cadastra e desativa hemocentros e cria o Admin inicial de cada um. |

O paciente usa três áreas: **Apresentação** (`/`, pública), **Painel** (`/painel`) e **Doar** (`/doar`, pública; agendar exige login).

## Stack

- **Frontend:** React 19, Vite, TypeScript, React Router e Tailwind CSS
- **Backend:** NestJS 12, Prisma 7, JWT e Argon2id
- **Banco de dados:** PostgreSQL 17

## Estrutura do repositório

```
Hemobridge/
├── assets/         # Imagens, logos e recursos visuais do projeto
├── frontend/       # Aplicação React (interface do usuário)
├── backend/        # API NestJS (regras de negócio), Prisma (schema, migrations e seed) e testes
├── database/       # Docker Compose avulso do PostgreSQL
└── docs/           # Requisitos, DER e documentação
```

## Documentação

- Requisitos (perfis, fluxo, RFs, RNFs, compartilhamento e LGPD): [`docs/requisitos.md`](./docs/requisitos.md)
- Modelo de dados (DER em Mermaid): [`docs/der.md`](./docs/der.md)
- Rotas da API: [`backend/docs/rotas.html`](./backend/docs/rotas.html) (abra no navegador)
- Instalação detalhada do backend: [`backend/docs/install.md`](./backend/docs/install.md)
- Telas e decisões do frontend: [`frontend/README.md`](./frontend/README.md)

## Como rodar localmente

Requisitos: Node 20 ou superior e Docker.

```bash
# backend (API em http://localhost:3333/api)
cd backend
cp .env.example .env          # ajuste senhas e segredos
docker compose up -d          # PostgreSQL + Mailpit (e-mails em http://localhost:8025)
npm install
npx prisma migrate deploy
npx prisma db seed            # tipos sanguíneos + administrador da plataforma
npm run start:dev

# frontend (http://localhost:5173)
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:3333/api
npm install
npm run dev
```

Para demonstrar o fluxo, use `SEED_DADOS_EXEMPLO=true` e `SEED_SENHA_EXEMPLO` no `.env` do backend antes do seed. Ele cria 2 hemocentros com Admin e médico, horários das próximas semanas e um paciente (`paciente@hemobridge.local`) que doou no hemocentro A e tem agendamento no B, cuja equipe enxerga o histórico de A. As contas estão listadas no [guia de instalação](./backend/docs/install.md#44-rodar-o-seed).

### Testes

```bash
cd backend
npm test                      # testes unitários
npm run lint
E2E_DATABASE_URL=postgresql://… npm run test:e2e   # fluxo completo e concorrência de vagas (banco descartável)

cd frontend
npm run build && npm run lint
```

> Segredos e senhas ficam apenas nos arquivos `.env` (fora do controle de versão).

## Equipe

- Braz Magri Junior
- Gean Skora de Paiva
- Jhonatan de Andrade Quiterio
- Thaiza dos Santos


**TCC — Análise e Desenvolvimento de Sistemas, UTP**
