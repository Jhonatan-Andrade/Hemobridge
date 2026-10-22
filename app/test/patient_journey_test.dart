import 'dart:convert';
import 'dart:typed_data';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/patient/patient_service.dart';
import 'package:hemobridge/features/patient/patient_workspace.dart';

http.Response response(Object data, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(data)),
  status,
  headers: {'content-type': 'application/json'},
);

Map<String, dynamic> slot([String id = 'slot-one']) => {
  'disponibilidadeId': id,
  'inicio': '2026-11-20T14:00:00Z',
  'fim': '2026-11-20T14:30:00Z',
  'medico': 'Dra. Ana',
  'hospital': 'Hospital Horizonte',
};

Map<String, dynamic> appointment({bool? canChange = true}) => {
  'id': 'appointment-one',
  'inicio': '2026-11-20T14:00:00Z',
  'fim': '2026-11-20T14:30:00Z',
  'medico': 'Dra. Ana',
  'hospital': 'Hospital Horizonte',
  'status': 'AGENDADA',
  'podeCancelarOuReagendar': canChange,
};

Map<String, dynamic> exam({
  bool? canUpload = true,
  String status = 'AGUARDANDO_RESULTADO',
}) => {
  'id': 'exam-one',
  'medico': 'Dra. Ana',
  'exames': ['Hemograma'],
  'orientacoes': 'Envie o resultado solicitado.',
  'situacao': status,
  'podeEnviar': canUpload,
  'envios': status == 'EM_ANALISE'
      ? [
          {
            'id': 'upload-one',
            'nomeOriginal': 'resultado.pdf',
            'situacao': 'EM_ANALISE',
          },
        ]
      : [],
};

ApiClient client(Future<http.Response> Function(http.Request) handler) {
  final api = ApiClient(
    baseUrl: 'http://localhost:3000',
    client: MockClient(handler),
  )..token = 'test-token';
  addTearDown(api.close);
  return api;
}

Future<void> show(WidgetTester tester, Widget page) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(theme: hemobridgeTheme(), home: page));
  await tester.pumpAndSettle();
}

