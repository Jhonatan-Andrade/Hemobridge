import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../core/private_file_page.dart';
import 'patient_service.dart';

typedef PatientExamPicker = Future<XFile?> Function();

class PatientWorkspace extends StatefulWidget {
  final ApiClient api;
  final bool examsOnly;
  const PatientWorkspace({
    super.key,
    required this.api,
    this.examsOnly = false,
  });
  @override
  State<PatientWorkspace> createState() => _PatientWorkspaceState();
}

class _PatientWorkspaceState extends State<PatientWorkspace> {
  late final PatientService service = PatientService(widget.api);
  late Future<Map<String, dynamic>> profile = service.profile();

  Future<void> reload() async {
    setState(() {
      profile = service.profile();
    });
    try {
      await profile;
    } catch (_) {
      /* A tela apresenta a falha e a opção de tentar novamente. */
    }
  }

  Future<void> open(Widget page) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => page));
    if (mounted) await reload();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.examsOnly) {
      return PatientExamsPage(api: widget.api, embedded: true);
    }
    return FutureBuilder<Map<String, dynamic>>(
      future: profile,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return PatientFailure(error: snapshot.error!, retry: reload);
        }
        final data = snapshot.data!;
        return RefreshIndicator(
          onRefresh: reload,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                'Meu painel',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text('Olá, ${data['name'] ?? 'Paciente/Doador'}'),
              const SizedBox(height: 16),
              Card(
                color: petrol,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Sua situação',
                        style: TextStyle(color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        patientStatus(data['status'] as String),
                        style: Theme.of(
                          context,
                        ).textTheme.titleLarge?.copyWith(color: Colors.white),
                      ),
                      if (data['bloodType'] != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          'Tipo sanguíneo validado: ${data['bloodType']}',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Acompanhe suas consultas e envie os resultados solicitados na área privada. A aptidão para doar depende da avaliação profissional e da triagem do serviço de hemoterapia.',
              ),
              const SizedBox(height: 20),
              if (data['status'] == 'PRE_CADASTRADO') ...[
                FilledButton.icon(
                  onPressed: () => open(PatientBookingPage(api: widget.api)),
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('Agendar consulta'),
                ),
                const SizedBox(height: 12),
              ],
              OutlinedButton.icon(
                onPressed: () => open(PatientAppointmentsPage(api: widget.api)),
                icon: const Icon(Icons.calendar_month_outlined),
                label: const Text('Minhas consultas'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => open(PatientExamsPage(api: widget.api)),
                icon: const Icon(Icons.science_outlined),
                label: const Text('Meus exames'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class PatientAppointmentsPage extends StatefulWidget {
  final ApiClient api;
  const PatientAppointmentsPage({super.key, required this.api});
  @override
  State<PatientAppointmentsPage> createState() =>
      _PatientAppointmentsPageState();
}

class _PatientAppointmentsPageState extends State<PatientAppointmentsPage> {
  late final PatientService service = PatientService(widget.api);
  late Future<List<PatientAppointment>> appointments = service.appointments();
  bool busy = false;
  String? message;

  Future<void> reload() async {
    setState(() {
      appointments = service.appointments();
    });
    try {
      await appointments;
    } catch (_) {
      /* A falha é apresentada pelo FutureBuilder. */
    }
  }

  Future<void> cancel(PatientAppointment appointment) async {
    final answer = await showDialog<String>(
      context: context,
      builder: (context) => _CancelAppointmentDialog(appointment: appointment),
    );
    if (answer == null || !mounted || busy) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await service.cancel(appointment, answer);
      if (mounted) {
        setState(() => message = 'Consulta cancelada. O horário foi liberado.');
      }
    } catch (error) {
      if (mounted) setState(() => message = error.toString());
    } finally {
      if (mounted) {
        setState(() => busy = false);
        await reload();
      }
    }
  }

  Future<void> reschedule(PatientAppointment appointment) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) =>
            PatientBookingPage(api: widget.api, appointment: appointment),
      ),
    );
    if (!mounted) return;
    if (result == true) {
      setState(() => message = 'Consulta reagendada. Confira o novo horário.');
    }
    await reload();
  }

  Future<void> join(String value) async {
    final uri = Uri.tryParse(value);
    if (uri == null || uri.scheme != 'https' || !uri.hasAuthority) {
      setState(
        () => message = 'O endereço do atendimento não está disponível.',
      );
      return;
    }
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
          mounted) {
        setState(
          () => message =
              'Não foi possível abrir o atendimento neste dispositivo.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => message =
              'Não foi possível abrir o atendimento neste dispositivo.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Minhas consultas')),
    body: FutureBuilder<List<PatientAppointment>>(
      future: appointments,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return PatientFailure(error: snapshot.error!, retry: reload);
        }
        final rows = snapshot.data!;
        return RefreshIndicator(
          onRefresh: reload,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Os horários são exibidos no fuso do seu dispositivo. Cancelamento e reagendamento exigem pelo menos 24 horas de antecedência.',
              ),
              if (message != null) PatientMessage(message!),
              if (rows.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text('Nenhuma consulta registrada.'),
                ),
              for (final appointment in rows)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          patientDate(appointment.start),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text('${appointment.doctor}\n${appointment.hospital}'),
                        const SizedBox(height: 8),
                        Text(patientStatus(appointment.status)),
                        if (appointment.cancellationReason?.isNotEmpty == true)
                          Text(appointment.cancellationReason!),
                        if (appointment.videoUrl != null) ...[
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: () => join(appointment.videoUrl!),
                            icon: const Icon(Icons.videocam_outlined),
                            label: const Text('Abrir consulta'),
                          ),
                        ] else if (appointment.status == 'AGENDADA') ...[
                          const SizedBox(height: 12),
                          const Text(
                            'O acesso ao atendimento é liberado 15 minutos antes do início.',
                          ),
                        ],
                        if (appointment.canChange) ...[
                          const SizedBox(height: 16),
                          OutlinedButton(
                            onPressed: busy
                                ? null
                                : () => reschedule(appointment),
                            child: const Text('Reagendar consulta'),
                          ),
                          TextButton(
                            onPressed: busy ? null : () => cancel(appointment),
                            child: const Text('Cancelar consulta'),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    ),
  );
}

