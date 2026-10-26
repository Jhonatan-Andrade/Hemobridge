import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/community/community_page.dart';

http.Response response(Object body, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  status,
  headers: {'content-type': 'application/json'},
);

Map<String, dynamic> comment(String id) => {
  'id': id,
  'author': 'Participante $id',
  'text': 'Comentário sobre doação $id',
};

Map<String, dynamic> post({int commentsTotal = 3}) => {
  'id': 'publication-one',
  'author': 'Instituição de teste',
  'verified': true,
  'pinned': false,
  'title': 'Informações sobre doação',
  'content': 'Converse com a equipe e confira os horários da unidade.',
  'likes': 0,
  'commentsTotal': commentsTotal,
  'comments': [comment('one')],
};

ApiClient client(Future<http.Response> Function(http.Request) handler) {
  final api = ApiClient(
    baseUrl: 'https://api.example.invalid',
    client: MockClient(handler),
  );
  addTearDown(api.close);
  return api;
}

Future<void> show(WidgetTester tester, Widget page) async {
  tester.view.physicalSize = const Size(360, 1000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: hemobridgeTheme(),
      home: Scaffold(body: page),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('publicação em envio bloqueia saída e sucesso atualiza feed', (
    tester,
  ) async {
    final pending = Completer<http.Response>();
    var reads = 0, writes = 0;
    final api = client((request) async {
      if (request.method == 'POST') {
        writes++;
        return pending.future;
      }
      reads++;
      return response({
        'items': reads == 1 ? [] : [post()],
        'hasMore': false,
      });
    });
    await show(tester, CommunityPage(api: api, role: 'PACIENTE'));
    await tester.tap(find.text('Criar publicação'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextFormField).at(0),
      'Doação informada',
    );
    await tester.enterText(
      find.byType(TextFormField).at(1),
      'Converse sobre doação e consulte as orientações da equipe.',
    );
    await tester.ensureVisible(find.byType(CheckboxListTile));
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pump();
    await tester.tap(find.text('Publicar'));
    await tester.pump();
    expect(writes, 1);
    expect(find.text('Publicando…'), findsOneWidget);
    expect(
      tester
          .widget<TextButton>(find.widgetWithText(TextButton, 'Cancelar'))
          .onPressed,
      isNull,
    );

    await tester.tapAt(const Offset(2, 2));
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(reads, 1);
    pending.complete(response({'id': 'publication-one'}, 201));
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsNothing);
    expect(reads, 2);
    expect(find.text('Informações sobre doação'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('comentários serializam cliques e eliminam itens sobrepostos', (
    tester,
  ) async {
    final pending = Completer<http.Response>();
    final pages = <String?>[];
    final api = client((request) async {
      if (!request.url.path.endsWith('/comentarios')) return response(post());
      pages.add(request.url.queryParameters['pagina']);
      if (pages.length == 1) return pending.future;
      return response({
        'items': [comment('three')],
        'hasMore': false,
      });
    });
    await show(tester, CommentsPage(api: api, id: 'publication-one'));
    final more = find.text('Mostrar mais comentários');
    await tester.ensureVisible(more);
    await tester.tap(more);
    await tester.tap(more);
    await tester.pump();
    expect(pages, ['2']);
    expect(find.text('Carregando comentários…'), findsOneWidget);
    pending.complete(
      response({
        'items': [comment('one'), comment('two'), comment('two')],
        'hasMore': true,
      }),
    );
    await tester.pumpAndSettle();
    expect(find.text('Comentário sobre doação one'), findsOneWidget);
    expect(find.text('Comentário sobre doação two'), findsOneWidget);
    await tester.ensureVisible(more);
    await tester.tap(more);
    await tester.pumpAndSettle();
    expect(pages, ['2', '3']);
    expect(find.text('Comentário sobre doação three'), findsOneWidget);
    expect(more, findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('falha na página preserva cursor e recuperação limpa mensagem', (
    tester,
  ) async {
    final pages = <String?>[];
    final api = client((request) async {
      if (!request.url.path.endsWith('/comentarios')) {
        return response(post(commentsTotal: 2));
      }
      pages.add(request.url.queryParameters['pagina']);
      if (pages.length == 1) {
        return response({'message': 'Comentários indisponíveis agora.'}, 503);
      }
      return response({
        'items': [comment('two')],
        'hasMore': false,
      });
    });
    await show(tester, CommentsPage(api: api, id: 'publication-one'));
    final more = find.text('Mostrar mais comentários');
    await tester.ensureVisible(more);
    await tester.tap(more);
    await tester.pumpAndSettle();
    tester
        .state<ScrollableState>(find.byType(Scrollable).first)
        .position
        .jumpTo(0);
    await tester.pumpAndSettle();
    expect(find.text('Comentários indisponíveis agora.'), findsOneWidget);
    await tester.ensureVisible(more);
    await tester.tap(more);
    await tester.pumpAndSettle();
    expect(pages, ['2', '2']);
    expect(find.text('Comentários indisponíveis agora.'), findsNothing);
    expect(find.text('Comentário sobre doação two'), findsOneWidget);
    expect(more, findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('falha inicial oferece nova tentativa sem indicador infinito', (
    tester,
  ) async {
    var reads = 0;
    final api = client((request) async {
      reads++;
      return reads == 1
          ? response({'message': 'Conversa indisponível agora.'}, 503)
          : response(post(commentsTotal: 1));
    });
    await show(tester, CommentsPage(api: api, id: 'publication-one'));
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('Conversa indisponível agora.'), findsOneWidget);
    await tester.tap(find.text('Tentar novamente'));
    await tester.pumpAndSettle();
    expect(find.text('Conversa indisponível agora.'), findsNothing);
    expect(find.text('Informações sobre doação'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
