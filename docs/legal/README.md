# Textos jurídicos do HemoBridge — revisão de 15/10/2026

## Estado e uso correto

Estes arquivos separam o **protótipo atualmente testável** da **operação real planejada**. O aviso em [`aviso-do-prototipo.md`](aviso-do-prototipo.md) pode ser usado na demonstração. As minutas de termos, privacidade, consentimento, sigilo e comunidade **não devem ser apresentadas como documentos vigentes de um serviço real** até que os itens abaixo sejam preenchidos, a arquitetura de dados seja conferida e haja revisão jurídica e da equipe de saúde. Redigir textos não torna o serviço conforme à legislação.

Os nomes **Instituto Ponte Viva** (instituição fictícia) e **Marina Ribeiro** (pessoa fictícia) servem somente para exemplos de revisão. Eles não identificam o controlador, encarregado, hospital parceiro, profissional habilitado nem canal de contato do HemoBridge. Não foram inventados CNPJ, endereço, CRM, e-mail funcional ou parceria real.

| Documento | Uso proposto | Situação |
| --- | --- | --- |
| [`aviso-do-prototipo.md`](aviso-do-prototipo.md) | Revisão navegável e pacote para colegas | Texto compatível com o frontend inspecionado; conferir o ambiente de hospedagem antes de divulgá-lo |
| [`armazenamento-e-cookies.md`](armazenamento-e-cookies.md) | Tecnologias da versão de avaliação | Inventário do código próprio; terceiros e hospedagem ainda exigem verificação no domínio final |
| [`termos-de-uso.md`](termos-de-uso.md) | Serviço futuro | Minuta dependente de identificação real, funcionalidades e canais |
| [`aviso-de-privacidade.md`](aviso-de-privacidade.md) | Serviço futuro | Minuta dependente do mapa de dados, bases legais, agentes e infraestrutura |
| [`consentimento-dados-de-saude.md`](consentimento-dados-de-saude.md) | Pré-cadastro futuro, RF02 | Minuta específica; versão e registro de aceite precisam corresponder ao backend |
| [`responsabilidade-e-sigilo-profissional.md`](responsabilidade-e-sigilo-profissional.md) | Primeiro acesso profissional futuro | Minuta a conciliar com a versão do termo no backend e com regras institucionais |
| [`regras-da-comunidade.md`](regras-da-comunidade.md) | Comunidade futura | Critérios editoriais; depende de canal e processo de moderação |

## Decisões necessárias antes de publicar um serviço real

1. Identificar controlador(es), razão social, CNPJ, endereço, contato funcional de privacidade, responsável/encarregado quando aplicável e papel de cada hospital, banco de sangue e fornecedor. Divulgar a identidade e contato do encarregado se houver dever de indicação; eventual dispensa não elimina canal com o titular.
2. Fazer inventário de dados e fluxos efetivos: pré-cadastro, exames, tipo sanguíneo, decisões médicas, agenda, notificações, comunidade, perfis profissionais, logs, serviços externos, hospedagem e transferências internacionais. Registrar finalidade, base legal por operação, destinatários, prazo e medidas de segurança realmente implantadas.
3. Definir a governança do acesso de **adolescentes de 16 e 17 anos**, inclusive o melhor interesse, segurança por padrão, processo de autorização para doação, interação na comunidade e análise de incidência do ECA Digital. O checkbox atual não resolve isso.
4. Validar quem guarda eventual **prontuário** e quais documentos fazem parte dele. A Lei 13.787/2018 prevê prazo mínimo de 20 anos **a partir do último registro** para prontuários; não autoriza aplicar automaticamente esse prazo a todo dado clínico ou comentário. O frontend de avaliação esclarece esse alcance, mas a política de encerramento da operação real ainda precisa ser definida.
5. Definir procedimento de direitos do titular, encerramento de conta, revogação do consentimento, retenção, eliminação, segurança e resposta a incidentes; confirmar que os botões e canais realmente funcionam antes de afirmá-lo ao público.
6. Inventariar cookies, armazenamento local, métricas e terceiros após escolher domínio e hospedagem. Hoje o React usa `localStorage` para escala de texto, escolha do VLibras e tour visto; quando acionado, carrega o script de terceiros `https://vlibras.gov.br/app/vlibras-plugin.js`. Não foi encontrado cookie escrito pelo código próprio, mas isso não prova ausência de cookies da infraestrutura ou de terceiros.
7. Revisar a comunidade: política de moderação, denúncia, resposta, proteção de dados de saúde e riscos para adolescentes. A versão atual mantém comentários somente na memória da página.
8. Conferir `GET /pacientes/termo-consentimento` e `GET /auth/primeiro-acesso/termo`: o backend inspecionado declara ambos como **versão 1.0** com resumos curtos. A integração deve buscar o texto integral vigente, registrar versão/data de aceite, comparar versões e incrementar versão ao mudar o conteúdo. Este pacote não alterou backend.

## Pontos de integração no React

- `frontend/src/App.tsx`: o diálogo `dialogKind === 'term'` apresenta o aviso da versão de avaliação, alinhado a [`aviso-do-prototipo.md`](aviso-do-prototipo.md), sem criar aparência de consentimento real. O encerramento de conta explicita que a ação é simulada; o procedimento operacional ainda precisa ser definido.
- `frontend/src/pages/Auth.tsx` e `frontend/src/pages/formModel.ts`: o checkbox em `register` e `first` hoje apenas confirma leitura do aviso. No serviço real, separar **aceite dos termos** de **consentimento específico e destacado para dados sensíveis**; nenhum pré-marcado. Informar consequência da recusa, registrar versão e encaminhar pedido de direitos. O primeiro acesso profissional deve usar termo de sigilo próprio.
- `frontend/src/pages/Community.tsx`: inserir link de regras próximo à composição de comentário e oferecer denúncia/moderação somente quando houver fluxo implementado. Conteúdo de saúde não deve aparecer no feed público por acidente.
- `frontend/src/services/accessibilityPreferences.ts`: documentar no site as três preferências locais e a ativação do VLibras conforme [`armazenamento-e-cookies.md`](armazenamento-e-cookies.md); reavaliar após mudar scripts ou hospedagem.
- Rodapé/menu: oferecer links públicos persistentes aos documentos efetivamente vigentes, com data/versão. Não publicar as minutas com campos pendentes.

## Fontes oficiais verificadas

- [Lei Geral de Proteção de Dados, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm): arts. 5º, 6º, 7º–9º, 11, 14–18, 20, 41, 46 e 48.
- [Marco Civil da Internet](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm): direitos dos usuários, informação sobre dados e registros.
- [Direitos dos titulares — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares).
- [Guia de cookies — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf).
- [Regulamento do encarregado — ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/encarregado-completo_ocultado.pdf).
- [Lei 13.787/2018: prontuários](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm).
- [ECA Digital, Lei 15.211/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm) e [orientações atuais da ANPD](https://www.gov.br/anpd/pt-br/assuntos/eca-digital).
- [Enunciado ANPD sobre crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).
- [Comunicação de incidente de segurança — ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).

As fontes foram consultadas em 15/10/2026. Revalidar a legislação e os fluxos reais antes da publicação.
