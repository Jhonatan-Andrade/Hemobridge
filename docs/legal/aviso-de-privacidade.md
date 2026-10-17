# Aviso de privacidade do HemoBridge — minuta para serviço futuro

**Status: não vigente; não publicar sem mapa de dados, identificação real e revisão jurídica.** Versão da minuta 0.2, 17/10/2026. Este texto descreve o **desenho pretendido**, não afirma que as integrações existem.

## Quem decide sobre os dados

**[CONTROLADOR REAL: razão social, CNPJ e endereço]** decidirá sobre o tratamento de dados para as finalidades que lhe couberem. **[CONTATO REAL DE PRIVACIDADE]** receberá pedidos dos titulares. **[NOME E CONTATO DO ENCARREGADO, SE APLICÁVEL]** serão divulgados nos termos da legislação; eventual dispensa deverá ser fundamentada e acompanhada de canal de contato. Antes da operação, definir se hospitais e bancos de sangue atuarão como controladores independentes, conjuntos ou operadores em cada fluxo. O nome “Instituto Ponte Viva” e a pessoa “Marina Ribeiro” são fictícios e não devem ocupar esses campos.

## Dados, finalidades e hipóteses legais a validar

| Operação prevista | Categorias mínimas previstas | Finalidade | Base legal candidata — confirmar por operação |
| --- | --- | --- | --- |
| Pré-cadastro e conta | Nome, CPF, contato, data de nascimento, localidade, credenciais | Criar acesso e comunicar etapas | Art. 7º, V, da LGPD para procedimentos solicitados pelo titular; outras bases somente se justificadas |
| Triagem e avaliação, se implantadas | Peso, informações de saúde, exames e tipo sanguíneo | Permitir avaliação por equipe habilitada e orientação da jornada | Art. 11, I, com consentimento específico e destacado no fluxo previsto; ou outra hipótese do art. 11 apenas se comprovadamente aplicável à operação concreta |
| Consulta, se integrada | Disponibilidade, solicitação, confirmação e dados necessários à consulta | Organizar atendimento com instituição participante | Base a definir conforme responsável e natureza do atendimento; tutela da saúde do art. 11, II, “f”, exige procedimento por profissional, serviço de saúde ou autoridade sanitária |
| Conta profissional | Identificação, vínculo institucional, credenciais, perfil e registros de acesso | Autorizar somente tarefas compatíveis com o papel | Base legal a definir pelo controlador e pelas instituições conforme vínculo e obrigações |
| Comunidade, se publicada | Nome de exibição, publicação, comentário e interação | Exibir e organizar conversas | Base legal a definir; não incluir dados de saúde no feed público por padrão |
| Busca de locais, se mantida na operação | Cidade e UF digitadas; região aproximada somente se a pessoa escolher usar a localização | Apresentar mapa de referência e facilitar a busca externa por locais de doação e exames | Base legal, necessidade e fornecedores a definir por operação; a permissão do navegador para geolocalização não substitui a análise da LGPD |
| Segurança e direitos | Registros técnicos estritamente necessários, pedidos e respostas | Proteger o serviço, responder ao titular e cumprir obrigações | Base e prazo a justificar por categoria; verificar se o regime do art. 15 do Marco Civil se aplica ao operador real |

Este quadro não substitui o registro das operações nem concede autorização genérica. Dados de saúde são **sensíveis**; a equipe deve aplicar necessidade, acesso mínimo e avaliação de risco. Não usar dado de saúde para publicidade direcionada ou comercialização. Compartilhamentos entre controlador, profissional, instituição e fornecedores exigem finalidade, papel, contrato e transparência específicos.

## Compartilhamento, fornecedores e localização

