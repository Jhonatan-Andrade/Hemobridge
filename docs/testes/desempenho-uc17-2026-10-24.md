# Desempenho HTTP da recomendação autenticada — 24/10/2026

Medição executada em **24/10/2026, às 16:04**, com `npm run desempenho`, em ambiente local exclusivo com **16 migrações aplicadas**. Fonte: `work/alinhamento-requisitos-2026-10-24/desempenho-http.md`. Cada cenário teve dez requisições de aquecimento e 200 requisições sequenciais na janela medida, totalizando **1.200 requisições HTTP** após aquecimento.

O critério RNF08/PT20 é responder em até três segundos em pelo menos 95% das execuções. **O critério temporal foi atendido nos seis cenários e no ambiente medidos: 100% das respostas ficaram abaixo de três segundos.** A aprovação é técnica e limitada à execução descrita; não atribui aceite humano ao PT20.

| Cenário | p50 (ms) | p95 (ms) | Máximo (ms) | Até 3 s |
| --- | ---: | ---: | ---: | ---: |
| `GET /hospitais` — lista pública, UC02 | 14,0 | 22,5 | 37,6 | 100% |
| `GET /hospitais?estado=PR&tipos=O-` — UC03 | 12,5 | 20,0 | 48,1 | 100% |
| `GET /hospitais?estado=SP&cidade=sao paulo&tipos=A+,O+` — UC03 | 11,8 | 15,9 | 29,3 | 100% |
| `GET /hospitais?lat&lng&raioKm=300&tipos=O-` — RF22 | 12,9 | 28,6 | 63,1 | 100% |
| `GET /hospitais/:id` — UC02 | 9,2 | 15,1 | 31,5 | 100% |
| `GET /paciente/locais-recomendados` — HTTP autenticado, UC17 | 32,7 | **52,8** | 74,6 | 100% |

## Ambiente e massa

API compilada e banco na mesma máquina, oito vCPU, 27,7 GB de RAM, Node.js 24.16.0 e PostgreSQL 17/PostGIS 3.5 em Docker, com os índices da migração `indices_consultas_publicas`. A base era nova, local e exclusiva para validação, com as 16 migrações do projeto.

| Dados de teste | Quantidade |
| --- | ---: |
| Hospitais | 107 |
| Necessidades | 856 |
| Histórico de necessidade | 660 |
| Pacientes | 2.073 |
| Doadores aprovados | 1.435 |
| Doações | 2.882 |

Não houve medição na VM compartilhada ou na AWS. Os dados são sintéticos; as contas ativas usadas na autenticação já pertenciam à base descartável e nenhuma conta operacional foi alterada.

## Alcance e limites

Todos os cenários medem a requisição HTTP completa, incluindo validação, consulta, serialização e leitura da resposta. UC17 inclui autenticação real por assinatura, emissor, audiência, versão da sessão e recarga da conta; também executa estimativa de elegibilidade e a tentativa de gravação da auditoria de acesso. Os tokens de teste foram preparados fora da janela medida.

O benchmark foi sequencial. Não comprova capacidade sob concorrência, latência de rede móvel, escalabilidade ou comportamento operacional de Fargate/RDS, armazenamento clínico, GPS em aparelho ou homologação AWS. O cenário de recomendação mede o endpoint completo; as consultas SQL exploratórias de 09 e 22/10 permanecem históricas e não são equivalentes a esse ensaio HTTP autenticado.

A [medição de 23/10](desempenho-uc17-2026-10-23.md), feita com 15 migrações e outra massa, foi preservada. As bases e condições não permitem atribuir a diferença entre os p95 de 59,8 e 52,8 ms a uma otimização específica. A [verificação de alinhamento de 24/10](alinhamento-requisitos-2026-10-24.md) registra os testes funcionais e ensaios web da rodada separadamente.
