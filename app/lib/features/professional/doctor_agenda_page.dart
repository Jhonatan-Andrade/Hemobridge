import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import 'professional_widgets.dart';

class DoctorAgendaPage extends StatefulWidget {
  final ApiClient api;
  final Future<bool> Function(Uri)? openConsultation;
  const DoctorAgendaPage({super.key, required this.api, this.openConsultation});
  @override
  State<DoctorAgendaPage> createState() => _DoctorAgendaPageState();
}

class _DoctorAgendaPageState extends State<DoctorAgendaPage> {
  late Future<dynamic> future;
  List<dynamic> hospitals = [];
  List<dynamic> rows = [];
  String? hospitalId;
  String period = 'proximos';
  int page = 1, queryVersion = 0;
  bool hasMore = false, loadingMore = false;
  String? moreError;
  bool openingConsultation = false;
  @override
  void initState() {
    super.initState();
    future = loadFirst(++queryVersion);
  }

  @override
  void dispose() {
    queryVersion++;
    super.dispose();
  }

  String agendaPath(
    String hospital,
    String requestedPeriod,
    int requestedPage,
  ) {
    final query = Uri(
      queryParameters: {
        'hospitalId': hospital,
        'incluirRealizadas': 'true',
        'periodo': requestedPeriod,
        'pagina': '$requestedPage',
        'tamanhoPagina': '30',
      },
    ).query;
    return '/medico/agenda?$query';
  }

  Future<dynamic> loadFirst(int version) async {
    final requestedPeriod = period;
    final loaded = await widget.api.request('/medico/hospitais') as List;
    if (!mounted || version != queryVersion) return <dynamic>[];
    hospitals = loaded;
    if (!hospitals.any((h) => h['id'] == hospitalId)) {
      hospitalId = hospitals.isEmpty ? null : hospitals.first['id'] as String;
    }
    if (hospitalId == null) return <dynamic>[];
    final selectedHospital = hospitalId!;
    final result =
        await widget.api.request(
              agendaPath(selectedHospital, requestedPeriod, 1),
            )
            as List;
    if (!mounted || version != queryVersion) return <dynamic>[];
    rows = result;
    hasMore = result.length == 30;
    return result;
  }

  Future<void> reload() async {
    late final Future<dynamic> request;
    setState(() {
      queryVersion++;
      rows = [];
      page = 1;
      hasMore = false;
      loadingMore = false;
      moreError = null;
      request = loadFirst(queryVersion);
      future = request;
    });
    try {
      await request;
    } catch (_) {
      /* Displayed by FutureBuilder. */
    }
  }

  Future<void> loadMore() async {
    if (loadingMore || !hasMore || hospitalId == null) return;
    final version = queryVersion, nextPage = page + 1;
    final selectedHospital = hospitalId!, requestedPeriod = period;
    setState(() {
      loadingMore = true;
      moreError = null;
    });
    try {
      final result =
          await widget.api.request(
                agendaPath(selectedHospital, requestedPeriod, nextPage),
              )
              as List;
      if (!mounted || version != queryVersion) return;
      final existingIds = rows.map((row) => row['id']).toSet();
      setState(() {
        rows = [
          ...rows,
          ...result.where((row) => !existingIds.contains(row['id'])),
        ];
        page = nextPage;
        hasMore = result.length == 30;
      });
    } catch (error) {
      if (mounted && version == queryVersion) {
        setState(() => moreError = error.toString());
      }
    } finally {
      if (mounted && version == queryVersion) {
        setState(() => loadingMore = false);
      }
    }
  }

