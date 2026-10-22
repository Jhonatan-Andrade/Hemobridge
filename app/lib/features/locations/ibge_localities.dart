import 'dart:convert';
import 'package:http/http.dart' as http;

class IbgeState {
  final int id;
  final String abbreviation;
  final String name;
  const IbgeState(this.id, this.abbreviation, this.name);
}

class IbgeMunicipality {
  final int id;
  final String name;
  const IbgeMunicipality(this.id, this.name);
}

class IbgeLocalities {
  final http.Client _client;
  IbgeLocalities({http.Client? client}) : _client = client ?? http.Client();

  Future<List<Map<String, dynamic>>> _load(String path) async {
    final response = await _client
        .get(
          Uri.https('servicodados.ibge.gov.br', '/api/v1/localidades$path', {
            'orderBy': 'nome',
          }),
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) {
      throw const FormatException('Localidades do IBGE indisponíveis.');
    }
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (data is! List ||
        data.any(
          (item) =>
              item is! Map<String, dynamic> ||
              item['id'] is! int ||
              item['nome'] is! String ||
              (item['nome'] as String).trim().isEmpty,
        )) {
      throw const FormatException('Resposta de localidades inválida.');
    }
    return data.cast<Map<String, dynamic>>();
  }

  Future<List<IbgeState>> loadStates() async {
    final data = await _load('/estados');
    return data.map((item) {
      final abbreviation = item['sigla'];
      if (abbreviation is! String ||
          !RegExp(r'^[A-Z]{2}$').hasMatch(abbreviation)) {
        throw const FormatException('Estado inválido na resposta do IBGE.');
      }
      return IbgeState(item['id'] as int, abbreviation, item['nome'] as String);
    }).toList();
  }

  Future<List<IbgeMunicipality>> loadMunicipalities(String uf) async {
    if (!RegExp(r'^[A-Z]{2}$').hasMatch(uf)) {
      throw ArgumentError.value(uf, 'uf', 'Estado inválido.');
    }
    final data = await _load('/estados/$uf/municipios');
    return data
        .map(
          (item) => IbgeMunicipality(item['id'] as int, item['nome'] as String),
        )
        .toList();
  }

  void close() => _client.close();
}
