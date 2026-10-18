# Aplicativo HemoBridge

Aplicativo Flutter/Dart para Android e iOS, com Poppins, cores magenta e petróleo, cards arredondados e navegação inferior. Compartilha contratos da API com o site. Não armazena exames ou dados de saúde nas preferências locais.

## Executar e validar

Instale o Flutter e os SDKs da plataforma. Execute flutter pub get, flutter analyze e flutter test. Use flutter run --dart-define=API_URL=https://seu-dominio/api com o endereço do ambiente autorizado. Em modo release, o cliente recusa API sem HTTPS. O endereço acima é apenas a forma de configuração; nenhum domínio foi provisionado por este projeto.

O token permanece no armazenamento seguro do sistema operacional. A conclusão da apresentação inicial é uma preferência booleana por usuário, gravada apenas na última etapa. O GPS usa geolocator somente após acionamento e permissão, com uma captura pontual e limite de 15 segundos, sem acompanhamento contínuo. A posição fica somente na memória da tela. Estado e município pelo IBGE continuam disponíveis sem GPS. Consulte o [fluxo de geolocalização e roteiro de validação](../docs/geolocalizacao.md).

## Escopo implementado

Login, recuperação e troca da senha inicial; apresentação por perfil; comunidade com publicações e comentários; localização com IBGE/GPS e abertura do Maps; leitura das agendas e instituições do médico, exames, necessidades, estoque, mapa administrativo com cartografia real e moderação. O aplicativo usa dados da API e apresenta estados de carregamento, vazio e falha.

O site possui formulários clínicos e administrativos adicionais. A paridade integral dessas operações no app ainda exige implementar e homologar cadastro nativo, edição completa do perfil, agendamento/reagendamento, envio de exames e formulários de estoque/agenda. Não publique o app como substituto integral do site enquanto estes fluxos não estiverem concluídos.

## Distribuição

Android exige SDK, licenças e chave de assinatura própria em android/key.properties, que não entra no Git. iOS exige macOS, Xcode, equipe de assinatura e perfis de distribuição. Atualize os identificadores de publicação com o domínio da organização antes do primeiro envio às lojas. Credenciais, certificados e chaves não acompanham o código.
