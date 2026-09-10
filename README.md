# 🩸 HemoLink

Plataforma web que conecta **doadores de sangue** a **bancos de sangue (hospitais)**, mostrando onde o tipo sanguíneo de cada doador é mais necessário.

## Problema

Bancos de sangue têm falta de uns tipos sanguíneos e excesso de outros. Doadores não sabem onde sua doação faz mais diferença. O HemoLink resolve isso centralizando essa informação.

## Como funciona (visão geral)

```
Paciente se cadastra → agenda consulta com médico → faz exame
     → médico aprova e registra o tipo sanguíneo → paciente vira doador
     → sistema mostra ao doador quais hospitais precisam do seu tipo
```

## Perfis de usuário

| Perfil | O que faz |
| --- | --- |
| 🧑 Paciente / Doador | Cadastra-se, agenda consulta, anexa exame, consulta onde doar |
| 👨‍⚕️ Médico | Atende consultas, pede exames, aprova o doador |
| 🏥 Representante do hospital | Atualiza a necessidade de estoque por tipo sanguíneo |
| 🛠️ Administrador | Aprova médicos/hospitais, gerencia usuários |

## Stack

- **Frontend:** React
- **Backend:** NestJS
- **Banco de dados:** PostgreSQL

## Estrutura do repositório

```
hemolink/
├── frontend/       # aplicação React
├── backend/        # API NestJS
├── database/       # migrations e seeds
└── docs/           # requisitos, diagramas, DER
```

## Requisitos do sistema

A lista completa de requisitos funcionais e não funcionais está em [`docs/requisitos.md`](./docs/requisitos.md).

## Como rodar localmente

```bash
# backend
cd backend
npm install
npm run start:dev

# frontend
cd frontend
npm install
npm run dev
```

> Configure as variáveis de ambiente com base em `.env.example` em cada pasta antes de rodar.

## Equipe

- Braz Magri Junior
- Gean Skora de Paiva
- Jhonatan de Andrade Quiterio
- Thaiza dos Santos


**TCC — Análise e Desenvolvimento de Sistemas, UTP**
