# Alinhamento com os requisitos originais

Referência de implementação: `docs/2026-2_Parcial_HemoBridge_01.pdf`, versão preexistente na main `f9842755ea1a82a4c4aa3297df492f0828f8e99c` (SHA-256 `64078fd34b0b95b4942a2ebae13e7a6d6423807f97d77607be702a8eb4e216d8`). O PDF histórico permanece inalterado. O resumo `docs/requisitos.md`, anterior ao PDF, não substitui os 31 RF, oito RNF e 21 RN do documento completo.

## Referência e ampliações

| Tema | Núcleo do PDF completo | Ampliação preservada |
| --- | --- | --- |
| Doações e necessidades | RF18 registra doação vinculada ou avulsa; necessidades são níveis qualitativos declarados pelo representante | Estoque físico de bolsas, lotes e movimentos, separado da necessidade qualitativa |
| Cadastro médico | Representante cadastra o médico e declara a conferência do CRM | Vínculos ativos com várias instituições |
| Localização | Consulta pública e recomendação autenticada por compatibilidade | IBGE, captura pontual de GPS, Maps e mapa administrativo |
| Comunicação | Notificações privadas e avisos de necessidade crítica | Comunidade, comentários, verificação e moderação |
| Acesso | Autenticação e perfis autorizados | Apresentação obrigatória persistida por conta |

Essas ampliações resultam de solicitações posteriores do projeto. Não alteram retroativamente o significado dos identificadores do PDF. A doação registrada não reduz nem recalcula automaticamente o nível declarado de necessidade.

## Contratos implementados em 23 e 24/10/2026

Esta seção descreve os contratos do código local. O [registro da rodada de 24/10](testes/alinhamento-requisitos-2026-10-24.md) apresenta as verificações aprovadas e seus limites; os resultados de 23/10 são históricos e antecedem os ajustes finais.

| Requisito / caso | API e persistência | Clientes e teste automatizado |
| --- | --- | --- |
| RF28, UC09 | `GET/POST /paciente/pre-triagem`: questionário versionado, respostas, resultado e data orientativa, privados do paciente | Pré-triagem antes dos horários na web e no app; `jornada-clinica.e2e-spec.ts`, `pre-triagem.service.spec.ts`, `patient_journey_test.dart` |
| RN10, UC09 | `POST /paciente/agendamentos` exige `preTriagemId`, aceita pré-cadastrado ou reprovado e registra o consentimento de telessaúde | Novo ciclo preserva o histórico; os serviços de exames restringem alterações ao ciclo atual; testes de titularidade e ciclo anterior |
| RF29, UC14 | `GET/PATCH /medico/consultas/:id` e `POST /medico/consultas/:id/cancelar`: observações, decisão, motivo de inaptidão, ausência e cancelamento antes do início | Agenda e atendimento web/app; `atendimento.service.spec.ts`, `jornada-clinica.e2e-spec.ts` |
| RF18/RF24, UC20/UC21 | `POST /representante/doacoes`: paciente aprovado, peso aferido, data, condições de elegibilidade, bloqueio concorrente e auditoria na mesma transação; a confirmação de doação anterior aos 60 anos, quando informada, é persistida no registro vinculado | Registrar doação na área institucional web/app; `doacoes-vinculadas.e2e-spec.ts`, `doacoes.service.spec.ts`, `representative_donations_page_test.dart` |
| RF11/RF23, UC17 | `GET /paciente/locais-recomendados`: tipagem do cadastro, matriz doador→receptor, níveis crítico/baixo/estável e estimativa de elegibilidade | Locais na web/app; `locais-recomendados.e2e-spec.ts`, `locais-recomendados.service.spec.ts`, `locations_page_test.dart` |
| RNF05 | Auditoria de leituras de perfil, solicitações de exames, pré-triagem e atendimento, sem copiar respostas clínicas para o log | Testes de domínio e integração; trilha identifica usuário, ação, entidade e instante |
| RF30, UC12 | API de notificações existente, leitura individual e `POST /notificacoes/marcar-todas-lidas` | Caixa completa na web/app, destinos internos permitidos e retorno preservado; testes de destino e widgets |

