# HemoBridge · Frontend

Interface web do HemoBridge, feita em **React 19 + Vite + TypeScript + React Router + Tailwind CSS**. O visual segue o arquivo do Figma **HemoBridge / Interfaces oficiais** (`7aKvXrajoLmEGpaYsn0dQ1`).

## Instalação e execução

Requisitos: Node 20 ou superior e o backend (`../backend`) rodando.

```bash
cd frontend
cp .env.example .env      # ajuste VITE_API_URL se o backend não estiver em http://localhost:3333
npm install
npm run dev               # http://localhost:5173
npm run build             # gera dist/
npm run lint
```

### Variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3333` | URL base da API NestJS, sem barra no final |

O backend precisa liberar a origem do frontend em `FRONTEND_URL` ou `CORS_ORIGENS` (veja `backend/.env.example`).

### Dependências adicionadas

| Pacote | Por quê |
| --- | --- |
| `react-router-dom` | Rotas e redirecionamento por perfil (já estava no working tree) |
| `tailwindcss`, `@tailwindcss/vite` (dev) | Estilização pedida no projeto; o plugin integra o Tailwind 4 ao Vite |

Não há biblioteca de componentes, ícones ou gráficos: tudo vem do Figma e dos componentes em `src/components/ui`.

## Estrutura

```
src/
├── api/            # cliente HTTP (token, erros) e tipos espelhados do backend
├── services/       # camada de serviços por recurso: auth, hospitais, necessidades, doador (mock)
├── components/
│   ├── ui/         # componentes da biblioteca do Figma (Button, Field, Message, Card, LevelBadge…)
│   ├── layout/     # AppShell (cabeçalho + navegação lateral) e PageTitle
│   └── NeedsTable.tsx
├── features/
│   ├── home/       # home pública e boas-vindas do visitante (conteúdo estático)
│   ├── auth/       # contexto de sessão, rotas protegidas, login, pré-cadastro, senha
│   ├── donor/      # painel do doador, recomendados, busca e detalhes do banco de sangue
│   ├── bloodbank/  # necessidades, dashboard e equipe médica do hospital
│   └── medico/     # agenda, atendimento e avaliação de exames
├── lib/            # formatação, validação e useAsync
└── assets/         # fontes Poppins, ícones, marca e imagens exportados do Figma
```

Os tokens de design (cores, tipografia, raios, sombra e larguras) ficam em `tailwind.config.ts` com os mesmos nomes das variáveis do Figma (`brand`, `ink`, `muted`, `line`, `background`, `error`/`warning`/`info`/`success`…). O `src/index.css` carrega esse arquivo com `@config`.

## Telas implementadas

| Rota | Tela | Frame do Figma |
| --- | --- | --- |
| `/` | Home pública (estática, sem API) | 43:1340 · mobile 660:7571 |
| `/boas-vindas` | Boas-vindas do visitante (tour de 1 etapa) | 192:4693 · mobile 660:9731 |
| `/entrar` | Entrar (inicial, erro, carregando) | 8:1584, 8:1636, 8:1720 · mobile 660:6373 |
| `/cadastro` | Pré-cadastro (inicial, erro, carregando, confirmação) | 8:1257 (a confirmação foi montada com Card/Button, sem conferir o frame 8:1571) |
| `/recuperar-senha` | Recuperar senha e confirmação neutra | 8:2205, 8:2222 (montada com os componentes base, frame não conferido) |
| `/primeiro-acesso` | Primeiro acesso do profissional | 8:2318 (montada com os componentes base, frame não conferido) |
| `/doador` | Meu painel (por situação, carregando, falha) | 8:1858 (aprovado); os textos das outras situações (8:1746–8:1919) foram escritos sem conferir os frames |
| `/doador/recomendados` | Locais recomendados | 906:9914 |
| `/locais` | Encontrar locais (busca com filtros) | 707:7062 |
| `/locais/:id` | Detalhes do banco de sangue | sem frame próprio (ver divergências) |
| `/hospital/necessidades` | Necessidades | 101:3114 |
| `/hospital` | Painel do hospital (indicadores) | 910:9870 |
| `/hospital/equipe-medica` | Equipe médica: listagem, cadastro com declaração de CRM conferido, edição, desativação e reenvio de senha provisória | 101:3113 |
| `/admin` | Painel geral do administrador | 154:3520 |
| `/admin/instituicoes` | Hospitais e representantes: listagem, edição, desativação e novos representantes | 101:3111 |
| `/admin/instituicoes/nova` | Cadastrar instituição (hospital + primeiro representante), com item próprio no menu lateral do administrador | formulário de 102:3161 em tela própria |
| `/admin/usuarios` | Usuários: filtros, edição, ativação/desativação, reenvio de senha provisória e novo administrador | 101:3112 |
| `/medico` | Minha agenda: calendário, publicação de horários com link da teleconsulta, próximos horários e histórico | 101:3115, 832:9757 |
| `/medico/atendimentos` | Consultas marcadas, da mais próxima para a mais distante | item "Atendimento" de 558:5767 |
| `/medico/atendimentos/:id` | Atendimento: dados do paciente, entrada na sala e registro do desfecho (exames, inapto, não compareceu ou cancelamento) | 154:3704 |
| `/medico/exames` | Exames dos atendimentos (para avaliar ou todos) | 154:3753 |
| `/medico/exames/:id` | Avaliar resultado: abrir o arquivo, validar com tipo sanguíneo ou reprovar com motivo | 824:10121, 824:10086 |

