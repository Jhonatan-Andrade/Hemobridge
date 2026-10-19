import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/account/account_locality_fields.dart';
import 'package:hemobridge/features/account/account_validation.dart';
import 'package:hemobridge/features/account/patient_profile_page.dart';
import 'package:hemobridge/features/account/registration_page.dart';
import 'package:hemobridge/features/locations/ibge_localities.dart';

http.Response jsonResponse(Object value, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(value)), status);

IbgeLocalities localities([
  Future<http.Response> Function(http.Request)? handler,
]) {
  final value = IbgeLocalities(
    client: MockClient(
      handler ??
          (request) async => jsonResponse(
            request.url.path.endsWith('/estados')
                ? [
                    {'id': 41, 'nome': 'Paraná', 'sigla': 'PR'},
                    {'id': 35, 'nome': 'São Paulo', 'sigla': 'SP'},
                  ]
                : [
                    {'id': 4106902, 'nome': 'Curitiba'},
                  ],
          ),
    ),
  );
  addTearDown(value.close);
  return value;
}

ApiClient apiWith(Future<http.Response> Function(http.Request) handler) {
  final value = ApiClient(
    baseUrl: 'https://api.example.test',
    client: MockClient(handler),
  );
  addTearDown(value.close);
  return value;
}

Future<void> pumpPage(WidgetTester tester, Widget page) async {
  await tester.binding.setSurfaceSize(const Size(360, 800));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(theme: hemobridgeTheme(), home: page));
  await tester.pumpAndSettle();
}

Future<void> enter(WidgetTester tester, String key, String value) async {
  final field = find.byKey(ValueKey(key));
  await tester.ensureVisible(field);
  await tester.enterText(field, value);
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, Finder field, String label) async {
  await tester.ensureVisible(field);
  await tester.tap(field);
  await tester.pumpAndSettle();
  await tester.tap(find.text(label).last);
  await tester.pumpAndSettle();
}

