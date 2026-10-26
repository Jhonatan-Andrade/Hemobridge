# Homologação dos fluxos nativos e da agenda

Verificação em 19/10/2026. Esta fase completa os formulários Flutter ligados à API e corrige a navegação de agenda/encerramento da sessão. O ambiente usou contas de teste e PostgreSQL/PostGIS descartável; não utilizou a VM compartilhada nem dados de pessoas atendidas.

## Fluxos implementados

| Área | Comportamento |
| --- | --- |
| Cadastro | Termo vigente obtido da API, consentimento explícito, validação de CPF/idade/peso/senha e Estado/Município pelo IBGE. O cadastro público não atribui perfil profissional. |
| Perfil do paciente | Edição dos campos autorizados: telefone, peso, Estado e Município. CPF mascarado e tipagem validada somente para leitura. Respostas atrasadas do IBGE são descartadas. |
| Consultas do paciente | Horários disponíveis, aceite de telessaúde, reserva, confirmação de cancelamento, reagendamento e recuperação de conflito sem selecionar outra vaga automaticamente. |
| Resultados de exames | Seleção nativa de PDF/JPG/PNG, conferência de extensão/assinatura e limite de 5 MB, confirmação antes do envio, histórico e reenvio quando permitido. |
| Acesso privado | Downloads autenticados pelo cabeçalho; visualização de imagens/PDF dentro do app. Não abre URL de exame em navegador sem autenticação e não salva os bytes nas preferências. |
| Agenda médica | Instituição autorizada, publicação de horário, períodos Próximos/Histórico, paginação, atendimento, retorno a atendimento realizado e solicitação de exames. O link de consulta aceita HTTPS sem credenciais na URL. |
| Avaliação médica | Sem decisão pré-selecionada; exige permissão explícita da API, tipagem para validar ou motivo para novo envio e confirmação. Conflito bloqueia repetição e pede atualização. |
| Representante | Atualização dos níveis de necessidade após confirmação; registro de bolsa em quarentena; movimentação com estado anterior, motivo, validade e referência para liberação. |
| Navegação e conta | Comunidade preserva o perfil e a navegação inferior. Sair remove a pilha de telas privadas; retorno assíncrono do login não usa campos já descartados. Na web, sessão expirada também permite sair. |

A localização e a comunidade previamente implementadas foram preservadas. As telas nativas administrativas adicionais existentes no site, como administração completa de contas e instituições, não foram incluídas nesta fase. O aplicativo não substitui essas operações administrativas do site.

## Contrato de agenda

A API mantém a resposta como lista de disponibilidades e acrescenta filtros opcionais:

- `periodo=proximos|historico`;
- `pagina` inteiro de 1 a 10.000;
- `tamanhoPagina` inteiro de 1 a 100;
- `incluirRealizadas=true|false`.

Os clientes atualizados usam páginas de 30. Próximos inclui horários em curso/futuros; Histórico ordena os encerrados do mais recente para o mais antigo. A ordenação inclui o identificador para estabilizar empates. O filtro de vínculo institucional continua aplicado em todas as páginas. Sem os filtros novos, a compatibilidade com os clientes anteriores é preservada.

A regressão da API cria mais de cem horários antigos e verifica a exibição do próximo horário, a retomada do atendimento recente, a segunda página e a recusa de parâmetros inválidos. A interface Flutter invalida respostas antigas após troca de instituição, período ou saída da tela.

## Validação executada

| Verificação | Resultado em 19/10/2026 |
| --- | --- |
| Flutter | Análise sem problemas; **71 testes aprovados** |
| Navegação nativa | Cinco cenários de conta/perfil a 360 px com texto ampliado; ida à comunidade, perfil e retorno ao destino correto |
| Web | Lint, nomenclatura e compilação aprovados; **35 testes aprovados** |
| API unitária | **219 testes aprovados** |
| API integrada | **78 testes distintos aprovados**, com PostgreSQL/PostGIS e S3 local |
| Navegador | Agenda e retomada de atendimento conferidas em 1440 e 360 px; sem rolagem lateral nas verificações realizadas |
| Figma | Ver [reconciliação dos fluxos](design/reconciliacao-clinica-app.md), que registra os estados efetivamente inspecionados |

Os 71 testes Flutter são testes de serviço/widget com respostas controladas. Não equivalem a executar a cadeia completa em Android/iOS físicos. A cadeia clínica real da API, com persistência e armazenamento, foi exercitada separadamente nos 78 testes de integração.

Evidências resumidas: [registro estruturado](evidencias/fluxos-nativos-2026-10-19.json). Os logs completos permanecem na pasta de trabalho local, fora do pacote de código. Os números não devem ser somados aos casos formais do trabalho acadêmico; repetição de uma bateria não representa novos casos.

## Limites de compilação e homologação física

O projeto Flutter tem alvos Android/iOS. A primeira tentativa local encontrou Android SDK ausente. Essa preparação foi concluída em 19/10: o SDK foi instalado, a integração contínua compilou o APK debug e a base `609b4cb7` foi instalada e exercitada parcialmente em Android real. O [relatório Android](homologacao-android-2026-10-19.md) registra os perfis conferidos, a captura pontual de GPS e as correções posteriores ainda não homologadas fisicamente. Não foi gerado IPA ou pacote de distribuição assinado. O site continua sendo o frontend React.

Para a próxima homologação:

1. Instalar no aparelho um APK da versão corrigida e conferir um endereço acessível da API de homologação. Em 21/10, a usuária informou que conectará o Android em outra oportunidade.
2. Validar em Android e iOS reais a permissão negada/permanente, GPS desligado, timeout, seleção de PDF/JPG/PNG, visualização de PDF e abertura de Maps/teleconsulta.
3. Repetir a jornada completa com as cinco contas de teste e anexar evidências de aparelho, versão e resultado, incluindo a expiração de sessão.
4. Configurar identificadores, assinatura e distribuição interna. Para iOS, usar macOS/Xcode e a conta de assinatura da organização.

A API de release exige HTTPS. O endereço de uma API no notebook não é automaticamente acessível a um celular. Nenhuma credencial operacional, chave de assinatura, chave SSH, exame real ou cópia de banco integra o código desta fase.

## Revisão e publicação

O código segue no pull request para revisão do Jhonatan. Os textos e as evidências não autorizam merge automático nem atestam produção AWS já provisionada. Permanecem a infraestrutura de homologação/produção, domínio/HTTPS, segredos próprios, restauração, monitoramento, responsáveis de privacidade e o aceite formal dos roteiros acadêmicos.
