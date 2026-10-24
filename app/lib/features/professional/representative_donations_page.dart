import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api_client.dart';
import 'professional_widgets.dart';

class RepresentativeDonationsPage extends StatefulWidget {
  final ApiClient api;
  const RepresentativeDonationsPage({super.key, required this.api});
  @override
  State<RepresentativeDonationsPage> createState() =>
      _RepresentativeDonationsPageState();
}

class _RepresentativeDonationsPageState
    extends State<RepresentativeDonationsPage> {
  final cpf = TextEditingController();
  final weight = TextEditingController();
  final formKey = GlobalKey<FormState>();
  bool anonymous = false,
      busy = false,
      guardian = false,
      beforeSixty = false,
      confirmed = false;
  DateTime collection = DateUtils.dateOnly(DateTime.now());
  DateTime? from, until;
  String? bloodType, feedback, searchMessage;
  Map<String, dynamic>? donor;
  int page = 1;
  late Future<dynamic> history;
  static const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  String iso(DateTime value) =>
      '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
  String dateLabel(String value) {
    final parts = value.split('-');
    return parts.length == 3 ? '${parts[2]}/${parts[1]}/${parts[0]}' : value;
  }

  Future<dynamic> getHistory() => widget.api.request(
    '/representante/doacoes?${Uri(queryParameters: {'pagina': '$page', 'tamanhoPagina': '10', if (from != null) 'de': iso(from!), if (until != null) 'ate': iso(until!)}).query}',
  );
  @override
  void initState() {
    super.initState();
    history = getHistory();
  }

  @override
  void dispose() {
    cpf.dispose();
    weight.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    final next = getHistory();
    setState(() {
      history = next;
    });
    try {
      await next;
    } catch (_) {
      /* Presented by the history builder. */
    }
  }

  void resetConfirmations() {
    guardian = false;
    beforeSixty = false;
    confirmed = false;
  }

  void selectMode(bool value) {
    if (busy) return;
    setState(() {
      anonymous = value;
      feedback = null;
      resetConfirmations();
    });
  }

  Future<void> lookup() async {
    if (busy) return;
    final digits = cpf.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 11) {
      setState(() => feedback = 'Informe um CPF com 11 dígitos.');
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
      donor = null;
      searchMessage = null;
      resetConfirmations();
    });
    try {
      final result =
          await widget.api.request(
                '/representante/doacoes/buscar-doador',
                method: 'POST',
                body: {'cpf': digits},
              )
              as Map;
      if (!mounted) return;
      setState(() {
        if (result['encontrado'] == true) {
          donor = Map<String, dynamic>.from(result['doador'] as Map);
        } else {
          searchMessage = result['mensagem'] as String;
        }
      });
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> save() async {
    if (busy ||
        !confirmed ||
        (!anonymous && donor == null) ||
        !(formKey.currentState?.validate() ?? false)) {
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      final result =
          await widget.api.request(
                '/representante/doacoes${anonymous ? '/avulsa' : ''}',
                method: 'POST',
                body: anonymous
                    ? {'dataColeta': iso(collection), 'tipo': bloodType}
                    : {
                        'pacienteId': donor!['id'],
                        'dataColeta': iso(collection),
                        'pesoAferido': double.parse(
                          weight.text.replaceAll(',', '.'),
                        ),
                        'autorizacaoResponsavelConfirmada': guardian,
                        'doouAntesDos60Confirmado': beforeSixty,
                      },
              )
              as Map;
      if (!mounted) return;
      setState(() {
        feedback =
            '${result['mensagem']}\n${(result['avisos'] as List).join('\n')}';
        donor = null;
        searchMessage = null;
        bloodType = null;
        page = 1;
        cpf.clear();
        weight.clear();
        resetConfirmations();
        history = getHistory();
      });
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> chooseDate(
    String label,
    DateTime? value,
    ValueChanged<DateTime> selected,
  ) async {
    final today = DateUtils.dateOnly(DateTime.now());
    final date = await showDatePicker(
      context: context,
      helpText: label,
      initialDate: value ?? today,
      firstDate: DateTime(1900),
      lastDate: today,
    );
    if (date != null && mounted) setState(() => selected(date));
  }

  Widget dateButton(
    String label,
    DateTime? value,
    ValueChanged<DateTime> selected,
  ) => OutlinedButton.icon(
    onPressed: busy ? null : () => chooseDate(label, value, selected),
    icon: const Icon(Icons.calendar_today_outlined),
    label: Align(
      alignment: Alignment.centerLeft,
      child: Text(
        '$label: ${value == null ? 'Selecionar' : dateLabel(iso(value))}',
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: reload,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Doações da instituição',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 12),
        const Text(
          'Identifique o doador aprovado e confira os dados aferidos na triagem antes de registrar a coleta.',
        ),
        ProfessionalCard(
          children: [
            Text(
              'Registrar doação',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Doador cadastrado'),
                  selected: !anonymous,
                  onSelected: busy ? null : (_) => selectMode(false),
                ),
                ChoiceChip(
                  label: const Text('Doação avulsa'),
                  selected: anonymous,
                  onSelected: busy ? null : (_) => selectMode(true),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (!anonymous) ...[
              TextField(
                controller: cpf,
                enabled: !busy,
                keyboardType: TextInputType.number,
                maxLength: 11,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'CPF apresentado na triagem',
                ),
                onChanged: (_) => setState(() {
                  donor = null;
                  searchMessage = null;
                  weight.clear();
                  resetConfirmations();
                }),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: busy ? null : lookup,
                child: const Text('Localizar doador'),
              ),
              if (searchMessage != null) ...[
                ProfessionalFeedback(searchMessage),
                TextButton(
                  onPressed: busy ? null : () => selectMode(true),
                  child: const Text('Escolher registro avulso'),
                ),
              ],
              if (donor != null) ...[
                const SizedBox(height: 16),
                Text(
                  donor!['nome'] as String,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  'Tipo sanguíneo validado: ${donor!['tipo']}. Confira a identidade do doador.',
                ),
              ],
            ] else
              const Text(
                'Registro sem vínculo com cadastro, para fins estatísticos. A elegibilidade e a tipagem são responsabilidade da triagem do hemocentro. Para um doador identificado e aprovado, use “Doador cadastrado”.',
              ),
            if (anonymous || donor != null)
              Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 16),
                    dateButton('Data da coleta', collection, (date) {
                      collection = date;
                      confirmed = false;
                    }),
                    const SizedBox(height: 12),
                    if (anonymous)
                      DropdownButtonFormField<String>(
                        key: ValueKey(bloodType),
                        initialValue: bloodType,
                        decoration: const InputDecoration(
                          labelText: 'Tipo sanguíneo conferido na triagem',
                        ),
                        items: bloodTypes
                            .map(
                              (type) => DropdownMenuItem(
                                value: type,
                                child: Text(type),
                              ),
                            )
                            .toList(),
                        onChanged: busy
                            ? null
                            : (value) => setState(() {
                                bloodType = value;
                                confirmed = false;
                              }),
                        validator: (value) => value == null
                            ? 'Selecione o tipo conferido na triagem.'
                            : null,
                      )
                    else ...[
                      TextFormField(
                        controller: weight,
                        enabled: !busy,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Peso aferido na triagem (kg)',
                        ),
                        onChanged: (_) => setState(() => confirmed = false),
                        validator: (value) {
                          final measured = double.tryParse(
                            (value ?? '').replaceAll(',', '.'),
                          );
                          if (measured == null ||
                              !measured.isFinite ||
                              measured < 1 ||
                              measured > 400 ||
                              !RegExp(
                                r'^\d+([.,]\d{1,2})?$',
                              ).hasMatch(value ?? '')) {
                            return 'Informe o peso, com até duas casas decimais.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Para menores de 18 anos, confirme a autorização formal. Para pessoas de 61 a 69 anos, a triagem pode confirmar doação antes dos 60 quando não houver esse histórico na plataforma.',
                      ),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: guardian,
                        onChanged: busy
                            ? null
                            : (value) => setState(() {
                                guardian = value == true;
                                confirmed = false;
                              }),
                        title: const Text(
                          'Quando aplicável: a autorização formal do responsável foi apresentada na triagem.',
                        ),
                      ),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: beforeSixty,
                        onChanged: busy
                            ? null
                            : (value) => setState(() {
                                beforeSixty = value == true;
                                confirmed = false;
                              }),
                        title: const Text(
                          'Quando aplicável: a triagem confirmou que o doador já doou antes dos 60 anos.',
                        ),
                      ),
                    ],
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      value: confirmed,
                      onChanged: busy
                          ? null
                          : (value) =>
                                setState(() => confirmed = value == true),
                      title: const Text(
                        'Conferi os dados e a triagem clínica e confirmo o registro desta coleta.',
                      ),
                    ),
                    FilledButton(
                      onPressed: busy || !confirmed ? null : save,
                      child: Text(
                        busy ? 'Registrando…' : 'Confirmar registro de doação',
                      ),
                    ),
                  ],
                ),
              ),
            ProfessionalFeedback(feedback),
            const SizedBox(height: 12),
            const Text(
              'O registro preserva o histórico e não altera automaticamente os níveis de necessidade ou o estoque de bolsas.',
            ),
          ],
        ),
        ProfessionalCard(
          children: [
            Text(
              'Histórico de coletas',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            dateButton('A partir de', from, (date) => from = date),
            dateButton('Até', until, (date) => until = date),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: busy
                      ? null
                      : () {
                          if (from != null &&
                              until != null &&
                              from!.isAfter(until!)) {
                            setState(
                              () => feedback =
                                  'A data inicial deve ser anterior à data final.',
                            );
                            return;
                          }
                          setState(() {
                            page = 1;
                            history = getHistory();
                          });
                        },
                  child: const Text('Filtrar histórico'),
                ),
                TextButton(
                  onPressed: busy
                      ? null
                      : () => setState(() {
                          from = null;
                          until = null;
                          page = 1;
                          history = getHistory();
                        }),
                  child: const Text('Limpar filtros'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FutureBuilder<dynamic>(
              future: history,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ProfessionalFeedback(snapshot.error.toString()),
                      OutlinedButton(
                        onPressed: reload,
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  );
                }
                final data = snapshot.data as Map;
                final items = data['itens'] as List;
                final total = data['total'] as int;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('$total registro(s) no período.'),
                    if (items.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text('Nenhuma coleta encontrada neste período.'),
                      ),
                    for (final item in items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['avulsa'] == true
                                  ? 'Doação avulsa'
                                  : item['doador'] as String,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            Text(
                              'Coleta: ${dateLabel(item['dataColeta'] as String)} · Tipo: ${item['tipo']}',
                            ),
                            if (item['pesoAferido'] != null)
                              Text('Peso aferido: ${item['pesoAferido']} kg'),
                            Text('Registrado por ${item['registradoPor']}.'),
                            const Divider(),
                          ],
                        ),
                      ),
                    Text('Página $page', textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        OutlinedButton(
                          onPressed: page <= 1
                              ? null
                              : () => setState(() {
                                  page--;
                                  history = getHistory();
                                }),
                          child: const Text('Anterior'),
                        ),
                        OutlinedButton(
                          onPressed: page * 10 >= total
                              ? null
                              : () => setState(() {
                                  page++;
                                  history = getHistory();
                                }),
                          child: const Text('Próxima'),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ],
    ),
  );
}
