import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/professional/representative_donations_page.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response jsonResponse(dynamic value, [int status = 200]) => http.Response(
  jsonEncode(value),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
const emptyHistory = {
  'itens': <dynamic>[],
  'total': 0,
  'pagina': 1,
  'tamanhoPagina': 10,
};
const approved = {
  'encontrado': true,
  'doador': {'id': 'paciente-1', 'nome': 'Ana Doadora', 'tipo': 'A+'},
};
const confirmation =
    'Conferi os dados e a triagem clínica e confirmo o registro desta coleta.';

Future<void> open(WidgetTester tester, ApiClient api) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: hemobridgeTheme(),
      home: Scaffold(body: RepresentativeDonationsPage(api: api)),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> lookup(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField).first, '12345678909');
  await tapVisible(tester, find.text('Localizar doador'));
}

ApiClient client(Future<http.Response> Function(http.Request) handler) =>
    ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient(handler),
    )..token = 'teste';

void main() {
  testWidgets(
    'falha ao carregar histórico pode ser refeita sem erro de setState assíncrono',
    (tester) async {
      int calls = 0;
      final api = client((request) async {
        calls++;
        return calls == 1
            ? jsonResponse({
                'message': 'Serviço temporariamente indisponível.',
              }, 503)
            : jsonResponse(emptyHistory);
      });
      addTearDown(api.close);
      await open(tester, api);
      await tester.scrollUntilVisible(
        find.text('Tentar novamente').hitTestable(),
        700,
        scrollable: find.byType(Scrollable).first,
      );
      await tapVisible(tester, find.text('Tentar novamente'));
      expect(calls, 2);
      expect(
        find.text('Nenhuma coleta encontrada neste período.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'registra o doador identificado com peso aferido, sem enviar hospital, tipagem ou responsável',
    (tester) async {
      Map<String, dynamic>? sent;
      final api = client((request) async {
        if (request.url.path.endsWith('/buscar-doador')) {
          return jsonResponse(approved);
        }
        if (request.method == 'POST') {
          sent = jsonDecode(request.body) as Map<String, dynamic>;
          expect(request.url.path, '/representante/doacoes');
          return jsonResponse({
            'mensagem': 'Doação vinculada registrada.',
            'avisos': ['Os níveis de necessidade permanecem inalterados.'],
          }, 201);
        }
        return jsonResponse(emptyHistory);
      });
      addTearDown(api.close);
      await open(tester, api);
      await lookup(tester);
      expect(find.text('Ana Doadora'), findsOneWidget);
      final measured = find.byType(TextFormField);
      await tester.ensureVisible(measured);
      await tester.enterText(measured, '72,5');
      await tapVisible(
        tester,
        find.widgetWithText(CheckboxListTile, confirmation),
      );
      await tapVisible(tester, find.text('Confirmar registro de doação'));
      expect(sent, {
        'pacienteId': 'paciente-1',
        'dataColeta': matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')),
        'pesoAferido': 72.5,
        'autorizacaoResponsavelConfirmada': false,
        'doouAntesDos60Confirmado': false,
      });
      expect(
        find.textContaining('Doação vinculada registrada.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'CPF não aprovado não gera avulsa automaticamente e a escolha explícita envia só data e tipo',
    (tester) async {
      final saved = <Map<String, dynamic>>[];
      final api = client((request) async {
        if (request.url.path.endsWith('/buscar-doador')) {
          return jsonResponse({
            'encontrado': false,
            'mensagem': 'Nenhum doador aprovado encontrado.',
          });
        }
        if (request.method == 'POST') {
          expect(request.url.path, '/representante/doacoes/avulsa');
          saved.add(jsonDecode(request.body) as Map<String, dynamic>);
          return jsonResponse({
            'mensagem': 'Doação avulsa registrada.',
            'avisos': <String>[],
          }, 201);
        }
        return jsonResponse(emptyHistory);
      });
      addTearDown(api.close);
      await open(tester, api);
      await lookup(tester);
      expect(saved, isEmpty);
      expect(find.byType(DropdownButtonFormField<String>), findsNothing);
      await tapVisible(tester, find.text('Escolher registro avulso'));
      await tapVisible(tester, find.byType(DropdownButtonFormField<String>));
      await tester.tap(find.text('AB-').last);
      await tester.pumpAndSettle();
      await tapVisible(
        tester,
        find.widgetWithText(CheckboxListTile, confirmation),
      );
      await tapVisible(tester, find.text('Confirmar registro de doação'));
      expect(saved.single.keys.toSet(), {'dataColeta', 'tipo'});
      expect(saved.single['tipo'], 'AB-');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'bloqueia envio duplicado e apresenta a razão e a próxima data sem converter em avulsa',
    (tester) async {
      final pending = Completer<http.Response>();
      int posts = 0;
      final api = client((request) async {
        if (request.url.path.endsWith('/buscar-doador')) {
          return jsonResponse(approved);
        }
        if (request.method == 'POST') {
          posts++;
          return pending.future;
        }
        return jsonResponse(emptyHistory);
      });
      addTearDown(api.close);
      await open(tester, api);
      await lookup(tester);
      final measured = find.byType(TextFormField);
      await tester.ensureVisible(measured);
      await tester.enterText(measured, '70');
      await tapVisible(
        tester,
        find.widgetWithText(CheckboxListTile, confirmation),
      );
      final submit = find.text('Confirmar registro de doação');
      await tester.ensureVisible(submit);
      await tester.pumpAndSettle();
      await tester.tap(submit);
      await tester.pump();
      final disabled = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Registrando…'),
      );
      expect(disabled.onPressed, isNull);
      expect(posts, 1);
      pending.complete(
        jsonResponse({
          'message':
              'É preciso aguardar 60 dias. Próxima data estimada: 2026-12-22.',
          'motivo': 'INTERVALO',
          'proximaData': '2026-12-22',
        }, 422),
      );
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Próxima data estimada: 2026-12-22.'),
        findsOneWidget,
      );
      expect(find.text('Ana Doadora'), findsOneWidget);
      expect(find.byType(DropdownButtonFormField<String>), findsNothing);
      expect(posts, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
