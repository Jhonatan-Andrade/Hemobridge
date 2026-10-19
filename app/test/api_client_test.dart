import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/private_file_page.dart';

void main() {
  test('arquivo privado usa bearer no cabeçalho e preserva bytes', () async {
    final bytes = [37, 80, 68, 70, 45, 49, 46, 55, 10];
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer token-de-teste');
        expect(request.url.query, isEmpty);
        expect(request.followRedirects, isFalse);
        return http.Response.bytes(bytes, 200);
      }),
    )..token = 'token-de-teste';
    addTearDown(api.close);
    expect(await api.getFile('/paciente/exames/envios/1/arquivo'), bytes);
  });

  test('nega acesso a arquivo e não interpreta erro JSON como exame', () async {
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient(
        (_) async => http.Response('{"message":"Acesso não autorizado."}', 403),
      ),
    );
    addTearDown(api.close);
    expect(
      api.getFile('/medico/exames/1/arquivo'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.status, 'status', 403)
            .having((e) => e.message, 'mensagem', 'Acesso não autorizado.'),
      ),
    );
  });

  test('redirecionamento não encaminha credencial a outro endereço', () async {
    var requests = 0;
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient((request) async {
        requests++;
        expect(request.followRedirects, isFalse);
        return http.Response(
          '',
          302,
          headers: {'location': 'https://outro.example.invalid/arquivo'},
        );
      }),
    )..token = 'token-de-teste';
    addTearDown(api.close);
    await expectLater(
      api.getFile('/arquivo'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 302)),
    );
    expect(requests, 1);
  });

  test('caminhos externos e protocolo inválido não recebem bearer', () async {
    var requests = 0;
    final client = MockClient((_) async {
      requests++;
      return http.Response('{}', 200);
    });
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: client,
    )..token = 'token';
    addTearDown(api.close);
    for (final path in [
      'https://outra.example.invalid',
      '//outra.example.invalid',
      r'/a\b',
    ]) {
      await expectLater(api.request(path), throwsA(isA<ApiException>()));
    }
    final invalid = ApiClient(
      baseUrl: 'ftp://api.example.invalid',
      client: client,
    );
    await expectLater(invalid.request('/teste'), throwsA(isA<ApiException>()));
    expect(requests, 0);
  });

  test('timeout inclui corpo lento e permite nova tentativa', () async {
    var count = 0;
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      timeout: const Duration(milliseconds: 20),
      client: MockClient.streaming((_, _) async {
        count++;
        return http.StreamedResponse(
          count == 1
              ? Stream<List<int>>.fromFuture(
                  Future.delayed(
                    const Duration(milliseconds: 100),
                    () => utf8.encode('{}'),
                  ),
                )
              : Stream.value(utf8.encode('{}')),
          200,
        );
      }),
    );
    addTearDown(api.close);
    await expectLater(
      api.request('/lento'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 0)),
    );
    expect(await api.request('/lento'), {});
  });

  test('upload vazio ou maior que cinco MB não envia requisição', () async {
    var count = 0;
    final api = ApiClient(
      baseUrl: 'https://api.example.invalid',
      client: MockClient((_) async {
        count++;
        return http.Response('{}', 200);
      }),
    );
    addTearDown(api.close);
    for (final bytes in [<int>[], List<int>.filled(5 * 1024 * 1024 + 1, 0)]) {
      await expectLater(
        api.upload('/envios', filename: 'arquivo.pdf', bytes: bytes),
        throwsA(isA<ApiException>()),
      );
    }
    expect(count, 0);
  });

  test('visualização distingue assinaturas e rejeita HTML ou JSON', () {
    expect(privateFileFormat([37, 80, 68, 70, 45]), PrivateFileFormat.pdf);
    expect(privateFileFormat([255, 216, 255]), PrivateFileFormat.image);
    expect(
      privateFileFormat([137, 80, 78, 71, 13, 10, 26, 10]),
      PrivateFileFormat.image,
    );
    expect(
      privateFileFormat(utf8.encode('<html>')),
      PrivateFileFormat.unsupported,
    );
    expect(
      privateFileFormat(utf8.encode('{"error":true}')),
      PrivateFileFormat.unsupported,
    );
  });
}
