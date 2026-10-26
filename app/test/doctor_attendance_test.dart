import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/professional/doctor_agenda_page.dart';

http.Response response(dynamic value) => http.Response(
  jsonEncode(value),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
Future<void> tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> open(WidgetTester tester, ApiClient api) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: hemobridgeTheme(),
      home: DoctorAttendancePage(
        api: api,
        consultationId: 'c',
        patientName: 'Paciente de teste',
        initialStatus: 'AGENDADA',
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'inaptidão exige motivo e envia observações com decisão explícita',
    (tester) async {
      final sent = <Map<String, dynamic>>[];
      var rejected = false;
      final api = ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          if (request.method == 'GET') {
            return response({
              'status': rejected ? 'REALIZADA' : 'AGENDADA',
              'podeAtender': !rejected,
              'podeCancelar': false,
              'cicloAtual': true,
              if (rejected) 'motivoReprovacao': 'Restrição temporária.',
            });
          }
          sent.add(jsonDecode(request.body) as Map<String, dynamic>);
          rejected = true;
          return response({});
        }),
      )..token = 'token-de-teste';
      addTearDown(api.close);
      await open(tester, api);
      await tester.enterText(
        find.byKey(const ValueKey('attendance-observations')),
        'Observação clínica de teste.',
      );
      await tap(tester, find.text('Registrar inaptidão para doação'));
      await tap(tester, find.text('Confirmar inaptidão e avisar paciente'));
      expect(sent, isEmpty);
      expect(
        find.textContaining('Informe o motivo da inaptidão'),
        findsOneWidget,
      );
      await tester.enterText(
        find.byKey(const ValueKey('rejection-reason')),
        'Restrição temporária.',
      );
      await tap(tester, find.text('Confirmar inaptidão e avisar paciente'));
      await tap(tester, find.text('Confirmar registro'));
      expect(sent.single, {
        'status': 'REALIZADA',
        'observacoes': 'Observação clínica de teste.',
        'decisao': 'REPROVAR',
        'motivoReprovacao': 'Restrição temporária.',
      });
      expect(find.text('Registrar como realizado'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'consulta futura oferece cancelamento confirmado e bloqueia desfecho clínico',
    (tester) async {
      final sent = <Map<String, dynamic>>[];
      var cancelled = false;
      final api = ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          if (request.method == 'GET') {
            return response({
              'status': cancelled ? 'CANCELADA' : 'AGENDADA',
              'podeAtender': false,
              'podeCancelar': !cancelled,
              'cicloAtual': true,
            });
          }
          sent.add({
            'path': request.url.path,
            'body': jsonDecode(request.body),
          });
          cancelled = true;
          return response({});
        }),
      )..token = 'token-de-teste';
      addTearDown(api.close);
      await open(tester, api);
      expect(find.text('Registrar como realizado'), findsNothing);
      expect(find.text('Registrar ausência'), findsNothing);
      await tester.enterText(
        find.byKey(const ValueKey('cancellation-reason')),
        'Indisponibilidade do profissional.',
      );
      await tap(tester, find.text('Cancelar consulta e avisar paciente'));
      expect(sent, isEmpty);
      await tap(tester, find.text('Confirmar registro'));
      expect(sent.single, {
        'path': '/medico/consultas/c/cancelar',
        'body': {'motivo': 'Indisponibilidade do profissional.'},
      });
      expect(find.text('Cancelar consulta e avisar paciente'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'histórico de outro ciclo é somente leitura mesmo com status agendada',
    (tester) async {
      final api = ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          expect(request.method, 'GET');
          return response({
            'status': 'AGENDADA',
            'podeAtender': false,
            'podeCancelar': false,
            'cicloAtual': false,
          });
        }),
      )..token = 'token-de-teste';
      addTearDown(api.close);
      await open(tester, api);
      expect(find.textContaining('Atendimento histórico'), findsOneWidget);
      expect(find.text('Registrar como realizado'), findsNothing);
      expect(find.text('Enviar solicitação'), findsNothing);
      expect(find.text('Cancelar consulta e avisar paciente'), findsNothing);
    },
  );
}
