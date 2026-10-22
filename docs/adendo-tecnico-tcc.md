# Adendo técnico para consolidação do TCC

Consolidação: 21/10/2026. Este texto descreve o código integrado e deve ser incorporado às seções de implementação, persistência e validação do trabalho final. Não substitui a revisão editorial nem altera o documento de referência original.

## Implementação atual

O HemoBridge possui frontend React/TypeScript integrado à API NestJS, Prisma e PostgreSQL/PostGIS. Perfis de Paciente/Doador, Médico, Representante de Hospital e Administrador acessam operações autorizadas por sessão e instituição. A comunidade permite publicações, comentários e reações, paginação, denúncia e moderação. Perfis conferidos têm identificação e avisos críticos institucionais recebem prioridade com prazo de validade.

O modelo diferencia **necessidade qualitativa** por instituição/tipo sanguíneo de **estoque de bolsas**. Bolsas possuem código rastreável, hemocomponente, coleta, validade, quarentena, liberação, reserva, utilização, descarte e movimentação imutável. Portanto, a afirmação histórica de que o sistema não controla bolsas não descreve mais o código integrado. O registro de doação não implica liberação técnica nem muda automaticamente a necessidade qualitativa.

A navegação web usa barra lateral no desktop e acionador de menu na resolução mobile. O aplicativo Flutter adota organização por funcionalidades e destinos inferiores por perfil. IBGE fornece UFs e municípios; a captura GPS do aplicativo é pontual, solicitada por clique e com alternativa manual. O tour é obrigatório no primeiro acesso dos clientes, personalizado por perfil e concluído por conta no servidor, com versão e data.

## Integridade e proteção

Restrições PostgreSQL e serviços da API aplicam unicidade, compatibilidade e regras da jornada. Exames privados são validados por assinatura e tamanho e cifrados antes do armazenamento S3. Auditoria e movimentações de estoque não admitem alteração ou exclusão ordinária. Sessões são revogadas por versão; operações institucionais de desativação cancelam consultas futuras e preservam outros vínculos ativos do médico.

Avisos críticos usam evento persistido junto à atualização da necessidade, coordenação transacional e janela de sete dias por instituição/doador. E-mails têm reserva de processamento e tentativas limitadas; seu conteúdo é genérico. O SMTP não fornece garantia de entrega exatamente uma vez diante de perda de confirmação. Detalhes de saúde ficam na área autenticada.

Pedidos de encerramento têm análise administrativa, resposta fundamentada e trilha de execução. Contatos e credenciais são removidos ou inutilizados, sessões são revogadas e conteúdo público é retirado. Registros sujeitos a conservação mantêm vínculo de identificação cifrado e revisão de retenção. Essa medida é pseudonimização; não equivale à eliminação integral dos registros clínicos nem à certificação jurídica da operação.

## Evidência e limitações

As baterias automatizadas verificam código e serviços locais descartáveis; a [matriz de rastreabilidade](rastreabilidade-de-testes.md) distingue essa cobertura do aceite dos 23 casos formais. O Figma representa interfaces e transições e não executa banco, GPS ou autenticação real.

O plano AWS inclui RDS privado cifrado, API em ECS/Fargate, S3 privado, credenciais no Secrets Manager, HTTPS e cache desabilitado nas rotas autenticadas. Esses recursos estão documentados e preparados como configuração, sem comprovação de implantação ou operação nesta entrega. Carga representativa, restauração de backup, gestão das chaves, canal jurídico real e homologação clínica continuam necessários antes de dados reais.

Os formulários nativos de cadastro, edição dos campos autorizados do perfil, consultas, envio de exames, agenda, avaliação médica e estoque foram implementados. O APK debug foi compilado e uma base anterior às últimas correções foi instalada em Android real. Permanece a homologação física da versão corrigida, incluindo arquivos, permissões, operações completas e sessões. Não há IPA nem assinatura de distribuição. Consulte o [registro Android](homologacao-android-2026-10-19.md).

A API contém contratos administrativos, registro de doação e relatórios que não possuem todos os seus formulários expostos no candidato web. Aprovação dos protótipos não comprova a implementação dessas páginas. O manual distingue os destinos atualmente acessíveis das lacunas do roteiro completo. As seções finais devem registrar essas limitações, o estado dos [casos formais](rastreabilidade-de-testes.md) e a separação entre preparação e implantação efetiva na AWS.
