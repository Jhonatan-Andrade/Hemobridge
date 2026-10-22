# Revisão do manual e evidências de interface

Preparado em 21/10/2026 e consolidado em 22/10 sobre a base editorial `7b3ac2e4` e a conferência web `1b64f929`. Este registro acompanha a revisão do manual. Não atribui aceite dos casos formais de teste nem conclui a homologação física.

## O que está pronto neste material

- Índice e orientações comuns, incluindo apresentação inicial, navegação por plataforma, comunidade, segurança e mensagens de recuperação.
- Cinco capítulos de uso: Visitante, Paciente/Doador, Médico, Representante de Hospital e Administrador.
- Passos conferidos pela leitura dos controles e rotas existentes, com diferenças explícitas entre web e app.
- Roteiro de apresentação separado, com preparação, percurso executável e limites da cadeia completa.

## Fontes verificadas

| Conteúdo | Fontes do código |
| --- | --- |
| Acesso, cadastro e recuperação | `frontend/src/pages/auth.tsx`; `app/lib/features/auth/login_page.dart`; `app/lib/features/account/registration_page.dart`; `app/lib/main.dart` |
| Menu e destinos por perfil | `frontend/src/components/navigation-items.ts`; `frontend/src/components/unified-header.tsx`; `app/lib/features/navigation/app_shell.dart` |
| Paciente, consultas e exames | `frontend/src/pages/patient.tsx`; `frontend/src/pages/patient-journey.tsx`; `app/lib/features/patient/patient_workspace.dart` |
| Localização e municípios | `frontend/src/pages/local-discovery.tsx`; `frontend/src/components/location-selects.tsx`; `app/lib/features/locations/locations_page.dart` |
| Médico, necessidades, estoque, mapa e moderação | `frontend/src/pages/professional.tsx`; `frontend/src/components/exam-review.tsx`; `app/lib/features/professional/`; `app/lib/features/workspace/role_workspace.dart` |
| Privacidade e perfil profissional | `frontend/src/pages/privacy-requests.tsx`; `frontend/src/pages/professional-profile.tsx` |
| Comunidade e acessibilidade | `frontend/src/pages/community.tsx`; `app/lib/features/community/community_page.dart`; `frontend/src/pages/accessibility.tsx` |

## Figuras incluídas

Cada capítulo recebeu uma captura da aplicação web executada em 21/10 com dados de teste: Início, painel, agenda, necessidades e mapa. O [registro de responsividade](../testes/responsividade-web-2026-10-21.md) reúne 47 capturas e medições em 360, 768 e 1440 px. O navegador foi operado pelos controles visíveis, incluindo login dos cinco cenários de conta, menus, IBGE e leitura/retorno de comentários. Nenhuma operação clínica foi enviada nessa conferência.

As imagens adicionais abaixo são **capturas de protótipos do Figma**, identificadas dessa forma nas legendas. Não são capturas do app executado nem resultados clínicos reais.

| Figura | Capítulo | Arquivo |
| --- | --- | --- |
| Confirmação de agendamento | Paciente/Doador | `docs/design/evidencias/figma-app-consulta-confirmar.png` |
| Confirmação de envio de arquivo | Paciente/Doador | `docs/design/evidencias/figma-app-exame-confirmar.png` |
| Perfil do paciente | Paciente/Doador | `docs/design/evidencias/figma-app-perfil-resumo.png` |
| Confirmação de avaliação | Médico | `docs/design/evidencias/figma-clinica-desktop-confirmar.png` |
| Necessidade crítica | Representante | `docs/design/evidencias/figma-app-necessidades-critico.png` |
| Movimentação de bolsa | Representante | `docs/design/evidencias/figma-app-estoque-liberacao.png` |

Não foram copiados os registros brutos do aparelho. Não foram incluídas imagens antigas com faixa de demonstração, captura com CPF completo, notificação pessoal do celular ou exame real.

## Diferenças de escopo que afetam a apresentação

O backend contém serviços que não possuem entrada no menu do cliente web atual. A existência do serviço e de um protótipo não comprova que o usuário dispõe de uma tela correspondente.

| Operação | Evidência do serviço | Situação da interface nesta base |
| --- | --- | --- |
| Cadastro de hospitais e representantes | `backend/src/admin/hospitais-admin.controller.ts` | Não há rota/tela dedicada na navegação React atual |
| Administração de usuários e solicitações de acesso | `backend/src/admin/usuarios-admin.controller.ts` | Não há formulário/listagem equivalente no menu React atual; não confundir com solicitações de privacidade, que possuem tela |
| Cadastro e manutenção de médicos | `backend/src/representante/medicos.controller.ts` | Não há formulário/listagem equivalente no menu do representante atual |
| Registro de doação e busca por CPF | `backend/src/representante/doacoes.controller.ts` | Não há tela de doação individual no React/app atual. Registrar uma bolsa no estoque é uma operação diferente |
| Indicadores e PDF de relatórios | `backend/src/indicadores/indicadores.controller.ts` | Não há dashboard de indicadores nem formulário de período/download no React/app atual. O mapa administrativo não substitui esses indicadores |
| Compatibilidade sanguínea | `backend/src/tipagem/tipagem.controller.ts` | Não há consulta dedicada no menu React/app atual |
| Lista priorizada de instituições recomendadas | Serviços de recomendação do backend | A página Locais atual oferece busca genérica por localidade/serviço; não é uma lista de recomendação personalizada por elegibilidade |

As duas últimas operações devem ser conferidas contra o contrato e o protótipo aprovado no fechamento de escopo. Este material descreve o comportamento observado sem substituir a definição de entrega da equipe.

## Conferências para a edição final

| Item | Estado em 21/10/2026 |
| --- | --- |
| Capítulos e passos por perfil | Preparados; conferidos com o código desta base |
| Prints atuais da aplicação web executada para cada perfil | Capturados em 21/10 com contas de teste e incluídos nos capítulos |
| Complementar referências de protótipo com prints do código | Concluído para a web; captura do APK corrigido continua pendente |
| Percorrer os passos com pessoa que não participou do desenvolvimento | A realizar |
| Demonstrar pelo menu todas as operações exigidas no roteiro final | A completar, especialmente registro de doação e indicadores/relatórios |
| Homologação física do app corrigido e dos fluxos externos | A realizar conforme o relatório Android |
| Slides e ensaio com a equipe | Dez slides editáveis preparados e conferidos em 22/10; ensaio coletivo ainda não realizado |

O [registro Android](../homologacao-android-2026-10-19.md) diferencia a base instalada no aparelho das correções posteriores. O manual não transforma os testes automatizados ou a aprovação visual do Figma em aprovação desses cenários físicos.
