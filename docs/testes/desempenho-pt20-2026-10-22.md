# Medição atual de desempenho — PT20

Executado em **22/10/2026, de 06:47:39 a 06:47:48 (Brasília)**; UTC 09:47:39–09:47:48. Executor: Codex, por medição automatizada. Código da API: `f8f1f457db5047b0fa491bcd310005c13545f630`. O [relatório de 09/10](../../backend/docs/desempenho-rnf08.md) foi preservado como histórico.

**Critério do Quadro 42/RNF08:** pelo menos 95% das execuções devem responder em até 3 s. **Resultado técnico: aprovado nos cinco cenários HTTP medidos**, com 100% das 1.000 respostas abaixo de 3 s. A consulta SQL adicional foi medida separadamente e não foi apresentada como teste de endpoint ou da recomendação atual. **Aceite humano integral de PT20 não atribuído.**

## Método e resultados

Foram feitas 200 medições sequenciais por cenário, após 10 aquecimentos descartados em cada um: **1.000 medições HTTP e 200 SQL direto**. Não houve usuários simultâneos. O HTTP inclui requisição, validação, consulta, serialização e leitura completa da resposta. Resposta HTTP fora da faixa de sucesso abortaria a rodada; não ocorreu. Os percentis usam a posição `ceil(p×n/100)-1` nos tempos ordenados, como o script existente.

| Cenário | Meio | p50 (ms) | p95 (ms) | Máximo (ms) | Até 3 s |
|---|---|---:|---:|---:|---:|
| Lista pública de hospitais | HTTP | 8,4 | 10,3 | 13,5 | 100% |
| UF e tipo sanguíneo (PR/O-) | HTTP | 8,1 | 9,8 | 14,5 | 100% |
| Cidade/UF e dois tipos (São Paulo/SP/A+,O+) | HTTP | 8,1 | 11,0 | 19,4 | 100% |
| Proximidade geodésica, raio de 300 km e tipo O- | HTTP | 7,2 | 8,6 | 13,3 | 100% |
| Detalhe institucional e necessidades | HTTP | 5,9 | 6,8 | 10,1 | 100% |
| SQL direto legado de locais recomendados — exploratório | SQL direto | 3,3 | 4,1 | 4,9 | 100% |

As [1.200 amostras em milissegundos](desempenho-pt20-2026-10-22.json) preservam a ordem de coleta por cenário, os volumes e os resultados sem credenciais ou identificadores individuais. SHA-256 desse arquivo: `F9EEC18619CA7652654CDAA9595677C91E13DD46BE15D5F03A718FAC67078711`.

## Ambiente isolado e base representativa

- API compilada do projeto, Node.js 24.16.0 no notebook, oito processadores lógicos e 27,7 GiB de RAM informados pelo sistema.
- Docker informava oito CPUs e 13,5 GiB de RAM; PostgreSQL 17.5 com PostGIS 3.5.2, imagem `postgis/postgis:17-3.5`.
- Container exclusivo `hemobridge-pt20-20261022-audit`, banco novo `hemobridge_pt20_20261022_test`, porta do banco `127.0.0.1:55448` e dados em `tmpfs:/var/lib/postgresql/data`, sem volumes do usuário.
- Treze migrações, carga-base e `seed-teste` na escala 1 foram aplicados somente nesse banco. Nenhum banco do usuário, compartilhado ou da VM recebeu carga, reset ou migração.
- API de medição exclusiva em `127.0.0.1:34417`. A porta 3000 não foi usada. O processo encerrou e não restou listener nessa porta; o container foi removido ao final.

| Volume efetivamente carregado | Registros |
|---|---:|
| hospitais | 40 |
| necessidades | 320 |
| historicoNecessidade | 627 |
| pacientes | 2000 |
| doadoresAprovados | 1411 |
| doacoes | 2865 |

A carga inclui instituições, pessoas, consultas e exames sintéticos; não foram enviados arquivos ao S3. O número de aprovados e doações difere do relatório de 09/10; os volumes acima são os observados nesta execução, sem copiar os antigos.

## Adaptações somente do executor e limites

A medição reutilizou as consultas, o aquecimento e o cálculo do [script existente](../../backend/scripts/medir-desempenho.ts), em auxiliar externo ao código de produção. O bootstrap original fixa escuta em todas as interfaces; para esta rodada foi carregado o **AppModule compilado** por um bootstrap de teste em loopback, com os mesmos pipes de validação, guardas, filtros e configuração de proxy. Armazenamento e e-mail foram substituídos por adaptadores que recusam uso; essas rotas de leitura não os utilizam. Foram mantidos os limites por IP, com IPs sintéticos no cabeçalho e um proxy local confiável, como no executor original. Não houve alteração do código de produção nem do script versionado.

O auxiliar foi executado como módulo ESM `.mts`; a tentativa inicial com extensão `.ts` falhou antes de iniciar a medição e não integra as amostras. Os hashes dos auxiliares efetivamente executados foram registrados no [resumo de evidências](evidencias-automatizadas-2026-10-21.json).

O último cenário continua sendo **SQL direto legado**, que ordena por necessidade e coincidência de cidade/UF. Ele não reproduz a distância geodésica do contrato atual de listagem nem mede autenticação, navegação ou um endpoint personalizado de recomendação. Seu p95 é apenas informativo; não foi utilizado para declarar aprovado esse fluxo. A rota HTTP de proximidade atual foi medida no quarto cenário. O comportamento de tipo validado, necessidade e distância tem uma [evidência funcional separada PT18](complemento-pt04-pt09-pt11-pt16-pt18-2026-10-22.md).

Os resultados caracterizam uma base local com cache aquecido e banco temporário em memória. Não medem concorrência, disco persistente, latência/TLS, AWS, internet móvel ou toda a jornada autenticada do doador. Esses limites devem acompanhar qualquer citação dos números. Para encerrar o caso formal, o responsável deve conferir o escopo das consultas e registrar seu aceite; não foi acrescentada exigência de AWS ao critério do Quadro 42.