Cada tela tem estados de carregamento, vazio e erro. As rotas `/doador/*` exigem o perfil Paciente `/hospital/*` exige Representante e `/medico/*` exige Médico. Quem não está logado vai para `/entrar`, e quem já está logado não vê as telas de acesso.

## O que está mockado

- **Perfil do doador** (`src/services/doador.ts`): tipo sanguíneo, cidade e estado do paciente logado. A situação vem do papel da sessão (`DOADOR` = aprovado). O doador aprovado aparece como O+ em Curitiba/PR.

## Contratos pendentes no backend

O backend não foi alterado. Para tirar o mock e completar as telas, faltam:

1. `GET /pacientes/me` (paciente autenticado) → `{ id, nome, situacao, tipoSanguineo: "O+" | null, cidade, estado }`. Substitui `doadorService.obterPerfil`.
2. (Opcional) filtro `nivel` em `GET /hospitais`. Hoje o filtro por nível é aplicado no frontend sobre a página recebida, então uma página pode vir com menos itens.
3. (Opcional) registro de doações por hospital, para os gráficos "Doações por tipo" e "Doações por semana" do Figma.
4. (Opcional) `GET /admin/indicadores` → `{ doadoresAprovados, hospitaisAtivos, criticosPorEstado: [{ estado, hospitais, tipos }] }`. Hoje o Painel geral calcula esses números no navegador percorrendo `/admin/usuarios?perfil=PACIENTE` e `/hospitais` (até 1.000 registros de cada; acima disso a tela avisa que o número é parcial).

## Divergências em relação ao Figma e aos requisitos

