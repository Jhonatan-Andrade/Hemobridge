# Medição de desempenho — RNF08 / PT20

Executado em 09/10/2026, 11:50 com `npm run desempenho` (200 execuções sequenciais por cenário, após 10 de aquecimento).

**Meta (RNF08):** responder em até 3 s em pelo menos 95% das execuções.

**Resultado: APROVADO.**

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

O tempo medido inclui a requisição HTTP completa (rota, validação, consulta e serialização),
exceto em "Locais recomendados", que mede a consulta SQL prevista enquanto o endpoint do UC17 (HEM-48) não existe.
