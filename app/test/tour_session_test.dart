import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/session_controller.dart';
import 'package:hemobridge/features/onboarding/tour_content.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'a conclusão restaura após reiniciar e não libera outra conta',
    () async {
      SharedPreferences.setMockInitialValues({'isFirstAccess.conta-a': false});
      FlutterSecureStorage.setMockInitialValues({});
      var account = 'conta-a';
      ApiClient client() => ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          final value = request.url.path.endsWith('/me')
              ? {'id': account, 'perfil': 'PACIENTE', 'senhaProvisoria': false}
              : {'accessToken': 'token-de-teste'};
          return http.Response(jsonEncode(value), 200);
        }),
      );
      final session = SessionController(client());
      addTearDown(session.dispose);
      await session.login('a@example.invalid', 'senha-de-teste');
      expect(session.isFirstAccess, isFalse);
      await session.logout();
      expect(session.isFirstAccess, isTrue);
      account = 'conta-b';
      await session.login('b@example.invalid', 'senha-de-teste');
      expect(session.isFirstAccess, isTrue);
      await session.completeTour();
      final restored = SessionController(client());
      addTearDown(restored.dispose);
      await restored.initialize();
      expect(restored.user?['id'], 'conta-b');
      expect(restored.isFirstAccess, isFalse);
    },
  );

  test('perfis apresentam suas abas e o mesmo processo inicial', () {
    final areas = {
      'PACIENTE': ['Painel', 'Locais', 'Comunidade', 'Perfil'],
      'MEDICO': ['Agenda', 'Exames', 'Comunidade', 'Perfil'],
      'REPRESENTANTE': ['Necessidades', 'Estoque', 'Comunidade', 'Perfil'],
      'ADMINISTRADOR': ['Mapa', 'Moderação', 'Comunidade', 'Perfil'],
    };
    for (final entry in areas.entries) {
      final steps = tourSteps(entry.key);
      expect(steps, hasLength(4));
      expect(steps.first.journey, isTrue);
      final text = steps.map((step) => '${step.title} ${step.text}').join(' ');
      for (final label in entry.value) {
        expect(text, contains(label), reason: entry.key);
      }
    }
  });

  test(
    'prazos usam fonte da instituição e não misturam médias de unidades',
    () {
      final timings = journeyTimings([
        {
          'etapa': 'TRIAGEM',
          'minutos': 15,
          'fonte': 'Protocolo',
          'hospital': {'nome': 'Hospital Aurora'},
        },
        {
          'etapa': 'TRIAGEM',
          'minutos': 30,
          'fonte': 'Protocolo',
          'hospital': {'nome': 'Hospital Horizonte'},
        },
        {
          'etapa': 'ATUALIZACAO_STATUS',
          'minutos': 120,
          'fonte': 'Prazo operacional',
          'hospital': {'nome': 'Hospital Aurora'},
        },
        {
          'etapa': 'DOACAO',
          'minutos': -1,
          'fonte': 'Protocolo',
          'hospital': {'nome': 'Inválido'},
        },
        {
          'etapa': 'DOACAO',
          'minutos': 40,
          'fonte': '',
          'hospital': {'nome': 'Sem fonte'},
        },
        null,
      ]);
      expect(timings.map((stage) => stage.stage), [
        'TRIAGEM',
        'DOACAO',
        'ATUALIZACAO_STATUS',
      ]);
      expect(timings.first.estimates.map((value) => value.minutes), [15, 30]);
      expect(timings[1].estimates, isEmpty);
      expect(timings[1].fallback, contains('10 minutos'));
      expect(timings.last.estimates.single.minutes, 120);
      expect(journeyTimings(null).last.fallback, contains('unidade'));
    },
  );
}
