# Interfaces oficiais

Arquivo editável: https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge

As telas atuais usam Poppins, magenta e petróleo, componentes de campos e botões e a marca horizontal oficial. Versões anteriores e telas de iteração foram removidas do arquivo ativo. Referências locais anteriores ficam fora do repositório de entrega.

Desktop web: navegação lateral expansível. Web mobile: acionador de menu, sem barra de ícones persistente. Aplicativo: navegação inferior com quatro destinos conforme o perfil; marca no cabeçalho. Comunidade existe em todos os perfis. O aplicativo preserva identidade e espaçamento, com distribuição adaptada a telas menores.

Os três pontos iniciais são as páginas do visitante. Após o login, uma conta com apresentação pendente recebe primeiro a introdução à plataforma; só a ação posterior à explicação abre o tour. São seis etapas para Paciente/Doador e quatro para cada perfil profissional, totalizando 54 estados nas três versões. As 12 introduções, revisões e estados de falha são tratados separadamente. A barra acompanha avanço e retorno, sem avanço automático. A conclusão real é versionada por conta no servidor; no Figma, variáveis de sessão representam esse estado e não gravam no banco.

Os prazos clínicos dependem da unidade; não são inventadas médias para triagem, exames ou atualização de status. A coleta em si tem referência geral de cerca de dez minutos, conforme Hemominas; isso não representa o atendimento completo ou a espera na unidade.

O registro institucional de doação tem estados próprios de busca, conferência da coleta, confirmação e registro avulso. Entradas: [desktop](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=999-14094), [web mobile](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=999-14584) e [app](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=999-14945). Essa operação é diferente de registrar uma bolsa em quarentena e não altera automaticamente a necessidade ou libera estoque.

Os seletores representam Estado antes de Município; o código consulta a API do IBGE. A cartografia do mapa administrativo também vem do IBGE. Dados de necessidade exibidos no produto devem ser consultados da API, sem interpretar ausência de informação como estoque adequado.

Figma representa layouts, transições e estados. GPS, autenticação, persistência e atendimento dependem do código e dos serviços publicados. A execução real desses serviços é validada separadamente.

O atendimento administrativo de privacidade possui estados de pedido pendente, análise de encerramento/recusa, resposta concluída/recusada e falha de gravação. Entradas: [desktop](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=800-8511) e [web mobile](https://www.figma.com/design/7aKvXrajoLmEGpaYsn0dQ1/Hemobridge?node-id=800-8589). Esses estados usam componentes e textos editáveis da biblioteca e são acessíveis pelo Perfil administrativo no protótipo. A implementação desse atendimento está disponível na web; a paridade nativa do app continua documentada separadamente.