class PatientBookingPage extends StatefulWidget {
  final ApiClient api;
  final PatientAppointment? appointment;
  const PatientBookingPage({super.key, required this.api, this.appointment});
  @override
  State<PatientBookingPage> createState() => _PatientBookingPageState();
}

class _PatientBookingPageState extends State<PatientBookingPage> {
  late final PatientService service = PatientService(widget.api);
  late Future<List<AvailableAppointment>> slots = service
      .availableAppointments();
  String? selected, message;
  bool consent = false, busy = false;
  bool get rescheduling => widget.appointment != null;

  Future<void> reload() async {
    setState(() {
      selected = null;
      slots = service.availableAppointments();
    });
    try {
      await slots;
    } catch (_) {
      /* A falha é apresentada pelo FutureBuilder. */
    }
  }

  Future<void> submit() async {
    if (busy || selected == null || (!rescheduling && !consent)) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      if (rescheduling) {
        await service.reschedule(widget.appointment!, selected!);
      } else {
        await service.book(selected!, consent: consent);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() => message = error.toString());
        // Uma reserva concorrente exige que a pessoa escolha outro horário.
        if (error is ApiException &&
            (error.status == 409 || error.status == 422)) {
          await reload();
        }
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void showAttendanceTerms() => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Atendimento por telessaúde',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            const Text(
              'A consulta é realizada à distância por profissional autorizado. Utilize um ambiente reservado e uma conexão adequada. Dados de saúde e documentos devem ser compartilhados somente nas áreas privadas. O profissional poderá orientar atendimento presencial ou exames complementares quando necessário. A consulta não substitui a triagem presencial do serviço de hemoterapia nem garante aptidão para doar. Em uma urgência de saúde, procure um serviço de emergência.',
            ),
            const SizedBox(height: 16),
            const Text(
              'Ao confirmar, você concorda com esta modalidade e com o tratamento dos dados necessários ao atendimento, respeitadas as obrigações legais de guarda e a proteção das informações clínicas. A sua escolha será registrada no agendamento.',
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Entendi'),
            ),
          ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(rescheduling ? 'Reagendar consulta' : 'Agendar consulta'),
    ),
    body: FutureBuilder<List<AvailableAppointment>>(
      future: slots,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return PatientFailure(error: snapshot.error!, retry: reload);
        }
        final rows = snapshot.data!;
        return RefreshIndicator(
          onRefresh: reload,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                rescheduling
                    ? 'Escolha o novo horário. A reserva anterior só será liberada após a confirmação.'
                    : 'Escolha um horário publicado pela equipe para iniciar sua avaliação.',
              ),
              const SizedBox(height: 8),
              const Text(
                'Horários no fuso do dispositivo. Disponibilidade nos próximos 30 dias.',
              ),
              if (message != null) PatientMessage(message!),
              const SizedBox(height: 16),
              if (rows.isEmpty) ...[
                const Text(
                  'Nenhum horário disponível no período. Consulte novamente mais tarde.',
                ),
                OutlinedButton(
                  onPressed: busy ? null : reload,
                  child: const Text('Atualizar horários'),
                ),
              ] else ...[
                for (final slot in rows)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            checked: selected == slot.id,
                            button: true,
                            label:
                                'Selecionar ${patientDate(slot.start)}, ${slot.doctor}, ${slot.hospital}',
                            child: IconButton(
                              onPressed: busy
                                  ? null
                                  : () => setState(() => selected = slot.id),
                              icon: Icon(
                                selected == slot.id
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_off,
                                color: brand,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  patientDate(slot.start),
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 6),
                                Text('${slot.doctor}\n${slot.hospital}'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                if (!rescheduling) ...[
                  TextButton(
                    onPressed: showAttendanceTerms,
                    child: const Text('Ler termos do atendimento'),
                  ),
                  CheckboxListTile(
                    value: consent,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    onChanged: busy
                        ? null
                        : (value) => setState(() => consent = value == true),
                    title: const Text(
                      'Concordo com o atendimento por telessaúde e com o tratamento dos dados necessários à consulta, conforme os termos apresentados.',
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed:
                      busy || selected == null || (!rescheduling && !consent)
                      ? null
                      : submit,
                  child: Text(
                    busy
                        ? 'Confirmando…'
                        : rescheduling
                        ? 'Confirmar reagendamento'
                        : 'Confirmar agendamento',
                  ),
                ),
              ],
            ],
          ),
        );
      },
    ),
  );
}

