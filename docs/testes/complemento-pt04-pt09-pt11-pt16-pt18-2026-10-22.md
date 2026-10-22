# Contratos de agendamento, tipagem, histórico, isolamento e proximidade

Execução em **22/10/2026**, às 06:23 no horário de Brasília, por Codex. Base do código: `1b64f92932d2fc7b9d9fddcd18b2901b00401896` com a correção e os testes locais identificados por hash no [resumo de evidências](evidencias-automatizadas-2026-10-21.json). Não confundir com a reexecução de 221 unitários/35 web de 21/10 nem com a CI histórica de 19/10.

## Ambiente exclusivo

Foi criado somente para esta rodada o container `hemobridge-pt-20261022-audit`, imagem local `postgis/postgis:17-3.5`, PostgreSQL 17.5, porta de loopback `127.0.0.1:55447` e banco `hemobridge_pt_20261022_test`. Os dados estavam em `tmpfs` em `/var/lib/postgresql/data`, sem volumes ou diretórios do usuário montados.

Foram aplicadas as 13 migrações do projeto e a carga-base de oito tipos sanguíneos/27 pares de compatibilidade **exclusivamente nesse banco novo**. O administrador inicial não foi criado pela carga. As contas, instituições e coordenadas dos cenários foram geradas para os testes. Nenhum banco externo, da VM ou compartilhado recebeu seed, reset ou migração. O container foi removido ao terminar; não ficou banco, volume persistente ou processo de teste ativo dessa rodada.

Os testes utilizaram Node.js 24.16.0, Vitest e Supertest, com autenticação, validação NestJS, serviços, transações e triggers PostgreSQL reais. S3 e envio de e-mail foram simulados, pois não fazem parte dos cinco contratos. O limitador de requisições foi substituído para o ensaio não depender de espera. Isso não homologa rate limit, correio, armazenamento, aparelho físico, GPS ou serviço externo.

## Falha reproduzida e correção

O novo cenário PT04 fez duas solicitações HTTP de pacientes distintos para a mesma disponibilidade. Antes da correção, a API devolveu **201 e 500**. O driver expôs `P2039`, modelo `Consulta`, causa PostgreSQL `23P01`, para a exclusão `consulta_disponibilidade_ativa_excl`. O banco impediu a duplicidade, mas a resposta da solicitação perdedora não apresentava o conflito esperado.

O tratamento em `agendar()` foi ajustado para responder **409 — Horário ocupado. Escolha outro.** somente quando essa combinação de modelo, SQLSTATE e restrição for reconhecida. O filtro global não foi alterado, e mensagens/parametrizações do driver não foram adicionados aos logs de produção. Os tratamentos anteriores de P2002/P2004 foram preservados.

A reexecução confirmou **201 e 409**, uma única consulta persistida, paciente vencedor em CONSULTA_AGENDADA e perdedor em PRE_CADASTRADO por rollback. Ver [HEM-79 — conflito de agendamento](https://jhonatanjaqstudy.atlassian.net/browse/HEM-79). A execução técnica passou; revisão, integração e aceite humano permanecem registros separados.

## Resultado real por contrato

| Caso | Asserções executadas | Resultado |
|---|---|---|
| PT04 | Duas reservas HTTP concorrentes; uma criada e uma recusada com 409; uma consulta no banco; situação da solicitação perdedora desfeita | Aprovado após correção; falha inicial preservada no relatório bruto |
| PT09 | Paciente tenta enviar tipoSanguineoId, bloodType e tipoSanguineo; três respostas 400; tipo, médico validador e instante preservados; alteração permitida de perfil funciona | Aprovado API + persistência |
| PT11 | Transição BAIXO → CRITICO por HTTP; nova linha histórica com antes/depois/responsável/instante; leitura autenticada do histórico; repetição sem mudança não cria outra transição | Aprovado API + trigger + persistência |
| PT16 | Representante A injeta hospitalId e necessidadeId de B no corpo; recusa 400; controle positivo altera A; níveis e histórico de B permanecem intactos | Aprovado API + persistência |
| PT18 | Doador aprovado O- recebe filtro de tipo validado; lista exclui banco sem necessidade desse tipo; prioridade por necessidade precede distância; proximidade desempata dois críticos apesar dos nomes em ordem inversa | Aprovado no contrato de listagem com referência geográfica sintética |

PT18 verifica o tipo sanguíneo utilizado no filtro, a prioridade de necessidade e a distância calculada no PostGIS. Não afirma uma recomendação clínica individual, disponibilidade real para coleta ou captura GPS.

## Regressão e proveniência

- Cinco novos contratos de integração: **5/5 aprovados**, arquivo [formal-contracts.e2e-spec.ts](../../backend/test/formal-contracts.e2e-spec.ts).
- Unitários da API em 22/10: **226/226 aprovados**, incluindo cinco testes do classificador de conflito. O registro anterior de **221/221 em 21/10** permanece histórico.
- As negativas do classificador confirmam que outra restrição, SQLSTATE de serialização, ausência de metadados, outro modelo e um objeto genérico imitando Prisma não são classificados como ocupação.
- `npm run build` e `npm run lint`: concluídos com código de saída zero.
- Não foram reexecutados os 78 testes de integração anteriores nesta rodada. A CI histórica continua identificada no registro principal; uma nova CI deve validar a árvore publicada inteira.

O [registro PT01–PT23](execucao-pt01-pt23-2026-10-21.md) e a [planilha editável](execucao-pt01-pt23-2026-10-21.xlsx) foram atualizados com essa evidência. Os cinco casos continuam sem aceite humano atribuído. A conferência web PT23 possui [relatório próprio](responsividade-web-2026-10-21.md).
