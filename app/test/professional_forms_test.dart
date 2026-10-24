import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/professional/doctor_agenda_page.dart';
import 'package:hemobridge/features/professional/doctor_exams_page.dart';
import 'package:hemobridge/features/professional/representative_needs_page.dart';
import 'package:hemobridge/features/professional/representative_stock_page.dart';

ApiClient apiFor(Future<http.Response> Function(http.Request) handler) =>
    ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient(handler),
    )..token = 'token-de-teste';

http.Response jsonResponse(dynamic value, [int status = 200]) => http.Response(
  jsonEncode(value),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Future<void> openPage(WidgetTester tester, Widget page) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: hemobridgeTheme(),
      home: Builder(
        builder: (context) => Scaffold(
          body: FilledButton(
            onPressed: () => Navigator.of(
              context,
            ).push(MaterialPageRoute<void>(builder: (_) => page)),
            child: const Text('Abrir fluxo'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Abrir fluxo'));
  await tester.pumpAndSettle();
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.pumpAndSettle();
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> selectString(
  WidgetTester tester,
  String value, {
  int index = 0,
}) async {
  final field = find.byType(DropdownButtonFormField<String>).at(index);
  await tapVisible(tester, field);
  await tester.tap(find.text(value).last);
  await tester.pumpAndSettle();
}

final exam = <String, dynamic>{
  'id': 'exame-1',
  'nomeOriginal': 'resultado.pdf',
  'situacao': 'EM_ANALISE',
  'podeAvaliar': true,
};

Map<String, dynamic> agendaSlot(
  int index, {
  bool history = false,
  String? patient,
}) {
  final start = history
      ? DateTime.now().subtract(Duration(days: index + 1))
      : DateTime.now().add(Duration(days: index + 1));
  return {
    'id': 'horario-$index',
    'inicio': start.toIso8601String(),
    'fim': start.add(const Duration(hours: 1)).toIso8601String(),
    'consultas': patient == null
        ? []
        : [
            {
              'id': 'consulta-$index',
              'status': history ? 'REALIZADA' : 'AGENDADA',
              'paciente': {
                'usuario': {'nome': patient},
              },
            },
          ],
  };
}

void main() {
  testWidgets(
    'agenda pede próximos e histórico separadamente e carrega páginas adicionais de 30',
    (tester) async {
      final queries = <Map<String, String>>[];
      final api = apiFor((request) async {
        if (request.url.path == '/medico/hospitais') {
          return jsonResponse([
            {'id': 'hospital-1', 'nome': 'Hospital Aurora'},
          ]);
        }
        final query = request.url.queryParameters;
        queries.add(query);
        if (query['periodo'] == 'historico') {
          return jsonResponse([
            agendaSlot(101, history: true, patient: 'Paciente do histórico'),
          ]);
        }
        return query['pagina'] == '1'
            ? jsonResponse(List.generate(30, (i) => agendaSlot(i)))
            : jsonResponse([
                agendaSlot(30, patient: 'Paciente da segunda página'),
              ]);
      });
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(body: DoctorAgendaPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      expect(queries.first, {
        'hospitalId': 'hospital-1',
        'incluirRealizadas': 'true',
        'periodo': 'proximos',
        'pagina': '1',
        'tamanhoPagina': '30',
      });
      await tester.scrollUntilVisible(find.text('Carregar mais'), 1000);
      await tapVisible(tester, find.text('Carregar mais'));
      expect(queries.last['pagina'], '2');
      await tester.scrollUntilVisible(
        find.text('Paciente da segunda página'),
        1000,
      );
      expect(find.text('Paciente da segunda página'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Histórico'), -1000);
      await tapVisible(tester, find.text('Histórico'));
      expect(queries.last['periodo'], 'historico');
      expect(queries.last['pagina'], '1');
      expect(find.text('Paciente do histórico'), findsOneWidget);
      expect(find.text('Paciente da segunda página'), findsNothing);
      expect(find.text('Retomar atendimento'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'resposta de instituição anterior não mistura dados após trocar novamente',
    (tester) async {
      final delayed = Completer<http.Response>();
      final api = apiFor((request) async {
        if (request.url.path == '/medico/hospitais') {
          return jsonResponse([
            {'id': 'hospital-a', 'nome': 'Hospital Aurora'},
            {'id': 'hospital-b', 'nome': 'Hospital Horizonte'},
          ]);
        }
        if (request.url.queryParameters['hospitalId'] == 'hospital-b') {
          return delayed.future;
        }
        return jsonResponse([agendaSlot(1, patient: 'Paciente Aurora')]);
      });
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(body: DoctorAgendaPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Hospital Horizonte').last);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('Hospital Aurora').last);
      await tester.pumpAndSettle();
      delayed.complete(
        jsonResponse([agendaSlot(2, patient: 'Paciente Horizonte obsoleto')]),
      );
      await tester.pumpAndSettle();
      expect(find.text('Paciente Aurora'), findsOneWidget);
      expect(find.text('Paciente Horizonte obsoleto'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'carregamento atrasado de outra aba ou página não reaparece no período escolhido',
    (tester) async {
      final delayedMore = Completer<http.Response>();
      final api = apiFor((request) async {
        if (request.url.path == '/medico/hospitais') {
          return jsonResponse([
            {'id': 'hospital-1', 'nome': 'Hospital Aurora'},
          ]);
        }
        final query = request.url.queryParameters;
        if (query['periodo'] == 'historico') {
          return jsonResponse([
            agendaSlot(90, history: true, patient: 'Histórico atual'),
          ]);
        }
        if (query['pagina'] == '2') return delayedMore.future;
        return jsonResponse(List.generate(30, (i) => agendaSlot(i)));
      });
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(body: DoctorAgendaPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Carregar mais'), 1000);
      await tapVisible(tester, find.text('Carregar mais'));
      await tester.scrollUntilVisible(find.text('Histórico'), -1000);
      await tapVisible(tester, find.text('Histórico'));
      delayedMore.complete(
        jsonResponse([agendaSlot(31, patient: 'Página obsoleta')]),
      );
      await tester.pumpAndSettle();
      expect(find.text('Histórico atual'), findsOneWidget);
      expect(find.text('Página obsoleta'), findsNothing);
      expect(find.text('Carregar mais'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  test('teleconsulta aceita somente HTTPS sem credencial na URL', () {
    expect(safeConsultationUri(null), isNull);
    expect(safeConsultationUri('http://meet.example.invalid/consulta'), isNull);
    expect(safeConsultationUri('javascript:alert(1)'), isNull);
    expect(
      safeConsultationUri(
        'https://usuario:senha@meet.example.invalid/consulta',
      ),
      isNull,
    );
    expect(
      safeConsultationUri('https://meet.example.invalid/consulta')?.scheme,
      'https',
    );
  });

  testWidgets(
    'histórico retoma atendimento realizado sem repetir registro e permite solicitar exames',
    (tester) async {
      Map<String, dynamic>? sent;
      final api = apiFor((request) async {
        if (request.method == 'POST') {
          expect(
            request.url.path,
            '/medico/consultas/consulta-realizada/solicitar-exames',
          );
          sent = jsonDecode(request.body) as Map<String, dynamic>;
          return jsonResponse({});
        }
        if (request.url.path == '/medico/consultas/consulta-realizada') {
          return jsonResponse({
            'status': 'REALIZADA',
            'podeAtender': true,
            'podeCancelar': false,
            'cicloAtual': true,
          });
        }
        if (request.url.path == '/medico/hospitais') {
          return jsonResponse([
            {'id': 'hospital-1', 'nome': 'Hospital Aurora'},
          ]);
        }
        expect(request.url.queryParameters['incluirRealizadas'], 'true');
        return jsonResponse([
          {
            'id': 'horario-1',
            'inicio': DateTime.now()
                .subtract(const Duration(hours: 1))
                .toIso8601String(),
            'fim': DateTime.now().toIso8601String(),
            'linkVideochamada': 'https://meet.example.invalid/consulta',
            'consultas': [
              {
                'id': 'consulta-realizada',
                'status': 'REALIZADA',
                'paciente': {
                  'usuario': {'nome': 'Ana Souza'},
                },
              },
            ],
          },
        ]);
      });
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(body: DoctorAgendaPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Entrar na consulta'), findsNothing);
      await tapVisible(tester, find.text('Retomar atendimento'));
      expect(find.text('Registrar como realizado'), findsNothing);
      expect(find.text('Registrar ausência'), findsNothing);
      await tester.enterText(
        find.byKey(const ValueKey('requested-exams')),
        'Tipagem sanguínea',
      );
      await tester.enterText(
        find.byKey(const ValueKey('exam-instructions')),
        'Compareça ao laboratório indicado.',
      );
      await tapVisible(tester, find.text('Enviar solicitação'));
      expect(sent, {
        'exames': ['Tipagem sanguínea'],
        'orientacoes': 'Compareça ao laboratório indicado.',
      });
    },
  );

  testWidgets(
    'horário passado vazio não é apresentado como disponível e falha ao abrir consulta oferece nova tentativa',
    (tester) async {
      var attempts = 0;
      final api = apiFor((request) async {
        if (request.url.path == '/medico/hospitais') {
          return jsonResponse([
            {'id': 'hospital-1', 'nome': 'Hospital Aurora'},
          ]);
        }
        return jsonResponse([
          {
            'id': 'horario-1',
            'inicio': DateTime.now()
                .subtract(const Duration(days: 1))
                .toIso8601String(),
            'fim': DateTime.now()
                .subtract(const Duration(hours: 23))
                .toIso8601String(),
            'consultas': [],
          },
          {
            'id': 'horario-2',
            'inicio': DateTime.now()
                .add(const Duration(hours: 1))
                .toIso8601String(),
            'fim': DateTime.now()
                .add(const Duration(hours: 2))
                .toIso8601String(),
            'linkVideochamada': 'https://meet.example.invalid/consulta',
            'consultas': [
              {
                'id': 'consulta-1',
                'status': 'AGENDADA',
                'paciente': {
                  'usuario': {'nome': 'Ana Souza'},
                },
              },
            ],
          },
        ]);
      });
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(
            body: DoctorAgendaPage(
              api: api,
              openConsultation: (uri) async {
                expect(uri.toString(), 'https://meet.example.invalid/consulta');
                expect(uri.queryParameters.containsKey('token'), isFalse);
                attempts++;
                throw Exception('Aplicativo indisponível');
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Sem consulta agendada'), findsOneWidget);
      expect(find.text('Horário disponível'), findsNothing);
      await tapVisible(tester, find.text('Entrar na consulta'));
      expect(attempts, 1);
      expect(
        find.text(
          'Não foi possível abrir a consulta. Verifique os aplicativos disponíveis e tente novamente.',
        ),
        findsOneWidget,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Entrar na consulta'),
            )
            .onPressed,
        isNotNull,
      );
    },
  );

  for (final area in ['agenda', 'exames', 'estoque']) {
    testWidgets(
      '$area permite repetir uma leitura que falhou sem retornar Future no setState',
      (tester) async {
        var reads = 0;
        final api = apiFor((request) async {
          reads++;
          return reads == 1
              ? jsonResponse({
                  'message': 'Serviço temporariamente indisponível.',
                }, 503)
              : jsonResponse([]);
        });
        addTearDown(api.close);
        final page = switch (area) {
          'agenda' => DoctorAgendaPage(api: api),
          'exames' => DoctorExamsPage(api: api),
          _ => RepresentativeStockPage(api: api),
        };
        await tester.pumpWidget(
          MaterialApp(
            theme: hemobridgeTheme(),
            home: Scaffold(body: page),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Serviço temporariamente indisponível.'),
          findsOneWidget,
        );
        await tapVisible(tester, find.text('Tentar novamente'));
        expect(reads, 2);
        expect(
          find.text('Serviço temporariamente indisponível.'),
          findsNothing,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  test(
    'disponibilidade exige período futuro, positivo e de no máximo quatro horas',
    () {
      final now = DateTime(2026, 10, 18, 10);
      expect(validateAvailability(null, null, now), isNotNull);
      expect(
        validateAvailability(now, now.add(const Duration(hours: 1)), now),
        isNotNull,
      );
      expect(
        validateAvailability(now.add(const Duration(hours: 1)), now, now),
        isNotNull,
      );
      expect(
        validateAvailability(
          now.add(const Duration(hours: 1)),
          now.add(const Duration(hours: 6)),
          now,
        ),
        isNotNull,
      );
      expect(
        validateAvailability(
          now.add(const Duration(hours: 1)),
          now.add(const Duration(hours: 5)),
          now,
        ),
        isNull,
      );
    },
  );

  testWidgets(
    'permissão ausente ou falsa mantém resultado somente para leitura',
    (tester) async {
      var evaluations = 0;
      final api = apiFor((request) async {
        if (request.method == 'PATCH') evaluations++;
        return jsonResponse([]);
      });
      addTearDown(api.close);
      await openPage(
        tester,
        DoctorExamReviewPage(api: api, exam: {...exam, 'podeAvaliar': false}),
      );
      expect(find.text('Confirmar avaliação'), findsNothing);
      expect(find.text('Voltar e atualizar exames'), findsOneWidget);
      expect(evaluations, 0);
    },
  );

  testWidgets(
    'validação exige decisão, tipo sanguíneo e revisão explícita sem incluir motivo',
    (tester) async {
      Map<String, dynamic>? sent;
      final api = apiFor((request) async {
        expect(request.headers['authorization'], 'Bearer token-de-teste');
        if (request.method == 'PATCH') {
          expect(request.url.path, '/medico/exames/exame-1/avaliacao');
          sent = jsonDecode(request.body) as Map<String, dynamic>;
          return jsonResponse({'mensagem': 'Avaliação registrada.'});
        }
        return jsonResponse([
          {'id': 2, 'sigla': 'O+'},
        ]);
      });
      addTearDown(api.close);
      await openPage(tester, DoctorExamReviewPage(api: api, exam: exam));
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Confirmar avaliação'),
            )
            .onPressed,
        isNull,
      );
      await selectString(tester, 'Validar resultado');
      await tapVisible(tester, find.byType(DropdownButtonFormField<int>));
      await tester.tap(find.text('O+').last);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Confirmar avaliação'),
            )
            .onPressed,
        isNull,
      );
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar avaliação'));
      expect(sent, {'situacao': 'VALIDADO', 'tipoSanguineoId': 2});
      expect(find.text('Abrir fluxo'), findsOneWidget);
    },
  );

  testWidgets(
    'reprovação envia motivo e alteração do motivo invalida confirmação',
    (tester) async {
      Map<String, dynamic>? sent;
      final api = apiFor((request) async {
        if (request.method == 'PATCH') {
          sent = jsonDecode(request.body) as Map<String, dynamic>;
        }
        return jsonResponse(
          request.method == 'GET' ? [] : {'mensagem': 'Registrado'},
        );
      });
      addTearDown(api.close);
      await openPage(tester, DoctorExamReviewPage(api: api, exam: exam));
      await selectString(tester, 'Solicitar novo envio');
      await tester.enterText(
        find.byType(TextFormField),
        'Arquivo ilegível; envie uma imagem nítida.',
      );
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tester.enterText(
        find.byType(TextFormField),
        'Arquivo ilegível; envie uma imagem completa e nítida.',
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isFalse,
      );
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar avaliação'));
      expect(sent, {
        'situacao': 'REPROVADO',
        'motivoReprovacao':
            'Arquivo ilegível; envie uma imagem completa e nítida.',
      });
    },
  );

  testWidgets(
    'conflito na avaliação bloqueia novo envio e solicita atualização',
    (tester) async {
      var requests = 0;
      final api = apiFor((request) async {
        if (request.method == 'PATCH') {
          requests++;
          return jsonResponse({
            'message': 'Este resultado já foi avaliado. Atualize a lista.',
          }, 409);
        }
        return jsonResponse([]);
      });
      addTearDown(api.close);
      await openPage(tester, DoctorExamReviewPage(api: api, exam: exam));
      await selectString(tester, 'Solicitar novo envio');
      await tester.enterText(
        find.byType(TextFormField),
        'Envie novamente com todas as páginas.',
      );
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar avaliação'));
      expect(requests, 1);
      expect(find.text('Confirmar avaliação'), findsNothing);
      expect(find.text('Voltar e atualizar exames'), findsOneWidget);
      expect(
        find.text('Este resultado já foi avaliado. Atualize a lista.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('falha ao carregar tipos permite repetir sem liberar validação', (
    tester,
  ) async {
    var loads = 0;
    final api = apiFor((request) async {
      loads++;
      return loads == 1
          ? jsonResponse({'message': 'Serviço indisponível'}, 503)
          : jsonResponse([
              {'id': 1, 'sigla': 'A+'},
            ]);
    });
    addTearDown(api.close);
    await openPage(tester, DoctorExamReviewPage(api: api, exam: exam));
    await selectString(tester, 'Validar resultado');
    expect(
      tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Confirmar avaliação'),
          )
          .onPressed,
      isNull,
    );
    await tapVisible(tester, find.text('Tentar carregar tipos novamente'));
    expect(loads, 2);
    expect(find.text('Serviço indisponível'), findsNothing);
  });

  testWidgets(
    'necessidade crítica só é publicada após confirmação e envia apenas alterações',
    (tester) async {
      Map<String, dynamic>? sent;
      var saved = false;
      final api = apiFor((request) async {
        if (request.method == 'PUT') {
          sent = jsonDecode(request.body) as Map<String, dynamic>;
          saved = true;
          return jsonResponse({'mensagem': 'Atualizado'});
        }
        return jsonResponse({
          'hospital': {'nome': 'Hospital Aurora'},
          'necessidades': [
            {
              'tipo': 'O+',
              'nivel': saved ? 'CRITICO' : 'ADEQUADO',
              'atualizadoEm': null,
            },
            {'tipo': 'A+', 'nivel': 'ESTAVEL', 'atualizadoEm': null},
          ],
        });
      });
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(body: RepresentativeNeedsPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      await selectString(tester, 'Crítico');
      expect(sent, isNull);
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar atualização'));
      expect(sent, {
        'niveis': [
          {'tipo': 'O+', 'nivel': 'CRITICO'},
        ],
      });
      expect(find.text('Necessidades atualizadas.'), findsOneWidget);
    },
  );

  testWidgets(
    'movimentação da quarentena exige referência e preserva estado anterior para concorrência',
    (tester) async {
      Map<String, dynamic>? sent;
      final api = apiFor((request) async {
        sent = jsonDecode(request.body) as Map<String, dynamic>;
        return jsonResponse({});
      });
      addTearDown(api.close);
      await openPage(
        tester,
        StockMovementPage(
          api: api,
          bag: {
            'id': 'bolsa-1',
            'codigo': 'B-001',
            'status': 'QUARENTENA',
            'validadeEm': DateTime.now()
                .add(const Duration(days: 20))
                .toIso8601String(),
          },
        ),
      );
      await selectString(tester, 'Disponível');
      await tester.enterText(
        find.byType(TextFormField).first,
        'Resultado de controle conferido',
      );
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar movimentação'));
      expect(sent, isNull);
      expect(
        find.text('Informe a referência da liberação técnica.'),
        findsOneWidget,
      );
      await tester.enterText(find.byType(TextFormField).last, 'Laudo LAB-001');
      await tester.pumpAndSettle();
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar movimentação'));
      expect(sent, {
        'anterior': 'QUARENTENA',
        'status': 'DISPONIVEL',
        'motivo': 'Resultado de controle conferido',
        'liberacaoReferencia': 'Laudo LAB-001',
      });
    },
  );

  testWidgets(
    'bolsa vencida não é liberada e conflito bloqueia repetição de movimento',
    (tester) async {
      var calls = 0;
      final api = apiFor((request) async {
        calls++;
        return jsonResponse({
          'message':
              'Bolsa alterada, vencida ou indisponível. Atualize a lista.',
        }, 409);
      });
      addTearDown(api.close);
      await openPage(
        tester,
        StockMovementPage(
          api: api,
          bag: {
            'id': 'bolsa-1',
            'codigo': 'B-001',
            'status': 'RESERVADA',
            'validadeEm': DateTime.now()
                .subtract(const Duration(days: 1))
                .toIso8601String(),
          },
        ),
      );
      await selectString(tester, 'Disponível');
      await tester.enterText(
        find.byType(TextFormField),
        'Reserva cancelada pela instituição',
      );
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar movimentação'));
      expect(calls, 0);
      expect(
        find.text(
          'Uma bolsa vencida não pode ser disponibilizada ou reservada.',
        ),
        findsOneWidget,
      );
      await selectString(tester, 'Descartada');
      await tapVisible(tester, find.byType(CheckboxListTile));
      await tapVisible(tester, find.text('Confirmar movimentação'));
      expect(calls, 1);
      expect(find.text('Confirmar movimentação'), findsNothing);
      expect(find.text('Voltar e atualizar estoque'), findsOneWidget);
    },
  );

  testWidgets(
    'atendimento exige confirmação e solicitação envia exames em linhas separadas',
    (tester) async {
      final sent = <Map<String, dynamic>>[];
      var status = 'AGENDADA';
      final api = apiFor((request) async {
        if (request.method == 'GET') {
          return jsonResponse({
            'status': status,
            'podeAtender': true,
            'podeCancelar': false,
            'cicloAtual': true,
          });
        }
        sent.add({
          'path': request.url.path,
          'method': request.method,
          'body': jsonDecode(request.body),
        });
        if (request.method == 'PATCH') status = 'REALIZADA';
        return jsonResponse({});
      });
      addTearDown(api.close);
      await openPage(
        tester,
        DoctorAttendancePage(
          api: api,
          consultationId: 'consulta-1',
          patientName: 'Ana Souza',
          initialStatus: 'AGENDADA',
        ),
      );
      await tapVisible(tester, find.text('Registrar como realizado'));
      expect(sent, isEmpty);
      await tapVisible(tester, find.text('Confirmar registro'));
      expect(sent.first, {
        'path': '/medico/consultas/consulta-1',
        'method': 'PATCH',
        'body': {'status': 'REALIZADA', 'observacoes': ''},
      });
      await tester.enterText(
        find.byKey(const ValueKey('requested-exams')),
        ' Hemograma \n\n Tipagem sanguínea ',
      );
      await tester.enterText(
        find.byKey(const ValueKey('exam-instructions')),
        'Compareça ao laboratório indicado.',
      );
      await tapVisible(tester, find.text('Enviar solicitação'));
      expect(sent.last, {
        'path': '/medico/consultas/consulta-1/solicitar-exames',
        'method': 'POST',
        'body': {
          'exames': ['Hemograma', 'Tipagem sanguínea'],
          'orientacoes': 'Compareça ao laboratório indicado.',
        },
      });
    },
  );

  testWidgets(
    'lista de exames a 360 pixels não disponibiliza avaliação sem autorização explícita',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = apiFor(
        (request) async => jsonResponse([
          {
            'id': 'solicitacao-1',
            'descricao': 'Hemograma e tipagem sanguínea',
            'consulta': {
              'paciente': {
                'usuario': {'nome': 'Ana Souza'},
              },
            },
            'exames': [
              {
                ...exam,
                'enviadoEm': '2026-10-18T12:00:00Z',
                'podeAvaliar': null,
              },
            ],
          },
        ]),
      );
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: hemobridgeTheme(),
          home: Scaffold(body: DoctorExamsPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Abrir resultado privado'), findsOneWidget);
      expect(find.text('Avaliar resultado'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
