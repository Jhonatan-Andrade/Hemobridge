import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

class LocalityPicker extends StatefulWidget {
  final void Function(String uf, String city) onChanged;
  const LocalityPicker({super.key, required this.onChanged});
  @override
  State<LocalityPicker> createState() => _LocalityPickerState();
}

class _LocalityPickerState extends State<LocalityPicker> {
  final client = http.Client();
  List<dynamic> states = [], cities = [];
  String? uf, city, error;
  bool loading = false;
  int requestId = 0;
  @override
  void initState() {
    super.initState();
    loadStates();
  }

  Future<List<dynamic>> load(String path) async {
    final r = await client
        .get(
          Uri.parse('https://servicodados.ibge.gov.br/api/v1/localidades$path'),
        )
        .timeout(const Duration(seconds: 15));
    if (r.statusCode != 200) throw Exception();
    return jsonDecode(r.body) as List;
  }

  Future<void> loadStates() async {
    try {
      final list = await load('/estados?orderBy=nome');
      if (mounted) setState(() => states = list);
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Estados indisponíveis. Tente novamente.');
      }
    }
  }

  Future<void> selectState(String? value) async {
    if (value == null) return;
    final current = ++requestId;
    setState(() {
      uf = value;
      city = null;
      cities = [];
      loading = true;
      error = null;
    });
    widget.onChanged(value, '');
    try {
      final list = await load('/estados/$value/municipios?orderBy=nome');
      if (mounted && current == requestId) setState(() => cities = list);
    } catch (_) {
      if (mounted && current == requestId) {
        setState(() => error = 'Municípios indisponíveis. Tente novamente.');
      }
    } finally {
      if (mounted && current == requestId) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    requestId++;
    client.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      DropdownButtonFormField<String>(
        key: ValueKey('state-$uf'),
        initialValue: uf,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Estado'),
        items: states
            .map(
              (s) => DropdownMenuItem<String>(
                value: s['sigla'] as String,
                child: Text(
                  s['nome'] as String,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
            .toList(),
        onChanged: selectState,
      ),
      const SizedBox(height: 16),
      DropdownButtonFormField<String>(
        key: ValueKey('city-$uf-$city'),
        initialValue: city,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: loading ? 'Carregando municípios…' : 'Município',
        ),
        items: cities
            .map(
              (c) => DropdownMenuItem<String>(
                value: c['nome'] as String,
                child: Text(
                  c['nome'] as String,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
            .toList(),
        onChanged: uf == null || loading
            ? null
            : (value) {
                setState(() => city = value);
                widget.onChanged(uf!, value ?? '');
              },
      ),
      if (error != null) ...[
        Text(error!),
        TextButton(
          onPressed: uf == null ? loadStates : () => selectState(uf),
          child: const Text('Tentar novamente'),
        ),
      ],
    ],
  );
}

class LocationsPage extends StatefulWidget {
  const LocationsPage({super.key});
  @override
  State<LocationsPage> createState() => _LocationsPageState();
}

class _LocationsPageState extends State<LocationsPage> {
  StreamSubscription<Position>? subscription;
  Position? position;
  String uf = '', city = '', message = '';
  bool locating = false;
  Future<void> locate() async {
    setState(() => locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw Exception(
          'Ative a localização do celular ou escolha estado e município.',
        );
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception(
          'Localização não autorizada. A busca manual continua disponível.',
        );
      }
      await subscription?.cancel();
      subscription =
          Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.medium,
              distanceFilter: 50,
            ),
          ).listen(
            (p) {
              if (mounted) {
                setState(() {
                  position = p;
                  message =
                      'Localização ativa enquanto esta tela estiver aberta.';
                  locating = false;
                });
              }
            },
            onError: (_) {
              if (mounted) {
                setState(() {
                  message =
                      'Não foi possível obter a localização. Use a busca manual.';
                  locating = false;
                });
              }
            },
          );
    } catch (e) {
      if (mounted) {
        setState(() {
          message = e.toString().replaceFirst('Exception: ', '');
          locating = false;
        });
      }
    }
  }

  Future<void> openMap(String service) async {
    final place = city.isNotEmpty
        ? '$city, $uf'
        : position != null
        ? '${position!.latitude.toStringAsFixed(2)},${position!.longitude.toStringAsFixed(2)}'
        : '';
    if (place.isEmpty) return;
    final url = Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': '$service em $place',
    });
    if (!await launchUrl(url, mode: LaunchMode.externalApplication) &&
        mounted) {
      setState(() => message = 'Não foi possível abrir o Maps.');
    }
  }

  @override
  void dispose() {
    subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Text(
        'Encontrar locais',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
      const SizedBox(height: 12),
      const Text(
        'Encontre serviços para doação ou exames. Confirme atendimento, endereço e horário com a unidade.',
      ),
      const SizedBox(height: 24),
      FilledButton.icon(
        onPressed: locating ? null : locate,
        icon: const Icon(Icons.my_location),
        label: Text(locating ? 'Localizando…' : 'Usar minha localização'),
      ),
      if (position != null)
        TextButton(
          onPressed: () {
            subscription?.cancel();
            setState(() {
              position = null;
              message = 'Localização pausada.';
            });
          },
          child: const Text('Pausar localização'),
        ),
      const SizedBox(height: 16),
      Text(message),
      const SizedBox(height: 20),
      LocalityPicker(
        onChanged: (state, municipality) => setState(() {
          uf = state;
          city = municipality;
        }),
      ),
      const SizedBox(height: 20),
      for (final service in [
        'Hemocentro e doação de sangue',
        'Laboratório de exame de sangue',
        'Laboratório de exames adicionais',
      ])
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(service, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: city.isNotEmpty || position != null
                      ? () => openMap(service)
                      : null,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Buscar no Google Maps'),
                ),
              ],
            ),
          ),
        ),
      const Text(
        'O GPS é opcional, não é guardado pelo app e é encerrado ao sair desta tela. O Maps recebe a região aproximada somente quando você abre a busca.',
      ),
    ],
  );
}
