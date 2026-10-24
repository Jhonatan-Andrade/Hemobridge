# Desempenho HTTP da recomendação autenticada — 23/10/2026

Consolidação documental em 24/10/2026 do relatório local `work/alinhamento-requisitos-2026-10-23/desempenho-http.md`. A medição foi executada em **23/10/2026, às 08:17**, com `npm run desempenho`, 200 requisições sequenciais por cenário após dez requisições de aquecimento. A versão medida continha **15 migrações**, antes de `20261023110000_confirmacao_doacao_antes_dos_60` e dos ajustes finais de 24/10. Os números abaixo não são uma reexecução da árvore com 16 migrações.

O critério RNF08/PT20 é responder em até três segundos em pelo menos 95% das execuções. **O critério temporal foi atendido no ambiente e nos seis cenários medidos.** Todas as 1.200 requisições da janela de medição ficaram abaixo de três segundos.

| Cenário | p50 (ms) | p95 (ms) | Máximo (ms) | Até 3 s |
| --- | ---: | ---: | ---: | ---: |
| `GET /hospitais` — lista pública, UC02 | 13,1 | 19,0 | 26,9 | 100% |
| `GET /hospitais?estado=PR&tipos=O-` — UC03 | 14,4 | 30,1 | 81,6 | 100% |
| `GET /hospitais?estado=SP&cidade=sao paulo&tipos=A+,O+` — UC03 | 17,5 | 47,6 | 238,8 | 100% |
| `GET /hospitais?lat&lng&raioKm=300&tipos=O-` — RF22 | 13,7 | 18,6 | 26,4 | 100% |
| `GET /hospitais/:id` — UC02 | 10,0 | 22,1 | 65,0 | 100% |
| `GET /paciente/locais-recomendados` — HTTP autenticado, UC17 | 33,1 | 59,8 | 128,5 | 100% |

## Ambiente e massa

API compilada e banco na mesma máquina, oito vCPU, 27,7 GB de RAM, Node.js 24.16.0 e PostgreSQL 17/PostGIS 3.5 em Docker. A carga de teste continha 173 hospitais, 1.384 necessidades, 691 registros de histórico de necessidade, 2.141 pacientes, 1.453 doadores aprovados e 2.897 doações.

Foi usada uma base local descartável. Não houve medição na VM compartilhada ou na AWS. Nenhuma conta operacional foi alterada para produzir a autenticação do cenário.

## Alcance e limites

Todos os cenários medem a requisição HTTP completa, incluindo validação, consulta, serialização e leitura da resposta. O cenário UC17 inclui validação real de assinatura, emissor, audiência, versão da sessão e conta; executa também estimativa de elegibilidade e a tentativa de gravação da auditoria de acesso. Os tokens de contas de teste ativas foram preparados fora da janela medida.

As consultas SQL exploratórias de 09 e 22/10 não executavam esse endpoint autenticado e não comprovam seu desempenho. Permanecem históricas, separadas destas 1.200 requisições HTTP.

O ensaio foi sequencial, local e com dados sintéticos. Não comprova capacidade sob concorrência, latência de rede móvel, escalabilidade Fargate/RDS, persistência em disco operacional, desempenho após os ajustes de 24/10 ou aceite humano do PT20.
