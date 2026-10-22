# Roteiro da apresentação do HemoBridge

Preparação de 21/10/2026. Este roteiro organiza o ensaio da equipe sobre a versão disponível. A apresentação completa ainda exige conferir a cadeia final e as interfaces ausentes relacionadas no [registro do manual](manual/revisao-e-evidencias.md). Não há registro de ensaio coletivo realizado nesta preparação.

## Objetivo da apresentação

Explicar como o HemoBridge conecta pessoas interessadas em doar sangue a instituições e organiza o acompanhamento, preservando o acesso às informações privadas por perfil. Mostrar as telas aprovadas e distinguir o que foi implementado, o que foi testado e os limites observados.

## Preparação antes do ensaio

1. Escolher uma única versão de código e anotar o commit e a data na ficha de execução.
2. Preparar o ambiente local isolado conforme o [guia de testes](guia-de-testes.md), com API, PostgreSQL, armazenamento e caixa de e-mail local disponíveis. Não utilizar a VM compartilhada como banco descartável.
3. Usar somente as contas e registros da carga de testes. Em uma instalação já usada, preservar os volumes e as configurações; não executar novamente cargas sem conferir o ambiente e a necessidade.
4. Separar as contas de Paciente/Doador, Doador aprovado, Médico, Representante e Administrador. Não projetar senhas, `.env`, terminais com segredos ou arquivos de outras pessoas.
5. Preparar um horário publicado no contexto institucional correto. Para exibir atendimento, a data/hora precisa permitir essa ação; a interface impede registrar atendimento antes do início.
6. Preparar um arquivo sintético válido em PDF/JPG/PNG, até 5 MB, para a solicitação de teste. Arquivos antigos da carga não são automaticamente substituídos pela correção do gerador de PDF.
7. Conferir as boas-vindas das contas. Para mostrar o primeiro acesso, usar uma conta de teste ainda não concluída, sem modificar o cadastro de alguém para forçar o fluxo.
8. Testar previamente a conexão do celular com a API e a abertura dos serviços externos. Uma instalação do app, sozinha, não fornece servidor ou banco ao aparelho.
9. Abrir o Figma oficial em outra aba, com as seções Web desktop, Web mobile e Aplicativo, para mostrar os protótipos e o comportamento planejado quando necessário.
10. Silenciar notificações pessoais e fechar outras contas e páginas antes da projeção. Usar uma captura revisada como material de apoio quando um serviço externo estiver indisponível.

O preenchimento dos termos e as decisões clínicas durante o ensaio usam exclusivamente o ambiente de testes e uma atuação simulada identificada verbalmente. A apresentação não deve registrar decisões ou mensagens em contas de pessoas atendidas.

## Sequência de fala e demonstração

| Etapa | Quem conduz | O que mostrar | Conferir no ensaio |
| --- | --- | --- | --- |
| 1. Propósito e navegação | Apresentador | Início; conexão entre doação e instituições; diferença entre desktop, web mobile e app | Explicação breve; a equipe consegue localizar as três versões no Figma |
| 2. Pré-cadastro e acesso | Conta de Paciente/Doador | Formulário, Estado/Município, termo, conclusão do cadastro e boas-vindas | Cadastro com dados exclusivos de teste, sem duplicar CPF/e-mail e sem projetar senha |
| 3. Consulta | Paciente e Médico | Médico seleciona instituição e publica horário; paciente reserva com aceite e consulta os detalhes | Horário e vínculo válidos; abertura da sala externa previamente ensaiada |
| 4. Atendimento e exame | Médico e Paciente | Registro do atendimento; solicitação de exame; envio privado do arquivo sintético | Paciente, instituição e solicitação corretos; limite e confirmação do envio |
| 5. Avaliação | Médico | Arquivo privado; decisão explícita; tipagem conferida e confirmação | Exame e atendimento elegíveis; decisão humana de teste, sem aprovação automática prometida |
| 6. Situação e locais | Paciente/Doador | Situação atualizada; Estado/Município; busca por serviço e mapa de referência | Busca genérica não apresentada como lista personalizada ou atendimento garantido |
| 7. Necessidade e aviso | Representante e Paciente/Doador | Alteração conferida do nível institucional; aviso crítico autorizado na Comunidade; leitura da notificação | Usar banco de teste. Elegibilidade/compatibilidade e trava de reenvio podem impedir novo aviso para uma conta já avisada |
| 8. Registro de doação | Representante | Esta base não oferece tela de registro individual pelo menu. Mostrar o protótipo e explicar a separação entre doação e registro de bolsa | Para a demonstração completa por cliques, a interface de registro precisa estar disponível e homologada antes do ensaio final |
| 9. Estoque e visão administrativa | Representante e Administrador | Registrar bolsa em quarentena, motivo/referência de movimentação; mapa agregado e moderação | Estoque não substitui o evento de doação. O mapa não substitui o dashboard de indicadores previsto |
| 10. Indicadores, relatório e encerramento | Apresentador | Explicar os serviços de indicadores/PDF existentes e os protótipos correspondentes; mostrar resultados de teste, limites e próximos passos | O dashboard e o download por período não têm tela no cliente atual. Não anunciar essa parte como execução ao vivo concluída |

