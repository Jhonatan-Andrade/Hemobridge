# Rotas novas da API (tarefas do Gean)

Complemento do `docs/rotas.html` com as rotas criadas nas tarefas HEM-33, 36–38, 42, 44, 45,
50–53. Todas exigem `Authorization: Bearer <token>`, salvo indicação. Erros seguem o padrão
do Nest (`{ statusCode, message, error }`).

## Notificações (HEM-36/37, UC12) — qualquer usuário autenticado, só as próprias

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/notificacoes?somenteNaoLidas=&pagina=&tamanhoPagina=` | Lista (mais recente primeiro) + `naoLidas` |
| GET | `/notificacoes/nao-lidas` | `{ naoLidas }` para o ícone |
| GET | `/notificacoes/:id` | Conteúdo completo; marca como lida (404 se for de outro usuário) |
| POST | `/notificacoes/marcar-todas-lidas` | `{ atualizadas, naoLidas: 0 }` |

`PUT /representante/necessidades` passou a responder também `doadoresNotificados` (UC19, HEM-38).

## Bancos de sangue (HEM-33, UC03)

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/hospitais?estado=&cidade=&tipos=` | Público | Com `tipos`, só bancos que informaram nível desses tipos; `mensagem` quando vazio |
| GET | `/hospitais/filtros-padrao` | Autenticado | `{ estado, cidade, tipos }` do cadastro (tipo só para Doador) |

## Consultas do paciente (HEM-42, UC10) — perfil PACIENTE

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/paciente/consultas` | Médico, data/hora, situação; `linkVideochamada` só a partir de 15 min antes |
| GET | `/paciente/consultas/horarios-disponiveis?medicoId=&data=AAAA-MM-DD` | Horários livres em 30 dias |
| POST | `/paciente/consultas/:id/cancelar` | Corpo `{ motivo? }`; 422 com menos de 24 h |
| POST | `/paciente/consultas/:id/reagendar` | Corpo `{ disponibilidadeId }`; 409 se o horário acabou de ser reservado |

## Exames (HEM-44/45, UC11/UC15)

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| POST | `/medico/consultas/:consultaId/solicitar-exames` | MEDICO | Corpo `{ exames: string[], orientacoes? }` |
| GET | `/medico/exames/:exameId/arquivo` | MEDICO | Arquivo, só para o médico da consulta |
| GET | `/paciente/exames` | PACIENTE | "Meus exames": situação, orientações, motivo de reprovação, envios |
| POST | `/paciente/exames/:solicitacaoId/envios` | PACIENTE | `multipart/form-data`, campo `arquivo` (PDF/JPG/PNG até 5 MB) |
| GET | `/paciente/exames/envios/:exameId/arquivo` | PACIENTE | Arquivo do próprio exame |

## Doações (HEM-50, UC20) — perfil REPRESENTANTE, só o próprio hospital

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/representante/doacoes?de=&ate=&pagina=` | Doações do hospital |
| POST | `/representante/doacoes/buscar-doador` | Corpo `{ cpf }`; doador aprovado ou oferta de doação avulsa |
| POST | `/representante/doacoes/avulsa` | Corpo `{ dataColeta: 'AAAA-MM-DD', tipo }` |

## Dashboards e relatórios (HEM-51/52/53, UC23/UC24)

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/representante/indicadores?de=&ate=` | REPRESENTANTE | Padrão: últimos 30 dias |
| GET | `/admin/indicadores?de=&ate=` | ADMINISTRADOR | Agregado + doadores aprovados + críticos por estado |
| GET | `/representante/relatorios/:tipo?de=&ate=` | REPRESENTANTE | PDF: `doacoes-por-tipo`, `historico-necessidades` |
| GET | `/admin/relatorios/:tipo?de=&ate=` | ADMINISTRADOR | PDF: os dois acima + `consolidado-por-hospital` |