void main() {
  test(
    'Patient service requires explicit consent and authoritative change/upload permissions',
    () async {
      var writes = 0;
      final api = client((request) async {
        writes++;
        return response({});
      });
      final service = PatientService(api);
      await expectLater(
        service.book('slot-one', consent: false),
        throwsA(isA<ApiException>()),
      );
      await expectLater(
        service.cancel(
          PatientAppointment.fromJson(appointment(canChange: null)),
          '',
        ),
        throwsA(isA<ApiException>()),
      );
      await expectLater(
        service.reschedule(
          PatientAppointment.fromJson(appointment(canChange: false)),
          'slot-one',
        ),
        throwsA(isA<ApiException>()),
      );
      await expectLater(
        service.upload(
          PatientExamRequest.fromJson(exam(canUpload: null)),
          'resultado.pdf',
          utf8.encode('%PDF-1.7'),
        ),
        throwsA(isA<ApiException>()),
      );
      expect(writes, 0);
    },
  );

  test(
    'Patient exam validation rejects oversized, disguised, empty and unsupported files before upload',
    () {
      for (final file in [
        ('resultado.pdf', <int>[]),
        ('resultado.exe', utf8.encode('%PDF-1.7')),
        ('resultado.png', utf8.encode('%PDF-1.7')),
        ('resultado.pdf', Uint8List(maxExamBytes + 1)),
      ]) {
        expect(
          () => validateExamFile(file.$1, file.$2),
          throwsA(isA<ApiException>()),
        );
      }
      expect(
        () => validateExamFile('resultado.PDF', utf8.encode('%PDF-1.7')),
        returnsNormally,
      );
      expect(
        () => validateExamFile('resultado.jpg', [0xff, 0xd8, 0xff, 0xe0]),
        returnsNormally,
      );
      expect(
        () => validateExamFile('resultado.png', [
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
        ]),
        returnsNormally,
      );
    },
  );

  testWidgets(
    'Booking waits for consent; a concurrent reservation reloads slots without choosing another',
    (tester) async {
      var reads = 0, writes = 0;
      final api = client((request) async {
        if (request.method == 'GET') {
          return response({
            'itens': [slot(reads++ == 0 ? 'slot-one' : 'slot-two')],
          });
        }
        writes++;
        expect(request.url.path, '/paciente/agendamentos');
        expect(jsonDecode(request.body), {
          'disponibilidadeId': 'slot-one',
          'aceiteTelemedicina': true,
        });
        return response({'message': 'Horário ocupado. Escolha outro.'}, 409);
      });
      await show(tester, PatientBookingPage(api: api));
      await tester.tap(find.byIcon(Icons.radio_button_off));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Confirmar agendamento'),
            )
            .onPressed,
        isNull,
      );
      await tester.ensureVisible(find.byType(CheckboxListTile));
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Confirmar agendamento'));
      await tester.tap(find.text('Confirmar agendamento'));
      await tester.pumpAndSettle();
      expect(writes, 1);
      expect(reads, 2);
      expect(find.text('Horário ocupado. Escolha outro.'), findsOneWidget);
      expect(find.byIcon(Icons.radio_button_checked), findsNothing);
      await tester.scrollUntilVisible(
        find.text('Confirmar agendamento'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Confirmar agendamento'),
            )
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Cancellation requires confirmation and keeps appointment when dialog is dismissed',
    (tester) async {
      var writes = 0;
      final api = client((request) async {
        if (request.method == 'GET') return response([appointment()]);
        writes++;
        expect(
          request.url.path,
          '/paciente/consultas/appointment-one/cancelar',
        );
        expect(jsonDecode(request.body), {'motivo': 'Não poderei comparecer'});
        return response({'mensagem': 'Consulta cancelada.'});
      });
      await show(tester, PatientAppointmentsPage(api: api));
      await tester.ensureVisible(find.text('Cancelar consulta'));
      await tester.tap(find.text('Cancelar consulta'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Manter consulta'));
      await tester.pumpAndSettle();
      expect(writes, 0);
      await tester.tap(find.text('Cancelar consulta'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Não poderei comparecer');
      await tester.tap(find.text('Confirmar cancelamento'));
      await tester.pumpAndSettle();
      expect(writes, 1);
      expect(
        find.text('Consulta cancelada. O horário foi liberado.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Appointments without explicit change permission hide cancellation and rescheduling',
    (tester) async {
      final api = client((_) async => response([appointment(canChange: null)]));
      await show(tester, PatientAppointmentsPage(api: api));
      expect(find.text('Cancelar consulta'), findsNothing);
      expect(find.text('Reagendar consulta'), findsNothing);
      expect(
        find.text(
          'O acesso ao atendimento é liberado 15 minutos antes do início.',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Rescheduling sends the selected availability without a new booking or consent bypass',
    (tester) async {
      final writes = <http.Request>[];
      final api = client((request) async {
        if (request.method == 'GET') {
          return response({
            'itens': [slot()],
          });
        }
        writes.add(request);
        return response({'mensagem': 'Consulta reagendada.'});
      });
      await show(
        tester,
        PatientBookingPage(
          api: api,
          appointment: PatientAppointment.fromJson(appointment()),
        ),
      );
      expect(find.byType(CheckboxListTile), findsNothing);
      await tester.tap(find.byIcon(Icons.radio_button_off));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Confirmar reagendamento'));
      await tester.tap(find.text('Confirmar reagendamento'));
      await tester.pumpAndSettle();
      expect(writes, hasLength(1));
      expect(
        writes.single.url.path,
        '/paciente/consultas/appointment-one/reagendar',
      );
      expect(jsonDecode(writes.single.body), {'disponibilidadeId': 'slot-one'});
    },
  );

  testWidgets(
    'Exam upload has explicit confirmation, authenticated multipart and refreshed read-only analysis',
    (tester) async {
      var uploaded = false, writes = 0;
      final api = client((request) async {
        if (request.method == 'GET') {
          return response({
            'itens': [
              exam(
                canUpload: !uploaded,
                status: uploaded ? 'EM_ANALISE' : 'AGUARDANDO_RESULTADO',
              ),
            ],
          });
        }
        writes++;
        expect(request.url.path, '/paciente/exames/exam-one/envios');
        expect(request.headers['Authorization'], 'Bearer test-token');
        expect(
          request.headers['content-type'],
          startsWith('multipart/form-data'),
        );
        expect(
          request.body,
          contains('name="arquivo"; filename="resultado.pdf"'),
        );
        expect(request.body, contains('%PDF-1.7'));
        uploaded = true;
        return response({'id': 'upload-one'}, 201);
      });
      await show(
        tester,
        PatientExamsPage(
          api: api,
          pickExam: () async => XFile.fromData(
            Uint8List.fromList(utf8.encode('%PDF-1.7')),
            name: 'resultado.pdf',
            path: 'resultado.pdf',
            mimeType: 'application/pdf',
          ),
        ),
      );
      await tester.ensureVisible(find.text('Enviar resultado'));
      await tester.tap(find.text('Enviar resultado'));
      await tester.pumpAndSettle();
      expect(writes, 0);
      await tester.tap(find.text('Voltar'));
      await tester.pumpAndSettle();
      expect(writes, 0);
      await tester.tap(find.text('Enviar resultado'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirmar envio'));
      await tester.pumpAndSettle();
      expect(writes, 1);
      expect(find.text('Resultado enviado para análise.'), findsOneWidget);
      expect(find.text('Enviar resultado'), findsNothing);
      expect(find.text('Abrir arquivo privado'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Invalid selected exam never reaches a confirmation or a network write',
    (tester) async {
      var writes = 0;
      final api = client((request) async {
        if (request.method != 'GET') writes++;
        return response({
          'itens': [exam()],
        });
      });
      await show(
        tester,
        PatientExamsPage(
          api: api,
          pickExam: () async => XFile.fromData(
            Uint8List.fromList(utf8.encode('not-an-exam')),
            name: 'resultado.pdf',
            path: 'resultado.pdf',
          ),
        ),
      );
      await tester.ensureVisible(find.text('Enviar resultado'));
      await tester.tap(find.text('Enviar resultado'));
      await tester.pumpAndSettle();
      expect(writes, 0);
      expect(find.text(invalidExamMessage), findsOneWidget);
      expect(find.text('Confirmar envio'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