class PatientExamsPage extends StatefulWidget {
  final ApiClient api;
  final bool embedded;
  final PatientExamPicker? pickExam;
  const PatientExamsPage({
    super.key,
    required this.api,
    this.embedded = false,
    this.pickExam,
  });
  @override
  State<PatientExamsPage> createState() => _PatientExamsPageState();
}

class _PatientExamsPageState extends State<PatientExamsPage> {
  late final PatientService service = PatientService(widget.api);
  late Future<List<PatientExamRequest>> exams = service.exams();
  bool busy = false;
  String? message;

  Future<void> reload() async {
    setState(() {
      exams = service.exams();
    });
    try {
      await exams;
    } catch (_) {
      /* A falha é apresentada pelo FutureBuilder. */
    }
  }

  Future<void> upload(PatientExamRequest exam) async {
    if (busy || !exam.canUpload) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      final file =
          await (widget.pickExam?.call() ??
              openFile(
                acceptedTypeGroups: const [
                  XTypeGroup(
                    label: 'Resultados de exames',
                    extensions: ['pdf', 'jpg', 'jpeg', 'png'],
                    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
                    uniformTypeIdentifiers: [
                      'com.adobe.pdf',
                      'public.jpeg',
                      'public.png',
                    ],
                  ),
                ],
              ));
      if (file == null || !mounted) return;
      final length = await file.length();
      if (length == 0 || length > maxExamBytes) {
        throw ApiException(invalidExamMessage, 0);
      }
      final bytes = await file.readAsBytes();
      validateExamFile(file.name, bytes);
      if (!mounted) return;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Enviar resultado?'),
          content: SingleChildScrollView(
            child: Text(
              '${file.name}\n\nSolicitação: ${exam.exams.join(', ')}\n${exam.doctor}\n\nO arquivo será compartilhado na área privada para avaliação. Confira se corresponde ao exame solicitado.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Voltar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirmar envio'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      await service.upload(exam, file.name, bytes);
      if (mounted) {
        setState(() => message = 'Resultado enviado para análise.');
        await reload();
      }
    } catch (error) {
      if (mounted) {
        setState(() => message = error.toString());
        if (error is ApiException && error.status == 409) await reload();
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = FutureBuilder<List<PatientExamRequest>>(
      future: exams,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return PatientFailure(error: snapshot.error!, retry: reload);
        }
        final rows = snapshot.data!;
        return RefreshIndicator(
          onRefresh: reload,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            children: [
              if (widget.embedded)
                Text(
                  'Meus exames',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              const Text(
                'Veja as solicitações da equipe e acompanhe os resultados na área privada.',
              ),
              if (message != null) PatientMessage(message!),
              if (rows.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text('Nenhum exame solicitado até o momento.'),
                ),
              for (final exam in rows)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          exam.exams.join(', '),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text('${exam.doctor}\n${patientStatus(exam.status)}'),
                        if (exam.instructions?.isNotEmpty == true) ...[
                          const SizedBox(height: 12),
                          Text(exam.instructions!),
                        ],
                        if (exam.rejectionReason?.isNotEmpty == true)
                          PatientMessage(exam.rejectionReason!),
                        if (exam.submissions.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          const Text('Histórico de envios'),
                          for (final submission in exam.submissions)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(submission.filename),
                                  Text(patientStatus(submission.status)),
                                  if (submission.rejectionReason?.isNotEmpty ==
                                      true)
                                    Text(submission.rejectionReason!),
                                  TextButton.icon(
                                    onPressed: busy
                                        ? null
                                        : () => Navigator.of(context).push(
                                            MaterialPageRoute<void>(
                                              builder: (_) => PrivateFilePage(
                                                api: widget.api,
                                                path:
                                                    '/paciente/exames/envios/${Uri.encodeComponent(submission.id)}/arquivo',
                                                title: submission.filename,
                                              ),
                                            ),
                                          ),
                                    icon: const Icon(Icons.visibility_outlined),
                                    label: const Text('Abrir arquivo privado'),
                                  ),
                                ],
                              ),
                            ),
                        ],
                        if (exam.canUpload) ...[
                          const SizedBox(height: 16),
                          const Text(
                            'PDF, JPG ou PNG, até 5 MB. Envie apenas o resultado solicitado.',
                          ),
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: busy ? null : () => upload(exam),
                            icon: const Icon(Icons.upload_file),
                            label: Text(
                              busy
                                  ? 'Aguarde…'
                                  : exam.status == 'REPROVADO'
                                  ? 'Enviar novo resultado'
                                  : 'Enviar resultado',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
    return widget.embedded
        ? body
        : Scaffold(
            appBar: AppBar(title: const Text('Meus exames')),
            body: body,
          );
  }
}

class PatientMessage extends StatelessWidget {
  final String message;
  const PatientMessage(this.message, {super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(message, style: const TextStyle(fontWeight: FontWeight.w500)),
    ),
  );
}

class _CancelAppointmentDialog extends StatefulWidget {
  final PatientAppointment appointment;
  const _CancelAppointmentDialog({required this.appointment});
  @override
  State<_CancelAppointmentDialog> createState() =>
      _CancelAppointmentDialogState();
}

class _CancelAppointmentDialogState extends State<_CancelAppointmentDialog> {
  final reason = TextEditingController();
  @override
  void dispose() {
    reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Cancelar consulta?'),
    content: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${patientDate(widget.appointment.start)}\n${widget.appointment.doctor}\n${widget.appointment.hospital}',
          ),
          const SizedBox(height: 16),
          const Text(
            'O horário será liberado para outra pessoa. Alterações exigem pelo menos 24 horas de antecedência.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: reason,
            maxLength: 500,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Motivo (opcional)'),
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Manter consulta'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(context, reason.text),
        child: const Text('Confirmar cancelamento'),
      ),
    ],
  );
}

class PatientFailure extends StatelessWidget {
  final Object error;
  final Future<void> Function() retry;
  const PatientFailure({super.key, required this.error, required this.retry});
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      PatientMessage(error.toString()),
      OutlinedButton(onPressed: retry, child: const Text('Tentar novamente')),
    ],
  );
}
