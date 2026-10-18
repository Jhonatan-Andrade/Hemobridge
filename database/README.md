# Banco de dados

`backend/prisma/schema.prisma` descreve o modelo de aplicação. A cadeia em `backend/prisma/migrations` acrescenta verificações, índices, exclusão de horários sobrepostos e triggers que o modelo Prisma não representa integralmente. `schema.sql` consolida essa cadeia para revisão e instalação alternativa em **banco vazio**. Gere novamente com `node database/generate-schema.mjs`.

Para atualizar um ambiente existente, execute `prisma migrate deploy` com identidade de migração e backup verificado. Não execute o SQL consolidado sobre um banco que já tem tabelas. Uma instalação feita pelo consolidado exige registrar a linha de base das migrações antes de passar a usar o Prisma Migrate. O caminho recomendado para todos os ambientes é a cadeia versionada.

| Domínio | Persistência e controle |
|---|---|
| Conta e permissões | Usuário, perfis, versão de sessão, vínculo institucional e conferência de registro profissional |
| Privacidade | Consentimento com versão/finalidade/data, pedidos de exclusão e auditoria imutável |
| Jornada clínica | Paciente, pré-triagem, disponibilidade, consultas, solicitações de exame, metadados dos envios e doações |
| Hospitais | Endereço, coordenadas PostGIS, fonte e data de verificação; vínculo de médico com várias instituições |
| Necessidade | Nível qualitativo por instituição e tipo sanguíneo, autor e histórico de atualização |
| Bolsas | Código rastreável por instituição, tipo, hemocomponente, coleta, validade, quarentena/liberação/reserva/uso/descarte e histórico imutável |
| Comunidade | Publicações por assunto, comentários, reações únicas por usuário, denúncias e situação de moderação |
| Avisos críticos | Apenas representante ativo de instituição verificada; expiração de até sete dias; fixação calculada no servidor |
| Prazos | Estimativas de etapas por instituição, duração em minutos, fonte e atualização |

Necessidade qualitativa e quantidade de bolsas são informações diferentes. O mapa administrativo considera declarações recentes de instituições verificadas, com janela de 24 horas. Ausência de informação não significa estoque adequado. A aplicação não infere escassez nacional a partir de endereços ou de uma instituição isolada.

O seed de produção cria tipos sanguíneos, compatibilidade de concentrado de hemácias e o administrador inicial configurado por variáveis seguras. A massa de testes fica separada e não deve ser importada para produção. O banco compartilhado da VM não recebeu as migrações do bundle, conforme a mensagem do autor; os bancos de testes da VM são ambientes diferentes. Esta entrega foi validada em um PostgreSQL/PostGIS local temporário.

Não guardar senhas em texto simples, tokens de recuperação, arquivos clínicos ou chaves S3 em tabelas de conteúdo público. A API usa consultas parametrizadas e autorização por proprietário/instituição. Na AWS, o banco fica privado, cifrado e acessível apenas à aplicação e à tarefa de migração.
