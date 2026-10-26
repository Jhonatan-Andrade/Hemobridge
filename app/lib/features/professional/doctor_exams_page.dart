import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/private_file_page.dart';
import 'professional_widgets.dart';

class DoctorExamsPage extends StatefulWidget {
  final ApiClient api;
  const DoctorExamsPage({super.key, required this.api});
  @override
  State<DoctorExamsPage> createState() => _DoctorExamsPageState();
}

class _DoctorExamsPageState extends State<DoctorExamsPage> {
  late Future<dynamic> future;
  @override
  void initState() {
    super.initState();
    future = widget.api.request('/medico/exames');
  }

  Future<void> reload() async {
    final request = widget.api.request('/medico/exames');
    setState(() {
      future = request;
    });
    try {
      await request;
    } catch (_) {
      /* Displayed by FutureBuilder. */
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
      final rows = snapshot.data as List;
      return RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Exames dos atendimentos',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            if (rows.isEmpty)
              const Text('Nenhuma solicitação de exame registrada.'),
            for (final row in rows)
              ProfessionalCard(
                children: [
                  Text(
                    row['consulta']['paciente']['usuario']['nome'] as String,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(row['descricao'] as String),
                  if ((row['exames'] as List).isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 16),
                      child: Text('Aguardando o envio do paciente.'),
                    ),
                  for (final exam in row['exames'] as List) ...[
                    const Divider(height: 32),
                    Text(exam['nomeOriginal'] as String),
                    Text(professionalStatus(exam['situacao'] as String)),
                    Text('Enviado em ${professionalDate(exam['enviadoEm'])}'),
                    if (exam['avaliadoEm'] != null)
                      Text(
                        'Avaliado em ${professionalDate(exam['avaliadoEm'])}',
                      ),
                    if (exam['motivoReprovacao'] != null)
                      Text('Orientação: ${exam['motivoReprovacao']}'),
                    OutlinedButton.icon(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => PrivateFilePage(
                            api: widget.api,
                            path: '/medico/exames/${exam['id']}/arquivo',
                            title: exam['nomeOriginal'] as String,
                          ),
                        ),
                      ),
                      icon: const Icon(Icons.description_outlined),
                      label: const Text('Abrir resultado privado'),
                    ),
                    if (exam['podeAvaliar'] == true &&
                        exam['situacao'] == 'EM_ANALISE')
                      FilledButton(
                        onPressed: () async {
                          final result = await Navigator.of(context).push<bool>(
                            MaterialPageRoute(
                              builder: (_) => DoctorExamReviewPage(
                                api: widget.api,
                                exam: Map<String, dynamic>.from(exam as Map),
                              ),
                            ),
                          );
                          if (result == true && mounted) await reload();
                        },
                        child: const Text('Avaliar resultado'),
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

class DoctorExamReviewPage extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> exam;
  const DoctorExamReviewPage({
    super.key,
    required this.api,
    required this.exam,
  });
  @override
  State<DoctorExamReviewPage> createState() => _DoctorExamReviewPageState();
}

class _DoctorExamReviewPageState extends State<DoctorExamReviewPage> {
  final reason = TextEditingController();
  final form = GlobalKey<FormState>();
  String? decision;
  int? bloodType;
  List<dynamic> types = [];
  bool typesLoading = true, confirmed = false, busy = false, stale = false;
  String? typesError, feedback;
  bool get allowed =>
      widget.exam['podeAvaliar'] == true &&
      widget.exam['situacao'] == 'EM_ANALISE' &&
      !stale;
  bool get canSubmit =>
      allowed &&
      !busy &&
      confirmed &&
      decision != null &&
      (decision == 'VALIDADO'
          ? bloodType != null && !typesLoading && typesError == null
          : reason.text.trim().length >= 5);
  @override
  void initState() {
    super.initState();
    loadTypes();
  }

  @override
  void dispose() {
    reason.dispose();
    super.dispose();
  }

  Future<void> loadTypes() async {
    setState(() {
      typesLoading = true;
      typesError = null;
    });
    try {
      final result = await widget.api.request('/tipos-sanguineos') as List;
      if (mounted) setState(() => types = result);
    } catch (error) {
      if (mounted) setState(() => typesError = error.toString());
    } finally {
      if (mounted) setState(() => typesLoading = false);
    }
  }

  Future<void> submit() async {
    if (!canSubmit || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/medico/exames/${widget.exam['id']}/avaliacao',
        method: 'PATCH',
        body: {
          'situacao': decision,
          if (decision == 'VALIDADO') 'tipoSanguineoId': bloodType,
          if (decision == 'REPROVADO') 'motivoReprovacao': reason.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Avaliação registrada. A situação do paciente será atualizada conforme os exames.',
            ),
          ),
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
      appBar: AppBar(title: const Text('Avaliar resultado')),
      body: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              widget.exam['nomeOriginal']?.toString() ?? 'Resultado de exame',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            const Text(
              'Abra o arquivo e confira o resultado antes de registrar sua avaliação. A conclusão do cadastro depende de todos os exames solicitados.',
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: busy
                  ? null
                  : () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PrivateFilePage(
                          api: widget.api,
                          path: '/medico/exames/${widget.exam['id']}/arquivo',
                          title:
                              widget.exam['nomeOriginal']?.toString() ??
                              'Resultado de exame',
                        ),
                      ),
                    ),
              icon: const Icon(Icons.description_outlined),
              label: const Text('Abrir resultado privado'),
            ),
            if (!allowed) ...[
              const SizedBox(height: 16),
              const Text(
                'Este resultado não está disponível para avaliação. Volte e atualize a lista de exames.',
              ),
              OutlinedButton(
                onPressed: busy ? null : () => Navigator.of(context).pop(true),
                child: const Text('Voltar e atualizar exames'),
              ),
            ] else ...[
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                initialValue: decision,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Decisão'),
                items: const [
                  DropdownMenuItem(
                    value: 'VALIDADO',
                    child: Text('Validar resultado'),
                  ),
                  DropdownMenuItem(
                    value: 'REPROVADO',
                    child: Text('Solicitar novo envio'),
                  ),
                ],
                onChanged: busy
                    ? null
                    : (value) => setState(() {
                        decision = value;
                        confirmed = false;
                      }),
              ),
              if (decision == 'VALIDADO') ...[
                const SizedBox(height: 16),
                if (typesLoading) const LinearProgressIndicator(),
                if (typesError != null) ...[
                  ProfessionalFeedback(typesError),
                  OutlinedButton(
                    onPressed: busy ? null : loadTypes,
                    child: const Text('Tentar carregar tipos novamente'),
                  ),
                ],
                DropdownButtonFormField<int>(
                  key: ValueKey('blood-$typesLoading-${types.length}'),
                  initialValue: bloodType,
                  decoration: const InputDecoration(
                    labelText: 'Tipo sanguíneo confirmado',
                  ),
                  items: types
                      .map(
                        (type) => DropdownMenuItem<int>(
                          value: type['id'] as int,
                          child: Text(type['sigla'] as String),
                        ),
                      )
                      .toList(),
                  onChanged: busy || typesLoading || typesError != null
                      ? null
                      : (value) => setState(() {
                          bloodType = value;
                          confirmed = false;
                        }),
                ),
              ],
              if (decision == 'REPROVADO') ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: reason,
                  enabled: !busy,
                  decoration: const InputDecoration(
                    labelText: 'Motivo e orientação para novo envio',
                  ),
                  minLines: 3,
                  maxLines: 6,
                  maxLength: 1000,
                  onChanged: (_) => setState(() => confirmed = false),
                  validator: (value) => (value?.trim().length ?? 0) < 5
                      ? 'Explique o motivo com pelo menos cinco caracteres.'
                      : null,
                ),
              ],
              const SizedBox(height: 16),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: confirmed,
                onChanged: busy
                    ? null
                    : (value) => setState(() => confirmed = value == true),
                title: const Text(
                  'Revisei o resultado e confirmo a decisão e os dados informados.',
                ),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: canSubmit ? submit : null,
                child: Text(
                  busy ? 'Salvando avaliação…' : 'Confirmar avaliação',
                ),
              ),
            ],
            ProfessionalFeedback(feedback),
          ],
        ),
      ),
    ),
  );
}
