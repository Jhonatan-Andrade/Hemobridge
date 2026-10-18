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
  String? token;
  ApiClient({
    http.Client? client,
    this.baseUrl = const String.fromEnvironment('API_URL'),
  }) : _client = client ?? http.Client();
  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final base = Uri.tryParse(baseUrl);
    if (base == null ||
        !base.hasAuthority ||
        (kReleaseMode && base.scheme != 'https')) {
      throw ApiException(
        'O endereço seguro do serviço não foi configurado.',
        0,
      );
    }
    final req = http.Request(
      method,
      Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}$path'),
    );
    req.headers.addAll({
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    });
    if (body != null) {
      req.headers['Content-Type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    try {
      final response = await http.Response.fromStream(
        await _client.send(req).timeout(const Duration(seconds: 20)),
      );
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

  void close() => _client.close();
}
