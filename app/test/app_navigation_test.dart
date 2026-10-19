import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/core/session_controller.dart';
import 'package:hemobridge/features/navigation/app_shell.dart';

void main() {
  for (final account in [
    ('PACIENTE', 'PRE_CADASTRADO', 'Painel', 'Meu painel', '/paciente/perfil'),
    ('PACIENTE', 'APROVADO', 'Painel', 'Meu painel', '/paciente/perfil'),
    ('MEDICO', '', 'Agenda', 'Minha agenda', '/medico/hospitais'),
    (
      'REPRESENTANTE',
      '',
      'Necessidades',
      'Necessidades da instituição',
      '/representante/necessidades',
    ),
    (
      'ADMINISTRADOR',
      '',
      'Mapa',
      'Mapa de necessidades',
      '/admin/mapa-necessidades',
    ),
  ]) {
    testWidgets(
      '360 px: ${account.$1} ${account.$2} mantém perfil após comunidade',
      (tester) async {
        tester.view.physicalSize = const Size(360, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final paths = <String>[];
        final api = ApiClient(
          baseUrl: 'https://api.example.invalid',
          client: MockClient((req) async {
            paths.add(req.url.path);
            final dynamic value = switch (req.url.path) {
              '/paciente/perfil' => {
                'name': 'Conta de teste',
                'status': account.$2,
                'bloodType': null,
              },
              '/medico/hospitais' => [],
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
            return http.Response(
              jsonEncode(value),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }),
        );
        final session = SessionController(api)
          ..user = {
            'id': 'conta-teste',
            'nome': 'Conta de teste',
            'email': 'teste@example.invalid',
            'perfil': account.$1,
          };
        addTearDown(session.dispose);
        await tester.pumpWidget(
          MaterialApp(
            theme: hemobridgeTheme(),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(1.2)),
              child: child!,
            ),
            home: AppShell(session: session),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text(account.$4), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Comunidade'));
        await tester.pumpAndSettle();
        expect(paths.last, '/comunidade/publicacoes');
        await tester.tap(find.text('Perfil'));
        await tester.pumpAndSettle();
        expect(find.text('Meu perfil'), findsOneWidget);
        if (account.$1 == 'PACIENTE') {
          expect(find.text('Editar meus dados'), findsOneWidget);
        } else {
          expect(find.text('Editar meus dados'), findsNothing);
        }
        await tester.tap(find.text(account.$3).last);
        await tester.pumpAndSettle();
        expect(find.text(account.$4), findsOneWidget);
        expect(paths.last, account.$5);
        expect(find.byType(NavigationBar), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
