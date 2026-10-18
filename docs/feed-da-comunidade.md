# Destaques e ordem da comunidade

A API identifica os autores e confere seus vínculos. O perfil `MEDICO` é apresentado no contrato do feed como `doctor`. O selo **Perfil Verificado** e o destaque visual médico exigem `verified: true`, calculado pelo servidor após a conferência do registro profissional e do vínculo ativo. O front-end não cria uma verificação apenas pelo texto da role. Representantes e instituições verificados também mantêm seu selo.

Avisos críticos e urgências de estoque publicados por representantes de hospitais ou hemocentros verificados entram como `AVISO_CRITICO`, com assunto institucional e validade definida. A API autoriza essa operação e entrega `pinned` e `pinnedUntil`; uma palavra como “urgente” no texto não fixa uma publicação. A validade máxima permanece em sete dias. Atualizações de estoque e notificações privadas não são transformadas automaticamente em publicações públicas.

O feed separa **Avisos prioritários** e **Publicações recentes**. Dentro de cada grupo, a ordem é da data de publicação mais recente para a mais antiga, com desempate estável pelo identificador. A junção de páginas preserva reações e comentários já carregados, elimina duplicatas e recoloca novos avisos no topo. Essa mesma ordenação alimenta a prévia na página inicial e o retorno após abrir um post.

Quando a validade termina, o aviso perde a fixação e retorna à sua posição cronológica, sem precisar recarregar a página. A data-limite fica visível no card. Publicações de médicos usam um destaque em petróleo; avisos prioritários usam magenta e ícone de fixação. Os rótulos e selos também comunicam a diferença sem depender somente da cor.

Os testes em `frontend/tests/community-rendering.test.mjs` renderizam os componentes reais e verificam selos, destaques, seções e expiração. `frontend/tests/feed-expiration.test.mjs` cobre cronologia, fuso horário, paginação, duplicatas, preservação de interações e rejeição de fixação incompatível com o perfil. Execute `npm test`, `npm run lint`, `npm run check:naming` e `npm run build` em `frontend`.
