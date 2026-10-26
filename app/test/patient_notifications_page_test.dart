import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/patient/patient_notifications_page.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const noticeId = '2361749e-566e-44d4-be72-a8612d77bd0c';
http.Response jsonResponse(dynamic value, [int status = 200]) => http.Response(
  jsonEncode(value),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
Map<String, dynamic> box({bool read = false, String? link = '/meus-exames'}) =>
    {
      'itens': [
        {
          'id': noticeId,
          'titulo': 'Avaliação disponível',
          'mensagem': 'Consulte sua área privada.',
          'link': link,
          'lida': read,
        },
      ],
      'total': 1,
      'naoLidas': read ? 0 : 1,
      'pagina': 1,
      'tamanhoPagina': 20,
    };
ApiClient client(Future<http.Response> Function(http.Request) handler) =>
    ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient(handler),
    )..token = 'token-notificacoes';
Widget destination(String name) => Scaffold(
  appBar: AppBar(title: Text('Destino $name')),
  body: const Text('Conteúdo privado'),
);
Future<void> open(
  WidgetTester tester,
  ApiClient api, {
  Widget? Function(String)? builder,
}) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: hemobridgeTheme(),
      home: Builder(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('Perfil de origem')),
          body: FilledButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => PatientNotificationsPage(
                  api: api,
                  destinationBuilder: builder ?? destination,
                ),
              ),
            ),
            child: const Text('Abrir notificações'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Abrir notificações'));
  await tester.pumpAndSettle();
}

void main() {
  test(
    'permite apenas destinos internos conhecidos, sem aceitar URL externa, javascript ou caminho codificado',
    () {
      expect(notificationDestination('/meus-exames'), 'exams');
      expect(notificationDestination('/minhas-consultas'), 'appointments');
      expect(notificationDestination('/exames-para-avaliar'), 'doctor-exams');
      expect(notificationDestination('/#profile'), 'profile');
      expect(
        notificationDestination('/bancos-de-sangue/hospital-123'),
        'locations',
      );
      for (final invalid in <String?>[
        null,
        '',
        'https://example.invalid/meus-exames',
        '//example.invalid/meus-exames',
        'javascript:alert(1)',
        '/%2e%2e/meus-exames',
        '/meus-exames?next=https://example.invalid',
        '/bancos-de-sangue/../admin',
        '/admin',
        '/notificacoes/marcar-todas-lidas',
      ]) {
        expect(
          notificationDestination(invalid),
          isNull,
          reason: '$invalid não é um destino permitido',
        );
      }
    },
  );

  testWidgets(
    'marcar todas usa POST autenticado e atualiza contador sem abrir outro contexto',
    (tester) async {
      bool read = false;
      int posts = 0;
      final api = client((request) async {
        expect(request.headers['Authorization'], 'Bearer token-notificacoes');
        if (request.method == 'POST') {
          expect(request.url.path, '/notificacoes/marcar-todas-lidas');
          read = true;
          posts++;
          return jsonResponse({'atualizadas': 1, 'naoLidas': 0});
        }
        return jsonResponse(box(read: read));
      });
      addTearDown(api.close);
      await open(tester, api);
      await tester.tap(find.text('Marcar todas como lidas'));
      await tester.pumpAndSettle();
      expect(posts, 1);
      expect(find.text('0 não lidas'), findsOneWidget);
      expect(find.text('Conteúdo privado'), findsNothing);
      expect(
        tester
            .widget<OutlinedButton>(
              find.widgetWithText(OutlinedButton, 'Marcar todas como lidas'),
            )
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'espera a marcação autenticada para abrir detalhes e preserva retorno às notificações e ao perfil',
    (tester) async {
      final opening = Completer<http.Response>();
      bool read = false;
      int marks = 0;
      final api = client((request) async {
        expect(request.headers['Authorization'], 'Bearer token-notificacoes');
        if (request.url.path == '/notificacoes/$noticeId') {
          expect(request.method, 'GET');
          marks++;
          final response = await opening.future;
          read = true;
          return response;
        }
        return jsonResponse(box(read: read));
      });
      addTearDown(api.close);
      await open(tester, api);
      await tester.tap(find.text('Ver detalhes'));
      await tester.pump();
      expect(marks, 1);
      expect(find.text('Conteúdo privado'), findsNothing);
      expect(
        tester
            .widget<OutlinedButton>(
              find.widgetWithText(OutlinedButton, 'Ver detalhes'),
            )
            .onPressed,
        isNull,
      );
      opening.complete(
        jsonResponse({'id': noticeId, 'lida': true, 'link': '/meus-exames'}),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Destino exams'),
        findsOneWidget,
        reason: tester.allWidgets
            .whereType<Text>()
            .map((text) => text.data)
            .join(' | '),
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Notificações'), findsOneWidget);
      expect(find.text('0 não lidas'), findsOneWidget);
      expect(find.text('Avaliação disponível'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Perfil de origem'), findsOneWidget);
      expect(marks, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'falha de autenticação ou titularidade na marcação não abre o conteúdo',
    (tester) async {
      final api = client((request) async {
        if (request.url.path == '/notificacoes/$noticeId') {
          return jsonResponse({'message': 'Notificação não encontrada.'}, 404);
        }
        return jsonResponse(box());
      });
      addTearDown(api.close);
      await open(tester, api);
      await tester.tap(find.text('Ver detalhes'));
      await tester.pumpAndSettle();
      expect(find.text('Notificação não encontrada.'), findsOneWidget);
      expect(find.text('Conteúdo privado'), findsNothing);
      expect(find.text('Notificações'), findsOneWidget);
      expect(find.text('1 não lidas'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'não oferece abertura de link externo ou destino incompatível com o perfil',
    (tester) async {
      String? link = 'https://example.invalid/resultado';
      final api = client((request) async => jsonResponse(box(link: link)));
      addTearDown(api.close);
      await open(tester, api, builder: (_) => null);
      expect(find.text('Ver detalhes'), findsNothing);
      expect(find.text('Marcar como lida'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      link = '/exames-para-avaliar';
      await tester.tap(find.text('Abrir notificações'));
      await tester.pumpAndSettle();
      expect(find.text('Ver detalhes'), findsNothing);
      expect(find.text('Marcar como lida'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
