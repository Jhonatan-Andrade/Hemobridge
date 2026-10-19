# Aplicativo HemoBridge

Aplicativo Flutter/Dart para Android e iOS, com Poppins, cores magenta e petróleo, cards arredondados e navegação inferior. Compartilha contratos da API com o site. Não armazena exames ou dados de saúde nas preferências locais.

## Executar e validar

Instale o Flutter e os SDKs da plataforma. Execute flutter pub get, flutter analyze e flutter test. Use flutter run --dart-define=API_URL=https://seu-dominio/api com o endereço do ambiente autorizado. Em modo release, o cliente recusa API sem HTTPS. O endereço acima é apenas a forma de configuração; nenhum domínio foi provisionado por este projeto.

O token permanece no armazenamento seguro do sistema operacional. A conclusão da apresentação inicial é gravada no servidor por conta, somente após a última etapa. Uma falha de gravação mantém o bloqueio e oferece nova tentativa; limpar os dados locais não redefine a conclusão no banco. O GPS usa geolocator somente após acionamento e permissão, com uma captura pontual e limite de 15 segundos, sem acompanhamento contínuo. A posição fica somente na memória da tela. Estado e município pelo IBGE continuam disponíveis sem GPS. Consulte o [fluxo de geolocalização e roteiro de validação](../docs/geolocalizacao.md).

## Escopo implementado

Cadastro com termo vigente, login, recuperação e troca da senha inicial; apresentação por perfil; perfil do paciente com IBGE; consultas, reserva, cancelamento e reagendamento; seleção/envio e visualização privada de exames; agenda por instituição e histórico, atendimento e avaliação médica; necessidades e operações de estoque; comunidade, IBGE/GPS, Maps, mapa administrativo com cartografia real e moderação. O aplicativo usa os contratos da API e apresenta carregamento, vazio, erro, confirmação e recuperação de conflitos.

A agenda usa Próximos/Histórico e páginas de 30. Trocar instituição ou período invalida respostas antigas. O paciente não altera a tipagem validada; decisões médicas exigem autorização do servidor e confirmação explícita. Sair da conta remove também as telas privadas abertas. A administração completa de contas/instituições permanece no site.

A análise Dart e os 71 testes de serviço/widget passaram em 19/10/2026. A compilação Android de testes usa JDK 21 e SDK 36; o fluxo de integração contínua compila o APK debug para ARM64 e x64 e publica o artefato identificado pelo commit por sete dias, somente quando a compilação passa. GPS, seleção de arquivos, PDF e integrações externas precisam de validação em aparelhos reais. Consulte a [preparação e execução Android](../docs/preparacao-android.md) e a [homologação dos fluxos nativos](../docs/homologacao-fluxos-nativos.md).

## Distribuição

Android exige SDK, licenças e chave de assinatura própria em android/key.properties, que não entra no Git. iOS exige macOS, Xcode, equipe de assinatura e perfis de distribuição. Atualize os identificadores de publicação com o domínio da organização antes do primeiro envio às lojas. Credenciais, certificados e chaves não acompanham o código.
