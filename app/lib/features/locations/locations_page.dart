import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import 'ibge_localities.dart';

class LocalityPicker extends StatefulWidget {
  final void Function(String uf, String city) onChanged;
  final IbgeLocalities? localities;
  const LocalityPicker({super.key, required this.onChanged, this.localities});
  @override
  State<LocalityPicker> createState() => _LocalityPickerState();
}

class _LocalityPickerState extends State<LocalityPicker> {
  late final localities = widget.localities ?? IbgeLocalities();
  List<IbgeState> states = [];
  List<IbgeMunicipality> cities = [];
  String? uf, city, stateError, cityError;
  bool loadingStates = true, loadingCities = false;
  int requestId = 0;
  @override
  void initState() {
    super.initState();
    loadStates();
  }

  Future<void> loadStates() async {
    setState(() {
      loadingStates = true;
      stateError = null;
    });
    try {
      final list = await localities.loadStates();
      if (mounted) setState(() => states = list);
    } catch (_) {
      if (mounted) {
        setState(() => stateError = 'Estados indisponíveis. Tente novamente.');
      }
    } finally {
      if (mounted) setState(() => loadingStates = false);
    }
  }

  Future<void> selectState(String? value) async {
    if (value == null) return;
    final current = ++requestId;
    setState(() {
      uf = value;
      city = null;
      cities = [];
      loadingCities = true;
      cityError = null;
    });
    widget.onChanged(value, '');
    try {
      final list = await localities.loadMunicipalities(value);
      if (mounted && current == requestId) setState(() => cities = list);
    } catch (_) {
      if (mounted && current == requestId) {
        setState(
          () => cityError = 'Municípios indisponíveis. Tente novamente.',
        );
      }
    } finally {
      if (mounted && current == requestId) {
        setState(() => loadingCities = false);
      }
    }
  }

  @override
  void dispose() {
    requestId++;
    if (widget.localities == null) localities.close();
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
        decoration: InputDecoration(
          labelText: loadingStates ? 'Carregando estados…' : 'Estado',
        ),
        hint: Text(
          stateError != null
              ? 'Estados indisponíveis'
              : states.isEmpty && !loadingStates
              ? 'Nenhum estado disponível'
              : 'Selecione o estado',
        ),
        items: states
            .map(
              (s) => DropdownMenuItem<String>(
                value: s.abbreviation,
                child: Text(
                  '${s.name} (${s.abbreviation})',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
            .toList(),
        onChanged: loadingStates || states.isEmpty ? null : selectState,
      ),
      if (stateError != null) ...[
        Semantics(liveRegion: true, child: Text(stateError!)),
        TextButton(
          onPressed: loadStates,
          child: const Text('Tentar novamente'),
        ),
      ],
      const SizedBox(height: 16),
      DropdownButtonFormField<String>(
        key: ValueKey('city-$uf-$city'),
        initialValue: city,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: loadingCities ? 'Carregando municípios…' : 'Município',
        ),
        hint: Text(
          uf == null
              ? 'Escolha primeiro o estado'
              : cityError != null
              ? 'Municípios indisponíveis'
              : cities.isEmpty && !loadingCities
              ? 'Nenhum município disponível'
              : 'Selecione o município',
        ),
        items: cities
            .map(
              (c) => DropdownMenuItem<String>(
                value: c.name,
                child: Text(c.name, overflow: TextOverflow.ellipsis),
              ),
            )
            .toList(),
        onChanged: uf == null || loadingCities || cities.isEmpty
            ? null
            : (value) {
                setState(() => city = value);
                widget.onChanged(uf!, value ?? '');
              },
      ),
      if (cityError != null) ...[
        Semantics(liveRegion: true, child: Text(cityError!)),
        TextButton(
          onPressed: () => selectState(uf),
          child: const Text('Tentar novamente'),
        ),
      ],
    ],
  );
}

enum _LocationSettingsTarget { device, app }

class _DonorRecommendations extends StatefulWidget {
  final ApiClient api;
  final Position? position;
  const _DonorRecommendations({required this.api, this.position});

  @override
  State<_DonorRecommendations> createState() => _DonorRecommendationsState();
}