void main() {
  test('valida CPF, telefone, peso e senha conforme contrato da API', () {
    expect(validCpf('529.982.247-25'), isTrue);
    expect(validCpf('11111111111'), isFalse);
    expect(validCpf('52998224724'), isFalse);
    expect(validatePhone('(41) 99999-8888'), isNull);
    expect(validatePhone('123'), isNotNull);
    expect(validateWeight('62,50', registration: true), isNull);
    expect(validateWeight('49.99', registration: true), isNotNull);
    expect(validateWeight('NaN'), isNotNull);
    expect(validateWeight('62.123'), isNotNull);
    expect(validateAccountPassword('senhaForte1'), isNull);
    expect(validateAccountPassword('senhaforte1'), isNotNull);
    expect(validateAccountPassword('SENHAFORTE1'), isNotNull);
  });

  test('idade respeita aniversário e rejeita datas normalizadas inválidas', () {
    final now = DateTime(2026, 10, 18);
    expect(ageAt('2010-10-18', now), 16);
    expect(ageAt('2010-10-19', now), 15);
    expect(ageAt('1990-02-30', now), isNull);
    expect(ageAt('18/10/1990', now), isNull);
  });

  testWidgets(
    'descarta municípios atrasados de outra UF e invalida a cidade anterior',
    (tester) async {
      final lateSp = Completer<http.Response>();
      final changes = <String>[];
      final service = localities((request) async {
        if (request.url.path.endsWith('/estados')) {
          return jsonResponse([
            {'id': 35, 'nome': 'São Paulo', 'sigla': 'SP'},
            {'id': 41, 'nome': 'Paraná', 'sigla': 'PR'},
          ]);
        }
        if (request.url.path.contains('/SP/')) return lateSp.future;
        return jsonResponse([
          {'id': 4106902, 'nome': 'Curitiba'},
        ]);
      });
      await pumpPage(
        tester,
        Scaffold(
          body: Form(
            child: AccountLocalityFields(
              localities: service,
              onChanged: (uf, city) => changes.add('$uf/$city'),
            ),
          ),
        ),
      );
      await choose(
        tester,
        find.byType(DropdownButtonFormField<String>).first,
        'São Paulo (SP)',
      );
      await choose(
        tester,
        find.byType(DropdownButtonFormField<String>).first,
        'Paraná (PR)',
      );
      lateSp.complete(
        jsonResponse([
          {'id': 3550308, 'nome': 'São Paulo'},
        ]),
      );
      await tester.pumpAndSettle();
      await choose(
        tester,
        find.byType(DropdownButtonFormField<String>).last,
        'Curitiba',
      );
      expect(changes.last, 'PR/Curitiba');
      expect(changes, containsAllInOrder(['SP/', 'PR/']));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'perfil carrega UF/cidade atuais e salva somente campos permitidos',
    (tester) async {
      Map<String, dynamic>? saved;
      var notifications = 0;
      final initial = {
        'name': 'Paciente Teste',
        'email': 'p@example.test',
        'cpf': '52998224725',
        'phone': '41999998888',
        'weight': '62.50',
        'city': 'Curitiba',
        'state': 'PR',
        'bloodType': null,
      };
      final api = apiWith((request) async {
        expect(request.url.path, '/paciente/perfil');
        if (request.method == 'PATCH') {
          saved = jsonDecode(request.body) as Map<String, dynamic>;
        }
        return jsonResponse(initial);
      });
      await pumpPage(
        tester,
        Scaffold(
          body: PatientProfilePage(
            api: api,
            localities: localities(),
            onSaved: () => notifications++,
          ),
        ),
      );
      expect(find.text('Curitiba'), findsOneWidget);
      await enter(tester, 'profile-phone', '(41) 98888-7777');
      await enter(tester, 'profile-weight', '63,25');
      await tester.ensureVisible(find.text('Salvar alterações'));
      await tester.tap(find.text('Salvar alterações'));
      await tester.pumpAndSettle();
      expect(saved, {
        'telefone': '41988887777',
        'pesoKg': 63.25,
        'cidade': 'Curitiba',
        'estado': 'PR',
      });
      expect(notifications, 1);
      expect(find.text('Alterações salvas.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'cadastro usa termo vigente e nunca permite atribuir role privilegiada',
    (tester) async {
      Map<String, dynamic>? sent;
      String? registered;
      final api = apiWith((request) async {
        if (request.url.path == '/pacientes/termo-consentimento') {
          return jsonResponse({
            'versao': '1.7',
            'texto': 'Termo vigente para saúde.',
          });
        }
        expect(request.method, 'POST');
        expect(request.url.path, '/pacientes');
        sent = jsonDecode(request.body) as Map<String, dynamic>;
        return jsonResponse({
          'id': 'patient-1',
          'situacao': 'PRE_CADASTRADO',
        }, 201);
      });
      await pumpPage(
        tester,
        RegistrationPage(
          api: api,
          localities: localities(),
          onRegistered: (email) => registered = email,
        ),
      );
      for (final entry in {
        'nome': 'Paciente Teste',
        'cpf': '529.982.247-25',
        'email': ' PACIENTE@example.test ',
        'telefone': '(41) 99999-8888',
        'dataNascimento': '1995-05-20',
        'pesoKg': '62,50',
      }.entries) {
        await enter(tester, 'registration-${entry.key}', entry.value);
      }
      await choose(
        tester,
        find.byKey(const ValueKey('registration-sexo')),
        'Feminino',
      );
      await choose(
        tester,
        find.byType(DropdownButtonFormField<String>).at(1),
        'Paraná (PR)',
      );
      await choose(
        tester,
        find.byType(DropdownButtonFormField<String>).last,
        'Curitiba',
      );
      await enter(tester, 'registration-senha', 'senhaForte1');
      await enter(tester, 'registration-confirmacaoSenha', 'senhaForte1');
      await tester.ensureVisible(find.byType(CheckboxListTile));
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Criar pré-cadastro'));
      await tester.tap(find.text('Criar pré-cadastro'));
      await tester.pumpAndSettle();
      expect(sent?['versaoTermo'], '1.7');
      expect(sent?['aceiteTermo'], isTrue);
      expect(sent?['email'], 'paciente@example.test');
      expect(sent?['cpf'], '52998224725');
      expect(sent?['estado'], 'PR');
      expect(sent?['cidade'], 'Curitiba');
      expect(sent?.containsKey('perfil'), isFalse);
      expect(sent?.containsKey('role'), isFalse);
      expect(find.text('Pré-cadastro concluído'), findsOneWidget);
      expect(registered, isNull);
      await tester.tap(find.text('Ir para entrar'));
      expect(registered, 'paciente@example.test');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('termo indisponível impede cadastro e permite nova consulta', (
    tester,
  ) async {
    var attempts = 0, registrations = 0;
    final api = apiWith((request) async {
      if (request.url.path == '/pacientes/termo-consentimento') {
        attempts++;
        return attempts == 1
            ? jsonResponse({'message': 'Serviço indisponível'}, 503)
            : jsonResponse({'versao': '1.1', 'texto': 'Termo vigente.'});
      }
      registrations++;
      return jsonResponse({});
    });
    await pumpPage(
      tester,
      RegistrationPage(api: api, localities: localities()),
    );
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Criar pré-cadastro'),
    );
    expect(button.onPressed, isNull);
    await tester.ensureVisible(find.text('Recarregar termo de consentimento'));
    await tester.tap(find.text('Recarregar termo de consentimento'));
    await tester.pumpAndSettle();
    expect(attempts, 2);
    expect(registrations, 0);
    expect(find.text('Termo de consentimento · versão 1.1'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
