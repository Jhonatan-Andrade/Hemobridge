# HemoBridge · Frontend

Interface web do HemoBridge, feita em **React 19 + Vite + TypeScript + React Router + Tailwind CSS**. O visual segue o arquivo do Figma **HemoBridge / Interfaces oficiais** (`7aKvXrajoLmEGpaYsn0dQ1`), adaptado ao escopo de agendamento de doação em hemocentros (ver [`../docs/requisitos.md`](../docs/requisitos.md)).

## Instalação e execução

Requisitos: Node 20 ou superior e o backend (`../backend`) rodando.

```bash
cd frontend
cp .env.example .env      # ajuste VITE_API_URL se a API não estiver em http://localhost:3333/api
npm install
npm run dev               # http://localhost:5173
npm run build             # gera dist/
npm run lint
```

### Variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3333/api` | URL base da API NestJS, já com o prefixo `/api`, sem barra no final |

O backend precisa liberar a origem do frontend em `FRONTEND_URL` ou `CORS_ORIGENS` (veja `backend/.env.example`).

### Dependências

| Pacote | Por quê |
| --- | --- |
| `react-router-dom` | Rotas e redirecionamento por perfil e papel |
| `tailwindcss`, `@tailwindcss/vite` (dev) | Estilização pedida no projeto; o plugin integra o Tailwind 4 ao Vite |

Não há biblioteca de componentes, ícones ou gráficos: tudo vem do Figma e dos componentes em `src/components/ui`.

## Estrutura

```
src/
├── api/            # cliente HTTP (token, erros) e tipos espelhados do backend
├── services/       # auth, hemocentros (consulta pública), paciente, equipe (médico e Admin do hemocentro) e admin
├── components/
│   ├── ui/         # componentes da biblioteca do Figma (Button, Field, Message, Card, LevelBadge…)
│   ├── layout/     # AppShell (cabeçalho + navegação lateral) e PageTitle
│   ├── DataTable.tsx
│   └── NeedsTable.tsx
├── features/
│   ├── home/       # Apresentação (pública)
│   ├── auth/       # sessão, rotas protegidas, login, cadastro, senha
│   ├── paciente/   # Painel, Doar, escolha de horário e exclusão de dados
│   ├── medico/     # agenda do dia, registro da doação e histórico do paciente
│   ├── hemocentro/ # Admin do hemocentro: horários e vagas, necessidades, ativações e equipe
│   └── admin/      # administrador da plataforma: hemocentros e seus Admins
├── lib/            # formatação, validação e useAsync
└── assets/         # fontes Poppins, ícones, marca e imagens exportados do Figma
```

Os tokens de design (cores, tipografia, raios, sombra e larguras) ficam em `tailwind.config.ts` com os mesmos nomes das variáveis do Figma. O `src/index.css` carrega esse arquivo com `@config`.

## Telas

| Rota | Quem acessa | Tela |
| --- | --- | --- |
| `/` | todos | Apresentação: o que é, por que doar, como funciona, seus dados na doação (sigilo, contato reservado, notificação compulsória) e hemocentros parceiros (RF03). Logado, mostra o menu da própria área (todos têm o item Início) e um atalho para ela |
| `/entrar`, `/cadastro`, `/recuperar-senha` | visitante | Login, cadastro com o termo LGPD (inclui o compartilhamento entre hemocentros) e recuperação de senha |
| `/primeiro-acesso` | equipe e administradores | Troca da senha provisória e aceite do termo de responsabilidade |
| `/doar` | todos | Hemocentros com busca por nome/cidade e necessidades; com conta ativa, quem precisa do tipo do paciente vem primeiro (RF05, RF18) |
| `/doar/:id` | todos (agendar: paciente) | Detalhes, necessidades, horários por data com vagas restantes e confirmação; com `?reagendar=<id>`, troca o horário (RF06, RF07) |
| `/painel` | paciente | Dados, status da conta, tipo sanguíneo, intervalo entre doações e próxima data permitida, próximos agendamentos (cancelar/reagendar), histórico de doações e exclusão de dados (RF04, RF16) |
| `/medico` | médico | Agenda do dia por horário e registro da doação (RF10, RF11) |
| `/medico/doacoes/:id` | médico | Registro completo do atendimento: triagem clínica, aferições, coleta e lançamento dos exames da amostra (RF11, RF20) |
| `/medico/atendimentos`, `/hemocentro/atendimentos` | médico e Admin do hemocentro | Atendimentos do próprio hemocentro por período, com resumo e link para o histórico do paciente (RF19) |
| `/medico/pacientes/:id`, `/hemocentro/pacientes/:id` | equipe | Histórico do paciente em todos os hemocentros, com a origem de cada registro (RF12) |
| `/hemocentro` | Admin do hemocentro | Horários e vagas: avulso, lote semanal, ajuste de vagas e desativação (RF08) |
| `/hemocentro/necessidades` | Admin do hemocentro | Nível de necessidade por tipo sanguíneo (RF17) |
| `/hemocentro/ativacoes` | Admin do hemocentro | Pacientes pendentes com doação tipada no hemocentro e ativação (RF13) |
| `/hemocentro/equipe` | Admin do hemocentro | Médicos: cadastro, edição, desativação e reenvio de senha provisória (RF14) |
| `/admin`, `/admin/hemocentros/novo` | administrador da plataforma | Lista de hemocentros, cadastro com o Admin inicial, edição e desativação (RF15) |

Cada tela tem estados de carregamento, vazio e erro. Quem não está logado vai para `/entrar` e, depois do login, volta para a página de onde veio. Quem tenta abrir a área de outro perfil ou papel volta para a própria área.

## O que está mockado

Nada: todas as telas usam a API.

## Divergências em relação ao Figma

| Ponto | Decisão |
| --- | --- |
| Telas do escopo anterior | Os frames de teleconsulta, exames, estoque, comunidade, relatórios e indicadores não são usados no novo escopo. As telas novas (horários e vagas, ativação, registro da doação, histórico) foram montadas com os componentes da biblioteca. |
| Representante do hospital | Virou Admin do hemocentro; as telas de Necessidades e Equipe médica (101:3114 e 101:3113) foram adaptadas a ele. A equipe médica não tem mais CRM nem declaração de CRM conferido. |
| Encontrar locais | Virou Doar, sem mapa e sem geolocalização; a busca é por nome ou cidade. |
| Níveis de necessidade | Urgente, Necessário e Estável, mais "Não informado" para o tipo que o hemocentro ainda não preencheu. |
| Cadastro | O "pré-cadastro" do Figma (8:1257) virou cadastro simples, sem peso e município. O sexo continua, porque define o intervalo entre doações (60 dias para homens, 90 para mulheres). O texto do termo é exibido por completo. |
| Menu do visitante | Início, Doar, Entrar e Criar conta. |
| Exclusão de dados | Depois de confirmar com a senha, a conta é encerrada e a pessoa volta à Apresentação com a confirmação. |
| Breakpoints | O desktop segue os frames de 1440px. Abaixo de 768px (`md`), o rail vira menu sobreposto; tabelas viram listas abaixo de 640px (`sm`). |
