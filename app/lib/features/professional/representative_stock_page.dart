import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import 'professional_widgets.dart';

const stockTransitions = <String, List<String>>{
  'QUARENTENA': ['DISPONIVEL', 'DESCARTADA'],
  'DISPONIVEL': ['RESERVADA', 'DESCARTADA'],
  'RESERVADA': ['DISPONIVEL', 'UTILIZADA', 'DESCARTADA'],
};

class RepresentativeStockPage extends StatefulWidget {
  final ApiClient api;
  const RepresentativeStockPage({super.key, required this.api});
  @override
  State<RepresentativeStockPage> createState() =>
      _RepresentativeStockPageState();
}

class _RepresentativeStockPageState extends State<RepresentativeStockPage> {
  late Future<dynamic> future;
  @override
  void initState() {
    super.initState();
    future = widget.api.request('/representante/estoque');
  }

  Future<void> reload() async {
    final request = widget.api.request('/representante/estoque');
    setState(() {
      future = request;
    });
    try {
      await request;
    } catch (_) {
      /* Displayed by FutureBuilder. */
    }
  }

  Future<void> open(Widget page) async {
    final changed = await Navigator.of(
      context,
    ).push<bool>(MaterialPageRoute(builder: (_) => page));
    if (changed == true && mounted) await reload();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }
      if (snapshot.hasError) {
        return ProfessionalFailure(error: snapshot.error!, retry: reload);
      }
      final rows = snapshot.data as List;
      return RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Estoque de bolsas',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => open(StockRegistrationPage(api: widget.api)),
              icon: const Icon(Icons.add),
              label: const Text('Registrar bolsa'),
            ),
            const SizedBox(height: 16),
            if (rows.isEmpty) const Text('Nenhuma bolsa registrada.'),
            for (final bag in rows)
              ProfessionalCard(
                children: [
                  Text(
                    '${bag['codigo']} · ${bag['tipoSanguineo']['sigla']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(bag['componente'] as String),
                  Text(professionalStatus(bag['status'] as String)),
                  Text('Validade: ${professionalDate(bag['validadeEm'])}'),
                  if (stockTransitions.containsKey(bag['status'])) ...[
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => open(
                        StockMovementPage(
                          api: widget.api,
                          bag: Map<String, dynamic>.from(bag as Map),
                        ),
                      ),
                      child: const Text('Movimentar bolsa'),
                    ),
                  ],
                ],
              ),
          ],
        ),
      );
    },
  );
}

class StockRegistrationPage extends StatefulWidget {
  final ApiClient api;
  const StockRegistrationPage({super.key, required this.api});
  @override
  State<StockRegistrationPage> createState() => _StockRegistrationPageState();
}

class _StockRegistrationPageState extends State<StockRegistrationPage> {
  final form = GlobalKey<FormState>();
  final code = TextEditingController(), component = TextEditingController();
  List<dynamic> types = [];
  int? bloodType;
  DateTime? collection, expiration;
  bool loading = true, busy = false, confirmed = false;
  String? typesError, feedback;
  @override
  void initState() {
    super.initState();
    loadTypes();
  }

  @override
  void dispose() {
    code.dispose();
    component.dispose();
    super.dispose();
  }

