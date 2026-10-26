import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/session_controller.dart';
import 'package:hemobridge/features/auth/login_page.dart';
import 'package:hemobridge/features/home/public_home_page.dart';
import 'package:hemobridge/features/navigation/app_shell.dart';
import 'package:hemobridge/features/onboarding/tour_content.dart';
import 'package:hemobridge/main.dart';

const startJourney = 'Entendi o HemoBridge. Conhecer minha jornada';
http.Response response(Object value, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(value)),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Map<String, Object> user(String role, {bool first = true}) => {
  'id': 'conta-$role',
  'perfil': role,
  'nome': 'Conta de teste',
  'email': 'teste@example.invalid',
  'isFirstAccess': first,
  'senhaProvisoria': false,
  'tourVersion': 1,
};

Object fixture(String path) => switch (path) {
  '/paciente/perfil' => {
    'name': 'Conta de teste',
    'status': 'APROVADO',
    'bloodType': 'A+',
  },
  '/representante/necessidades' => {
    'hospital': {'nome': 'Instituição de teste'},
    'necessidades': [],
  },
  '/admin/mapa-necessidades' => {
    'instituicoesVerificadas': 0,
    'janelaHoras': 48,
    'itens': [],
  },
  '/comunidade/publicacoes' => {'items': [], 'hasMore': false},
  _ => [],
};

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  testWidgets(
    'sem sessão inicia na Home; login só por escolha e Voltar retorna à Home',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var calls = 0;
      final session = SessionController(
        ApiClient(
          baseUrl: 'https://api.example.invalid',
          client: MockClient((_) async {
            calls++;
            return response({});
          }),
        ),
      )..ready = true;
      addTearDown(session.dispose);
      await tester.pumpWidget(HemoBridgeApp(session: session));
      await tester.pumpAndSettle();
      expect(find.byType(PublicHomeShell), findsOneWidget);
      expect(find.byType(LoginPage), findsNothing);
      expect(find.text('O que é o HemoBridge?'), findsOneWidget);
      expect(find.byType(Dialog), findsNothing);
      expect(calls, 0);
      await tester.tap(find.text('Entrar').last);
      await tester.pumpAndSettle();
      expect(find.byType(LoginPage), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(LoginPage), findsNothing);
      expect(find.text('O que é o HemoBridge?'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final role in ['PACIENTE', 'MEDICO', 'REPRESENTANTE', 'ADMINISTRADOR']) {
    testWidgets(
      '$role: sessão pendente monta área e introdução; tour só após CTA e conclui no servidor',
      (tester) async {
        tester.view.physicalSize = const Size(360, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final calls = <String>[];
        var completions = 0;
        final session =
            SessionController(
                ApiClient(
                  baseUrl: 'https://api.example.invalid',
                  client: MockClient((request) async {
                    calls.add(request.url.path);
                    if (request.url.path == '/auth/tour/conclusao') {
                      completions++;
                      expect(jsonDecode(request.body), {'versao': 1});
                      return response({
                        'isFirstAccess': false,
                        'tourVersion': 1,
                      });
                    }
                    return response(fixture(request.url.path));
                  }),
                ),
              )
              ..ready = true
              ..user = user(role);
        addTearDown(session.dispose);
        await tester.pumpWidget(HemoBridgeApp(session: session));
        await tester.pumpAndSettle();
        expect(find.byType(AppShell), findsOneWidget);
        expect(find.byType(Dialog), findsNothing);
        expect(find.text('Conheça o HemoBridge'), findsOneWidget);
        expect(calls, isEmpty);
        expect(
          tester.widget<NavigationBar>(find.byType(NavigationBar)).destinations,
          hasLength(4),
        );
        await tester.tap(find.text('Perfil').last);
        await tester.pumpAndSettle();
        expect(find.text('Conheça o HemoBridge'), findsOneWidget);
        expect(calls, isEmpty);
        await tester.pump(const Duration(seconds: 10));
        expect(find.byType(Dialog), findsNothing);
        await tester.scrollUntilVisible(find.text(startJourney), 250);
        await Scrollable.ensureVisible(
          tester.element(find.text(startJourney)),
          alignment: 0.5,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text(startJourney));
        await tester.pumpAndSettle();
        expect(find.byType(Dialog), findsOneWidget);
        expect(find.text(tourSteps(role).first.title), findsOneWidget);
        expect(
          FocusManager.instance.primaryFocus?.debugLabel,
          'Título da etapa',
        );
        await tester.binding.handlePopRoute();
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.tapAt(const Offset(2, 2));
        await tester.pumpAndSettle();
        expect(find.byType(Dialog), findsOneWidget);
        expect(completions, 0);
        for (var i = 1; i < tourSteps(role).length; i++) {
          await tester.ensureVisible(find.text('Continuar'));
          await tester.tap(find.text('Continuar'));
          await tester.pumpAndSettle();
          expect(
            FocusManager.instance.primaryFocus?.debugLabel,
            'Título da etapa',
          );
        }
        await tester.ensureVisible(find.text('Concluir e acessar'));
        await tester.tap(find.text('Concluir e acessar'));
        await tester.pumpAndSettle();
        expect(completions, 1);
        expect(session.isFirstAccess, isFalse);
        expect(find.byType(Dialog), findsNothing);
        expect(find.text('Conheça o HemoBridge'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'Comunidade pendente é pública, sem token e sem publicar ou comentar',
    (tester) async {
      final requests = <http.Request>[];
      final api = ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          requests.add(request);
          final post = {
            'id': 'post',
            'author': 'Instituição',
            'verified': true,
            'pinned': false,
            'title': 'Cuidados antes de doar',
            'content': 'Confira os horários.',
            'likes': 1,
            'commentsTotal': 0,
            'comments': [],
          };
          return response(
            request.url.path == '/comunidade/publicacoes'
                ? {
                    'items': [post],
                    'hasMore': false,
                  }
                : post,
          );
        }),
      )..token = 'token-pendente';
      final session = SessionController(api)
        ..ready = true
        ..user = user('PACIENTE');
      addTearDown(session.dispose);
      await tester.pumpWidget(HemoBridgeApp(session: session));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Comunidade').last);
      await tester.pumpAndSettle();
      expect(find.text('Criar publicação'), findsNothing);
      await tester.tap(find.text('Cuidados antes de doar'));
      await tester.pumpAndSettle();
      expect(find.text('Escrever um comentário'), findsNothing);
      expect(find.text('Enviar comentário'), findsNothing);
      expect(requests, hasLength(2));
      expect(
        requests.every((request) => request.headers['Authorization'] == null),
        isTrue,
      );
      expect(api.token, 'token-pendente');
    },
  );

  testWidgets(
    'restaurar conclusão mantém área sem login ou nova introdução; aprovado encontra Locais',
    (tester) async {
      FlutterSecureStorage.setMockInitialValues({
        'sessionToken': 'token-existente',
      });
      final session = SessionController(
        ApiClient(
          baseUrl: 'https://api.example.invalid',
          client: MockClient(
            (request) async => response(
              request.url.path == '/auth/me'
                  ? user('PACIENTE', first: false)
                  : fixture(request.url.path),
            ),
          ),
        ),
      );
      addTearDown(session.dispose);
      await session.initialize();
      await tester.pumpWidget(HemoBridgeApp(session: session));
      await tester.pumpAndSettle();
      expect(find.byType(LoginPage), findsNothing);
      expect(find.byType(Dialog), findsNothing);
      expect(find.text('Conheça o HemoBridge'), findsNothing);
      expect(find.text('Encontrar onde doar'), findsOneWidget);
      await tester.ensureVisible(find.text('Encontrar onde doar'));
      await tester.tap(find.text('Encontrar onde doar'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        2,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('falha de rede ao restaurar não elimina token nem força login', (
    tester,
  ) async {
    FlutterSecureStorage.setMockInitialValues({
      'sessionToken': 'token-existente',
    });
    final session = SessionController(
      ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient(
          (_) async => response({'message': 'Serviço indisponível'}, 503),
        ),
      ),
    );
    addTearDown(session.dispose);
    await session.initialize();
    await tester.pumpWidget(HemoBridgeApp(session: session));
    await tester.pumpAndSettle();
    expect(session.api.token, 'token-existente');
    expect(find.byType(LoginPage), findsNothing);
    expect(find.text('Tentar restaurar minha sessão'), findsOneWidget);
  });

  testWidgets(
    'revisão parte da explicação e fecha retornando ao Perfil sem nova conclusão',
    (tester) async {
      final paths = <String>[];
      final session =
          SessionController(
              ApiClient(
                baseUrl: 'https://api.example.invalid',
                client: MockClient((request) async {
                  paths.add(request.url.path);
                  return response(fixture(request.url.path));
                }),
              ),
            )
            ..ready = true
            ..isFirstAccess = false
            ..user = user('MEDICO', first: false);
      addTearDown(session.dispose);
      await tester.pumpWidget(HemoBridgeApp(session: session));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Perfil').last);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Rever minha jornada'));
      await tester.tap(find.text('Rever minha jornada'));
      await tester.pumpAndSettle();
      expect(find.text('Conheça o HemoBridge'), findsOneWidget);
      expect(find.byType(Dialog), findsNothing);
      await tester.scrollUntilVisible(find.text(startJourney), 250);
      await Scrollable.ensureVisible(
        tester.element(find.text(startJourney)),
        alignment: 0.5,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(startJourney));
      await tester.pumpAndSettle();
      expect(find.byType(Dialog), findsOneWidget);
      await tester.ensureVisible(find.text('Fechar orientação'));
      await tester.tap(find.text('Fechar orientação'));
      await tester.pumpAndSettle();
      expect(find.text('Meu perfil'), findsOneWidget);
      expect(session.isFirstAccess, isFalse);
      expect(paths, isNot(contains('/auth/tour/conclusao')));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('sair da conta durante primeiro tour volta à Home sem concluir', (
    tester,
  ) async {
    final paths = <String>[];
    final session =
        SessionController(
            ApiClient(
              baseUrl: 'https://api.example.invalid',
              client: MockClient((request) async {
                paths.add(request.url.path);
                return response(fixture(request.url.path));
              }),
            ),
          )
          ..ready = true
          ..user = user('ADMINISTRADOR');
    addTearDown(session.dispose);
    await tester.pumpWidget(HemoBridgeApp(session: session));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text(startJourney), 250);
    await Scrollable.ensureVisible(
      tester.element(find.text(startJourney)),
      alignment: 0.5,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(startJourney));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Sair da conta'));
    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    expect(find.byType(PublicHomeShell), findsOneWidget);
    expect(find.byType(Dialog), findsNothing);
    expect(session.isFirstAccess, isTrue);
    expect(paths, ['/auth/logout']);
    expect(tester.takeException(), isNull);
  });
}
