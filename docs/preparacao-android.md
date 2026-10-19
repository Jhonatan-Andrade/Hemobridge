# Preparação e execução Android

O aplicativo de testes usa a mesma API local do site. O APK debug contém as arquiteturas ARM64 e x64. Ele permite verificar a navegação em aparelhos compatíveis e em emulador; não é uma versão para a Play Store. A compilação e a homologação física são etapas distintas.

## Ferramentas

- Flutter 3.41.5, com o lockfile de dependências do repositório.
- JDK 21 para Gradle 8.14 e Android Gradle Plugin 8.11.1. O Java incluído em uma instalação mais recente do Android Studio pode ser diferente; confirme o executável exibido pelo Flutter.
- Android SDK Command-line Tools, Platform-Tools, Build-Tools 36.0.0 e plataforma Android 36.
- NDK 28.2.13676358 e CMake 3.22.1 para as dependências nativas.

No SDK Manager do Android Studio, instale os componentes ausentes. Revise pessoalmente as licenças solicitadas. Para conferir a instalação no PowerShell:

```powershell
flutter doctor -v
flutter doctor --android-licenses
flutter devices
```

Se for necessário selecionar um JDK 21 já instalado, use `flutter config --jdk-dir="CAMINHO_DO_JDK_21"`. Essa configuração é local da ferramenta e não deve ser substituída por um caminho absoluto no repositório. As instruções oficiais de [configuração Android do Flutter](https://docs.flutter.dev/platform-integration/android/setup) detalham componentes, licenças e conexão de aparelhos.

## API e banco locais

Preserve as configurações existentes do backend e os volumes de banco e arquivos. Confira `http://127.0.0.1:3000/health/ready` antes de iniciar outra API. Uma resposta de saúde válida permite reutilizar a instância existente; `EADDRINUSE` indica que a porta já está ocupada.

O projeto em `C:\Users\email\HemoBridge` contém a instalação local do notebook. Siga o [guia de testes](guia-de-testes.md) para preparar a API quando ela não estiver em execução. Não execute seed ou restauração sobre dados de uma instalação existente apenas para testar o app.

## Conectar um celular

1. Ative as Opções do desenvolvedor e a Depuração USB no Android.
2. Conecte o cabo USB e confirme pessoalmente no celular a autorização deste computador.
3. Use `adb devices -l`. O estado deve ser `device`; `unauthorized` requer conferir a confirmação no celular. Não prossiga com outro aparelho por engano.
4. Substitua `SERIAL_DO_APARELHO` nas instruções abaixo pelo identificador listado. O redirecionamento conecta a porta do celular à API do notebook sem abrir uma porta pública ou exigir uma regra de firewall.

```powershell
$taskAdb = "$env:LOCALAPPDATA\Android\sdk\platform-tools\adb.exe"
& $taskAdb devices -l
& $taskAdb -s SERIAL_DO_APARELHO reverse tcp:3000 tcp:3000
```

O APK de testes usa `http://127.0.0.1:3000`. A API precisa estar em execução e o redirecionamento USB deve continuar ativo. Instalar o APK sozinho não instala a API ou o banco no celular. Refazer a conexão USB pode exigir repetir o redirecionamento.

## Compilar e executar

Dentro da pasta `app`:

```powershell
flutter pub get
flutter build apk --debug --target-platform android-arm64,android-x64 --dart-define=API_URL=http://127.0.0.1:3000
```

O resultado de uma compilação concluída fica em `app/build/app/outputs/flutter-apk/app-debug.apk`. Para instalar nesse aparelho:

```powershell
& $taskAdb -s SERIAL_DO_APARELHO install -r .\build\app\outputs\flutter-apk\app-debug.apk
```

Para depurar com o aparelho conectado, use `flutter run -d SERIAL_DO_APARELHO --dart-define=API_URL=http://127.0.0.1:3000`. O identificador atual do aplicativo é `br.com.hemobridge.hemobridge`.

Se um aparelho ARM de 32 bits precisar ser atendido, ele requer uma compilação adicional que inclua `android-arm`; o artefato atual cobre ARM64 e x64. A versão mínima Android do projeto acompanha o Flutter 3.41.5 (API 24).

## Emulador e espaço livre

O AVD instalado no notebook usa a imagem Google Play API 37. O armazenamento mínimo exigido pela imagem pode ser maior que o valor escolhido no campo de partição; reduzir esse campo não garante que o emulador caiba no disco. Confira o espaço solicitado no log de inicialização. O diretório original do AVD deve ser preservado.

Para testes na API local, o emulador também aceita o redirecionamento ADB para `127.0.0.1:3000`. A configuração debug permite HTTP somente para `localhost`, `127.0.0.1` e `10.0.2.2`; demais destinos continuam exigindo conexão segura. Essa exceção pertence apenas ao manifesto debug. O cliente release continua recusando uma API sem HTTPS.

## Compilação no GitHub

O job `aplicativo` usa Temurin 21 e Flutter 3.41.5. Após análise e testes, compila o APK debug e o publica como `hemobridge-android-debug-SHA_DO_COMMIT`, com retenção de sete dias. Consulte o resultado efetivo do job antes de baixar; ausência do arquivo faz a etapa falhar. O APK não contém credenciais de usuários nem configura uma API pública.

## Critérios de homologação

Conferir os cinco cenários de conta: paciente, doador aprovado, médico, representante e administrador. Validar entrada/saída, apresentação inicial quando aplicável, abas do perfil, comunidade, comentários e retorno para o contexto correto. No paciente, conferir IBGE, reserva/reagendamento/cancelamento e solicitações de exames. No médico, instituições autorizadas, agenda, histórico, retomada e avaliação. No representante, necessidades, confirmações e estoque. No administrador, mapa e moderação.

No aparelho real, testar recusa/permissão de localização, GPS desligado e captura pontual, além de seleção PDF/JPG/PNG, limite e assinatura de arquivo, visualização privada e abertura voluntária de Maps/teleconsulta. Use somente dados de teste. Não envie exames pessoais e não registre coordenadas pessoais nos relatórios. Documente dispositivo, versão Android, commit/APK, resultado por cenário, capturas do HemoBridge e erros pertinentes; testes ainda não executados continuam pendentes.

Publicação exige API HTTPS acessível, assinatura própria, identificador definitivo, revisão de privacidade e configuração operacional. Não gere ou publique uma chave de assinatura no Git. A validação Android não substitui a homologação iOS, o aceite dos roteiros formais ou o ensaio AWS.