As etapas 8 e 10 são lacunas rastreáveis da cadeia exigida para a apresentação final. A existência de um endpoint ou de um teste automatizado não deve ser apresentada como navegação disponível ao usuário. O fluxo da equipe deve ser reensaiado quando essas interfaces forem integradas.

## Notas para evitar falhas de sequência

- Uma conta recém-cadastrada começa sem histórico. Tenha um cenário preparado de atendimento/exames para evitar depender de espera de horário durante a apresentação.
- Se precisar alternar entre o cenário de pré-cadastro e o cenário já aprovado, diga claramente que está usando outro registro de teste para mostrar a etapa seguinte.
- Enviar exame, validar resultado, registrar atendimento e movimentar bolsa são ações distintas. Confira a confirmação de cada uma.
- Para demonstrar o aviso de necessidade crítica, confira o último envio e os critérios do doador. Não desabilite a trava de reenvio para produzir uma notificação artificial.
- A busca no Maps e a sala de atendimento são serviços externos. O protótipo e os prints só ilustram o percurso quando não há conexão; não comprovam que o serviço externo foi aberto naquele ensaio.
- Não compartilhe uma captura de exame real como arquivo de teste. Use o documento sintético revisado pela equipe.

## Plano de apoio se a conexão falhar

| Falha | Ação durante a apresentação |
| --- | --- |
| Site ou API local não responde | Interromper a ação, conferir os serviços locais e usar a captura revisada da mesma etapa enquanto o responsável técnico verifica a conexão |
| Celular sem acesso à API do notebook | Demonstrar a etapa pelo site local previamente conferido; explicar que o app depende da mesma API e registrar que o teste no aparelho não foi executado naquele momento |
| Sala externa, IBGE ou Maps indisponível | Mostrar o estado de erro e a alternativa manual quando disponível; usar o protótipo como referência claramente identificada |
| Horário ocupado ou estado alterado | Atualizar a lista e revisar os dados; não criar registros repetidos ou forçar uma decisão para continuar a fala |
| Arquivo antigo inválido | Retornar à lista e escolher o arquivo sintético válido preparado. Não substituir dados existentes sem o procedimento de teste correspondente |
| Notificação crítica não é reenviada | Explicar o controle de compatibilidade/elegibilidade e de reenvio. Mostrar o aviso já registrado, quando houver, sem desabilitar a proteção |

## Apresentação preparada

Os [slides editáveis](apresentacao/hemobridge-apresentacao.pptx) estão preparados em português, com dez páginas. As [prévias e orientações de abertura](apresentacao/README.md) acompanham o arquivo para a revisão e o ensaio da equipe.

1. Capa e propósito da plataforma.
2. Problema e proposta.
3. Perfis e responsabilidades.
4. Jornada de acompanhamento.
5. Interfaces web e aplicativo, com a imagem do Figma identificada como protótipo.
6. Arquitetura do produto e plano AWS.
7. Persistência e proteção dos dados.
8. Testes e evidências, com datas e limites da homologação física.
9. Limites da entrega atual.
10. Próximos passos para a entrega.

O material de 22/10 preserva as datas reais dos testes: API e web locais de 21/10, integração e Flutter da CI de 19/10. A homologação física corresponde a uma base anterior e parcial. As contagens automatizadas não equivalem aos 23 casos formais aprovados. Antes do ensaio final, conferir os slides de limites e próximos passos contra a versão de código escolhida.

## Ficha do ensaio coletivo

| Campo | Preenchimento no ensaio |
| --- | --- |
| Data e horário | A registrar quando realizado |
| Versão/commit e ambiente | A registrar quando realizado |
| Participantes e divisão da fala | A registrar com os participantes reais |
| Duração observada | A medir no ensaio |
| Etapas percorridas e evidências | A registrar conforme a execução |
| Falhas e correções | Relacionar ao registro de defeitos e ao novo ensaio |
| Resultado do ensaio | Ainda não executado nesta preparação |

## Conferência de prontidão

- [ ] Ambiente local preparado e confirmado sem dados reais.
- [ ] Contas, vínculos, horários, arquivo sintético e avisos conferidos.
- [ ] Capturas atuais revisadas para todos os perfis.
- [ ] Navegação completa disponível para registro de doação, indicadores e relatório.
- [ ] Casos formais e resultados consolidados para os slides.
- [x] Slides preparados e revisados tecnicamente; revisão e ensaio da equipe ainda necessários.
- [ ] Ensaio coletivo executado e medido.
- [ ] Falhas do ensaio tratadas e sequência repetida.
- [ ] Responsável pela operação durante a apresentação definido entre os participantes.

A revisão e o merge do código permanecem com Jhonatan. As telas aprovadas pela equipe e os materiais deste roteiro não equivalem a um merge executado ou a uma publicação em produção.
