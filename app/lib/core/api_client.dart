import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int status;
  ApiException(this.message, this.status);
  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _client;
  final String baseUrl;
  final Duration timeout;
  String? token;
  ApiClient({
    http.Client? client,
    this.baseUrl = const String.fromEnvironment('API_URL'),
    this.timeout = const Duration(seconds: 30),
  }) : _client = client ?? http.Client();
  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final req = http.Request(method, _uri(path));
    req.headers.addAll({
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    });
    if (body != null) {
      req.headers['Content-Type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    try {
      final response = await _send(req);
      final data = response.body.isEmpty ? null : jsonDecode(response.body);
      if (response.statusCode >= 400) {
        final message = data is Map ? data['message'] : null;
        throw ApiException(
          message is List
              ? message.join(' ')
              : message?.toString() ?? 'Não foi possível concluir.',
          response.statusCode,
        );
      }
      return data;
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('Não foi possível conectar. Tente novamente.', 0);
    }
  }

  Uri _uri(String path) {
    final base = Uri.tryParse(baseUrl);
    if (base == null ||
        !base.hasAuthority ||
        !['http', 'https'].contains(base.scheme) ||
        base.userInfo.isNotEmpty ||
        (kReleaseMode && base.scheme != 'https') ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.contains('\\')) {
      throw ApiException(
        'O endereço seguro do serviço não foi configurado.',
        0,
      );
    }
    return Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}$path');
  }

  Future<http.Response> _send(http.BaseRequest request) async {
    request.followRedirects = false;
    request.headers['Accept'] = 'application/json';
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    try {
      return await (() async {
        final response = await http.Response.fromStream(
          await _client.send(request),
        );
        if (response.statusCode >= 300 && response.statusCode < 400) {
          throw ApiException(
            'O serviço redirecionou a solicitação. Tente novamente.',
            response.statusCode,
          );
        }
        if (response.statusCode >= 400) {
          dynamic data;
          try {
            data = jsonDecode(response.body);
          } catch (_) {}
          final message = data is Map ? data['message'] : null;
          throw ApiException(
            message is List
                ? message.join(' ')
                : message?.toString() ?? 'Não foi possível concluir.',
            response.statusCode,
          );
        }
        return response;
      })().timeout(timeout);
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('Não foi possível conectar. Tente novamente.', 0);
    }
  }

  Future<dynamic> upload(
    String path, {
    required String filename,
    required List<int> bytes,
  }) async {
    if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
      throw ApiException(
        'Selecione um arquivo PDF, JPG ou PNG de até 5 MB.',
        0,
      );
    }
    final request = http.MultipartRequest('POST', _uri(path));
    request.files.add(
      http.MultipartFile.fromBytes(
        'arquivo',
        bytes,
        filename: filename.split(RegExp(r'[/\\]')).last,
      ),
    );
    final response = await _send(request);
    try {
      return response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      throw ApiException(
        'O serviço retornou uma resposta inválida.',
        response.statusCode,
      );
    }
  }

  Future<Uint8List> getFile(String path) async {
    final response = await _send(http.Request('GET', _uri(path)));
    if (response.bodyBytes.isEmpty ||
        response.bodyBytes.length > 5 * 1024 * 1024) {
      throw ApiException(
        'O arquivo retornado está vazio ou excede o limite permitido.',
        0,
      );
    }
    return response.bodyBytes;
  }

  void close() => _client.close();
}
