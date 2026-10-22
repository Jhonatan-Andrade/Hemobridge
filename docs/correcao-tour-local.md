# Conclusão do tour no ambiente local

Validação realizada em 18/10/2026 na instalação local, com as cinco contas da carga de testes.

## Causa e correção

O navegador acessava `http://127.0.0.1:5174`, enquanto a configuração autorizava somente `http://localhost:5174`. Na conclusão do tour, a proteção de origem da sessão recusava o POST com HTTP 403 e a mensagem “Origem da requisição não autorizada”.

O preparador agora declara explicitamente os dois endereços em `CORS_ORIGENS`, acrescentando a configuração quando ela ainda não existe. Ele continua recusando sobrescrever um arquivo `.env`. A porta de fallback da proteção da sessão foi alinhada à porta 5174 da aplicação. O exemplo de configuração e o guia de testes foram atualizados.

Na instalação local existente, somente a lista de origens foi ajustada; segredos e dados existentes foram preservados. Em produção, a lista deve conter somente os domínios HTTPS publicados. Cookies protegidos, autenticação e validação de origem continuam ativos.

## Resultado por perfil

| Conta de testes | Tour e persistência | Conferência pela interface |
|---|---|---|
| Paciente/Doador | Conclusão e recarga aprovadas | Painel, perfil, seleção de São Paulo/Campinas pelo IBGE, locais, envio de comentário e retorno à comunidade |
| Doador aprovado | Quatro etapas, conclusão e recarga aprovadas | Situação aprovada, tipo validado, notificações, consultas e envio de comentário |
| Médico | Quatro etapas, conclusão e recarga aprovadas | Instituição, agenda, publicação de horário, tela de atendimentos, listagem de exames, publicação com selo e comentário |
| Representante de Hospital | Quatro etapas, conclusão e recarga aprovadas | Necessidades, registro de bolsa em quarentena, aviso institucional com prazo fixado no topo e comentário |
| Administrador | Quatro etapas, conclusão e recarga aprovadas | Mapa regional, seleção da região Sul, informações por território, estado vazio de moderação, publicação e comentário |

Na comunidade, o retorno de uma publicação preservou a origem e recolocou o foco no controle da publicação. O tour do doador permaneceu aberto ao pressionar Escape. A seleção de Estado/Município foi conferida sem salvar alterações nos dados do paciente.

## Verificações automatizadas e da API

- Seis testes unitários de sessão aprovados, incluindo as duas origens locais autorizadas, origem ausente, endereço indevido, porta incorreta e configuração de produção.
- Lint e compilação da API aprovados.
- Preparador conferido com configuração de CORS comentada, ativa e arquivo `.env` preexistente; preservação byte a byte do arquivo existente.
- Cinco logins aprovados e dez conclusões de tour aprovadas: cada conta foi exercitada pelas duas origens locais.
- Cinco consultas de sessão confirmaram `isFirstAccess=false` e `tourVersion=1`.
- Cinco tentativas com origem externa foram recusadas com HTTP 403, conforme esperado.
- Dezessete consultas às áreas autorizadas retornaram HTTP 200.

As 42 requisições estão resumidas em [evidências da API](evidencias/tour-origens-perfis-2026-10-18.json), sem cookies, tokens, senhas ou dados pessoais.

## Escopo dos dados de teste

Foram criados comentários identificados como teste, uma publicação do médico, uma publicação administrativa, um aviso institucional, um horário em 21/10/2026 e a bolsa `HB-TESTE-NAV-20261018` em quarentena, exclusivamente no banco local de testes. Nenhum exame real foi usado. A conferência da tela de exames cobriu a listagem, sem certificar o download dos arquivos da carga.

Esta rodada verifica o defeito de conclusão do tour e as operações descritas acima. Ela não substitui homologação de GPS em aparelhos físicos, operação clínica real ou implantação na AWS.
