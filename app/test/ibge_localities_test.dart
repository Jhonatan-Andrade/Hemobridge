import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/features/locations/ibge_localities.dart';

void main() {
  test('consulta estados e municípios da UF com acentos em UTF-8', () async {
    final paths = <String>[];
    final localities = IbgeLocalities(
      client: MockClient((request) async {
        paths.add(request.url.path);
        expect(request.url.host, 'servicodados.ibge.gov.br');
        expect(request.url.queryParameters['orderBy'], 'nome');
        final data = request.url.path.endsWith('/estados')
            ? [
                {'id': 41, 'sigla': 'PR', 'nome': 'Paraná'},
              ]
            : [
                {'id': 4101804, 'nome': 'Araucária'},
              ];
        return http.Response.bytes(utf8.encode(jsonEncode(data)), 200);
      }),
    );
    addTearDown(localities.close);
    expect((await localities.loadStates()).single.abbreviation, 'PR');
    expect(
      (await localities.loadMunicipalities('PR')).single.name,
      'Araucária',
    );
    expect(paths, [
      '/api/v1/localidades/estados',
      '/api/v1/localidades/estados/PR/municipios',
    ]);
  });

  test('rejeita UF inválida sem enviar requisição', () async {
    var calls = 0;
    final localities = IbgeLocalities(
      client: MockClient((_) async {
        calls++;
        return http.Response('[]', 200);
      }),
    );
    addTearDown(localities.close);
    await expectLater(
      localities.loadMunicipalities('../SP'),
      throwsArgumentError,
    );
    expect(calls, 0);
  });

  test('rejeita indisponibilidade, itens nulos e estados sem sigla', () async {
    final responses = [
      http.Response('{}', 503),
      http.Response('[null]', 200),
      http.Response('[{"id":41,"nome":"Parana"}]', 200),
    ];
    final localities = IbgeLocalities(
      client: MockClient((_) async => responses.removeAt(0)),
    );
    addTearDown(localities.close);
    for (var i = 0; i < 3; i++) {
      await expectLater(localities.loadStates(), throwsFormatException);
    }
  });
}
