# Homologação Android — 19/10/2026

O APK debug da base `609b4cb75d3020392aece62f5c6b198e5378d3f6` foi compilado pela [CI 39256118974](https://github.com/Jhonatan-Andrade/Hemobridge/actions/runs/39256118974), verificado, instalado e aberto em Android 16/API 36 ARM64. A árvore do merge de verificação `49790025a724c92553f10c24757a5d09e35cda16` era idêntica à origem. Assinatura Android Debug verificada; SHA-256 do APK: `1e6ee25699bee28619c7d8a1b109fb8e275d1ab3467c4c6d17ed5ff9cfb10b4d`.

O aparelho tem resolução 1280 × 2772, densidade 520 e escala de fonte 1,0, aproximadamente 394 pixels lógicos de largura. A API do notebook foi acessada por encaminhamento USB para localhost:3000. A instalação isolada não disponibiliza servidor ou banco no celular. Foram utilizadas somente contas e registros de teste, com autorização da usuária para instalação, controle USB e uma captura pontual de localização.

## Resultados observados no aparelho

| Cenário | Verificado | Limite |
| --- | --- | --- |
| Paciente/Doador | Login; painel Pré-cadastrado; consulta cancelada; exames em estado vazio; perfil; alteração de UF limpando Município e lista IBGE correta; comunidade e leitura de três comentários; retorno à Comunidade; saída | Seleções do perfil não foram salvas. Nenhuma consulta, publicação ou comentário novo foi gravado nesta etapa |
| Doador aprovado | Login; situação Aprovado/A+; solicitação e histórico de exame validado; comunidade; perfil; saída | O PDF antigo da massa de teste falhou no leitor nativo; abertura não aprovada |
| Médico | Login; agenda por instituição; histórico de atendimentos realizados; lista de exames atribuídos; comunidade; perfil; saída | Houve falha transitória de conexão antes da recuperação do encaminhamento USB. A lista carregou na verificação posterior. Não houve nova decisão clínica |
| Representante de Hospital | Login; necessidades; estoque e ações disponíveis; comunidade; formulário com aviso crítico e aceite das normas; perfil; saída | Formulário cancelado. Não houve alteração de necessidade ou movimentação de bolsa |
| Administrador | Login; mapa das cinco regiões com cartografia IBGE; comunidade; moderação em estado vazio; perfil; saída | Sem denúncia disponível para testar decisão de moderação; mapa sem necessidade atualizada no conjunto consultado |

A busca manual DF → Brasília habilitou a ação do Google Maps. O fluxo de GPS abriu a permissão do Android e apresentou “Localização obtida” após autorização no aparelho. Nenhuma coordenada foi registrada e o Maps não foi aberto com a posição. O nível de precisão concedido e a limpeza da posição não foram confirmados separadamente. A sessão final foi encerrada, deixando a tela de entrada.

## Correções posteriores ao APK testado

- Comunidade: publicação protegida contra fechamento durante envio; paginação de comentários com trava concorrente, deduplicação e recuperação de erros; seletor de tema sem o overflow horizontal reproduzido a 360 px.
- Arquivo privado: falha do motor PDF apresenta mensagem em português, nova tentativa e retorno, sem expor exceção, caminhos ou stack trace.
- Carga de testes: o PDF anterior continha apenas assinatura e EOF, sem estrutura válida. O gerador agora utiliza o pdfkit já instalado e produz um documento sintético completo e reproduzível. Dois testes verificam xref, offsets, referências e conteúdo; Poppler aceitou e renderizou uma página A4.

Os objetos antigos armazenados não foram sobrescritos e nenhum seed, reset ou migração foi executado para esta homologação. A correção do gerador vale para novas cargas de teste; não corrige automaticamente arquivos existentes. O APK instalado da base indicada acima ainda não contém as correções posteriores.

## Verificações automatizadas e pendências

A base do APK teve CI aprovada com 403 testes e compilação Android. Após as correções, a suíte Flutter completa passou com 76 testes, a API com 221 testes unitários, lint e build aprovados. Os 78 testes integrados da API e 35 testes web da base anterior não equivalem a testes físicos do aplicativo.

Restam: compilar e homologar fisicamente as correções; seleção e envio nativos de PDF/JPG/PNG e limites; abertura do PDF corrigido; recusa/permissão permanente, GPS desligado, timeout e concorrência com busca manual; Maps e teleconsulta externos; publicação e envio de comentários; operações clínicas/estoque completas; expiração de sessão e primeiro acesso obrigatório em conta ainda não concluída. As cinco contas já tinham concluído as boas-vindas no servidor, portanto sua ausência nesta etapa não valida o primeiro acesso.

O emulador e a compilação local ficaram limitados pelo espaço em disco; o APK usado veio da CI. iOS, assinatura de produção, lojas, API pública HTTPS e ensaio AWS permanecem fora desta homologação. O aceite dos 23 casos formais requer evidência própria; não está encerrado por esta contagem de testes. O merge permanece sob revisão do Jhonatan.

Identificador USB, coordenadas, credenciais, logs de terceiros, capturas não selecionadas e dados pessoais do aparelho não acompanham este relatório ou o código. As evidências brutas permanecem fora do repositório; somente material revisado deve ser compartilhado.