| Ponto | Decisão |
| --- | --- |
| "Banco de sangue" com cadastro próprio | No backend, o banco de sangue é o **hospital**, criado pelo administrador e mantido pelo **Representante**. Não há autocadastro: o representante entra com a senha provisória e a troca em `/primeiro-acesso`. |
| Níveis "crítico, baixo, adequado, alto" | Usei os níveis do backend e do Figma: Crítico, Baixo, Estável, Adequado e Não informado. |
| Tipo sanguíneo no cadastro do doador | O tipo é definido pela equipe médica depois do exame (RN10). O pré-cadastro segue o Figma e o backend, sem tipo sanguíneo. |
| Município como lista do estado | O campo é texto livre, habilitado depois de escolher o estado, para não depender de uma API externa de municípios. |
| Largura dos campos | No Figma o controle tem 300px mesmo em colunas de 720px. Aqui ele ocupa a largura da coluna. |
| Mapa estático em "Encontrar locais" | No lugar do mapa ilustrativo entra a lista de resultados com os filtros pedidos. A distância usa a geolocalização do navegador, só se a pessoa permitir. |
| Detalhes do banco de sangue | Não há frame dedicado. A tela combina o cabeçalho das telas de Locais com a tabela de necessidades de 101:3114. |
| Dashboard do hospital | Os gráficos de doações do Figma viraram "Necessidades por tipo" (urgência atual) e "Evolução por semana" (alterações de nível no histórico), porque o backend não registra doações. |
| Comunidade na Home pública | Não existe API de comunidade. As três publicações são o conteúdo estático do Figma (`features/home/publicacoes.ts`), as curtidas são só contadores, e "Ver comunidade", "Ler publicação" e os comentários levam a `/entrar`. "Próximos passos" e "Como funciona? Ver tour" abrem `/boas-vindas`. |
| Menu do visitante | O Figma (468:5148) tem Início, Comunidade, Entrar, Fazer pré-cadastro e Acessibilidade. Aqui ficam Início, Encontrar locais, Entrar e Fazer pré-cadastro. |
| Fonte Fraunces | O destaque "A ponte que" usa Fraunces Italic (OFL), salva como subconjunto latino em `src/assets/fonts`, sem dependência nova. |
| Rotas desconhecidas | Agora redirecionam para a Home pública (`/`) em vez de `/entrar`. |
| Equipe médica | O Figma filtra por Situação e Estado e o formulário tem Nome, CRM, Estado e a declaração. O backend não filtra médicos por estado, então o segundo filtro virou busca por nome, e-mail ou CRM. O cadastro também pede CPF, e-mail e telefone, que o backend exige. Na edição só e-mail e telefone mudam (nome, CPF e CRM são fixos no backend). |
| Navegação lateral | Comunidade, Perfil, Estoque e Relatórios ficaram fora do escopo. Os ícones vêm do Figma, e o botão Sair fica no cabeçalho. |
| Área do médico | O menu segue o overlay 558:5767 (Agenda, Atendimento e Exames, com os mesmos ícones). Perfil e o seletor "Instituição de atendimento" ficaram de fora: o médico tem um único hospital e não há API de perfil. O card "Pré-triagem" do Atendimento também saiu, porque o backend ainda não registra a pré-triagem. |
| Publicação de horário | O Figma pede início e fim de um único período. Aqui o período é dividido em consultas com a duração escolhida (15 a 60 min), como define o UC13, e os horários são de Brasília. |
| Desfecho do atendimento | O campo "Desfecho" virou uma escolha entre quatro opções (realizada com exames, realizada com paciente inapto, não compareceu e cancelar). Antes do horário, só o cancelamento fica habilitado (FE01 do UC14). Os exames são digitados um por linha. |
| Telas do administrador sem API | Mapa regional IBGE, Moderação, Relatórios gerais, Comunidade, Perfil, Solicitações de privacidade, Indicadores e Boas-vindas não foram implementadas: o backend não tem endpoints para elas. O item Relatórios saiu do rail. |
| Painel geral | Os cards mostram os números calculados (ver contrato 4). "Evolução agregada" fica como estado vazio, porque não há registro de doações, e o botão "Ver indicadores" foi removido por não haver tela de destino. |
| Formulário de hospital | O Figma mostra só Nome, Cidade e UF, Endereço e Representante. O backend exige CNPJ, CEP, telefone, latitude e longitude, e no cadastro também nome, CPF, e-mail e telefone do primeiro representante. Todos esses campos estão no formulário. |
| Usuários e solicitações | O backend não tem fluxo de aprovação de solicitações. "Pendente" indica conta criada que ainda não fez o primeiro acesso, e a ação "Avaliar" virou "Detalhes". O novo administrador também pede CPF, que o backend exige. |
| Desativação | Desativar hospital ou usuário pede confirmação na própria tela, porque encerra as sessões abertas. A pessoa logada não vê a opção de desativar a própria conta. |
| Breakpoints | O desktop segue os frames de 1440px. Abaixo de 768px (`md`), o rail vira menu sobreposto com fundo de proteção, o cabeçalho esconde o texto de contexto e o acionador do menu fica claro, como no frame mobile 660:6373. Tabelas viram listas abaixo de 640px (`sm`). |
