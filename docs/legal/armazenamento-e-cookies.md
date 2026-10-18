# Armazenamento local e cookies — versão de avaliação

**Inventário limitado ao código React inspecionado em 15/10/2026.** Antes de usar domínio público, verificar no navegador real os cabeçalhos, cookies, serviços de hospedagem e recursos externos. Este texto não deve afirmar que o site inteiro está livre de cookies.

| Chave ou recurso | Tecnologia e finalidade | Duração observada no código | Escolha do usuário |
| --- | --- | --- | --- |
| `hemobridge.demo.fontScale` | `localStorage` próprio; memoriza tamanho de texto escolhido | Sem expiração programada; permanece até ser alterado ou removido pelo navegador | Controle de tamanho de texto na página de acessibilidade |
| `hemobridge.demo.vlibrasAuto` | `localStorage` próprio; memoriza se o VLibras deve carregar automaticamente | Sem expiração programada; removido ao desativar a opção | Controle de VLibras na página de acessibilidade |
| `hemobridge.demo.tourSeen.<perfil>` | `localStorage` próprio; evita reabrir o tour automaticamente para o perfil já visto | Sem expiração programada; pode ser apagado pelo navegador | O tour continua disponível para reabertura; não há controle de limpeza dessa chave na interface inspecionada |
| `https://vlibras.gov.br/app/vlibras-plugin.js` | Script externo do VLibras carregado quando ativado | Política de armazenamento do fornecedor externo não auditada nesta revisão | A opção de carregamento automático é configurável; verificar também eventual ativação manual do widget no ambiente final |

Não foi encontrado uso de `document.cookie` nem serviço próprio de análise ou publicidade no frontend. Isso **não equivale** a auditoria de cookies do provedor de hospedagem, do navegador ou do VLibras. O protótipo usa a memória da página para dados de formulário, perfil e comentários simulados; o código próprio não os grava nas três chaves acima.

**Texto curto para a interface:** “Guardamos no seu navegador as preferências de acessibilidade e a indicação de tour já visto. Se você ativar o VLibras, carregaremos um recurso externo. Conheça os detalhes e limpe essas preferências nas configurações do navegador.”

No serviço real, inventariar cada tecnologia não necessária, responsável, finalidade, duração e base legal. Se a escolha depender de consentimento, permitir aceitar e recusar em condições equivalentes, sem pré-seleção e com revisão posterior. Referência: [Guia Orientativo de Cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf).
