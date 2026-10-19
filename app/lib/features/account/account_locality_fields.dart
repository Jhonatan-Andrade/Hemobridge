import 'package:flutter/material.dart';
import '../locations/ibge_localities.dart';

class AccountLocalityFields extends StatefulWidget {
  final IbgeLocalities? localities;
  final String initialState, initialCity;
  final bool enabled;
  final void Function(String state, String city) onChanged;
  const AccountLocalityFields({
    super.key,
    this.localities,
    this.initialState = '',
    this.initialCity = '',
    this.enabled = true,
    required this.onChanged,
  });

  @override
  State<AccountLocalityFields> createState() => _AccountLocalityFieldsState();
}

class _AccountLocalityFieldsState extends State<AccountLocalityFields> {
  late final service = widget.localities ?? IbgeLocalities();
  List<IbgeState> states = [];
  List<IbgeMunicipality> cities = [];
  String? state, city, stateError, cityError;
  bool loadingStates = true, loadingCities = false;
  int generation = 0;

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
      final result = await service.loadStates();
      if (!mounted) return;
      setState(() {
        states = result;
        loadingStates = false;
      });
      if (state == null &&
          result.any((value) => value.abbreviation == widget.initialState)) {
        await selectState(widget.initialState, initialCity: widget.initialCity);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          loadingStates = false;
          stateError = 'Não foi possível carregar os estados do IBGE.';
        });
      }
    }
  }

  Future<void> selectState(String? value, {String initialCity = ''}) async {
    if (value == null) return;
    final current = ++generation;
    setState(() {
      state = value;
      city = null;
      cities = [];
      cityError = null;
      loadingCities = true;
    });
    widget.onChanged(value, '');
    try {
      final result = await service.loadMunicipalities(value);
      if (!mounted || current != generation) return;
      final selected = result.any((item) => item.name == initialCity)
          ? initialCity
          : null;
      setState(() {
        cities = result;
        city = selected;
        loadingCities = false;
      });
      widget.onChanged(value, selected ?? '');
    } catch (_) {
      if (mounted && current == generation) {
        setState(() {
          loadingCities = false;
          cityError = 'Não foi possível carregar os municípios deste estado.';
        });
      }
    }
  }

  @override
  void dispose() {
    generation++;
    if (widget.localities == null) service.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      DropdownButtonFormField<String>(
        key: ValueKey('account-state-$state'),
        initialValue: state,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: loadingStates ? 'Carregando estados…' : 'Estado',
        ),
        hint: const Text('Selecione o estado'),
        items: states
            .map(
              (item) => DropdownMenuItem(
                value: item.abbreviation,
                child: Text(
                  '${item.name} (${item.abbreviation})',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
            .toList(),
        onChanged: !widget.enabled || loadingStates || states.isEmpty
            ? null
            : selectState,
        validator: (_) => state == null ? 'Selecione o estado.' : null,
      ),
      if (stateError != null) ...[
        Semantics(liveRegion: true, child: Text(stateError!)),
        TextButton(
          onPressed: loadStates,
          child: const Text('Recarregar estados'),
        ),
      ],
      const SizedBox(height: 18),
      DropdownButtonFormField<String>(
        key: ValueKey('account-city-$state-$city'),
        initialValue: city,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: loadingCities ? 'Carregando municípios…' : 'Município',
        ),
        hint: Text(
          state == null ? 'Escolha primeiro o estado' : 'Selecione o município',
        ),
        items: cities
            .map(
              (item) => DropdownMenuItem(
                value: item.name,
                child: Text(item.name, overflow: TextOverflow.ellipsis),
              ),
            )
            .toList(),
        onChanged: !widget.enabled || loadingCities || cities.isEmpty
            ? null
            : (value) {
                setState(() => city = value);
                widget.onChanged(state!, value ?? '');
              },
        validator: (_) => city == null || loadingCities
            ? 'Selecione um município do estado escolhido.'
            : null,
      ),
      if (cityError != null) ...[
        Semantics(liveRegion: true, child: Text(cityError!)),
        TextButton(
          onPressed: () => selectState(state),
          child: const Text('Recarregar municípios'),
        ),
      ],
    ],
  );
}