  Future<void> loadTypes() async {
    setState(() {
      loading = true;
      typesError = null;
    });
    try {
      final rows = await widget.api.request('/tipos-sanguineos') as List;
      if (mounted) {
        setState(() {
          types = rows;
          if (!types.any((t) => t['id'] == bloodType)) bloodType = null;
        });
      }
    } catch (error) {
      if (mounted) setState(() => typesError = error.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> submit() async {
    if (busy ||
        loading ||
        typesError != null ||
        !confirmed ||
        !form.currentState!.validate()) {
      return;
    }
    if (collection == null ||
        expiration == null ||
        collection!.isAfter(DateTime.now()) ||
        !expiration!.isAfter(collection!)) {
      setState(
        () => feedback =
            'Selecione uma coleta que já ocorreu e uma validade posterior à coleta.',
      );
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/representante/estoque',
        method: 'POST',
        body: {
          'codigo': code.text.trim(),
          'componente': component.text.trim(),
          'tipoSanguineoId': bloodType,
          'coletadaEm': collection!.toUtc().toIso8601String(),
          'validadeEm': expiration!.toUtc().toIso8601String(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bolsa registrada em quarentena.')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return PopScope(
      canPop: !busy,
      child: Scaffold(
        appBar: AppBar(title: const Text('Registrar bolsa')),
        body: Form(
          key: form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'O registro inicial entra em quarentena. A liberação técnica deve ser registrada separadamente.',
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: code,
                enabled: !busy,
                decoration: const InputDecoration(
                  labelText: 'Código rastreável',
                ),
                maxLength: 100,
                onChanged: (_) => setState(() => confirmed = false),
                validator: (v) => (v?.trim().isEmpty ?? true)
                    ? 'Informe o código da bolsa.'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: component,
                enabled: !busy,
                decoration: const InputDecoration(labelText: 'Hemocomponente'),
                maxLength: 80,
                onChanged: (_) => setState(() => confirmed = false),
                validator: (v) => (v?.trim().length ?? 0) < 3
                    ? 'Informe o hemocomponente.'
                    : null,
              ),
              const SizedBox(height: 16),
              if (loading) const LinearProgressIndicator(),
              if (typesError != null) ...[
                ProfessionalFeedback(typesError),
                OutlinedButton(
                  onPressed: busy ? null : loadTypes,
                  child: const Text('Tentar carregar tipos novamente'),
                ),
              ],
              DropdownButtonFormField<int>(
                key: ValueKey('type-$loading-${types.length}'),
                initialValue: bloodType,
                decoration: const InputDecoration(labelText: 'Tipo sanguíneo'),
                items: types
                    .map(
                      (t) => DropdownMenuItem<int>(
                        value: t['id'] as int,
                        child: Text(t['sigla'] as String),
                      ),
                    )
                    .toList(),
                onChanged: busy || loading || typesError != null
                    ? null
                    : (v) => setState(() {
                        bloodType = v;
                        confirmed = false;
                      }),
                validator: (v) =>
                    v == null ? 'Selecione o tipo sanguíneo.' : null,
              ),
              ProfessionalDateField(
                label: 'Coleta',
                value: collection,
                firstDate: now.subtract(const Duration(days: 365)),
                lastDate: now,
                enabled: !busy,
                onChanged: (v) => setState(() {
                  collection = v;
                  confirmed = false;
                }),
              ),
              ProfessionalDateField(
                label: 'Validade',
                value: expiration,
                firstDate: now.subtract(const Duration(days: 365)),
                lastDate: now.add(const Duration(days: 730)),
                enabled: !busy,
                onChanged: (v) => setState(() {
                  expiration = v;
                  confirmed = false;
                }),
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: confirmed,
                onChanged: busy
                    ? null
                    : (v) => setState(() => confirmed = v == true),
                title: const Text(
                  'Conferi a identificação, o tipo sanguíneo e as datas da bolsa.',
                ),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              ProfessionalFeedback(feedback),
              FilledButton(
                onPressed: busy || loading || typesError != null || !confirmed
                    ? null
                    : submit,
                child: Text(busy ? 'Registrando…' : 'Registrar em quarentena'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class StockMovementPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> bag;
  const StockMovementPage({super.key, required this.api, required this.bag});
  @override
  State<StockMovementPage> createState() => _StockMovementPageState();
}

class _StockMovementPageState extends State<StockMovementPage> {
  final form = GlobalKey<FormState>();
  final reason = TextEditingController(), reference = TextEditingController();
  String? status, feedback;
  bool confirmed = false, busy = false, stale = false;
  List<String> get transitions => stockTransitions[widget.bag['status']] ?? [];
  bool get needsReference =>
      widget.bag['status'] == 'QUARENTENA' && status == 'DISPONIVEL';
  @override
  void dispose() {
    reason.dispose();
    reference.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy ||
        stale ||
        !confirmed ||
        !transitions.contains(status) ||
        !form.currentState!.validate()) {
      return;
    }
    final expiry = DateTime.tryParse(
      widget.bag['validadeEm']?.toString() ?? '',
    );
    if ((status == 'DISPONIVEL' || status == 'RESERVADA') &&
        (expiry == null || !expiry.isAfter(DateTime.now()))) {
      setState(
        () => feedback =
            'Uma bolsa vencida não pode ser disponibilizada ou reservada.',
      );
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/representante/estoque/${widget.bag['id']}',
        method: 'PATCH',
        body: {
          'anterior': widget.bag['status'],
          'status': status,
          'motivo': reason.text.trim(),
          if (needsReference) 'liberacaoReferencia': reference.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Movimentação registrada.')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          feedback = error.toString();
          if (error is ApiException && [403, 404, 409].contains(error.status)) {
            stale = true;
          }
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Movimentar bolsa')),
      body: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              widget.bag['codigo'] as String,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              'Estado atual: ${professionalStatus(widget.bag['status'] as String)}',
            ),
            Text('Validade: ${professionalDate(widget.bag['validadeEm'])}'),
            const SizedBox(height: 20),
            if (transitions.isEmpty || stale) ...[
              const Text(
                'Esta bolsa não está disponível para movimentação nesta tela. Atualize o estoque antes de continuar.',
              ),
              OutlinedButton(
                onPressed: busy ? null : () => Navigator.of(context).pop(true),
                child: const Text('Voltar e atualizar estoque'),
              ),
            ] else ...[
              DropdownButtonFormField<String>(
                initialValue: status,
                decoration: const InputDecoration(labelText: 'Novo estado'),
                items: transitions
                    .map(
                      (s) => DropdownMenuItem(
                        value: s,
                        child: Text(professionalStatus(s)),
                      ),
                    )
                    .toList(),
                onChanged: busy
                    ? null
                    : (v) => setState(() {
                        status = v;
                        confirmed = false;
                      }),
                validator: (v) => v == null ? 'Selecione o novo estado.' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: reason,
                enabled: !busy,
                decoration: const InputDecoration(
                  labelText: 'Motivo da movimentação',
                ),
                minLines: 2,
                maxLines: 4,
                maxLength: 500,
                onChanged: (_) => setState(() => confirmed = false),
                validator: (v) => (v?.trim().length ?? 0) < 5
                    ? 'Informe um motivo com pelo menos cinco caracteres.'
                    : null,
              ),
              if (needsReference) ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: reference,
                  enabled: !busy,
                  decoration: const InputDecoration(
                    labelText: 'Referência da liberação técnica',
                  ),
                  maxLength: 200,
                  onChanged: (_) => setState(() => confirmed = false),
                  validator: (v) => (v?.trim().length ?? 0) < 3
                      ? 'Informe a referência da liberação técnica.'
                      : null,
                ),
              ],
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: confirmed,
                onChanged: busy
                    ? null
                    : (v) => setState(() => confirmed = v == true),
                title: const Text(
                  'Conferi a bolsa e confirmo a movimentação informada.',
                ),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              FilledButton(
                onPressed: busy || !confirmed || status == null ? null : submit,
                child: Text(busy ? 'Registrando…' : 'Confirmar movimentação'),
              ),
            ],
            ProfessionalFeedback(feedback),
          ],
        ),
      ),
    ),
  );
}
