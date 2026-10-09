# Massa de dados de teste e contas de demonstração (HEM-56)

`npm run db:seed:teste` carrega uma base **fictícia** e representativa, separada do seed de
produção (`npm run db:setup`, que só cria tipos sanguíneos, compatibilidade e o admin inicial).
Serve para os testes do Plano de Testes, para os dashboards e para a apresentação final.

```bash
npm run db:setup         # antes: tabelas + tipos + compatibilidade + admin
npm run db:seed:teste    # massa de teste (escala padrão, usada no PT20)
SEED_TESTE_ESCALA=0.2 npm run db:seed:teste   # versão reduzida, mais rápida
```

O seed não roda com `NODE_ENV=production` e não duplica dados: se já tiver sido carregado,
avisa e para. Os dados são gerados com semente fixa, então cada carga é igual à anterior.

## O que é criado (escala 1)

| Dado | Quantidade |
| --- | --- |
| Hospitais | 40, em 12 cidades reais de PR, SP, SC, RS, RJ e MG (coordenadas aproximadas); 1 desativado (RN09) |
| Representantes e médicos | 1 representante e 2 médicos por hospital |
| Pacientes | 2.000, em todas as situações da RN10; ~70% doadores aprovados, com os 8 tipos |
| Fluxo clínico | consultas futuras (CONSULTA_AGENDADA), realizadas com solicitação de exame, exames em análise, validados e reprovados (com arquivo no S3, se configurado) |
| Necessidades | níveis em todos os valores da RN02 e histórico de alterações nos últimos 120 dias (RN03) |
| Doações | vinculadas (respeitando intervalo e limite anual da RN17) e avulsas, nos últimos 12 meses |
| Notificações | exemplos para o doador de demonstração |

## Contas de demonstração

Todas com a senha **`Demo2026hb`** (só para bancos de teste — nunca use em produção).

| Perfil | E-mail | O que mostra |
| --- | --- | --- |
| Administrador | `admin.demo@hemobridge.local` | Dashboard geral, relatórios consolidados, gestão de usuários e hospitais |
| Representante | `representante.demo@hemobridge.local` | Hospital de Curitiba: necessidades, doações, médicos, dashboard e relatórios |
| Médico | `medico.demo@hemobridge.local` | Consultas e exames dos pacientes do mesmo hospital |
| Paciente | `paciente.demo@hemobridge.local` | Paciente pré-cadastrado (sem consulta) |
| Doador | `doador.demo@hemobridge.local` | Doador aprovado, com doações e notificações |

O administrador inicial do `db:setup` (`ADMIN_EMAIL`) continua existindo, com a senha do `.env`.

## Medição de desempenho (PT20 / RNF08)

Com a base carregada, `npm run desempenho` sobe a API e mede 200 execuções de cada consulta
principal. `RELATORIO=docs/desempenho-rnf08.md npm run desempenho` grava o resultado
(ver [`desempenho-rnf08.md`](./desempenho-rnf08.md)).
