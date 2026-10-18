import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_client.dart';

class SessionController extends ChangeNotifier {
  final ApiClient api;
  final FlutterSecureStorage storage;
  Map<String, dynamic>? user;
  bool ready = false, isFirstAccess = true;
  String? error;
  SessionController(this.api, {this.storage = const FlutterSecureStorage()});
  Future<void> initialize() async {
    try {
      api.token = await storage.read(key: 'sessionToken');
      if (api.token != null) {
        user = Map<String, dynamic>.from(await api.request('/auth/me'));
        _readFirstAccess();
      }
    } on ApiException catch (e) {
      if (e.status == 401) {
        api.token = null;
        await storage.delete(key: 'sessionToken');
      } else {
        error = e.message;
      }
    } catch (_) {
      error = 'Não foi possível restaurar sua sessão.';
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final result = await api.request(
      '/auth/login',
      method: 'POST',
      body: {'email': email.trim().toLowerCase(), 'senha': password},
    );
    api.token = result['accessToken'] as String;
    await storage.write(key: 'sessionToken', value: api.token);
    user = Map<String, dynamic>.from(await api.request('/auth/me'));
    error = null;
    _readFirstAccess();
    notifyListeners();
  }

  Future<void> firstPassword(
    String password,
    bool consent,
    String version,
  ) async {
    final result = await api.request(
      '/auth/primeiro-acesso',
      method: 'POST',
      body: {
        'novaSenha': password,
        'confirmacaoSenha': password,
        'aceiteTermo': consent,
        'versaoTermo': version,
      },
    );
    api.token = result['accessToken'];
    await storage.write(key: 'sessionToken', value: api.token);
    user = Map<String, dynamic>.from(await api.request('/auth/me'));
    _readFirstAccess();
    notifyListeners();
  }

  void _readFirstAccess() {
    isFirstAccess = user?['isFirstAccess'] != false;
  }

  Future<void> completeTour() async {
    final userId = user?['id'];
    if (userId is! String) throw StateError('Sessão indisponível.');
    final result = await api.request(
      '/auth/tour/conclusao',
      method: 'POST',
      body: {'versao': user?['tourVersion']},
    );
    if (result['isFirstAccess'] != false) {
      throw StateError(
        'Não foi possível confirmar a conclusão. Tente novamente.',
      );
    }
    user = {
      ...user!,
      'isFirstAccess': false,
      'tourVersion': result['tourVersion'],
    };
    isFirstAccess = false;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await api.request('/auth/logout', method: 'POST');
    } finally {
      await storage.delete(key: 'sessionToken');
      api.token = null;
      user = null;
      isFirstAccess = true;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    api.close();
    super.dispose();
  }
}
