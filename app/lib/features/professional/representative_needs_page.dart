import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import 'professional_widgets.dart';

class RepresentativeNeedsPage extends StatefulWidget {
  final ApiClient api;
  const RepresentativeNeedsPage({super.key, required this.api});
  @override
  State<RepresentativeNeedsPage> createState() =>
      _RepresentativeNeedsPageState();
}

class _RepresentativeNeedsPageState extends State<RepresentativeNeedsPage> {
  late Future<dynamic> future;
  final Map<String, String> changes = {};
  bool busy = false, confirmed = false;
  String? feedback;
  @override
  void initState() {
    super.initState();
    future = widget.api.request('/representante/necessidades');
  }

  Future<void> reload() async {
    if (busy) return;
    final request = widget.api.request('/representante/necessidades');
    setState(() {
      future = request;
      changes.clear();
      confirmed = false;
    });
    try {
      await request;
    } catch (_) {
      /* Displayed by FutureBuilder. */
    }
  }

  Future<void> save() async {
    if (busy || changes.isEmpty || !confirmed) return;
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/representante/necessidades',
        method: 'PUT',
        body: {
          'niveis': changes.entries
              .map((e) => {'tipo': e.key, 'nivel': e.value})
              .toList(),
        },
      );
      if (mounted) {
        setState(() {
          busy = false;
          feedback = 'Necessidades atualizadas.';
        });
        await reload();
      }
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
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
      final data = snapshot.data as Map;
      return RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Necessidades da instituição',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Text(
              data['hospital']['nome'] as String,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'Informe os níveis confirmados pela instituição para cada tipo sanguíneo.',
            ),
            for (final need in data['necessidades'] as List)
              ProfessionalCard(
                children: [
                  Text(
                    need['tipo'] as String,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    key: ValueKey(
                      '${need['tipo']}-${changes[need['tipo']] ?? need['nivel']}',
                    ),
                    initialValue:
                        changes[need['tipo']] ?? need['nivel'] as String,
                    decoration: InputDecoration(
                      labelText: 'Nível ${need['tipo']}',
                    ),
                    items: [
                      if (need['nivel'] == 'NAO_INFORMADO')
                        const DropdownMenuItem(
                          value: 'NAO_INFORMADO',
                          enabled: false,
                          child: Text('Não informado'),
                        ),
                      for (final level in [
                        'CRITICO',
                        'BAIXO',
                        'ESTAVEL',
                        'ADEQUADO',
                      ])
                        DropdownMenuItem(
                          value: level,
                          child: Text(professionalStatus(level)),
                        ),
                    ],
                    onChanged: busy
                        ? null
                        : (value) {
                            if (value == null) return;
                            setState(() {
                              if (value == need['nivel']) {
                                changes.remove(need['tipo']);
                              } else {
                                changes[need['tipo'] as String] = value;
                              }
                              confirmed = false;
                            });
                          },
                  ),
                  if (need['atualizadoEm'] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        'Atualizado em ${professionalDate(need['atualizadoEm'])}',
                      ),
                    ),
                ],
              ),
            if (changes.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Alterações: ${changes.entries.map((e) => '${e.key}: ${professionalStatus(e.value)}').join('; ')}.',
              ),
            ],
            const SizedBox(height: 16),
            const Text(
              'Níveis críticos podem gerar avisos para doadores compatíveis e elegíveis. Confira os dados antes de confirmar.',
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: confirmed,
              onChanged: busy || changes.isEmpty
                  ? null
                  : (v) => setState(() => confirmed = v == true),
              title: const Text(
                'Conferi os níveis com a instituição e confirmo a atualização.',
              ),
              controlAffinity: ListTileControlAffinity.leading,
            ),
            ProfessionalFeedback(feedback),
            FilledButton(
              onPressed: busy || changes.isEmpty || !confirmed ? null : save,
              child: Text(busy ? 'Atualizando…' : 'Confirmar atualização'),
            ),
          ],
        ),
      );
    },
  );
}