  Future<void> publish() async {
    final selected = hospitals.firstWhere((h) => h['id'] == hospitalId);
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => DoctorAvailabilityPage(
          api: widget.api,
          hospitalId: selected['id'] as String,
          hospitalName: selected['nome'] as String,
        ),
      ),
    );
    if (result == true && mounted) await reload();
  }

  Future<void> joinConsultation(Uri uri) async {
    if (openingConsultation) return;
    setState(() => openingConsultation = true);
    try {
      final opened =
          await (widget.openConsultation?.call(uri) ??
              launchUrl(uri, mode: LaunchMode.externalApplication));
      if (!opened && mounted) {
        showLaunchFailure();
      }
    } catch (_) {
      if (mounted) showLaunchFailure();
    } finally {
      if (mounted) setState(() => openingConsultation = false);
    }
  }

  void showLaunchFailure() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Não foi possível abrir a consulta. Verifique os aplicativos disponíveis e tente novamente.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
    future: future,
    builder: (context, snapshot) {
      final ready =
          snapshot.connectionState == ConnectionState.done &&
          !snapshot.hasError;
      return RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          key: ValueKey('$hospitalId-$period-$queryVersion'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Minha agenda',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 20),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'proximos', label: Text('Próximos')),
                ButtonSegment(value: 'historico', label: Text('Histórico')),
              ],
              selected: {period},
              showSelectedIcon: false,
              onSelectionChanged: (selection) {
                final value = selection.single;
                if (value == period) return;
                period = value;
                reload();
              },
            ),
            const SizedBox(height: 20),
            if (hospitals.isEmpty && ready)
              const Text('Nenhuma instituição ativa vinculada ao seu perfil.')
            else if (hospitals.isNotEmpty) ...[
              DropdownButtonFormField<String>(
                key: ValueKey(hospitalId),
                initialValue: hospitalId,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Instituição'),
                items: hospitals
                    .map(
                      (h) => DropdownMenuItem<String>(
                        value: h['id'] as String,
                        child: Text(
                          h['nome'] as String,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value == null || value == hospitalId) return;
                  hospitalId = value;
                  reload();
                },
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: ready ? publish : null,
                icon: const Icon(Icons.add),
                label: const Text('Publicar horário'),
              ),
              const SizedBox(height: 16),
            ],
            if (snapshot.connectionState != ConnectionState.done)
              const Center(child: CircularProgressIndicator())
            else if (snapshot.hasError) ...[
              ProfessionalFeedback(snapshot.error.toString()),
              OutlinedButton(
                onPressed: reload,
                child: const Text('Tentar novamente'),
              ),
            ] else ...[
              if (rows.isEmpty && hospitals.isNotEmpty)
                Text(
                  period == 'proximos'
                      ? 'Nenhum horário futuro nesta instituição.'
                      : 'Nenhum horário no histórico desta instituição.',
                ),
              for (final row in rows)
                ProfessionalCard(
                  children: [
                    Text(
                      professionalDate(row['inicio']),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text('Até ${professionalDate(row['fim'])}'),
                    const SizedBox(height: 12),
                    if ((row['consultas'] as List).isEmpty)
                      Text(
                        DateTime.tryParse(
                                  row['inicio'] as String,
                                )?.isAfter(DateTime.now()) ==
                                true
                            ? 'Horário disponível'
                            : 'Sem consulta agendada',
                      ),
                    for (final consultation in row['consultas'] as List) ...[
                      Text(
                        consultation['paciente']['usuario']['nome'] as String,
                      ),
                      Text(
                        professionalStatus(consultation['status'] as String),
                      ),
                      const SizedBox(height: 8),
                      if (consultation['status'] == 'AGENDADA' &&
                          safeConsultationUri(row['linkVideochamada']) != null)
                        FilledButton.icon(
                          onPressed: openingConsultation
                              ? null
                              : () => joinConsultation(
                                  safeConsultationUri(row['linkVideochamada'])!,
                                ),
                          icon: const Icon(Icons.videocam_outlined),
                          label: const Text('Entrar na consulta'),
                        ),
                      OutlinedButton(
                        onPressed: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => DoctorAttendancePage(
                                api: widget.api,
                                consultationId: consultation['id'] as String,
                                patientName:
                                    consultation['paciente']['usuario']['nome']
                                        as String,
                                initialStatus: consultation['status'] as String,
                              ),
                            ),
                          );
                          if (mounted) await reload();
                        },
                        child: Text(
                          consultation['status'] == 'REALIZADA'
                              ? 'Retomar atendimento'
                              : 'Abrir atendimento',
                        ),
                      ),
                      if (DateTime.tryParse(
                            row['inicio'] as String,
                          )?.isAfter(DateTime.now()) !=
                          false)
                        const Text(
                          'O atendimento poderá ser registrado a partir do início agendado.',
                        ),
                    ],
                  ],
                ),
              if (moreError != null) ProfessionalFeedback(moreError),
              if (hasMore) ...[
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: loadingMore ? null : loadMore,
                  child: Text(
                    loadingMore
                        ? 'Carregando…'
                        : moreError == null
                        ? 'Carregar mais'
                        : 'Tentar carregar mais novamente',
                  ),
                ),
              ],
            ],
          ],
        ),
      );
    },
  );
}

