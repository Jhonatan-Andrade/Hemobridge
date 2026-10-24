import '../../core/api_client.dart';

class PatientService {
  final ApiClient api;
  PatientService(this.api);

  Future<Map<String, dynamic>> profile() async =>
      Map<String, dynamic>.from(await api.request('/paciente/perfil') as Map);

  Future<List<PatientAppointment>> appointments() async =>
      (await api.request('/paciente/consultas') as List)
          .map((row) => PatientAppointment.fromJson(row as Map))
          .toList();

  Future<List<AvailableAppointment>> availableAppointments() async {
    final result = await api.request(
      '/paciente/consultas/horarios-disponiveis',
    );
    return (result['itens'] as List)
        .map((row) => AvailableAppointment.fromJson(row as Map))
        .toList();
  }

  Future<void> book(
    String slotId, {
    required bool consent,
    String? preTriagemId,
  }) async {
    if (slotId.isEmpty ||
        !consent ||
        preTriagemId == null ||
        preTriagemId.isEmpty) {
      throw ApiException(
        'Registre a pré-triagem, escolha um horário e aceite o atendimento por telessaúde.',
        0,
      );
    }
    await api.request(
      '/paciente/agendamentos',
      method: 'POST',
      body: {
        'disponibilidadeId': slotId,
        'aceiteTelemedicina': consent,
        'preTriagemId': preTriagemId,
      },
    );
  }

  Future<void> cancel(PatientAppointment appointment, String reason) async {
    _requireChangeAllowed(appointment);
    await api.request(
      '/paciente/consultas/${Uri.encodeComponent(appointment.id)}/cancelar',
      method: 'POST',
      body: {'motivo': reason.trim()},
    );
  }

  Future<void> reschedule(PatientAppointment appointment, String slotId) async {
    _requireChangeAllowed(appointment);
    if (slotId.isEmpty) throw ApiException('Escolha um novo horário.', 0);
    await api.request(
      '/paciente/consultas/${Uri.encodeComponent(appointment.id)}/reagendar',
      method: 'POST',
      body: {'disponibilidadeId': slotId},
    );
  }

  void _requireChangeAllowed(PatientAppointment appointment) {
    if (!appointment.canChange) {
      throw ApiException(
        'Esta consulta não permite cancelamento ou reagendamento pela plataforma.',
        0,
      );
    }
  }

  Future<List<PatientExamRequest>> exams() async {
    final result = await api.request('/paciente/exames');
    return (result['itens'] as List)
        .map((row) => PatientExamRequest.fromJson(row as Map))
        .toList();
  }

  Future<void> upload(
    PatientExamRequest exam,
    String filename,
    List<int> bytes,
  ) async {
    if (!exam.canUpload) {
      throw ApiException('Esta solicitação não aceita outro envio.', 0);
    }
    validateExamFile(filename, bytes);
    await api.upload(
      '/paciente/exames/${Uri.encodeComponent(exam.id)}/envios',
      filename: filename,
      bytes: bytes,
    );
  }
}

const maxExamBytes = 5 * 1024 * 1024;
const invalidExamMessage = 'Envie um arquivo PDF, JPG ou PNG de até 5 MB.';

void validateExamFile(String filename, List<int> bytes) {
  final extension = filename.split('.').last.toLowerCase();
  const signatures = {
    'pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],
    'png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'jpg': [0xff, 0xd8, 0xff],
    'jpeg': [0xff, 0xd8, 0xff],
  };
  final signature = signatures[extension];
  if (bytes.isEmpty ||
      bytes.length > maxExamBytes ||
      signature == null ||
      bytes.length < signature.length ||
      signature.asMap().entries.any(
        (entry) => bytes[entry.key] != entry.value,
      )) {
    throw ApiException(invalidExamMessage, 0);
  }
}

class AvailableAppointment {
  final String id, doctor, hospital;
  final DateTime start, end;
  AvailableAppointment.fromJson(Map row)
    : id = row['disponibilidadeId'] as String,
      doctor = row['medico'] as String,
      hospital = row['hospital'] as String,
      start = DateTime.parse(row['inicio'] as String),
      end = DateTime.parse(row['fim'] as String);
}

class PatientAppointment {
  final String id, status, doctor, hospital;
  final DateTime start, end;
  final bool canChange;
  final String? videoUrl, cancellationReason;
  PatientAppointment.fromJson(Map row)
    : id = row['id'] as String,
      status = row['status'] as String,
      doctor = row['medico'] as String,
      hospital = row['hospital'] as String,
      start = DateTime.parse(row['inicio'] as String),
      end = DateTime.parse(row['fim'] as String),
      canChange = row['podeCancelarOuReagendar'] == true,
      videoUrl = row['linkVideochamada'] as String?,
      cancellationReason = row['motivoCancelamento'] as String?;
}

class PatientExamRequest {
  final String id, doctor, status;
  final List<String> exams;
  final String? instructions, rejectionReason;
  final bool canUpload;
  final List<PatientExamSubmission> submissions;
  PatientExamRequest.fromJson(Map row)
    : id = row['id'] as String,
      doctor = row['medico'] as String,
      status = row['situacao'] as String,
      exams = (row['exames'] as List).cast<String>(),
      instructions = row['orientacoes'] as String?,
      rejectionReason = row['motivoReprovacao'] as String?,
      canUpload = row['podeEnviar'] == true,
      submissions = (row['envios'] as List)
          .map(
            (submission) => PatientExamSubmission.fromJson(submission as Map),
          )
          .toList();
}

class PatientExamSubmission {
  final String id, filename, status;
  final String? rejectionReason;
  PatientExamSubmission.fromJson(Map row)
    : id = row['id'] as String,
      filename = row['nomeOriginal'] as String,
      status = row['situacao'] as String,
      rejectionReason = row['motivoReprovacao'] as String?;
}

String patientDate(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year} às ${two(local.hour)}:${two(local.minute)}';
}

String patientStatus(String value) => switch (value) {
  'PRE_CADASTRADO' => 'Pré-cadastrado',
  'CONSULTA_AGENDADA' => 'Consulta agendada',
  'AGUARDANDO_EXAME' => 'Aguardando exame',
  'AGUARDANDO_RESULTADO' => 'Aguardando resultado',
  'EM_ANALISE' => 'Em análise',
  'APROVADO' => 'Aprovado',
  'VALIDADO' => 'Validado',
  'REPROVADO' => 'Não aprovado',
  'AGENDADA' => 'Agendada',
  'REALIZADA' => 'Realizada',
  'CANCELADA' => 'Cancelada',
  'NAO_COMPARECEU' => 'Não compareceu',
  _ => 'Situação não informada',
};