Os destinatários efetivos, fornecedores de hospedagem, mensagens, métricas, acessibilidade, mapas e busca de locais, bem como eventual transferência internacional, devem ser descritos **antes da coleta real**: **[LISTA DE DESTINATÁRIOS E FINALIDADES]**, **[PAÍSES E MECANISMO DE TRANSFERÊNCIA, SE HOUVER]**. Caso o mapa e as buscas externas permaneçam no serviço final, avaliar especificamente os fluxos para OpenStreetMap e Google Maps, suas condições e políticas, a alternativa para quem não conceder localização e a minimização da região compartilhada. O acesso por profissionais deverá respeitar a atribuição e a instituição vinculada. Não presumir que um hospital possa ver informações de outro. Pedidos de autoridades serão avaliados segundo a legislação aplicável.

## Guarda, proteção e eliminação

Cada categoria terá prazo documentado em **[TABELA DE RETENÇÃO REAL]**, conforme finalidade, obrigações legais e necessidade. Ao término, os dados serão eliminados ou tratados conforme as hipóteses do art. 16 da LGPD. Eventual **prontuário** segue legislação própria: a Lei 13.787/2018 prevê prazo mínimo de 20 anos contado do último registro, com condições para eliminação; isso não autoriza declarar retenção de 20 anos para todo dado da plataforma. As medidas técnicas e administrativas **[MEDIDAS COMPROVADAMENTE IMPLANTADAS]** deverão ser descritas sem prometer segurança absoluta. Incidentes com risco ou dano relevante serão avaliados e comunicados na forma da regulamentação da ANPD.

## Seus direitos

Pelo canal **[CANAL REAL]**, o titular poderá pedir confirmação e acesso, correção, informação sobre compartilhamento, anonimização/bloqueio/eliminação quando cabível, portabilidade conforme regulamentação, informação sobre a possibilidade de não consentir e as consequências, revogação de consentimento e revisão de decisão exclusivamente automatizada que afete seus interesses, se esse tratamento existir. Pedidos de eliminação serão analisados diante das hipóteses de conservação previstas em lei. Antes de responder ou alterar dados, a equipe poderá verificar a identidade do solicitante de forma proporcional. O titular também pode peticionar à ANPD pelos canais oficiais.

## Adolescentes

O projeto prevê eventual pré-cadastro de pessoas de 16 e 17 anos. Qualquer tratamento deve observar o melhor interesse do adolescente (LGPD, art. 14), com informação adequada à idade, fluxo de autorização clínica quando exigido e análise das salvaguardas do ECA Digital aplicáveis ao site e à comunidade. **[POLÍTICA DE IDADE, AFERIÇÃO, RESPONSÁVEL E MODERAÇÃO]** precisa ser decidida antes de aceitar dados reais; uma caixa de seleção não basta.

## Tecnologias locais e terceiros

O protótipo usa `localStorage` para escala de texto, opção de carregamento do VLibras e marca de tour visto. Publicações e comentários criados na comunidade ficam apenas na memória da página durante a sessão. Quando ativado, o VLibras é carregado do domínio `vlibras.gov.br`. A página de locais incorpora um mapa do OpenStreetMap; ao abri-la, o navegador pode se conectar ao serviço externo e transmitir dados técnicos. A localização do dispositivo só é solicitada após a pessoa acionar “Ver minha região”; uma coordenada arredondada é então incluída no endereço do mapa enviado ao OpenStreetMap. As buscas por cidade e tipo de serviço abrem no Google Maps somente após o clique. Antes da operação pública, realizar inventário de cookies e outras tecnologias no domínio final, indicar responsáveis, finalidades e duração, oferecer escolhas quando a base legal exigir e não pré-autorizar tecnologias não necessárias. Consultar também o [aviso específico do protótipo](aviso-do-prototipo.md).

## Atualizações

Informaremos alterações relevantes de finalidades, agentes, compartilhamentos e período de tratamento de modo destacado, com **[DATA DE VIGÊNCIA]**, **[VERSÃO]** e **[HISTÓRICO]**. Se determinada finalidade depender de consentimento e mudar de forma incompatível, haverá nova informação e possibilidade de revogação, conforme a LGPD.