A recomendação ordena por nível de necessidade, próprio tipo, mesma cidade e mesmo estado. Distância, quando autorizada e disponível, só desempata depois desses critérios. A busca pública por tipo exato continua disponível e tem finalidade distinta. Estimativas não substituem a avaliação presencial.

## Compatibilidade dos clientes

O agendamento passa a exigir uma pré-triagem própria, vigente e ainda utilizável. Um cliente antigo sem `preTriagemId` recebe erro de validação; o servidor não inventa respostas para manter uma compatibilidade aparente. Web, app e fixtures foram atualizados juntos. Reagendamento conserva a pré-triagem e o ciclo da consulta original.

`POST /representante/doacoes/avulsa` e as consultas de histórico continuam disponíveis. Encontrar um doador identificado não converte automaticamente sua doação em avulsa quando houver impedimento.

Os caminhos legados `/post` permanecem depreciados, com resposta 410 e indicação do módulo de comunidade. Não há consumidor web/app atual que dependa da escrita pública antiga; ambos usam `/comunidade/publicacoes`, com autenticação e normas. Não reativar uma rota de escrita pública para acomodar um cliente obsoleto.

## Instalação e preservação de dados

O motor é **PostgreSQL com PostGIS**, tanto no Prisma quanto no SQL e no adaptador de execução. A presença transitiva de `mysql2` nas ferramentas Prisma não configura uma conexão MariaDB da aplicação.

O caminho canônico de desenvolvimento é `backend/docker-compose.yml`. O Compose histórico de `database/` foi alinhado a PostGIS, exposição em loopback e segredos obrigatórios; seu volume `pgdata` foi preservado. Não subir ambos sobre o mesmo banco nem remover volumes para resolver problemas de instalação.

A árvore local contém **16 migrações**: as 13 anteriores são preservadas e três novas completam os contratos sem preencher dados clínicos retroativamente.

| Migração nova | Finalidade e preservação |
| --- | --- |
| `20261023090000_pre_triagem_e_ciclos_clinicos` | Versão da pré-triagem, vínculo da consulta, motivo de inaptidão e retirada lógica de horário. Campos legados permanecem nulos. A chave estrangeira composta impede vincular a pré-triagem de outra pessoa, inclusive em gravação direta no banco. |
| `20261023100000_disponibilidade_cancelada_historica` | Conserva o horário retirado no histórico e aplica unicidade/exclusão de sobreposição apenas às disponibilidades ativas. Cancelar logicamente uma disponibilidade não impede criar um novo horário válido para aquele período. |
| `20261023110000_confirmacao_doacao_antes_dos_60` | Adiciona `Doacao.doouAntesDos60Confirmado` como booleano opcional para a declaração necessária quando o histórico anterior aos 60 anos não consta na plataforma. A restrição impede atribuir a declaração a uma doação avulsa. Registros anteriores permanecem nulos; a declaração não é inventada nem equivale a validação clínica. |

Em ambiente existente, identificar primeiro banco e `_prisma_migrations`, verificar restauração de backup e então aplicar `prisma migrate deploy`. Não usar reset. O consolidado `database/schema.sql` serve somente para banco vazio; uma instalação por esse caminho exige baseline antes do uso do Prisma Migrate.

As validações desta rodada utilizam serviços locais exclusivos e descartáveis. Não aplicam migrações na VM, não alteram o banco do notebook e não representam implantação AWS ou homologação clínica em aparelho real. Resultados executados ficam no [registro de testes da rodada](testes/alinhamento-requisitos-2026-10-24.md). A [medição HTTP de UC17 em 24/10](testes/desempenho-uc17-2026-10-24.md) usa as 16 migrações e registra p95 de 52,8 ms, dentro dos limites locais descritos. A [medição de 23/10](testes/desempenho-uc17-2026-10-23.md), com 15 migrações e outra massa, permanece histórica.
