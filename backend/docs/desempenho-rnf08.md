# Medição de desempenho — RNF08 / PT20

Executado em 09/10/2026, 11:50 com `npm run desempenho` (200 execuções sequenciais por cenário, após 10 de aquecimento).

**Meta (RNF08):** responder em até 3 s em pelo menos 95% das execuções.

**Resultado histórico: APROVADO para os cinco cenários HTTP públicos medidos.** O sexto cenário foi uma consulta SQL exploratória de recomendação, sem autenticação nem execução da rota completa; seus números não aprovam o endpoint personalizado de doação.

| Cenário | p50 (ms) | p95 (ms) | Máximo (ms) | ≤ 3 s |
| --- | ---: | ---: | ---: | ---: |
| GET /hospitais (lista pública, UC02) | 5,3 | 9,7 | 20,9 | 100% |
| GET /hospitais?estado=PR&tipos=O- (UC03) | 4,8 | 7,3 | 16,2 | 100% |
| GET /hospitais?estado=SP&cidade=sao paulo&tipos=A+,O+ (UC03) | 4,3 | 6,4 | 18,1 | 100% |
| GET /hospitais?lat&lng&raioKm=300&tipos=O- (proximidade, RF22) | 4,3 | 5,9 | 14,9 | 100% |
| GET /hospitais/:id (detalhe e necessidades, UC02) | 2,8 | 4,7 | 26,1 | 100% |
| Locais recomendados ao doador (consulta da Seção 9.1.5, UC17) | 2,2 | 3,0 | 6,7 | 100% |

## Ambiente

- API (build de produção) e banco na mesma máquina: 2 vCPU, 3.8 GB de RAM, Node v24.21.0.
- PostgreSQL 17 + PostGIS 3.5 (Docker), com os índices da migration `indices_consultas_publicas`.

## Base representativa (`npm run db:seed:teste`)

| Tabela | Registros |
| --- | ---: |
| hospitais | 40 |
| necessidades | 320 |
| historicoNecessidade | 627 |
| pacientes | 2000 |
| doadoresAprovados | 1412 |
| doacoes | 2899 |

Nos cinco cenários públicos, o tempo medido inclui a requisição HTTP completa (rota, validação, consulta e serialização). Em "Locais recomendados", esta execução de 09/10/2026 mediu apenas o SQL previsto naquela data.

O executor atualizado em 23/10/2026 usa `GET /paciente/locais-recomendados` com autenticação real de contas aprovadas da base descartável, incluindo validação de sessão, estimativa de elegibilidade e auditoria de leitura. A [medição HTTP de 24/10](../../docs/testes/desempenho-uc17-2026-10-24.md) possui seu próprio relatório, com 1.200 requisições e p95 de 52,8 ms para UC17, na versão com 16 migrações. A [medição de 23/10](../../docs/testes/desempenho-uc17-2026-10-23.md), p95 de 59,8 ms e 15 migrações, foi preservada. Os valores históricos da tabela acima não representam o endpoint autenticado nem uma execução atual.