class _DonorRecommendationsState extends State<_DonorRecommendations> {
  Map<String, dynamic>? data;
  String? error;
  bool loading = true, restricted = false;
  int requestId = 0;
  int visibleCount = 6;

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void didUpdateWidget(covariant _DonorRecommendations oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.position != widget.position || oldWidget.api != widget.api) {
      load();
    }
  }

  Future<void> load() async {
    final request = ++requestId;
    setState(() {
      loading = true;
      error = null;
      data = null;
      restricted = false;
      visibleCount = 6;
    });
    final position = widget.position;
    final query = position == null
        ? ''
        : '?${Uri(queryParameters: {'lat': position.latitude.toStringAsFixed(2), 'lng': position.longitude.toStringAsFixed(2)}).query}';
    try {
      final response = await widget.api.request(
        '/paciente/locais-recomendados$query',
      );
      if (!mounted || request != requestId) return;
      setState(() => data = Map<String, dynamic>.from(response as Map));
    } catch (failure) {
      if (!mounted || request != requestId) return;
      setState(() {
        restricted = failure is ApiException && failure.status == 403;
        error = failure is ApiException
            ? failure.message
            : 'Não foi possível consultar as recomendações. Tente novamente.';
      });
    } finally {
      if (mounted && request == requestId) setState(() => loading = false);
    }
  }

  String dateLabel(String value) {
    final date = DateTime.tryParse(value);
    return date == null
        ? value
        : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  Future<void> openInstitution(Map hospital) async {
    final address =
        '${hospital['nome']}, ${hospital['endereco']}, ${hospital['cidade']}, ${hospital['estado']}';
    try {
      final opened = await launchUrl(
        Uri.https('www.google.com', '/maps/search/', {
          'api': '1',
          'query': address,
        }),
        mode: LaunchMode.externalApplication,
      );
      if (!opened) throw StateError('Maps indisponível');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Não foi possível abrir o mapa. Consulte o endereço informado na instituição.',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = data;
    final eligibility = result?['elegibilidade'] as Map?;
    final reference = result?['referencia'] as Map?;
    final items = result?['itens'] as List? ?? [];
    const labels = {
      'CRITICO': 'Crítico',
      'BAIXO': 'Baixo',
      'ESTAVEL': 'Estável',
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Instituições que precisam de você',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            if (loading)
              Semantics(
                liveRegion: true,
                child: const Text(
                  'Consultando necessidades compatíveis com seu cadastro…',
                ),
              ),
            if (error != null) ...[
              Semantics(liveRegion: true, child: Text(error!)),
              if (!restricted)
                TextButton(
                  onPressed: load,
                  child: const Text('Tentar recomendações novamente'),
                ),
            ],
            if (result != null && eligibility != null && reference != null) ...[
              Text(
                'Tipo validado: ${result['tipoDoador']}. Referência do cadastro: ${reference['cidade']} / ${reference['estado']}.',
              ),
              const SizedBox(height: 8),
              const Text(
                'Ordem: necessidade mais urgente, seu tipo exato, sua cidade e seu estado. A distância, quando autorizada, desempata essas prioridades.',
              ),
              const SizedBox(height: 12),
              Text(
                eligibility['elegivel'] == true
                    ? 'Sua estimativa permite iniciar a jornada de doação.'
                    : eligibility['mensagem']?.toString() ??
                          'Consulte a equipe antes de doar.',
              ),
              Text(
                result['dataEstimadaElegibilidade'] == null
                    ? 'Não há uma data estimada de liberação. Consulte a equipe responsável.'
                    : 'Data estimada para doar: ${dateLabel(result['dataEstimadaElegibilidade'].toString())}.',
              ),
              if (eligibility['exigeAutorizacaoResponsavel'] == true)
                const Text(
                  'É necessária autorização do responsável para menores de 18 anos.',
                ),
              const SizedBox(height: 8),
              Text(result['orientacao']?.toString() ?? ''),
              if (items.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: Text(
                    'Nenhuma instituição cadastrada informou necessidade crítica, baixa ou estável compatível neste momento. Você pode explorar a busca pública abaixo.',
                  ),
                ),
              for (final rawItem in items.take(visibleCount))
                Builder(
                  builder: (context) {
                    final item = rawItem as Map;
                    final hospital = item['hospital'] as Map;
                    return Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(),
                          Text(
                            '${labels[item['nivel']] ?? item['nivel']} · precisa de ${item['tipoNecessitado']}',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            hospital['nome'].toString(),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            '${hospital['endereco']} · ${hospital['cidade']} / ${hospital['estado']}',
                          ),
                          if (hospital['horarioFuncionamento'] != null)
                            Text(
                              'Atendimento: ${hospital['horarioFuncionamento']}',
                            ),
                          Text(
                            item['atualizadoEm'] == null
                                ? 'Data de atualização não informada.'
                                : 'Necessidade atualizada em ${dateLabel(item['atualizadoEm'].toString())}.',
                          ),
                          if (item['distanciaKm'] != null)
                            Text(
                              'Distância aproximada em linha reta: ${item['distanciaKm']} km.',
                            ),
                          OutlinedButton.icon(
                            onPressed: () => openInstitution(hospital),
                            icon: const Icon(Icons.open_in_new),
                            label: const Text('Ver endereço no Google Maps'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              if (items.length > visibleCount)
                TextButton(
                  onPressed: () => setState(() => visibleCount += 6),
                  child: Text('Mostrar mais necessidades (${items.length - visibleCount} restantes)'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class LocationsPage extends StatefulWidget {
  final IbgeLocalities? localities;
  final ApiClient? api;
  final bool patient;
  const LocationsPage({
    super.key,
    this.localities,
    this.api,
    this.patient = false,
  });
  @override
  State<LocationsPage> createState() => _LocationsPageState();
}

class _LocationsPageState extends State<LocationsPage> {
  Position? position;
  String uf = '', city = '', message = '';
  bool locating = false, useGps = false;
  int locationRequestId = 0;
  _LocationSettingsTarget? settingsTarget;

  Future<void> locate() async {
    if (locating) return;
    final request = ++locationRequestId;
    setState(() {
      locating = true;
      position = null;
      useGps = false;
      message = '';
      settingsTarget = null;
    });
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!mounted || request != locationRequestId) return;
      if (!enabled) {
        setState(() {
          message =
              'Ative a localização do celular ou escolha estado e município.';
          settingsTarget = _LocationSettingsTarget.device;
        });
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (!mounted || request != locationRequestId) return;
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (!mounted || request != locationRequestId) return;
      if (permission == LocationPermission.deniedForever) {
        setState(() {
          message =
              'Permita a localização nas configurações do aplicativo ou use a busca manual.';
          settingsTarget = _LocationSettingsTarget.app;
        });
        return;
      }
      if (permission != LocationPermission.whileInUse &&
          permission != LocationPermission.always) {
        setState(
          () => message =
              'Localização não autorizada. A busca manual continua disponível.',
        );
        return;
      }
      final current = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (!mounted || request != locationRequestId) return;
      setState(() {
        position = current;
        useGps = true;
        message = 'Localização obtida. As buscas usarão sua região aproximada.';
      });
    } on TimeoutException {
      if (mounted && request == locationRequestId) {
        setState(
          () => message =
              'A localização demorou para responder. Tente novamente ou use a busca manual.',
        );
      }
    } on LocationServiceDisabledException {
      if (mounted && request == locationRequestId) {
        setState(() {
          message =
              'A localização do celular foi desativada. Use a busca manual ou ative-a nas configurações.';
          settingsTarget = _LocationSettingsTarget.device;
        });
      }
    } catch (_) {
      if (mounted && request == locationRequestId) {
        setState(
          () => message =
              'Não foi possível obter a localização. Tente novamente ou use a busca manual.',
        );
      }
    } finally {
      if (mounted) setState(() => locating = false);
    }
  }

  Future<void> openSettings() async {
    try {
      final opened = settingsTarget == _LocationSettingsTarget.app
          ? await Geolocator.openAppSettings()
          : await Geolocator.openLocationSettings();
      if (!opened && mounted) {
        setState(
          () => message =
              'Abra as configurações do celular para permitir a localização.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => message =
              'Abra as configurações do celular para permitir a localização.',
        );
      }
    }
  }

  Future<void> openMap(String service) async {
    final place = useGps && position != null
        ? '${position!.latitude.toStringAsFixed(2)},${position!.longitude.toStringAsFixed(2)}'
        : city.isNotEmpty
        ? '$city, $uf'
        : '';
    if (place.isEmpty) return;
    final url = Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': '$service em $place',
    });
    try {
      if (!await launchUrl(url, mode: LaunchMode.externalApplication) &&
          mounted) {
        setState(() => message = 'Não foi possível abrir o Maps.');
      }
    } catch (_) {
      if (mounted) setState(() => message = 'Não foi possível abrir o Maps.');
    }
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
          onPressed: () => setState(() {
            position = null;
            useGps = false;
            message =
                'Localização removida. Escolha estado e município para buscar.';
          }),
          child: const Text('Limpar localização'),
        ),
      const SizedBox(height: 16),
      Semantics(liveRegion: true, child: Text(message)),
      if (settingsTarget != null)
        TextButton(
          onPressed: openSettings,
          child: const Text('Abrir configurações'),
        ),
      if (widget.patient && widget.api != null) ...[
        const SizedBox(height: 20),
        _DonorRecommendations(
          api: widget.api!,
          position: useGps ? position : null,
        ),
      ],
      const SizedBox(height: 20),
      Text(
        'Ou escolha uma localidade',
        style: Theme.of(context).textTheme.titleMedium,
      ),
      const SizedBox(height: 16),
      LocalityPicker(
        localities: widget.localities,
        onChanged: (state, municipality) => setState(() {
          locationRequestId++;
          uf = state;
          city = municipality;
          useGps = false;
          message = municipality.isEmpty
              ? 'Selecione um município para buscar.'
              : 'Busca em $municipality ($state).';
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
                  onPressed:
                      !locating && (useGps ? position != null : city.isNotEmpty)
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
        'O GPS é opcional e consultado somente ao tocar no botão, sem acompanhamento contínuo. Uma posição aproximada é enviada ao HemoBridge para desempatar recomendações por distância, sem ser salva no cadastro. O Maps recebe a região aproximada somente quando você abre a busca. A busca externa não informa os níveis de necessidade cadastrados na plataforma.',
      ),
    ],
  );
}
