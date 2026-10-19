import 'package:flutter/material.dart';

String professionalDate(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return 'Data não informada';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year} ${two(date.hour)}:${two(date.minute)}';
}

String professionalStatus(String value) => switch (value) {
  'AGENDADA' => 'Agendada',
  'REALIZADA' => 'Realizada',
  'NAO_COMPARECEU' => 'Ausência registrada',
  'EM_ANALISE' => 'Em análise',
  'VALIDADO' => 'Validado',
  'REPROVADO' => 'Novo envio necessário',
  'CRITICO' => 'Crítico',
  'BAIXO' => 'Baixo',
  'ESTAVEL' => 'Estável',
  'ADEQUADO' => 'Adequado',
  'QUARENTENA' => 'Quarentena',
  'DISPONIVEL' => 'Disponível',
  'RESERVADA' => 'Reservada',
  'UTILIZADA' => 'Utilizada',
  'DESCARTADA' => 'Descartada',
  _ => 'Não informado',
};

class ProfessionalFailure extends StatelessWidget {
  final Object error;
  final VoidCallback retry;
  const ProfessionalFailure({
    super.key,
    required this.error,
    required this.retry,
  });
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Semantics(liveRegion: true, child: Text(error.toString())),
      const SizedBox(height: 16),
      OutlinedButton(onPressed: retry, child: const Text('Tentar novamente')),
    ],
  );
}

class ProfessionalCard extends StatelessWidget {
  final List<Widget> children;
  const ProfessionalCard({super.key, required this.children});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    ),
  );
}

class ProfessionalFeedback extends StatelessWidget {
  final String? message;
  const ProfessionalFeedback(this.message, {super.key});
  @override
  Widget build(BuildContext context) => message == null
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Semantics(liveRegion: true, child: Text(message!)),
        );
}

class ProfessionalDateField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final DateTime firstDate;
  final DateTime lastDate;
  final bool enabled;
  final ValueChanged<DateTime> onChanged;
  const ProfessionalDateField({
    super.key,
    required this.label,
    required this.value,
    required this.firstDate,
    required this.lastDate,
    required this.onChanged,
    this.enabled = true,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: OutlinedButton.icon(
      icon: const Icon(Icons.calendar_today_outlined),
      label: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          '$label: ${value == null ? 'Selecionar data e hora' : professionalDate(value!.toIso8601String())}',
        ),
      ),
      onPressed: !enabled
          ? null
          : () async {
              final candidate = value ?? DateTime.now();
              final initial = candidate.isBefore(firstDate)
                  ? firstDate
                  : candidate.isAfter(lastDate)
                  ? lastDate
                  : candidate;
              final date = await showDatePicker(
                context: context,
                initialDate: initial,
                firstDate: firstDate,
                lastDate: lastDate,
                helpText: label,
              );
              if (date == null || !context.mounted) return;
              final time = await showTimePicker(
                context: context,
                initialTime: TimeOfDay.fromDateTime(candidate),
                helpText: label,
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(alwaysUse24HourFormat: true),
                  child: child!,
                ),
              );
              if (time != null) {
                onChanged(
                  DateTime(
                    date.year,
                    date.month,
                    date.day,
                    time.hour,
                    time.minute,
                  ),
                );
              }
            },
    ),
  );
}
