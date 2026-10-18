# Site HemoBridge

Aplicação React/TypeScript conectada à API. Sessão por cookie HttpOnly; perfis e permissões vêm do servidor. Não existe seleção local de papel profissional. A comunidade usa persistência no PostgreSQL, paginação, comentários autenticados, perfis verificados e avisos críticos ativos no topo.

## Executar

Use Node.js 24. Execute npm ci e npm run dev -- --host 127.0.0.1 --port 5174. Inicie a API na porta 3000; o proxy do Vite remove /api no desenvolvimento. Para outra topologia, configure VITE_API_URL. Em produção, a distribuição deve encaminhar /api para a API com cache desabilitado.

## Organização

Arquivos em src seguem kebab-case. Componentes e tipos usam PascalCase; funções e variáveis usam camelCase. Os estilos ficam em src/styles. api-client centraliza transporte, use-resource centraliza carregamento e ibge-localities fornece os seletores encadeados de UF e município com cancelamento, cache e tentativa novamente.

Desktop usa navegação lateral expansível. Web mobile mostra apenas o acionador do menu. A navegação inferior pertence ao aplicativo Flutter. A apresentação inicial por perfil é obrigatória; isFirstAccess é persistido por usuário apenas após a conclusão. Preferências locais não guardam token ou dados clínicos.

## Verificação e publicação

Execute npm run lint, npm run check:naming e npm run build. Para publicar, configure VITE_LEGAL_ENTITY_NAME e VITE_PRIVACY_CONTACT, então execute npm run build:production. Nunca inclua segredos em variáveis VITE_: elas são públicas. O Dockerfile gera a distribuição e o nginx serve os arquivos na porta 8080 como usuário não root.

Locais usa cartografia e buscas de referência. A localização é opcional. Informações de disponibilidade e necessidades devem vir das instituições; a pesquisa externa não comprova que uma unidade realiza determinado procedimento.
