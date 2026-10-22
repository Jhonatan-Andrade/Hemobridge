import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/private_file_page.dart';
import 'package:hemobridge/core/session_controller.dart';
import 'package:hemobridge/features/auth/login_page.dart';
import 'package:hemobridge/features/navigation/app_shell.dart';
import 'package:hemobridge/main.dart';

class PendingLogin extends SessionController {
  final Completer<void> pending = Completer<void>();
  PendingLogin() : super(ApiClient());
  @override
  Future<void> login(String email, String password) => pending.future;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'repetir abertura privada recupera erro sem retornar Future em setState',
    (tester) async {
      var count = 0;
      final api = ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((_) async {
          count++;
          return count == 1
              ? http.Response('{"message":"Indisponível."}', 503)
              : http.Response.bytes(utf8.encode('{}'), 200);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          home: PrivateFilePage(
            api: api,
            path: '/arquivo',
            title: 'Resultado privado',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Indisponível.'), findsOneWidget);
      await tester.tap(find.text('Tentar novamente'));
      await tester.pumpAndSettle();
      expect(count, 2);
      expect(
        find.textContaining('não possui um formato compatível'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('logout limpa também rotas privadas empilhadas', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient((req) async {
        return http.Response(
          jsonEncode(
            req.url.path == '/paciente/perfil'
                ? {'name': 'Paciente de teste', 'status': 'PRE_CADASTRADO'}
                : {},
          ),
          200,
        );
      }),
    );
    final session = SessionController(api)
      ..ready = true
      ..isFirstAccess = false
      ..user = {
        'id': 'paciente-1',
        'perfil': 'PACIENTE',
        'nome': 'Paciente',
        'email': 'teste@example.invalid',
      };
    addTearDown(session.dispose);
    await tester.pumpWidget(HemoBridgeApp(session: session));
    await tester.pumpAndSettle();
    unawaited(
      Navigator.of(tester.element(find.byType(AppShell))).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              const Scaffold(body: Text('Conteúdo privado empilhado')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Conteúdo privado empilhado'), findsOneWidget);
    await session.logout();
    await tester.pumpAndSettle();
    expect(find.text('Conteúdo privado empilhado'), findsNothing);
    expect(find.byType(LoginPage), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'resposta do login após sair da tela não usa controller descartado',
    (tester) async {
      final session = PendingLogin();
      addTearDown(session.dispose);
      await tester.pumpWidget(MaterialApp(home: LoginPage(session: session)));
      await tester.enterText(
        find.byType(TextFormField).first,
        'teste@example.invalid',
      );
      await tester.enterText(
        find.byType(TextFormField).at(1),
        'SenhaTeste2026',
      );
      await tester.ensureVisible(find.text('Entrar'));
      await tester.tap(find.text('Entrar'));
      await tester.pump();
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: Text('Outra tela'))),
      );
      session.pending.complete();
      await tester.pumpAndSettle();
      expect(find.text('Outra tela'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
