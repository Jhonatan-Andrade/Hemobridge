import 'package:flutter/material.dart';
import '../../core/api_client.dart';

class PatientPreTriageForm extends StatefulWidget {
  final ApiClient api;
  final ValueChanged<String> onComplete;
  const PatientPreTriageForm({
    super.key,
    required this.api,
    required this.onComplete,
  });
  @override
  State<PatientPreTriageForm> createState() => _PatientPreTriageFormState();
}

class _PatientPreTriageFormState extends State<PatientPreTriageForm> {
  final form = GlobalKey<FormState>();
  final weight = TextEditingController();
  late Future<dynamic> questionnaire = widget.api.request(
    '/paciente/pre-triagem',
  );
  bool? donated, before60, healthReview;
  DateTime? lastDonation;
  bool busy = false;
  String? error;
  Map<String, dynamic>? result;

  @override
  void dispose() {
    weight.dispose();
    super.dispose();
  }

  Future<void> submit(String version) async {
    if (busy || !form.currentState!.validate()) return;
    if (donated == true && lastDonation == null) {
      setState(() => error = 'Informe a data da última doação.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.api.request(
        '/paciente/pre-triagem',
        method: 'POST',
        body: {
          'versao': version,
          'pesoKg': double.parse(weight.text.replaceAll(',', '.')),
          'doouAntes': donated,
          if (donated == true) ...{
            'dataUltimaDoacao':
                '${lastDonation!.year}-${lastDonation!.month.toString().padLeft(2, '0')}-${lastDonation!.day.toString().padLeft(2, '0')}',
            'doouAntesDos60': before60,
          },
          'condicaoSaudeRequerAvaliacao': healthReview,
        },
      );
      if (mounted) {
        setState(() => result = Map<String, dynamic>.from(data as Map));
      }
    } catch (failure) {
      if (mounted) setState(() => error = failure.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget question(String label, bool? value, ValueChanged<bool?> change) =>
      DropdownButtonFormField<bool>(
        initialValue: value,
        isExpanded: true,
        decoration: InputDecoration(labelText: label),
        items: const [
          DropdownMenuItem(value: true, child: Text('Sim')),
          DropdownMenuItem(value: false, child: Text('Não')),
        ],
        onChanged: busy ? null : change,
        validator: (value) => value == null ? 'Selecione uma opção.' : null,
      );

  @override
  Widget build(BuildContext context) {
    if (result != null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Orientações antes da consulta',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          for (final text in (result!['orientacoes'] as List))
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(text as String),
            ),
          if (result!['proximaDataPossivel'] != null)
            Text(
              'Próxima data orientativa de doação: ${(result!['proximaDataPossivel'] as String).substring(0, 10).split('-').reversed.join('/')}',
            ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Esta orientação não substitui a avaliação médica nem a triagem presencial. Você pode prosseguir com a consulta mesmo durante o intervalo entre doações.',
            ),
          ),
          FilledButton(
            onPressed: () => widget.onComplete(result!['id'] as String),
            child: const Text('Continuar para os horários'),
          ),
        ],
      );
    }
    return FutureBuilder<dynamic>(
      future: questionnaire,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(snapshot.error.toString()),
                  OutlinedButton(
                    onPressed: () => setState(
                      () { questionnaire = widget.api.request('/paciente/pre-triagem'); },
                    ),
                    child: const Text('Tentar novamente'),
                  ),
                ],
              ),
            ),
          );
        }
        return Form(
          key: form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                'Pré-triagem',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              const Text(
                'Confirme estas informações antes de escolher o horário. As respostas ficam na área privada do seu atendimento.',
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: weight,
                enabled: !busy,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(labelText: 'Peso atual (kg)'),
                validator: (text) {
                  final value = double.tryParse(
                    (text ?? '').replaceAll(',', '.'),
                  );
                  return value == null || value < 1 || value > 400
                      ? 'Informe um peso válido.'
                      : null;
                },
              ),
              const SizedBox(height: 20),
              question(
                'Você já doou sangue?',
                donated,
                (value) => setState(() {
                  donated = value;
                  lastDonation = null;
                  before60 = null;
                }),
              ),
              if (donated == true) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy
                      ? null
                      : () async {
                          final now = DateTime.now();
                          final selected = await showDatePicker(
                            context: context,
                            initialDate: lastDonation ?? now,
                            firstDate: DateTime(1950),
                            lastDate: now,
                          );
                          if (mounted && selected != null) {
                            setState(() => lastDonation = selected);
                          }
                        },
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: Text(
                    lastDonation == null
                        ? 'Data da última doação'
                        : '${lastDonation!.day}/${lastDonation!.month}/${lastDonation!.year}',
                  ),
                ),
                const SizedBox(height: 16),
                question(
                  'Doou antes dos 60 anos?',
                  before60,
                  (value) => setState(() => before60 = value),
                ),
              ],
              const SizedBox(height: 20),
              const Text(
                'Há alguma condição de saúde, sintoma ou uso de medicamento que precisa ser avaliado? Se tiver dúvida, selecione Sim.',
              ),
              const SizedBox(height: 12),
              question(
                'Precisa de avaliação médica?',
                healthReview,
                (value) => setState(() => healthReview = value),
              ),
              const SizedBox(height: 20),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(error!),
                ),
              FilledButton(
                onPressed: busy
                    ? null
                    : () => submit(snapshot.data['versao'] as String),
                child: Text(busy ? 'Registrando…' : 'Registrar pré-triagem'),
              ),
            ],
          ),
        );
      },
    );
  }
}