Uri? safeConsultationUri(dynamic value) {
  if (value is! String) return null;
  final uri = Uri.tryParse(value);
  return uri != null &&
          uri.scheme == 'https' &&
          uri.hasAuthority &&
          uri.host.isNotEmpty &&
          uri.userInfo.isEmpty
      ? uri
      : null;
}

String? validateAvailability(DateTime? start, DateTime? end, DateTime now) {
  if (start == null || end == null) {
    return 'Selecione o início e o fim do horário.';
  }
  if (!start.isAfter(now) ||
      !end.isAfter(start) ||
      end.difference(start) > const Duration(hours: 4)) {
    return 'Informe um período futuro de até quatro horas, com o fim após o início.';
  }
  return null;
}

class DoctorAvailabilityPage extends StatefulWidget {
  final ApiClient api;
  final String hospitalId;
  final String hospitalName;
  const DoctorAvailabilityPage({
    super.key,
    required this.api,
    required this.hospitalId,
    required this.hospitalName,
  });
  @override
  State<DoctorAvailabilityPage> createState() => _DoctorAvailabilityPageState();
}

class _DoctorAvailabilityPageState extends State<DoctorAvailabilityPage> {
  final form = GlobalKey<FormState>();
  final link = TextEditingController();
  DateTime? start, end;
  bool busy = false;
  String? feedback;
  @override
  void dispose() {
    link.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    final error = validateAvailability(start, end, DateTime.now());
    if (error != null) {
      setState(() => feedback = error);
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/medico/agenda',
        method: 'POST',
        body: {
          'hospitalId': widget.hospitalId,
          'inicio': start!.toUtc().toIso8601String(),
          'fim': end!.toUtc().toIso8601String(),
          'linkVideochamada': link.text.trim(),
        },
      );
      if (mounted) Navigator.of(context).pop(true);
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
        appBar: AppBar(title: const Text('Publicar horário')),
        body: Form(
          key: form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                widget.hospitalName,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              const Text(
                'Escolha um período de até quatro horas. As datas e horas são exibidas no fuso do aparelho.',
              ),
              ProfessionalDateField(
                label: 'Início',
                value: start,
                firstDate: now,
                lastDate: now.add(const Duration(days: 365)),
                enabled: !busy,
                onChanged: (v) => setState(() => start = v),
              ),
              ProfessionalDateField(
                label: 'Fim',
                value: end,
                firstDate: now,
                lastDate: now.add(const Duration(days: 365)),
                enabled: !busy,
                onChanged: (v) => setState(() => end = v),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: link,
                enabled: !busy,
                decoration: const InputDecoration(
                  labelText: 'Link de teleconsulta',
                  hintText: 'https://',
                ),
                keyboardType: TextInputType.url,
                autocorrect: false,
                validator: (value) {
                  final uri = Uri.tryParse(value?.trim() ?? '');
                  return uri == null ||
                          uri.scheme != 'https' ||
                          !uri.hasAuthority ||
                          uri.host.isEmpty
                      ? 'Informe um link seguro iniciado por https://.'
                      : null;
                },
              ),
              ProfessionalFeedback(feedback),
              FilledButton(
                onPressed: busy ? null : submit,
                child: Text(busy ? 'Publicando…' : 'Publicar horário'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DoctorAttendancePage extends StatefulWidget {
  final ApiClient api;
  final String consultationId;
  final String patientName;
  final String initialStatus;
  const DoctorAttendancePage({
    super.key,
    required this.api,
    required this.consultationId,
    required this.patientName,
    required this.initialStatus,
  });
  @override
  State<DoctorAttendancePage> createState() => _DoctorAttendancePageState();
}

class _DoctorAttendancePageState extends State<DoctorAttendancePage> {
  final form = GlobalKey<FormState>();
  final exams = TextEditingController();
  final instructions = TextEditingController();
  final observations = TextEditingController();
  final reason = TextEditingController();
  late String status;
  bool busy = false, loading = true;
  Map<String, dynamic>? details;
  String? feedback, loadError;
  bool get canAttend => details?['podeAtender'] == true;
  bool get canCancel => details?['podeCancelar'] == true;
  int? get patientAge {
    final birth = DateTime.tryParse(
      details?['paciente']?['dataNascimento'] as String? ?? '',
    );
    if (birth == null) return null;
    final now = DateTime.now();
    return now.year -
        birth.year -
        (now.month < birth.month ||
                (now.month == birth.month && now.day < birth.day)
            ? 1
            : 0);
  }

  @override
  void initState() {
    super.initState();
    status = widget.initialStatus;
    loadDetails();
  }

  Future<void> loadDetails() async {
    setState(() {
      loading = true;
      loadError = null;
    });
    try {
      final result =
          await widget.api.request('/medico/consultas/${widget.consultationId}')
              as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        details = result;
        status = result['status'] as String;
        observations.text = result['observacoes'] as String? ?? '';
      });
    } catch (error) {
      if (mounted) setState(() => loadError = error.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    exams.dispose();
    instructions.dispose();
    observations.dispose();
    reason.dispose();
    super.dispose();
  }

  Future<bool> confirm(String title, String message) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Voltar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirmar registro'),
            ),
          ],
        ),
      ) ==
      true;

  Future<void> record(String decision, {bool reject = false}) async {
    if (busy || loading || !canAttend) return;
    if (reject && reason.text.trim().length < 5) {
      setState(
        () => feedback =
            'Informe o motivo da inaptidão com ao menos cinco caracteres.',
      );
      return;
    }
    if (!await confirm(
          reject
              ? 'Confirmar inaptidão'
              : decision == 'REALIZADA'
              ? 'Confirmar atendimento'
              : 'Confirmar ausência',
          'Paciente: ${widget.patientName}. Confirme o registro. O paciente receberá uma notificação.',
        ) ||
        !mounted) {
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/medico/consultas/${widget.consultationId}',
        method: 'PATCH',
        body: {
          'status': decision,
          if (decision == 'REALIZADA') 'observacoes': observations.text.trim(),
          if (reject) 'decisao': 'REPROVAR',
          if (reject) 'motivoReprovacao': reason.text.trim(),
        },
      );
      if (!mounted) return;
      await loadDetails();
      if (mounted) {
        setState(
          () =>
              feedback = 'Atendimento registrado. O paciente será notificado.',
        );
      }
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancelConsultation() async {
    if (busy || loading || !canCancel) return;
    if (reason.text.trim().length < 5) {
      setState(
        () => feedback =
            'Informe o motivo do cancelamento com ao menos cinco caracteres.',
      );
      return;
    }
    if (!await confirm(
          'Cancelar consulta',
          'O horário será retirado da agenda e o paciente receberá uma orientação para novo agendamento.',
        ) ||
        !mounted) {
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/medico/consultas/${widget.consultationId}/cancelar',
        method: 'POST',
        body: {'motivo': reason.text.trim()},
      );
      if (!mounted) return;
      await loadDetails();
      if (mounted) {
        setState(
          () => feedback = 'Consulta cancelada. O paciente será notificado.',
        );
      }
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> requestExams() async {
    if (busy ||
        !canAttend ||
        status != 'REALIZADA' ||
        !form.currentState!.validate()) {
      return;
    }
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/medico/consultas/${widget.consultationId}/solicitar-exames',
        method: 'POST',
        body: {
          'exames': exams.text
              .split('\n')
              .map((e) => e.trim())
              .where((e) => e.isNotEmpty)
              .toList(),
          'orientacoes': instructions.text.trim(),
        },
      );
      if (mounted) {
        exams.clear();
        instructions.clear();
        setState(
          () => feedback =
              'Solicitação enviada ao paciente. Acompanhe os resultados em Exames.',
        );
      }
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Atendimento')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            widget.patientName,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(professionalStatus(status)),
          const SizedBox(height: 20),
          if (loading)
            const Center(child: CircularProgressIndicator())
          else if (loadError != null) ...[
            ProfessionalFeedback(loadError),
            OutlinedButton(
              onPressed: loadDetails,
              child: const Text('Tentar novamente'),
            ),
          ] else ...[
            if (details?['paciente'] != null) ...[
              if (patientAge != null) Text('Idade: $patientAge anos'),
              Text('Peso cadastrado: ${details!['paciente']['pesoKg']} kg'),
              Text(
                'Sexo: ${details!['paciente']['sexo'] == 'FEMININO' ? 'Feminino' : 'Masculino'}',
              ),
            ],
            if (details?['preTriagem'] != null)
              ExpansionTile(
                title: const Text('Respostas da pré-triagem'),
                children: [
                  for (final answer
                      in details!['preTriagem']['respostas'] as List)
                    ListTile(
                      title: Text(answer['pergunta'] as String),
                      subtitle: Text(
                        answer['resposta'] == 'true'
                            ? 'Sim'
                            : answer['resposta'] == 'false'
                            ? 'Não'
                            : answer['resposta'] as String,
                      ),
                    ),
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Orientação registrada. A decisão clínica é do médico.',
                    ),
                  ),
                ],
              ),
            if (details?['cicloAtual'] == false)
              const Text(
                'Atendimento histórico. As alterações pertencem à consulta atual.',
              ),
            if (details?['motivoReprovacao'] != null)
              Text('Motivo da inaptidão: ${details!['motivoReprovacao']}'),
            if (canCancel) ...[
              const Text(
                'A consulta ainda não começou. É possível cancelar e orientar novo agendamento.',
              ),
              TextFormField(
                key: const ValueKey('cancellation-reason'),
                controller: reason,
                enabled: !busy,
                maxLength: 500,
                decoration: const InputDecoration(
                  labelText: 'Motivo do cancelamento',
                ),
                minLines: 2,
                maxLines: 4,
              ),
              OutlinedButton(
                onPressed: busy ? null : cancelConsultation,
                child: const Text('Cancelar consulta e avisar paciente'),
              ),
            ],
            if (canAttend) ...[
              TextFormField(
                key: const ValueKey('attendance-observations'),
                controller: observations,
                enabled: !busy,
                maxLength: 10000,
                decoration: const InputDecoration(
                  labelText: 'Observações do atendimento',
                ),
                minLines: 3,
                maxLines: 6,
              ),
              FilledButton(
                onPressed: busy ? null : () => record('REALIZADA'),
                child: Text(
                  status == 'REALIZADA'
                      ? 'Salvar observações'
                      : 'Registrar como realizado',
                ),
              ),
              if (status == 'AGENDADA')
                OutlinedButton(
                  onPressed: busy ? null : () => record('NAO_COMPARECEU'),
                  child: const Text('Registrar ausência'),
                ),
              const SizedBox(height: 16),
              ExpansionTile(
                title: const Text('Registrar inaptidão para doação'),
                children: [
                  TextFormField(
                    key: const ValueKey('rejection-reason'),
                    controller: reason,
                    enabled: !busy,
                    maxLength: 2000,
                    decoration: const InputDecoration(
                      labelText: 'Motivo da inaptidão',
                    ),
                    minLines: 2,
                    maxLines: 5,
                  ),
                  OutlinedButton(
                    onPressed: busy
                        ? null
                        : () => record('REALIZADA', reject: true),
                    child: const Text('Confirmar inaptidão e avisar paciente'),
                  ),
                ],
              ),
              if (status == 'REALIZADA')
                Form(
                  key: form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Solicitar exames',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const ValueKey('requested-exams'),
                        controller: exams,
                        enabled: !busy,
                        decoration: const InputDecoration(
                          labelText: 'Exames (um por linha)',
                        ),
                        minLines: 3,
                        maxLines: 6,
                        maxLength: 1000,
                        validator: (value) {
                          final list = (value ?? '')
                              .split('\n')
                              .map((e) => e.trim())
                              .where((e) => e.isNotEmpty)
                              .toList();
                          return list.isEmpty ||
                                  list.length > 20 ||
                                  list.any((e) => e.length > 200)
                              ? 'Informe de 1 a 20 exames, com até 200 caracteres por linha.'
                              : null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const ValueKey('exam-instructions'),
                        controller: instructions,
                        enabled: !busy,
                        decoration: const InputDecoration(
                          labelText: 'Orientações ao paciente',
                        ),
                        minLines: 3,
                        maxLines: 6,
                        maxLength: 2000,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: busy ? null : requestExams,
                        child: Text(busy ? 'Salvando…' : 'Enviar solicitação'),
                      ),
                    ],
                  ),
                ),
            ],
          ],
          ProfessionalFeedback(feedback),
        ],
      ),
    ),
  );
}
