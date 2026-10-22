# Rastreabilidade dos casos formais de teste

Revisão de **22/10/2026**, preservando as datas reais das execuções anteriores. Os 23 casos do Quadro 42 estão no [registro](testes/execucao-pt01-pt23-2026-10-21.md), na [planilha Excel](testes/execucao-pt01-pt23-2026-10-21.xlsx), em [CSV](testes/execucao-pt01-pt23-2026-10-21.csv) e no [resumo de proveniência](testes/evidencias-automatizadas-2026-10-21.json).

**Nenhum aceite formal foi atribuído automaticamente.** As evidências positivas têm o escopo e os limites indicados abaixo. A falha real de PT04 foi registrada em [HEM-79](https://jhonatanjaqstudy.atlassian.net/browse/HEM-79) e corrigida com reexecução; não foi confundida com lacuna de cobertura ou aceite humano.

| Caso | Assunto | Evidência disponível e limite |
|---|---|---|
| PT01 | Pré-cadastro válido com consentimento | Aprovado no serviço; cobertura parcial do roteiro. Executar cadastro real de teste pela web/app e conferir registro persistido e termo. |
| PT02 | Repetir e-mail ou CPF | Aprovado no serviço; persistência a homologar. Repetir as duas duplicidades pela API/interface no banco descartável e registrar as contagens. |
| PT03 | Pré-triagem com intervalo insuficiente | Aprovado para intervalo; roteiro parcial. Conferir o fluxo completo de pré-triagem e o aviso orientativo na interface. |
| PT04 | Duas tentativas para a mesma disponibilidade | Aprovado na API após correção do conflito. Revisar e integrar a correção HEM-79; executar o roteiro de ponta a ponta na homologação e registrar o aceite humano. |
| PT05 | Reagendar dentro do prazo | Aprovado na API. Anexar roteiro de interface e evidência da confirmação/retorno ao painel. |
| PT06 | Registrar não comparecimento | Aprovado na API. Conferir a mensagem e os atalhos oferecidos ao paciente na interface. |
| PT07 | PDF/JPG/PNG válido e arquivo acima de 5 MB | Aprovado no validador/API PDF; ensaio nativo parcial. Enviar e abrir arquivos completos PDF/JPG/PNG pela interface/aparelho; repetir limite com o seletor nativo. |
| PT08 | Reprovar e reenviar exame | Aprovado na API. Anexar evidência de reprovação/reenvio e histórico na interface. |
| PT09 | Paciente tenta alterar a tipagem | Aprovado na API com persistência verificada. Conferir a apresentação somente leitura na web/app e registrar o aceite humano do roteiro. |
| PT10 | Aprovar sem tipagem validada | Aprovado na API/banco. Anexar evidência da interface impedindo conclusão incompleta. |
| PT11 | Alterar BAIXO para CRITICO e registrar histórico | Aprovado na API, banco e leitura do histórico. Conferir a apresentação e o responsável no histórico da interface; registrar o aceite humano. |
| PT12 | Aviso de necessidade crítica e janela de sete dias | Aprovado nos cenários automatizados. Anexar sequência de interface/caixa de teste e conferir todos os destinatários do roteiro de homologação. |
| PT13 | Registrar doação vinculada ao aprovado | Aprovado para vínculo/tipagem; roteiro parcial. Executar registro vinculado pela interface e comparar nível de necessidade antes/depois. |
| PT14 | Registrar doação avulsa | Aprovado na API/banco. Anexar registro/confirmacão pela interface do representante. |
| PT15 | Intervalos de 60/90 dias | Aprovado na regra de domínio. Registrar a apresentação da estimativa no fluxo do doador; estimativa não substitui triagem. |
| PT16 | Representante A altera necessidade B | Aprovado no isolamento por API e persistência. Executar o roteiro na interface entre duas contas institucionais e registrar o aceite humano. |
| PT17 | Administrador/representante abre exame clínico | Aprovado na API. Anexar mensagens de acesso negado e retorno de navegação na interface, sem expor bytes clínicos. |
| PT18 | Locais recomendados por necessidade e proximidade | Aprovado para tipo validado, necessidade e distância. Conferir a experiência de recomendação na interface e os dados de localização; não inferir aptidão clínica, horário real ou captura GPS a partir deste teste. Registrar aceite humano. |
| PT19 | Encerramento da conta | Aprovado na API/banco. Anexar fluxo completo das telas. Retenção, backups e chaves operacionais exigem homologação própria antes da publicação. |
| PT20 | Consultas com base representativa em até três segundos | Critério temporal aprovado nas cinco rotas HTTP; SQL exploratório. Conferir o alcance das consultas e registrar o aceite formal de PT20. A medição não representa concorrência, AWS, disco persistente ou a jornada autenticada inteira; não tratar o SQL legado como endpoint atual. |
| PT21 | Bloqueio após cinco senhas incorretas | Aprovado na regra de autenticação. Registrar os retornos pela API/interface em ambiente descartável sem bloquear contas de trabalho. |
| PT22 | Recuperação de senha, uso único e expiração | Aprovado nos cenários de serviço/navegação. Anexar o fluxo por e-mail/interface, ocultando token e senha nas evidências. |
| PT23 | Responsividade em celular, tablet e desktop | Web exercitada aprovada; aceite integral pendente. Homologar os demais estados, formulários, erros, dados extensos e fluxos externos; executar o APK corrigido em aparelho. Atribuir aceite humano do caso somente após a conferência integral. |

## Execuções e limites

Em 21/10 foram reexecutados **221/221 unitários da API** e **35/35 de lógica web**, revisão `7b3ac2e4`. Em 22/10, na base `1b64f929` com a correção local identificada por hash, passaram **226/226 unitários**, **cinco novos contratos E2E**, compilação e lint da API. Os cinco contratos usaram PostgreSQL/PostGIS novo e exclusivo em Docker/tmpfs, removido ao final; S3 e envio de e-mail foram simulados. [Detalhes do ensaio e correção](testes/complemento-pt04-pt09-pt11-pt16-pt18-2026-10-22.md).

A [CI 39347115658](https://github.com/Jhonatan-Andrade/Hemobridge/actions/runs/39347115658), concluída em 19/10 no horário de Brasília, comprova **78/78 de integração da API**, 221 unitários, 35 web e **76/76 Flutter**, análise e compilação do APK debug. Sua árvore de merge candidata é `8ab2474d0dcf23b86626adb4d7c162107d45e4ec`. Não é uma execução de hoje nem do head isolado. Os 78 E2E anteriores não foram reexecutados localmente em 22/10.

O SDK Android e um APK compilado estão disponíveis. Há ensaio Android físico anterior na [homologação Android](homologacao-android-2026-10-19.md), sobre a base ali identificada. O próximo ensaio físico deve usar o APK corrigido; compilação e teste em aparelho são evidências diferentes. Ver também a [homologação dos fluxos nativos](homologacao-fluxos-nativos.md).

PT23 tem agora [47 combinações de tela/largura observadas em navegador real](testes/responsividade-web-2026-10-21.md), com coleta em 21/10 e consolidação em 22/10. Isso complementa widgets e testes de lógica, preservando os limites de interface, acessibilidade, fluxos externos e aparelho físico.

## Como registrar o aceite

Executar cada roteiro com dados de teste e registrar ambiente/commit, observado, evidência, data e responsável. Os campos humanos da planilha permanecem vazios. Vincular falhas reais ao defeito e sua reexecução. A lacuna de cobertura não é por si um defeito confirmado.

O usuário informou que as telas foram aprovadas pela equipe. Essa aprovação de design não encerra automaticamente o aceite dos 23 testes. Merge permanece sob responsabilidade do Jhonatan. Homologação dos testes, aceite do design, merge e aprovação acadêmica são registros separados.

## Nova confirmação da API pela CI em 22/10

A [API da execução 39755613944](https://github.com/Jhonatan-Andrade/Hemobridge/actions/runs/39755613944/job/119746735038), associada ao head `f8f1f457` e executada sobre checkout de merge candidato, concluiu com sucesso: **226 unitários em 30 arquivos** às 09:29:01 UTC e **83 E2E em 13 arquivos** às 09:29:16 UTC (06:29 em Brasília). O SHA da árvore candidata não foi inferido. Os cinco contratos locais E22 continuam identificados como execução separada e estão incluídos no conjunto maior da CI.

O job web também concluiu com sucesso. O job Flutter ainda estava em execução quando este complemento foi registrado; este resultado da API não foi apresentado como aprovação integral de toda a execução. A CI de 19/10 permanece no histórico e nenhum aceite humano dos 23 casos foi atribuído.

## Medição atual de PT20 em 22/10

A [rodada atual](testes/desempenho-pt20-2026-10-22.md) mediu cinco cenários HTTP com 200 execuções cada, em base sintética de 40 hospitais e 2.000 pacientes: 100% das respostas ficaram abaixo de 3 s, com p95 de 6,8 a 11,0 ms. As [1.200 amostras](testes/desempenho-pt20-2026-10-22.json) incluem mais 200 consultas SQL legadas, separadas e apenas informativas. Banco e API exclusivos foram encerrados. O relatório de 09/10 permanece histórico. A lacuna de dados atuais foi reduzida; o aceite formal e os limites de concorrência, ambiente e recomendação continuam explícitos.
