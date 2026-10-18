# Armazenamento local e cookies

Inventário do código integrado, atualizado em 18/10/2026. Os cookies e serviços do domínio publicado devem ser conferidos no ambiente efetivo; este inventário não certifica tecnologias de terceiros.

| Chave ou recurso | Tecnologia e finalidade | Duração observada no código | Escolha do usuário |
| --- | --- | --- | --- |
| `hemobridge.fontScale` | `localStorage`; memoriza o tamanho de texto escolhido | Permanece até alteração ou limpeza do navegador | Controle de tamanho de texto em Acessibilidade |
| `hemobridge.vlibrasAuto` | `localStorage`; memoriza a ativação automática do VLibras | Removido ao desativar a opção ou limpar o navegador | Controle de VLibras em Acessibilidade |
| `__Host-hb_session` | Cookie de autenticação HttpOnly, Secure e SameSite=Lax em produção; emitido pelo servidor | Validade do token configurada na API; padrão de 15 minutos | Criado ao entrar e removido ao sair; o logout também revoga as sessões no servidor |
| `hb_session` | Nome do cookie de sessão utilizado somente no ambiente local | Mesma validade da sessão | Não é o nome usado na publicação HTTPS |
| `https://vlibras.gov.br/app/vlibras-plugin.js` | Script externo do VLibras carregado quando ativado | Política de armazenamento do fornecedor externo não auditada nesta revisão | A opção de carregamento automático é configurável; verificar também eventual ativação manual do widget no ambiente final |

O JavaScript não lê o cookie HttpOnly. O token do app permanece no armazenamento seguro do sistema operacional. A conclusão versionada do tour é salva no PostgreSQL por conta, não nas preferências do dispositivo. Dados de conta, conteúdo da comunidade e informações clínicas são persistidos pela API segundo sua finalidade e autorização; não são armazenados nas chaves de acessibilidade.

**Texto curto para a interface:** “Usamos um cookie necessário para sua sessão e guardamos suas preferências de acessibilidade no navegador. Ao ativar o VLibras, carregamos um recurso externo. A conclusão da apresentação é salva na sua conta.”

Antes de ativar tecnologias adicionais, registrar responsável, finalidade, duração e base legal. Quando dependerem de consentimento, permitir aceitar e recusar em condições equivalentes, sem pré-seleção e com revisão posterior. Referência: [Guia Orientativo de Cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf).
